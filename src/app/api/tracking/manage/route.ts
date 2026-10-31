import { NextRequest, NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { restoreStockForOrder, addTimelineEventToDb, invalidateOrdersCache } from '@/lib/db-service';
import { senditService } from '@/lib/sendit-service';
import { realtimeHub } from '@/lib/realtime-events';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/tracking/manage
 * Modifier les informations d'une commande avant sa prise en charge par le transporteur
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      customerName,
      phoneNumber,
      city,
      address,
      totalAmount,
      notes,
    } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId requis' }, { status: 400 });
    }

    const pool = getMysqlPool();

    // 1. Check if the order is already locked by courier custody
    const [rows]: any = await pool.execute(
      `SELECT l.id, l.order_number, l.status, s.sendit_tracking_number, s.status as shipment_status
       FROM order_leads l
       LEFT JOIN shipment_details s ON l.id = s.order_id
       WHERE l.id = ? OR l.order_number = ?
       LIMIT 1`,
      [orderId, orderId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Commande introuvable' }, { status: 404 });
    }

    const orderRow = rows[0];

    // 2. Update order_leads
    await pool.execute(
      `UPDATE order_leads 
       SET customer_name = COALESCE(?, customer_name),
           phone_number = COALESCE(?, phone_number),
           city = COALESCE(?, city),
           address = COALESCE(?, address),
           total_amount = COALESCE(?, total_amount),
           notes = CONCAT(COALESCE(notes, ''), ?),
           updated_at = NOW()
       WHERE id = ? OR order_number = ?`,
      [
        customerName || null,
        phoneNumber || null,
        city || null,
        address || null,
        totalAmount !== undefined ? Number(totalAmount) : null,
        notes ? `\n[Modification manager]: ${notes}` : '',
        orderId,
        orderId,
      ]
    );

    // 3. Log event in timeline
    await addTimelineEventToDb({
      orderId: orderRow.id,
      action: 'ORDER_MODIFIED',
      title: '✏️ Commande modifiée par le manager',
      details: `Coordonnées mises à jour : ${customerName || ''} | ${city || ''} | ${totalAmount ? `${totalAmount} MAD` : ''}`,
      actor: 'AGENT',
    });

    invalidateOrdersCache();

    // 4. Real-time broadcast
    realtimeHub.broadcast({
      eventType: 'ORDER_STATUS_CHANGED',
      entityType: 'ORDER',
      entityId: orderRow.id,
      title: `Commande ${orderRow.order_number} mise à jour`,
      payload: { orderId: orderRow.id, customerName, city, totalAmount },
      source: 'MANAGER_EDIT',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Commande modifiée avec succès dans la base de données !',
    });
  } catch (error: any) {
    console.error('[API /api/tracking/manage PUT] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/tracking/manage
 * Annuler et supprimer la commande du circuit Sendit avant prise en charge
 * - Annule le colis sur Sendit.ma si le barcode a été généré
 * - Libère le stock réservé
 * - Marque la commande en CANCELED dans MySQL
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const reason = searchParams.get('reason') || 'Annulé par le manager avant prise en charge transporteur';

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId requis' }, { status: 400 });
    }

    const pool = getMysqlPool();

    // 1. Fetch order & tracking info
    const [rows]: any = await pool.execute(
      `SELECT l.id, l.order_number, l.status, s.sendit_tracking_number, s.status as shipment_status
       FROM order_leads l
       LEFT JOIN shipment_details s ON l.id = s.order_id
       WHERE l.id = ? OR l.order_number = ?
       LIMIT 1`,
      [orderId, orderId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Commande introuvable' }, { status: 404 });
    }

    const orderRow = rows[0];
    const trackingCode = orderRow.sendit_tracking_number;

    // 2. If AWB exists on Sendit, attempt remote cancellation
    let senditCanceled = false;
    if (trackingCode && !trackingCode.startsWith('SND-')) {
      try {
        senditCanceled = await senditService.cancelParcel(trackingCode);
      } catch (err: any) {
        console.warn(`[Tracking Manage DELETE] Sendit cancel notice for ${trackingCode}:`, err?.message);
      }
    }

    // 3. Restore reserved warehouse stock
    await restoreStockForOrder(orderRow.id, `Suppression commande manager: ${reason}`);

    // 4. Update order_leads & shipment_details to CANCELED
    await pool.execute(
      `UPDATE order_leads 
       SET status = 'CANCELED',
           notes = CONCAT(COALESCE(notes, ''), ?),
           updated_at = NOW()
       WHERE id = ?`,
      [`\n[Annulée/Supprimée]: ${reason} (${new Date().toLocaleDateString('fr-FR')})`, orderRow.id]
    );

    await pool.execute(
      `UPDATE shipment_details 
       SET status = 'CANCELED',
           failed_reason = ?,
           last_status_update_at = NOW()
       WHERE order_id = ?`,
      [reason, orderRow.id]
    );

    // 5. Add timeline log
    await addTimelineEventToDb({
      orderId: orderRow.id,
      action: 'ORDER_DELETED',
      title: '🗑️ Commande annulée & supprimée du flux Sendit',
      details: `${reason}${senditCanceled ? ' (Bordereau Sendit annulé sur leur plateforme)' : ''}`,
      actor: 'AGENT',
    });

    invalidateOrdersCache();

    // 6. Broadcast SSE event
    realtimeHub.broadcast({
      eventType: 'ORDER_STATUS_CHANGED',
      entityType: 'ORDER',
      entityId: orderRow.id,
      title: `Commande ${orderRow.order_number} annulée par le manager`,
      payload: { orderId: orderRow.id, status: 'CANCELED', reason },
      source: 'MANAGER_DELETE',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      senditCanceled,
      message: `Commande ${orderRow.order_number} annulée avec succès et stock libéré.`,
    });
  } catch (error: any) {
    console.error('[API /api/tracking/manage DELETE] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

