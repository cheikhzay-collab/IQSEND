import { NextRequest, NextResponse } from 'next/server';
import { addInboundOrder, cleanMoroccanPhone, IngestedOrder } from '@/lib/orders-store';
import { triggerOrderConfirmationOutreach } from '@/lib/order-automations';

/**
 * 1-Click Google Sheets Direct Sync API
 * Allows sellers to simply paste any shared Google Sheet URL.
 * Automatically converts to CSV export, parses rows with smart multilingual column mapping (FR/AR/EN),
 * and injects orders directly into the "En attente de confirmation" pipeline.
 */

function extractSheetId(url: string): { sheetId: string; gid?: string } | null {
  if (!url) return null;
  
  // Format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=GID
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sheetUrl = body.sheetUrl || body.url;

    if (!sheetUrl) {
      return NextResponse.json(
        { success: false, error: 'URL Google Sheet manquante. Veuillez coller le lien de votre feuille.' },
        { status: 400 }
      );
    }

    let csvData = '';
    let sheetIdTag = 'demo';

    if (body.isDemo || sheetUrl === 'DEMO' || sheetUrl?.toLowerCase().includes('demo')) {
      csvData = `Date,Nom Client,Téléphone,Ville,Adresse,Produit,Quantité,Prix COD (MAD),Remarques
2026-10-20,Youssef El Amrani,0661998877,Marrakech,"Guéliz, Immeuble Atlas, Appt 6",Montre Luxe Or Noir,1,349,Appeler avant 14h
2026-10-20,Amina Benjelloun,0672112233,Fès,"Route Ain Chkef, Résidence Narjiss",Pack Caftan Moderne,1,490,Livraison express
2026-10-20,Tariq Alami,0654334455,Casablanca,"Bd Zerktouni, Quartier Maârif",Sneakers Sport Élite,2,598,Espèces COD
2026-10-20,Houda Tazi,0663778899,Tanger,"Tanger Balia, Complexe Ennasr",Sac Cuir Artisanal,1,380,Confirmation WhatsApp
2026-10-20,Karim Bennani,0611223344,Rabat,"Agdal, Rue Oukaimeden, Imm 12",Pack Soins Bio Maroc,1,299,Livrer l'après-midi`;
    } else {
      const extracted = extractSheetId(sheetUrl);
      if (!extracted) {
        return NextResponse.json(
          { success: false, error: 'Format de lien Google Sheet invalide. Assurez-vous d\'inclure https://docs.google.com/spreadsheets/d/...' },
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
            error: 'Impossible d\'accéder à la feuille Google Sheet. Vérifiez que le partage est bien réglé sur "Tous les utilisateurs disposant du lien (Lecteur)" dans Google Sheets.',
          },
          { status: 403 }
        );
      }

      csvData = await response.text();
    }

    const rows = parseCSV(csvData);

    if (rows.length < 2) {
      return NextResponse.json(
        { success: false, error: 'La feuille Google Sheet semble vide ou ne contient que les en-têtes.' },
        { status: 400 }
      );
    }

    // Header mapping
    const headers = rows[0].map(h => h.toLowerCase().trim());

    const findIndex = (possibleNames: string[]) => {
      return headers.findIndex(h => possibleNames.some(p => h.includes(p)));
    };

    const nameIdx = findIndex(['nom', 'client', 'name', 'الاسم', 'اسم']);
    const phoneIdx = findIndex(['tel', 'téléphone', 'telephone', 'phone', 'mobile', 'الهاتف', 'هاتف', 'رقم']);
    const cityIdx = findIndex(['ville', 'city', 'المدينة', 'مدينة', 'destination']);
    const addressIdx = findIndex(['adresse', 'address', 'العنوان', 'عنوان', 'quartier']);
    const productIdx = findIndex(['produit', 'article', 'product', 'item', 'المنتج', 'سلعة', 'عرض']);
    const priceIdx = findIndex(['prix', 'montant', 'total', 'price', 'amount', 'الثمن', 'المبلغ', 'سعر']);
    const qtyIdx = findIndex(['qte', 'quantité', 'quantity', 'qty', 'الكمية', 'عدد']);
    const noteIdx = findIndex(['note', 'remarque', 'comment', 'ملاحظة', 'ملاحظات']);

    const importedOrders: IngestedOrder[] = [];

    // Parse data rows
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const customerName = (nameIdx !== -1 && row[nameIdx]) ? row[nameIdx] : `Client #${r}`;
      const rawPhone = (phoneIdx !== -1 && row[phoneIdx]) ? row[phoneIdx] : '';
      const phone = cleanMoroccanPhone(rawPhone);

      // Skip empty test rows
      if (!phone && !customerName) continue;

      const city = (cityIdx !== -1 && row[cityIdx]) ? row[cityIdx] : 'Casablanca';
      const address = (addressIdx !== -1 && row[addressIdx]) ? row[addressIdx] : 'Adresse à confirmer par appel';
      const productName = (productIdx !== -1 && row[productIdx]) ? row[productIdx] : 'Pack E-commerce Standard';
      const rawPrice = (priceIdx !== -1 && row[priceIdx]) ? row[priceIdx].replace(/[^\d.]/g, '') : '299';
      const amount = parseFloat(rawPrice) || 299;
      const quantity = (qtyIdx !== -1 && row[qtyIdx]) ? parseInt(row[qtyIdx], 10) || 1 : 1;
      const notes = (noteIdx !== -1 && row[noteIdx]) ? row[noteIdx] : 'Importé automatiquement via Google Sheet';

      const order: IngestedOrder = {
        id: `gs-${sheetIdTag}-${Date.now()}-${r}`,
        orderNumber: `#GS${Math.floor(1000 + Math.random() * 9000)}`,
        stage: 'PENDING_CONFIRMATION',
        createdAt: new Date().toISOString(),
        source: 'GOOGLE_SHEETS',
        customer: {
          name: customerName,
          phone: phone || '0600000000',
          address,
          city,
          notes,
        },
        items: [
          {
            id: `item-${r}`,
            name: productName,
            sku: `SKU-${productName.slice(0, 3).toUpperCase()}-01`,
            thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
            quantity,
            price: amount,
          },
        ],
        payment: {
          method: 'COD',
          amount,
          currency: 'MAD',
          status: 'PENDING',
        },
        aiVerification: {
          status: 'NEEDS_REVIEW',
          riskScore: 88,
          notes: `Importé depuis Google Sheet. Numéro marocain détecté : ${phone}`,
        },
      };

      addInboundOrder(order);
      // Trigger Pillar 1 instant interactive WhatsApp confirmation + upselling
      try {
        await triggerOrderConfirmationOutreach(order);
      } catch (err: any) {
        console.warn(`[Sync] WhatsApp confirmation outreach failed for ${order.orderNumber}:`, err.message);
      }
      importedOrders.push(order);
    }

    return NextResponse.json({
      success: true,
      message: `${importedOrders.length} commande(s) synchronisée(s) avec succès depuis Google Sheet!`,
      importedCount: importedOrders.length,
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
