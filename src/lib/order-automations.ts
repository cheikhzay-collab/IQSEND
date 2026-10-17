import { sendInteractiveButtons, sendWhatsAppMessage } from './whatsapp';
import { getInboundOrders, IngestedOrder } from './orders-store';

/**
 * Pillar 1: Confirmation AI Agent
 * Send instant interactive WhatsApp order confirmation message with summary,
 * quick action buttons (Confirm/Modify), and smart upselling offer.
 */
export async function triggerOrderConfirmationOutreach(order: IngestedOrder) {
  const customerName = order.customer?.name || 'الزبون المحترم';
  const phone = order.customer?.phone;
  if (!phone) return { success: false, reason: 'No phone number' };

  const firstItem = order.items?.[0];
  const itemsText = order.items
    .map((item) => `• ${item.name} (${item.quantity}x) - ${item.price} DH`)
    .join('\n');

  // Upsell suggestion calculation: 2nd piece at 30% discount
  const unitPrice = firstItem?.price || 199;
  const upsellPrice = Math.round(unitPrice * 0.7);
  const bundleTotalPrice = unitPrice + upsellPrice;

  const bodyText = `سلام عليكم أخي/أختي ${customerName} 👋
شكراً على طلبك من متجرنا! سجلنا الطلب ديالك رقم #${order.orderNumber}:

📦 تفاصيل الطلب:
${itemsText}
🏙️ المدينة: ${order.customer?.city || 'المغرب'}
📍 العنوان: ${order.customer?.address || 'المحدد بالطلب'}
💰 المبلغ الإجمالي الدفع عند الاستلام: ${order.payment?.amount} درهم

🎁 *عرض ترويجي خاص بيك:*
واش تبغي نضيفو ليك حبة ثانية بخصم *30%* (غير بـ ${upsellPrice} درهم عوض ${unitPrice} درهم)؟

عفاك أكد لينا الطلب بضغطة زر أسفله:`.trim();

  const buttons = [
    { id: `CONFIRM_${order.id}`, title: 'تأكيد الطلب ✅' },
    { id: `UPSELL_${order.id}`, title: 'إضافة قطعة (-30%) 🎁' },
    { id: `MODIFY_${order.id}`, title: 'تعديل الطلب ✍️' },
  ];

  const result = await sendInteractiveButtons(phone, bodyText, buttons, 'تأكيد طلبية Sendit');
  
  // Update order record
  order.aiVerification = {
    status: 'NEEDS_REVIEW',
    riskScore: order.aiVerification?.riskScore || 10,
    notes: 'Message de confirmation WhatsApp envoyé avec boutons interactifs',
  };
  order.upsellOffer = {
    offered: true,
    accepted: false,
    newQuantity: 2,
    extraPriceMad: upsellPrice,
    discountPercent: 30,
    bundleTitle: 'Pack Duo (-30%)',
  };

  return { success: true, result };
}

/**
 * Pillar 2: Needs Attention Rescue Engine
 * Friendly automated recovery message when Sendit delivery attempt fails (unreachable, postponed, wrong address)
 */
export async function triggerNeedsAttentionRescue(
  order: IngestedOrder,
  failureReason: string = 'Client Injoignable'
) {
  const customerName = order.customer?.name || 'الزبون المحترم';
  const phone = order.customer?.phone;
  if (!phone) return { success: false, reason: 'No phone' };

  const bodyText = `مرحباً بك أخي ${customerName}،
لاحظنا أن موزع شركة Sendit واجه صعوبة في تسليم طلبك اليوم (${failureReason}). 🚚

حنا حريصين جداً توصلك الكولية ديالك في أحسن الظروف. كيفاش تفضل نكملوا التوصيل؟`.trim();

  const buttons = [
    { id: `RESCUE_TOMORROW_${order.id}`, title: 'استلام غداً 📅' },
    { id: `RESCUE_LOCATION_${order.id}`, title: 'إرسال الموقع 📍' },
    { id: `RESCUE_SUPPORT_${order.id}`, title: 'التحدث مع المندوب 📞' },
  ];

  const result = await sendInteractiveButtons(phone, bodyText, buttons, 'متابعة توصيل طلبيتك');

  if (order.rescue) {
    order.rescue.status = 'OUTREACH_SENT';
    order.rescue.failureReason = failureReason;
    order.rescue.outreachCount = (order.rescue.outreachCount || 0) + 1;
    order.rescue.lastOutreachAt = new Date().toISOString();
  } else {
    order.rescue = {
      status: 'OUTREACH_SENT',
      failureReason,
      outreachCount: 1,
      lastOutreachAt: new Date().toISOString(),
      notes: `Rescue outreach triggered for ${failureReason}`,
    };
  }

  return { success: true, result };
}

/**
 * Pillar 4: Interactive Tracking Notifications
 */

// 1. Dispatch Notification (En route with tracking link)
export async function triggerOutForDeliveryNotice(
  phone: string,
  customerName: string,
  trackingCode: string,
  carrier: string = 'Sendit.ma'
) {
  const trackingUrl = `https://app.sendit.ma/tracking/${trackingCode}`;
  const message = `أهلاً ${customerName}! 🚚
طلبيتك رقم *${trackingCode}* خرجت مع موزع ${carrier} وهي في الطريق إليك الآن.
يمكنك تتبع مسار الشحنة مباشرة عبر الرابط التالي:
🔗 ${trackingUrl}

خلي هاتفك متاح باش يتصل بيك المندوب عند الوصول! ✨`;

  return await sendWhatsAppMessage(phone, message);
}

// 2. Morning-of-delivery COD Reminder
export async function triggerMorningCodReminder(
  phone: string,
  customerName: string,
  trackingCode: string,
  codAmountMad: number
) {
  const message = `صباح الخير ${customerName} ☀️
تذكير ودود: كوليتك رقم *${trackingCode}* مبرمجة للتوصيل اليوم عبر Sendit.
💵 يرجى تحضير المبلغ المطلوب نقداً: *${codAmountMad} درهم*.
الموزع سيتصل بك قريباً للتنسيق. شكراً لثقتكم! 📦`;

  return await sendWhatsAppMessage(phone, message);
}

// 3. Post-Delivery Thank you and Review Invitation
export async function triggerReviewInvitation(
  phone: string,
  customerName: string,
  orderNumber: string
) {
  const reviewUrl = `http://localhost:3000/dashboard/orders/reviews?order=${orderNumber}`;
  const message = `بصحتك وراحتك أخي ${customerName}! 🎉
تم تأكيد تسليم طلبك #${orderNumber} بنجاح.
رأيك يهمنا بزاف لتحسين خدماتنا! كيف كانت تجربتك مع جودة المنتج وسرعة التوصيل؟
⭐ يمكنك مشاركة تقييمك بنقرة واحدة هنا:
🔗 ${reviewUrl}

نتشرف بخدمتك دائماً! ❤️`;

  return await sendWhatsAppMessage(phone, message);
}
