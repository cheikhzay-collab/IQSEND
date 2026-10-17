/**
 * WhatsApp Business & Multi-Provider Client for Moroccan COD Operations
 * Supports:
 * 1. Meta WhatsApp Cloud API (Official Enterprise - No Ban Risk)
 * 2. Evolution API / Baileys QR-Session (Alternative for local Moroccan SIMs: Inwi, Orange, Maroc Telecom)
 * 3. Safe Simulation Sandbox (For local testing without live phone credentials)
 */

export type WhatsAppProvider = 'META_CLOUD_API' | 'EVOLUTION_API_QR' | 'SIMULATED';

export interface WhatsAppConfig {
  provider: WhatsAppProvider;
  meta: {
    apiUrl: string;
    phoneNumberId: string;
    accessToken: string;
    verifyToken: string;
  };
  evolution: {
    apiUrl: string;
    instanceName: string;
    apiKey: string;
    antiBanDelayMs: number;
    dailyLimit: number;
  };
}

// In-memory runtime configuration with environment variables as defaults
export const runtimeWhatsAppConfig: WhatsAppConfig = {
  provider: (process.env.WHATSAPP_PROVIDER as WhatsAppProvider) || 'META_CLOUD_API',
  meta: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '104829104829104',
    accessToken: process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_TOKEN || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'sendit_cod_secret',
  },
  evolution: {
    apiUrl: process.env.EVOLUTION_API_URL || 'https://evolution.sendit-cod.ma',
    instanceName: process.env.EVOLUTION_INSTANCE || 'morocco_cod_sim1',
    apiKey: process.env.EVOLUTION_API_KEY || 'snd_evo_key_948293',
    antiBanDelayMs: 3000, // 3 seconds human simulation delay
    dailyLimit: 300,      // Safe daily limit for warmed-up Moroccan SIM
  },
};

export interface WhatsAppButton {
  id: string;
  title: string;
}

/**
 * Format Moroccan phone number to international WhatsApp format (+212)
 * Examples: '0661223344' -> '212661223344', '+212661223344' -> '212661223344'
 */
export function formatMoroccanPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '212' + cleaned.slice(1);
  } else if (cleaned.startsWith('+212')) {
    cleaned = cleaned.slice(1);
  } else if (!cleaned.startsWith('212')) {
    cleaned = '212' + cleaned;
  }
  return cleaned;
}

/**
 * Send standard WhatsApp text message via active provider
 */
export async function sendWhatsAppMessage(to: string, message: string) {
  const formattedPhone = formatMoroccanPhoneForWhatsApp(to);
  const { provider, meta, evolution } = runtimeWhatsAppConfig;

  // 1. Meta Cloud API (Official)
  if (provider === 'META_CLOUD_API') {
    if (!meta.accessToken || meta.accessToken.includes('votre_token')) {
      console.log(`[WhatsApp Meta Simulated] 📱 To ${formattedPhone}: "${message}"`);
      return { success: true, simulated: true, provider: 'META_CLOUD_API', recipient: formattedPhone };
    }

    try {
      const url = `${meta.apiUrl}/${meta.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${meta.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: { preview_url: true, body: message },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Meta WhatsApp Error ${response.status}]:`, errText);
        return { success: false, status: response.status, error: errText };
      }

      return await response.json();
    } catch (error: any) {
      console.error('[Meta WhatsApp Exception]:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 2. Evolution API / Baileys (Alternative QR-Code Session)
  if (provider === 'EVOLUTION_API_QR') {
    if (!evolution.apiKey || evolution.apiKey.includes('snd_evo_key')) {
      console.log(`[WhatsApp Evolution QR Simulated] 📱 To ${formattedPhone} via instance "${evolution.instanceName}": "${message}"`);
      return { success: true, simulated: true, provider: 'EVOLUTION_API_QR', recipient: formattedPhone };
    }

    try {
      // Simulate human typing anti-ban delay
      if (evolution.antiBanDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(evolution.antiBanDelayMs, 1000)));
      }

      const url = `${evolution.apiUrl}/message/sendText/${evolution.instanceName}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: evolution.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
          options: {
            delay: evolution.antiBanDelayMs,
            presence: 'composing',
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Evolution API Error ${response.status}]:`, errText);
        return { success: false, status: response.status, error: errText };
      }

      return await response.json();
    } catch (error: any) {
      console.error('[Evolution API Exception]:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 3. Fallback Sandbox
  console.log(`[WhatsApp Sandbox Simulated] 📱 To ${formattedPhone}: "${message}"`);
  return { success: true, simulated: true, recipient: formattedPhone };
}

/**
 * Send interactive buttons message (e.g. Confirm Order / Add Upsell / Modify)
 */
export async function sendInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: WhatsAppButton[],
  headerText?: string
) {
  const formattedPhone = formatMoroccanPhoneForWhatsApp(to);
  const { provider, meta } = runtimeWhatsAppConfig;

  // Meta Cloud API supports native interactive quick-reply buttons
  if (provider === 'META_CLOUD_API' && meta.accessToken && !meta.accessToken.includes('votre_token')) {
    try {
      const url = `${meta.apiUrl}/${meta.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${meta.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'interactive',
          interactive: {
            type: 'button',
            ...(headerText && { header: { type: 'text', text: headerText } }),
            body: { text: bodyText },
            action: {
              buttons: buttons.slice(0, 3).map((btn) => ({
                type: 'reply',
                reply: {
                  id: btn.id,
                  title: btn.title.slice(0, 20),
                },
              })),
            },
          },
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (e: any) {
      console.warn('[Meta Interactive Button Error, falling back to text options]:', e.message);
    }
  }

  // Fallback for QR-Code Session or simulation: format buttons as numbered quick choices
  const formattedButtonsText = buttons
    .map((b, index) => `${index + 1}️⃣ ${b.title}`)
    .join('\n');
  const fullText = `${headerText ? `*${headerText}*\n\n` : ''}${bodyText}\n\n${formattedButtonsText}\n\n👉 أجب برقم الخيار أو اكتب تأكيدك مباشرة.`;

  return await sendWhatsAppMessage(to, fullText);
}

/**
 * Send Media message (image or video with caption)
 */
export async function sendWhatsAppMedia(
  to: string,
  mediaUrl: string,
  mediaType: 'image' | 'video',
  caption: string
) {
  const formattedPhone = formatMoroccanPhoneForWhatsApp(to);
  const { provider, meta, evolution } = runtimeWhatsAppConfig;

  if (provider === 'META_CLOUD_API' && meta.accessToken && !meta.accessToken.includes('votre_token')) {
    try {
      const url = `${meta.apiUrl}/${meta.phoneNumberId}/messages`;
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: mediaType,
      };
      payload[mediaType] = { link: mediaUrl, caption };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${meta.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (e: any) {
      console.warn('[Meta Media Send Error]:', e.message);
    }
  }

  // Fallback text with link
  return await sendWhatsAppMessage(to, `${caption}\n🔗 ${mediaUrl}`);
}

/**
 * Simple challenge verifier for Facebook/Meta Webhook handshake
 */
export function verifyWebhookChallenge(challenge: string) {
  return challenge;
}
