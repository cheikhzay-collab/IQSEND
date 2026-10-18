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

// GET: Return all active WhatsApp conversations (hydrated from Hostinger MySQL + in-memory store)
export async function GET() {
  try {
    const memoryConversations = getInboxConversations();
    const pool = getMysqlPool();

    // Fetch messages from MySQL
    const [dbMsgs]: any = await pool.execute(`
      SELECT 
        m.id, m.order_id, m.phone, m.sender, m.body, m.message_type, m.audio_transcribed_text, m.created_at,
        l.order_number, l.customer_name, l.city, l.total_amount
      FROM whatsapp_messages m
      LEFT JOIN order_leads l ON (m.order_id = l.id OR m.phone = l.phone_number)
      ORDER BY m.created_at ASC
    `);

    if (Array.isArray(dbMsgs) && dbMsgs.length > 0) {
      // Group by phone
      const convsByPhone = new Map<string, any>();

      for (const msg of dbMsgs) {
        const phone = msg.phone || '';
        if (!phone) continue;

        const cleanKey = phone.replace(/\D/g, '').slice(-9);

        if (!convsByPhone.has(cleanKey)) {
          const rawNum = msg.order_number || '';
          const cleanNum = rawNum ? (rawNum.startsWith('#') ? rawNum : `#${rawNum}`) : `CMD-${cleanKey.slice(-4)}`;
          convsByPhone.set(cleanKey, {
            id: `conv-db-${cleanKey}`,
            orderId: msg.order_id || undefined,
            orderNumber: cleanNum,
            customerName: msg.customer_name || `الزبون (${phone})`,
            phoneNumber: phone,
            city: msg.city || 'Maroc',
            totalAmount: Number(msg.total_amount) || 299,
            lastMessage: msg.body,
            lastTime: msg.created_at
              ? new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              : '12:00',
            unreadCount: 0,
            isAiActive: true,
            needsHumanTakeover: false,
            hasVoiceNote: msg.message_type === 'audio' || Boolean(msg.audio_transcribed_text),
            messages: [],
          });
        }

        const conv = convsByPhone.get(cleanKey);
        const timeStr = msg.created_at
          ? new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : '12:00';

        conv.messages.push({
          id: msg.id,
          sender: msg.sender,
          text: msg.body,
          timestamp: timeStr,
          isVoice: msg.message_type === 'audio' || Boolean(msg.audio_transcribed_text),
          voiceTranscription: msg.audio_transcribed_text || undefined,
        });

        conv.lastMessage = msg.body;
        conv.lastTime = timeStr;
      }

      // Merge memory conversations with DB conversations
      const mergedList = [...memoryConversations];
      for (const [key, dbConv] of Array.from(convsByPhone.entries())) {
        const exists = mergedList.find(
          (mc) => mc.phoneNumber.replace(/\D/g, '').slice(-9) === key || (mc.realPhoneNumber && mc.realPhoneNumber.replace(/\D/g, '').slice(-9) === key)
        );
        if (!exists) {
          mergedList.unshift(dbConv);
        } else {
          // Add any DB messages not already in memory
          const existingIds = new Set(exists.messages.map((m) => m.id));
          for (const dm of dbConv.messages) {
            if (!existingIds.has(dm.id)) {
              exists.messages.push(dm);
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        source: 'database_and_memory',
        conversations: mergedList,
      });
    }

    return NextResponse.json({
      success: true,
      source: 'memory',
      conversations: memoryConversations,
    });
  } catch (err: any) {
    console.warn('[Inbox GET] Fallback to memory:', err.message);
    return NextResponse.json({
      success: true,
      source: 'memory_fallback',
      conversations: getInboxConversations(),
    });
  }
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

    // 2. Persist to MySQL whatsapp_messages table
    try {
      const { logWhatsAppMessageToDb } = await import('@/lib/db-service');
      await logWhatsAppMessageToDb({
        phone,
        sender: 'AGENT',
        body: text,
        messageType: 'text',
      });
    } catch (dbErr) {
      console.warn('[Inbox API] Could not persist agent reply to MySQL:', dbErr);
    }

    // 3. Record outbound human message in store & turn off AI for this customer
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
