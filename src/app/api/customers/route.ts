import { NextRequest, NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { cleanMoroccanPhone } from '@/lib/orders-store';
import { realtimeHub } from '@/lib/realtime-events';

export const dynamic = 'force-dynamic';

export interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  totalOrders: number;
  deliveredOrders: number;
  refusedOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  reliabilityScore: 'VIP' | 'FIABLE' | 'NOUVEAU' | 'RISQUE' | 'BLACKLIST';
  notes: string;
}

export async function GET() {
  try {
    const pool = getMysqlPool();

    // 1. Fetch from customers table first
    const [custRows]: any = await pool.execute(`
      SELECT 
        id, phone_number, name, city, address, total_orders, delivered_orders, refused_orders,
        total_spent, trust_score, notes, updated_at, created_at
      FROM customers
      ORDER BY updated_at DESC
    `);

    // 2. Also aggregate stats from order_leads to make sure any incoming orders are captured
    const [leadRows]: any = await pool.execute(`
      SELECT 
        phone_number as phone,
        MAX(customer_name) as name,
        MAX(city) as city,
        MAX(address) as address,
        COUNT(*) as totalOrders,
        SUM(CASE WHEN status = 'DELIVERED_PAID' THEN 1 ELSE 0 END) as deliveredOrders,
        SUM(CASE WHEN status IN ('CANCELED', 'DELIVERY_FAILED') THEN 1 ELSE 0 END) as refusedOrders,
        SUM(CASE WHEN status = 'DELIVERED_PAID' THEN total_amount ELSE 0 END) as totalSpent,
        MAX(created_at) as lastOrderDate,
        MAX(notes) as notes
      FROM order_leads
      WHERE phone_number IS NOT NULL AND phone_number != ''
      GROUP BY phone_number
    `);

    const leadMap = new Map<string, any>();
    if (Array.isArray(leadRows)) {
      for (const r of leadRows) {
        leadMap.set(r.phone, r);
      }
    }

    // Combine or populate customers table
    const customersMap = new Map<string, CustomerItem>();

    if (Array.isArray(custRows) && custRows.length > 0) {
      for (const c of custRows) {
        const leadData = leadMap.get(c.phone_number);
        const totalOrders = Math.max(Number(c.total_orders) || 0, Number(leadData?.totalOrders) || 1);
        const deliveredOrders = Math.max(Number(c.delivered_orders) || 0, Number(leadData?.deliveredOrders) || 0);
        const refusedOrders = Math.max(Number(c.refused_orders) || 0, Number(leadData?.refusedOrders) || 0);
        const totalSpent = Math.max(Number(c.total_spent) || 0, Number(leadData?.totalSpent) || 0);

        let lastOrderDate = 'Récemment';
        if (c.updated_at || leadData?.lastOrderDate) {
          const d = new Date(c.updated_at || leadData.lastOrderDate);
          lastOrderDate = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        customersMap.set(c.phone_number, {
          id: c.id,
          name: c.name || leadData?.name || 'Client',
          phone: c.phone_number,
          city: c.city || leadData?.city || 'Maroc',
          address: c.address || leadData?.address || 'Adresse non renseignée',
          totalOrders,
          deliveredOrders,
          refusedOrders,
          totalSpent,
          lastOrderDate,
          reliabilityScore: (c.trust_score as any) || 'NOUVEAU',
          notes: c.notes || leadData?.notes || 'Client enregistré dans la base MySQL',
        });
      }
    }

    // Add any leads that are not yet in customers table
    if (Array.isArray(leadRows)) {
      for (const r of leadRows) {
        if (!customersMap.has(r.phone)) {
          const totalOrders = Number(r.totalOrders) || 1;
          const deliveredOrders = Number(r.deliveredOrders) || 0;
          const refusedOrders = Number(r.refusedOrders) || 0;
          const totalSpent = Number(r.totalSpent) || 0;

          let score: CustomerItem['reliabilityScore'] = 'NOUVEAU';
          if (refusedOrders >= 2 && deliveredOrders === 0) score = 'BLACKLIST';
          else if (refusedOrders > deliveredOrders) score = 'RISQUE';
          else if (totalOrders >= 3 && deliveredOrders >= 2) score = 'VIP';
          else if (deliveredOrders >= 1) score = 'FIABLE';

          const custId = `cust-${Date.now()}-${r.phone.replace(/\D/g, '').slice(-4)}`;
          const custItem: CustomerItem = {
            id: custId,
            name: r.name || 'Client',
            phone: r.phone,
            city: r.city || 'Maroc',
            address: r.address || 'Adresse non renseignée',
            totalOrders,
            deliveredOrders,
            refusedOrders,
            totalSpent,
            lastOrderDate: r.lastOrderDate ? new Date(r.lastOrderDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Récemment',
            reliabilityScore: score,
            notes: r.notes || 'Synchronisé depuis les commandes',
          };

          customersMap.set(r.phone, custItem);

          // Persist to customers table asynchronously
          pool.execute(
            `INSERT INTO customers (id, phone_number, name, city, address, total_orders, delivered_orders, refused_orders, total_spent, trust_score, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               total_orders = VALUES(total_orders),
               delivered_orders = VALUES(delivered_orders),
               total_spent = VALUES(total_spent),
               updated_at = CURRENT_TIMESTAMP`,
            [custId, r.phone, custItem.name, custItem.city, custItem.address, totalOrders, deliveredOrders, refusedOrders, totalSpent, score, custItem.notes]
          ).catch(() => {});
        }
      }
    }

    const customers = Array.from(customersMap.values());

    return NextResponse.json({
      success: true,
      source: 'database',
      customers,
      total: customers.length,
      stats: {
        totalCustomers: customers.length,
        vipCount: customers.filter((c) => c.reliabilityScore === 'VIP' || c.reliabilityScore === 'FIABLE').length,
        blacklistCount: customers.filter((c) => c.reliabilityScore === 'BLACKLIST' || c.reliabilityScore === 'RISQUE').length,
        totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0),
      },
    });
  } catch (error: any) {
    console.error('[API Customers GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, customers: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, city, address, trustScore, notes } = body;

    if (!phone || !name) {
      return NextResponse.json(
        { success: false, error: 'Nom et téléphone requis' },
        { status: 400 }
      );
    }

    const cleanPhone = cleanMoroccanPhone(phone) || phone;
    const pool = getMysqlPool();
    const id = body.id || `cust-${Date.now()}-${cleanPhone.slice(-4)}`;

    await pool.execute(
      `INSERT INTO customers (id, phone_number, name, city, address, trust_score, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         city = VALUES(city),
         address = VALUES(address),
         trust_score = VALUES(trust_score),
         notes = VALUES(notes),
         updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        cleanPhone,
        name.trim(),
        city || 'Maroc',
        address || 'Adresse',
        trustScore || 'NOUVEAU',
        notes || '',
      ]
    );

    realtimeHub.broadcast({
      eventType: 'CUSTOMER_UPDATED',
      entityType: 'CUSTOMER',
      entityId: cleanPhone,
      title: `Fiche client ${name} enregistrée`,
      payload: { phone: cleanPhone, name, trustScore },
      source: 'CUSTOMERS_API',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Client enregistré avec succès dans la base de données',
      customerId: id,
    });
  } catch (error: any) {
    console.error('[API Customers POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, trustScore, notes, address, city } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Numéro de téléphone requis' }, { status: 400 });
    }

    const pool = getMysqlPool();

    // 1. Update customers table
    await pool.execute(
      `UPDATE customers
       SET 
         trust_score = IFNULL(?, trust_score),
         notes = IFNULL(?, notes),
         address = IFNULL(?, address),
         city = IFNULL(?, city),
         updated_at = CURRENT_TIMESTAMP
       WHERE phone_number = ?`,
      [trustScore || null, notes || null, address || null, city || null, phone]
    );

    // 2. If blacklist or risk, also update risk_level in order_leads
    if (trustScore === 'BLACKLIST' || trustScore === 'RISQUE') {
      const riskLevel = trustScore === 'BLACKLIST' ? 'BLACK_LISTED' : 'HIGH';
      await pool.execute(
        `UPDATE order_leads
         SET risk_level = ?, updated_at = CURRENT_TIMESTAMP
         WHERE phone_number = ?`,
        [riskLevel, phone]
      );
    }

    realtimeHub.broadcast({
      eventType: 'CUSTOMER_UPDATED',
      entityType: 'CUSTOMER',
      entityId: phone,
      title: `Score de fiabilité client mis à jour (${trustScore || 'Modifié'})`,
      payload: { phone, trustScore, notes },
      source: 'CUSTOMERS_API',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Statut client mis à jour avec succès dans MySQL !',
      phone,
      trustScore,
    });
  } catch (error: any) {
    console.error('[API Customers PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
