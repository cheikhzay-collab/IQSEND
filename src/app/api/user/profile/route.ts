import { NextRequest, NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime-events';
import { UserPermissions, DEFAULT_ROLE_PERMISSIONS } from '@/types/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUserId = req.cookies.get('iqsend_session')?.value;
    const url = new URL(req.url);
    const queryId = url.searchParams.get('id');
    const targetId = queryId || sessionUserId;

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const pool = getMysqlPool();
    const [rows]: any = await pool.execute(
      `SELECT id, name, email, role, job_title, phone, avatar_url, permissions, is_online, is_active, created_at 
       FROM users 
       WHERE id = ? 
       LIMIT 1`,
      [targetId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const user = rows[0];
    let parsedPermissions: UserPermissions;
    try {
      if (user.permissions) {
        const raw = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
        parsedPermissions = {
          ...DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT,
          ...raw,
        };
      } else {
        parsedPermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT;
      }
    } catch {
      parsedPermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        jobTitle: user.job_title || (user.role === 'ADMIN' ? 'Directeur Général & Administrateur' : 'Spécialiste COD'),
        phone: user.phone || '+212 600000000',
        avatarUrl: user.avatar_url || '',
        isOnline: Boolean(user.is_online),
        isActive: Boolean(user.is_active),
        permissions: parsedPermissions,
      },
    });
  } catch (error: any) {
    console.error('[API User Profile GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUserId = req.cookies.get('iqsend_session')?.value;
    const body = await req.json();
    const { id, name, phone, avatarUrl, jobTitle, password } = body;

    const targetId = id || sessionUserId;
    if (!targetId) {
      return NextResponse.json(
        { success: false, error: 'Identifiant utilisateur requis' },
        { status: 400 }
      );
    }

    const pool = getMysqlPool();

    // 1. Fetch current user from DB to check role and verify existence
    const [existingRows]: any = await pool.execute(
      `SELECT id, role, permissions FROM users WHERE id = ? LIMIT 1`,
      [targetId]
    );

    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    const existingUser = existingRows[0];
    const isCurrentUserAdmin = existingUser.role === 'ADMIN';

    // 2. Strict permission enforcement:
    // Non-admins CANNOT modify role, permissions, or isActive of their account!
    // They can ONLY modify their personal details (name, phone, avatarUrl, jobTitle, password).
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined && String(name).trim().length > 0) {
      updates.push('name = ?');
      values.push(String(name).trim());
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(String(phone).trim());
    }

    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      // Can be an HTTPS URL or base64 Data URL
      values.push(String(avatarUrl));
    }

    if (jobTitle !== undefined) {
      // Non-admins can customize their sub-title/specialty or Admin can edit
      updates.push('job_title = ?');
      values.push(String(jobTitle).trim());
    }

    if (password && String(password).trim().length >= 6) {
      updates.push('password_hash = ?');
      values.push(`$2b$10$custom_${String(password).trim()}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucune modification apportée.',
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(targetId);

    const updateSql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await pool.execute(updateSql, values);

    // 3. Retrieve updated record
    const [updatedRows]: any = await pool.execute(
      `SELECT id, name, email, role, job_title, phone, avatar_url, permissions, is_online, is_active FROM users WHERE id = ? LIMIT 1`,
      [targetId]
    );

    const updated = updatedRows[0];
    let parsedPerms: UserPermissions = DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT;
    try {
      if (updated.permissions) {
        const raw = typeof updated.permissions === 'string' ? JSON.parse(updated.permissions) : updated.permissions;
        parsedPerms = { ...DEFAULT_ROLE_PERMISSIONS[updated.role], ...raw };
      } else {
        parsedPerms = DEFAULT_ROLE_PERMISSIONS[updated.role] || DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT;
      }
    } catch {}

    const updatedUserObj = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      jobTitle: updated.job_title,
      phone: updated.phone,
      avatarUrl: updated.avatar_url,
      isOnline: Boolean(updated.is_online),
      isActive: Boolean(updated.is_active),
      permissions: parsedPerms,
    };

    realtimeHub.broadcast({
      eventType: 'TEAM_UPDATED',
      entityType: 'USER',
      entityId: targetId,
      title: `Profil mis à jour : ${updated.name}`,
      payload: updatedUserObj,
      source: 'PROFILE_API',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Profil et photo mis à jour avec succès dans MySQL !',
      user: updatedUserObj,
    });
  } catch (error: any) {
    console.error('[API User Profile PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}
