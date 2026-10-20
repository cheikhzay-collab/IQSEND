import { NextRequest, NextResponse } from 'next/server';
import { senditService, SenditWebhookPayload } from '@/lib/sendit-service';
import { getInboundOrders } from '@/lib/orders-store';
import { trackingEventBus } from '@/lib/tracking-events';
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

    // ── 5. تحديث قاعدة البيانات (Hostinger MySQL) ────────────────────
    try {
      const { getMysqlPool } = await import('@/lib/db');
      const pool = getMysqlPool();

      // تحديث shipment_details
      await pool.execute(
        `
        INSERT INTO shipment_details
          (id, order_id, sendit_tracking_number, status, failed_reason, last_status_update_at)
        SELECT
          CONCAT('ship-', l.id),
          l.id,
          ?,
          ?,
          ?,
          NOW()
        FROM order_leads l
        WHERE l.sendit_tracking_number = ?
           OR l.order_number = ?
        ON DUPLICATE KEY UPDATE
          status                = VALUES(status),
          failed_reason         = VALUES(failed_reason),
          last_status_update_at = NOW()
        `,
        [
          trackingCode,
          processed.mappedStatus,
          processed.failureReason || null,
          trackingCode,
          trackingCode,
        ]
      );

      // تحديث مرحلة الطلب في order_leads إن وجدت
      if (processed.mappedStatus === 'DELIVERED_PAID') {
        await pool.execute(
          `UPDATE order_leads SET status = 'DELIVERED', updated_at = NOW() WHERE sendit_tracking_number = ? OR order_number = ?`,
          [trackingCode, trackingCode]
        );
      } else if (processed.mappedStatus === 'RETURNED' || processed.mappedStatus === 'CANCELLED') {
        await pool.execute(
          `UPDATE order_leads SET status = 'CANCELLED', updated_at = NOW() WHERE sendit_tracking_number = ? OR order_number = ?`,
          [trackingCode, trackingCode]
        );
      }

      // إضافة حدث Timeline
      const { addTimelineEventToDb } = await import('@/lib/db-service');
      const [rows]: any = await pool.execute(
        `SELECT id FROM order_leads WHERE sendit_tracking_number = ? OR order_number = ? LIMIT 1`,
        [trackingCode, trackingCode]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        await addTimelineEventToDb({
          orderId: rows[0].id,
          action: 'SENDIT_WEBHOOK',
          title: `Sendit: ${payload.oldStatus ? `${payload.oldStatus} -> ` : ''}${processed.newStatus}`,
          details: payload.message || `Mise à jour automatique par webhook Sendit.ma`,
          actor: 'SENDIT_MA',
        });
      }
    } catch (dbErr: any) {
      console.warn('[Webhook Sendit] Mise à jour DB passée:', dbErr.message);
    }

    // ── 6. تشغيل الأتمتة الذكية (WhatsApp Notifications) ────────────
    const orders = getInboundOrders();
    const matchingOrder = orders.find(
      (o) => o.tracking?.trackingNumber === trackingCode || o.orderNumber === trackingCode
    );

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
