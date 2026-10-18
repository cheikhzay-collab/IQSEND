import { NextResponse } from 'next/server';
import {
  getInboxConversations,
  recordOutboundMessage,
  toggleAiActive,
  updateConversationCustomer,
} from '@/lib/inbox-store';
import { sendWhatsAppDirectMessage } from '@/lib/whatsapp/baileys-service';
import { getMysqlPool } from '@/lib/db';

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

    if (!sendResult.success) {
      console.warn(`[Inbox API] ⚠️ Message could not be sent to WhatsApp servers: ${sendResult.error}`);
      return NextResponse.json(
        {
          success: false,
          error: sendResult.error || 'WhatsApp not connected or delivery failed',
          sendResult,
        },
        { status: 400 }
      );
    }

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

// PATCH: Update takeover status or set the real customer phone number
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { chatId, isAiActive, realPhone, customerName, orderNumber } = body;

    if (realPhone) {
      let finalName = customerName;
      let finalOrderNumber = orderNumber;
      let finalCity = undefined;
      let finalAmount = undefined;

      // Try looking up real lead from Hostinger MySQL
      try {
        const pool = getMysqlPool();
        const digits = realPhone.replace(/[^\d]/g, '');
        const queryPhone = digits.startsWith('212') ? '0' + digits.slice(3) : digits;

        const [rows]: any = await pool.execute(
          `SELECT customer_name, order_number, city, total_amount 
           FROM order_leads 
           WHERE phone_number LIKE ? OR ? LIKE CONCAT('%', phone_number, '%')
           ORDER BY created_at DESC LIMIT 1`,
          [`%${queryPhone.slice(-9)}%`, queryPhone]
        );

        if (Array.isArray(rows) && rows.length > 0) {
          const lead = rows[0];
          finalName = lead.customer_name;
          finalOrderNumber = lead.order_number;
          finalCity = lead.city;
          finalAmount = Number(lead.total_amount);
        }
      } catch (dbErr) {
        console.warn('[Inbox API] MySQL lead lookup notice:', dbErr);
      }

      const updated = updateConversationCustomer(chatId, {
        realPhone,
        customerName: finalName,
        orderNumber: finalOrderNumber,
        city: finalCity,
        totalAmount: finalAmount,
      });

      return NextResponse.json({
        success: true,
        conversation: updated,
      });
    }

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
