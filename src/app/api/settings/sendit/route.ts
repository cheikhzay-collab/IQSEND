import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { senditService } from '@/lib/sendit-service';
import { getMysqlPool } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime-events';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.join(process.cwd(), 'sendit_config.json');

/**
 * GET /api/settings/sendit
 * Retrieve Sendit.ma API credentials directly from Hostinger MySQL store_settings
 */
export async function GET() {
  let publicKey = '';
  let secretKey = '';
  let webhookSecret = '';

  // 1. Fetch from Hostinger MySQL store_settings table
  try {
    const pool = getMysqlPool();
    const [rows]: any = await pool.execute(`
      SELECT setting_key, setting_value FROM store_settings
      WHERE setting_key IN ('SENDIT_PUBLIC_KEY', 'SENDIT_PRIVATE_KEY', 'SENDIT_WEBHOOK_SECRET')
    `);

    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (r.setting_key === 'SENDIT_PUBLIC_KEY') publicKey = r.setting_value;
        if (r.setting_key === 'SENDIT_PRIVATE_KEY') secretKey = r.setting_value;
        if (r.setting_key === 'SENDIT_WEBHOOK_SECRET') webhookSecret = r.setting_value;
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

  return NextResponse.json({
    success: true,
    source: 'hostinger_mysql',
    isConfigured,
    publicKey: publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : '',
    hasSecretKey: Boolean(secretKey),
    webhookSecret: webhookSecret || 'iqsend_webhook_secret_2025',
    apiUrl: 'https://app.sendit.ma/api/v1',
  });
}

/**
 * POST /api/settings/sendit
 * Validate and save Sendit.ma API keys directly into Hostinger MySQL
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { publicKey, secretKey, webhookSecret, testOnly } = body;

    let finalPublic = (publicKey || '').trim();
    let finalSecret = (secretKey || '').trim();
    const trimmedWebhook = (webhookSecret || '').trim() || 'iqsend_webhook_secret_2025';

    const pool = getMysqlPool();

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
