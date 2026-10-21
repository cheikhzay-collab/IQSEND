import { NextRequest, NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { DEFAULT_ROLE_PERMISSIONS, UserPermissions } from '@/types/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('iqsend_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
    }

    const pool = getMysqlPool();
    let user: any = null;

    try {
      const [rows]: any = await pool.execute(
        `SELECT id, name, email, role, job_title, phone, avatar_url, permissions, is_online, is_active FROM users WHERE id = ? LIMIT 1`,
        [sessionCookie]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        user = rows[0];
      }
    } catch (e) {}

    if (!user) {
      return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
    }

    let parsedPermissions: UserPermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT;
    try {
      if (user.permissions) {
        const raw = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
        parsedPermissions = { ...parsedPermissions, ...raw };
      }
    } catch {}

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        jobTitle: user.job_title || 'Administrateur Système',
        phone: user.phone,
        avatarUrl: user.avatar_url,
        isActive: Boolean(user.is_active),
        isOnline: Boolean(user.is_online),
        permissions: parsedPermissions,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
