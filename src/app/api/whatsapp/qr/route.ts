import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import path from 'node:path';

export const dynamic = 'force-dynamic';
const BRIDGE_URL = 'http://localhost:5050';

let isStartingBridge = false;

function ensureBridgeRunning() {
  if (isStartingBridge) return;
  isStartingBridge = true;
  try {
    const bridgeScript = path.join(process.cwd(), 'server', 'whatsapp-bridge.mjs');
    const child = spawn(process.execPath, [bridgeScript], {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd(),
      windowsHide: true,
    });
    child.unref();
    console.log('[API WhatsApp] Auto-spawned background WhatsApp Bridge server on port 5050');
  } catch (err) {
    console.error('[API WhatsApp] Failed to auto-spawn WhatsApp bridge:', err);
  } finally {
    setTimeout(() => {
      isStartingBridge = false;
    }, 6000);
  }
}

// GET: Returns current connection status and live QR Code Data URL from the bridge
export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${BRIDGE_URL}/qr`, { 
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      ensureBridgeRunning();
      return NextResponse.json({
        success: true,
        status: 'INITIALIZING',
        qrCodeDataUrl: null,
      });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    // If bridge is not reachable, auto-launch it in background
    ensureBridgeRunning();
    return NextResponse.json({
      success: true,
      status: 'INITIALIZING',
      qrCodeDataUrl: null,
      message: 'Démarrage automatique du pont WhatsApp...',
    });
  }
}

// POST: Action handlers (reconnect, disconnect)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'restart';

    const targetEndpoint = action === 'disconnect' ? '/disconnect' : '/restart';
    const res = await fetch(`${BRIDGE_URL}${targetEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, status: 'ERROR' });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
