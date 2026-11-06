import { NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { formatMoroccanPhoneForWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export interface AudienceRecipient {
  name: string;
  phone: string;
  city: string;
  productName?: string;
}

/**
 * Clean and parse manual text input containing phone numbers and optional names
 * Supports formats:
 * - 0661223344
 * - 0661223344, Youssef
 * - Youssef - 0661223344
 * - +212661223344
 */
export function parseManualNumbers(text: string): AudienceRecipient[] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/[\r\n;,]+/);
  const map = new Map<string, AudienceRecipient>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Extract phone numbers (Moroccan 9 or 10 digits or with 212)
    const phoneMatch = line.match(/(?:\+?212|0)?([67]\d{8})/);
    if (phoneMatch) {
      const standardDigits = '212' + phoneMatch[1];
      if (!map.has(standardDigits)) {
        // Try extracting a name from the remaining text
        const namePart = line
          .replace(phoneMatch[0], '')
          .replace(/[,\-:|\t]+/g, ' ')
          .trim();

        map.set(standardDigits, {
          phone: standardDigits,
          name: namePart || 'Client',
          city: 'Maroc',
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * POST /api/campaigns/audiences
 * Calculates recipient counts and returns sample previews based on selected filters
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      targetType = 'PAST_DELIVERED', // 'PAST_DELIVERED' | 'MANUAL_PASTE' | 'HYBRID'
      city = 'ALL',
      manualText = '',
    } = body;

    const pool = getMysqlPool();
    const combinedRecipientsMap = new Map<string, AudienceRecipient>();

    // 1. Fetch Past Delivered Customers (Clients ayant déjà reçu le produit)
    if (targetType === 'PAST_DELIVERED' || targetType === 'HYBRID') {
      let query = `
        SELECT 
          COALESCE(customer_name, 'Client') as name,
          phone_number as phone,
          COALESCE(city, 'Maroc') as city,
          COALESCE(product_name, '') as productName,
          MAX(created_at) as last_order_at
        FROM order_leads 
        WHERE status = 'DELIVERED_PAID'
          AND phone_number IS NOT NULL 
          AND phone_number != ''
      `;
      const params: any[] = [];

      if (city && city !== 'ALL') {
        query += ` AND city = ?`;
        params.push(city);
      }

      query += ` GROUP BY phone_number ORDER BY last_order_at DESC LIMIT 1500`;

      const [rows]: any = await pool.query(query, params);

      if (Array.isArray(rows)) {
        for (const row of rows) {
          const formatted = formatMoroccanPhoneForWhatsApp(row.phone);
          if (formatted && !combinedRecipientsMap.has(formatted)) {
            combinedRecipientsMap.set(formatted, {
              name: row.name || 'Client',
              phone: formatted,
              city: row.city || 'Maroc',
              productName: row.productName || '',
            });
          }
        }
      }
    }

    // 2. Parse Manual Paste numbers (Coller des numéros manuellement)
    if (targetType === 'MANUAL_PASTE' || targetType === 'HYBRID') {
      const manualList = parseManualNumbers(manualText);
      for (const item of manualList) {
        if (!combinedRecipientsMap.has(item.phone)) {
          combinedRecipientsMap.set(item.phone, item);
        }
      }
    }

    // Fetch DND Blacklisted phones from store settings to exclude them automatically
    try {
      const [settingRows]: any = await pool.query(
        `SELECT setting_value FROM store_settings WHERE setting_key = 'AGENT_DND_PHONES' LIMIT 1`
      );
      if (Array.isArray(settingRows) && settingRows.length > 0) {
        const raw = settingRows[0].setting_value;
        let dndList: string[] = [];
        if (Array.isArray(raw)) {
          dndList = raw;
        } else if (typeof raw === 'string') {
          try {
            dndList = JSON.parse(raw);
          } catch {
            dndList = [];
          }
        }
        for (const dndPhone of dndList) {
          const formattedDnd = formatMoroccanPhoneForWhatsApp(dndPhone);
          combinedRecipientsMap.delete(formattedDnd);
        }
      }
    } catch {
      // Continue if no DND settings
    }

    const allRecipients = Array.from(combinedRecipientsMap.values());
    const totalCount = allRecipients.length;
    const previewSample = allRecipients.slice(0, 50);

    return NextResponse.json({
      success: true,
      totalCount,
      previewSample,
      targetType,
      cityFilter: city,
    });
  } catch (err: any) {
    console.error('[Audiences API Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur lors du calcul de l\'audience' },
      { status: 500 }
    );
  }
}
