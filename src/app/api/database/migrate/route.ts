import { NextResponse } from 'next/server';
import { migrateDatabaseSchema, getDatabaseStatus } from '@/lib/db-schema-init';

export const dynamic = 'force-dynamic';

/**
 * GET /api/database/migrate
 * Check migration readiness and execute schema migration if requested or needed.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const runNow = searchParams.get('run') !== 'false';

    let migrationResult = null;
    if (runNow) {
      migrationResult = await migrateDatabaseSchema();
    }

    const currentStatus = await getDatabaseStatus();

    return NextResponse.json({
      success: true,
      message: 'Base de données SENDIT synchronisée avec le dernier schéma complet!',
      migration: migrationResult,
      status: currentStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Migration Route GET Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Erreur lors de la vérification de la migration',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/database/migrate
 * Directly triggers full schema migration, non-destructively adding all new columns.
 */
export async function POST() {
  try {
    console.log('[Hostinger DB] Starting full safe schema migration...');
    const result = await migrateDatabaseSchema();
    const updatedStatus = await getDatabaseStatus();

    return NextResponse.json({
      success: result.success,
      message: `Migration exécutée avec succès (${result.successCount}/${result.totalStatements} requêtes traitées sans risque)`,
      details: result,
      status: updatedStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Migration Route POST Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Échec de la migration du schéma de base de données',
      },
      { status: 500 }
    );
  }
}
