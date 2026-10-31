import { NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { TrackingOrder, ShipmentStatus, LeadStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = getMysqlPool();

    // 1. Fetch only parcels in logistics (strictly exclude unconfirmed leads)
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
      WHERE (
        (s.sendit_tracking_number IS NOT NULL AND s.sendit_tracking_number != '')
        OR l.store_source = 'SENDIT_SYNC'
        OR l.id LIKE 'snd-%'
        OR l.status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'DELIVERED_PAID', 'RETURNED', 'CANCELED')
      )
      AND l.status NOT IN ('NEW', 'AI_CHATTING', 'DUPLICATE')
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

    // Index original platform orders (store_source != 'SENDIT_SYNC') by phone & order number
    // to guarantee every Sendit delivery displays its TRUE original platform creation date!
    const platformOrdersByPhone = new Map<string, any>();
    const platformOrdersByNum = new Map<string, any>();

    for (const r of leads) {
      if (r.store_source && r.store_source !== 'SENDIT_SYNC' && r.created_at) {
        const cleanPhone = (r.phone_number || '').replace(/\D/g, '');
        if (cleanPhone.length >= 9 && !platformOrdersByPhone.has(cleanPhone)) {
          platformOrdersByPhone.set(cleanPhone, r);
        }
        const num = (r.order_number || '').replace(/^#/, '').trim();
        if (num && !platformOrdersByNum.has(num)) {
          platformOrdersByNum.set(num, r);
        }
      }
    }

    // Set of phones that already have a real Sendit shipment in the query
    const senditPhones = new Set<string>();
    for (const r of leads) {
      if (r.store_source === 'SENDIT_SYNC' || (r.id && r.id.startsWith('snd-'))) {
        const p = (r.phone_number || '').replace(/\D/g, '');
        if (p.length >= 9) senditPhones.add(p);
      }
    }

    // Deduplicate leads by ID (in case of multiple items)
    const ordersMap = new Map<string, TrackingOrder>();

    for (const row of leads) {
      if (ordersMap.has(row.id)) continue;

      // If this is an unlinked store stub without AWB, and Sendit already has the delivery for this phone, skip duplicate
      if (row.store_source !== 'SENDIT_SYNC' && !row.id.startsWith('snd-') && !row.sendit_tracking_number) {
        const p = (row.phone_number || '').replace(/\D/g, '');
        if (p.length >= 9 && senditPhones.has(p)) {
          continue;
        }
      }

      const rawNum = row.order_number || '';
      const cleanNum = rawNum.startsWith('#') ? rawNum : `#${rawNum}`;

      // Map DB status to ShipmentStatus
      let shipmentStatus: ShipmentStatus = 'IN_TRANSIT';
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
          case 'CANCELED':
            shipmentStatus = 'CANCELED';
            break;
          default:
            shipmentStatus = row.status === 'CANCELED' ? 'CANCELED' : (row.status === 'RETURNED' ? 'RETURNED' : 'READY_FOR_PICKUP');
        }
      } else {
        if (row.status === 'DELIVERED_PAID') shipmentStatus = 'DELIVERED_PAID';
        else if (row.status === 'IN_TRANSIT') shipmentStatus = 'IN_TRANSIT';
        else if (row.status === 'DELIVERY_FAILED') shipmentStatus = 'DELIVERY_FAILED';
        else if (row.status === 'RETURNED') shipmentStatus = 'RETURNED';
        else if (row.status === 'CANCELED') shipmentStatus = 'CANCELED';
        else shipmentStatus = 'IN_TRANSIT';
      }

      // Lead status
      let leadStatus: LeadStatus = 'CONFIRMED';
      if (['NEW', 'AI_CHATTING', 'CONFIRMED', 'PACKING', 'CANCELED', 'DUPLICATE'].includes(row.status)) {
        leadStatus = row.status;
      }

      const trackingNumber = row.sendit_tracking_number || `SND-${Math.abs(row.id.split('').reduce((a: any, b: any) => ((a << 5) - a) + b.charCodeAt(0), 0) % 900000 + 100000)}`;

      // Déterminer la date de création de la commande :
      // Si la commande provient de Sendit mais existait déjà dans notre plateforme,
      // on hérite OBLIGATOIREMENT de sa date originale de création dans la plateforme !
      let effectiveCreatedAt = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
      const cleanPhone = (row.phone_number || '').replace(/\D/g, '');
      const num = (row.order_number || '').replace(/^#/, '').trim();
      const matchedStoreOrder = platformOrdersByNum.get(num) || (cleanPhone ? platformOrdersByPhone.get(cleanPhone) : null);

      if (matchedStoreOrder && matchedStoreOrder.created_at) {
        effectiveCreatedAt = new Date(matchedStoreOrder.created_at).toISOString();
      }

      const orderTimelines = timelinesByOrder.get(row.id) || [
        {
          id: `t-created-${row.id}`,
          timestamp: effectiveCreatedAt ? new Date(effectiveCreatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Récemment',
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
        driverPhone: undefined,
        deliveryAttempts: row.delivery_attempts_count || (shipmentStatus === 'DELIVERED_PAID' ? 1 : 0),
        failedReason: row.failed_reason || (shipmentStatus === 'CANCELED' ? (row.notes || 'Commande annulée (Doublon ou refus client)') : (shipmentStatus === 'RETURNED' ? 'Colis refusé / Non réclamé' : undefined)),
        aiHandoverRequired: row.status === 'AI_CHATTING',
        aiConversationEnabled: true,
        riskScore: row.risk_score || 10,
        createdAt: effectiveCreatedAt,
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
      let shipmentStatus: ShipmentStatus = 'IN_TRANSIT';
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
        gpsLocationUrl: o.gpsLocationUrl || undefined,
        totalAmount: o.payment.amount,
        productName: o.items[0]?.name || 'Article E-commerce COD',
        productQuantity: o.items[0]?.quantity || 1,
        leadStatus: (o.stage === 'CONFIRMED' || o.stage === 'IN_TRANSIT' || o.stage === 'DELIVERED') ? 'CONFIRMED' : 'NEW',
        shipmentStatus,
        trackingNumber: tracking,
        waybillUrl: `https://sendit.ma/awb/${tracking}.pdf`,
        driverName: o.tracking?.carrier || 'Livreur Sendit.ma',
        driverPhone: undefined,
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
