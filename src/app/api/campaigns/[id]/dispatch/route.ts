import { NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { sendWhatsAppDirectMedia } from '@/lib/whatsapp/baileys-service';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * Helper to pause execution
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST /api/campaigns/[id]/dispatch
 * Starts or steps the batch dispatching of campaign messages with anti-ban throttling
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'START'; // 'START' | 'PAUSE' | 'PROCESS_BATCH'
    const batchSize = Math.min(parseInt(body.batchSize || '10'), 25);

    const pool = getMysqlPool();

    // 1. Fetch Campaign
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

    // Handle Pause
    if (action === 'PAUSE') {
      await pool.query(
        `UPDATE whatsapp_campaigns SET status = 'PAUSED' WHERE id = ?`,
        [id]
      );
      return NextResponse.json({
        success: true,
        message: 'Campagne mise en pause',
        status: 'PAUSED',
      });
    }

    // Handle Reset / Re-run
    if (action === 'RESET') {
      await pool.query(
        `UPDATE whatsapp_campaign_recipients 
         SET status = 'PENDING', error_message = NULL, sent_at = NULL, msg_id = NULL 
         WHERE campaign_id = ?`,
        [id]
      );
      await pool.query(
        `UPDATE whatsapp_campaigns 
         SET status = 'DRAFT', sent_count = 0, failed_count = 0, completed_at = NULL 
         WHERE id = ?`,
        [id]
      );
      return NextResponse.json({
        success: true,
        message: 'Campagne réinitialisée avec succès pour un nouvel envoi',
        status: 'DRAFT',
      });
    }

    // Set status to RUNNING if starting
    await pool.query(
      `UPDATE whatsapp_campaigns 
       SET status = 'RUNNING', started_at = COALESCE(started_at, NOW()) 
       WHERE id = ?`,
      [id]
    );

    // 2. Fetch Next Batch of Pending Recipients
    const [pendingRecipients]: any = await pool.query(
      `SELECT id, phone, customer_name, city, product_name, interpolated_message
       FROM whatsapp_campaign_recipients
       WHERE campaign_id = ? AND status = 'PENDING'
       ORDER BY created_at ASC
       LIMIT ?`,
      [id, batchSize]
    );

    if (!Array.isArray(pendingRecipients) || pendingRecipients.length === 0) {
      // Mark campaign as COMPLETED
      await pool.query(
        `UPDATE whatsapp_campaigns SET status = 'COMPLETED', completed_at = NOW() WHERE id = ?`,
        [id]
      );
      return NextResponse.json({
        success: true,
        message: 'Campagne terminée ! Tous les messages ont été traités.',
        completed: true,
        processedCount: 0,
      });
    }

    const delayMin = Math.max(campaign.delay_min_seconds || 4, 2);
    const delayMax = Math.max(campaign.delay_max_seconds || 10, delayMin);

    let batchSuccess = 0;
    let batchFailed = 0;

    for (let i = 0; i < pendingRecipients.length; i++) {
      const recipient = pendingRecipients[i];

      // Re-verify if campaign was paused during loop
      const [statusCheck]: any = await pool.query(
        `SELECT status FROM whatsapp_campaigns WHERE id = ? LIMIT 1`,
        [id]
      );
      if (statusCheck[0]?.status === 'PAUSED') {
        console.log(`[Campaign Dispatch] ⏸️ Campaign ${id} paused mid-batch.`);
        break;
      }

      const caption = recipient.interpolated_message || campaign.message_text;

      // Parse buttons_json if multiple buttons exist
      let buttonsList: Array<{ label: string; quickReplyText: string }> | undefined = undefined;
      if (campaign.buttons_json) {
        try {
          const parsed = typeof campaign.buttons_json === 'string'
            ? JSON.parse(campaign.buttons_json)
            : campaign.buttons_json;
          if (Array.isArray(parsed) && parsed.length > 0) {
            buttonsList = parsed;
          }
        } catch {}
      }

      // Dispatch via Baileys Direct Media with multi-button CTA
      const sendRes = await sendWhatsAppDirectMedia(recipient.phone, {
        mediaUrl: campaign.media_url,
        mediaType: campaign.media_type,
        caption,
        quickReplyText: campaign.quick_reply_text,
        buttonLabel: campaign.button_label,
        buttons: buttonsList,
      });

      if (sendRes.success) {
        batchSuccess++;
        await pool.query(
          `UPDATE whatsapp_campaign_recipients 
           SET status = 'SENT', msg_id = ?, sent_at = NOW(), error_message = NULL
           WHERE id = ?`,
          [sendRes.msgId || null, recipient.id]
        );
      } else {
        batchFailed++;
        const failStatus = sendRes.notOnWhatsApp ? 'SKIPPED_NO_WHATSAPP' : 'FAILED';
        await pool.query(
          `UPDATE whatsapp_campaign_recipients 
           SET status = ?, error_message = ?
           WHERE id = ?`,
          [failStatus, sendRes.error || 'Échec de transmission', recipient.id]
        );
      }

      // Update campaign counters in real-time
      await pool.query(
        `UPDATE whatsapp_campaigns 
         SET sent_count = sent_count + ?, failed_count = failed_count + ?
         WHERE id = ?`,
        [sendRes.success ? 1 : 0, sendRes.success ? 0 : 1, id]
      );

      // Apply anti-ban humanized delay between messages (skip after last in batch)
      if (i < pendingRecipients.length - 1) {
        const jitterSeconds = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
        await sleep(jitterSeconds * 1000);
      }
    }

    // Check remaining pending recipients
    const [countRows]: any = await pool.query(
      `SELECT COUNT(*) as remaining FROM whatsapp_campaign_recipients WHERE campaign_id = ? AND status = 'PENDING'`,
      [id]
    );
    const remainingCount = countRows[0]?.remaining || 0;

    if (remainingCount === 0) {
      await pool.query(
        `UPDATE whatsapp_campaigns SET status = 'COMPLETED', completed_at = NOW() WHERE id = ?`,
        [id]
      );
    }

    return NextResponse.json({
      success: true,
      processedCount: pendingRecipients.length,
      batchSuccess,
      batchFailed,
      remainingCount,
      completed: remainingCount === 0,
    });
  } catch (err: any) {
    console.error('[Dispatch Campaign Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur lors du lancement de la campagne' },
      { status: 500 }
    );
  }
}

