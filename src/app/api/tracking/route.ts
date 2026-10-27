import { NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { TrackingOrder, ShipmentStatus, LeadStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = getMysqlPool();

    // 1. Fetch leads that have been confirmed or are in logistics stages
    const [leads]: any = await pool.execute(`
      SELECT 
        l.*,
        s.carrier,
        s.sendit_tracking_number,
        s.status as shipment_db_status,
        s.waybill_url,
        s.delivery_proof_url,
        s.delivery_attempts_count,
        s.failed_reason,
        i.product_name,
        i.quantity as item_quantity,
        i.sku as item_sku
      FROM order_leads l
      LEFT JOIN shipment_details s ON l.id = s.order_id
      LEFT JOIN order_items i ON l.id = i.order_id
      ORDER BY l.created_at DESC
    `);

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ success: true, orders: [] });
    }

    // Fetch timelines for these orders
    const [timelines]: any = await pool.execute(`
      SELECT * FROM order_timelines ORDER BY created_at ASC
    `);
    const timelinesByOrder = new Map<string, any[]>();
    if (Array.isArray(timelines)) {
      for (const t of timelines) {
        if (!timelinesByOrder.has(t.order_id)) {
          timelinesByOrder.set(t.order_id, []);
        }
        timelinesByOrder.get(t.order_id)!.push({
          id: t.id,
          timestamp: t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'À l’instant',
          title: t.title,
          description: t.details || '',
          actor: (t.actor && ['SYSTEM', 'AI_BOT', 'SENDIT', 'AGENT'].includes(t.actor)) ? t.actor : 'SYSTEM',
        });
      }
    }

    // Deduplicate leads by ID (in case of multiple items)
    const ordersMap = new Map<string, TrackingOrder>();

    for (const row of leads) {
      if (ordersMap.has(row.id)) continue;

      const rawNum = row.order_number || '';
      const cleanNum = rawNum.startsWith('#') ? rawNum : `#${rawNum}`;

      // Map DB status to ShipmentStatus
      let shipmentStatus: ShipmentStatus = 'READY_FOR_PICKUP';
      if (row.shipment_db_status) {
        switch (row.shipment_db_status) {
          case 'DELIVERED_PAID':
            shipmentStatus = 'DELIVERED_PAID';
            break;
          case 'OUT_FOR_DELIVERY':
            shipmentStatus = 'OUT_FOR_DELIVERY';
            break;
          case 'IN_TRANSIT':
            shipmentStatus = 'IN_TRANSIT';
            break;
          case 'DELIVERY_FAILED':
            shipmentStatus = 'DELIVERY_FAILED';
            break;
          case 'RETURNED':
            shipmentStatus = 'RETURNED';
            break;
          default:
            shipmentStatus = 'READY_FOR_PICKUP';
        }
      } else {
        if (row.status === 'DELIVERED_PAID') shipmentStatus = 'DELIVERED_PAID';
        else if (row.status === 'IN_TRANSIT') shipmentStatus = 'IN_TRANSIT';
        else if (row.status === 'DELIVERY_FAILED') shipmentStatus = 'DELIVERY_FAILED';
        else if (row.status === 'CANCELED') shipmentStatus = 'RETURNED';
        else shipmentStatus = 'READY_FOR_PICKUP';
      }

      // Lead status
      let leadStatus: LeadStatus = 'CONFIRMED';
      if (['NEW', 'AI_CHATTING', 'CONFIRMED', 'PACKING', 'CANCELED', 'DUPLICATE'].includes(row.status)) {
        leadStatus = row.status;
      }

      const trackingNumber = row.sendit_tracking_number || `SND-${Math.abs(row.id.split('').reduce((a: any, b: any) => ((a << 5) - a) + b.charCodeAt(0), 0) % 900000 + 100000)}`;

      const orderTimelines = timelinesByOrder.get(row.id) || [
        {
          id: `t-created-${row.id}`,
          timestamp: row.created_at ? new Date(row.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Récemment',
          title: 'Commande enregistrée dans le système',
          description: `Commande reçue pour ${row.customer_name}`,
          actor: 'SYSTEM',
        },
      ];

      ordersMap.set(row.id, {
        id: row.id,
        orderNumber: cleanNum,
        customerName: row.customer_name || 'Client',
        phoneNumber: row.phone_number || '',
        city: row.city || 'Maroc',
        address: row.address || 'Adresse à confirmer',
        gpsLocationUrl: row.gps_location_url || undefined,
        totalAmount: Number(row.total_amount) || 299,
        productName: row.product_name || 'Produit COD',
        productQuantity: row.item_quantity || 1,
        leadStatus,
        shipmentStatus,
        trackingNumber,
        waybillUrl: row.waybill_url || `https://sendit.ma/awb/${trackingNumber}.pdf`,
        driverName: row.carrier || 'Livreur Sendit.ma Hub Express',
        driverPhone: '0661009988',
        deliveryAttempts: row.delivery_attempts_count || (shipmentStatus === 'DELIVERED_PAID' ? 1 : 0),
        failedReason: row.failed_reason || undefined,
        aiHandoverRequired: row.status === 'AI_CHATTING',
        aiConversationEnabled: true,
        riskScore: row.risk_score || 10,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        lastUpdatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
        timeline: orderTimelines,
        chatMessages: [
          {
            id: `msg-auto-${row.id}`,
            sender: 'AI_BOT',
            text: `تم تسجيل الطلب ${cleanNum} والتأكيد بنجاح مع الزبون ${row.customer_name}.`,
            time: '10:00',
          },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      source: 'database',
      orders: Array.from(ordersMap.values()),
    });
  } catch (error: any) {
    console.warn('[API Tracking GET] DB error, using unified store fallback:', error.message);
    const { getInboundOrders } = await import('@/lib/orders-store');
    const inbound = getInboundOrders();

    const fallbackOrders: TrackingOrder[] = inbound.map((o) => {
      let shipmentStatus: ShipmentStatus = 'READY_FOR_PICKUP';
      if (o.stage === 'IN_TRANSIT') shipmentStatus = 'OUT_FOR_DELIVERY';
      else if (o.stage === 'DELIVERED') shipmentStatus = 'DELIVERED_PAID';
      else if (o.stage === 'CANCELLED') shipmentStatus = 'RETURNED';
      else if (o.stage === 'PACKING') shipmentStatus = 'READY_FOR_PICKUP';

      const cleanNum = o.orderNumber.replace(/^#+/, '');
      const tracking = o.tracking?.trackingNumber || `SND-${cleanNum}`;

      return {
        id: o.id,
        orderNumber: o.orderNumber.startsWith('#') ? o.orderNumber : `#${o.orderNumber}`,
        customerName: o.customer.name,
        phoneNumber: o.customer.phone,
        city: o.customer.city,
        address: o.customer.address,
        gpsLocationUrl: o.gpsLocationUrl || 'https://maps.google.com/?q=33.5731,-7.5898',
        totalAmount: o.payment.amount,
        productName: o.items[0]?.name || 'Article E-commerce COD',
        productQuantity: o.items[0]?.quantity || 1,
        leadStatus: (o.stage === 'CONFIRMED' || o.stage === 'IN_TRANSIT' || o.stage === 'DELIVERED') ? 'CONFIRMED' : 'NEW',
        shipmentStatus,
        trackingNumber: tracking,
        waybillUrl: `https://sendit.ma/awb/${tracking}.pdf`,
        driverName: 'Mohamed Tazi',
        driverPhone: '0670112233',
        deliveryAttempts: shipmentStatus === 'DELIVERED_PAID' ? 1 : 0,
        aiHandoverRequired: false,
        aiConversationEnabled: true,
        riskScore: o.aiVerification?.riskScore || 10,
        createdAt: o.createdAt,
        lastUpdatedAt: new Date().toISOString(),
        timeline: [
          {
            id: `t-${o.id}-1`,
            timestamp: 'Récemment',
            title: 'Commande validée',
            description: `Commande ${o.orderNumber} enregistrée pour ${o.customer.name}`,
            actor: 'SYSTEM',
          },
          {
            id: `t-${o.id}-2`,
            timestamp: 'Récemment',
            title: 'Prise en charge Sendit Express',
            description: `Numéro d'expédition ${tracking} généré`,
            actor: 'SENDIT',
          },
        ],
        chatMessages: [
          {
            id: `msg-${o.id}-1`,
            sender: 'AI_BOT',
            text: `السلام عليكم أخي ${o.customer.name}! كنشكروك على طلبك. الكولي ديالك راه مجهز للتوصيل في ${o.customer.city}.`,
            time: '11:00',
          },
        ],
      };
    });

    return NextResponse.json({
      success: true,
      source: 'memory_fallback',
      orders: fallbackOrders,
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderId, shipmentStatus, failedReason, driverName, driverPhone } = body;

    if (!orderId || !shipmentStatus) {
      return NextResponse.json(
        { success: false, error: 'orderId and shipmentStatus are required' },
        { status: 400 }
      );
    }

    const pool = getMysqlPool();

    // Map shipment status to order_leads status
    let dbStatus = 'IN_TRANSIT';
    if (shipmentStatus === 'DELIVERED_PAID') dbStatus = 'DELIVERED_PAID';
    else if (shipmentStatus === 'DELIVERY_FAILED') dbStatus = 'DELIVERY_FAILED';
    else if (shipmentStatus === 'RETURNED') dbStatus = 'DELIVERY_FAILED';

    // Update in-memory store
    const { updateOrderStatus } = await import('@/lib/orders-store');
    updateOrderStatus(orderId, dbStatus);

    // Update order_leads
    await pool.execute(
      `UPDATE order_leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR order_number = ?`,
      [dbStatus, orderId, orderId]
    );

    // Update or insert shipment_details
    await pool.execute(
      `
      INSERT INTO shipment_details (id, order_id, status, failed_reason, last_status_update_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        failed_reason = VALUES(failed_reason),
        last_status_update_at = CURRENT_TIMESTAMP
    `,
      [`ship-${orderId}`, orderId, shipmentStatus, failedReason || null]
    );

    // Trigger automations: Stock, Finance, Customer Stats
    const {
      recordCodRemittance,
      restoreStockForOrder,
      updateCustomerStatsOnOrderStatus,
      addTimelineEventToDb,
      invalidateOrdersCache,
    } = await import('@/lib/db-service');

    if (shipmentStatus === 'DELIVERED_PAID') {
      await recordCodRemittance(orderId);
      await updateCustomerStatsOnOrderStatus(orderId, 'DELIVERED_PAID');
    } else if (shipmentStatus === 'RETURNED') {
      await restoreStockForOrder(orderId, `Retour colis via module de suivi`);
      await updateCustomerStatsOnOrderStatus(orderId, 'DELIVERY_FAILED');
    } else if (shipmentStatus === 'DELIVERY_FAILED') {
      await updateCustomerStatsOnOrderStatus(orderId, 'DELIVERY_FAILED');
    }

    invalidateOrdersCache();

    // Add timeline entry
    await addTimelineEventToDb({
      orderId,
      action: 'SHIPMENT_UPDATED',
      title: `Statut de livraison: ${shipmentStatus}`,
      details: failedReason ? `Motif: ${failedReason}` : `Mise à jour statut transporteur`,
      actor: 'SENDIT',
    });

    return NextResponse.json({
      success: true,
      message: `Shipment status updated to ${shipmentStatus}`,
    });
  } catch (error: any) {
    console.error('[API Tracking PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
