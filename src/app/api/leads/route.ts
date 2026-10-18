import { NextResponse } from 'next/server';
import { getLeadsFromDb } from '@/lib/db-service';
import { getMysqlPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const leads = await getLeadsFromDb();
    return NextResponse.json({
      success: true,
      count: leads.length,
      leads,
    });
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
