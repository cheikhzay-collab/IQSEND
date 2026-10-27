import { NextResponse } from 'next/server';
import { wipeDatabase, getWipeSummary, getDatabaseStatus, WipeTarget } from '@/lib/db-schema-init';

export const dynamic = 'force-dynamic';

/**
 * GET /api/database/wipe
 * Returns row counts for critical tables to preview before wiping.
 */
export async function GET() {
  try {
    const summary = await getWipeSummary();
    const dbStatus = await getDatabaseStatus();

    return NextResponse.json({
      ...summary,
      dbStatus,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Erreur lors de la récupération du résumé de la base de données',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/database/wipe
 * Safely executes database wiping according to target.
 *
 * Body:
 * {
 *   "target": "OPERATIONAL" | "FULL" | "CATALOG",
 *   "confirmation": "DELETE" | "CONFIRM" | "مسح" | boolean
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const target: WipeTarget = body?.target === 'FULL' || body?.target === 'CATALOG' ? body.target : 'OPERATIONAL';
    const confirmation = String(body?.confirmation || '').trim().toUpperCase();

    // Check safety confirmation (accepts DELETE, CONFIRM, مسح, or explicit boolean true)
    const isValidConfirmation =
      confirmation === 'DELETE' ||
      confirmation === 'CONFIRM' ||
      confirmation === 'مسح' ||
      confirmation === 'YES' ||
      body?.confirmation === true;

    if (!isValidConfirmation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Veuillez confirmer l opération en tapant "مسح" ou "DELETE".',
        },
        { status: 400 }
      );
    }

    console.log(`[Hostinger DB Wipe] Starting wipe action with target: ${target}`);
    const result = await wipeDatabase(target);
    const updatedStatus = await getDatabaseStatus();

    let message = '✅ تم تفريغ قاعدة البيانات ومسح البيانات بنجاح.';
    if (target === 'OPERATIONAL') {
      message = '✅ تم مسح جميع الطلبات، العملاء، الشحنات، والمحادثات بنجاح. تم الحفاظ على المنتجات والمستخدمين والإعدادات.';
    } else if (target === 'FULL') {
      message = '✅ تم مسح قاعدة البيانات بالكامل وإعادة ضبط المصنع بنجاح. تم إنشاء حساب المدير والإعدادات الافتراضية.';
    } else if (target === 'CATALOG') {
      message = '✅ تم مسح كتالوج المنتجات وتفرعاتها وحركات المخزون بنجاح.';
    }

    return NextResponse.json({
      success: true,
      message,
      result,
      updatedStatus,
    });
  } catch (err: any) {
    console.error('[Hostinger DB Wipe] Error wiping database:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Échec de la suppression des données de la base',
      },
      { status: 500 }
    );
  }
}
