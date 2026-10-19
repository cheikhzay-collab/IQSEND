import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEffectiveGeminiKey, getEffectiveGeminiModel } from '@/lib/gemini-agent';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { recordOutboundMessage, toggleAiActive } from '@/lib/inbox-store';
import { getStageMessageConfig } from '@/lib/order-stage-messages';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action = 'generate',
      stage = 'PENDING_CONFIRMATION',
      orderNumber = '#AT1001',
      customerName = 'Cher client',
      phone = '',
      city = 'Maroc',
      productName = 'Article commandé',
      amount = 299,
      currency = 'MAD',
      language = 'french',
      customPrompt = '',
      messageText = '',
      tone = 'polite',
      notes = '',
    } = body;

    // ─────────────────────────────────────────────────────────
    // 1. ACTION: GENERATE SMART AGENT MESSAGE VIA GEMINI AI
    // ─────────────────────────────────────────────────────────
    if (action === 'generate') {
      const apiKey = getEffectiveGeminiKey();
      const stageConfig = getStageMessageConfig(stage);

      // Default fallback templates
      let fallbackText = '';
      if (language === 'darija') {
        fallbackText = stageConfig.darija({
          id: 'temp',
          orderNumber,
          status: stage as any,
          badgeType: 'COD PENDING',
          amount,
          currency,
          productName,
          productThumbnail: '',
          customerName,
          city,
          countryCode: 'MA',
          phone,
          timeAgo: 'Maintenant',
        });
      } else if (language === 'arabic') {
        fallbackText = stageConfig.arabic({
          id: 'temp',
          orderNumber,
          status: stage as any,
          badgeType: 'COD PENDING',
          amount,
          currency,
          productName,
          productThumbnail: '',
          customerName,
          city,
          countryCode: 'MA',
          phone,
          timeAgo: 'Maintenant',
        });
      } else {
        fallbackText = stageConfig.french({
          id: 'temp',
          orderNumber,
          status: stage as any,
          badgeType: 'COD PENDING',
          amount,
          currency,
          productName,
          productThumbnail: '',
          customerName,
          city,
          countryCode: 'MA',
          phone,
          timeAgo: 'Maintenant',
        });
      }

      if (customPrompt && customPrompt.trim()) {
        fallbackText += `\n\n(Note : ${customPrompt.trim()})`;
      }

      if (!apiKey || apiKey.length < 15) {
        return NextResponse.json({
          success: true,
          source: 'rule_fallback',
          message: fallbackText,
          model: 'Moteur de règles Sendit (Mode local)',
        });
      }

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = getEffectiveGeminiModel();
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 350,
          },
        });

        const toneInstruction =
          tone === 'urgent'
            ? 'Tonalité : Urgente mais courtoise, insistant sur l arrivée imminente du chauffeur et la préparation du montant espèces.'
            : tone === 'upsell'
            ? 'Tonalité : Commerciale et valorisante, proposant une offre spéciale ou réduction sur un article complémentaire.'
            : tone === 'review'
            ? 'Tonalité : Chaleureuse et reconnaissante, sollicitant un retour d expérience positif et un avis 5 étoiles.'
            : 'Tonalité : Très polie, professionnelle et rassurante pour le client.';

        const langInstruction =
          language === 'darija'
            ? 'Langue : Darija marocain authentique en caractères arabes (très fluide, naturel et chaleureux).'
            : language === 'arabic'
            ? 'Langue : Arabe standard moderne clair, simple et courtois.'
            : 'Langue : Français commercial soigné, courtois et dynamique (style e-commerce premium marocain).';

        const prompt = `
Tu es l'Agent IA d'assistance clientèle de la plateforme e-commerce Sendit au Maroc (spécialisée dans le Cash On Delivery / COD).
Ta mission : rédiger un message WhatsApp personnalisé, percutant et rassurant, parfaitement adapté à l'étape actuelle de la commande.

Détails de la commande :
- Numéro de commande : ${orderNumber}
- Nom du client : ${customerName}
- Ville de livraison : ${city}
- Produit commandé : ${productName}
- Montant total COD (Paiement à la livraison) : ${amount} ${currency}
- Étape actuelle du cycle : ${stageConfig.stageNameFr}
- Notes antérieures : ${notes || 'Aucune note particulière'}
- Instruction spécifique du marchand : ${customPrompt || 'Rédiger un message clair et efficace adapté à l étape'}
- ${toneInstruction}
- ${langInstruction}

Directives strictes :
1. Rédige DIRECTEMENT le message prêt à être envoyé sur WhatsApp avec des émojis professionnels et chaleureux.
2. Mentionne toujours le prénom du client, le numéro de commande, le nom du produit et le montant en Dirhams (MAD).
3. Ne mets JAMAIS d'explications internes, de balises "Plan:" ou de méta-texte. Renvoie uniquement le texte final du message.
`;

        const result = await model.generateContent(prompt);
        const generatedText = result.response.text().trim();

        return NextResponse.json({
          success: true,
          source: 'gemini_ai',
          message: generatedText || fallbackText,
          model: `Gemini (${modelName})`,
        });
      } catch (geminiErr: any) {
        console.warn('[Agent Intervention] Gemini API notice:', geminiErr?.message);
        return NextResponse.json({
          success: true,
          source: 'fallback_after_error',
          message: fallbackText,
          errorNotice: geminiErr?.message,
        });
      }
    }

    // ─────────────────────────────────────────────────────────
    // 2. ACTION: SEND MESSAGE DIRECTLY VIA WHATSAPP
    // ─────────────────────────────────────────────────────────
    if (action === 'send') {
      const finalMsg = messageText || customPrompt;
      if (!phone || !finalMsg) {
        return NextResponse.json(
          { success: false, error: 'Numéro de téléphone et message sont obligatoires.' },
          { status: 400 }
        );
      }

      // 1. Dispatch via configured WhatsApp provider (Baileys live bridge / Meta Cloud)
      const sendResult = await sendWhatsAppMessage(phone, finalMsg);

      // 2. Persist to MySQL whatsapp_messages table
      try {
        const { logWhatsAppMessageToDb } = await import('@/lib/db-service');
        await logWhatsAppMessageToDb({
          phone,
          sender: 'AGENT',
          body: finalMsg,
          messageType: 'text',
        });
      } catch (dbErr) {
        console.warn('[Agent Intervention] DB log notice:', dbErr);
      }

      // 3. Record in inbox store
      const updatedConv = recordOutboundMessage({
        phone,
        text: finalMsg,
        sender: 'AGENT',
      });

      return NextResponse.json({
        success: true,
        sendResult,
        conversation: updatedConv,
        message: 'Message envoyé avec succès au client via WhatsApp !',
      });
    }

    // ─────────────────────────────────────────────────────────
    // 3. ACTION: TOGGLE HUMAN AGENT TAKEOVER
    // ─────────────────────────────────────────────────────────
    if (action === 'toggle_takeover') {
      const { isAiActive = false } = body;
      const updated = toggleAiActive(phone, isAiActive);
      return NextResponse.json({
        success: true,
        conversation: updated,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Action non reconnue.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[Agent Intervention Route Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
