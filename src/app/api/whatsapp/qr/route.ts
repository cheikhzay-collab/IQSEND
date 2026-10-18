import { NextResponse } from 'next/server';
import {
  getWhatsAppStatus,
  restartWhatsAppSession,
  disconnectWhatsAppSession,
} from '@/lib/whatsapp/baileys-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// GET: Returns live QR Code Data URL and connection status directly in-process
export async function GET() {
  try {
    const status = await getWhatsAppStatus();
    return NextResponse.json({
      success: true,
      ...status,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('[API WhatsApp QR] Error retrieving status:', err);
    return NextResponse.json({
      success: false,
      status: 'ERROR',
      error: err.message || String(err),
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// POST: Action handlers (restart / disconnect)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'restart';

    let result;
    if (action === 'disconnect') {
      result = await disconnectWhatsAppSession();
    } else {
      result = await restartWhatsAppSession();
    }

    return NextResponse.json({
      success: true,
      ...result,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('[API WhatsApp QR] Error handling action:', err);
    return NextResponse.json({
      success: false,
      status: 'ERROR',
      error: err.message || String(err),
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
