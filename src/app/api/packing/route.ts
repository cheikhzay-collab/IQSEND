import { NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { addTimelineEventToDb } from '@/lib/db-service';
import { realtimeHub } from '@/lib/realtime-events';
import { senditService } from '@/lib/sendit-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = getMysqlPool();

    const [rows]: any = await pool.execute(`
      SELECT 
        l.id,
        l.order_number,
        l.customer_name,
        l.phone_number,
        l.address,
        l.city,
        l.total_amount,
        l.status,
        i.product_name,
        i.sku,
        i.quantity,
        s.sendit_tracking_number,
        s.status as shipment_status,
        p.stock_quantity
      FROM order_leads l
      LEFT JOIN order_items i ON l.id = i.order_id
      LEFT JOIN shipment_details s ON l.id = s.order_id
      LEFT JOIN products p ON (i.product_name = p.name OR i.sku = p.sku)
      WHERE l.status IN ('CONFIRMED', 'PACKING')
        AND (s.sendit_tracking_number IS NULL OR s.sendit_tracking_number = '')
        AND (s.status IS NULL OR s.status NOT IN ('READY_FOR_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED_PAID', 'RETURNED'))
      ORDER BY l.created_at DESC
    `);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: true, items: [] });
    }

    const itemsMap = new Map<string, any>();

    for (const r of rows) {
      if (itemsMap.has(r.id)) continue;

      const rawNum = r.order_number || '';
      const cleanNum = rawNum.startsWith('#') ? rawNum : `#${rawNum}`;
      const isPacked = r.status === 'PACKING' || r.status === 'IN_TRANSIT' || r.status === 'DELIVERED_PAID';
      const isPushed = Boolean(r.sendit_tracking_number) || r.status === 'IN_TRANSIT' || r.status === 'DELIVERED_PAID';

      itemsMap.set(r.id, {
        id: r.id,
        orderNumber: cleanNum,
        customerName: r.customer_name || 'Client',
        phone: r.phone_number || '',
        address: r.address || '',
        city: r.city || 'Maroc',
        productName: r.product_name || 'Produit COD Sendit',
        sku: r.sku || 'SKU-GEN',
        quantity: r.quantity || 1,
        totalAmount: Number(r.total_amount) || 299,
        stockAvailable: r.stock_quantity !== null && r.stock_quantity !== undefined ? Number(r.stock_quantity) : 24,
        isPacked: r.status === 'PACKING',
        senditStatus: 'PENDING',
        trackingCode: undefined,
      });
    }

    return NextResponse.json({
      success: true,
      source: 'database',
      items: Array.from(itemsMap.values()),
    });
  } catch (error: any) {
    console.warn('[API Packing GET] DB error, using unified store fallback:', error.message);
    const { getInboundOrders } = await import('@/lib/orders-store');
    const inbound = getInboundOrders();

    const fallbackItems = inbound
      .filter((o) => o.stage === 'CONFIRMED' || o.stage === 'PACKING' || o.stage === 'IN_TRANSIT')
      .map((o) => {
        const isPacked = o.stage === 'PACKING' || o.stage === 'IN_TRANSIT';
        const isPushed = o.stage === 'IN_TRANSIT' || Boolean(o.tracking?.trackingNumber);
        return {
          id: o.id,
          orderNumber: o.orderNumber.startsWith('#') ? o.orderNumber : `#${o.orderNumber}`,
          customerName: o.customer.name,
          city: o.customer.city,
          productName: o.items[0]?.name || 'Pack 2x Chemises Lin',
          sku: o.items[0]?.sku || 'SKU-LIN-01',
          quantity: o.items[0]?.quantity || 1,
          totalAmount: o.payment.amount,
          stockAvailable: 35,
          isPacked,
          senditStatus: isPushed ? 'PUSHED' as const : 'PENDING' as const,
          trackingCode: o.tracking?.trackingNumber || undefined,
        };
      });

    return NextResponse.json({
      success: true,
      source: 'memory_fallback',
      items: fallbackItems,
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderId, action, isPacked, trackingCode } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId is required' },
        { status: 400 }
      );
    }

    const pool = getMysqlPool();
    const { updateOrderStatus, updateOrderTracking } = await import('@/lib/orders-store');

    if (action === 'TOGGLE_PACKED') {
      const newStatus = isPacked ? 'PACKING' : 'CONFIRMED';
      updateOrderStatus(orderId, newStatus);

      await pool.execute(
        `UPDATE order_leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR order_number = ?`,
        [newStatus, orderId, orderId]
      );

      // Upsert packing_tasks
      await pool.execute(
        `INSERT INTO packing_tasks (id, order_id, status, packed_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE status = VALUES(status), packed_at = CURRENT_TIMESTAMP`,
        [`pack-${orderId}`, orderId, isPacked ? 'PACKED' : 'PENDING']
      );

      // 🔴 Real-time broadcast
      realtimeHub.broadcast({
        eventType: 'PACKING_UPDATED',
        entityType: 'PACKING',
        entityId: orderId,
        title: isPacked ? `Colis emballé avec succès: ${orderId}` : `Colis remis en préparation: ${orderId}`,
        payload: { orderId, isPacked, status: newStatus },
        source: 'PACKING_STATION',
      }).catch(() => {});

      return NextResponse.json({ success: true, isPacked });
    }

    if (action === 'PUSH_SENDIT') {
      const [ordRows]: any = await pool.execute(
        `SELECT id, order_number, customer_name, phone_number, city, address, total_amount FROM order_leads WHERE id = ? OR order_number = ? LIMIT 1`,
        [orderId, orderId]
      );

      if (!Array.isArray(ordRows) || ordRows.length === 0) {
        return NextResponse.json({ success: false, error: 'Commande introuvable dans la base de données' }, { status: 404 });
      }

      const ord = ordRows[0];
      const resolved = senditService.resolveDistrict(ord.city || ord.address);

      // Appel réel à l'API officielle Sendit.ma
      const parcelRes = await senditService.createParcel({
        district_id: resolved.id,
        name: ord.customer_name || 'Client',
        phone: ord.phone_number || '',
        address: ord.address || 'Adresse à confirmer',
        amount: Number(ord.total_amount) || 0,
        reference: ord.order_number || ord.id,
        allow_open: 1,
        allow_try: 1,
      });

      if (!parcelRes.success || !parcelRes.trackingCode) {
        return NextResponse.json({
          success: false,
          error: parcelRes.errorMessage || 'Échec de transmission du colis à Sendit.ma. Vérifiez les informations du client (téléphone, ville).',
        }, { status: 502 });
      }

      const tracking = parcelRes.trackingCode;
      const waybillUrl = parcelRes.waybillPdfUrl || '';
      const fee = parcelRes.fee || 35;

      // Update in-memory store
      updateOrderTracking(orderId, tracking, 'Sendit.ma Express');
      updateOrderStatus(orderId, 'PACKING');

      // Update lead to READY_FOR_PICKUP
      await pool.execute(
        `UPDATE order_leads SET status = 'READY_FOR_PICKUP', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR order_number = ?`,
        [orderId, orderId]
      );

      // Upsert shipment_details
      await pool.execute(
        `
        INSERT INTO shipment_details (id, order_id, carrier, sendit_tracking_number, waybill_url, shipping_fee, status, last_status_update_at)
        VALUES (?, ?, 'Sendit.ma Express', ?, ?, ?, 'READY_FOR_PICKUP', CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          carrier = 'Sendit.ma Express',
          sendit_tracking_number = VALUES(sendit_tracking_number),
          waybill_url = COALESCE(VALUES(waybill_url), waybill_url),
          shipping_fee = VALUES(shipping_fee),
          status = 'READY_FOR_PICKUP',
          last_status_update_at = CURRENT_TIMESTAMP
      `,
        [`ship-${orderId}`, orderId, tracking, waybillUrl || null, fee]
      );

      // Update packing task status to PACKED
      await pool.execute(
        `UPDATE packing_tasks SET status = 'PACKED', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`,
        [orderId]
      );

      // Deduct stock for order
      const { deductStockForOrder, invalidateOrdersCache } = await import('@/lib/db-service');
      await deductStockForOrder(orderId, `Expédition Sendit Express (${tracking})`);
      invalidateOrdersCache();

      // Add timeline
      await addTimelineEventToDb({
        orderId,
        action: 'SENDIT_PUSHED',
        title: '📦 Bordereau Sendit.ma généré',
        details: `Colis transmis avec succès à Sendit. N° de suivi officiel: ${tracking}. Frais: ${fee} MAD. En attente du passage du chauffeur.`,
        actor: 'SENDIT',
      });

      // 🔴 Real-time broadcast
      realtimeHub.broadcast({
        eventType: 'SHIPMENT_STATUS_UPDATED',
        entityType: 'PARCEL',
        entityId: tracking,
        title: `Colis transmis à Sendit: ${tracking} (${ord.order_number || orderId})`,
        payload: { orderId, tracking, waybillUrl, fee, status: 'READY_FOR_PICKUP' },
        source: 'PACKING_STATION',
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        trackingCode: tracking,
        waybillUrl,
        fee,
        senditStatus: 'PUSHED',
        message: `✅ Colis transmis avec succès à Sendit.ma (${tracking})`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[API Packing PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
