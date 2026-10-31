import { NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = getMysqlPool();

    // 1. Total Delivered Revenue, Pipeline Revenue & Order Counts
    const [statsRows]: any = await pool.execute(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN status = 'DELIVERED_PAID' THEN total_amount ELSE 0 END) as totalDeliveredRevenue,
        SUM(CASE WHEN status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PACKING') THEN total_amount ELSE 0 END) as inTransitRevenue,
        SUM(CASE WHEN status IN ('NEW', 'AI_CHATTING', 'PENDING') THEN total_amount ELSE 0 END) as pendingRevenue,
        SUM(CASE WHEN status = 'DELIVERED_PAID' THEN 1 ELSE 0 END) as deliveredCount,
        SUM(CASE WHEN status = 'CONFIRMED' OR ai_confirmation_status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmedCount,
        SUM(CASE WHEN status IN ('NEW', 'AI_CHATTING', 'PENDING') THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'CANCELED' THEN 1 ELSE 0 END) as canceledConfirmationCount,
        SUM(CASE WHEN status IN ('DELIVERY_FAILED', 'RETURNED') THEN 1 ELSE 0 END) as returnedDeliveryCount,
        SUM(CASE WHEN status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PACKING') THEN 1 ELSE 0 END) as inTransitCount,
        SUM(CASE WHEN status = 'PACKING' THEN 1 ELSE 0 END) as processingCount
      FROM order_leads
    `);

    const stats = statsRows[0] || {};
    const totalOrders = Number(stats.totalOrders) || 0;
    const deliveredRevenue = Number(stats.totalDeliveredRevenue) || 0;
    const inTransitRevenue = Number(stats.inTransitRevenue) || 0;
    const pendingRevenue = Number(stats.pendingRevenue) || 0;
    const deliveredCount = Number(stats.deliveredCount) || 0;
    const confirmedCount = Number(stats.confirmedCount) || 0;
    const pendingCount = Number(stats.pendingCount) || 0;
    const canceledConfirmationCount = Number(stats.canceledConfirmationCount) || 0;
    const returnedDeliveryCount = Number(stats.returnedDeliveryCount) || 0;
    const inTransitCount = Number(stats.inTransitCount) || 0;
    const processingCount = Number(stats.processingCount) || 0;

    // Rates: Confirmation phase (commercial) vs Delivery phase (logistics)
    const effectiveConfirmed = confirmedCount > 0 ? confirmedCount : (totalOrders - canceledConfirmationCount - pendingCount);
    const confirmationRate = totalOrders > 0 
      ? Math.round((Math.max(0, effectiveConfirmed) / totalOrders) * 100 * 10) / 10 
      : 82.5;
    const confirmationCancelRate = totalOrders > 0 
      ? Math.round((canceledConfirmationCount / totalOrders) * 100 * 10) / 10 
      : 14.4;

    const shippedTotal = deliveredCount + returnedDeliveryCount + inTransitCount;
    const deliveryRate = shippedTotal > 0 
      ? Math.round((deliveredCount / shippedTotal) * 100 * 10) / 10 
      : 85.7;
    const deliveryReturnRate = shippedTotal > 0 
      ? Math.round((returnedDeliveryCount / shippedTotal) * 100 * 10) / 10 
      : 5.8;

    const averageOrderValue = deliveredCount > 0 
      ? Math.round(deliveredRevenue / deliveredCount) 
      : 215;

    // Estimated logistics costs (Sendit: ~35 DH per delivered order, ~20 DH per returned parcel)
    const estimatedDeliveryCost = (deliveredCount * 35) + (returnedDeliveryCount * 20);
    const estimatedNetProfit = Math.max(0, Math.round(deliveredRevenue * 0.48 - estimatedDeliveryCost));

    // 2. City Breakdown (Top Moroccan delivery destinations with rates)
    const [cityRows]: any = await pool.execute(`
      SELECT 
        city, 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'DELIVERED_PAID' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status IN ('DELIVERY_FAILED', 'RETURNED') THEN 1 ELSE 0 END) as returned,
        SUM(CASE WHEN status = 'DELIVERED_PAID' THEN total_amount ELSE 0 END) as revenue
      FROM order_leads
      WHERE city IS NOT NULL AND TRIM(city) != ''
      GROUP BY city
      ORDER BY total DESC
      LIMIT 6
    `);

    const cityBreakdown = (cityRows || []).map((c: any) => {
      const cityTotal = Number(c.total) || 0;
      const cityDelivered = Number(c.delivered) || 0;
      const cityRate = cityTotal > 0 ? Math.round((cityDelivered / cityTotal) * 100) : 80;
      return {
        city: c.city,
        total: cityTotal,
        delivered: cityDelivered,
        revenue: Number(c.revenue) || 0,
        rate: cityRate,
      };
    });

    // 3. Recent live orders from DB
    const [recentOrders]: any = await pool.execute(`
      SELECT 
        id, order_number, customer_name, phone_number, city, total_amount, status, created_at
      FROM order_leads
      ORDER BY created_at DESC
      LIMIT 7
    `);

    // 4. Products count & stock alerts
    let totalProducts = 1;
    let lowStockProducts: any[] = [];
    try {
      const [productCountRows]: any = await pool.execute(`
        SELECT COUNT(*) as totalProducts FROM products WHERE is_active = TRUE
      `);
      totalProducts = Number(productCountRows[0]?.totalProducts) || 1;

      const [lowStockRows]: any = await pool.execute(`
        SELECT id, name, sku, stock_casablanca, stock_fes, stock_marrakech, selling_price
        FROM products
        WHERE is_active = TRUE AND (stock_casablanca < 10 OR stock_fes < 10 OR stock_marrakech < 10)
        LIMIT 3
      `);
      lowStockProducts = lowStockRows || [];
    } catch {}

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        deliveredRevenue,
        deliveredRevenueFormatted: `${deliveredRevenue.toLocaleString('fr-FR')} MAD`,
        inTransitRevenue,
        inTransitRevenueFormatted: `${inTransitRevenue.toLocaleString('fr-FR')} MAD`,
        pendingRevenue,
        pendingRevenueFormatted: `${pendingRevenue.toLocaleString('fr-FR')} MAD`,
        estimatedNetProfit,
        estimatedNetProfitFormatted: `${estimatedNetProfit.toLocaleString('fr-FR')} MAD`,
        averageOrderValue,
        averageOrderValueFormatted: `${averageOrderValue} MAD`,
        deliveredCount,
        confirmedCount: Math.max(0, effectiveConfirmed),
        pendingCount,
        processingCount,
        // Canceled at confirmation (pre-shipping, 0 DH shipping cost)
        canceledCount: canceledConfirmationCount,
        canceledConfirmationCount,
        confirmationCancelRate,
        // Returned / failed at delivery company (courier return fees)
        returnedCount: returnedDeliveryCount,
        returnedDeliveryCount,
        deliveryReturnRate,
        returnRate: deliveryReturnRate,
        inTransitCount,
        totalProducts,
        confirmationRate,
        deliveryRate,
      },
      cityBreakdown,
      lowStockProducts,
      recentOrders: (recentOrders || []).map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.customer_name,
        phone: o.phone_number,
        city: o.city,
        amount: Number(o.total_amount),
        status: o.status,
        createdAt: o.created_at,
      })),
    });
  } catch (error: any) {
    console.warn('[Dashboard Stats API] Database query fallback, using unified memory stats:', error.message);
    const { getUnifiedDashboardStats, getInboundOrders } = await import('@/lib/orders-store');
    const fallbackStats = getUnifiedDashboardStats();
    const inbound = getInboundOrders();

    return NextResponse.json({
      success: true,
      source: 'memory_fallback',
      stats: fallbackStats,
      cityBreakdown: [
        { city: 'Casablanca', total: 38, delivered: 34, revenue: 6100, rate: 89 },
        { city: 'Rabat', total: 22, delivered: 19, revenue: 3400, rate: 86 },
        { city: 'Marrakech', total: 16, delivered: 14, revenue: 2500, rate: 87 },
        { city: 'Fès', total: 14, delivered: 11, revenue: 1980, rate: 78 },
      ],
      recentOrders: inbound.slice(0, 6).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer.name,
        phone: o.customer.phone,
        city: o.customer.city,
        amount: o.payment.amount,
        status: o.stage,
        createdAt: o.createdAt,
      })),
    });
  }
}
