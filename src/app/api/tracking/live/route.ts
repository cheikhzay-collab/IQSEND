import { NextRequest, NextResponse } from 'next/server';
import { trackingEventBus, TrackingEvent } from '@/lib/tracking-events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/tracking/live
 *
 * Server-Sent Events (SSE) endpoint.
 * يُبثّ تحديثات حالة الكوليات فور وصولها من Sendit webhook.
 *
 * الـ client يفتح:
 *   const es = new EventSource('/api/tracking/live')
 *   es.addEventListener('tracking_update', (e) => ...)
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // ── 1. إرسال حدث "connected" فور الاتصال ──────────────
      const connectMsg = `event: connected\ndata: ${JSON.stringify({
        message: 'Sendit Live Tracking connected',
        timestamp: new Date().toISOString(),
        listeners: trackingEventBus.listenerCount + 1,
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));

      // ── 2. Heartbeat كل 25 ثانية (يمنع timeout) ────────────
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 25_000);

      // ── 3. الاشتراك في حوادث التتبع ──────────────────────────
      const unsubscribe = trackingEventBus.subscribe((event: TrackingEvent) => {
        try {
          const sseMsg = `event: tracking_update\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(sseMsg));
        } catch {
          // Stream closed
        }
      });

      // ── 4. تنظيف عند إغلاق الاتصال ──────────────────────────
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx: disable proxy buffering
    },
  });
}
