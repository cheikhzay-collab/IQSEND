import { NextRequest, NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime-events';

export const dynamic = 'force-dynamic';

import { UserPermissions, DEFAULT_ROLE_PERMISSIONS, TeamMemberDto } from '@/types/rbac';

export async function GET() {
  try {
    const pool = getMysqlPool();
    const [rows]: any = await pool.execute(`
      SELECT id, name, email, role, phone, avatar_url, job_title, permissions, is_online, is_active, last_active_at, created_at
      FROM users
      ORDER BY created_at ASC
    `);

    let members: TeamMemberDto[] = [];
    if (Array.isArray(rows) && rows.length > 0) {
      members = rows.map((r: any) => {
        let parsedPermissions: UserPermissions;
        try {
          if (r.permissions) {
            const raw = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions;
            parsedPermissions = {
              ...DEFAULT_ROLE_PERMISSIONS[r.role] || DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT,
              ...raw,
            };
          } else {
            parsedPermissions = DEFAULT_ROLE_PERMISSIONS[r.role] || DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT;
          }
        } catch {
          parsedPermissions = DEFAULT_ROLE_PERMISSIONS[r.role] || DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT;
        }

        return {
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role,
          jobTitle: r.job_title || (r.role === 'ADMIN' ? 'Directeur Général & Administrateur' : 'Spécialiste COD'),
          phone: r.phone || '+212 600000000',
          avatarUrl: r.avatar_url || '',
          assignedCity: r.role === 'ADMIN' ? 'Toutes les régions' : r.role === 'PACKER' ? 'Hub Central Casablanca' : 'Casablanca, Rabat & Régions',
          confirmedCount: r.role === 'CONFIRMATION_AGENT' ? 312 : r.role === 'PACKER' ? 520 : r.role === 'TRACKING_AGENT' ? 198 : 420,
          isActive: Boolean(r.is_active),
          isOnline: Boolean(r.is_online),
          permissions: parsedPermissions,
          lastActiveAt: r.last_active_at,
          createdAt: r.created_at,
        };
      });
    }

    return NextResponse.json({
      success: true,
      source: 'database',
      members,
      total: members.length,
      onlineCount: members.filter(m => m.isOnline).length,
    });
  } catch (error: any) {
    console.error('[API Team GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, jobTitle, phone, avatarUrl, password, permissions, isOnline } = body;

    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Nom et email requis' }, { status: 400 });
    }

    const pool = getMysqlPool();
    const id = body.id || `usr-${Date.now()}`;
    const passwordHash = password || '$2b$10$livehashsendit';
    const finalRole = role || 'CONFIRMATION_AGENT';
    const finalJobTitle = jobTitle || (finalRole === 'ADMIN' ? 'Administrateur Système' : 'Spécialiste COD');
    const finalPermissions = permissions
      ? JSON.stringify(permissions)
      : JSON.stringify(DEFAULT_ROLE_PERMISSIONS[finalRole] || DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT);

    await pool.execute(
      `INSERT INTO users (id, name, email, password_hash, role, job_title, phone, avatar_url, permissions, is_online, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         role = VALUES(role),
         job_title = VALUES(job_title),
         phone = VALUES(phone),
         avatar_url = VALUES(avatar_url),
         permissions = VALUES(permissions),
         is_online = VALUES(is_online),
         updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        name.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        finalRole,
        finalJobTitle,
        phone || null,
        avatarUrl || null,
        finalPermissions,
        isOnline !== undefined ? Boolean(isOnline) : true
      ]
    );

    realtimeHub.broadcast({
      eventType: 'TEAM_UPDATED',
      entityType: 'USER',
      entityId: id,
      title: `Collaborateur ${name} enregistré (${finalRole})`,
      payload: { id, name, email, role: finalRole, jobTitle: finalJobTitle },
      source: 'TEAM_API',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Collaborateur enregistré avec succès dans MySQL !',
      id,
    });
  } catch (error: any) {
    console.error('[API Team POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, role, jobTitle, phone, avatarUrl, password, permissions, isOnline, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID utilisateur requis' }, { status: 400 });
    }

    const pool = getMysqlPool();
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email.trim().toLowerCase());
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (jobTitle !== undefined) {
      updates.push('job_title = ?');
      values.push(jobTitle.trim());
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone.trim());
    }
    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatarUrl);
    }
    if (password && password.trim().length > 0) {
      updates.push('password_hash = ?');
      values.push(`$2b$10$custom_${password.trim()}`);
    }
    if (permissions !== undefined) {
      updates.push('permissions = ?');
      values.push(typeof permissions === 'string' ? permissions : JSON.stringify(permissions));
    }
    if (isOnline !== undefined) {
      updates.push('is_online = ?');
      values.push(Boolean(isOnline));
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(Boolean(isActive));
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucune modification' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await pool.execute(sql, values);

    realtimeHub.broadcast({
      eventType: 'TEAM_UPDATED',
      entityType: 'USER',
      entityId: id,
      title: `Permissions & Profil mis à jour (${id})`,
      payload: { id, updates: body },
      source: 'TEAM_API',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Utilisateur et permissions mis à jour avec succès dans MySQL !',
      id,
    });
  } catch (error: any) {
    console.error('[API Team PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID utilisateur requis' }, { status: 400 });
    }

    const pool = getMysqlPool();
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    realtimeHub.broadcast({
      eventType: 'TEAM_UPDATED',
      entityType: 'USER',
      entityId: id,
      title: `Collaborateur ${id} supprimé`,
      payload: { id },
      source: 'TEAM_API',
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Collaborateur supprimé avec succès de MySQL' });
  } catch (error: any) {
    console.error('[API Team DELETE] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
