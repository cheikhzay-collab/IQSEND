import { NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { parseManualNumbers } from './audiences/route';
import { formatMoroccanPhoneForWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * Helper to interpolate template variables like {nom}, {ville}, {produit}
 */
function interpolateMessage(
  template: string,
  data: { name: string; city: string; productName?: string }
): string {
  let result = template;
  result = result.replace(/\{nom\}/gi, data.name || 'Cher client');
  result = result.replace(/\{name\}/gi, data.name || 'Cher client');
  result = result.replace(/\{الاسم\}/gi, data.name || 'أخي/أختي');
  result = result.replace(/\{ville\}/gi, data.city || 'votre ville');
  result = result.replace(/\{city\}/gi, data.city || 'votre ville');
  result = result.replace(/\{المدينة\}/gi, data.city || 'مدينتكم');
  result = result.replace(/\{produit\}/gi, data.productName || 'votre produit');
  result = result.replace(/\{product\}/gi, data.productName || 'votre produit');
  result = result.replace(/\{المنتج\}/gi, data.productName || 'المنتج');
  return result;
}

/**
 * GET /api/campaigns
 * Returns all WhatsApp campaigns ordered by creation date
 */
export async function GET() {
  try {
    const pool = getMysqlPool();

    const [rows]: any = await pool.query(`
      SELECT 
        c.*,
        COUNT(r.id) as actual_recipients_count,
        SUM(CASE WHEN r.status = 'SENT' THEN 1 ELSE 0 END) as sent_total,
        SUM(CASE WHEN r.status = 'FAILED' THEN 1 ELSE 0 END) as failed_total,
        SUM(CASE WHEN r.status = 'PENDING' THEN 1 ELSE 0 END) as pending_total
      FROM whatsapp_campaigns c
      LEFT JOIN whatsapp_campaign_recipients r ON r.campaign_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    const campaigns = (Array.isArray(rows) ? rows : []).map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      targetAudienceType: row.target_audience_type,
      targetFilter: row.target_filter_json ? JSON.parse(row.target_filter_json) : null,
      messageText: row.message_text,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      quickReplyText: row.quick_reply_text,
      buttonLabel: row.button_label,
      totalRecipients: row.total_recipients || row.actual_recipients_count || 0,
      sentCount: row.sent_total || row.sent_count || 0,
      deliveredCount: row.delivered_count || row.sent_total || 0,
      failedCount: row.failed_total || row.failed_count || 0,
      pendingCount: row.pending_total || 0,
      delayMinSeconds: row.delay_min_seconds || 6,
      delayMaxSeconds: row.delay_max_seconds || 15,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      campaigns,
    });
  } catch (err: any) {
    console.error('[Get Campaigns Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur lors de la récupération des campagnes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns
 * Creates a new broadcast campaign with audience segmentation and pre-generated recipients
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      targetAudienceType = 'PAST_DELIVERED', // 'PAST_DELIVERED' | 'MANUAL_PASTE' | 'HYBRID'
      cityFilter = 'ALL',
      manualNumbersText = '',
      messageText,
      mediaUrl = null,
      mediaType = 'NONE', // 'NONE' | 'IMAGE' | 'VIDEO'
      quickReplyText = null,
      buttonLabel = null,
      delayMinSeconds = 6,
      delayMaxSeconds = 15,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Veuillez saisir un nom pour la campagne' },
        { status: 400 }
      );
    }

    if (!messageText || !messageText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Le texte du message est obligatoire' },
        { status: 400 }
      );
    }

    const pool = getMysqlPool();
    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Gather all unique recipients based on chosen audience
    const recipientsMap = new Map<string, { name: string; phone: string; city: string; productName?: string }>();

    // A. Past Delivered Customers
    if (targetAudienceType === 'PAST_DELIVERED' || targetAudienceType === 'HYBRID') {
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

      if (cityFilter && cityFilter !== 'ALL') {
        query += ` AND city = ?`;
        params.push(cityFilter);
      }

      query += ` GROUP BY phone_number ORDER BY last_order_at DESC LIMIT 2000`;

      const [rows]: any = await pool.query(query, params);
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const formatted = formatMoroccanPhoneForWhatsApp(row.phone);
          if (formatted && !recipientsMap.has(formatted)) {
            recipientsMap.set(formatted, {
              name: row.name,
              phone: formatted,
              city: row.city,
              productName: row.productName,
            });
          }
        }
      }
    }

    // B. Manual Pasted Numbers
    if (targetAudienceType === 'MANUAL_PASTE' || targetAudienceType === 'HYBRID') {
      const manualList = parseManualNumbers(manualNumbersText);
      for (const item of manualList) {
        if (!recipientsMap.has(item.phone)) {
          recipientsMap.set(item.phone, item);
        }
      }
    }

    // Exclude DND phones
    try {
      const [settingRows]: any = await pool.query(
        `SELECT setting_value FROM store_settings WHERE setting_key = 'AGENT_DND_PHONES' LIMIT 1`
      );
      if (Array.isArray(settingRows) && settingRows.length > 0) {
        const dndList: string[] = JSON.parse(settingRows[0].setting_value || '[]');
        for (const dndPhone of dndList) {
          const formattedDnd = formatMoroccanPhoneForWhatsApp(dndPhone);
          recipientsMap.delete(formattedDnd);
        }
      }
    } catch {
      // Continue
    }

    const recipientsList = Array.from(recipientsMap.values());
    if (recipientsList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Aucun destinataire éligible trouvé pour cette sélection. Vérifiez vos filtres ou collez des numéros valides.',
        },
        { status: 400 }
      );
    }

    // 2. Insert Campaign record
    await pool.query(
      `INSERT INTO whatsapp_campaigns (
        id, name, status, target_audience_type, target_filter_json,
        message_text, media_url, media_type, quick_reply_text, button_label,
        total_recipients, delay_min_seconds, delay_max_seconds
      ) VALUES (?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        campaignId,
        name.trim(),
        targetAudienceType,
        JSON.stringify({ cityFilter }),
        messageText.trim(),
        mediaUrl || null,
        mediaType || 'NONE',
        quickReplyText ? quickReplyText.trim() : null,
        buttonLabel ? buttonLabel.trim() : null,
        recipientsList.length,
        parseInt(delayMinSeconds) || 6,
        parseInt(delayMaxSeconds) || 15,
      ]
    );

    // 3. Insert Campaign Recipients in batches of 100
    const recipientValues: any[] = [];
    for (const r of recipientsList) {
      const recipientId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const personalizedMsg = interpolateMessage(messageText.trim(), r);
      recipientValues.push([
        recipientId,
        campaignId,
        r.name,
        r.phone,
        r.city,
        r.productName || null,
        personalizedMsg,
        'PENDING',
      ]);
    }

    // Bulk insert recipients
    const batchSize = 100;
    for (let i = 0; i < recipientValues.length; i += batchSize) {
      const batch = recipientValues.slice(i, i + batchSize);
      await pool.query(
        `INSERT INTO whatsapp_campaign_recipients (
          id, campaign_id, customer_name, phone, city, product_name,
          interpolated_message, status
        ) VALUES ?`,
        [batch]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Campagne "${name}" créée avec succès (${recipientsList.length} destinataires prêts) !`,
      campaignId,
      totalRecipients: recipientsList.length,
    });
  } catch (err: any) {
    console.error('[Create Campaign Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur lors de la création de la campagne' },
      { status: 500 }
    );
  }
}
