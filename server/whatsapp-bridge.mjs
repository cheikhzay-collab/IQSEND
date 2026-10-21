import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';

const PORT = 5050;
const AUTH_DIR = path.join(process.cwd(), 'whatsapp_sessions');

let sock = null;
let reconnectTimer = null;
let isStarting = false;

let bridgeState = {
  status: 'INITIALIZING',
  qrCodeDataUrl: null,
  rawQr: null,
  connectedPhone: null,
  connectedName: null,
  error: null,
  lastUpdated: Date.now(),
};

function cleanupSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sock) {
    try {
      sock.ev.removeAllListeners('connection.update');
      sock.ev.removeAllListeners('creds.update');
      sock.ev.removeAllListeners('messages.upsert');
      sock.end();
    } catch (e) {
      // ignore
    }
    sock = null;
  }
}

async function startBaileys() {
  if (isStarting) return;
  isStarting = true;

  try {
    cleanupSocket();

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

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
    sock = currentSocket;

    currentSocket.ev.on('creds.update', saveCreds);

    currentSocket.ev.on('connection.update', async (update) => {
      // Ignore updates if this is no longer the active socket
      if (sock !== currentSocket) return;

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

          bridgeState = {
            status: 'SCAN_QR',
            rawQr: qr,
            qrCodeDataUrl: qrDataUrl,
            connectedPhone: null,
            connectedName: null,
            error: null,
            lastUpdated: Date.now(),
          };
          console.log('[WhatsApp Bridge] 📲 New Real QR Code ready to scan!');
        } catch (err) {
          console.error('[WhatsApp Bridge] Failed to render QR code:', err);
        }
      }

      if (connection === 'open') {
        const userJid = currentSocket.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0] || '';
        const name = currentSocket.user?.name || 'SIM Maroc';

        bridgeState = {
          status: 'CONNECTED',
          connectedPhone: phone,
          connectedName: name,
          qrCodeDataUrl: null,
          rawQr: null,
          error: null,
          lastUpdated: Date.now(),
        };
        console.log(`[WhatsApp Bridge] 🟢 WhatsApp Connected successfully as +${phone} (${name})`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`[WhatsApp Bridge] Connection closed: statusCode=${statusCode}`);

        if (statusCode === DisconnectReason.loggedOut) {
          bridgeState = {
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

          // Auto-restart fresh Baileys to produce a new QR code immediately
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              startBaileys();
            }, 1500);
          }
        } else {
          // If expired or disconnected, schedule restart with debounce
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              startBaileys();
            }, 3000);
          }
        }
      }
    });

    currentSocket.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;
      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const fromJid = msg.key.remoteJid || '';
        const pushName = msg.pushName || '';
        let rawPhone = fromJid.split('@')[0] || '';
        let realPhone = null;
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

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '';
        const isLocation = !!msg.message.locationMessage;

        const audioMsg = msg.message.audioMessage || msg.message.ptvMessage;
        const isAudio = !!audioMsg;
        let audioPayload = null;

        if (isAudio) {
          try {
            console.log(`[WhatsApp Bridge] 🎙️ Inbound Voice Note from +${rawPhone} (${audioMsg.seconds || 0}s, ${audioMsg.mimetype})`);
            const audioBuffer = await downloadMediaMessage(
              msg,
              'buffer',
              {},
              { logger: pino({ level: 'silent' }) }
            );
            if (audioBuffer && audioBuffer.length > 0) {
              audioPayload = {
                base64: audioBuffer.toString('base64'),
                mimetype: audioMsg.mimetype || 'audio/ogg; codecs=opus',
                seconds: audioMsg.seconds || 0,
              };
            }
          } catch (audioDownloadErr) {
            console.warn('[WhatsApp Bridge] Could not download voice note buffer:', audioDownloadErr.message);
          }
        }

        const imageMsg = msg.message.imageMessage;
        const isImage = !!imageMsg;
        let imagePayload = null;

        if (isImage) {
          try {
            console.log(`[WhatsApp Bridge] 📸 Inbound Photo from +${rawPhone} (Caption: "${imageMsg.caption || ''}")`);
            const imageBuffer = await downloadMediaMessage(
              msg,
              'buffer',
              {},
              { logger: pino({ level: 'silent' }) }
            );
            if (imageBuffer && imageBuffer.length > 0) {
              imagePayload = {
                base64: imageBuffer.toString('base64'),
                mimetype: imageMsg.mimetype || 'image/jpeg',
                caption: imageMsg.caption || '',
              };
            }
          } catch (imageDownloadErr) {
            console.warn('[WhatsApp Bridge] Could not download image buffer:', imageDownloadErr.message);
          }
        }

        console.log(`[WhatsApp Bridge] 💬 Inbound from +${rawPhone} (${pushName || 'Client'}): "${text}" (Audio: ${isAudio}, Image: ${isImage}, Location: ${isLocation})`);

        // Forward inbound message directly to Next.js webhook to trigger AI Agent
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          await fetch(`${appUrl}/api/whatsapp/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entry: [
                {
                  changes: [
                    {
                      value: {
                        messages: [
                          {
                            from: rawPhone,
                            senderName: pushName,
                            realPhone: realPhone || undefined,
                            isLid: isLid && !realPhone,
                            id: msg.key.id,
                            type: isAudio ? 'audio' : isImage ? 'image' : isLocation ? 'location' : 'text',
                            audio: audioPayload,
                            image: imagePayload,
                            text: { body: text || imageMsg?.caption || '' },
                            location: isLocation
                              ? {
                                  latitude: msg.message.locationMessage.degreesLatitude,
                                  longitude: msg.message.locationMessage.degreesLongitude,
                                }
                              : undefined,
                          },
                        ],
                      },
                    },
                  ],
                },
              ],
            }),
          });
        } catch (webhookErr) {
          console.warn('[WhatsApp Bridge] Note: could not forward to local Next.js webhook:', webhookErr.message);
        }
      }
    });
  } catch (err) {
    console.error('[WhatsApp Bridge] Startup error:', err);
    bridgeState.status = 'ERROR';
    bridgeState.error = err.message;
  } finally {
    isStarting = false;
  }
}

// Start Baileys immediately
startBaileys();

// Create HTTP Server on port 5050
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/qr' && req.method === 'GET') {
    // If not connected and not currently starting, trigger Baileys startup
    if (bridgeState.status === 'DISCONNECTED' || (bridgeState.status === 'ERROR' && !isStarting)) {
      startBaileys();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, ...bridgeState }));
    return;
  }

  if (url.pathname === '/restart' && req.method === 'POST') {
    try {
      cleanupSocket();
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
      bridgeState = {
        status: 'INITIALIZING',
        qrCodeDataUrl: null,
        rawQr: null,
        connectedPhone: null,
        connectedName: null,
        error: null,
        lastUpdated: Date.now(),
      };
      startBaileys();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status: 'INITIALIZING' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  if (url.pathname === '/disconnect' && req.method === 'POST') {
    try {
      if (sock) {
        try {
          await sock.logout();
        } catch (e) {}
      }
      cleanupSocket();
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
      bridgeState = {
        status: 'DISCONNECTED',
        qrCodeDataUrl: null,
        rawQr: null,
        connectedPhone: null,
        connectedName: null,
        error: null,
        lastUpdated: Date.now(),
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status: 'DISCONNECTED' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  if (url.pathname === '/send' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { to, message, image, imageUrl, caption } = JSON.parse(body || '{}');
        if (!sock || bridgeState.status !== 'CONNECTED') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'WhatsApp not connected' }));
          return;
        }

        let cleaned = (to || '').replace(/[^\d]/g, '');
        if (cleaned.startsWith('0')) cleaned = '212' + cleaned.slice(1);
        else if (!cleaned.startsWith('212')) cleaned = '212' + cleaned;

        const jid = `${cleaned}@s.whatsapp.net`;

        const targetImage = imageUrl || image;
        if (targetImage) {
          console.log(`[WhatsApp Bridge] 🖼️ Sending Product Image to +${cleaned}: ${targetImage}`);
          await sock.sendMessage(jid, {
            image: { url: targetImage },
            caption: caption || message || '',
          });
        } else {
          await sock.sendMessage(jid, { text: message });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, recipient: cleaned }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.on('error', (err) => {
  console.error('[WhatsApp Bridge Server] Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`[WhatsApp Bridge Server] Port ${PORT} already in use. A bridge instance is likely already running.`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[WhatsApp Bridge Server] 🚀 Running on http://127.0.0.1:${PORT}`);
});
