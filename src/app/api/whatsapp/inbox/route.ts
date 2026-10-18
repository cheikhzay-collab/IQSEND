import { NextResponse } from 'next/server';
import {
  getInboxConversations,
  recordOutboundMessage,
  toggleAiActive,
} from '@/lib/inbox-store';
import { sendWhatsAppDirectMessage } from '@/lib/whatsapp/baileys-service';

export const dynamic = 'force-dynamic';

// GET: Return all active WhatsApp conversations
export async function GET() {
  const conversations = getInboxConversations();
  return NextResponse.json({
    success: true,
    conversations,
  });
}

// POST: Human agent sends a message to customer via WhatsApp
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, text, action, chatId, isAiActive } = body;

    // Toggle AI takeover mode
    if (action === 'toggle_ai') {
      const updated = toggleAiActive(chatId || phone, isAiActive);
      return NextResponse.json({
        success: true,
        conversation: updated,
      });
    }

    if (!phone || !text) {
      return NextResponse.json(
        { success: false, error: 'Phone and text are required' },
        { status: 400 }
      );
    }

    // 1. Send message via Baileys direct WhatsApp session
    const sendResult = await sendWhatsAppDirectMessage(phone, text);

    // 2. Record outbound human message in store & turn off AI for this customer
    const updatedConv = recordOutboundMessage({
      phone,
      text,
      sender: 'AGENT',
    });

    return NextResponse.json({
      success: true,
      sendResult,
      conversation: updatedConv,
    });
  } catch (error: any) {
    console.error('[Inbox API] Error handling request:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update takeover status
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { chatId, isAiActive } = body;
    const updated = toggleAiActive(chatId, isAiActive);
    return NextResponse.json({
      success: true,
      conversation: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
