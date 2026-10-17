import { NextRequest, NextResponse } from 'next/server';
import { senditService } from '@/lib/sendit-service';

/**
 * POST /api/logistics/sendit/labels
 *
 * يولّد رابط PDF لطباعة الوصول (Waybill Labels) لقائمة من الكوليات
 *
 * Body: { "codes": ["DHF420101C", "DHF420102C"] }
 *
 * مرجع: POST https://app.sendit.ma/api/v1/deliveries/getlabels
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { codes } = body;

    if (!Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { error: 'Paramètre "codes" requis — tableau de codes de suivi' },
        { status: 400 }
      );
    }

    const pdfUrl = await senditService.getLabels(codes);

    return NextResponse.json({
      success: true,
      codesCount: codes.length,
      pdfUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erreur génération étiquettes Sendit', details: err.message },
      { status: 500 }
    );
  }
}
