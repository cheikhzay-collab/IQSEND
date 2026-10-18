import { NextRequest, NextResponse } from 'next/server';
import {
  processCustomerWhatsAppMessage,
  OrderContext,
  getEffectiveGeminiKey,
  getEffectiveGeminiModel,
} from '@/lib/gemini-agent';
import { getInboundOrders } from '@/lib/orders-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, phone = '212670114455', customerName = 'محمد الإدريسي', city = 'Casablanca' } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'Message requis' }, { status: 400 });
    }

    const effectiveKey = getEffectiveGeminiKey();
    const isLiveApiActive = Boolean(effectiveKey && effectiveKey.length > 15);

    const orders = getInboundOrders();
    const matchedOrder = orders.find(
      (o) => o.customer?.phone?.includes(phone) || phone.includes(o.customer?.phone || '')
    );

    const orderContext: OrderContext = {
      orderId: matchedOrder?.id || 'lead_test_1',
      orderNumber: matchedOrder?.orderNumber || '#MA-TEST',
      customerName: matchedOrder?.customer?.name || customerName,
      phoneNumber: phone,
      city: matchedOrder?.customer?.city || city,
      address: matchedOrder?.customer?.address || 'Maarif, Rue 10',
      totalAmount: matchedOrder?.payment?.amount || 299,
      items: (matchedOrder?.items || []).map((it) => ({
        name: it.name,
        sku: it.sku,
        quantity: it.quantity,
        price: it.price,
      })),
      conversationHistory: [],
    };

    let toolExecuted: string | undefined;
    const aiResult = await processCustomerWhatsAppMessage(message, orderContext, {
      onConfirm: async (args) => {
        toolExecuted = `onConfirm (City: ${args.verifiedCity})`;
      },
      onUpdateDetails: async (args) => {
        toolExecuted = `onUpdateDetails (Size: ${args.newSize}, Price: ${args.updatedPrice})`;
      },
      onSaveGps: async (args) => {
        toolExecuted = `onSaveGps (${args.googleMapsUrl})`;
      },
      onCancel: async (args) => {
        toolExecuted = `onCancel (${args.reason})`;
      },
      onHandover: async (args) => {
        toolExecuted = `onHandover (${args.reason})`;
      },
    });

    return NextResponse.json({
      success: true,
      isLiveApiActive,
      replyText: aiResult.replyText,
      toolCalled: aiResult.toolCalled || toolExecuted,
      requiresHumanHandover: aiResult.requiresHumanHandover,
      model: isLiveApiActive
        ? `Google Gemini (${getEffectiveGeminiModel()}) - Live API`
        : 'Moteur de Règles Darija (Clé manquante)',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur lors du test IA' },
      { status: 500 }
    );
  }
}
