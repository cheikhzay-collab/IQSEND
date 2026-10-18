import path from 'node:path';
import fs from 'node:fs';
import QRCode from 'qrcode';
import { processCustomerWhatsAppMessage, OrderContext } from '@/lib/gemini-agent';
import { getInboundOrders, cleanMoroccanPhone } from '@/lib/orders-store';
import { recordInboundMessage, recordOutboundMessage } from '@/lib/inbox-store';

export type WhatsAppStatus = 'INITIALIZING' | 'SCAN_QR' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface WhatsAppBridgeState {
  status: WhatsAppStatus;
  qrCodeDataUrl: string | null;
  rawQr: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  error: string | null;
  lastUpdated: number;
}

interface GlobalWaHolder {
  sock: any;
  reconnectTimer: NodeJS.Timeout | null;
  isStarting: boolean;
  state: WhatsAppBridgeState;
}

// Preserve singleton across fast-refresh and route invocations in Node memory
const globalForWa = globalThis as unknown as {
  __waBridge?: GlobalWaHolder;
};

const waHolder: GlobalWaHolder = globalForWa.__waBridge || {
  sock: null,
  reconnectTimer: null,
  isStarting: false,
  state: {
    status: 'INITIALIZING',
    qrCodeDataUrl: null,
    rawQr: null,
    connectedPhone: null,
    connectedName: null,
    error: null,
    lastUpdated: Date.now(),
  },
};

if (!globalForWa.__waBridge) {
  globalForWa.__waBridge = waHolder;
}

const AUTH_DIR = path.join(process.cwd(), 'whatsapp_sessions');

function cleanupSocket() {
  if (waHolder.reconnectTimer) {
    clearTimeout(waHolder.reconnectTimer);
    waHolder.reconnectTimer = null;
  }
  if (waHolder.sock) {
    try {
      waHolder.sock.ev.removeAllListeners('connection.update');
      waHolder.sock.ev.removeAllListeners('creds.update');
      waHolder.sock.ev.removeAllListeners('messages.upsert');
      waHolder.sock.end();
    } catch (e) {
      // ignore
    }
    waHolder.sock = null;
  }
}

export async function startBaileysService(): Promise<void> {
  if (waHolder.isStarting) return;
  waHolder.isStarting = true;

  try {
    cleanupSocket();

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    // Dynamic import to support SSR/Node runtime in Next.js
    const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = await import('@whiskeysockets/baileys');
    const { default: pino } = await import('pino');

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const currentSocket = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['Sendit COD Morocco', 'Chrome', '120.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });
    waHolder.sock = currentSocket;

    currentSocket.ev.on('creds.update', saveCreds);

    currentSocket.ev.on('connection.update', async (update: any) => {
      if (waHolder.sock !== currentSocket) return;

      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, {
            width: 340,
            margin: 2,
            color: {
              dark: '#1e1b4b',
              light: '#ffffff',
            },
          });

          waHolder.state = {
            status: 'SCAN_QR',
            rawQr: qr,
            qrCodeDataUrl: qrDataUrl,
            connectedPhone: null,
            connectedName: null,
            error: null,
            lastUpdated: Date.now(),
          };
          console.log('[Baileys In-Process] 📲 New Real QR Code ready to scan!');
        } catch (err: any) {
          console.error('[Baileys In-Process] Failed to render QR code:', err);
        }
      }

      if (connection === 'open') {
        const userJid = currentSocket.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0] || '';
        const name = currentSocket.user?.name || 'SIM Maroc';

        waHolder.state = {
          status: 'CONNECTED',
          connectedPhone: phone,
          connectedName: name,
          qrCodeDataUrl: null,
          rawQr: null,
          error: null,
          lastUpdated: Date.now(),
        };
        console.log(`[Baileys In-Process] 🟢 WhatsApp Connected successfully as +${phone} (${name})`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        console.log(`[Baileys In-Process] Connection closed: statusCode=${statusCode}`);

        if (statusCode === DisconnectReason.loggedOut) {
          waHolder.state = {
            status: 'DISCONNECTED',
            qrCodeDataUrl: null,
            rawQr: null,
            connectedPhone: null,
            connectedName: null,
            error: null,
            lastUpdated: Date.now(),
          };
          try {
            if (fs.existsSync(AUTH_DIR)) {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            }
          } catch (e) {}

          if (!waHolder.reconnectTimer) {
            waHolder.reconnectTimer = setTimeout(() => {
              waHolder.reconnectTimer = null;
              startBaileysService();
            }, 1500);
          }
        } else {
          if (!waHolder.reconnectTimer) {
            waHolder.reconnectTimer = setTimeout(() => {
              waHolder.reconnectTimer = null;
              startBaileysService();
            }, 3000);
          }
        }
      }
    });

    currentSocket.ev.on('messages.upsert', async (m: any) => {
      if (!m.messages || m.messages.length === 0) return;

      const { jidNormalizedUser } = await import('@whiskeysockets/baileys');

      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const fromJid = msg.key.remoteJid || '';
        // Skip groups, status broadcast, etc.
        if (
          !fromJid ||
          fromJid.endsWith('@g.us') ||
          fromJid.endsWith('@broadcast') ||
          fromJid === 'status@broadcast'
        ) {
          continue;
        }

        const normalizedJid = jidNormalizedUser(fromJid);
        const rawPhone = normalizedJid.split('@')[0];

        // Safe unwrap of message content across all WhatsApp message types
        const unwrap =
          msg.message.ephemeralMessage?.message ||
          msg.message.viewOnceMessage?.message ||
          msg.message.viewOnceMessageV2?.message ||
          msg.message.documentWithCaptionMessage?.message ||
          msg.message;

        // Check if message contains GPS location
        if (unwrap.locationMessage || unwrap.liveLocationMessage) {
          const loc = unwrap.locationMessage || unwrap.liveLocationMessage;
          const lat = loc.degreesLatitude;
          const lng = loc.degreesLongitude;
          const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
          console.log(`[Baileys In-Process] 📍 GPS location received from ${normalizedJid}: ${mapsUrl}`);

          let order: any = null;
          try {
            const orders = getInboundOrders();
            const cleanedPhone = cleanMoroccanPhone(rawPhone);
            order = orders.find((o) => cleanMoroccanPhone(o.customer?.phone) === cleanedPhone);
            if (order) {
              order.gpsLocationUrl = mapsUrl;
            }
          } catch (e) {}

          const gpsReply = 'شكراً جزيلاً! تسجل موقع التوصيل الجغرافي ديالك بنجاح وغادي نمرروه مباشرة لموزع Sendit باش يوصل بدون أي تعثر. نهارك سعيد! 📍✅';

          recordInboundMessage({
            phone: rawPhone,
            locationUrl: mapsUrl,
            customerName: order?.customer?.name,
            orderNumber: order?.orderNumber,
            city: order?.customer?.city,
            totalAmount: order?.payment?.amount,
          });

          const directRes = await sendWhatsAppDirectMessage(normalizedJid, gpsReply);
          if (directRes.success) {
            recordOutboundMessage({
              phone: rawPhone,
              text: gpsReply,
              sender: 'AI_BOT',
            });
          }
          continue;
        }

        const incomingText = (
          unwrap.conversation ||
          unwrap.extendedTextMessage?.text ||
          unwrap.buttonsResponseMessage?.selectedDisplayText ||
          unwrap.buttonsResponseMessage?.selectedButtonId ||
          unwrap.templateButtonReplyMessage?.selectedDisplayText ||
          unwrap.templateButtonReplyMessage?.selectedId ||
          unwrap.listResponseMessage?.singleSelectReply?.selectedRowId ||
          unwrap.listResponseMessage?.title ||
          unwrap.imageMessage?.caption ||
          unwrap.videoMessage?.caption ||
          ''
        ).trim();

        if (!incomingText) continue;

        console.log(`[Baileys In-Process] 💬 Inbound message from ${normalizedJid} (+${rawPhone}): "${incomingText}"`);

        try {
          const orders = getInboundOrders();
          const cleanedPhone = cleanMoroccanPhone(rawPhone);
          const order = orders.find(
            (o) =>
              cleanMoroccanPhone(o.customer?.phone) === cleanedPhone ||
              o.customer?.phone?.includes(cleanedPhone) ||
              cleanedPhone.includes(cleanMoroccanPhone(o.customer?.phone))
          );

          // 1. Record inbound message in Inbox Store
          const { conversation, isAiActive } = recordInboundMessage({
            phone: rawPhone,
            text: incomingText,
            customerName: order?.customer?.name,
            orderNumber: order?.orderNumber,
            city: order?.customer?.city,
            totalAmount: order?.payment?.amount,
          });

          // If merchant has paused AI for this conversation, do not auto-reply
          if (!isAiActive) {
            console.log(`[Baileys In-Process] 👤 AI Bot paused for +${rawPhone} (Human takeover active)`);
            continue;
          }

          // Build context including recent conversation history
          const recentHistory = (conversation?.messages || [])
            .slice(-7, -1)
            .map((m) => ({
              sender: m.sender,
              body: m.text,
              timestamp: new Date(),
            }));

          const orderContext: OrderContext = {
            orderId: order?.id || 'lead_temp',
            orderNumber: order?.orderNumber || '#MA-NEW',
            customerName: order?.customer?.name || 'الزبون المحترم',
            phoneNumber: rawPhone,
            city: order?.customer?.city || 'المغرب',
            address: order?.customer?.address || 'غير محدد',
            totalAmount: order?.payment?.amount || 299,
            items: (order?.items || []).map((it) => ({
              name: it.name,
              sku: it.sku,
              quantity: it.quantity,
              price: it.price,
            })),
            conversationHistory: recentHistory,
          };

          const aiResult = await processCustomerWhatsAppMessage(incomingText, orderContext, {
            onConfirm: async () => {
              if (order) {
                order.aiVerification = {
                  status: 'CONFIRMED_BY_AI',
                  riskScore: 5,
                  notes: 'Confirmé avec succès par le bot IA via WhatsApp (Baileys)',
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

          if (aiResult?.replyText) {
            // Anti-Ban delay: wait 1.5s before answering to simulate natural human typing
            await new Promise((r) => setTimeout(r, 1500));

            // Deliver directly to customer's canonical WhatsApp JID
            const directRes = await sendWhatsAppDirectMessage(normalizedJid, aiResult.replyText);

            if (directRes.success) {
              console.log(`[Baileys In-Process] ✅ AI response successfully delivered to customer ${normalizedJid}, msgId: ${directRes.msgId}`);
              recordOutboundMessage({
                phone: rawPhone,
                text: aiResult.replyText,
                sender: 'AI_BOT',
              });
            } else {
              console.error(`[Baileys In-Process] ❌ Failed to deliver AI message to ${normalizedJid}:`, directRes.error);
            }
          }
        } catch (err: any) {
          console.error('[Baileys In-Process] AI processing error:', err.message);
        }
      }
    });
  } catch (err: any) {
    console.error('[Baileys In-Process] Startup error:', err);
    waHolder.state.status = 'ERROR';
    waHolder.state.error = err.message || String(err);
  } finally {
    waHolder.isStarting = false;
  }
}

export function getWhatsAppDirectStatus(): WhatsAppBridgeState {
  return waHolder.state;
}

export async function getWhatsAppStatus(): Promise<WhatsAppBridgeState> {
  // If not running and not connected, start it automatically
  if (!waHolder.sock && !waHolder.isStarting && waHolder.state.status !== 'CONNECTED') {
    startBaileysService().catch(console.error);
  }
  return waHolder.state;
}

export async function restartWhatsAppSession(): Promise<WhatsAppBridgeState> {
  cleanupSocket();
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch (e) {}
  waHolder.state = {
    status: 'INITIALIZING',
    qrCodeDataUrl: null,
    rawQr: null,
    connectedPhone: null,
    connectedName: null,
    error: null,
    lastUpdated: Date.now(),
  };
  await startBaileysService();
  return waHolder.state;
}

export async function disconnectWhatsAppSession(): Promise<WhatsAppBridgeState> {
  if (waHolder.sock) {
    try {
      await waHolder.sock.logout();
    } catch (e) {}
  }
  cleanupSocket();
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch (e) {}
  waHolder.state = {
    status: 'DISCONNECTED',
    qrCodeDataUrl: null,
    rawQr: null,
    connectedPhone: null,
    connectedName: null,
    error: null,
    lastUpdated: Date.now(),
  };
  return waHolder.state;
}

export async function sendWhatsAppDirectMessage(
  to: string,
  message: string
): Promise<{ success: boolean; recipient?: string; error?: string; msgId?: string }> {
  if (!waHolder.sock || waHolder.state.status !== 'CONNECTED') {
    console.warn(`[Baileys In-Process] ⚠️ WhatsApp socket not connected (state: ${waHolder.state.status})`);
    return { success: false, error: 'WhatsApp not connected' };
  }
  try {
    const { jidNormalizedUser } = await import('@whiskeysockets/baileys');
    let jid = '';

    if (to.includes('@')) {
      jid = jidNormalizedUser(to);
    } else {
      let digits = to.replace(/[^\d]/g, '');
      if (digits.startsWith('0') && digits.length === 10) {
        digits = '212' + digits.slice(1);
      } else if (!digits.startsWith('212') && digits.length === 9) {
        digits = '212' + digits;
      }
      jid = jidNormalizedUser(`${digits}@s.whatsapp.net`);
    }

    if (!jid || !jid.includes('@')) {
      console.error(`[Baileys In-Process] ❌ Invalid destination JID from "${to}"`);
      return { success: false, error: 'Invalid destination JID' };
    }

    console.log(`[Baileys In-Process] 📤 Sending live WhatsApp message to ${jid}: "${message.slice(0, 60)}..."`);
    const sent = await waHolder.sock.sendMessage(jid, { text: message });
    console.log(`[Baileys In-Process] ✅ Message DELIVERED to WhatsApp servers for ${jid}, msgId: ${sent?.key?.id}`);
    return { success: true, recipient: jid, msgId: sent?.key?.id };
  } catch (err: any) {
    console.error(`[Baileys In-Process] ❌ Exception in sendMessage to ${to}:`, err);
    return { success: false, error: err.message || String(err) };
  }
}
