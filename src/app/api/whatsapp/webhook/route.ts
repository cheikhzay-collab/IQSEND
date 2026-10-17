import { NextResponse } from 'next/server';
import { sendWhatsAppMessage, verifyWebhookChallenge } from '@/lib/whatsapp';

// GET: verification challenge (Facebook/Meta webhook verification)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(verifyWebhookChallenge(challenge), { status: 200 });
  }
  return new NextResponse('Verification failed', { status: 403 });
}

// POST: inbound messages from WhatsApp Business API
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('WhatsApp inbound webhook payload:', JSON.stringify(payload, null, 2));
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages;
    if (messages && messages.length > 0) {
      const msg = messages[0];
      const from = msg.from;
      const text = msg.text?.body || '';
      const reply = `Merci pour votre message : "${text}". Nous le traitons sous peu.`;
      await sendWhatsAppMessage(from, reply);
    }
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (err) {
    console.error('Error handling WhatsApp webhook:', err);
    return new NextResponse('Bad Request', { status: 400 });
  }
}
