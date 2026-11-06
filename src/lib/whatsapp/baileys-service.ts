import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import QRCode from 'qrcode';
import { processCustomerWhatsAppMessage, cleanGeminiReply, OrderContext } from '@/lib/gemini-agent';
import { getInboundOrders, cleanMoroccanPhone } from '@/lib/orders-store';
import { recordInboundMessage, recordOutboundMessage } from '@/lib/inbox-store';
import {
  getRecentWhatsAppHistoryFromDb,
  getWhatsAppSessionFromDb,
  saveWhatsAppSessionToDb,
  logWhatsAppMessageToDb,
} from '@/lib/db-service';

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

// In-memory message deduplication set (prevents duplicate processing on reconnects/status updates)
const processedMessageIds = new Set<string>();

// Preserve singleton across fast-refresh and route invocations in Node memory
const globalForWa = globalThis as unknown as {
  __waBridge?: GlobalWaHolder;
};

// Fast in-memory LRU-style cache for WhatsApp messages (enables poll decryption & deduplication)
const inMemoryMessageStore = new Map<string, any>();
function cacheMessage(id?: string | null, msg?: any) {
  if (!id || !msg) return;
  if (inMemoryMessageStore.size > 2000) {
    const firstKey = inMemoryMessageStore.keys().next().value;
    if (firstKey) inMemoryMessageStore.delete(firstKey);
  }
  inMemoryMessageStore.set(id, msg);
}

export interface WhatsAppMediaButton {
  label: string;
  quickReplyText: string;
}

interface TrackedPoll {
  pollMsg: any;
  buttons: WhatsAppMediaButton[];
  customerJid: string;
  customerPhone: string;
}
const activePollTracker = new Map<string, TrackedPoll>();

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

function copyDirSync(src: string, dest: string) {
  try {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  } catch (err: any) {
    console.warn('[Baileys Auth] copyDirSync warning:', err?.message);
  }
}

function resolvePersistentAuthDir(): string {
  let preferredDir = path.join(process.cwd(), 'whatsapp_sessions');
  try {
    const home = os.homedir();
    if (home && home !== '/' && fs.existsSync(home)) {
      preferredDir = path.join(home, '.sendit_whatsapp_sessions');
    }
  } catch {}

  try {
    if (!fs.existsSync(preferredDir)) {
      fs.mkdirSync(preferredDir, { recursive: true });
    }

    const targetCreds = path.join(preferredDir, 'creds.json');
    if (!fs.existsSync(targetCreds)) {
      // 1. Check local cwd
      const localDir = path.join(process.cwd(), 'whatsapp_sessions');
      if (fs.existsSync(path.join(localDir, 'creds.json'))) {
        copyDirSync(localDir, preferredDir);
      } else {
        // 2. Scan sibling version directories (Hostinger multi-version deployment folders)
        try {
          const parentDir = path.resolve(process.cwd(), '..');
          if (fs.existsSync(parentDir)) {
            const siblings = fs.readdirSync(parentDir);
            for (const sib of siblings) {
              const candidate = path.join(parentDir, sib, 'whatsapp_sessions', 'creds.json');
              if (fs.existsSync(candidate)) {
                console.log(`[Baileys Auth] 🔄 Recovered previous WhatsApp credentials from ${candidate}`);
                copyDirSync(path.join(parentDir, sib, 'whatsapp_sessions'), preferredDir);
                break;
              }
            }
          }
        } catch {}
      }
    }
  } catch (e: any) {
    console.warn('[Baileys Auth] Error preparing persistent auth dir:', e?.message);
  }

  return preferredDir;
}

const AUTH_DIR = resolvePersistentAuthDir();

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
      waHolder.sock.ev.removeAllListeners('messages.update');
      waHolder.sock.end();
    } catch (e) {
      // ignore
    }
    waHolder.sock = null;
  }
}

async function handleCustomerInboundText({
  normalizedJid,
  rawPhone,
  realPhone,
  pushName = '',
  incomingText,
}: {
  normalizedJid: string;
  rawPhone: string;
  realPhone?: string;
  pushName?: string;
  incomingText: string;
}) {
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
      realPhone,
      pushName,
      text: incomingText,
      customerName: order?.customer?.name || pushName,
      orderNumber: order?.orderNumber,
      city: order?.customer?.city,
      totalAmount: order?.payment?.amount,
    });

    // If merchant has paused AI for this conversation, do not auto-reply
    if (!isAiActive) {
      console.log(`[Baileys In-Process] 👤 AI Bot paused for +${rawPhone} (Human takeover active)`);
      return;
    }

    // 1b. Fetch session state and DB history
    const currentSession = await getWhatsAppSessionFromDb(cleanedPhone || rawPhone);
    const dbHistory = await getRecentWhatsAppHistoryFromDb(cleanedPhone || rawPhone, 6);

    // Build context including recent conversation history & session state
    const historyToUse = dbHistory.length > 0 ? dbHistory : (conversation?.messages || [])
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
      totalAmount: order?.payment?.amount || currentSession?.price || 179,
      items: (order?.items || []).map((it) => ({
        name: it.name,
        sku: it.sku,
        quantity: it.quantity,
        price: it.price,
      })),
      conversationHistory: historyToUse,
      sessionState: currentSession ? {
        lastOfferedProduct: currentSession.lastOfferedProduct,
        price: currentSession.price,
        step: currentSession.step,
        metadata: currentSession.metadata,
      } : undefined,
    };

    // Log customer message to DB
    await logWhatsAppMessageToDb({
      orderId: order?.id,
      phone: rawPhone,
      sender: 'CUSTOMER',
      body: incomingText,
    });

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
      const cleanText = cleanGeminiReply(aiResult.replyText);

      // Anti-Ban delay: wait 1.5s before answering to simulate natural human typing
      await new Promise((r) => setTimeout(r, 1500));

      // Deliver directly to customer's canonical WhatsApp JID
      const directRes = await sendWhatsAppDirectMessage(normalizedJid, cleanText);

      if (directRes.success) {
        console.log(`[Baileys In-Process] ✅ AI response successfully delivered to customer ${normalizedJid}, msgId: ${directRes.msgId}`);
        
        await logWhatsAppMessageToDb({
          orderId: order?.id,
          phone: rawPhone,
          sender: 'AI_BOT',
          body: cleanText,
        });

        recordOutboundMessage({
          phone: rawPhone,
          text: cleanText,
          sender: 'AI_BOT',
        });

        // Update session state
        try {
          let nextProduct = currentSession?.lastOfferedProduct;
          let nextPrice = currentSession?.price;
          let nextStep = currentSession?.step || 'INITIAL';

          const lowerReply = cleanText.toLowerCase();
          if (lowerReply.includes('خف جلد') || lowerReply.includes('خف') || lowerReply.includes('babouche')) {
            nextProduct = 'خف جلد';
            nextPrice = 179;
            nextStep = 'AWAITING_SIZE_OR_DETAILS';
          } else if (lowerReply.includes('smart watch') || lowerReply.includes('ساعة')) {
            nextProduct = 'Smart Watch Ultra Pro S2';
            nextPrice = 299;
            nextStep = 'AWAITING_SIZE_OR_DETAILS';
          }

          if (aiResult.toolCalled === 'create_new_order') {
            nextStep = 'ORDER_CREATED';
          } else if (aiResult.toolCalled === 'confirm_order_and_address') {
            nextStep = 'ORDER_CONFIRMED';
          }

          if (nextProduct) {
            await saveWhatsAppSessionToDb({
              phone: cleanedPhone || rawPhone,
              orderId: order?.id,
              lastOfferedProduct: nextProduct,
              price: nextPrice,
              step: nextStep,
              metadata: {
                lastBotReply: cleanText.slice(0, 100),
                toolCalled: aiResult.toolCalled,
              },
            });
          }
        } catch (sessionErr) {}
      } else {
        console.error(`[Baileys In-Process] ❌ Failed to deliver AI message to ${normalizedJid}:`, directRes.error);
      }
    }
  } catch (err: any) {
    console.error('[Baileys In-Process] AI processing error:', err.message);
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
      getMessage: async (key: any) => {
        if (key?.id) {
          return inMemoryMessageStore.get(key.id) || undefined;
        }
        return undefined;
      },
    });
    waHolder.sock = currentSocket;

    currentSocket.ev.on('creds.update', saveCreds);

    // Track poll vote answers & decrypt native 1-click button responses
    currentSocket.ev.on('messages.update', async (updates: any[]) => {
      if (waHolder.sock !== currentSocket || !Array.isArray(updates)) return;
      for (const update of updates) {
        if (update?.update?.pollUpdates) {
          const pollId = update.key?.id;
          const tracker = pollId ? activePollTracker.get(pollId) : null;
          if (tracker) {
            try {
              const { getAggregateVotesInPollMessage } = await import('@whiskeysockets/baileys');
              const votes = getAggregateVotesInPollMessage(
                { message: tracker.pollMsg, pollUpdates: update.update.pollUpdates },
                currentSocket.user?.id
              );
              for (const v of votes) {
                if (v.voters && v.voters.length > 0) {
                  const selectedName = v.name;
                  console.log(`[Baileys In-Process] 🗳️ Customer clicked poll option: "${selectedName}"`);
                  const matched = (tracker.buttons || []).find(
                    (b) => b.label.trim().toLowerCase() === selectedName.trim().toLowerCase()
                  );
                  const textToProcess = matched ? matched.quickReplyText : selectedName;
                  activePollTracker.delete(pollId); // Avoid duplicate executions
                  await handleCustomerInboundText({
                    normalizedJid: tracker.customerJid,
                    rawPhone: tracker.customerPhone,
                    realPhone: tracker.customerPhone,
                    pushName: '',
                    incomingText: textToProcess,
                  });
                  break;
                }
              }
            } catch (pollVoteErr: any) {
              console.warn('[Baileys In-Process] Error handling poll vote:', pollVoteErr?.message);
            }
          }
        }
      }
    });

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
      // Process incoming messages (both 'notify' and 'append' to prevent message drop on reconnection)
      if (!m.messages || m.messages.length === 0) return;

      const { jidNormalizedUser } = await import('@whiskeysockets/baileys');

      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;
        cacheMessage(msg.key?.id, msg.message);

        // Message Deduplication: never process the exact same message twice
        const msgKeyId = msg.key?.id;
        if (msgKeyId) {
          if (processedMessageIds.has(msgKeyId)) {
            console.log(`[Baileys In-Process] ⏩ Skipping duplicate message ID: ${msgKeyId}`);
            continue;
          }
          processedMessageIds.add(msgKeyId);
          if (processedMessageIds.size > 2000) {
            const first = processedMessageIds.values().next().value;
            if (first) processedMessageIds.delete(first);
          }
        }

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
        const pushName = msg.pushName || '';
        let rawPhone = normalizedJid.split('@')[0];
        let realPhone: string | undefined = undefined;
        const isLid = fromJid.endsWith('@lid') || (rawPhone.length >= 14 && rawPhone.startsWith('1'));

        // 1. Try Baileys reverse LID mapping if socket has it
        if (isLid && currentSocket?.signalRepository?.lidMapping?.getPNForLID) {
          try {
            const pnJid = await currentSocket.signalRepository.lidMapping.getPNForLID(fromJid);
            if (pnJid) {
              const extracted = pnJid.split('@')[0].split(':')[0];
              if (extracted && extracted.length >= 9) {
                realPhone = extracted;
                rawPhone = extracted;
              }
            }
          } catch (e) {}
        }

        // 2. Check msg.key.participant
        if (isLid && !realPhone && msg.key?.participant) {
          const p = msg.key.participant;
          if (!p.endsWith('@lid')) {
            const extracted = p.split('@')[0].split(':')[0];
            if (extracted && extracted.length >= 9) {
              realPhone = extracted;
              rawPhone = extracted;
            }
          }
        }

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

        // Check if message is a Voice Note or Audio
        const isAudio = Boolean(unwrap.audioMessage);
        const isImage = Boolean(unwrap.imageMessage);

        let incomingText = (
          unwrap.conversation ||
          unwrap.extendedTextMessage?.text ||
          unwrap.buttonsResponseMessage?.selectedDisplayText ||
          unwrap.buttonsResponseMessage?.selectedButtonId ||
          unwrap.templateButtonReplyMessage?.selectedDisplayText ||
          unwrap.templateButtonReplyMessage?.selectedId ||
          unwrap.listResponseMessage?.singleSelectReply?.selectedRowId ||
          unwrap.listResponseMessage?.title ||
          unwrap.interactiveResponseMessage?.body?.text ||
          unwrap.imageMessage?.caption ||
          unwrap.videoMessage?.caption ||
          ''
        ).trim();

        if (unwrap.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
          try {
            const parsed = JSON.parse(unwrap.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            if (parsed.id) incomingText = parsed.id;
          } catch {}
        }

        // If audio message without explicit text, provide clear voice placeholder so agent processes it
        if (!incomingText && isAudio) {
          incomingText = '[رسالة صوتية من الزبون]';
        } else if (!incomingText && isImage) {
          incomingText = '[صورة من الزبون]';
        }

        if (!incomingText) continue;

        console.log(`[Baileys In-Process] 💬 Inbound message from ${normalizedJid} (+${rawPhone}): "${incomingText}"`);

        await handleCustomerInboundText({
          normalizedJid,
          rawPhone,
          realPhone,
          pushName,
          incomingText,
        });
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

export async function checkWhatsAppNumberExists(
  phone: string
): Promise<{ exists: boolean; jid?: string }> {
  if (!waHolder.sock || waHolder.state.status !== 'CONNECTED') {
    return { exists: true };
  }
  try {
    const { jidNormalizedUser } = await import('@whiskeysockets/baileys');
    let jid = '';
    if (phone.includes('@')) {
      jid = jidNormalizedUser(phone);
    } else {
      let digits = phone.replace(/[^\d]/g, '');
      if (digits.startsWith('0') && digits.length === 10) {
        digits = '212' + digits.slice(1);
      } else if (!digits.startsWith('212') && digits.length === 9) {
        digits = '212' + digits;
      }
      jid = jidNormalizedUser(`${digits}@s.whatsapp.net`);
    }

    const results = await waHolder.sock.onWhatsApp(jid);
    if (Array.isArray(results) && results.length > 0) {
      const match = results[0];
      return { exists: Boolean(match.exists), jid: match.jid || jid };
    }
    return { exists: false, jid };
  } catch (err: any) {
    console.warn(`[Baileys In-Process] onWhatsApp check warning for ${phone}:`, err.message);
    return { exists: true };
  }
}

export async function sendWhatsAppDirectMessage(
  to: string,
  message: string
): Promise<{ success: boolean; notOnWhatsApp?: boolean; recipient?: string; error?: string; msgId?: string }> {
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

    // Verify recipient has WhatsApp active before dispatching
    try {
      const results = await waHolder.sock.onWhatsApp(jid);
      if (Array.isArray(results) && results.length > 0 && results[0].exists === false) {
        console.warn(`[Baileys In-Process] ⚠️ Recipient ${jid} is NOT registered on WhatsApp.`);
        return { success: false, notOnWhatsApp: true, recipient: jid, error: 'NO_WHATSAPP' };
      }
    } catch (checkErr) {
      // Continue if onWhatsApp verification check encounters a network hiccup
    }

    console.log(`[Baileys In-Process] 📤 Sending live WhatsApp message to ${jid}: "${message.slice(0, 60)}..."`);
    const sent = await waHolder.sock.sendMessage(jid, { text: message });
    if (sent?.key?.id && sent?.message) {
      cacheMessage(sent.key.id, sent.message);
    }
    console.log(`[Baileys In-Process] ✅ Message DELIVERED to WhatsApp servers for ${jid}, msgId: ${sent?.key?.id}`);
    return { success: true, recipient: jid, msgId: sent?.key?.id };
  } catch (err: any) {
    console.error(`[Baileys In-Process] ❌ Exception in sendMessage to ${to}:`, err);
    const msg = err.message || String(err);
    const isNoWa = msg.includes('not-authorized') || msg.includes('item-not-found') || msg.includes('not on whatsapp');
    return { success: false, notOnWhatsApp: isNoWa, error: msg };
  }
}

export interface WhatsAppMediaOptions {
  mediaUrl?: string | null;
  mediaType?: 'NONE' | 'IMAGE' | 'VIDEO';
  caption: string;
  buttonLabel?: string | null;
  quickReplyText?: string | null;
  buttons?: WhatsAppMediaButton[];
}

/**
 * Send rich media message (image/video with caption and optional quick-reply button CTA)
 */
export async function sendWhatsAppDirectMedia(
  to: string,
  options: WhatsAppMediaOptions
): Promise<{ success: boolean; notOnWhatsApp?: boolean; recipient?: string; error?: string; msgId?: string }> {
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
      return { success: false, error: 'Invalid destination JID' };
    }

    // Check WhatsApp existence
    try {
      const results = await waHolder.sock.onWhatsApp(jid);
      if (Array.isArray(results) && results.length > 0 && results[0].exists === false) {
        return { success: false, notOnWhatsApp: true, recipient: jid, error: 'NO_WHATSAPP' };
      }
    } catch {
      // Continue
    }

    const buttonsList: WhatsAppMediaButton[] = [];
    if (Array.isArray(options.buttons) && options.buttons.length > 0) {
      for (const b of options.buttons) {
        if (b.label && b.label.trim()) {
          buttonsList.push({
            label: b.label.trim(),
            quickReplyText: b.quickReplyText?.trim() || b.label.trim(),
          });
        }
      }
    } else if (options.buttonLabel?.trim() || options.quickReplyText?.trim()) {
      buttonsList.push({
        label: options.buttonLabel?.trim() || 'Commander avec -30% 🛍️',
        quickReplyText: options.quickReplyText?.trim() || 'سلام بغيت نستافد من العرض',
      });
    }

    const hasButtons = buttonsList.length > 0;
    const cleanCaption = options.caption.trim();

    // Prepare local media source if provided
    let mediaSource: any = null;
    if (options.mediaUrl && options.mediaType && options.mediaType !== 'NONE') {
      if (options.mediaUrl.startsWith('/uploads/')) {
        const localPath = path.join(process.cwd(), 'public', options.mediaUrl);
        if (fs.existsSync(localPath)) {
          mediaSource = fs.readFileSync(localPath);
        } else {
          mediaSource = { url: options.mediaUrl };
        }
      } else if (options.mediaUrl.startsWith('data:')) {
        const base64Data = options.mediaUrl.split(',')[1];
        if (base64Data) {
          mediaSource = Buffer.from(base64Data, 'base64');
        }
      } else {
        mediaSource = { url: options.mediaUrl };
      }
    }

    // Format clean professional caption (NO ugly url-encoded links)
    let finalCaption = cleanCaption;
    if (hasButtons) {
      finalCaption += '\n\n━━━━━━━━━━━━━━━━━━━━';
      for (const btn of buttonsList) {
        finalCaption += `\n🔘 *${btn.label}*`;
      }
      finalCaption += '\n💬 إختر من الأزرار التفاعلية أسفله 👇 أو رد باختيارك مباشرة.';
    }

    let messageContent: any = { text: finalCaption };

    if (mediaSource) {
      if (options.mediaType === 'VIDEO') {
        messageContent = {
          video: mediaSource,
          caption: finalCaption,
        };
      } else {
        messageContent = {
          image: mediaSource,
          caption: finalCaption,
        };
      }
    }

    console.log(`[Baileys In-Process] 📤 Sending WhatsApp campaign message to ${jid}...`);
    const sent = await waHolder.sock.sendMessage(jid, messageContent);
    const msgId = sent?.key?.id;
    if (msgId && sent?.message) {
      cacheMessage(msgId, sent.message);
    }
    console.log(`[Baileys In-Process] ✅ WhatsApp message DELIVERED to ${jid}, msgId: ${msgId}`);

    // If buttons/CTA requested: send native 1-click Poll button directly below
    if (hasButtons) {
      try {
        await new Promise((r) => setTimeout(r, 600));
        const pollValues = buttonsList.map((b) => b.label);
        if (pollValues.length === 1) {
          pollValues.push('استفسار أو مساعدة 💬');
        }

        const pollTitle = buttonsList.length === 1
          ? `🎯 ${buttonsList[0].label}`
          : '👇 إختر خيارك للمتابعة / Choisissez :';

        const pollSent = await waHolder.sock.sendMessage(jid, {
          poll: {
            name: pollTitle,
            values: pollValues,
            selectableCount: 1,
          },
        });
        if (pollSent?.key?.id && pollSent?.message) {
          cacheMessage(pollSent.key.id, pollSent.message);
          activePollTracker.set(pollSent.key.id, {
            pollMsg: pollSent.message,
            buttons: buttonsList,
            customerJid: jid,
            customerPhone: to.replace(/[^\d]/g, ''),
          });
          console.log(`[Baileys In-Process] 🔘 1-Click Poll (${pollValues.length} buttons) sent to ${jid}, pollId: ${pollSent.key.id}`);
        }
      } catch (pollErr: any) {
        console.warn(`[Baileys In-Process] ⚠️ Poll button send warning (non-fatal):`, pollErr?.message);
      }
    }

    return { success: true, recipient: jid, msgId: msgId || undefined };
  } catch (err: any) {
    console.error(`[Baileys In-Process] ❌ Exception in sendWhatsAppDirectMedia to ${to}:`, err);
    const msg = err.message || String(err);
    const isNoWa = msg.includes('not-authorized') || msg.includes('item-not-found') || msg.includes('not on whatsapp');
    return { success: false, notOnWhatsApp: isNoWa, error: msg };
  }
}
