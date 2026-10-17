import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { processCustomerWhatsAppMessage, OrderContext } from './gemini-agent';
import { getInboundOrders, cleanMoroccanPhone } from './orders-store';

export interface WhatsAppBridgeState {
  status: 'INITIALIZING' | 'SCAN_QR' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  rawQr?: string;
  qrCodeDataUrl?: string;
  connectedPhone?: string;
  connectedName?: string;
  lastConnectedAt?: string;
  error?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __waSocket: WASocket | null | undefined;
  // eslint-disable-next-line no-var
  var __waBridgeState: WhatsAppBridgeState | undefined;
  // eslint-disable-next-line no-var
  var __waIsInitializing: boolean | undefined;
}

if (!global.__waBridgeState) {
  global.__waBridgeState = {
    status: 'DISCONNECTED',
  };
}

export function getBridgeState(): WhatsAppBridgeState {
  return global.__waBridgeState || { status: 'DISCONNECTED' };
}

export async function initWhatsAppBaileys(): Promise<WhatsAppBridgeState> {
  if (global.__waBridgeState?.status === 'CONNECTED' && global.__waSocket) {
    return global.__waBridgeState;
  }

  if (global.__waIsInitializing) {
    return global.__waBridgeState || { status: 'INITIALIZING' };
  }

  global.__waIsInitializing = true;
  global.__waBridgeState = {
    status: 'INITIALIZING',
  };

  try {
    const authDir = path.join(process.cwd(), 'whatsapp_sessions');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['Sendit COD Platform', 'Chrome', '120.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

    global.__waSocket = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, {
            width: 320,
            margin: 2,
            color: {
              dark: '#1e1b4b',
              light: '#ffffff',
            },
          });

          global.__waBridgeState = {
            status: 'SCAN_QR',
            rawQr: qr,
            qrCodeDataUrl: qrDataUrl,
          };
          console.log('[Baileys Bridge] 📲 New Real WhatsApp QR Code Generated for Mobile Scan');
        } catch (err: any) {
          console.error('[Baileys Bridge] Error generating QR data URL:', err);
        }
      }

      if (connection === 'open') {
        const userJid = sock.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0] || '';
        const name = sock.user?.name || 'SIM Maroc';

        global.__waBridgeState = {
          status: 'CONNECTED',
          connectedPhone: phone,
          connectedName: name,
          lastConnectedAt: new Date().toISOString(),
          qrCodeDataUrl: undefined,
          rawQr: undefined,
        };
        console.log(`[Baileys Bridge] ✅ Connected to WhatsApp successfully as +${phone} (${name})`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[Baileys Bridge] Connection closed: statusCode=${statusCode}, reconnect=${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          global.__waBridgeState = {
            status: 'DISCONNECTED',
            error: 'Session déconnectée depuis le téléphone.',
          };
          global.__waSocket = null;
          // Delete auth dir so fresh scan can be requested
          try {
            if (fs.existsSync(authDir)) {
              fs.rmSync(authDir, { recursive: true, force: true });
            }
          } catch (e) {
            console.error('Error cleaning auth dir:', e);
          }
        } else {
          global.__waBridgeState = {
            status: 'INITIALIZING',
          };
          // Reconnect automatically
          setTimeout(() => {
            global.__waIsInitializing = false;
            initWhatsAppBaileys();
          }, 3000);
        }
      }
    });

    // Handle Inbound Messages directly via Moroccan AI Confirmation Agent
    sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const fromJid = msg.key.remoteJid || '';
        const rawPhone = fromJid.split('@')[0] || '';
        const incomingText =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '';

        console.log(`[Baileys Inbound] Message from +${rawPhone}: "${incomingText}"`);

        // Check if message contains GPS location
        if (msg.message.locationMessage) {
          const lat = msg.message.locationMessage.degreesLatitude;
          const lng = msg.message.locationMessage.degreesLongitude;
          const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
          console.log(`[Baileys Inbound] GPS received: ${mapsUrl}`);

          const orders = getInboundOrders();
          const cleanedPhone = cleanMoroccanPhone(rawPhone);
          const order = orders.find((o) => cleanMoroccanPhone(o.customer?.phone) === cleanedPhone);
          if (order) {
            order.gpsLocationUrl = mapsUrl;
          }

          await sendBaileysMessage(
            rawPhone,
            'شكراً جزيلاً! تسجل موقع التوصيل الجغرافي ديالك بنجاح وغادي نمرروه مباشرة لموزع Sendit باش يوصل بدون أي تعثر. نهارك سعيد! 📍✅'
          );
          continue;
        }

        if (!incomingText.trim()) continue;

        // Process with Moroccan Gemini AI Confirmation Agent
        const orders = getInboundOrders();
        const cleanedPhone = cleanMoroccanPhone(rawPhone);
        const order = orders.find(
          (o) =>
            cleanMoroccanPhone(o.customer?.phone) === cleanedPhone ||
            o.customer?.phone?.includes(cleanedPhone) ||
            cleanedPhone.includes(cleanMoroccanPhone(o.customer?.phone))
        );

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
          conversationHistory: [],
        };

        try {
          const aiResult = await processCustomerWhatsAppMessage(incomingText, orderContext, {
            onConfirm: async () => {
              if (order) {
                order.aiVerification = {
                  status: 'CONFIRMED_BY_AI',
                  riskScore: 5,
                  notes: 'Confirmé avec succès par le bot IA via QR Session (Baileys)',
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
            // Anti-Ban delay: wait 2.5s before answering to simulate natural human typing
            await new Promise((r) => setTimeout(r, 2500));
            await sendBaileysMessage(rawPhone, aiResult.replyText);
          }
        } catch (err: any) {
          console.error('[Baileys Inbound] AI processing error:', err.message);
        }
      }
    });

    global.__waIsInitializing = false;
    return global.__waBridgeState;
  } catch (err: any) {
    console.error('[Baileys Bridge] Failed to initialize Baileys:', err);
    global.__waIsInitializing = false;
    global.__waBridgeState = {
      status: 'ERROR',
      error: err.message || 'Erreur d initialisation WhatsApp Baileys',
    };
    return global.__waBridgeState;
  }
}

/**
 * Send WhatsApp message through active Baileys session
 */
export async function sendBaileysMessage(toPhone: string, text: string) {
  if (!global.__waSocket || global.__waBridgeState?.status !== 'CONNECTED') {
    console.warn(`[Baileys Bridge] Cannot send message: WhatsApp socket not connected`);
    return { success: false, error: 'WhatsApp not connected' };
  }

  let cleaned = toPhone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '212' + cleaned.slice(1);
  } else if (!cleaned.startsWith('212')) {
    cleaned = '212' + cleaned;
  }

  const jid = `${cleaned}@s.whatsapp.net`;

  try {
    await global.__waSocket.sendMessage(jid, { text });
    console.log(`[Baileys Bridge] ✉️ Sent message to +${cleaned}`);
    return { success: true, recipient: cleaned };
  } catch (err: any) {
    console.error(`[Baileys Bridge] Failed to send message to ${jid}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Disconnect and remove credentials
 */
export async function disconnectWhatsAppBaileys() {
  try {
    if (global.__waSocket) {
      await global.__waSocket.logout();
      global.__waSocket = null;
    }
  } catch (e) {
    // ignore
  }

  const authDir = path.join(process.cwd(), 'whatsapp_sessions');
  try {
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('Error cleaning auth folder:', e);
  }

  global.__waBridgeState = {
    status: 'DISCONNECTED',
  };
  global.__waIsInitializing = false;

  return { success: true };
}
