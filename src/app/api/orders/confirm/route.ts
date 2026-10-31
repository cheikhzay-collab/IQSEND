import { NextRequest, NextResponse } from 'next/server';
import { executeOrderConfirmation } from '@/lib/order-state-machine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, actor } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId requis' },
        { status: 400 }
      );
    }

    const result = await executeOrderConfirmation(orderId, actor || 'Agent Commercial');

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, isDuplicate: result.isDuplicate },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Commande validée et confirmée selon les règles COD Maroc',
    });
  } catch (error: any) {
    console.error('[API Confirm] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
