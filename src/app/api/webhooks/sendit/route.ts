import { NextRequest, NextResponse } from 'next/server';
import { senditService, SenditWebhookPayload } from '@/lib/sendit-service';
import { getInboundOrders } from '@/lib/orders-store';
import {
  triggerNeedsAttentionRescue,
  triggerOutForDeliveryNotice,
  triggerMorningCodReminder,
  triggerReviewInvitation,
} from '@/lib/order-automations';

/**
 * POST /api/webhooks/sendit
 *
 * يستقبل أحداث Webhook الرسمية من Sendit.ma عند تغيّر حالة أي كولي.
 *
 * أمان: يتحقق من Header "X-Sendit-Signature" (HMAC-SHA256)
 * مرجع: https://app.sendit.ma/guide-webhook-sendit.pdf
 *
 * Payload المتوقّع من Sendit:
 * {
 *   "event": "delivery.status.update",
 *   "code": "DHF420101C",
 *   "oldStatus": "IN_TRANSIT",
 *   "newStatus": "OUT_FOR_DELIVERY",
 *   "lastActionAt": "2025-06-11 16:05:05",
 *   "message": "Avec le livreur",
 *   "deliverBy": "2025-06-12",
 *   "counterUnreachable": 0
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // ── 1. قراءة الـ body الخام للتحقق من التوقيع ──────────────────
    const rawBody = await req.text();
    const signature = req.headers.get('x-sendit-signature') || '';
    const webhookSecret = process.env.SENDIT_WEBHOOK_SECRET || '';

    // ── 2. التحقق من توقيع HMAC-SHA256 (في الإنتاج فقط) ────────────
    if (process.env.NODE_ENV === 'production' && webhookSecret) {
      const isValid = senditService.verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn(`[Webhook Sendit] ❌ Signature invalide — header: "${signature}"`);
        return NextResponse.json({ error: 'Signature webhook invalide' }, { status: 401 });
      }
    }

    // ── 3. Parse le payload ──────────────────────────────────────────
    const payload = JSON.parse(rawBody) as SenditWebhookPayload;

    // ── 4. Validation des champs requis ─────────────────────────────
    if (!payload.code || !payload.newStatus || !payload.event) {
      return NextResponse.json(
        { error: 'Payload invalide: code, event et newStatus sont requis' },
        { status: 400 }
      );
    }

    console.log(
      `[Webhook Sendit] 📦 ${payload.code}: ${payload.oldStatus} → ${payload.newStatus} (${payload.lastActionAt})`
    );

    // ── 5. Traitement du statut ──────────────────────────────────────
    const {
      mappedStatus,
      failureReason,
      shouldSendWhatsAppNotification,
      whatsAppNotificationPayload,
    } = senditService.processWebhookEvent(payload);

    // ── 6. Mise à jour DB (Prisma) ───────────────────────────────────
    // À activer avec Prisma + la vraie clé dans DATABASE_URL :
    //
    // const shipment = await prisma.shipmentDetail.update({
    //   where: { senditTrackingNumber: payload.code },
    //   data: {
    //     status: mappedStatus,
    //     failedReason: failureReason ?? null,
    //     deliveryAttemptsCount: {
    //       increment: mappedStatus === 'DELIVERY_FAILED' ? 1 : 0,
    //     },
    //     lastStatusUpdateAt: new Date(payload.lastActionAt),
    //     // متى تم التسليم؟
    //     ...(mappedStatus === 'DELIVERED_PAID' && {
    //       deliveredAt: new Date(payload.lastActionAt),
    //     }),
    //   },
    //   include: { order: { include: { lead: true } } },
    // });

    // ── 6. Traitement automatique des 4 piliers (Rescue & Notifications) ─
    const orders = getInboundOrders();
    const matchingOrder = orders.find(
      (o) => o.tracking?.trackingNumber === payload.code || o.orderNumber === payload.code
    );

    if (mappedStatus === 'DELIVERY_FAILED') {
      const reason = failureReason || payload.message || 'Client Injoignable';
      if (matchingOrder) {
        await triggerNeedsAttentionRescue(matchingOrder, reason);
      }
    } else if (mappedStatus === 'OUT_FOR_DELIVERY') {
      if (matchingOrder) {
        await triggerOutForDeliveryNotice(
          matchingOrder.customer.phone,
          matchingOrder.customer.name,
          payload.code
        );
        await triggerMorningCodReminder(
          matchingOrder.customer.phone,
          matchingOrder.customer.name,
          payload.code,
          matchingOrder.payment.amount
        );
      }
    } else if (mappedStatus === 'DELIVERED_PAID') {
      if (matchingOrder) {
        await triggerReviewInvitation(
          matchingOrder.customer.phone,
          matchingOrder.customer.name,
          matchingOrder.orderNumber
        );
      }
    }

    // ── 7. Répondre à Sendit (obligatoire: 200 OK) ───────────────────
    return NextResponse.json({
      success: true,
      code: payload.code,
      oldStatus: payload.oldStatus,
      newStatus: payload.newStatus,
      mappedStatus,
      autoNotificationSent: shouldSendWhatsAppNotification,
    });
  } catch (err: any) {
    console.error('[Webhook Sendit] Erreur interne:', err.message);
    return NextResponse.json(
      { error: 'Erreur lors du traitement du Webhook Sendit', details: err.message },
      { status: 500 }
    );
  }
}
