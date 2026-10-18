import { NextResponse } from 'next/server';
import { sendWhatsAppMessage, verifyWebhookChallenge } from '@/lib/whatsapp';
import { getInboundOrders, cleanMoroccanPhone } from '@/lib/orders-store';
import { processCustomerWhatsAppMessage, processCustomerVoiceNote, OrderContext } from '@/lib/gemini-agent';
import { getMysqlPool } from '@/lib/db';
import { logWhatsAppMessageToDb, addTimelineEventToDb } from '@/lib/db-service';
import { recordInboundMessage, recordOutboundMessage } from '@/lib/inbox-store';

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
    let order: any = orders.find(
      (o) =>
        cleanMoroccanPhone(o.customer?.phone) === cleanedFrom ||
        o.customer?.phone?.includes(cleanedFrom) ||
        cleanedFrom.includes(cleanMoroccanPhone(o.customer?.phone))
    );

    // If not found in memory, query Hostinger MySQL directly
    if (!order) {
      try {
        const pool = getMysqlPool();
        const [dbRows]: any = await pool.execute(
          `SELECT l.*, i.product_name, i.price as item_price, i.quantity as item_qty, i.sku
           FROM order_leads l
           LEFT JOIN order_items i ON l.id = i.order_id
           WHERE l.phone_number LIKE ? OR ? LIKE CONCAT('%', l.phone_number, '%')
           ORDER BY l.created_at DESC LIMIT 1`,
          [`%${cleanedFrom.slice(-9)}%`, cleanedFrom]
        );
        if (Array.isArray(dbRows) && dbRows.length > 0) {
          const row = dbRows[0];
          order = {
            id: row.id,
            orderNumber: row.order_number,
            customer: {
              name: row.customer_name,
              phone: row.phone_number,
              city: row.city,
              address: row.address,
              notes: row.notes,
            },
            items: [{
              name: row.product_name || 'Smart Watch Ultra Pro S2',
              sku: row.sku || 'SKU-GEN',
              quantity: row.item_qty || 1,
              price: Number(row.total_amount),
            }],
            payment: {
              amount: Number(row.total_amount),
            },
          };
        }
      } catch (dbErr) {
        console.warn('[WhatsApp Webhook] MySQL lead lookup notice:', dbErr);
      }
    }

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
    // 2B. Handle WhatsApp Voice Note / Audio Message (Gemini Native Audio)
    // ─────────────────────────────────────────────────────────────
    if ((msg.type === 'audio' || msg.audio) && msg.audio?.base64) {
      console.log(`[WhatsApp Webhook] 🎙️ Processing Voice Note from ${cleanedFrom} (${msg.audio.seconds || 0}s, ${msg.audio.mimetype})`);
      const orderContext: OrderContext = {
        orderId: order?.id || 'lead_temp',
        orderNumber: order?.orderNumber || 'MA-TEMP',
        customerName: order?.customer?.name || 'الزبون المحترم',
        phoneNumber: rawFrom,
        city: order?.customer?.city || 'المغرب',
        address: order?.customer?.address || 'غير محدد',
        totalAmount: order?.payment?.amount || 299,
        items: (order?.items || []).map((it: any) => ({
          name: it.name,
          sku: it.sku,
          quantity: it.quantity,
          price: it.price,
        })),
        conversationHistory: [],
      };

      try {
        await logWhatsAppMessageToDb({
          orderId: order?.id,
          phone: rawFrom,
          sender: 'CUSTOMER',
          body: `[رسالة صوتية ${msg.audio.seconds || 0} ثانية]`,
          messageType: 'audio',
        });

        const voiceResult = await processCustomerVoiceNote(
          msg.audio.base64,
          msg.audio.mimetype || 'audio/ogg',
          orderContext,
          {
            onConfirm: async (args) => {
              if (order) {
                order.aiVerification = {
                  status: 'CONFIRMED_BY_AI',
                  riskScore: 5,
                  notes: 'Confirmé par note vocale WhatsApp via Gemini IA',
                };
                order.stage = 'CONFIRMED';
              }
              try {
                const pool = getMysqlPool();
                await pool.execute(
                  `UPDATE order_leads 
                   SET status = 'CONFIRMED', 
                       ai_confirmation_status = 'CONFIRMED', 
                       city = IFNULL(?, city),
                       address = IFNULL(?, address),
                       notes = CONCAT(IFNULL(notes, ''), ' [تأكيد عبر رسالة صوتية واتساب]'),
                       updated_at = CURRENT_TIMESTAMP 
                   WHERE id = ? OR phone_number LIKE ?`,
                  [args.verifiedCity || null, args.verifiedAddress || null, order?.id || '', `%${cleanedFrom.slice(-9)}%`]
                );
                await addTimelineEventToDb({
                  orderId: order?.id || 'lead_temp',
                  action: 'AI_CONFIRMED',
                  title: 'Confirmation par Note Vocale WhatsApp',
                  details: `Le client a confirmé sa commande par note vocale pour ${args.verifiedCity || order?.customer?.city}.`,
                  actor: 'AI_AGENT:Sarah',
                });
              } catch (dbErr) {
                console.warn('[Webhook Voice onConfirm DB error]:', dbErr);
              }
            },
            onUpdateDetails: async (args) => {
              if (order && args.updatedPrice) {
                order.payment.amount = args.updatedPrice;
              }
            },
            onSaveGps: async (args) => {
              if (order) order.gpsLocationUrl = args.googleMapsUrl;
            },
            onCancel: async (args) => {
              if (order) order.stage = 'CANCELLED';
              try {
                const pool = getMysqlPool();
                await pool.execute(
                  `UPDATE order_leads SET status = 'CANCELED', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR phone_number LIKE ?`,
                  [order?.id || '', `%${cleanedFrom.slice(-9)}%`]
                );
              } catch (e) {}
            },
            onHandover: async () => {},
            onSendProductImages: async (args) => {
              if (args.imageUrl) {
                const { sendWhatsAppImage } = await import('@/lib/whatsapp');
                await sendWhatsAppImage(rawFrom, args.imageUrl, args.caption);
              }
            },
          }
        );

        if (voiceResult.replyText) {
          await sendWhatsAppMessage(rawFrom, voiceResult.replyText);
          await logWhatsAppMessageToDb({
            orderId: order?.id,
            phone: rawFrom,
            sender: 'AI_BOT',
            body: voiceResult.replyText,
          });
        }
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
      } catch (voiceErr) {
        console.error('[WhatsApp Webhook] Voice note handling error:', voiceErr);
      }
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
        items: (order?.items || []).map((it: any) => ({
          name: it.name,
          sku: it.sku,
          quantity: it.quantity,
          price: it.price,
        })),
        conversationHistory: [],
      };

      try {
        // Log incoming customer message to Hostinger MySQL
        await logWhatsAppMessageToDb({
          orderId: order?.id,
          phone: rawFrom,
          sender: 'CUSTOMER',
          body: incomingText,
        });

        // Record in live Inbox Store
        try {
          recordInboundMessage({
            phone: rawFrom,
            realPhone: order?.customer?.phone || msg.realPhone,
            pushName: msg.senderName,
            text: incomingText,
            customerName: order?.customer?.name || msg.senderName,
            orderNumber: order?.orderNumber,
            city: order?.customer?.city,
            totalAmount: order?.payment?.amount,
          });
        } catch (inboxErr) {}

        const aiResult = await processCustomerWhatsAppMessage(incomingText, orderContext, {
          onConfirm: async (args) => {
            if (order) {
              order.aiVerification = {
                status: 'CONFIRMED_BY_AI',
                riskScore: 5,
                notes: 'Confirmé avec succès par le bot IA Gemini',
              };
              order.stage = 'CONFIRMED';
            }
            try {
              const pool = getMysqlPool();
              await pool.execute(
                `UPDATE order_leads 
                 SET status = 'CONFIRMED', 
                     ai_confirmation_status = 'CONFIRMED', 
                     city = IFNULL(?, city),
                     address = IFNULL(?, address),
                     notes = CONCAT(IFNULL(notes, ''), ' [تأكيد عبر محادثة واتساب]'),
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ? OR phone_number LIKE ?`,
                [args.verifiedCity || null, args.verifiedAddress || null, order?.id || '', `%${cleanedFrom.slice(-9)}%`]
              );
              await addTimelineEventToDb({
                orderId: order?.id || 'lead_temp',
                action: 'AI_CONFIRMED',
                title: 'Confirmation Client par WhatsApp',
                details: `Le client a confirmé sa commande pour ${args.verifiedCity || order?.customer?.city}.`,
                actor: 'AI_AGENT:Sarah',
              });
            } catch (dbErr) {
              console.warn('[Webhook onConfirm DB error]:', dbErr);
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
            try {
              const pool = getMysqlPool();
              await pool.execute(
                `UPDATE order_leads 
                 SET gps_location_url = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ? OR phone_number LIKE ?`,
                [args.googleMapsUrl, order?.id || '', `%${cleanedFrom.slice(-9)}%`]
              );
              await addTimelineEventToDb({
                orderId: order?.id || 'lead_temp',
                action: 'GPS_SAVED',
                title: 'Position GPS enregistrée',
                details: `Position reçue: ${args.googleMapsUrl}`,
                actor: 'CUSTOMER:WhatsApp',
              });
            } catch (dbErr) {
              console.warn('[Webhook onSaveGps DB error]:', dbErr);
            }
          },
          onCancel: async (args) => {
            if (order) {
              order.aiVerification = {
                status: 'NEEDS_REVIEW',
                riskScore: 95,
                notes: 'Annulation demandée par le client',
              };
              order.stage = 'CANCELLED';
            }
            try {
              const pool = getMysqlPool();
              await pool.execute(
                `UPDATE order_leads 
                 SET status = 'CANCELED', updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ? OR phone_number LIKE ?`,
                [order?.id || '', `%${cleanedFrom.slice(-9)}%`]
              );
              await addTimelineEventToDb({
                orderId: order?.id || 'lead_temp',
                action: 'ORDER_CANCELED',
                title: 'Annulation Client',
                details: args.reason || 'Annulé via WhatsApp',
                actor: 'CUSTOMER:WhatsApp',
              });
            } catch (dbErr) {
              console.warn('[Webhook onCancel DB error]:', dbErr);
            }
          },
          onHandover: async (args) => {
            if (order) {
              order.aiVerification = {
                status: 'NEEDS_REVIEW',
                riskScore: 50,
                notes: 'Client transféré à un agent humain',
              };
            }
            try {
              const pool = getMysqlPool();
              await pool.execute(
                `UPDATE order_leads 
                 SET ai_handover_required = 1, ai_handover_reason = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ? OR phone_number LIKE ?`,
                [args.reason || 'Escalade client', order?.id || '', `%${cleanedFrom.slice(-9)}%`]
              );
            } catch (dbErr) {}
          },
        });

        if (aiResult.replyText) {
          // Log outgoing bot message to Hostinger MySQL
          await logWhatsAppMessageToDb({
            orderId: order?.id,
            phone: rawFrom,
            sender: 'AI_BOT',
            body: aiResult.replyText,
          });

          await sendWhatsAppMessage(rawFrom, aiResult.replyText);

          try {
            recordOutboundMessage({
              phone: rawFrom,
              text: aiResult.replyText,
              sender: 'AI_BOT',
            });
          } catch (e) {}
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
