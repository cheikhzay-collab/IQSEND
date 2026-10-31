import { NextRequest, NextResponse } from 'next/server';
import { senditService } from '@/lib/sendit-service';
import { getMysqlPool } from '@/lib/db';
import { deductStockForOrder, invalidateOrdersCache, addTimelineEventToDb } from '@/lib/db-service';
import { realtimeHub } from '@/lib/realtime-events';
import { updateOrderTracking, updateOrderStatus } from '@/lib/orders-store';

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

    let {
      // ── حقول Sendit الرسمية ─────────────────────────────────────────
      district_id,   // number  — معرّف المدينة/District
      name,          // string  — اسم العميل المستلم
      phone,         // string  — هاتف العميل
      address,       // string  — العنوان الكامل
      amount,        // number  — المبلغ نقداً (COD)
      city,          // string? — اسم المدينة للتعرف الذكي التلقائي
      comment,       // string? — ملاحظة للمندوب
      reference,     // string? — مرجع الطلب الداخلي
      allow_open,    // 0|1?   — السماح بفتح الكولي
      allow_try,     // 0|1?   — السماح بتجريب المنتج
      products,      // string? — وصف المنتجات
      // ── للتسجيل الداخلي فقط (لا يُرسل إلى Sendit) ─────────────────
      internalOrderId,
      orderId,
    } = body;

    const targetOrderId = internalOrderId || orderId || reference;

    // ── Prefill from MySQL DB if orderId provided and fields missing ──────────
    if (targetOrderId) {
      try {
        const pool = getMysqlPool();
        const [rows]: any = await pool.execute(
          `SELECT id, order_number, customer_name, phone_number, city, address, total_amount 
           FROM order_leads WHERE id = ? OR order_number = ? LIMIT 1`,
          [targetOrderId, targetOrderId]
        );
        if (Array.isArray(rows) && rows.length > 0) {
          const ord = rows[0];
          if (!name) name = ord.customer_name;
          if (!phone) phone = ord.phone_number;
          if (!address) address = ord.address;
          if (amount === undefined || amount === null) amount = ord.total_amount;
          if (!city) city = ord.city;
          if (!reference) reference = ord.order_number || ord.id;
        }
      } catch (dbErr: any) {
        console.warn('[Sendit Create] DB prefill warning:', dbErr.message);
      }
    }

    // ── Smart Moroccan City Resolution if district_id not provided ─────
    let finalDistrictId = district_id ? Number(district_id) : 0;
    if (!finalDistrictId && (city || address)) {
      const resolved = senditService.resolveDistrict(city || address);
      if (resolved) finalDistrictId = resolved.id;
    }

    // ── Validation ─────────────────────────────────────────────────────
    if (!finalDistrictId || !name || !phone || !address) {
      return NextResponse.json(
        {
          error: 'Champs obligatoires manquants: ville (district_id), nom, téléphone et adresse sont requis',
          required: ['district_id', 'name', 'phone', 'address'],
        },
        { status: 400 }
      );
    }

    // ── Idempotency Check: Prevent duplicate AWB creation ─────────────
    if (targetOrderId) {
      try {
        const pool = getMysqlPool();
        const [existing]: any = await pool.execute(
          `SELECT s.sendit_tracking_number, s.waybill_url 
           FROM shipment_details s 
           LEFT JOIN order_leads l ON l.id = s.order_id 
           WHERE s.order_id = ? OR l.order_number = ? LIMIT 1`,
          [targetOrderId, targetOrderId]
        );
        if (Array.isArray(existing) && existing.length > 0 && existing[0].sendit_tracking_number) {
          return NextResponse.json({
            success: true,
            trackingCode: existing[0].sendit_tracking_number,
            waybillPdfUrl: existing[0].waybill_url || `https://sendit.ma/awb/${existing[0].sendit_tracking_number}.pdf`,
            alreadyExisted: true,
            message: 'Bordereau AWB déjà existant pour cette commande (Idempotence)',
          });
        }
      } catch (e: any) {
        console.warn('[Sendit Create] Idempotency check warning:', e.message);
      }
    }

    // ── Envoi réel à Sendit.ma API ─────────────────────────────────────
    const parcelResponse = await senditService.createParcel({
      district_id: finalDistrictId,
      name,
      phone,
      address,
      amount: Number(amount) || 0,
      comment,
      reference: reference || targetOrderId,
      allow_open: allow_open ?? 1,
      allow_try:  allow_try ?? 1,
      products,
    });

    if (!parcelResponse.success) {
      return NextResponse.json(
        { error: parcelResponse.errorMessage || 'Échec de création du colis sur Sendit.ma' },
        { status: 502 }
      );
    }

    // ── Mise à jour DB (Hostinger MySQL) ──────────────────────────────
    if (targetOrderId) {
      try {
        const pool = getMysqlPool();
        // 1. Locate order by ID or order_number
        const [ordRows]: any = await pool.execute(
          `SELECT id, order_number FROM order_leads WHERE id = ? OR order_number = ? LIMIT 1`,
          [targetOrderId, targetOrderId]
        );
        const resolvedOrderId = Array.isArray(ordRows) && ordRows.length > 0 ? ordRows[0].id : targetOrderId;

        // 2. Update order_leads to READY_FOR_PICKUP (AWB generated, awaiting courier pickup)
        await pool.execute(
          `UPDATE order_leads SET status = 'READY_FOR_PICKUP', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [resolvedOrderId]
        );

        // 3. Upsert shipment_details
        await pool.execute(
          `INSERT INTO shipment_details 
            (id, order_id, carrier, sendit_tracking_number, waybill_url, status, last_status_update_at, created_at, updated_at)
           VALUES (?, ?, 'Sendit.ma Express', ?, ?, 'READY_FOR_PICKUP', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE
             carrier = 'Sendit.ma Express',
             sendit_tracking_number = VALUES(sendit_tracking_number),
             waybill_url = COALESCE(VALUES(waybill_url), waybill_url),
             status = 'READY_FOR_PICKUP',
             last_status_update_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP`,
          [`ship-${resolvedOrderId}`, resolvedOrderId, parcelResponse.trackingCode, parcelResponse.waybillPdfUrl || null]
        );

        // 4. Update packing_tasks to PACKED (Ready for courier manifest)
        await pool.execute(
          `UPDATE packing_tasks SET status = 'PACKED', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`,
          [resolvedOrderId]
        );

        // 5. In-memory sync & stock deduction
        updateOrderTracking(resolvedOrderId, parcelResponse.trackingCode, 'Sendit.ma Express');
        updateOrderStatus(resolvedOrderId, 'PACKING');
        await deductStockForOrder(resolvedOrderId, `Bordereau Sendit AWB (${parcelResponse.trackingCode})`);
        invalidateOrdersCache();

        // 6. Add timeline event
        await addTimelineEventToDb({
          orderId: resolvedOrderId,
          action: 'SENDIT_PARCEL_CREATED',
          title: '2. Bordereau AWB généré (Prêt pour ramassage)',
          details: `Code Sendit: ${parcelResponse.trackingCode}. Stock déduit. En attente du passage du chauffeur Sendit.`,
          actor: 'SENDIT',
        });

        // 7. Realtime broadcast
        realtimeHub.broadcast({
          eventType: 'SHIPMENT_STATUS_UPDATED',
          entityType: 'PARCEL',
          entityId: parcelResponse.trackingCode,
          title: `Colis Sendit généré: ${parcelResponse.trackingCode}`,
          payload: {
            orderId: resolvedOrderId,
            trackingCode: parcelResponse.trackingCode,
            waybillUrl: parcelResponse.waybillPdfUrl,
            status: 'READY_FOR_PICKUP',
          },
          source: 'SENDIT_LOGISTICS_API',
        }).catch(() => {});
      } catch (dbErr: any) {
        console.warn('[Sendit Create] MySQL persistence warning:', dbErr.message);
      }
    }

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
