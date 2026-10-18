import { NextResponse } from 'next/server';
import { sendWhatsAppMessage, verifyWebhookChallenge } from '@/lib/whatsapp';
import { getInboundOrders, cleanMoroccanPhone } from '@/lib/orders-store';
import { processCustomerWhatsAppMessage, OrderContext } from '@/lib/gemini-agent';

// GET: verification challenge (Facebook/Meta webhook verification)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'sendit_cod_secret';

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(verifyWebhookChallenge(challenge), { status: 200 });
  }
  return new NextResponse('Verification failed', { status: 403 });
}

// POST: inbound messages from WhatsApp Business API
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('[WhatsApp Webhook] Inbound payload:', JSON.stringify(payload, null, 2));

    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages;

    if (!messages || messages.length === 0) {
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }

    const msg = messages[0];
    const rawFrom = msg.from || '';
    const cleanedFrom = cleanMoroccanPhone(rawFrom);

    // Locate matching order in store
    const orders = getInboundOrders();
    const order = orders.find(
      (o) =>
        cleanMoroccanPhone(o.customer?.phone) === cleanedFrom ||
        o.customer?.phone?.includes(cleanedFrom) ||
        cleanedFrom.includes(cleanMoroccanPhone(o.customer?.phone))
    );

    // ─────────────────────────────────────────────────────────────
    // 1. Handle Interactive Buttons Click (Confirm / Modify / Upsell)
    // ─────────────────────────────────────────────────────────────
    if (msg.type === 'interactive' && msg.interactive?.button_reply) {
      const buttonId = msg.interactive.button_reply.id || '';
      console.log(`[WhatsApp Webhook] Button clicked: ${buttonId} from ${cleanedFrom}`);

      if (buttonId.startsWith('CONFIRM_')) {
        if (order) {
          order.aiVerification = {
            status: 'CONFIRMED_BY_AI',
            riskScore: 5,
            notes: 'Confirmé directement par le client via bouton interactif WhatsApp',
          };
        }
        const reply = `شكراً بزاف ليك أخي${order?.customer?.name ? ` ${order.customer.name}` : ''}! الطلب ديالك تأكد بنجاح وغادي يدوز دابا للتجهيز والتغليف. 📦
باش يوصل الموزع عندك بالزربة وبدون تعثر، عفاك صيفط لينا اللوكاسيون (Location Pin) ديالك عبر هاد المحادثة 📍👇`;
        await sendWhatsAppMessage(rawFrom, reply);
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
      }

      if (buttonId.startsWith('UPSELL_')) {
        if (order && order.upsellOffer) {
          order.upsellOffer.accepted = true;
          const extraPrice = order.upsellOffer.extraPriceMad || 139;
          order.payment.amount = (order.payment.amount || 0) + extraPrice;
          if (order.items && order.items[0]) {
            order.items[0].quantity = (order.items[0].quantity || 1) + 1;
          }
          order.aiVerification = {
            status: 'CONFIRMED_BY_AI',
            riskScore: 5,
            notes: `Upsell accepté (+${extraPrice} MAD). Nouveau total: ${order.payment.amount} MAD`,
          };
        }
        const reply = `عرض ممتاز! 🎉 تمت إضافة القطعة الثانية بخصم 30% إلى طلبيتك بنجاح.
المجموع الجديد: *${order?.payment?.amount || ''} درهم* (الدفع عند الاستلام).
عفاك شارك معنا اللوكاسيون ديالك عبر الواتساب لتسريع وصول الموزع 📍`;
        await sendWhatsAppMessage(rawFrom, reply);
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
      }

      if (buttonId.startsWith('MODIFY_')) {
        const reply = `مرحبا بك أخي! شنو التعديل لي بغيتي ديرو في الطلب ديالك؟ (المقاس، اللون، المدينة، أو تحديد توقيت التوصيل) ✍️`;
        await sendWhatsAppMessage(rawFrom, reply);
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
      }

      if (buttonId.startsWith('RESCUE_TOMORROW_')) {
        if (order?.rescue) {
          order.rescue.status = 'RESCHEDULED';
          order.rescue.notes = 'Le client a confirmé le report de livraison à demain';
        }
        const reply = `تمام أخي! سجلنا بلي تفضل الاستلام غداً إن شاء الله. علمنا موزع Sendit وغيتصل بيك غداً صباحاً للتسليم. نهارك مبروك! 🚚✨`;
        await sendWhatsAppMessage(rawFrom, reply);
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
      }

      if (buttonId.startsWith('RESCUE_LOCATION_')) {
        const reply = `مرحبا بك! عفاك اضغط على علامة المشبك 📎 أو (+) في الواتساب واضغط على Location وصيفط لينا موقعك الحالي 📍`;
        await sendWhatsAppMessage(rawFrom, reply);
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Handle WhatsApp Location Pin (GPS Coordinates)
    // ─────────────────────────────────────────────────────────────
    if (msg.type === 'location' && msg.location) {
      const lat = msg.location.latitude;
      const lng = msg.location.longitude;
      const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
      console.log(`[WhatsApp Webhook] GPS received for ${cleanedFrom}: ${mapsUrl}`);

      if (order) {
        order.gpsLocationUrl = mapsUrl;
        if (order.rescue) {
          order.rescue.status = 'ADDRESS_UPDATED';
        }
      }

      const reply = `شكراً جزيلاً! تسجل موقع التوصيل الجغرافي بنجاح وغادي نمرروه مباشرة لموزع Sendit باش يوصل بدون أي تعثر. نهارك سعيد! 📍✅`;
      await sendWhatsAppMessage(rawFrom, reply);
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Handle Natural Text Message via Gemini Moroccan AI Agent
    // ─────────────────────────────────────────────────────────────
    const incomingText = msg.text?.body || '';
    if (incomingText) {
      // Execute Gemini AI Agent with Moroccan Context
      const orderContext: OrderContext = {
        orderId: order?.id || 'lead_temp',
        orderNumber: order?.orderNumber || 'MA-TEMP',
        customerName: order?.customer?.name || 'الزبون المحترم',
        phoneNumber: rawFrom,
        city: order?.customer?.city || 'المغرب',
        address: order?.customer?.address || 'غير محدد',
        totalAmount: order?.payment?.amount || 299,
        items: (order?.items || []).map((it) => ({
          name: it.name,
          sku: it.sku,
          quantity: it.quantity,
          price: it.price,
        })),
        conversationHistory: [],
      };

      try {
        const aiResult = await processCustomerWhatsAppMessage(incomingText, orderContext, {
          onConfirm: async () => {
            if (order) {
              order.aiVerification = {
                status: 'CONFIRMED_BY_AI',
                riskScore: 5,
                notes: 'Confirmé avec succès par le bot IA Gemini',
              };
            }
          },
          onUpdateDetails: async (args) => {
            if (order && args.updatedPrice) {
              order.payment.amount = args.updatedPrice;
            }
          },
          onSaveGps: async (args) => {
            if (order) {
              order.gpsLocationUrl = args.googleMapsUrl;
            }
          },
          onCancel: async () => {
            if (order) {
              order.aiVerification = {
                status: 'NEEDS_REVIEW',
                riskScore: 95,
                notes: 'Annulation demandée par le client',
              };
            }
          },
          onHandover: async () => {
            if (order) {
              order.aiVerification = {
                status: 'NEEDS_REVIEW',
                riskScore: 50,
                notes: 'Client transféré à un agent humain',
              };
            }
          },
        });

        if (aiResult.replyText) {
          await sendWhatsAppMessage(rawFrom, aiResult.replyText);
        }
      } catch (geminiError: any) {
        console.error('Error invoking Gemini conversational agent:', geminiError.message);
        await sendWhatsAppMessage(rawFrom, 'شكراً على رسالتكم! توصلنا بطلبكم وسيتواصل معكم فريقنا لتأكيد التفاصيل.');
      }
    }

    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (err) {
    console.error('Error handling WhatsApp webhook:', err);
    return new NextResponse('Bad Request', { status: 400 });
  }
}
