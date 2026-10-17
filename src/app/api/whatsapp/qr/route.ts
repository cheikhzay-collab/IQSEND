import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const BRIDGE_URL = 'http://localhost:5050';

// GET: Returns current connection status and live QR Code Data URL from the bridge
export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/qr`, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({
        success: true,
        status: 'INITIALIZING',
        qrCodeDataUrl: null,
      });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    // If bridge is not yet reachable, return initializing state
    return NextResponse.json({
      success: true,
      status: 'INITIALIZING',
      qrCodeDataUrl: null,
      message: 'Initialisation du pont WhatsApp...',
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
