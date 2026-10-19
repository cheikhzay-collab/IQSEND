import { NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { cleanMoroccanPhone } from '@/lib/orders-store';

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

    const [rows]: any = await pool.execute(`
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
      ORDER BY lastOrderDate DESC
    `);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({
        success: true,
        source: 'empty',
        customers: [],
        total: 0,
      });
    }

    const customers: CustomerItem[] = rows.map((r: any, idx: number) => {
      const totalOrders = Number(r.totalOrders) || 1;
      const deliveredOrders = Number(r.deliveredOrders) || 0;
      const refusedOrders = Number(r.refusedOrders) || 0;
      const totalSpent = Number(r.totalSpent) || 0;

      // Calculate score
      let reliabilityScore: CustomerItem['reliabilityScore'] = 'NOUVEAU';
      if (refusedOrders >= 2 && deliveredOrders === 0) {
        reliabilityScore = 'BLACKLIST';
      } else if (refusedOrders > deliveredOrders) {
        reliabilityScore = 'RISQUE';
      } else if (totalOrders >= 3 && deliveredOrders >= 2) {
        reliabilityScore = 'VIP';
      } else if (deliveredOrders >= 1) {
        reliabilityScore = 'FIABLE';
      }

      // Format date
      let lastOrderDate = 'Récemment';
      if (r.lastOrderDate) {
        const d = new Date(r.lastOrderDate);
        lastOrderDate = d.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }

      const noteText = r.notes || (deliveredOrders > 0 ? 'Client livré avec succès via Sendit Express' : 'Nouveau client enregistré');

      return {
        id: `cust-${idx + 1}-${r.phone.replace(/\D/g, '').slice(-4)}`,
        name: r.name || 'Client',
        phone: r.phone,
        city: r.city || 'Maroc',
        address: r.address || 'Adresse non renseignée',
        totalOrders,
        deliveredOrders,
        refusedOrders,
        totalSpent,
        lastOrderDate,
        reliabilityScore,
        notes: noteText,
      };
    });

    return NextResponse.json({
      success: true,
      source: 'database',
      customers,
      total: customers.length,
      stats: {
        totalCustomers: customers.length,
        vipCount: customers.filter(c => c.reliabilityScore === 'VIP' || c.reliabilityScore === 'FIABLE').length,
        blacklistCount: customers.filter(c => c.reliabilityScore === 'BLACKLIST' || c.reliabilityScore === 'RISQUE').length,
        totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0),
      }
    });
  } catch (error: any) {
    console.warn('[API Customers GET] DB error, using unified store fallback:', error.message);
    const { getInboundOrders } = await import('@/lib/orders-store');
    const inbound = getInboundOrders();

    const customerMap = new Map<string, CustomerItem>();
    inbound.forEach((o, idx) => {
      const phone = o.customer.phone;
      if (!customerMap.has(phone)) {
        customerMap.set(phone, {
          id: `cust-${idx + 1}`,
          name: o.customer.name,
          phone,
          city: o.customer.city,
          address: o.customer.address,
          totalOrders: 1,
          deliveredOrders: o.stage === 'DELIVERED' ? 1 : 0,
          refusedOrders: o.stage === 'CANCELLED' ? 1 : 0,
          totalSpent: o.stage === 'DELIVERED' ? o.payment.amount : 0,
          lastOrderDate: 'Récemment',
          reliabilityScore: o.stage === 'DELIVERED' ? 'FIABLE' : o.stage === 'CANCELLED' ? 'RISQUE' : 'NOUVEAU',
          notes: o.customer.notes || 'Client enregistré via le système unifié',
        });
      } else {
        const existing = customerMap.get(phone)!;
        existing.totalOrders += 1;
        if (o.stage === 'DELIVERED') {
          existing.deliveredOrders += 1;
          existing.totalSpent += o.payment.amount;
          existing.reliabilityScore = existing.deliveredOrders >= 2 ? 'VIP' : 'FIABLE';
        } else if (o.stage === 'CANCELLED') {
          existing.refusedOrders += 1;
        }
      }
    });

    const fallbackCustomers = Array.from(customerMap.values());

    return NextResponse.json({
      success: true,
      source: 'memory_fallback',
      customers: fallbackCustomers,
      total: fallbackCustomers.length,
      stats: {
        totalCustomers: fallbackCustomers.length,
        vipCount: fallbackCustomers.filter((c) => c.reliabilityScore === 'VIP' || c.reliabilityScore === 'FIABLE').length,
        blacklistCount: fallbackCustomers.filter((c) => c.reliabilityScore === 'BLACKLIST' || c.reliabilityScore === 'RISQUE').length,
        totalRevenue: fallbackCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
      },
    });
  }
}
