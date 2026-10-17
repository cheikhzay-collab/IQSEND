import { NextResponse } from 'next/server';
import { senditService } from '@/lib/sendit-service';

/**
 * GET /api/logistics/sendit/districts
 *
 * يجلب قائمة المدن / Districts من Sendit.ma مع أسعار التوصيل.
 * يُستخدم لملء قائمة "Ville du client" عند إنشاء كولي.
 *
 * مرجع: GET https://app.sendit.ma/api/v1/districts
 *
 * نموذج استجابة:
 * [
 *   { "id": 1, "name": "Casablanca", "price": 30 },
 *   { "id": 2, "name": "Marrakech", "price": 35 },
 *   ...
 * ]
 */
export async function GET() {
  try {
    const districts = await senditService.getDistricts();
    return NextResponse.json({
      success: true,
      count: districts.length,
      districts,
    });
  } catch (err: any) {
    console.error('[Sendit Districts] Erreur:', err.message);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des villes Sendit', details: err.message },
      { status: 500 }
    );
  }
}
