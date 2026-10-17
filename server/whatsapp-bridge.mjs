import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';

const PORT = 5050;
const AUTH_DIR = path.join(process.cwd(), 'whatsapp_sessions');

let sock = null;
let bridgeState = {
  status: 'INITIALIZING',
  qrCodeDataUrl: null,
  rawQr: null,
  connectedPhone: null,
  connectedName: null,
  error: null,
};

async function startBaileys() {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['Sendit COD Morocco', 'Chrome', '120.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
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

          bridgeState.status = 'SCAN_QR';
          bridgeState.rawQr = qr;
          bridgeState.qrCodeDataUrl = qrDataUrl;
          bridgeState.error = null;
          console.log('[WhatsApp Bridge] 📲 New Real QR Code emitted! Ready to scan in WhatsApp Mobile.');
        } catch (err) {
          console.error('[WhatsApp Bridge] Failed to render QR code:', err);
        }
      }

      if (connection === 'open') {
        const userJid = sock.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0] || '';
        const name = sock.user?.name || 'SIM Maroc';

        bridgeState.status = 'CONNECTED';
        bridgeState.connectedPhone = phone;
        bridgeState.connectedName = name;
        bridgeState.qrCodeDataUrl = null;
        bridgeState.rawQr = null;
        bridgeState.error = null;
        console.log(`[WhatsApp Bridge] 🟢 WhatsApp Connected successfully as +${phone} (${name})`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`[WhatsApp Bridge] Connection closed: statusCode=${statusCode}`);

        if (statusCode === DisconnectReason.loggedOut) {
          bridgeState.status = 'DISCONNECTED';
          bridgeState.qrCodeDataUrl = null;
          bridgeState.connectedPhone = null;
          bridgeState.connectedName = null;
          try {
            if (fs.existsSync(AUTH_DIR)) {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            }
          } catch (e) {}
        } else {
          bridgeState.status = 'INITIALIZING';
          setTimeout(startBaileys, 4000);
        }
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;
      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const fromJid = msg.key.remoteJid || '';
        const rawPhone = fromJid.split('@')[0] || '';
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '';
        console.log(`[WhatsApp Bridge] 💬 Inbound from +${rawPhone}: "${text}"`);
      }
    });
  } catch (err) {
    console.error('[WhatsApp Bridge] Startup error:', err);
    bridgeState.status = 'ERROR';
    bridgeState.error = err.message;
  }
}

// Start Baileys immediately
startBaileys();

// Create HTTP Server on port 5050
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/qr' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, ...bridgeState }));
    return;
  }

  if (url.pathname === '/restart' && req.method === 'POST') {
    try {
      if (sock) {
        try {
          sock.end();
        } catch (e) {}
      }
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
        await sock.logout();
      }
    } catch (e) {}
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
    } catch (e) {}
    bridgeState.status = 'DISCONNECTED';
    bridgeState.qrCodeDataUrl = null;
    bridgeState.connectedPhone = null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, status: 'DISCONNECTED' }));
    return;
  }

  if (url.pathname === '/send' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { to, message } = JSON.parse(body || '{}');
        if (!sock || bridgeState.status !== 'CONNECTED') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'WhatsApp not connected' }));
          return;
        }

        let cleaned = (to || '').replace(/[^\d]/g, '');
        if (cleaned.startsWith('0')) cleaned = '212' + cleaned.slice(1);
        else if (!cleaned.startsWith('212')) cleaned = '212' + cleaned;

        const jid = `${cleaned}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
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

server.listen(PORT, () => {
  console.log(`[WhatsApp Bridge Server] 🚀 Running on http://localhost:${PORT}`);
});
