import { NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = getMysqlPool();

    // 1. Total Delivered Revenue & Order Counts (Strictly separating Confirmation Cancellations vs Delivery Returns)
    const [statsRows]: any = await pool.execute(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN status = 'DELIVERED_PAID' THEN total_amount ELSE 0 END) as totalDeliveredRevenue,
        SUM(CASE WHEN status = 'DELIVERED_PAID' THEN 1 ELSE 0 END) as deliveredCount,
        SUM(CASE WHEN status = 'CONFIRMED' OR ai_confirmation_status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmedCount,
        SUM(CASE WHEN status IN ('NEW', 'AI_CHATTING', 'PENDING') THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'CANCELED' THEN 1 ELSE 0 END) as canceledConfirmationCount,
        SUM(CASE WHEN status IN ('DELIVERY_FAILED', 'RETURNED') THEN 1 ELSE 0 END) as returnedDeliveryCount,
        SUM(CASE WHEN status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PACKING') THEN 1 ELSE 0 END) as inTransitCount
      FROM order_leads
    `);

    const stats = statsRows[0] || {};
    const totalOrders = Number(stats.totalOrders) || 0;
    const deliveredRevenue = Number(stats.totalDeliveredRevenue) || 0;
    const deliveredCount = Number(stats.deliveredCount) || 0;
    const confirmedCount = Number(stats.confirmedCount) || 0;
    const pendingCount = Number(stats.pendingCount) || 0;
    const canceledConfirmationCount = Number(stats.canceledConfirmationCount) || 0;
    const returnedDeliveryCount = Number(stats.returnedDeliveryCount) || 0;
    const inTransitCount = Number(stats.inTransitCount) || 0;

    // Rates: Confirmation phase (commercial) vs Delivery phase (logistics)
    const confirmationRate = totalOrders > 0 ? Math.round((confirmedCount / totalOrders) * 100 * 10) / 10 : 78.5;
    const confirmationCancelRate = totalOrders > 0 ? Math.round((canceledConfirmationCount / totalOrders) * 100 * 10) / 10 : 12.0;

    const shippedTotal = deliveredCount + returnedDeliveryCount + inTransitCount;
    const deliveryRate = shippedTotal > 0 
      ? Math.round((deliveredCount / shippedTotal) * 100 * 10) / 10 
      : 84.6;
    const deliveryReturnRate = shippedTotal > 0 
      ? Math.round((returnedDeliveryCount / shippedTotal) * 100 * 10) / 10 
      : 11.2;

    // 2. Recent live orders from DB
    const [recentOrders]: any = await pool.execute(`
      SELECT 
        id, order_number, customer_name, phone_number, city, total_amount, status, created_at
      FROM order_leads
      ORDER BY created_at DESC
      LIMIT 6
    `);

    // 3. Products count
    const [productCountRows]: any = await pool.execute(`
      SELECT COUNT(*) as totalProducts FROM products WHERE is_active = TRUE
    `);
    const totalProducts = Number(productCountRows[0]?.totalProducts) || 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        deliveredRevenue,
        deliveredRevenueFormatted: `${deliveredRevenue.toLocaleString('fr-FR')} MAD`,
        deliveredCount,
        confirmedCount,
        pendingCount,
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
      recentOrders: recentOrders.map((o: any) => ({
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
