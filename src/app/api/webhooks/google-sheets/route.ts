import { NextRequest, NextResponse } from 'next/server';
import { addInboundOrder, cleanMoroccanPhone, getInboundOrders, IngestedOrder } from '@/lib/orders-store';

/**
 * Google Sheets Webhook API
 * Supports automated real-time inbound order ingestion from Google Sheets / Google Forms.
 *
 * Supported Fields (JSON or URL-encoded):
 * - name / customerName / nom / الاسم
 * - phone / phoneNumber / telephone / الهاتف
 * - city / ville / المدينة
 * - address / adresse / العنوان
 * - product / item / productName / المنتج
 * - quantity / qte / quantite / الكمية
 * - price / total / totalAmount / prix / الثمن
 * - notes / comment / ملاحظات
 */

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET() {
  const orders = getInboundOrders();
  return NextResponse.json(
    {
      success: true,
      count: orders.length,
      orders,
      webhookUrl: 'https://lawngreen-jaguar-315438.hostingersite.com/api/webhooks/google-sheets',
      targetStage: 'PENDING_CONFIRMATION',
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    let payload: Record<string, any> = {};

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = value.toString();
      });
    } else {
      // Fallback text parser (for simple Google Apps Script text post)
      const rawText = await req.text();
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = { raw: rawText };
      }
    }

    // Dynamic field mapping (Arabic, French, English)
    const name =
      payload.name ||
      payload.customerName ||
      payload.nom ||
      payload['الاسم'] ||
      payload['Nom Complet'] ||
      'عميل غير محدد';

    const rawPhone =
      payload.phone ||
      payload.phoneNumber ||
      payload.telephone ||
      payload['الهاتف'] ||
      payload['رقم الهاتف'] ||
      payload['Téléphone'] ||
      '';

    const city =
      payload.city ||
      payload.ville ||
      payload['المدينة'] ||
      payload['Ville'] ||
      'Casablanca';

    const address =
      payload.address ||
      payload.adresse ||
      payload['العنوان'] ||
      payload['Adresse'] ||
      'عنوان غير محدد';

    const productName =
      payload.product ||
      payload.item ||
      payload.productName ||
      payload['المنتج'] ||
      payload['Produit'] ||
      'Pack Moroccan COD Premium';

    const quantity = parseInt(
      payload.quantity || payload.qte || payload.quantite || payload['الكمية'] || '1',
      10
    ) || 1;

    const price = parseFloat(
      payload.price || payload.total || payload.totalAmount || payload.prix || payload['الثمن'] || '299'
    ) || 299;

    const notes =
      payload.notes ||
      payload.comment ||
      payload['ملاحظات'] ||
      payload['Notes'] ||
      'طلب وارد تلقائياً عبر مزامنة Google Sheets';

    // Validate phone number
    const cleanedPhone = cleanMoroccanPhone(rawPhone);
    if (!cleanedPhone || cleanedPhone.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: 'رقم الهاتف غير صالح أو مفقود. يرجى التأكد من إرسال رقم هاتف مغربي صحيح.',
          receivedPhone: rawPhone,
        },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Generate distinctive Order Number for Google Sheets
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = payload.orderNumber || `#GS${randomSuffix}`;
    const orderId = `ord-gs-${Date.now()}-${randomSuffix}`;

    const newOrder: IngestedOrder = {
      id: orderId,
      orderNumber,
      stage: 'PENDING_CONFIRMATION',
      createdAt: 'الآن (Google Sheet)',
      source: 'GOOGLE_SHEETS',
      customer: {
        name: String(name).trim(),
        phone: cleanedPhone,
        city: String(city).trim(),
        address: String(address).trim(),
        notes: String(notes).trim(),
      },
      items: [
        {
          id: `it-gs-${randomSuffix}`,
          name: String(productName).trim(),
          sku: `GS-${String(productName).slice(0, 3).toUpperCase()}-01`,
          thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
          quantity,
          price,
        },
      ],
      payment: {
        method: 'COD',
        amount: price * quantity,
        currency: 'MAD',
        status: 'PENDING',
      },
      aiVerification: {
        status: 'NEEDS_REVIEW',
        riskScore: 10,
        notes: 'تم استلام الطلب من Google Sheet مباشرة وجاهز للاتصال أو التأكيد عبر واتساب دارجة.',
      },
    };

    // Store in inbound queue
    addInboundOrder(newOrder);

    return NextResponse.json(
      {
        success: true,
        message: 'تم استقبال الطلب من جوجل شيت بنجاح وسقط مباشرة في مرحلة التأكيد (Pending Confirmation)',
        orderNumber,
        orderId,
        stage: 'PENDING_CONFIRMATION',
        customer: newOrder.customer,
        totalCodAmount: newOrder.payment.amount,
      },
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'فشل في معالجة طلب جوجل شيت',
        details: err.message,
      },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
