import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.join(process.cwd(), 'ai_config.json');

const isExcludedModel = (name: string): boolean => {
  const lower = name.toLowerCase();
  return (
    lower.includes('tts') ||
    lower.includes('embedding') ||
    lower.includes('embed') ||
    lower.includes('imagen') ||
    lower.includes('audio') ||
    lower.includes('vision-preview') ||
    lower.includes('aqa') ||
    lower.includes('learnlm')
  );
};

/**
 * Automatically discovers and tests which text Gemini model is active and has free quota for this key
 */
async function resolveWorkingGeminiModel(apiKey: string): Promise<string> {
  const standardPriority = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash-8b',
  ];

  let authorizedModels: string[] = [];

  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { cache: 'no-store' }
    );

    if (listRes.ok) {
      const data = await listRes.json();
      const modelsList: Array<{ name: string; supportedGenerationMethods?: string[] }> =
        data.models || [];
      authorizedModels = modelsList
        .filter(
          (m) =>
            m.supportedGenerationMethods?.includes('generateContent') &&
            !isExcludedModel(m.name)
        )
        .map((m) => m.name.replace(/^models\//, ''));
    } else {
      const errData = await listRes.json().catch(() => ({}));
      if (
        errData?.error?.message?.includes('API_KEY_INVALID') ||
        errData?.error?.message?.includes('API key not valid')
      ) {
        throw new Error('Clé API Gemini non valide (vérifiez la clé copiée depuis Google AI Studio).');
      }
    }
  } catch (apiErr: any) {
    if (
      apiErr.message?.includes('API_KEY_INVALID') ||
      apiErr.message?.includes('API key not valid')
    ) {
      throw apiErr;
    }
  }

  // Build candidate list: prioritize standard fast models that are authorized
  const candidates: string[] = [];

  for (const pref of standardPriority) {
    if (authorizedModels.includes(pref) && !candidates.includes(pref)) {
      candidates.push(pref);
    }
  }

  for (const auth of authorizedModels) {
    if (!candidates.includes(auth) && !isExcludedModel(auth)) {
      candidates.push(auth);
    }
  }

  // Fallback defaults if list API didn't return
  for (const pref of standardPriority) {
    if (!candidates.includes(pref)) {
      candidates.push(pref);
    }
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: any = null;

  for (const candidate of candidates) {
    if (isExcludedModel(candidate)) continue;
    try {
      const model = genAI.getGenerativeModel({ model: candidate });
      const testRes = await model.generateContent('مرحبا');
      const text = testRes?.response?.text();
      if (text) {
        console.log(`[Gemini Auth] Successfully validated key with active model: ${candidate}`);
        return candidate;
      }
    } catch (testErr: any) {
      lastError = testErr;
      if (
        testErr.message &&
        (testErr.message.includes('API_KEY_INVALID') ||
          testErr.message.includes('API key not valid'))
      ) {
        throw testErr;
      }
      // If 404 or 429 on this specific preview model, keep trying next candidate!
      console.warn(`[Gemini Probe] Model ${candidate} failed (${testErr.message?.slice(0, 80)}), trying next...`);
    }
  }

  throw (
    lastError ||
    new Error('Aucun modèle Gemini actif avec quota disponible trouvé pour cette clé API.')
  );
}

export async function GET() {
  let savedKey = process.env.GEMINI_API_KEY || '';
  let modelName = 'gemini-1.5-flash';
  // 1. Check Hostinger MySQL store_settings & ai_agent_configs first
  try {
    const { getMysqlPool } = await import('@/lib/db');
    const pool = getMysqlPool();
    const [rows]: any = await pool.execute(`
      SELECT setting_key, setting_value FROM store_settings
      WHERE setting_key IN ('GEMINI_API_KEY', 'GEMINI_MODEL_NAME')
    `);
    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (r.setting_key === 'GEMINI_API_KEY' && r.setting_value) savedKey = r.setting_value;
        if (r.setting_key === 'GEMINI_MODEL_NAME' && r.setting_value) modelName = r.setting_value;
      }
    }
  } catch (e) {}

  if (savedKey === 'votre_cle_gemini_ici') savedKey = '';

  try {
    if (!savedKey && fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (data.apiKey) savedKey = data.apiKey;
      if (data.model) modelName = data.model;
    }
  } catch (e) {}

  const isConfigured = Boolean(savedKey && savedKey.length > 15);
  const maskedKey = isConfigured ? `${savedKey.slice(0, 7)}...${savedKey.slice(-4)}` : '';

  return NextResponse.json({
    success: true,
    source: 'hostinger_mysql',
    isConfigured,
    maskedKey,
    model: modelName,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 15) {
      return NextResponse.json(
        { success: false, error: 'Veuillez saisir une clé API Gemini valide (ex: AIzaSy...)' },
        { status: 400 }
      );
    }

    const cleanKey = apiKey.trim();

    // 1. Resolve and validate available model dynamically
    let workingModel = 'gemini-1.5-flash';
    try {
      workingModel = await resolveWorkingGeminiModel(cleanKey);
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: `Échec de validation de la clé Gemini: ${err.message || 'Clé non valide ou quota dépassé'}`,
        },
        { status: 400 }
      );
    }

    // 2. Persist to Hostinger MySQL store_settings & ai_agent_configs tables
    try {
      const { getMysqlPool } = await import('@/lib/db');
      const pool = getMysqlPool();
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GEMINI_API_KEY', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [cleanKey]
      );

      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GEMINI_MODEL_NAME', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [workingModel]
      );

      await pool.execute(
        `UPDATE ai_agent_configs SET gemini_model = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'agent-sarah-01'`,
        [workingModel]
      );
    } catch (dbErr: any) {
      console.warn('[Gemini API] DB persist error:', dbErr.message);
    }

    // 3. Keep local fallback and in-memory process.env synced
    try {
      fs.writeFileSync(
        CONFIG_PATH,
        JSON.stringify(
          {
            apiKey: cleanKey,
            model: workingModel,
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );
    } catch {}

    process.env.GEMINI_API_KEY = cleanKey;
    process.env.GEMINI_MODEL_NAME = workingModel;

    try {
      const { setGeminiRuntimeKey } = await import('@/lib/gemini-agent');
      setGeminiRuntimeKey(cleanKey, workingModel);
    } catch {}

    return NextResponse.json({
      success: true,
      source: 'hostinger_mysql',
      message: `Clé API Gemini enregistrée dans Hostinger MySQL avec succès ! Modèle sélectionné: [${workingModel}].`,
      maskedKey: `${cleanKey.slice(0, 7)}...${cleanKey.slice(-4)}`,
      model: workingModel,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}
