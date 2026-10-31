import { NextRequest, NextResponse } from 'next/server';
import { executePhysicalReturnReceipt } from '@/lib/order-state-machine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, inspectorName, notes } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId requis' },
        { status: 400 }
      );
    }

    const result = await executePhysicalReturnReceipt(
      orderId,
      inspectorName || 'Magasinier Entrepôt',
      notes || 'Colis inspecté physiquement au stock, article réintégré'
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Colis retourné inspecté physiquement et article réintégré dans le stock avec succès',
    });
  } catch (error: any) {
    console.error('[API Return Receive] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la réintégration' },
      { status: 500 }
    );
  }
}
