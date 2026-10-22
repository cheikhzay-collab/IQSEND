import { NextResponse } from 'next/server';
import { getLeadsFromDb } from '@/lib/db-service';
import { getMysqlPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const leads = await getLeadsFromDb();
    if (Array.isArray(leads)) {
      return NextResponse.json({
        success: true,
        source: 'database',
        count: leads.length,
        leads,
      });
    }

    // Fallback to in-memory store
    const { getInboundOrders } = await import('@/lib/orders-store');
    const inbound = getInboundOrders();
    const fallbackLeads = inbound.map((o) => {
      let aiStageText = 'Nouveau lead prêt pour déclenchement IA immédiat';
      if (o.stage === 'CONFIRMED') aiStageText = 'Confirmé par Sarah (Agent IA) - Prêt pour packing';
      else if (o.stage === 'PACKING') aiStageText = 'En packing Sendit';
      else if (o.stage === 'IN_TRANSIT') aiStageText = 'En cours de livraison Sendit';
      else if (o.stage === 'DELIVERED') aiStageText = 'Livré & Encaissé';
      else if (o.stage === 'CANCELLED') aiStageText = 'Annulé par le client';

      return {
        id: o.id,
        orderNumber: o.orderNumber.startsWith('#') ? o.orderNumber : `#${o.orderNumber}`,
        customerName: o.customer.name,
        phone: o.customer.phone,
        city: o.customer.city,
        address: o.customer.address,
        amount: o.payment.amount,
        product: o.items[0]?.name || 'خف جلد',
        productImage: o.items[0]?.thumbnail || 'https://qonfor.shop/wp-content/uploads/2026/10/Copie-de-Copie-de-Copie-de-%D8%A8%D8%AF%D9%88%D9%86-%D9%85%D9%88%D8%B3E%D9%8A%D9%82%D9%89-%D8%A8%D8%AA%D8%A7%D9%86%D8%A7%D9%8B-1.jpg.webp',
        quantity: o.items[0]?.quantity || 1,
        customerNote: o.customer.notes,
        status: o.stage === 'CONFIRMED' ? 'CONFIRMED' : o.stage === 'PACKING' ? 'PACKING' : o.stage === 'CANCELLED' ? 'CANCELED' : 'NEW',
        aiStageText,
        timeAgo: 'Récemment',
        isUpsold: false,
        upsellAmount: 0,
        gpsReceived: Boolean(o.gpsLocationUrl),
        riskScore: o.aiVerification?.riskScore || 5,
      };
    });

    return NextResponse.json({
      success: true,
      source: 'memory_fallback',
      count: fallbackLeads.length,
      leads: fallbackLeads,
    });
  } catch (err: any) {
    console.warn('[API Leads GET] DB error, using fallback:', err.message);
    const { getInboundOrders } = await import('@/lib/orders-store');
    const inbound = getInboundOrders();
    const fallbackLeads = inbound.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber.startsWith('#') ? o.orderNumber : `#${o.orderNumber}`,
      customerName: o.customer.name,
      phone: o.customer.phone,
      city: o.customer.city,
      address: o.customer.address,
      amount: o.payment.amount,
      product: o.items[0]?.name || 'خف جلد',
      productImage: o.items[0]?.thumbnail || 'https://qonfor.shop/wp-content/uploads/2026/10/Copie-de-Copie-de-Copie-de-%D8%A8%D8%AF%D9%88%D9%86-%D9%85%D9%88%D8%B3E%D9%8A%D9%82%D9%89-%D8%A8%D8%AA%D8%A7%D9%86%D8%A7%D9%8B-1.jpg.webp',
      quantity: o.items[0]?.quantity || 1,
      customerNote: o.customer.notes,
      status: o.stage === 'CONFIRMED' ? 'CONFIRMED' : o.stage === 'PACKING' ? 'PACKING' : o.stage === 'CANCELLED' ? 'CANCELED' : 'NEW',
      aiStageText: 'Prêt pour qualification IA',
      timeAgo: 'Récemment',
      isUpsold: false,
      upsellAmount: 0,
      gpsReceived: false,
      riskScore: 10,
    }));

    return NextResponse.json({
      success: true,
      source: 'memory_fallback',
      count: fallbackLeads.length,
      leads: fallbackLeads,
    });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { leadId, status, notes } = body;

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
    }

    if (status) {
      const { updateOrderStatus } = await import('@/lib/orders-store');
      updateOrderStatus(leadId, status);
    }

    const pool = getMysqlPool();
    await pool.execute(
      `
      UPDATE order_leads
      SET 
        status = IFNULL(?, status),
        notes = IFNULL(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR order_number = ?
    `,
      [status || null, notes || null, leadId, leadId]
    );

    return NextResponse.json({
      success: true,
      message: `Lead ${leadId} updated successfully`,
    });
  } catch (err: any) {
    console.error('[API Leads PATCH] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
