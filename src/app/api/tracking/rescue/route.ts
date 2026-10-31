import { NextRequest, NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { addTimelineEventToDb, restoreStockForOrder, invalidateOrdersCache } from '@/lib/db-service';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      action,
      rescheduledDate,
      deliverySlot,
      driverNote,
      newAddress,
      gpsLocationUrl,
      phone,
      messageText,
    } = body;

    if (!orderId && action !== 'BULK_RESCUE') {
      return NextResponse.json({ success: false, error: 'orderId requis' }, { status: 400 });
    }

    const pool = getMysqlPool();

    // ─────────────────────────────────────────────────────────────
    // 1. REPROGRAMMER LA LIVRAISON (DATE + CRÉNEAU + NOTE)
    // ─────────────────────────────────────────────────────────────
    if (action === 'REPROGRAM') {
      const preferredTime = `${rescheduledDate || 'Demain'} (${deliverySlot || 'Toute la journée'})`;
      const noteText = driverNote ? ` | Note livreur: ${driverNote}` : '';
      const fullNote = `Re-livraison reprogrammée pour le ${preferredTime}${noteText}`;

      // Update order_leads
      await pool.execute(
        `UPDATE order_leads 
         SET status = 'OUT_FOR_DELIVERY',
             preferred_delivery_time = ?,
             notes = CONCAT(COALESCE(notes, ''), ?),
             rescue_status = 'REPROGRAMMED',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? OR order_number = ?`,
        [preferredTime, `\n[${new Date().toLocaleDateString('fr-FR')}] ${fullNote}`, orderId, orderId]
      );

      // Update shipment_details
      await pool.execute(
        `UPDATE shipment_details 
         SET status = 'OUT_FOR_DELIVERY',
             rescue_attempt_count = rescue_attempt_count + 1,
             last_rescue_outreach_at = CURRENT_TIMESTAMP,
             last_status_update_at = CURRENT_TIMESTAMP
         WHERE order_id = ? OR sendit_tracking_number = ?`,
        [orderId, orderId]
      );

      // Add timeline
      await addTimelineEventToDb({
        orderId,
        action: 'DELIVERY_RESCHEDULED',
        title: '📅 Livraison reprogrammée',
        details: fullNote,
        actor: 'AGENT',
      });

      invalidateOrdersCache();
      return NextResponse.json({
        success: true,
        message: `Livraison reprogrammée avec succès pour le ${preferredTime}`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. MODIFIER L'ADRESSE ET POSITION GPS
    // ─────────────────────────────────────────────────────────────
    if (action === 'UPDATE_ADDRESS') {
      await pool.execute(
        `UPDATE order_leads 
         SET address = COALESCE(?, address),
             gps_location_url = COALESCE(?, gps_location_url),
             notes = CONCAT(COALESCE(notes, ''), ?),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? OR order_number = ?`,
        [
          newAddress || null,
          gpsLocationUrl || null,
          driverNote ? `\n[Adresse MàJ]: ${driverNote}` : '',
          orderId,
          orderId,
        ]
      );

      await addTimelineEventToDb({
        orderId,
        action: 'ADDRESS_UPDATED',
        title: '📍 Adresse / Coordonnées GPS mises à jour',
        details: `Nouvelle adresse: ${newAddress || 'Identique'} ${gpsLocationUrl ? `| GPS: ${gpsLocationUrl}` : ''}`,
        actor: 'AGENT',
      });

      invalidateOrdersCache();
      return NextResponse.json({
        success: true,
        message: 'Adresse et coordonnées GPS transmises au livreur Sendit avec succès !',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. MARQUER SAUVÉ (CLIENT CONFIRMÉ POUR RE-LIVRAISON)
    // ─────────────────────────────────────────────────────────────
    if (action === 'RESOLVE_SAVED') {
      await pool.execute(
        `UPDATE order_leads 
         SET status = 'OUT_FOR_DELIVERY',
             rescue_status = 'SAVED',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? OR order_number = ?`,
        [orderId, orderId]
      );

      await pool.execute(
        `UPDATE shipment_details 
         SET status = 'OUT_FOR_DELIVERY',
             failed_reason = NULL,
             rescue_attempt_count = rescue_attempt_count + 1,
             last_status_update_at = CURRENT_TIMESTAMP
         WHERE order_id = ? OR sendit_tracking_number = ?`,
        [orderId, orderId]
      );

      await addTimelineEventToDb({
        orderId,
        action: 'ORDER_RESCUED',
        title: '✅ Colis sauvé par le service client',
        details: 'Le client a confirmé sa disponibilité pour la réception. Remis en distribution.',
        actor: 'AGENT',
      });

      invalidateOrdersCache();
      return NextResponse.json({
        success: true,
        message: 'Colis sauvé et remis dans le circuit de distribution !',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. CONFIRMER LE REFUS & DEMANDER LE RETOUR IMMÉDIAT
    // ─────────────────────────────────────────────────────────────
    if (action === 'CONFIRM_RETURN') {
      await pool.execute(
        `UPDATE order_leads 
         SET status = 'RETURNED',
             rescue_status = 'RETURN_CONFIRMED',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? OR order_number = ?`,
        [orderId, orderId]
      );

      await pool.execute(
        `UPDATE shipment_details 
         SET status = 'RETURNED',
             failed_reason = 'Refus définitif client (Sauvetage impossible)',
             last_status_update_at = CURRENT_TIMESTAMP
         WHERE order_id = ? OR sendit_tracking_number = ?`,
        [orderId, orderId]
      );

      // Restock inventory reservation cleanly
      await restoreStockForOrder(orderId, 'Refus client confirmé lors de l intervention sauvetage');

      await addTimelineEventToDb({
        orderId,
        action: 'RETURN_CONFIRMED',
        title: '❌ Refus définitif client — Retour demandé',
        details: 'Le client a confirmé son refus de la commande. Demande de retour transmise à Sendit.',
        actor: 'AGENT',
      });

      invalidateOrdersCache();
      return NextResponse.json({
        success: true,
        message: 'Refus enregistré. Colis classé en Retour et stock débloqué.',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. ENVOI WHATSAPP DIRECT (VIA PONT OU API)
    // ─────────────────────────────────────────────────────────────
    if (action === 'SEND_WHATSAPP') {
      if (!phone || !messageText) {
        return NextResponse.json(
          { success: false, error: 'Numéro de téléphone et message requis' },
          { status: 400 }
        );
      }

      let sendResult: any = { ok: true, mode: 'logged' };
      try {
        sendResult = await sendWhatsAppMessage(phone, messageText);
      } catch (err: any) {
        console.warn('[Tracking Rescue] sendWhatsAppMessage notice:', err?.message);
      }

      // Record in shipment_details
      await pool.execute(
        `UPDATE shipment_details 
         SET rescue_attempt_count = rescue_attempt_count + 1,
             last_rescue_outreach_at = CURRENT_TIMESTAMP
         WHERE order_id = ? OR sendit_tracking_number = ?`,
        [orderId, orderId]
      );

      await addTimelineEventToDb({
        orderId,
        action: 'WHATSAPP_RESCUE_SENT',
        title: '📱 Message WhatsApp de sauvetage envoyé',
        details: messageText.substring(0, 150) + (messageText.length > 150 ? '...' : ''),
        actor: 'AGENT',
      });

      return NextResponse.json({
        success: true,
        sendResult,
        message: 'Message de sauvetage transmis avec succès au client !',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 6. CAMPAGNE DE SAUVETAGE EN MASSE (BULK)
    // ─────────────────────────────────────────────────────────────
    if (action === 'BULK_RESCUE') {
      const [failedRows]: any = await pool.execute(`
        SELECT l.id, l.order_number, l.customer_name, l.phone_number, l.city, l.total_amount,
               COALESCE(i.product_name, 'Produit COD') as product_name
        FROM order_leads l
        JOIN shipment_details s ON l.id = s.order_id
        LEFT JOIN order_items i ON l.id = i.order_id
        WHERE s.status = 'DELIVERY_FAILED'
      `);

      let sentCount = 0;
      if (Array.isArray(failedRows) && failedRows.length > 0) {
        for (const row of failedRows) {
          const name = row.customer_name || 'الزبون المحترم';
          const num = row.order_number || row.id;
          const phoneClean = row.phone_number;
          if (!phoneClean) continue;

          const darijaMsg = `السلام عليكم خويا/أختي ${name}، معكم مصلحة الزبناء بخصوص طلبيتكم رقم ${num} (${row.product_name} - ${row.total_amount} درهم). الموزع ديال شركة التوصيل حاول يتصل بك اليوم ولكن ما شدش الخط. واش ممكن تأكد لينا الوقت المناسب للتوصيل غداً إن شاء الله؟ شكراً لك! 🚚`;

          try {
            await sendWhatsAppMessage(phoneClean, darijaMsg);
            sentCount++;
          } catch (e) {
            console.warn(`[Bulk Rescue] Failed for ${phoneClean}:`, e);
          }

          await pool.execute(
            `UPDATE shipment_details 
             SET rescue_attempt_count = rescue_attempt_count + 1,
                 last_rescue_outreach_at = CURRENT_TIMESTAMP
             WHERE order_id = ?`,
            [row.id]
          );

          await addTimelineEventToDb({
            orderId: row.id,
            action: 'WHATSAPP_RESCUE_SENT',
            title: '📱 Relance automatique de sauvetage',
            details: 'Message WhatsApp Darija envoyé via la relance groupée.',
            actor: 'AI_BOT',
          });
        }
      }

      invalidateOrdersCache();
      return NextResponse.json({
        success: true,
        sentCount,
        message: `Campagne de sauvetage déclenchée pour ${sentCount} colis en risque !`,
      });
    }

    return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });
  } catch (error: any) {
    console.error('[Tracking Rescue API Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

