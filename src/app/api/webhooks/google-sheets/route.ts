import { NextRequest, NextResponse } from 'next/server';
import { addInboundOrder, cleanMoroccanPhone, getInboundOrders, IngestedOrder } from '@/lib/orders-store';
import { triggerOrderConfirmationOutreach } from '@/lib/order-automations';
import { resolveProductBySkuOrName } from '@/lib/products-store';
import { normalizeMoroccanCity } from '@/lib/moroccan-cities';

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
  const localOrders = getInboundOrders();
  const combinedOrders = [...localOrders];

  return NextResponse.json(
    {
      success: true,
      count: combinedOrders.length,
      orders: combinedOrders,
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

    const rawCity =
      payload.city ||
      payload.ville ||
      payload['المدينة'] ||
      payload['Ville'] ||
      'Casablanca';
    const city = normalizeMoroccanCity(String(rawCity));

    const address =
      payload.address ||
      payload.adresse ||
      payload['العنوان'] ||
      payload['Adresse'] ||
      'عنوان غير محدد';

    const rawSku =
      payload.sku ||
      payload.code ||
      payload.ref ||
      payload['الرمز'] ||
      payload['رمز'] ||
      payload['Code'] ||
      payload['SKU'] ||
      payload['Code SKU'] ||
      '';

    const rawProductName =
      payload.product ||
      payload.item ||
      payload.productName ||
      payload['المنتج'] ||
      payload['Produit'] ||
      'Pack Moroccan COD Premium';

    const matchedProd = resolveProductBySkuOrName(String(rawSku), String(rawProductName));

    const productName = matchedProd
      ? (matchedProd.nameAr || matchedProd.name)
      : String(rawProductName).trim();

    const productSku = matchedProd
      ? matchedProd.sku
      : (String(rawSku).trim() || `GS-${String(productName).slice(0, 3).toUpperCase()}-01`);

    const productThumbnail = matchedProd?.image 
      || matchedProd?.additionalImages?.[0]
      || 'https://qonfor.shop/wp-content/uploads/2026/10/Copie-de-Copie-de-Copie-de-%D8%A8%D8%AF%D9%88%D9%86-%D9%85%D9%88%D8%B3E%D9%8A%D9%82%D9%89-%D8%A8%D8%AA%D8%A7%D9%8BD8%A7%D9%8B-1.jpg.webp';

    const quantity = parseInt(
      payload.quantity || payload.qte || payload.quantite || payload['الكمية'] || '1',
      10
    ) || 1;

    const rawPrice = payload.price || payload.total || payload.totalAmount || payload.prix || payload['الثمن'];
    const price = parseFloat(rawPrice) || (matchedProd ? matchedProd.sellingPrice : 179);

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

    // Parse potential date from payload or fallback to current time
    const rawDate = payload.date || payload.timestamp || payload['تاريخ'] || payload['التاريخ'] || payload.horodateur;
    let webhookCreatedAt = new Date();
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) webhookCreatedAt = parsed;
    }

    const newOrder: IngestedOrder = {
      id: orderId,
      orderNumber,
      stage: 'PENDING_CONFIRMATION',
      createdAt: webhookCreatedAt.toISOString(),
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
          thumbnail: 'https://qonfor.shop/wp-content/uploads/2026/10/Copie-de-Copie-de-Copie-de-%D8%A8%D8%AF%D9%88%D9%86-%D9%85%D9%88%D8%B3E%D9%8A%D9%82%D9%89-%D8%A8%D8%AA%D8%A7%D9%86%D8%A7%D9%8B-1.jpg.webp',
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

    // Persist directly to Hostinger MySQL Database
    try {
      const { getMysqlPool } = await import('@/lib/db');
      const pool = getMysqlPool();

      // 1. Insert order into order_leads
      await pool.execute(
        `INSERT INTO order_leads (
          id, order_number, customer_name, phone_number, city, address, total_amount, status,
          risk_score, risk_level, ai_confirmation_status, store_source, created_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', 10, 'LOW', 'PENDING', 'Google Sheets Webhook', ?, ?)
        ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
        [orderId, orderNumber, newOrder.customer.name, cleanedPhone, newOrder.customer.city, newOrder.customer.address, newOrder.payment.amount, webhookCreatedAt, notes]
      );

      // 2. Insert line item into order_items
      await pool.execute(
        `INSERT INTO order_items (id, order_id, product_name, sku, quantity, price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`it-${orderId}`, orderId, newOrder.items[0].name, newOrder.items[0].sku, quantity, price]
      );

      // 3. Upsert customer profile in customers table
      await pool.execute(
        `INSERT INTO customers (id, phone_number, name, city, address, total_orders, trust_score, notes)
         VALUES (?, ?, ?, ?, ?, 1, 'NOUVEAU', ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name), city = VALUES(city), address = VALUES(address),
           total_orders = total_orders + 1, updated_at = CURRENT_TIMESTAMP`,
        [`cust-${cleanedPhone.slice(-4)}`, cleanedPhone, newOrder.customer.name, newOrder.customer.city, newOrder.customer.address, notes]
      );

      // 4. Log sync execution in google_sheets_sync_logs & store_settings
      await pool.execute(
        `INSERT INTO google_sheets_sync_logs (id, spreadsheet_id, sheet_name, rows_synced, status, details)
         VALUES (?, 'webhook-live', 'Google Sheets Inbound Webhook', 1, 'SUCCESS', ?)`,
        [`log-gs-${Date.now()}`, `Commande ${orderNumber} (${newOrder.customer.name} - ${cleanedPhone})`]
      );

      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_LAST_SYNC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`
      );

      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_TOTAL_SYNCED', '1', CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = CAST(COALESCE(setting_value, 0) AS UNSIGNED) + 1, updated_at = CURRENT_TIMESTAMP`
      );

      // 5. Broadcast real-time event to all open tabs and dashboards
      const { realtimeHub } = await import('@/lib/realtime-events');
      realtimeHub.broadcast({
        eventType: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: orderId,
        title: `Nouvelle commande Google Sheet (${orderNumber})`,
        payload: newOrder,
        source: 'GOOGLE_SHEETS_WEBHOOK',
      }).catch(() => {});
    } catch (dbErr: any) {
      console.warn('[Google Sheets Webhook] DB persistence note:', dbErr.message);
    }

    // Trigger instant interactive WhatsApp confirmation outreach if available
    try {
      await triggerOrderConfirmationOutreach(newOrder);
    } catch (err: any) {
      console.warn(`[Google Sheets Webhook] WhatsApp outreach failed for ${orderNumber}:`, err.message);
    }

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
