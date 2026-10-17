/**
 * WhatsApp Business & Cloud API Client for Moroccan COD Operations
 * Handles interactive confirmation buttons, GPS location requests, media, and text notifications.
 */

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || '';
const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_TOKEN || '';

export interface WhatsAppButton {
  id: string;
  title: string;
}

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
 * Send standard WhatsApp text message
 */
export async function sendWhatsAppMessage(to: string, message: string) {
  const formattedPhone = formatMoroccanPhoneForWhatsApp(to);

  // If credentials are placeholders or in test/dev mode without live WhatsApp endpoint, log gracefully
  if (!WHATSAPP_API_URL || WHATSAPP_API_URL.includes('votre-domaine.com') || !WHATSAPP_TOKEN) {
    console.log(`[WhatsApp Mock/Simulated] 📱 Text to ${formattedPhone}: "${message}"`);
    return { success: true, simulated: true, recipient: formattedPhone };
  }

  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
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
      const errBody = await response.text();
      console.warn(`WhatsApp API response status ${response.status}:`, errBody);
      return { success: false, status: response.status, error: errBody };
    }

    return await response.json();
  } catch (error: any) {
    console.error('Failed to send WhatsApp message:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send interactive buttons message (e.g. Confirm Order / Modify)
 */
export async function sendInteractiveButtons(to: string, bodyText: string, buttons: WhatsAppButton[], headerText?: string) {
  const formattedPhone = formatMoroccanPhoneForWhatsApp(to);

  if (!WHATSAPP_API_URL || WHATSAPP_API_URL.includes('votre-domaine.com') || !WHATSAPP_TOKEN) {
    console.log(`[WhatsApp Mock/Simulated] 🔘 Interactive Buttons to ${formattedPhone}:`, {
      header: headerText,
      body: bodyText,
      buttons: buttons.map(b => b.title),
    });
    return { success: true, simulated: true, recipient: formattedPhone, buttons };
  }

  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
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
                title: btn.title.slice(0, 20), // WhatsApp max 20 chars
              },
            })),
          },
        },
      }),
    });

    if (!response.ok) {
      // Fallback to text message if interactive buttons are rejected by provider
      const fallbackText = `${bodyText}\n\n👉 أجب بـ: ${buttons.map(b => `[${b.title}]`).join(' أو ')}`;
      return await sendWhatsAppMessage(to, fallbackText);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Failed to send WhatsApp interactive buttons:', error.message);
    const fallbackText = `${bodyText}\n\n👉 أجب بـ: ${buttons.map(b => `[${b.title}]`).join(' أو ')}`;
    return await sendWhatsAppMessage(to, fallbackText);
  }
}

/**
 * Send Media Showcase message (image or video with caption)
 */
export async function sendWhatsAppMedia(to: string, mediaUrl: string, mediaType: 'image' | 'video', caption: string) {
  const formattedPhone = formatMoroccanPhoneForWhatsApp(to);

  if (!WHATSAPP_API_URL || WHATSAPP_API_URL.includes('votre-domaine.com') || !WHATSAPP_TOKEN) {
    console.log(`[WhatsApp Mock/Simulated] 🖼️ Media (${mediaType}) to ${formattedPhone}: ${mediaUrl} - "${caption}"`);
    return { success: true, simulated: true, recipient: formattedPhone, mediaUrl };
  }

  try {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: mediaType,
    };
    payload[mediaType] = { link: mediaUrl, caption };

    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return await sendWhatsAppMessage(to, `${caption}\n🔗 ${mediaUrl}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Failed to send WhatsApp media:', error.message);
    return await sendWhatsAppMessage(to, `${caption}\n🔗 ${mediaUrl}`);
  }
}

/**
 * Simple fetcher for inbound webhook verification (GET)
 */
export function verifyWebhookChallenge(challenge: string) {
  return challenge;
}
