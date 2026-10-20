import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { senditService } from '@/lib/sendit-service';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.join(process.cwd(), 'sendit_config.json');

/**
 * GET /api/settings/sendit
 * جلب إعدادات الربط مع Sendit.ma
 */
export async function GET() {
  let publicKey = process.env.SENDIT_PUBLIC_KEY || '';
  let secretKey = process.env.SENDIT_SECRET_KEY || process.env.SENDIT_PRIVATE_KEY || '';
  let webhookSecret = process.env.SENDIT_WEBHOOK_SECRET || '';

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      if (data.publicKey) publicKey = data.publicKey;
      if (data.secretKey) secretKey = data.secretKey;
      if (data.webhookSecret) webhookSecret = data.webhookSecret;
    }
  } catch (err) {
    // ignore
  }

  const isConfigured = Boolean(publicKey && secretKey);

  return NextResponse.json({
    success: true,
    isConfigured,
    publicKey: publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : '',
    hasSecretKey: Boolean(secretKey),
    webhookSecret: webhookSecret || 'iqsend_webhook_secret_2025',
    apiUrl: 'https://app.sendit.ma/api/v1',
  });
}

/**
 * POST /api/settings/sendit
 * حفظ واختبار مفاتيح Sendit.ma
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { publicKey, secretKey, webhookSecret, testOnly } = body;

    const trimmedPublic = (publicKey || '').trim();
    const trimmedSecret = (secretKey || '').trim();
    const trimmedWebhook = (webhookSecret || '').trim() || 'iqsend_webhook_secret_2025';

    if (!trimmedPublic || !trimmedSecret) {
      return NextResponse.json(
        { success: false, error: 'La Clé Publique (Public Key) et la Clé Secrète (Secret Key) sont requises.' },
        { status: 400 }
      );
    }

    // تطبيق المفاتيح في الخدمة لاختبارها
    senditService.setCredentials(trimmedPublic, trimmedSecret, trimmedWebhook);

    // اختبار الاتصال مع Sendit.ma API
    const testResult = await senditService.testConnection();

    if (!testResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Échec de connexion Sendit: ${testResult.message}. Vérifiez vos clés dans votre tableau de bord Sendit.ma (Paramètres > API).`,
        },
        { status: 400 }
      );
    }

    // إذا كان مجرد اختبار
    if (testOnly) {
      return NextResponse.json({
        success: true,
        message: testResult.message,
      });
    }

    // حفظ في sendit_config.json
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify(
        {
          publicKey: trimmedPublic,
          secretKey: trimmedSecret,
          webhookSecret: trimmedWebhook,
          apiUrl: 'https://app.sendit.ma/api/v1',
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );

    // تحديث process.env
    process.env.SENDIT_PUBLIC_KEY = trimmedPublic;
    process.env.SENDIT_SECRET_KEY = trimmedSecret;
    process.env.SENDIT_WEBHOOK_SECRET = trimmedWebhook;

    return NextResponse.json({
      success: true,
      message: `✅ Connexion réussie à Sendit.ma ! ${testResult.message}`,
      isConfigured: true,
      maskedKey: `${trimmedPublic.slice(0, 6)}...${trimmedPublic.slice(-4)}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur interne lors de la sauvegarde Sendit' },
      { status: 500 }
    );
  }
}
