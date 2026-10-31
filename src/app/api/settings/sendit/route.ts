import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { senditService } from '@/lib/sendit-service';
import { getMysqlPool } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime-events';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.join(process.cwd(), 'sendit_config.json');

/**
 * Calcul de la date limite en fonction de la fenêtre choisie
 */
function computeCutoffDate(windowType: string, customStartDate?: string): Date | null {
  const now = new Date();
  if (windowType === 'LAST_7_DAYS') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (windowType === 'LAST_14_DAYS') {
    return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  }
  if (windowType === 'LAST_30_DAYS') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (windowType === 'LAST_60_DAYS') {
    return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  }
  if (windowType === 'CUSTOM' && customStartDate) {
    const p = new Date(customStartDate);
    return isNaN(p.getTime()) ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) : p;
  }
  if (windowType === 'ALL') {
    return null;
  }
  // Par défaut : 30 jours
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

/**
 * GET /api/settings/sendit
 * Retrieve Sendit.ma API credentials and Sync Scope configurations from Hostinger MySQL
 */
export async function GET() {
  let publicKey = '';
  let secretKey = '';
  let webhookSecret = '';

  let syncWindow = 'LAST_30_DAYS';
  let syncStartDate = '';
  let syncStatusScope = 'ACTIVE_AND_RECENT_CLOSED';
  let syncMaxPages = 5;

  const pool = getMysqlPool();

  // 1. Fetch from Hostinger MySQL store_settings table
  try {
    const [rows]: any = await pool.execute(`
      SELECT setting_key, setting_value FROM store_settings
      WHERE setting_key IN (
        'SENDIT_PUBLIC_KEY',
        'SENDIT_PRIVATE_KEY',
        'SENDIT_WEBHOOK_SECRET',
        'SENDIT_SYNC_WINDOW',
        'SENDIT_SYNC_START_DATE',
        'SENDIT_SYNC_STATUS_SCOPE',
        'SENDIT_SYNC_MAX_PAGES'
      )
    `);

    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (r.setting_key === 'SENDIT_PUBLIC_KEY') publicKey = r.setting_value;
        if (r.setting_key === 'SENDIT_PRIVATE_KEY') secretKey = r.setting_value;
        if (r.setting_key === 'SENDIT_WEBHOOK_SECRET') webhookSecret = r.setting_value;
        if (r.setting_key === 'SENDIT_SYNC_WINDOW') syncWindow = r.setting_value;
        if (r.setting_key === 'SENDIT_SYNC_START_DATE') syncStartDate = r.setting_value;
        if (r.setting_key === 'SENDIT_SYNC_STATUS_SCOPE') syncStatusScope = r.setting_value;
        if (r.setting_key === 'SENDIT_SYNC_MAX_PAGES') syncMaxPages = parseInt(r.setting_value, 10) || 5;
      }
    }
  } catch (err: any) {
    console.warn('[API Settings Sendit GET] DB query warning:', err.message);
  }

  // 2. Fallback to process.env or local config
  if (!publicKey) publicKey = process.env.SENDIT_PUBLIC_KEY || '';
  if (!secretKey) secretKey = process.env.SENDIT_SECRET_KEY || process.env.SENDIT_PRIVATE_KEY || '';
  if (!webhookSecret) webhookSecret = process.env.SENDIT_WEBHOOK_SECRET || '';

  if (!publicKey && fs.existsSync(CONFIG_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      if (data.publicKey) publicKey = data.publicKey;
      if (data.secretKey) secretKey = data.secretKey;
      if (data.webhookSecret) webhookSecret = data.webhookSecret;
    } catch {}
  }

  const isConfigured = Boolean(publicKey && secretKey);

  // 3. Calculer les statistiques du périmètre de synchronisation
  const cutoffDate = computeCutoffDate(syncWindow, syncStartDate);
  const cutoffIso = cutoffDate ? cutoffDate.toISOString().slice(0, 10) : '';

  let totalSenditSync = 0;
  let inScopeCount = 0;
  let outOfScopeCount = 0;

  try {
    if (cutoffDate) {
      const [stats]: any = await pool.execute(
        `SELECT 
          COUNT(*) as total_sendit,
          COUNT(CASE WHEN created_at >= ? THEN 1 END) as in_scope,
          COUNT(CASE WHEN created_at < ? THEN 1 END) as out_of_scope
        FROM order_leads
        WHERE store_source = 'SENDIT_SYNC'`,
        [cutoffDate, cutoffDate]
      );
      if (Array.isArray(stats) && stats.length > 0) {
        totalSenditSync = Number(stats[0].total_sendit) || 0;
        inScopeCount = Number(stats[0].in_scope) || 0;
        outOfScopeCount = Number(stats[0].out_of_scope) || 0;
      }
    } else {
      const [stats]: any = await pool.execute(
        `SELECT COUNT(*) as total_sendit FROM order_leads WHERE store_source = 'SENDIT_SYNC'`
      );
      if (Array.isArray(stats) && stats.length > 0) {
        totalSenditSync = Number(stats[0].total_sendit) || 0;
        inScopeCount = totalSenditSync;
        outOfScopeCount = 0;
      }
    }
  } catch (err: any) {
    console.warn('[API Settings Sendit GET] Stats query warning:', err.message);
  }

  return NextResponse.json({
    success: true,
    source: 'hostinger_mysql',
    isConfigured,
    publicKey: publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : '',
    hasSecretKey: Boolean(secretKey),
    webhookSecret: webhookSecret || 'iqsend_webhook_secret_2025',
    apiUrl: 'https://app.sendit.ma/api/v1',
    syncScope: {
      syncWindow,
      syncStartDate: syncStartDate || cutoffIso,
      syncStatusScope,
      syncMaxPages,
      calculatedCutoffDate: cutoffIso,
      stats: {
        totalSenditSync,
        inScopeCount,
        outOfScopeCount,
      },
    },
  });
}

/**
 * POST /api/settings/sendit
 * Validate and save Sendit.ma API keys, sync scope settings, or trigger purge of stale orders
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      publicKey,
      secretKey,
      webhookSecret,
      testOnly,
      syncWindow,
      syncStartDate,
      syncStatusScope,
      syncMaxPages,
      customCutoffDate,
    } = body;

    const pool = getMysqlPool();

    // ─────────────────────────────────────────────────────────────
    // ACTION 1 : PURGER LES ANCIENS COLIS OBSOLÈTES
    // ─────────────────────────────────────────────────────────────
    if (action === 'PURGE_OLD_PARCELS') {
      let targetCutoff: Date | null = null;
      if (customCutoffDate) {
        targetCutoff = new Date(customCutoffDate);
      } else {
        // Lire la configuration actuelle en base
        const [rows]: any = await pool.execute(`
          SELECT setting_key, setting_value FROM store_settings
          WHERE setting_key IN ('SENDIT_SYNC_WINDOW', 'SENDIT_SYNC_START_DATE')
        `);
        let curWin = 'LAST_30_DAYS';
        let curStart = '';
        if (Array.isArray(rows)) {
          for (const r of rows) {
            if (r.setting_key === 'SENDIT_SYNC_WINDOW') curWin = r.setting_value;
            if (r.setting_key === 'SENDIT_SYNC_START_DATE') curStart = r.setting_value;
          }
        }
        targetCutoff = computeCutoffDate(curWin, curStart);
      }

      if (!targetCutoff || isNaN(targetCutoff.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Date limite de purge invalide ou périmètre défini sur TOUT.' },
          { status: 400 }
        );
      }

      // 1. Compter les enregistrements ciblés
      const [countRows]: any = await pool.execute(
        `SELECT COUNT(*) as count FROM order_leads 
         WHERE store_source = 'SENDIT_SYNC' AND created_at < ?`,
        [targetCutoff]
      );
      const toDeleteCount = Number(countRows?.[0]?.count) || 0;

      if (toDeleteCount === 0) {
        return NextResponse.json({
          success: true,
          purgedCount: 0,
          message: `Aucun ancien colis Sendit antérieur au ${targetCutoff.toISOString().slice(0, 10)} à purger. Votre base est déjà propre !`,
        });
      }

      // 2. Suppression en cascade sécurisée (tables enfants puis order_leads)
      await pool.execute(
        `DELETE s FROM shipment_details s
         INNER JOIN order_leads l ON s.order_id = l.id
         WHERE l.store_source = 'SENDIT_SYNC' AND l.created_at < ?`,
        [targetCutoff]
      );

      await pool.execute(
        `DELETE t FROM order_timelines t
         INNER JOIN order_leads l ON t.order_id = l.id
         WHERE l.store_source = 'SENDIT_SYNC' AND l.created_at < ?`,
        [targetCutoff]
      );

      await pool.execute(
        `DELETE r FROM delivery_rescues r
         INNER JOIN order_leads l ON r.order_id = l.id
         WHERE l.store_source = 'SENDIT_SYNC' AND l.created_at < ?`,
        [targetCutoff]
      );

      await pool.execute(
        `DELETE FROM order_leads
         WHERE store_source = 'SENDIT_SYNC' AND created_at < ?`,
        [targetCutoff]
      );

      // Notification Realtime
      realtimeHub.broadcast({
        eventType: 'SHIPMENT_STATUS_UPDATED',
        entityType: 'SYSTEM',
        entityId: 'PURGE_OLD_PARCELS',
        title: `Nettoyage Sendit: ${toDeleteCount} anciens colis obsolètes purgés avec succès`,
        payload: { purgedCount: toDeleteCount, cutoff: targetCutoff.toISOString().slice(0, 10) },
        source: 'PURGE_API',
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        purgedCount: toDeleteCount,
        cutoffDate: targetCutoff.toISOString().slice(0, 10),
        message: `✅ ${toDeleteCount} anciens colis antérieurs au ${targetCutoff.toISOString().slice(0, 10)} ont été purgés avec succès de la base de données !`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION 2 : ENREGISTRER LE PÉRIMÈTRE DE SYNCHRONISATION SEUL
    // ─────────────────────────────────────────────────────────────
    if (action === 'SAVE_SYNC_SCOPE' || (syncWindow && !publicKey && !secretKey)) {
      const finalWindow = syncWindow || 'LAST_30_DAYS';
      const finalStartDate = syncStartDate ? syncStartDate.trim() : '';
      const finalStatusScope = syncStatusScope || 'ACTIVE_AND_RECENT_CLOSED';
      const finalMaxPages = String(Math.max(1, Math.min(20, parseInt(String(syncMaxPages || 5), 10))));

      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('SENDIT_SYNC_WINDOW', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [finalWindow]
      );

      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('SENDIT_SYNC_START_DATE', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [finalStartDate]
      );

      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('SENDIT_SYNC_STATUS_SCOPE', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [finalStatusScope]
      );

      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('SENDIT_SYNC_MAX_PAGES', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [finalMaxPages]
      );

      const calculatedCutoff = computeCutoffDate(finalWindow, finalStartDate);
      const cutoffStr = calculatedCutoff ? calculatedCutoff.toISOString().slice(0, 10) : 'Aucune (Tout)';

      return NextResponse.json({
        success: true,
        saved: true,
        message: `✅ Périmètre de synchronisation Sendit enregistré ! Seuls les colis à partir du ${cutoffStr} seront synchronisés.`,
        syncScope: {
          syncWindow: finalWindow,
          syncStartDate: finalStartDate,
          syncStatusScope: finalStatusScope,
          syncMaxPages: Number(finalMaxPages),
          calculatedCutoffDate: cutoffStr,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION 3 : ENREGISTRER LES IDENTIFIANTS API (ET ÉVENTUELLEMENT LE PÉRIMÈTRE)
    // ─────────────────────────────────────────────────────────────
    let finalPublic = (publicKey || '').trim();
    let finalSecret = (secretKey || '').trim();
    const trimmedWebhook = (webhookSecret || '').trim() || 'iqsend_webhook_secret_2025';

    // If public key is masked or empty, preserve existing valid key
    if (!finalPublic || finalPublic.includes('...')) {
      const [existingPub]: any = await pool.execute(
        "SELECT setting_value FROM store_settings WHERE setting_key = 'SENDIT_PUBLIC_KEY' LIMIT 1"
      );
      if (existingPub?.[0]?.setting_value && !existingPub[0].setting_value.includes('...')) {
        finalPublic = existingPub[0].setting_value;
      } else {
        finalPublic = process.env.SENDIT_PUBLIC_KEY || '';
      }
    }

    // If secret key is empty or masked, preserve existing valid key
    if (!finalSecret || finalSecret.includes('...')) {
      const [existingSec]: any = await pool.execute(
        "SELECT setting_value FROM store_settings WHERE setting_key = 'SENDIT_PRIVATE_KEY' LIMIT 1"
      );
      if (existingSec?.[0]?.setting_value) {
        finalSecret = existingSec[0].setting_value;
      } else {
        finalSecret = process.env.SENDIT_SECRET_KEY || process.env.SENDIT_PRIVATE_KEY || '';
      }
    }

    if (!finalPublic || !finalSecret) {
      return NextResponse.json(
        { success: false, error: 'La Clé Publique (Public Key) et la Clé Secrète (Secret Key) sont requises.' },
        { status: 400 }
      );
    }

    // 1. Save directly to Hostinger MySQL store_settings table
    await pool.execute(
      `INSERT INTO store_settings (setting_key, setting_value, updated_at)
       VALUES ('SENDIT_PUBLIC_KEY', ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
      [finalPublic]
    );

    await pool.execute(
      `INSERT INTO store_settings (setting_key, setting_value, updated_at)
       VALUES ('SENDIT_PRIVATE_KEY', ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
      [finalSecret]
    );

    await pool.execute(
      `INSERT INTO store_settings (setting_key, setting_value, updated_at)
       VALUES ('SENDIT_WEBHOOK_SECRET', ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
      [trimmedWebhook]
    );

    await pool.execute(
      `INSERT INTO store_settings (setting_key, setting_value, updated_at)
       VALUES ('SENDIT_LAST_SYNC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE setting_value = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`
    );

    // Save sync scope parameters if also passed
    if (syncWindow) {
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('SENDIT_SYNC_WINDOW', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [syncWindow]
      );
    }
    if (syncStartDate !== undefined) {
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('SENDIT_SYNC_START_DATE', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [syncStartDate || '']
      );
    }
    if (syncStatusScope) {
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('SENDIT_SYNC_STATUS_SCOPE', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [syncStatusScope]
      );
    }
    if (syncMaxPages) {
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('SENDIT_SYNC_MAX_PAGES', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [String(syncMaxPages)]
      );
    }

    // 2. Also keep local config file & process.env synced for local fallbacks
    try {
      fs.writeFileSync(
        CONFIG_PATH,
        JSON.stringify(
          {
            publicKey: finalPublic,
            secretKey: finalSecret,
            webhookSecret: trimmedWebhook,
            webhookUrl: 'https://lawngreen-jaguar-315438.hostingersite.com/api/webhooks/sendit',
            apiUrl: 'https://app.sendit.ma/api/v1',
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );
    } catch {}

    process.env.SENDIT_PUBLIC_KEY = finalPublic;
    process.env.SENDIT_SECRET_KEY = finalSecret;
    process.env.SENDIT_PRIVATE_KEY = finalSecret;
    process.env.SENDIT_WEBHOOK_SECRET = trimmedWebhook;

    // 3. Apply credentials to senditService singleton
    senditService.setCredentials(finalPublic, finalSecret, trimmedWebhook);

    // 4. Test live connection
    const testResult = await senditService.testConnection();

    // 5. Broadcast real-time event
    realtimeHub.broadcast({
      eventType: 'NOTIFICATION',
      entityType: 'SYSTEM',
      entityId: 'SENDIT_INTEGRATION',
      title: 'Identifiants Sendit.ma mis à jour et synchronisés dans MySQL',
      payload: { isLiveConnected: testResult.success },
      source: 'SETTINGS_API',
    }).catch(() => {});

    if (!testResult.success) {
      return NextResponse.json({
        success: true,
        saved: true,
        isLiveConnected: false,
        message: `Identifiants Sendit.ma enregistrés dans MySQL ! Remarque API : ${testResult.message}.`,
        isConfigured: true,
        maskedKey: `${finalPublic.slice(0, 6)}...${finalPublic.slice(-4)}`,
      });
    }

    return NextResponse.json({
      success: true,
      saved: true,
      isLiveConnected: true,
      message: `✅ Connexion réussie à Sendit.ma Express ! ${testResult.message}`,
      isConfigured: true,
      maskedKey: `${finalPublic.slice(0, 6)}...${finalPublic.slice(-4)}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur interne lors de la sauvegarde Sendit' },
      { status: 500 }
    );
  }
}
