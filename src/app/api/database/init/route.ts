import { NextResponse } from 'next/server';
import { initializeDatabase, getDatabaseStatus } from '@/lib/db-schema-init';

export const dynamic = 'force-dynamic';

/**
 * GET /api/database/init
 * Check live connection status to Hostinger MySQL, listing tables and row counts.
 */
export async function GET() {
  try {
    const status = await getDatabaseStatus();
    return NextResponse.json({
      success: status.connected,
      ...status,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Erreur de connexion à la base de données Hostinger',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/database/init
 * Execute table creation (DDL) and initial seed data on Hostinger MySQL.
 */
export async function POST(req: Request) {
  try {
    let forceReset = false;
    try {
      const body = await req.json();
      forceReset = !!body?.reset || !!body?.force;
    } catch {
      // no body
    }

    console.log(`[Hostinger DB] Initializing MySQL schema and seed data (forceReset=${forceReset})...`);
    const result = await initializeDatabase(forceReset);
    const updatedStatus = await getDatabaseStatus();

    return NextResponse.json({
      success: result.success,
      message: 'Base de données Hostinger initialisée avec succès avec toutes les tables COD!',
      details: result,
      status: updatedStatus,
    });
  } catch (err: any) {
    console.error('[Hostinger DB] Initialization failed:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Échec de l initialisation de la base de données',
      },
      { status: 500 }
    );
  }
}
