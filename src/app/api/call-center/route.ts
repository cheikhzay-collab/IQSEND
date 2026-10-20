import { NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { addTimelineEventToDb } from '@/lib/db-service';
import { realtimeHub } from '@/lib/realtime-events';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = getMysqlPool();

    // Fetch leads needing operator attention (NEW, AI_CHATTING, PENDING, or CANCELED recently)
    const [rows]: any = await pool.execute(`
      SELECT 
        l.id,
        l.order_number,
        l.customer_name,
        l.phone_number,
        l.city,
        l.address,
        l.total_amount,
        l.status,
        l.notes,
        l.created_at,
        i.product_name,
        i.sku,
        s.delivery_attempts_count
      FROM order_leads l
      LEFT JOIN order_items i ON l.id = i.order_id
      LEFT JOIN shipment_details s ON l.id = s.order_id
      ORDER BY l.created_at DESC
    `);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: true, tasks: [] });
    }

    const tasksMap = new Map<string, any>();

    for (const r of rows) {
      if (tasksMap.has(r.id)) continue;

      let priority: 'URGENT' | 'RAPPEL' | 'NOUVEAU' = 'NOUVEAU';
      if (r.status === 'DELIVERY_FAILED' || (r.delivery_attempts_count && r.delivery_attempts_count > 0)) {
        priority = 'URGENT';
      } else if (r.status === 'AI_CHATTING' || (r.notes && r.notes.includes('Rappel'))) {
        priority = 'RAPPEL';
      }

      const rawNum = r.order_number || '';
      const cleanNum = rawNum.startsWith('#') ? rawNum : `#${rawNum}`;

      tasksMap.set(r.id, {
        id: r.id,
        orderNumber: cleanNum,
        customerName: r.customer_name || 'Client',
        phone: r.phone_number || '',
        city: r.city || 'Maroc',
        address: r.address || 'Adresse à préciser',
        product: r.product_name || 'Produit COD Sendit',
        amount: Number(r.total_amount) || 299,
        priority,
        scheduledTime: r.notes ? r.notes.slice(0, 40) : undefined,
        attempts: r.delivery_attempts_count || 0,
        status: r.status,
      });
    }

    return NextResponse.json({
      success: true,
      source: 'database',
      tasks: Array.from(tasksMap.values()),
    });
  } catch (error: any) {
    console.warn('[API Call Center GET] DB error, using unified store fallback:', error.message);
    const { getInboundOrders } = await import('@/lib/orders-store');
    const inbound = getInboundOrders();

    const fallbackTasks = inbound
      .filter((o) => o.stage === 'PENDING_CONFIRMATION' || o.stage === 'NEW_ORDERS' || o.stage === 'NEEDS_ATTENTION' || o.stage === 'CONFIRMED')
      .map((o) => {
        let priority: 'URGENT' | 'RAPPEL' | 'NOUVEAU' = 'NOUVEAU';
        if (o.customer?.notes?.includes('Rappel')) {
          priority = 'RAPPEL';
        } else if (o.aiVerification?.riskScore && o.aiVerification.riskScore > 40) {
          priority = 'URGENT';
        }

        const rawNum = o.orderNumber || '';
        const cleanNum = rawNum.startsWith('#') ? rawNum : `#${rawNum}`;

        return {
          id: o.id,
          orderNumber: cleanNum,
          customerName: o.customer.name,
          phone: o.customer.phone,
          city: o.customer.city,
          address: o.customer.address,
          product: o.items[0]?.name || 'Pack 2x Chemises Lin',
          amount: o.payment.amount,
          priority,
          scheduledTime: o.customer.notes || undefined,
          attempts: 0,
          status: o.stage,
        };
      });

    return NextResponse.json({
      success: true,
      source: 'memory_fallback',
      tasks: fallbackTasks,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, outcome, notes, upsellAmount, verifiedAddress } = body;

    if (!orderId || !outcome) {
      return NextResponse.json(
        { success: false, error: 'orderId and outcome are required' },
        { status: 400 }
      );
    }

    const pool = getMysqlPool();
    let newStatus = 'CONFIRMED';
    let timelineTitle = 'Appel Téléphonique';

    if (outcome === 'CONFIRMED') {
      newStatus = 'CONFIRMED';
      timelineTitle = 'Commande confirmée par téléphone';
    } else if (outcome === 'RAPPEL') {
      newStatus = 'AI_CHATTING';
      timelineTitle = 'Rappel téléphonique programmé';
    } else if (outcome === 'CANCELED') {
      newStatus = 'CANCELED';
      timelineTitle = 'Commande annulée par le client';
    }

    // Update in-memory store
    const { updateOrderStatus } = await import('@/lib/orders-store');
    updateOrderStatus(orderId, newStatus);

    // Update order_leads
    await pool.execute(
      `
      UPDATE order_leads
      SET 
        status = ?,
        ai_confirmation_status = ?,
        address = COALESCE(?, address),
        notes = CONCAT(IFNULL(notes, ''), ' [Appel: ', ?, ']'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR order_number = ?
    `,
      [
        newStatus,
        outcome === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
        verifiedAddress || null,
        notes || outcome,
        orderId,
        orderId,
      ]
    );

    // If upsell amount provided, update total_amount
    if (upsellAmount && Number(upsellAmount) > 0) {
      await pool.execute(
        `UPDATE order_leads SET total_amount = total_amount + ?, upsell_accepted = TRUE WHERE id = ? OR order_number = ?`,
        [Number(upsellAmount), orderId, orderId]
      );
    }

    // Map outcome to CallResult enum
    const callResultEnum = outcome === 'CONFIRMED' ? 'CONFIRMED_MANUALLY' : outcome === 'CANCELED' ? 'CANCELED_BY_CLIENT' : 'CALLBACK_REQUESTED';

    // Insert into call_logs table
    await pool.execute(
      `INSERT INTO call_logs (id, order_id, user_id, result, notes)
       VALUES (?, ?, 'usr-agent-01', ?, ?)`,
      [`call-${Date.now()}`, orderId, callResultEnum, notes || outcome]
    ).catch(() => {});

    // Record timeline event
    await addTimelineEventToDb({
      orderId,
      action: 'CALL_CENTER_OUTCOME',
      title: timelineTitle,
      details: notes || `Résultat de l'appel: ${outcome}`,
      actor: 'AGENT',
    });

    // 🔴 Real-time broadcast
    realtimeHub.broadcast({
      eventType: 'CALL_LOGGED',
      entityType: 'CALL',
      entityId: orderId,
      title: `${timelineTitle}: ${orderId}`,
      payload: { orderId, outcome, notes, newStatus },
      source: 'CALL_CENTER',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Call result recorded: ${outcome}`,
      newStatus,
    });
  } catch (error: any) {
    console.error('[API Call Center POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
