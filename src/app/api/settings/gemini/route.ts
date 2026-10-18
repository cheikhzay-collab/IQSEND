import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.join(process.cwd(), 'ai_config.json');

export async function GET() {
  let savedKey = process.env.GEMINI_API_KEY || '';
  if (savedKey === 'votre_cle_gemini_ici') savedKey = '';

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (data.apiKey) savedKey = data.apiKey;
    }
  } catch (e) {}

  const isConfigured = Boolean(savedKey && savedKey.length > 15);
  const maskedKey = isConfigured ? `${savedKey.slice(0, 7)}...${savedKey.slice(-4)}` : '';

  return NextResponse.json({
    success: true,
    isConfigured,
    maskedKey,
    model: 'gemini-1.5-flash',
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

    // Test the API key with a fast ping to Gemini
    try {
      const genAI = new GoogleGenerativeAI(cleanKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const testRes = await model.generateContent('مرحبا');
      const text = testRes.response.text();
      if (!text) {
        throw new Error('Réponse vide du modèle');
      }
    } catch (testErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: `Échec de validation de la clé Gemini: ${testErr.message || 'Clé invalide ou quota dépassé'}`,
        },
        { status: 400 }
      );
    }

    // Save key to ai_config.json
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify(
        {
          apiKey: cleanKey,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );

    // Also update process.env in running memory
    process.env.GEMINI_API_KEY = cleanKey;

    return NextResponse.json({
      success: true,
      message: 'Clé API Gemini validée et activée avec succès ! Le bot utilise désormais le modèle LLM en direct.',
      maskedKey: `${cleanKey.slice(0, 7)}...${cleanKey.slice(-4)}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}
