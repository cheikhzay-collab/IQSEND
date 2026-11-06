import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { getMysqlPool } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __senditServerBootstrapped: boolean | undefined;
  // eslint-disable-next-line no-var
  var __senditBootstrapPromise: Promise<void> | undefined;
}

const PERSISTENT_UPLOADS_DIR = path.join(os.homedir(), '.sendit_persistent_uploads');

/**
 * Copies all files recursively from src to dest synchronously
 */
function copyDirectoryFiles(src: string, dest: string) {
  try {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDirectoryFiles(srcPath, destPath);
      } else if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  } catch (err: any) {
    console.warn('[ServerBoot] copyDirectoryFiles note:', err?.message);
  }
}

/**
 * One-time server bootstrapper:
 * 1. Ensures MySQL schema tables exist (whatsapp_auth_session, media_uploads, store_settings).
 * 2. Hydrates process.env & config files (ai_config.json, sendit_config.json) from MySQL store_settings.
 * 3. Restores all uploaded media into public/uploads from persistent storage & sibling deployment versions.
 * 4. Automatically initiates background WhatsApp connection.
 */
export async function bootstrapServer(): Promise<void> {
  if (global.__senditServerBootstrapped) return;
  if (global.__senditBootstrapPromise) return global.__senditBootstrapPromise;

  global.__senditBootstrapPromise = (async () => {
    console.log('[ServerBoot] 🚀 Initializing Sendit Platform Persistence Engine...');

    try {
      const pool = getMysqlPool();

      // ── STEP 1: Ensure essential persistence tables exist ──
      try {
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS whatsapp_auth_session (
            session_id VARCHAR(100) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_content LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (session_id, file_name)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.execute(`
          CREATE TABLE IF NOT EXISTS media_uploads (
            id VARCHAR(255) PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            media_type ENUM('IMAGE', 'VIDEO', 'DOCUMENT') DEFAULT 'IMAGE',
            file_data LONGTEXT NULL,
            size_bytes BIGINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
      } catch (dbTableErr: any) {
        console.warn('[ServerBoot] Table initialization note:', dbTableErr?.message);
      }

      // ── STEP 2: Hydrate environment variables & config files from store_settings ──
      try {
        const [rows]: any = await pool.execute(`
          SELECT setting_key, setting_value FROM store_settings
        `);

        if (Array.isArray(rows) && rows.length > 0) {
          const map: Record<string, string> = {};
          for (const r of rows) {
            if (r.setting_key && r.setting_value) {
              map[r.setting_key] = r.setting_value.trim();
            }
          }

          // Hydrate Gemini API
          const geminiKey = map['GEMINI_API_KEY'];
          const geminiModel = map['GEMINI_MODEL_NAME'] || 'gemini-1.5-flash';
          if (geminiKey && geminiKey !== 'votre_cle_gemini_ici') {
            process.env.GEMINI_API_KEY = geminiKey;
            process.env.GEMINI_MODEL_NAME = geminiModel;
            try {
              fs.writeFileSync(
                path.join(process.cwd(), 'ai_config.json'),
                JSON.stringify({ apiKey: geminiKey, model: geminiModel, updatedAt: new Date().toISOString() }, null, 2)
              );
            } catch {}
          }

          // Hydrate Sendit API
          const senditPub = map['SENDIT_PUBLIC_KEY'];
          const senditPriv = map['SENDIT_PRIVATE_KEY'] || map['SENDIT_SECRET_KEY'];
          const senditSecret = map['SENDIT_WEBHOOK_SECRET'] || '';
          if (senditPub && senditPriv) {
            process.env.SENDIT_PUBLIC_KEY = senditPub;
            process.env.SENDIT_PRIVATE_KEY = senditPriv;
            process.env.SENDIT_SECRET_KEY = senditPriv;
            if (senditSecret) process.env.SENDIT_WEBHOOK_SECRET = senditSecret;

            try {
              fs.writeFileSync(
                path.join(process.cwd(), 'sendit_config.json'),
                JSON.stringify({
                  publicKey: senditPub,
                  secretKey: senditPriv,
                  webhookSecret: senditSecret,
                  apiUrl: 'https://app.sendit.ma/api/v1',
                  updatedAt: new Date().toISOString(),
                }, null, 2)
              );
            } catch {}
          }

          // Hydrate Google Sheets
          if (map['GOOGLE_SHEET_URL']) process.env.GOOGLE_SHEET_URL = map['GOOGLE_SHEET_URL'];
          if (map['GOOGLE_SHEET_AUTO_SYNC']) process.env.GOOGLE_SHEET_AUTO_SYNC = map['GOOGLE_SHEET_AUTO_SYNC'];

          console.log(`[ServerBoot] ✅ Hydrated ${Object.keys(map).length} store settings into process.env & config files.`);
        }
      } catch (settingsErr: any) {
        console.warn('[ServerBoot] Error hydrating store settings:', settingsErr?.message);
      }

      // ── STEP 3: Restore Uploaded Media Files across deployments ──
      try {
        const localUploadsDir = path.join(process.cwd(), 'public', 'uploads', 'campaigns');
        if (!fs.existsSync(localUploadsDir)) {
          fs.mkdirSync(localUploadsDir, { recursive: true });
        }

        // 3a. Copy from persistent home directory
        if (fs.existsSync(PERSISTENT_UPLOADS_DIR)) {
          copyDirectoryFiles(PERSISTENT_UPLOADS_DIR, path.join(process.cwd(), 'public', 'uploads'));
        }

        // 3b. Scan sibling versions on Hostinger
        try {
          const parentDir = path.resolve(process.cwd(), '..');
          if (fs.existsSync(parentDir)) {
            const siblings = fs.readdirSync(parentDir);
            for (const sib of siblings) {
              if (sib === path.basename(process.cwd())) continue;
              const sibUploads = path.join(parentDir, sib, 'public', 'uploads');
              if (fs.existsSync(sibUploads)) {
                copyDirectoryFiles(sibUploads, path.join(process.cwd(), 'public', 'uploads'));
              }
            }
          }
        } catch {}

        // 3c. Restore from MySQL media_uploads if disk is still empty
        const [dbUploads]: any = await pool.execute(`
          SELECT filename, file_data FROM media_uploads WHERE file_data IS NOT NULL LIMIT 50
        `);
        if (Array.isArray(dbUploads)) {
          for (const up of dbUploads) {
            const targetPath = path.join(localUploadsDir, up.filename);
            if (!fs.existsSync(targetPath) && up.file_data) {
              try {
                fs.writeFileSync(targetPath, Buffer.from(up.file_data, 'base64'));
              } catch {}
            }
          }
        }
      } catch (mediaErr: any) {
        console.warn('[ServerBoot] Media restore note:', mediaErr?.message);
      }

      // ── STEP 4: Auto-Launch WhatsApp Baileys background service ──
      try {
        const { startBaileysService, getWhatsAppDirectStatus } = await import('@/lib/whatsapp/baileys-service');
        const st = getWhatsAppDirectStatus();
        if (st.status !== 'CONNECTED') {
          console.log('[ServerBoot] 📱 Auto-starting WhatsApp background bridge...');
          startBaileysService().catch((e) => console.warn('[ServerBoot] WhatsApp auto-start note:', e?.message));
        }
      } catch (waErr: any) {
        console.warn('[ServerBoot] WhatsApp bridge auto-start note:', waErr?.message);
      }

      global.__senditServerBootstrapped = true;
      console.log('[ServerBoot] 🎉 Sendit Platform Persistence Engine fully initialized.');
    } catch (err: any) {
      console.error('[ServerBoot] Critical boot error:', err);
    }
  })();

  return global.__senditBootstrapPromise;
}
