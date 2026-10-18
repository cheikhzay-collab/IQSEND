import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.join(process.cwd(), 'ai_config.json');

/**
 * Automatically discovers which Gemini models are available and active for this API key
 */
async function resolveWorkingGeminiModel(apiKey: string): Promise<string> {
  const preferredPriority = [
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-2.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-pro',
  ];

  // 1. Ask Google ModelService directly for the list of authorized models
  let availableModelNames: string[] = [];
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { cache: 'no-store' }
    );

    if (listRes.ok) {
      const data = await listRes.json();
      const modelsList: Array<{ name: string; supportedGenerationMethods?: string[] }> =
        data.models || [];
      availableModelNames = modelsList
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''));
    } else {
      const errData = await listRes.json().catch(() => ({}));
      if (errData?.error?.message) {
        throw new Error(errData.error.message);
      }
    }
  } catch (apiErr: any) {
    if (
      apiErr.message &&
      (apiErr.message.includes('API_KEY_INVALID') ||
        apiErr.message.includes('API key not valid') ||
        apiErr.message.includes('403'))
    ) {
      throw apiErr;
    }
  }

  // Combine preferred models that exist in availableModelNames, or use fallback list
  const candidatesToTry: string[] = [];

  for (const pref of preferredPriority) {
    if (availableModelNames.includes(pref) && !candidatesToTry.includes(pref)) {
      candidatesToTry.push(pref);
    }
  }

  for (const avail of availableModelNames) {
    if (!candidatesToTry.includes(avail)) {
      candidatesToTry.push(avail);
    }
  }

  // Fallback defaults if list API didn't return
  if (candidatesToTry.length === 0) {
    candidatesToTry.push(...preferredPriority);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: any = null;

  for (const candidate of candidatesToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: candidate });
      const testRes = await model.generateContent('مرحبا');
      const text = testRes?.response?.text();
      if (text) {
        console.log(`[Gemini Auth] Successfully validated key with model: ${candidate}`);
        return candidate;
      }
    } catch (testErr: any) {
      lastError = testErr;
      if (
        testErr.message &&
        (testErr.message.includes('API_KEY_INVALID') ||
          testErr.message.includes('API key not valid') ||
          testErr.message.includes('quota') ||
          testErr.message.includes('RESOURCE_EXHAUSTED'))
      ) {
        throw testErr;
      }
      // If 404 on this model, continue to next candidate
    }
  }

  throw (
    lastError ||
    new Error('Aucun modèle Gemini compatible generateContent trouvé pour cette clé API.')
  );
}

export async function GET() {
  let savedKey = process.env.GEMINI_API_KEY || '';
  if (savedKey === 'votre_cle_gemini_ici') savedKey = '';
  let modelName = 'gemini-1.5-flash';

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (data.apiKey) savedKey = data.apiKey;
      if (data.model) modelName = data.model;
    }
  } catch (e) {}

  const isConfigured = Boolean(savedKey && savedKey.length > 15);
  const maskedKey = isConfigured ? `${savedKey.slice(0, 7)}...${savedKey.slice(-4)}` : '';

  return NextResponse.json({
    success: true,
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
          error: `Échec de validation de la clé Gemini: ${err.message || 'Clé non valide'}`,
        },
        { status: 400 }
      );
    }

    // 2. Save key & working model to ai_config.json
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

    // 3. Update in-memory environment variables
    process.env.GEMINI_API_KEY = cleanKey;
    process.env.GEMINI_MODEL_NAME = workingModel;

    return NextResponse.json({
      success: true,
      message: `Clé API Gemini validée avec succès ! Le bot utilise le modèle [${workingModel}] en direct.`,
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
