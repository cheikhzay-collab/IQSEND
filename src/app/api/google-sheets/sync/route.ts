import { NextRequest, NextResponse } from 'next/server';
import { addInboundOrder, cleanMoroccanPhone, IngestedOrder } from '@/lib/orders-store';
import { triggerOrderConfirmationOutreach } from '@/lib/order-automations';
import { getMysqlPool } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime-events';
import { resolveProductBySkuOrName } from '@/lib/products-store';
import { normalizeMoroccanCity } from '@/lib/moroccan-cities';

export const dynamic = 'force-dynamic';

/**
 * 1-Click Google Sheets Direct Sync & Settings API
 * 1. GET: Fetch saved Google Sheets settings & recent logs from MySQL store_settings
 * 2. PUT: Save/update Google Sheet settings (URL, auto-sync, interval) in MySQL
 * 3. POST: Execute direct synchronization with SKU recognition, deduplication & real-time broadcast
 */

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
 * GET: Retrieve saved Google Sheets configuration and sync history
 */
export async function GET() {
  try {
    const pool = getMysqlPool();

    // Query settings from store_settings
    const [settingsRows]: any = await pool.execute(
      `SELECT setting_key, setting_value, updated_at FROM store_settings WHERE setting_key LIKE 'GOOGLE_SHEET_%'`
    );

    const settingsMap: Record<string, { value: string; updatedAt: string }> = {};
    if (Array.isArray(settingsRows)) {
      settingsRows.forEach((r: any) => {
        settingsMap[r.setting_key] = {
          value: r.setting_value,
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : '',
        };
      });
    }

    // Get recent logs from google_sheets_sync_logs
    let recentLogs: any[] = [];
    try {
      const [logs]: any = await pool.execute(
        `SELECT * FROM google_sheets_sync_logs ORDER BY created_at DESC LIMIT 5`
      );
      if (Array.isArray(logs)) {
        recentLogs = logs;
      }
    } catch {
      // Table may be empty
    }

    const latestLog = recentLogs[0] || null;

    return NextResponse.json({
      success: true,
      settings: {
        sheetUrl: settingsMap['GOOGLE_SHEET_URL']?.value || '',
        autoSync: settingsMap['GOOGLE_SHEET_AUTO_SYNC']?.value === 'true',
        syncInterval: parseInt(settingsMap['GOOGLE_SHEET_SYNC_INTERVAL']?.value || '30', 10),
        lastSync: settingsMap['GOOGLE_SHEET_LAST_SYNC']?.value || (latestLog?.created_at ? new Date(latestLog.created_at).toISOString() : null),
        lastStatus: settingsMap['GOOGLE_SHEET_LAST_STATUS']?.value || latestLog?.status || 'IDLE',
        totalSynced: parseInt(settingsMap['GOOGLE_SHEET_TOTAL_SYNCED']?.value || '0', 10),
        lastCount: parseInt(settingsMap['GOOGLE_SHEET_LAST_COUNT']?.value || '0', 10),
        updatedAt: settingsMap['GOOGLE_SHEET_URL']?.updatedAt || null,
      },
      recentLogs,
    });
  } catch (error: any) {
    console.error('[API Google Sheets GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Impossible de lire les paramètres.' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Save or update Google Sheets settings in MySQL store_settings
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sheetUrl, autoSync, syncInterval } = body;

    const pool = getMysqlPool();

    if (sheetUrl !== undefined) {
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_URL', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [String(sheetUrl).trim()]
      );
    }

    if (autoSync !== undefined) {
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_AUTO_SYNC', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [autoSync ? 'true' : 'false']
      );
    }

    if (syncInterval !== undefined) {
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_SYNC_INTERVAL', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [String(syncInterval || 30)]
      );
    }

    // Broadcast settings update to realtime hub
    realtimeHub.broadcast({
      eventType: 'AI_CONFIG_UPDATED',
      entityType: 'SYSTEM',
      entityId: 'GOOGLE_SHEETS_CONFIG',
      title: 'إعدادات Google Sheets تم تحديثها في قاعدة البيانات',
      payload: { sheetUrl, autoSync: !!autoSync, syncInterval },
      source: 'GOOGLE_SHEETS_SETTINGS',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'تم حفظ إعدادات Google Sheets في قاعدة البيانات بنجاح!',
      savedAt: new Date().toISOString(),
      settings: {
        sheetUrl: sheetUrl || '',
        autoSync: !!autoSync,
        syncInterval: syncInterval || 30,
      },
    });
  } catch (error: any) {
    console.error('[API Google Sheets PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Échec de la sauvegarde des paramètres.' },
      { status: 500 }
    );
  }
}

/**
 * POST: Save settings AND execute synchronization with Google Sheets
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let sheetUrl = (body.sheetUrl || body.url || '').trim();
    const isDemo = body.isDemo === true || sheetUrl === 'DEMO';
    const pool = getMysqlPool();

    // If no sheetUrl provided in request and not demo, check if one was saved in store_settings
    if (!sheetUrl && !isDemo) {
      const [rows]: any = await pool.execute(
        `SELECT setting_value FROM store_settings WHERE setting_key = 'GOOGLE_SHEET_URL'`
      );
      if (Array.isArray(rows) && rows.length > 0 && rows[0].setting_value) {
        sheetUrl = rows[0].setting_value;
      }
    }

    if (!sheetUrl && !isDemo) {
      return NextResponse.json(
        { success: false, error: 'رابط Google Sheet مفقود. يرجى لصق الرابط وحفظه أولاً.' },
        { status: 400 }
      );
    }

    // Save autoSync and syncInterval if provided
    if (body.autoSync !== undefined) {
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_AUTO_SYNC', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [body.autoSync ? 'true' : 'false']
      );
    }
    if (body.syncInterval !== undefined) {
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_SYNC_INTERVAL', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [String(body.syncInterval)]
      );
    }

    // If client only requested saving settings without running sync
    if (body.saveOnly) {
      if (sheetUrl && !isDemo) {
        await pool.execute(
          `INSERT INTO store_settings (setting_key, setting_value, updated_at)
           VALUES ('GOOGLE_SHEET_URL', ?, CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
          [sheetUrl]
        );
      }
      return NextResponse.json({
        success: true,
        message: 'تم حفظ إعدادات صفحة Google Sheets بنجاح في قاعدة البيانات!',
        sheetUrl,
      });
    }

    let rows: string[][] = [];
    let sheetIdTag = 'gs-demo';

    if (isDemo) {
      // Built-in Demo Data using official catalog SKU and products
      rows = [
        ['Date', 'ID Commande', 'Nom Client', 'Téléphone', 'Ville', 'Adresse', 'Code SKU', 'Produit', 'Quantité', 'Prix Total COD', 'Remarques'],
        ['2026-10-31', '#CMD-DEMO-1', 'Youssef El Amrani', '0661998877', 'Marrakech', 'Guéliz, Immeuble Atlas, Appt 6', 'BMB-BLK-L', 'خف جلد طبيعي أصلي (KHUF CUIR)', '1', '179', 'Appeler avant 14h pour confirmation'],
        ['2026-10-31', '#CMD-DEMO-2', 'Amina Benjelloun', '0672112233', 'Fès', 'Route Ain Chkef, Résidence Narjiss', 'BMB-BLK-L', 'خف جلد طبيعي أصلي (KHUF CUIR)', '2', '269', 'Livraison rapide souhaitée'],
        ['2026-10-31', '#CMD-DEMO-3', 'Tariq Alami', '0654334455', 'Casablanca', 'Bd Zerktouni, Quartier Maârif', 'BMB-BLK-L', 'خف جلد طبيعي أصلي (KHUF CUIR)', '1', '179', 'Paiement espèces COD à la livraison'],
        ['2026-10-31', '#CMD-DEMO-4', 'Houda Tazi', '0663778899', 'Tanger', 'Tanger Balia, Complexe Ennasr', 'BMB-BLK-L', 'خف جلد طبيعي أصلي (KHUF CUIR)', '3', '340', 'Confirmer par WhatsApp Darija'],
        ['2026-10-31', '#CMD-DEMO-5', 'Karim Bennani', '0611223344', 'Rabat', 'Agdal, Rue Oukaimeden, Imm 12', 'BMB-BLK-L', 'خف جلد طبيعي أصلي (KHUF CUIR)', '1', '179', 'Livrer l\'après-midi après 16h'],
      ];
    } else {
      const extracted = extractSheetId(sheetUrl);
      if (!extracted) {
        return NextResponse.json(
          { success: false, error: 'صيغة رابط Google Sheet غير صالحة. تأكد من أن الرابط يحتوي على https://docs.google.com/spreadsheets/d/...' },
          { status: 400 }
        );
      }
      sheetIdTag = extracted.sheetId.slice(0, 6);

      // Direct Google Sheets CSV export endpoint
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
        return NextResponse.json(
          {
            success: false,
            error: 'تعذر الوصول إلى Google Sheet. تأكد من ضبط إمكانية الوصول إلى "Tous les utilisateurs disposant du lien (Lecteur)" في Google Sheets.',
          },
          { status: 403 }
        );
      }

      const csvData = await response.text();

      // Persist the valid URL into store_settings
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_URL', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [sheetUrl]
      );

      rows = parseCSV(csvData);
    }

    if (rows.length < 2) {
      return NextResponse.json(
        { success: false, error: 'ورقة Google Sheet فارغة أو لا تحتوي إلا على العناوين.' },
        { status: 400 }
      );
    }

    // Header mapping: support Arabic, French, English synonyms
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const findIndex = (possibleNames: string[]) => {
      return headers.findIndex(h => possibleNames.some(p => h.includes(p)));
    };

    const orderIdIdx = findIndex(['id', 'commande', 'n°', 'order', 'numero', 'ref', 'الطلب', 'رقم الطلب', 'معرف']);
    const skuIdx = findIndex(['sku', 'code', 'ref', 'référence', 'reference', 'الرمز', 'رمز', 'معرف المنتج', 'كود']);
    const nameIdx = findIndex(['nom', 'client', 'name', 'prenom', 'الاسم', 'اسم']);
    const phoneIdx = findIndex(['tel', 'téléphone', 'telephone', 'phone', 'mobile', 'gsm', 'الهاتف', 'هاتف', 'رقم']);
    const cityIdx = findIndex(['ville', 'city', 'المدينة', 'مدينة', 'destination']);
    const addressIdx = findIndex(['adresse', 'address', 'العنوان', 'عنوان', 'quartier', 'rue']);
    const productIdx = findIndex(['produit', 'article', 'product', 'item', 'المنتج', 'سلعة', 'عرض', 'اسم المنتج']);
    const priceIdx = findIndex(['prix', 'montant', 'total', 'price', 'amount', 'cod', 'الثمن', 'المبلغ', 'سعر', 'الإجمالي']);
    const qtyIdx = findIndex(['qte', 'quantité', 'quantity', 'qty', 'الكمية', 'عدد']);
    const noteIdx = findIndex(['note', 'remarque', 'comment', 'ملاحظة', 'ملاحظات', 'remarques']);
    const dateIdx = findIndex(['date', 'time', 'horodateur', 'timestamp', 'تاريخ', 'وقت', 'heure']);

    // Fetch existing phone numbers and order numbers from order_leads to STRICTLY DEDUPLICATE
    const existingPhones = new Set<string>();
    const existingOrderIds = new Set<string>();
    const existingOrderNumbers = new Set<string>();
    try {
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
    } catch (e) {
      console.warn('[Sync] Note querying existing leads for deduplication:', e);
    }

    const importedOrders: IngestedOrder[] = [];
    let skippedCount = 0;

    // Parse data rows
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawOrderId = (orderIdIdx !== -1 && row[orderIdIdx]) ? row[orderIdIdx].trim() : '';
      const customerName = (nameIdx !== -1 && row[nameIdx]) ? row[nameIdx].trim() : `Client #${r}`;
      const rawPhone = (phoneIdx !== -1 && row[phoneIdx]) ? row[phoneIdx].trim() : '';
      const phone = cleanMoroccanPhone(rawPhone);

      // Skip invalid / empty rows
      const isValidMoroccanPhone = phone && phone.length >= 9 && phone !== '0600000000' && /^(0[567]\d{8}|\+?212[567]\d{8})$/.test(phone);
      if (!isValidMoroccanPhone) {
        skippedCount++;
        continue;
      }

      // Deduplication check:
      // 1. By Order Number / ID from Sheet
      if (rawOrderId) {
        const cleanOId = rawOrderId.toLowerCase();
        if (existingOrderNumbers.has(cleanOId) || existingOrderIds.has(cleanOId)) {
          skippedCount++;
          continue;
        }
      }

      // 2. By Phone Number: if order with this phone already exists in DB, skip it (unless forceSync is true)
      if (!body.forceSync && phone && existingPhones.has(phone)) {
        skippedCount++;
        continue;
      }

      // Mark phone and order ID as seen to prevent duplicates within same sheet
      if (phone) existingPhones.add(phone);
      if (rawOrderId) existingOrderNumbers.add(rawOrderId.toLowerCase());

      const rawCity = (cityIdx !== -1 && row[cityIdx]) ? row[cityIdx].trim() : 'Casablanca';
      const city = normalizeMoroccanCity(rawCity);
      const address = (addressIdx !== -1 && row[addressIdx]) ? row[addressIdx].trim() : 'Adresse à confirmer par appel';

      // 🌟 Intelligent Product Identification by SKU and Name from Central Catalog
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
      const notes = (noteIdx !== -1 && row[noteIdx]) ? row[noteIdx].trim() : 'Importé automatiquement via Google Sheet';

      let sheetCreatedAt = new Date();
      if (dateIdx !== -1 && row[dateIdx]) {
        const parsed = new Date(row[dateIdx]);
        if (!isNaN(parsed.getTime())) {
          sheetCreatedAt = parsed;
        }
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderId = rawOrderId ? `gs-${rawOrderId.replace(/[^\w-]/g, '')}` : `gs-${sheetIdTag}-r${r}`;
      const orderNumber = rawOrderId ? (rawOrderId.startsWith('#') ? rawOrderId : `#${rawOrderId}`) : `#GS${randomSuffix}`;

      const order: IngestedOrder = {
        id: orderId,
        orderNumber,
        stage: 'PENDING_CONFIRMATION',
        createdAt: sheetCreatedAt.toISOString(),
        source: 'GOOGLE_SHEETS',
        customer: {
          name: customerName,
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
          riskScore: 10,
          notes: `Importé depuis Google Sheet. Produit identifié : ${productName} (${productSku}). Destination : ${city}`,
        },
      };

      // Add to in-memory store
      addInboundOrder(order);

      // Persist directly into MySQL
      try {
        await pool.execute(
          `INSERT INTO order_leads (
            id, order_number, customer_name, phone_number, city, address, total_amount, status,
            risk_score, risk_level, ai_confirmation_status, store_source, created_at, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', 10, 'LOW', 'PENDING', 'Google Sheets Sync', ?, ?)
          ON DUPLICATE KEY UPDATE 
            city = VALUES(city),
            address = VALUES(address),
            updated_at = CURRENT_TIMESTAMP`,
          [order.id, order.orderNumber, customerName, phone, city, address, amount * quantity, sheetCreatedAt, notes]
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
      } catch (dbErr: any) {
        console.warn(`[Sync] Note persisting order ${order.orderNumber}:`, dbErr.message);
      }

      // WhatsApp interactive confirmation outreach
      try {
        await triggerOrderConfirmationOutreach(order);
      } catch (err: any) {
        console.warn(`[Sync] WhatsApp outreach error for ${order.orderNumber}:`, err.message);
      }

      importedOrders.push(order);
    }

    // Update settings & record log in google_sheets_sync_logs
    try {
      await pool.execute(
        `INSERT INTO google_sheets_sync_logs (id, spreadsheet_id, sheet_name, rows_synced, status, details)
         VALUES (?, ?, 'Feuille 1', ?, 'SUCCESS', ?)`,
        [
          `log-sync-${Date.now()}`,
          sheetIdTag,
          importedOrders.length,
          `استيراد ${importedOrders.length} طلبات جديدة وتخطي ${skippedCount} طلبات مكررة`
        ]
      );

      const nowIso = new Date().toISOString();
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_LAST_SYNC', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [nowIso]
      );

      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_LAST_STATUS', 'SUCCESS', CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = 'SUCCESS', updated_at = CURRENT_TIMESTAMP`
      );

      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_LAST_COUNT', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [String(importedOrders.length)]
      );

      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ('GOOGLE_SHEET_TOTAL_SYNCED', ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE setting_value = CAST(COALESCE(setting_value, 0) AS UNSIGNED) + ?, updated_at = CURRENT_TIMESTAMP`,
        [String(importedOrders.length), importedOrders.length]
      );

      // Broadcast real-time event to all open dashboards
      if (importedOrders.length > 0) {
        realtimeHub.broadcast({
          eventType: 'ORDER_CREATED',
          entityType: 'ORDER',
          entityId: 'BATCH_GOOGLE_SHEETS',
          title: `تم استيراد ${importedOrders.length} طلبات جديدة من Google Sheets`,
          payload: { count: importedOrders.length, orders: importedOrders },
          source: 'GOOGLE_SHEETS_SYNC',
        }).catch(() => {});
      }
    } catch (logErr) {
      console.warn('[Sync] Note saving sync log:', logErr);
    }

    const message = importedOrders.length > 0
      ? `✅ تم استيراد ${importedOrders.length} طلب(ات) جديدة بنجاح إلى مرحلة التأكيد! (${skippedCount} طلبات مكررة تم تخطيها لمنع التكرار)`
      : `ℹ️ لم يتم العثور على طلبات جديدة. جميع الطلبات (${skippedCount}) مسجلة مسبقاً في قاعدة البيانات لمنع التكرار.`;

    return NextResponse.json({
      success: true,
      message,
      importedCount: importedOrders.length,
      skippedCount,
      totalRows: rows.length - 1,
      orders: importedOrders,
      targetStage: 'En attente de confirmation',
    });
  } catch (error: any) {
    console.error('Erreur synchronisation Google Sheet:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Une erreur est survenue lors de la synchronisation avec Google Sheet.',
      },
      { status: 500 }
    );
  }
}

