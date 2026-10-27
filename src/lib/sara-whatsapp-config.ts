import { getMysqlPool } from './db';

export type SaraWhatsAppMode = 'sara_live' | 'classic_agent' | 'disabled';

export interface SaraWhatsAppSettings {
  enabled: boolean;
  mode: SaraWhatsAppMode;
  voiceEnabled: boolean;
  visionEnabled: boolean;
  autoConfirmOrders: boolean;
  autoSendProductImages: boolean;
  geminiModel: string;
  updatedAt: string;
}

// In-memory runtime cache for ultra-fast lookup on incoming webhooks
let cachedSettings: SaraWhatsAppSettings = {
  enabled: true,
  mode: 'sara_live',
  voiceEnabled: true,
  visionEnabled: true,
  autoConfirmOrders: true,
  autoSendProductImages: true,
  geminiModel: 'gemini-2.0-flash',
  updatedAt: new Date().toISOString(),
};

let lastFetchTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds cache to minimize DB load while staying responsive

/**
 * Get current Sara WhatsApp settings, reading from MySQL store_settings with memory cache fallback
 */
export async function getSaraWhatsAppConfig(): Promise<SaraWhatsAppSettings> {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_TTL_MS) {
    return { ...cachedSettings };
  }

  try {
    const pool = getMysqlPool();
    const [rows]: any = await pool.execute(`
      SELECT setting_key, setting_value
      FROM store_settings
      WHERE setting_key IN (
        'SARA_WHATSAPP_ENABLED',
        'WHATSAPP_AI_MODE',
        'SARA_VOICE_ENABLED',
        'SARA_VISION_ENABLED',
        'SARA_AUTO_CONFIRM_ORDERS',
        'SARA_AUTO_SEND_IMAGES',
        'SARA_GEMINI_MODEL'
      )
    `);

    if (Array.isArray(rows) && rows.length > 0) {
      const map: Record<string, string> = {};
      for (const r of rows) {
        map[r.setting_key] = r.setting_value;
      }

      cachedSettings = {
        enabled: map['SARA_WHATSAPP_ENABLED'] !== undefined ? map['SARA_WHATSAPP_ENABLED'] === 'true' : true,
        mode: (map['WHATSAPP_AI_MODE'] as SaraWhatsAppMode) || 'sara_live',
        voiceEnabled: map['SARA_VOICE_ENABLED'] !== undefined ? map['SARA_VOICE_ENABLED'] === 'true' : true,
        visionEnabled: map['SARA_VISION_ENABLED'] !== undefined ? map['SARA_VISION_ENABLED'] === 'true' : true,
        autoConfirmOrders: map['SARA_AUTO_CONFIRM_ORDERS'] !== undefined ? map['SARA_AUTO_CONFIRM_ORDERS'] === 'true' : true,
        autoSendProductImages: map['SARA_AUTO_SEND_IMAGES'] !== undefined ? map['SARA_AUTO_SEND_IMAGES'] === 'true' : true,
        geminiModel: map['SARA_GEMINI_MODEL'] || 'gemini-2.0-flash',
        updatedAt: new Date().toISOString(),
      };
    }
    lastFetchTime = now;
  } catch (err) {
    // If database lookup fails, return in-memory cache
    console.warn('[SaraWhatsAppConfig] DB read warning, using in-memory settings:', err);
  }

  return { ...cachedSettings };
}

/**
 * Update Sara WhatsApp settings in MySQL store_settings and local memory cache
 */
export async function updateSaraWhatsAppConfig(
  newSettings: Partial<SaraWhatsAppSettings>
): Promise<SaraWhatsAppSettings> {
  cachedSettings = {
    ...cachedSettings,
    ...newSettings,
    updatedAt: new Date().toISOString(),
  };

  try {
    const pool = getMysqlPool();
    const entries: [string, string][] = [
      ['SARA_WHATSAPP_ENABLED', String(cachedSettings.enabled)],
      ['WHATSAPP_AI_MODE', cachedSettings.mode],
      ['SARA_VOICE_ENABLED', String(cachedSettings.voiceEnabled)],
      ['SARA_VISION_ENABLED', String(cachedSettings.visionEnabled)],
      ['SARA_AUTO_CONFIRM_ORDERS', String(cachedSettings.autoConfirmOrders)],
      ['SARA_AUTO_SEND_IMAGES', String(cachedSettings.autoSendProductImages)],
      ['SARA_GEMINI_MODEL', cachedSettings.geminiModel],
    ];

    for (const [k, v] of entries) {
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [k, v]
      );
    }
    lastFetchTime = Date.now();
  } catch (err) {
    console.warn('[SaraWhatsAppConfig] DB write warning:', err);
  }

  return { ...cachedSettings };
}
