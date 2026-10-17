import { NextRequest, NextResponse } from 'next/server';
import { senditService, SenditWebhookPayload } from '@/lib/sendit-service';

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

    // ── 7. إرسال WhatsApp إذا لزم ────────────────────────────────────
    if (shouldSendWhatsAppNotification && whatsAppNotificationPayload) {
      console.log(
        `[WhatsApp Hook] 📱 ${whatsAppNotificationPayload.type} pour colis ${payload.code}`
      );
      // whatsappService.sendMessage(customerPhone, whatsAppNotificationPayload.suggestedMessageText);
    }

    // ── 8. Répondre à Sendit (obligatoire: 200 OK) ───────────────────
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
