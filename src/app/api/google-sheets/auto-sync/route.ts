import { NextRequest, NextResponse } from 'next/server';
import { addInboundOrder, cleanMoroccanPhone, IngestedOrder } from '@/lib/orders-store';
import { triggerOrderConfirmationOutreach } from '@/lib/order-automations';
import { getMysqlPool } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime-events';
import { resolveProductBySkuOrName } from '@/lib/products-store';
import { normalizeMoroccanCity } from '@/lib/moroccan-cities';

export const dynamic = 'force-dynamic';

function extractSheetId(url: string): { sheetId: string; gid?: string } | null {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;

  const sheetId = match[1];
  const gidMatch = url.match(/[#&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : undefined;

  return { sheetId, gid };
}

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let curr = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      curr += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(curr.trim());
      curr = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(curr.trim());
      if (row.some(cell => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      curr = '';
    } else {
      curr += char;
    }
  }

  if (curr.length > 0 || row.length > 0) {
    row.push(curr.trim());
    if (row.some(cell => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

/**
 * GET /api/google-sheets/auto-sync
 * Autonomous Background Sync:
 * Checks the saved Google Sheet in store_settings, detects any newly added rows,
 * and drops them instantly into MySQL, WhatsApp outreach, and real-time dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    const pool = getMysqlPool();

    // 1. Check settings in store_settings
    const [settingsRows]: any = await pool.execute(
      `SELECT setting_key, setting_value FROM store_settings WHERE setting_key IN ('GOOGLE_SHEET_URL', 'GOOGLE_SHEET_AUTO_SYNC')`
    );

    let sheetUrl = '';
    let autoSync = false;

    if (Array.isArray(settingsRows)) {
      settingsRows.forEach((r: any) => {
        if (r.setting_key === 'GOOGLE_SHEET_URL') sheetUrl = r.setting_value;
        if (r.setting_key === 'GOOGLE_SHEET_AUTO_SYNC') autoSync = r.setting_value === 'true';
      });
    }

    if (!autoSync || !sheetUrl) {
      return NextResponse.json({
        success: true,
        autoSyncEnabled: autoSync,
        hasUrl: !!sheetUrl,
        newOrdersCount: 0,
        message: autoSync ? 'رابط Google Sheet غير محدد' : 'المزامنة التلقائية غير مفعلة',
      });
    }

    // 2. Fetch Google Sheets CSV
    const extracted = extractSheetId(sheetUrl);
    if (!extracted) {
      return NextResponse.json({
        success: false,
        error: 'رابط Google Sheet المحفوظ غير صالح',
      });
    }

    const csvExportUrl = extracted.gid
      ? `https://docs.google.com/spreadsheets/d/${extracted.sheetId}/export?format=csv&gid=${extracted.gid}`
      : `https://docs.google.com/spreadsheets/d/${extracted.sheetId}/export?format=csv`;

    const response = await fetch(csvExportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SenditPlatform/1.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'تعذر الوصول إلى Google Sheet أثناء الفحص التلقائي. يرجى التأكد من صلاحية المشاركة.',
      });
    }

    const csvData = await response.text();
    const rows = parseCSV(csvData);

    if (rows.length < 2) {
      return NextResponse.json({
        success: true,
        newOrdersCount: 0,
        message: 'الشيت فارغ أو يحتوي على العناوين فقط.',
      });
    }

    // 3. Header mapping
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const findIndex = (possibleNames: string[]) => {
      return headers.findIndex(h => possibleNames.some(p => h.includes(p)));
    };

    const orderIdIdx = findIndex(['id', 'commande', 'n°', 'order', 'numero', 'ref', 'الطلب', 'رقم الطلب', 'معرف']);
    const dateIdx = findIndex(['date', 'time', 'horodateur', 'timestamp', 'تاريخ', 'وقت', 'heure']);
    const nameIdx = findIndex(['nom', 'client', 'name', 'prenom', 'الاسم', 'اسم']);
    const phoneIdx = findIndex(['tel', 'téléphone', 'telephone', 'phone', 'mobile', 'gsm', 'الهاتف', 'هاتف', 'رقم']);
    const cityIdx = findIndex(['ville', 'city', 'المدينة', 'مدينة', 'destination']);
    const addressIdx = findIndex(['adresse', 'address', 'العنوان', 'عنوان', 'quartier', 'rue']);
    const skuIdx = findIndex(['sku', 'code', 'ref', 'référence', 'reference', 'الرمز', 'رمز', 'معرف المنتج', 'كود']);
    const productIdx = findIndex(['produit', 'article', 'product', 'item', 'المنتج', 'سلعة', 'عرض', 'اسم المنتج']);
    const priceIdx = findIndex(['prix', 'montant', 'total', 'price', 'amount', 'cod', 'الثمن', 'المبلغ', 'سعر', 'الإجمالي']);
    const qtyIdx = findIndex(['qte', 'quantité', 'quantity', 'qty', 'الكمية', 'عدد']);
    const noteIdx = findIndex(['note', 'remarque', 'comment', 'ملاحظة', 'ملاحظات', 'remarques']);

    // 4. Query existing phone numbers, order IDs and numbers in order_leads for deduplication
    const existingPhones = new Set<string>();
    const existingOrderIds = new Set<string>();
    const existingOrderNumbers = new Set<string>();
    const [existingLeads]: any = await pool.execute(
      `SELECT id, order_number, phone_number FROM order_leads`
    );
    if (Array.isArray(existingLeads)) {
      existingLeads.forEach((l: any) => {
        if (l.phone_number) existingPhones.add(cleanMoroccanPhone(l.phone_number));
        if (l.id) existingOrderIds.add(String(l.id).trim().toLowerCase());
        if (l.order_number) existingOrderNumbers.add(String(l.order_number).trim().toLowerCase());
      });
    }

    const newOrders: IngestedOrder[] = [];
    let skippedCount = 0;
    const sheetIdTag = extracted.sheetId.slice(0, 6);

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawOrderId = (orderIdIdx !== -1 && row[orderIdIdx]) ? row[orderIdIdx].trim() : '';
      const customerName = (nameIdx !== -1 && row[nameIdx]) ? row[nameIdx].trim() : '';
      const rawPhone = (phoneIdx !== -1 && row[phoneIdx]) ? row[phoneIdx].trim() : '';
      let phone = cleanMoroccanPhone(rawPhone);

      if (phone.length === 9 && /^[567]\d{8}$/.test(phone)) {
        phone = '0' + phone;
      }

      // Strict validation: A valid Moroccan phone number (at least 9 digits, e.g. 06..., 07..., 05...) is MANDATORY
      const isValidMoroccanPhone = phone && phone.length >= 9 && phone !== '0600000000' && /^(0[567]\d{8}|\+?212[567]\d{8})$/.test(phone);
      if (!isValidMoroccanPhone) {
        skippedCount++;
        continue;
      }

      // 1. By Order Number / ID from Sheet
      if (rawOrderId) {
        const cleanOId = rawOrderId.toLowerCase();
        if (existingOrderNumbers.has(cleanOId) || existingOrderIds.has(cleanOId)) {
          skippedCount++;
          continue;
        }
      }

      // 2. Already imported previously by phone?
      if (existingPhones.has(phone)) {
        skippedCount++;
        continue;
      }

      // Deterministic order ID and number per sheet row to prevent duplicate insertions
      const orderId = rawOrderId ? `gs-${rawOrderId.replace(/[^\w-]/g, '')}` : `gs-${sheetIdTag}-r${r}`;
      if (existingOrderIds.has(orderId.toLowerCase())) {
        skippedCount++;
        continue;
      }

      const orderNumber = rawOrderId ? (rawOrderId.startsWith('#') ? rawOrderId : `#${rawOrderId}`) : `#GS${1000 + (r % 9000)}`;
      const finalCustomerName = customerName || `Client ${phone.slice(-4)}`;

      const rawCity = (cityIdx !== -1 && row[cityIdx]) ? row[cityIdx].trim() : 'Casablanca';
      const city = normalizeMoroccanCity(rawCity);
      const address = (addressIdx !== -1 && row[addressIdx]) ? row[addressIdx].trim() : 'Adresse à confirmer par appel';

      const rawSku = (skuIdx !== -1 && row[skuIdx]) ? row[skuIdx].trim() : '';
      const rawProductName = (productIdx !== -1 && row[productIdx]) ? row[productIdx].trim() : '';
      const matchedProd = resolveProductBySkuOrName(rawSku, rawProductName);

      const productName = matchedProd 
        ? (matchedProd.nameAr || matchedProd.name) 
        : (rawProductName || 'Pack E-commerce Standard');

      const productSku = matchedProd 
        ? matchedProd.sku 
        : (rawSku || `GS-${productName.slice(0, 3).toUpperCase()}-01`);

      const productThumbnail = matchedProd?.image 
        || matchedProd?.additionalImages?.[0] 
        || 'https://qonfor.shop/wp-content/uploads/2026/10/Copie-de-Copie-de-Copie-de-%D8%A8%D8%AF%D9%88%D9%86-%D9%85%D9%88%D8%B3E%D9%8A%D9%82%D9%89-%D8%A8%D8%AA%D8%A7%D9%8BD8%A7%D9%8B-1.jpg.webp';

      const rawPrice = (priceIdx !== -1 && row[priceIdx]) ? row[priceIdx].replace(/[^\d.]/g, '') : '';
      const amount = parseFloat(rawPrice) || (matchedProd ? matchedProd.sellingPrice : 179);
      const quantity = (qtyIdx !== -1 && row[qtyIdx]) ? parseInt(row[qtyIdx], 10) || 1 : 1;
      const notes = (noteIdx !== -1 && row[noteIdx]) ? row[noteIdx].trim() : 'مزامنة تلقائية حية من Google Sheet';

      const order: IngestedOrder = {
        id: orderId,
        orderNumber,
        stage: 'PENDING_CONFIRMATION',
        createdAt: new Date().toISOString(),
        source: 'GOOGLE_SHEETS',
        customer: {
          name: finalCustomerName,
          phone: phone,
          address,
          city,
          notes,
        },
        items: [
          {
            id: `item-${orderId}`,
            name: productName,
            sku: productSku,
            thumbnail: productThumbnail,
            quantity,
            price: amount,
          },
        ],
        payment: {
          method: 'COD',
          amount: amount * quantity,
          currency: 'MAD',
          status: 'PENDING',
        },
        aiVerification: {
          status: 'NEEDS_REVIEW',
          riskScore: 88,
          notes: `سقط تلقائياً من Google Sheet في نفس الوقت. هاتف: ${phone}`,
        },
      };

      // Add to in-memory queue
      addInboundOrder(order);

      // Persist to MySQL
      try {
        await pool.execute(
          `INSERT INTO order_leads (
            id, order_number, customer_name, phone_number, city, address, total_amount, status,
            risk_score, risk_level, ai_confirmation_status, store_source, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', 15, 'LOW', 'PENDING', 'Google Sheets Auto-Sync', ?)
          ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
          [order.id, order.orderNumber, customerName, phone, city, address, amount * quantity, notes]
        );

        await pool.execute(
          `INSERT INTO order_items (id, order_id, product_name, sku, quantity, price)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE product_name = VALUES(product_name), sku = VALUES(sku), quantity = VALUES(quantity), price = VALUES(price)`,
          [`it-${order.id}`, order.id, productName, productSku, quantity, amount]
        );

        await pool.execute(
          `INSERT INTO customers (id, phone_number, name, city, address, total_orders, trust_score, notes)
           VALUES (?, ?, ?, ?, ?, 1, 'NOUVEAU', ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name), city = VALUES(city), address = VALUES(address),
             total_orders = total_orders + 1, updated_at = CURRENT_TIMESTAMP`,
          [`cust-${(phone || '0000').slice(-4)}`, phone || '0600000000', customerName, city, address, notes]
        );

        if (phone) existingPhones.add(phone);
      } catch (dbErr: any) {
        console.warn(`[Auto-Sync] Error saving lead ${order.orderNumber}:`, dbErr.message);
      }

      // Trigger instant interactive WhatsApp confirmation outreach
      try {
        await triggerOrderConfirmationOutreach(order);
      } catch (err: any) {
        console.warn(`[Auto-Sync] WhatsApp error for ${order.orderNumber}:`, err.message);
      }

      newOrders.push(order);
    }

    // 5. If new orders were imported, update store_settings and broadcast
    const nowIso = new Date().toISOString();
    await pool.execute(
      `INSERT INTO store_settings (setting_key, setting_value, updated_at)
       VALUES ('GOOGLE_SHEET_LAST_SYNC', ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
      [nowIso]
    );

    if (newOrders.length > 0) {
      await pool.execute(
        `INSERT INTO google_sheets_sync_logs (id, spreadsheet_id, sheet_name, rows_synced, status, details)
         VALUES (?, ?, 'Auto-Sync', ?, 'SUCCESS', ?)`,
        [
          `log-auto-${Date.now()}`,
          sheetIdTag,
          newOrders.length,
          `مزامنة حية تلقائية: تم التقاط ${newOrders.length} طلبات جديدة فور إضافتها في Google Sheet`
        ]
      );

      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_TOTAL_SYNCED', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = CAST(COALESCE(setting_value, 0) AS UNSIGNED) + ?, updated_at = CURRENT_TIMESTAMP`,
        [String(newOrders.length), newOrders.length]
      );

      // Broadcast event so UI updates instantly
      realtimeHub.broadcast({
        eventType: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: 'AUTO_GOOGLE_SHEETS',
        title: `⚡ سقط ${newOrders.length} طلب(ات) جديدة تلقائياً من Google Sheets!`,
        payload: { count: newOrders.length, orders: newOrders },
        source: 'GOOGLE_SHEETS_AUTO_SYNC',
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      autoSyncEnabled: true,
      newOrdersCount: newOrders.length,
      skippedCount,
      orders: newOrders,
      lastSync: nowIso,
    });
  } catch (error: any) {
    console.error('[Auto-Sync Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
