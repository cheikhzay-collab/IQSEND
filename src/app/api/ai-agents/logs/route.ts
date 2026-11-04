import { NextRequest, NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const status = searchParams.get('status') || 'ALL';
    const actionType = searchParams.get('actionType') || 'ALL';
    const search = (searchParams.get('search') || '').trim();

    const pool = getMysqlPool();

    // 1. Calculate today's live KPI metrics
    let stats = {
      totalToday: 0,
      executedToday: 0,
      cooldownPreventedToday: 0,
      quietHoursSkippedToday: 0,
      dndBlockedToday: 0,
    };

    try {
      const [statRows]: any = await pool.execute(`
        SELECT 
          COUNT(*) as total_today,
          SUM(CASE WHEN status = 'EXECUTED' THEN 1 ELSE 0 END) as executed_today,
          SUM(CASE WHEN status = 'SKIPPED_COOLDOWN' THEN 1 ELSE 0 END) as cooldown_today,
          SUM(CASE WHEN status = 'SKIPPED_QUIET_HOURS' THEN 1 ELSE 0 END) as quiet_today,
          SUM(CASE WHEN status = 'BLOCKED_DND' THEN 1 ELSE 0 END) as dnd_today
        FROM agent_operations_log
        WHERE created_at >= CURDATE()
      `);

      if (Array.isArray(statRows) && statRows.length > 0) {
        const s = statRows[0];
        stats = {
          totalToday: Number(s.total_today || 0),
          executedToday: Number(s.executed_today || 0),
          cooldownPreventedToday: Number(s.cooldown_today || 0),
          quietHoursSkippedToday: Number(s.quiet_today || 0),
          dndBlockedToday: Number(s.dnd_today || 0),
        };
      }
    } catch (statErr: any) {
      console.warn('[API ai-agents/logs] Stats query note:', statErr.message);
    }

    // 2. Build filtered log query
    const conditions: string[] = [];
    const params: any[] = [];

    if (status && status !== 'ALL') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (actionType && actionType !== 'ALL') {
      conditions.push('action_type = ?');
      params.push(actionType);
    }

    if (search) {
      conditions.push('(customer_phone LIKE ? OR customer_name LIKE ? OR order_number LIKE ? OR order_id LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const [rows]: any = await pool.execute(
      `SELECT * FROM agent_operations_log 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ?`,
      params
    );

    return NextResponse.json({
      success: true,
      stats,
      logs: Array.isArray(rows) ? rows : [],
    });
  } catch (error: any) {
    console.error('[API ai-agents/logs] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la récupération du journal de bord du bot',
        stats: {
          totalToday: 0,
          executedToday: 0,
          cooldownPreventedToday: 0,
          quietHoursSkippedToday: 0,
          dndBlockedToday: 0,
        },
        logs: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { searchParams } = new URL(request.url);

    const action = body.action || searchParams.get('action');
    const phone = body.phone || searchParams.get('phone') || '0661234567';
    const customerName = body.customerName || searchParams.get('customerName') || 'محمد الإدريسي';
    const trackingCode = body.trackingCode || searchParams.get('trackingCode') || 'SND-TEST-881';
    const orderId = body.orderId || searchParams.get('orderId') || 'ord-test-01';

    if (action === 'test_out_for_delivery') {
      const { triggerOutForDeliveryNotice } = await import('@/lib/order-automations');
      const res = await triggerOutForDeliveryNotice(phone, customerName, trackingCode, 'Sendit.ma', orderId);
      return NextResponse.json({ success: true, result: res });
    }

    if (action === 'test_morning_reminder') {
      const { triggerMorningCodReminder } = await import('@/lib/order-automations');
      const res = await triggerMorningCodReminder(phone, customerName, trackingCode, 399, orderId);
      return NextResponse.json({ success: true, result: res });
    }

    if (action === 'test_no_whatsapp') {
      const { executeSafeAgentAction } = await import('@/lib/agent-rules-engine');
      const res = await executeSafeAgentAction(
        {
          customerPhone: phone,
          customerName,
          orderId,
          orderNumber: trackingCode,
          actionType: 'ORDER_CONFIRMATION',
          payloadPreview: 'Test payload for non-WhatsApp number',
        },
        async () => {
          return { success: false, notOnWhatsApp: true, error: 'NO_WHATSAPP' };
        }
      );
      return NextResponse.json({ success: true, result: res });
    }

    return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const pool = getMysqlPool();

    if (phone) {
      await pool.execute('DELETE FROM agent_operations_log WHERE customer_phone LIKE ?', [`%${phone}%`]);
    } else {
      await pool.execute('DELETE FROM agent_operations_log WHERE customer_phone LIKE ?', ['%0661223344%']);
    }

    return NextResponse.json({ success: true, message: 'Logs de test nettoyés' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
