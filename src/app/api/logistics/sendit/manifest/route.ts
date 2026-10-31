import { NextRequest, NextResponse } from 'next/server';
import { createDispatchManifest } from '@/lib/order-state-machine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderIds, driverName, driverPhone, actor } = body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Veuillez sélectionner au moins un colis' },
        { status: 400 }
      );
    }

    const result = await createDispatchManifest(
      orderIds,
      driverName || 'Chauffeur Sendit.ma',
      driverPhone || '0661009988',
      actor || 'Responsable Expéditions'
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Manifest] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la génération du manifeste' },
      { status: 500 }
    );
  }
}
