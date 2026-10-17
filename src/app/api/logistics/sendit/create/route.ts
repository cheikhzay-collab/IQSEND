import { NextRequest, NextResponse } from 'next/server';
import { senditService } from '@/lib/sendit-service';

/**
 * POST /api/logistics/sendit/create
 *
 * ينقل طلباً من مرحلة PACKING إلى Sendit.ma لإنشاء كولي فعلي.
 *
 * الحقول المطلوبة تطابق 100% Swagger الرسمي لـ POST /deliveries:
 *   - district_id  : معرّف المدينة (من GET /districts)
 *   - name         : اسم العميل
 *   - phone        : هاتف العميل
 *   - address      : عنوان التسليم
 *   - amount       : المبلغ نقداً (COD بالدرهم)
 *
 * مرجع: https://app.sendit.ma/api/documentation → POST /deliveries
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      // ── حقول Sendit الرسمية ─────────────────────────────────────────
      district_id,   // number  — معرّف المدينة/District
      name,          // string  — اسم العميل المستلم
      phone,         // string  — هاتف العميل
      address,       // string  — العنوان الكامل
      amount,        // number  — المبلغ نقداً (COD)
      comment,       // string? — ملاحظة للمندوب
      reference,     // string? — مرجع الطلب الداخلي
      allow_open,    // 0|1?   — السماح بفتح الكولي
      allow_try,     // 0|1?   — السماح بتجريب المنتج
      products,      // string? — وصف المنتجات
      // ── للتسجيل الداخلي فقط (لا يُرسل إلى Sendit) ─────────────────
      internalOrderId,
    } = body;

    // ── Validation ─────────────────────────────────────────────────────
    if (!district_id || !name || !phone || !address) {
      return NextResponse.json(
        {
          error: 'Champs obligatoires manquants: district_id, name, phone, address sont requis',
          required: ['district_id', 'name', 'phone', 'address'],
        },
        { status: 400 }
      );
    }

    // ── Envoi à Sendit.ma ──────────────────────────────────────────────
    const parcelResponse = await senditService.createParcel({
      district_id: Number(district_id),
      name,
      phone,
      address,
      amount: Number(amount) || 0,
      comment,
      reference: reference || internalOrderId,
      allow_open: allow_open ?? 1,
      allow_try:  allow_try ?? 1,
      products,
    });

    if (!parcelResponse.success) {
      return NextResponse.json(
        { error: parcelResponse.errorMessage || 'Échec de création du colis Sendit' },
        { status: 502 }
      );
    }

    // ── Mise à jour DB (Prisma) ─────────────────────────────────────────
    // À activer avec Prisma + DATABASE_URL configuré:
    //
    // await prisma.shipmentDetail.create({
    //   data: {
    //     orderId: internalOrderId,
    //     senditTrackingNumber: parcelResponse.trackingCode,
    //     waybillUrl: parcelResponse.waybillPdfUrl,
    //     status: 'READY_FOR_PICKUP',
    //     carrier: 'Sendit.ma',
    //     createdAt: new Date(),
    //     lastStatusUpdateAt: new Date(),
    //   },
    // });

    console.log(
      `[Sendit] ✅ Colis créé: ${parcelResponse.trackingCode} pour commande ${internalOrderId || reference}`
    );

    return NextResponse.json({
      success: true,
      shipmentStatus: 'READY_FOR_PICKUP',
      trackingCode: parcelResponse.trackingCode,
      waybillUrl:   parcelResponse.waybillPdfUrl,
      carrier:      'Sendit.ma',
    });
  } catch (err: any) {
    console.error('[Sendit Create] Erreur:', err.message);
    return NextResponse.json(
      { error: 'Erreur interne lors de la création Sendit', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/logistics/sendit/create?code=DHF420101C
 * Récupère le statut actuel d'un colis par son code de suivi
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Paramètre "code" requis' }, { status: 400 });
  }

  try {
    const result = await senditService.getParcelStatus(code);
    return NextResponse.json({ success: true, code, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erreur lors du suivi Sendit', details: err.message },
      { status: 500 }
    );
  }
}
