import { NextRequest, NextResponse } from 'next/server';
import {
  processCustomerWhatsAppMessage,
  processCustomerVoiceNote,
  processCustomerImage,
  OrderContext,
  getEffectiveGeminiKey,
  getEffectiveGeminiModel,
} from '@/lib/gemini-agent';
import { getInboundOrders, findOrdersByPhone } from '@/lib/orders-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const {
      message = '',
      mediaType = 'text',
      audio,
      image,
      conversationHistory = [],
      phone = '0670114455',
      customerName = 'محمد الإدريسي',
      city = 'الدار البيضاء',
    } = body;

    // Validate that at least one of message, audio, or image is provided
    const isAudio = mediaType === 'audio' || Boolean(audio);
    const isImage = mediaType === 'image' || Boolean(image);

    if (!isAudio && !isImage && (!message || !message.trim())) {
      return NextResponse.json(
        { success: false, error: 'Un message texte, une note vocale audio ou une image est requis' },
        { status: 400 }
      );
    }

    const effectiveKey = getEffectiveGeminiKey();
    const isLiveApiActive = Boolean(effectiveKey && effectiveKey.length > 15);

    // Look for matching order by phone or default test order
    const matchedOrders = findOrdersByPhone(phone);
    const matchedOrder = matchedOrders[0] || getInboundOrders()[0];

    // Format conversation history for Gemini context
    const formattedHistory = Array.isArray(conversationHistory)
      ? conversationHistory.map((msg: any) => ({
          sender: msg.role === 'user' ? ('CUSTOMER' as const) : ('AI_BOT' as const),
          body: String(msg.text || msg.body || ''),
          timestamp: new Date().toISOString(),
        }))
      : [];

    const orderContext: OrderContext = {
      orderId: matchedOrder?.id || 'lead_sim_1',
      orderNumber: matchedOrder?.orderNumber || '#AT1048',
      customerName: matchedOrder?.customer?.name || customerName,
      phoneNumber: matchedOrder?.customer?.phone || phone,
      city: matchedOrder?.customer?.city || city,
      address: matchedOrder?.customer?.address || 'المعاريف، الدار البيضاء',
      totalAmount: matchedOrder?.payment?.amount || 399,
      items: (matchedOrder?.items || []).map((it) => ({
        name: it.name,
        sku: it.sku,
        quantity: it.quantity,
        price: it.price,
      })),
      conversationHistory: formattedHistory,
    };

    let toolExecuted: string | undefined;
    const databaseHandlers = {
      onConfirm: async (args: any) => {
        toolExecuted = `confirm_order_and_address (Ville: ${args.verifiedCity})`;
      },
      onUpdateDetails: async (args: any) => {
        toolExecuted = `update_order_details (${args.newSize || ''} ${args.updatedPrice ? args.updatedPrice + ' MAD' : ''})`;
      },
      onSaveGps: async (args: any) => {
        toolExecuted = `save_gps_location (${args.googleMapsUrl})`;
      },
      onCancel: async (args: any) => {
        toolExecuted = `cancel_order (${args.reason})`;
      },
      onHandover: async (args: any) => {
        toolExecuted = `request_human_handover (${args.reason})`;
      },
      onSendProductImages: async (args: any) => {
        toolExecuted = `send_product_images (${args.productNameOrSku})`;
      },
    };

    // ─────────────────────────────────────────────────────────────
    // 1. AUDIO / VOICE NOTE SIMULATION
    // ─────────────────────────────────────────────────────────────
    if (isAudio) {
      const audioBase64 = audio?.base64 || 'UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='; // 1-sec empty wav if mock
      const audioMime = audio?.mimetype || 'audio/ogg';
      const hintText = audio?.hintText || message || '';

      const voiceResult = await processCustomerVoiceNote(
        audioBase64,
        audioMime,
        orderContext,
        databaseHandlers,
        hintText
      );

      const latencyMs = Date.now() - startTime;
      const tokensCount = Math.round((voiceResult.replyText.length + 80) / 3.2) + 24;

      return NextResponse.json({
        success: true,
        mediaType: 'audio',
        isLiveApiActive,
        transcription: voiceResult.transcription,
        replyText: voiceResult.replyText,
        toolCalled: voiceResult.toolCalled || toolExecuted,
        toolDetails: voiceResult.toolDetails,
        requiresHumanHandover: voiceResult.requiresHumanHandover,
        model: isLiveApiActive
          ? `Google Gemini Multimodal Audio (${getEffectiveGeminiModel()})`
          : 'Moteur de Reconnaissance Vocale Darija (Mode Fallback)',
        latencyMs,
        tokensCount,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. IMAGE / VISION AI SIMULATION
    // ─────────────────────────────────────────────────────────────
    if (isImage) {
      const imageBase64 = image?.base64 || 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const imageMime = image?.mimetype || 'image/jpeg';
      const caption = image?.caption || message || '';
      const presetHint = image?.presetHint || '';

      const visionResult = await processCustomerImage(
        imageBase64,
        imageMime,
        caption,
        orderContext,
        databaseHandlers,
        presetHint
      );

      const latencyMs = Date.now() - startTime;
      const tokensCount = Math.round((visionResult.replyText.length + 120) / 3.2) + 40;

      return NextResponse.json({
        success: true,
        mediaType: 'image',
        isLiveApiActive,
        imageAnalysis: {
          category: visionResult.imageAnalysis.category,
          detectedCategory: visionResult.imageAnalysis.category,
          detectedDescription: visionResult.imageAnalysis.detectedDescription,
          description: visionResult.imageAnalysis.detectedDescription,
          matchedProduct: visionResult.imageAnalysis.matchedProduct,
          confidence: visionResult.imageAnalysis.confidence,
          suggestedAction:
            visionResult.imageAnalysis.category === 'DEFECT_CLAIM'
              ? 'Remplacement gratuit Sendit & Transfert SAV'
              : visionResult.imageAnalysis.category === 'PAYMENT_RECEIPT'
              ? 'Validation de preuve de virement & expédition'
              : visionResult.imageAnalysis.category === 'LOCATION_MAP'
              ? 'Position GPS enregistrée pour la feuille de route'
              : 'Appariement catalogue produit & proposition de commande COD',
        },
        replyText: visionResult.replyText,
        toolCalled: visionResult.toolCalled || toolExecuted,
        toolDetails: visionResult.toolDetails,
        requiresHumanHandover: visionResult.requiresHumanHandover,
        model: isLiveApiActive
          ? `Google Gemini Vision Multimodal (${getEffectiveGeminiModel()})`
          : 'Moteur de Vision & Reconnaissance d\'Images (Mode Fallback)',
        latencyMs,
        tokensCount,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. STANDARD TEXT SIMULATION
    // ─────────────────────────────────────────────────────────────
    const aiResult = await processCustomerWhatsAppMessage(message.trim(), orderContext, databaseHandlers);

    const latencyMs = Date.now() - startTime;
    const tokensCount = Math.round((message.length + (aiResult.replyText?.length || 0)) / 3.2) + (aiResult.toolCalled ? 42 : 12);

    return NextResponse.json({
      success: true,
      mediaType: 'text',
      isLiveApiActive,
      replyText: aiResult.replyText,
      toolCalled: aiResult.toolCalled || toolExecuted,
      toolDetails: aiResult.toolDetails,
      requiresHumanHandover: aiResult.requiresHumanHandover,
      model: isLiveApiActive
        ? `Google Gemini (${getEffectiveGeminiModel()}) - Live API`
        : 'Moteur de Règles Darija (Mode Fallback)',
      latencyMs,
      tokensCount,
    });
  } catch (err: any) {
    console.error('[API agent/simulate] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur lors de la simulation IA' },
      { status: 500 }
    );
  }
}
