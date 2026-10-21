import { NextRequest, NextResponse } from 'next/server';
import { senditService } from '@/lib/sendit-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tracking/sync
 * يقوم بمزامنة وجلب كافة الكوليات المسجلة في حساب Sendit.ma الرسمي وإدراجها في قاعدة البيانات (order_leads & shipment_details)
 * لكي تظهر تلقائياً في شاشة En cours de livraison — Suivi Sendit.ma
 */
export async function POST(req: NextRequest) {
  try {
    const result = await senditService.syncDeliveriesToDatabase();

    return NextResponse.json({
      success: result.success,
      syncedCount: result.syncedCount,
      totalOnSendit: result.totalOnSendit,
      message: result.message,
    });
  } catch (error: any) {
    console.error('[API /api/tracking/sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la synchronisation Sendit.ma',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tracking/sync
 * فحص حالة التزامن مع Sendit.ma وجلب إجمالي الكوليات في المنصة
 */
export async function GET() {
  try {
    const deliveries = await senditService.getDeliveries({ page: 1 });
    return NextResponse.json({
      success: deliveries.success,
      totalOnSendit: deliveries.total,
      lastPage: deliveries.last_page,
      sample: deliveries.data.slice(0, 3),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
