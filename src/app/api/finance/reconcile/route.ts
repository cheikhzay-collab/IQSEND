import { NextRequest, NextResponse } from 'next/server';
import { executeCodReconciliation } from '@/lib/order-state-machine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, virementRef, bankAccount, actor } = body;

    if (!orderId || !virementRef) {
      return NextResponse.json(
        { success: false, error: 'orderId et virementRef (Référence du virement bancaire) sont requis' },
        { status: 400 }
      );
    }

    const result = await executeCodReconciliation(
      orderId,
      virementRef,
      bankAccount || 'Compte Attijariwafa Bank / CIH',
      actor || 'Direction Financière'
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Virement bancaire Sendit réconcilié et compte soldé avec succès',
      data: result,
    });
  } catch (error: any) {
    console.error('[API Finance Reconcile] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la réconciliation' },
      { status: 500 }
    );
  }
}
