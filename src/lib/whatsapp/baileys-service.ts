import path from 'node:path';
import fs from 'node:fs';
import QRCode from 'qrcode';

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
      if (m.type !== 'notify') return;
      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const fromJid = msg.key.remoteJid || '';
        const rawPhone = fromJid.split('@')[0] || '';
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '';
        console.log(`[Baileys In-Process] 💬 Inbound from +${rawPhone}: "${text}"`);
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
): Promise<{ success: boolean; recipient?: string; error?: string }> {
  if (!waHolder.sock || waHolder.state.status !== 'CONNECTED') {
    return { success: false, error: 'WhatsApp not connected' };
  }
  try {
    let cleaned = (to || '').replace(/[^\d]/g, '');
    if (cleaned.startsWith('0')) cleaned = '212' + cleaned.slice(1);
    else if (!cleaned.startsWith('212')) cleaned = '212' + cleaned;

    const jid = `${cleaned}@s.whatsapp.net`;
    await waHolder.sock.sendMessage(jid, { text: message });
    return { success: true, recipient: cleaned };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
