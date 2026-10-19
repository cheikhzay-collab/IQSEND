import { NextResponse } from 'next/server';
import { getLeadsFromDb } from '@/lib/db-service';
import { getMysqlPool } from '@/lib/db';

import { serverCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceFresh = searchParams.get('refresh') === 'true' || searchParams.get('refresh') === '1';
    const leads = await getLeadsFromDb(forceFresh);
    return NextResponse.json(
      {
        success: true,
        count: leads.length,
        leads,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15',
        },
      }
    );
  } catch (err: any) {
    console.error('[API Leads GET] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message, leads: [] },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { leadId, status, notes } = body;

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
    }

    const pool = getMysqlPool();
    await pool.execute(
      `
      UPDATE order_leads
      SET 
        status = IFNULL(?, status),
        notes = IFNULL(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR order_number = ?
    `,
      [status || null, notes || null, leadId, leadId]
    );

    // Invalidate caches
    serverCache.invalidate(['leads', 'orders', 'dashboard_stats']);

    return NextResponse.json({
      success: true,
      message: `Lead ${leadId} updated successfully`,
    });
  } catch (err: any) {
    console.error('[API Leads PATCH] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
