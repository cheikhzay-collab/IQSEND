import { NextRequest, NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime-events';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = getMysqlPool();

    // 1. Fetch delivered and in-transit financial metrics from order_leads
    const [finRows]: any = await pool.execute(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN status = 'DELIVERED_PAID' THEN total_amount ELSE 0 END) as deliveredRevenue,
        SUM(CASE WHEN status = 'DELIVERED_PAID' THEN 1 ELSE 0 END) as deliveredCount,
        SUM(CASE WHEN status = 'IN_TRANSIT' THEN total_amount ELSE 0 END) as inTransitRevenue,
        SUM(CASE WHEN status = 'IN_TRANSIT' THEN 1 ELSE 0 END) as inTransitCount
      FROM order_leads
    `);

    const stats = finRows[0] || {};
    const deliveredRevenue = Number(stats.deliveredRevenue) || 0;
    const deliveredCount = Number(stats.deliveredCount) || 0;
    const inTransitRevenue = Number(stats.inTransitRevenue) || 0;
    const inTransitCount = Number(stats.inTransitCount) || 0;

    // Delivery fee is 35 MAD per delivered shipment
    const shippingFeePerColis = 35;
    const totalFeesDeducted = deliveredCount * shippingFeePerColis;
    const netPayout = Math.max(0, deliveredRevenue - totalFeesDeducted);

    // 2. Fetch recorded settlements from finance_transactions table
    const [transRows]: any = await pool.execute(`
      SELECT 
        id, reference as ref, transaction_type, amount as netAmount, carrier, order_count as colisCount,
        status, bank_account as bankAccount, receipt_url, created_at
      FROM finance_transactions
      ORDER BY created_at DESC
    `);

    let settlements: any[] = [];

    if (Array.isArray(transRows) && transRows.length > 0) {
      settlements = transRows.map((t: any) => ({
        id: t.id,
        ref: t.ref,
        period: t.created_at ? `Relevé du ${new Date(t.created_at).toLocaleDateString('fr-FR')}` : 'Période en cours',
        colisCount: t.colisCount,
        feesDeducted: t.colisCount * 35,
        netAmount: Number(t.netAmount),
        status: t.status === 'RECONCILED' ? 'Viré sur compte ✓' : t.status === 'PROCESSED' ? 'En cours de virement' : 'En attente',
        bankAccount: t.bankAccount || 'Attijariwafa Bank (RIB: 007 780 0001234567890123 45)',
      }));
    }

    return NextResponse.json({
      success: true,
      source: 'database',
      kpis: {
        totalDeliveredCOD: deliveredRevenue,
        totalDeliveredFormatted: `${deliveredRevenue.toLocaleString('fr-FR')} MAD`,
        deliveredCount,
        shippingFees: totalFeesDeducted,
        shippingFeesFormatted: `${totalFeesDeducted.toLocaleString('fr-FR')} MAD`,
        netPayout,
        netPayoutFormatted: `${netPayout.toLocaleString('fr-FR')} MAD`,
        inTransitRevenue,
        inTransitCount,
        recoverySavings: 14600,
        recoverySavingsFormatted: '+14,600 MAD',
      },
      settlements,
    });
  } catch (error: any) {
    console.error('[API Finance GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference, amount, orderCount, carrier, bankAccount, status } = body;

    if (!reference || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Référence et montant requis' },
        { status: 400 }
      );
    }

    const pool = getMysqlPool();
    const id = body.id || `fin-${Date.now()}`;

    await pool.execute(
      `INSERT INTO finance_transactions (
        id, reference, transaction_type, amount, carrier, order_count, status, bank_account
      ) VALUES (?, ?, 'COD_REMITTANCE', ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        amount = VALUES(amount),
        order_count = VALUES(order_count),
        status = VALUES(status),
        bank_account = VALUES(bank_account)`,
      [
        id,
        reference,
        parseFloat(amount),
        carrier || 'Sendit.ma',
        parseInt(orderCount || 0, 10),
        status || 'PENDING',
        bankAccount || 'Attijariwafa Bank',
      ]
    );

    realtimeHub.broadcast({
      eventType: 'FINANCE_UPDATED',
      entityType: 'FINANCE',
      entityId: reference,
      title: `Bordereau financier ${reference} enregistré (${amount} MAD)`,
      payload: { reference, amount, status },
      source: 'FINANCE_API',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Transaction financière enregistrée avec succès dans MySQL !',
      id,
    });
  } catch (error: any) {
    console.error('[API Finance POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference, status } = body;

    if (!reference || !status) {
      return NextResponse.json({ success: false, error: 'Référence et nouveau statut requis' }, { status: 400 });
    }

    const pool = getMysqlPool();
    await pool.execute(
      `UPDATE finance_transactions SET status = ? WHERE reference = ? OR id = ?`,
      [status, reference, reference]
    );

    realtimeHub.broadcast({
      eventType: 'FINANCE_UPDATED',
      entityType: 'FINANCE',
      entityId: reference,
      title: `Bordereau ${reference} mis à jour : ${status}`,
      payload: { reference, status },
      source: 'FINANCE_API',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Statut du bordereau mis à jour vers "${status}" avec succès !`,
    });
  } catch (error: any) {
    console.error('[API Finance PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
