import { NextRequest, NextResponse } from 'next/server';
import {
  processCustomerWhatsAppMessage,
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
      message,
      conversationHistory = [],
      phone = '0670114455',
      customerName = 'محمد الإدريسي',
      city = 'الدار البيضاء',
    } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message requis' },
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
    const aiResult = await processCustomerWhatsAppMessage(message.trim(), orderContext, {
      onConfirm: async (args) => {
        toolExecuted = `confirm_order_and_address (Ville: ${args.verifiedCity})`;
      },
      onUpdateDetails: async (args) => {
        toolExecuted = `update_order_details (${args.newSize || ''} ${args.updatedPrice ? args.updatedPrice + ' MAD' : ''})`;
      },
      onSaveGps: async (args) => {
        toolExecuted = `save_gps_location (${args.googleMapsUrl})`;
      },
      onCancel: async (args) => {
        toolExecuted = `cancel_order (${args.reason})`;
      },
      onHandover: async (args) => {
        toolExecuted = `request_human_handover (${args.reason})`;
      },
      onSendProductImages: async (args) => {
        toolExecuted = `send_product_images (${args.productNameOrSku})`;
      },
    });

    const latencyMs = Date.now() - startTime;
    const tokensCount = Math.round((message.length + (aiResult.replyText?.length || 0)) / 3.2) + (aiResult.toolCalled ? 42 : 12);

    return NextResponse.json({
      success: true,
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
