import { NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/campaigns/[id]
 * Returns campaign info and its recipients with execution status
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { id } = params;
    const pool = getMysqlPool();

    const [campRows]: any = await pool.query(
      `SELECT * FROM whatsapp_campaigns WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!Array.isArray(campRows) || campRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Campagne introuvable' },
        { status: 404 }
      );
    }

    const campaign = campRows[0];

    // Fetch recipients
    const [recipRows]: any = await pool.query(
      `SELECT id, customer_name, phone, city, product_name, interpolated_message, status, error_message, sent_at, created_at
       FROM whatsapp_campaign_recipients 
       WHERE campaign_id = ?
       ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        targetAudienceType: campaign.target_audience_type,
        targetFilter: campaign.target_filter_json ? JSON.parse(campaign.target_filter_json) : null,
        messageText: campaign.message_text,
        mediaUrl: campaign.media_url,
        mediaType: campaign.media_type,
        quickReplyText: campaign.quick_reply_text,
        buttonLabel: campaign.button_label,
        totalRecipients: campaign.total_recipients,
        sentCount: campaign.sent_count,
        deliveredCount: campaign.delivered_count,
        failedCount: campaign.failed_count,
        delayMinSeconds: campaign.delay_min_seconds,
        delayMaxSeconds: campaign.delay_max_seconds,
        startedAt: campaign.started_at,
        completedAt: campaign.completed_at,
        createdAt: campaign.created_at,
      },
      recipients: Array.isArray(recipRows) ? recipRows : [],
    });
  } catch (err: any) {
    console.error('[Get Campaign By ID Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur lors de la récupération des détails' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/[id]
 * Deletes a campaign and all associated recipient rows
 */
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = params;
    const pool = getMysqlPool();

    await pool.query(`DELETE FROM whatsapp_campaign_recipients WHERE campaign_id = ?`, [id]);
    const [result]: any = await pool.query(`DELETE FROM whatsapp_campaigns WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Campagne introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Campagne supprimée avec succès',
    });
  } catch (err: any) {
    console.error('[Delete Campaign Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur lors de la suppression de la campagne' },
      { status: 500 }
    );
  }
}
