import { NextRequest } from 'next/server';
import { realtimeHub, AppRealtimeEvent } from '@/lib/realtime-events';
import { getMysqlPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/realtime/stream
 *
 * Universal Server-Sent Events (SSE) stream for instant real-time synchronization.
 * Transmits live order updates, Sendit tracking events, WhatsApp messages, and notifications.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Initial Handshake Message
      const initMsg = `event: connected\ndata: ${JSON.stringify({
        status: 'CONNECTED',
        message: 'Hostinger MySQL Real-Time Sync Active',
        timestamp: new Date().toISOString(),
        activeListeners: realtimeHub.activeConnectionsCount + 1,
      })}\n\n`;
      controller.enqueue(encoder.encode(initMsg));

      // 2. Fetch and send recent 5 live events as history
      try {
        const pool = getMysqlPool();
        const [recentEvents]: any = await pool.execute(
          `SELECT id, event_type, entity_type, entity_id, title, payload, source, created_at
           FROM realtime_events
           ORDER BY created_at DESC
           LIMIT 5`
        );
        if (Array.isArray(recentEvents)) {
          for (const ev of recentEvents.reverse()) {
            const histMsg = `event: history_event\ndata: ${JSON.stringify({
              id: ev.id,
              eventType: ev.event_type,
              entityType: ev.entity_type,
              entityId: ev.entity_id,
              title: ev.title,
              payload: typeof ev.payload === 'string' ? JSON.parse(ev.payload || '{}') : ev.payload,
              source: ev.source,
              timestamp: ev.created_at,
            })}\n\n`;
            controller.enqueue(encoder.encode(histMsg));
          }
        }
      } catch (e) {
        // ignore history fetch error
      }

      // 3. Keepalive Heartbeat every 20 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20_000);

      // 4. Subscribe to live broadcasts
      const unsubscribe = realtimeHub.subscribe((event: AppRealtimeEvent) => {
        try {
          const sseMsg = `event: realtime_update\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(sseMsg));
        } catch {
          // stream disconnected
        }
      });

      // 5. Cleanup on connection close
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
