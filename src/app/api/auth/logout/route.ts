import { NextRequest, NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('iqsend_session')?.value;
    if (sessionCookie) {
      try {
        const pool = getMysqlPool();
        await pool.execute(
          `UPDATE users SET is_online = 0, last_active_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [sessionCookie]
        );
      } catch {}
    }

    const response = NextResponse.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح / Déconnexion réussie',
    });

    response.cookies.delete('iqsend_session');
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
