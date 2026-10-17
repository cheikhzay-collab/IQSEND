// Placeholder environment variables (to be set in .env.local)
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || '';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';

/**
 * Send a WhatsApp text message via a generic WhatsApp Business API endpoint.
 * @param to Recipient phone number in international format (e.g., '+2126...')
 * @param message Text content to send
 */
export async function sendWhatsAppMessage(to: string, message: string) {
  if (!WHATSAPP_API_URL || !WHATSAPP_TOKEN) {
    console.warn('WhatsApp integration not configured');
    return;
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
        to,
        type: 'text',
        text: { body: message },
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API responded with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to send WhatsApp message', error);
    throw error;
  }
}

/**
 * Simple fetcher for inbound webhook verification (GET) – echo back the challenge.
 * This is typically required for Facebook/Meta verification.
 */
export function verifyWebhookChallenge(challenge: string) {
  return challenge;
}
