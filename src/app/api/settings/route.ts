import { NextRequest, NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime-events';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings
 * Retrieve all platform settings from Hostinger MySQL store_settings table
 */
export async function GET() {
  try {
    const pool = getMysqlPool();
    const [rows]: any = await pool.execute(`
      SELECT setting_key, setting_value, updated_at
      FROM store_settings
    `);

    const settingsMap: Record<string, string> = {};
    if (Array.isArray(rows)) {
      for (const r of rows) {
        settingsMap[r.setting_key] = r.setting_value;
      }
    }

    // Default fallbacks if keys not yet set
    const allSettings = {
      PLATFORM_NAME: settingsMap['PLATFORM_NAME'] || 'SENDIT Morocco COD Management',
      STORE_NAME: settingsMap['STORE_NAME'] || 'Boutique Sendit Express Maroc',
      STORE_PHONE: settingsMap['STORE_PHONE'] || '+212 661 223344',
      STORE_EMAIL: settingsMap['STORE_EMAIL'] || 'contact@sendit.ma',
      DEFAULT_CARRIER: settingsMap['DEFAULT_CARRIER'] || 'Sendit.ma Express',
      DEFAULT_SHIPPING_FEE: settingsMap['DEFAULT_SHIPPING_FEE'] || '35',
      COD_ONLY_MODE: settingsMap['COD_ONLY_MODE'] || 'true',
      RETURN_POLICY_DAYS: settingsMap['RETURN_POLICY_DAYS'] || '7',

      // Sendit.ma Logistics API
      SENDIT_PUBLIC_KEY: settingsMap['SENDIT_PUBLIC_KEY'] || process.env.SENDIT_PUBLIC_KEY || '',
      SENDIT_PRIVATE_KEY: settingsMap['SENDIT_PRIVATE_KEY'] || process.env.SENDIT_PRIVATE_KEY || '',
      SENDIT_WEBHOOK_SECRET: settingsMap['SENDIT_WEBHOOK_SECRET'] || process.env.SENDIT_WEBHOOK_SECRET || 'iqsend_webhook_secret_2025',
      SENDIT_WEBHOOK_URL: settingsMap['SENDIT_WEBHOOK_URL'] || 'https://lawngreen-jaguar-315438.hostingersite.com/api/webhooks/sendit',
      SENDIT_APP_ID: settingsMap['SENDIT_APP_ID'] || 'GAMA',
      SENDIT_LAST_SYNC: settingsMap['SENDIT_LAST_SYNC'] || new Date().toISOString(),

      // Google Sheets Integration
      GOOGLE_SHEET_URL: settingsMap['GOOGLE_SHEET_URL'] || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      GOOGLE_SHEET_ID: settingsMap['GOOGLE_SHEET_ID'] || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      GOOGLE_SHEET_AUTO_SYNC: settingsMap['GOOGLE_SHEET_AUTO_SYNC'] || 'true',

      // WhatsApp Gateway Integration
      WHATSAPP_PROVIDER: settingsMap['WHATSAPP_PROVIDER'] || 'BAILEYS',
      WHATSAPP_PHONE_ID: settingsMap['WHATSAPP_PHONE_ID'] || '104829104829104',
      WHATSAPP_API_TOKEN: settingsMap['WHATSAPP_API_TOKEN'] || '',
      WHATSAPP_API_URL: settingsMap['WHATSAPP_API_URL'] || 'http://localhost:5050',
      WHATSAPP_INSTANCE: settingsMap['WHATSAPP_INSTANCE'] || 'sendit_morocco',
      WHATSAPP_ANTI_BAN_DELAY: settingsMap['WHATSAPP_ANTI_BAN_DELAY'] || '3',
      WHATSAPP_AUTO_REPLY: settingsMap['WHATSAPP_AUTO_REPLY'] || 'true',

      // Google Gemini AI
      GEMINI_API_KEY: settingsMap['GEMINI_API_KEY'] || process.env.GEMINI_API_KEY || '',
      GEMINI_MODEL_NAME: settingsMap['GEMINI_MODEL_NAME'] || 'gemini-1.5-flash',
      AI_CONFIRMATION_AUTO_ENABLED: settingsMap['AI_CONFIRMATION_AUTO_ENABLED'] || 'true',
      AI_CONFIRM_THRESHOLD: settingsMap['AI_CONFIRM_THRESHOLD'] || '70',
      AI_VOICE_TONE: settingsMap['AI_VOICE_TONE'] || 'Darija Professional & Courteous',

      // Finance & Bank Details
      BANK_NAME: settingsMap['BANK_NAME'] || 'Attijariwafa Bank',
      BANK_RIB: settingsMap['BANK_RIB'] || '007 780 0001234567890123 45',
      BANK_BENEFICIARY: settingsMap['BANK_BENEFICIARY'] || 'SENDIT MOROCCO SARL',

      // Automations
      AUTOMATION_OUT_FOR_DELIVERY_NOTICE: settingsMap['AUTOMATION_OUT_FOR_DELIVERY_NOTICE'] || 'true',
      AUTOMATION_MORNING_REMINDER: settingsMap['AUTOMATION_MORNING_REMINDER'] || 'true',
      AUTOMATION_RESCUE_OUTREACH: settingsMap['AUTOMATION_RESCUE_OUTREACH'] || 'true',
      AUTOMATION_REVIEW_INVITATION: settingsMap['AUTOMATION_REVIEW_INVITATION'] || 'true',

      DATABASE_VERSION: settingsMap['DATABASE_VERSION'] || '2.0.0-hostinger-mysql-complete',
    };

    return NextResponse.json({
      success: true,
      source: 'database',
      settings: allSettings,
    });
  } catch (error: any) {
    console.error('[API Settings GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Save any platform setting key-value pair directly into Hostinger MySQL store_settings table
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid settings body' },
        { status: 400 }
      );
    }

    const pool = getMysqlPool();
    const updatedKeys: string[] = [];

    // Support either { key, value } OR an object with multiple { KEY1: VAL1, KEY2: VAL2 }
    const entries: [string, string][] = [];
    if (body.key && body.value !== undefined) {
      entries.push([String(body.key), String(body.value)]);
    } else {
      for (const [k, v] of Object.entries(body)) {
        if (v !== undefined && v !== null) {
          entries.push([k, typeof v === 'object' ? JSON.stringify(v) : String(v)]);
        }
      }
    }

    for (const [key, val] of entries) {
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [key, val]
      );
      updatedKeys.push(key);

      // Keep process.env in sync if matching
      if (key in process.env) {
        process.env[key] = val;
      }

      if (key === 'GEMINI_API_KEY') {
        try {
          const { invalidateGeminiKeyCache } = await import('@/lib/gemini-agent');
          invalidateGeminiKeyCache();
        } catch {}
      }
    }

    // 🔴 Real-time broadcast
    realtimeHub.broadcast({
      eventType: 'NOTIFICATION',
      entityType: 'SYSTEM',
      entityId: 'SETTINGS_UPDATE',
      title: `Paramètres mis à jour (${updatedKeys.length} clés sauvegardées dans MySQL)`,
      payload: { updatedKeys },
      source: 'SETTINGS_API',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `${updatedKeys.length} paramètres enregistrés avec succès dans Hostinger MySQL !`,
      updatedKeys,
    });
  } catch (error: any) {
    console.error('[API Settings POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
