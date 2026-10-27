import { NextRequest, NextResponse } from 'next/server';
import { senditService, SenditWebhookPayload } from '@/lib/sendit-service';
import { getInboundOrders } from '@/lib/orders-store';
import { trackingEventBus } from '@/lib/tracking-events';
import { realtimeHub } from '@/lib/realtime-events';
import {
  triggerNeedsAttentionRescue,
  triggerOutForDeliveryNotice,
  triggerMorningCodReminder,
  triggerReviewInvitation,
} from '@/lib/order-automations';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/sendit
 *
 * يستقبل أحداث Webhook الرسمية من Sendit.ma عند تغيّر حالة أي كولي لحظياً.
 *
 * الأمان المتوافق مع Sendit:
 *   1. Token في الرابط: /api/webhooks/sendit?token=VOTRE_SECRET
 *   2. أو Header "X-Sendit-Signature" (HMAC-SHA256)
 *
 * المرجع: https://app.sendit.ma/guide-webhook-sendit.pdf
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-sendit-signature') || '';
    const { searchParams } = new URL(req.url);
    const queryToken = searchParams.get('token');

    // ── 1. التحقق من أمان الـ Webhook (إذا كان Secret مضبوطاً) ────────
    const isVerified = senditService.verifyWebhook(rawBody, signature, queryToken);
    if (!isVerified && process.env.NODE_ENV === 'production') {
      console.warn(`[Webhook Sendit] ❌ Rejeté: Signature ou Token invalide.`);
      return NextResponse.json({ error: 'Signature ou token non valide' }, { status: 401 });
    }

    // ── 2. قراءة وتحليل الـ Payload ──────────────────────────────────
    let payload: SenditWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'JSON payload invalide' }, { status: 400 });
    }

    // استخراج الكود والحالة من أي نمط يرسله Sendit
    const trackingCode =
      payload.code ||
      payload.data?.code ||
      (payload as any).tracking_number ||
      (payload as any).tracking_code;

    const newStatus =
      payload.newStatus ||
      payload.status ||
      payload.data?.status ||
      (payload as any).delivery_status;

    if (!trackingCode) {
      return NextResponse.json(
        { error: 'Code de suivi introuvable dans le payload Sendit' },
        { status: 400 }
      );
    }

    console.log(
      `[Webhook Sendit] 📦 Réception statut: Colis ${trackingCode} -> ${newStatus || 'INCONNU'}`
    );

    // ── 3. معالجة الحالة ومطابقتها ────────────────────────────────────
    const processed = senditService.processWebhookEvent({
      ...payload,
      code: trackingCode,
      newStatus: newStatus || 'DELIVERING',
    });

    const timestamp = payload.lastActionAt || new Date().toISOString();

    // ── 4. 🔴 BROADCAST SSE — تحديث فوري ولحظي لكل الشاشات ───────────
    trackingEventBus.emit({
      trackingCode,
      senditStatus: processed.newStatus,
      mappedStatus: processed.mappedStatus,
      message: payload.message || `Statut Sendit: ${processed.newStatus}`,
      timestamp,
      counterUnreachable: payload.counterUnreachable,
      proofImage: payload.proofImage,
    });

    realtimeHub.broadcast({
      eventType: 'SHIPMENT_STATUS_UPDATED',
      entityType: 'PARCEL',
      entityId: trackingCode,
      title: `Sendit: Colis ${trackingCode} → ${processed.mappedStatus}`,
      payload: {
        senditStatus: processed.newStatus,
        mappedStatus: processed.mappedStatus,
        message: payload.message,
        counterUnreachable: payload.counterUnreachable,
      },
      source: 'SENDIT_WEBHOOK',
    }).catch(() => {});

    // ── 5. تحديث قاعدة البيانات (Hostinger MySQL) ────────────────────
    try {
      const { getMysqlPool } = await import('@/lib/db');
      const pool = getMysqlPool();

      // 1. Locate order by sendit_tracking_number in shipment_details or order_number/id in order_leads
      const [matchedRows]: any = await pool.execute(
        `
        SELECT l.id AS order_id, l.order_number
        FROM order_leads l
        LEFT JOIN shipment_details s ON s.order_id = l.id
        WHERE s.sendit_tracking_number = ?
           OR l.order_number = ?
           OR l.id = ?
        LIMIT 1
        `,
        [trackingCode, trackingCode, trackingCode]
      );

      let orderId: string | null = null;
      if (Array.isArray(matchedRows) && matchedRows.length > 0) {
        orderId = matchedRows[0].order_id;
      }

      // 2. Upsert shipment_details
      if (orderId) {
        await pool.execute(
          `
          INSERT INTO shipment_details
            (id, order_id, carrier, sendit_tracking_number, status, failed_reason, last_status_update_at)
          VALUES
            (CONCAT('ship-', ?), ?, 'Sendit.ma Express', ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            sendit_tracking_number = VALUES(sendit_tracking_number),
            status                = VALUES(status),
            failed_reason         = VALUES(failed_reason),
            last_status_update_at = NOW()
          `,
          [
            orderId,
            orderId,
            trackingCode,
            processed.mappedStatus,
            processed.failureReason || null,
          ]
        );

        // 3. Update order status in order_leads with accurate MySQL enum values & automations
        const {
          recordCodRemittance,
          restoreStockForOrder,
          updateCustomerStatsOnOrderStatus,
          addTimelineEventToDb,
          invalidateOrdersCache,
        } = await import('@/lib/db-service');

        if (processed.mappedStatus === 'DELIVERED_PAID') {
          await pool.execute(
            `UPDATE order_leads SET status = 'DELIVERED_PAID', updated_at = NOW() WHERE id = ?`,
            [orderId]
          );
          await recordCodRemittance(orderId);
          await updateCustomerStatsOnOrderStatus(orderId, 'DELIVERED_PAID');
        } else if (processed.mappedStatus === 'RETURNED') {
          await pool.execute(
            `UPDATE order_leads SET status = 'DELIVERY_FAILED', updated_at = NOW() WHERE id = ?`,
            [orderId]
          );
          await restoreStockForOrder(orderId, `Retour colis Sendit (${trackingCode})`);
          await updateCustomerStatsOnOrderStatus(orderId, 'DELIVERY_FAILED');
        } else if (processed.mappedStatus === 'CANCELED' || (processed.mappedStatus as string) === 'CANCELLED') {
          await pool.execute(
            `UPDATE order_leads SET status = 'CANCELED', updated_at = NOW() WHERE id = ?`,
            [orderId]
          );
          await restoreStockForOrder(orderId, `Annulation via Webhook Sendit (${trackingCode})`);
          await updateCustomerStatsOnOrderStatus(orderId, 'CANCELED');
        } else if (processed.mappedStatus === 'DELIVERY_FAILED') {
          await pool.execute(
            `UPDATE order_leads SET status = 'DELIVERY_FAILED', updated_at = NOW() WHERE id = ?`,
            [orderId]
          );
          await updateCustomerStatsOnOrderStatus(orderId, 'DELIVERY_FAILED');
        } else if (processed.mappedStatus === 'OUT_FOR_DELIVERY' || processed.mappedStatus === 'IN_TRANSIT') {
          await pool.execute(
            `UPDATE order_leads SET status = 'IN_TRANSIT', updated_at = NOW() WHERE id = ? AND status NOT IN ('DELIVERED_PAID', 'CANCELED')`,
            [orderId]
          );
        }

        invalidateOrdersCache();

        // 4. Add timeline event
        await addTimelineEventToDb({
          orderId,
          action: 'SENDIT_WEBHOOK',
          title: `Sendit: ${payload.oldStatus ? `${payload.oldStatus} -> ` : ''}${processed.newStatus}`,
          details: payload.message || `Mise à jour automatique par webhook Sendit.ma (${trackingCode})`,
          actor: 'SENDIT',
        });
      } else {
        // Fallback: update any existing shipment_details matching this tracking number
        await pool.execute(
          `UPDATE shipment_details SET status = ?, failed_reason = ?, last_status_update_at = NOW() WHERE sendit_tracking_number = ?`,
          [processed.mappedStatus, processed.failureReason || null, trackingCode]
        );
      }
    } catch (dbErr: any) {
      console.warn('[Webhook Sendit] Mise à jour DB passée:', dbErr.message);
    }

    // ── 6. تشغيل الأتمتة الذكية (WhatsApp Notifications) ────────────
    const orders = getInboundOrders();
    let matchingOrder = orders.find(
      (o) => o.tracking?.trackingNumber === trackingCode || o.orderNumber === trackingCode
    );

    // Fallback: Reconstruct order from MySQL if memory cache was reset
    if (!matchingOrder) {
      try {
        const { getMysqlPool } = await import('@/lib/db');
        const pool = getMysqlPool();
        const [matchedDbRows]: any = await pool.execute(
          `SELECT l.*, s.sendit_tracking_number 
           FROM order_leads l 
           LEFT JOIN shipment_details s ON l.id = s.order_id 
           WHERE s.sendit_tracking_number = ? OR l.order_number = ? OR l.id = ? 
           LIMIT 1`,
          [trackingCode, trackingCode, trackingCode]
        );

        if (Array.isArray(matchedDbRows) && matchedDbRows.length > 0) {
          const l = matchedDbRows[0];
          matchingOrder = {
            id: l.id,
            orderNumber: l.order_number,
            customer: {
              name: l.customer_name || 'Client',
              phone: l.phone_number || '',
              address: l.address || '',
              city: l.city || '',
            },
            payment: {
              amount: Number(l.total_amount) || 0,
              currency: 'MAD',
              method: 'COD',
              status: processed.mappedStatus === 'DELIVERED_PAID' ? 'COLLECTED' : 'PENDING',
            },
            tracking: {
              trackingNumber: trackingCode,
              courier: 'Sendit.ma',
              status: processed.mappedStatus as any,
            },
          } as any;
        }
      } catch (err: any) {
        console.warn('[Webhook Sendit] Order reconstruction warning:', err.message);
      }
    }

    if (processed.mappedStatus === 'DELIVERY_FAILED') {
      const reason = processed.failureReason || 'Client Injoignable';
      if (matchingOrder) {
        await triggerNeedsAttentionRescue(matchingOrder, reason);
      }
    } else if (processed.mappedStatus === 'OUT_FOR_DELIVERY') {
      if (matchingOrder) {
        await triggerOutForDeliveryNotice(
          matchingOrder.customer.phone,
          matchingOrder.customer.name,
          trackingCode
        );
        await triggerMorningCodReminder(
          matchingOrder.customer.phone,
          matchingOrder.customer.name,
          trackingCode,
          matchingOrder.payment.amount
        );
      }
    } else if (processed.mappedStatus === 'DELIVERED_PAID') {
      if (matchingOrder) {
        await triggerReviewInvitation(
          matchingOrder.customer.phone,
          matchingOrder.customer.name,
          matchingOrder.orderNumber
        );
      }
    }

    // ── 7. رد نجاح 200 لـ Sendit ──────────────────────────────────────
    return NextResponse.json({
      success: true,
      code: trackingCode,
      senditStatus: processed.newStatus,
      mappedStatus: processed.mappedStatus,
      sseBroadcast: true,
      timestamp,
    });
  } catch (err: any) {
    console.error('[Webhook Sendit] Erreur serveur:', err.message);
    return NextResponse.json(
      { error: 'Erreur lors du traitement du Webhook Sendit', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/sendit
 * فحص صحة الـ Webhook من متصفح أو فحص Sendit ping
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const config = senditService.getConfiguration();

  return NextResponse.json({
    status: 'online',
    service: 'Sendit.ma Webhook Gateway',
    endpoint: '/api/webhooks/sendit',
    security: {
      hasSecretConfigured: config.hasWebhookSecret,
      tokenMatches: token ? token === process.env.SENDIT_WEBHOOK_SECRET : null,
    },
    timestamp: new Date().toISOString(),
  });
}
