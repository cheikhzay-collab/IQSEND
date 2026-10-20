import { NextRequest, NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { realtimeHub, AppRealtimeEvent } from '@/lib/realtime-events';

export const dynamic = 'force-dynamic';

/**
 * GET /api/realtime/events
 * Fetch recent real-time sync events from Hostinger MySQL
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const entityType = searchParams.get('entityType');

    const pool = getMysqlPool();
    let query = `
      SELECT id, event_type, entity_type, entity_id, title, payload, source, is_broadcast, created_at
      FROM realtime_events
    `;
    const params: any[] = [];

    if (entityType) {
      query += ` WHERE entity_type = ?`;
      params.push(entityType);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const [rows]: any = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      count: rows.length,
      events: rows.map((r: any) => ({
        id: r.id,
        eventType: r.event_type,
        entityType: r.entity_type,
        entityId: r.entity_id,
        title: r.title,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload || '{}') : r.payload,
        source: r.source,
        timestamp: r.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/realtime/events
 * Broadcast a new real-time event to all connected clients & save to DB
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, entityType, entityId, title, payload, source } = body;

    if (!eventType || !entityType || !entityId || !title) {
      return NextResponse.json(
        { success: false, error: 'eventType, entityType, entityId and title are required' },
        { status: 400 }
      );
    }

    const broadcasted = await realtimeHub.broadcast({
      eventType,
      entityType,
      entityId,
      title,
      payload,
      source: source || 'API',
    });

    return NextResponse.json({
      success: true,
      message: 'Event broadcasted in real-time',
      event: broadcasted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
