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

    let dbMatch: any = null;
    try {
      const { getMysqlPool } = await import('@/lib/db');
      const pool = getMysqlPool();
      const [rows]: any = await pool.execute(
        `SELECT l.*, i.product_name, i.sku, i.quantity, i.price
         FROM order_leads l
         LEFT JOIN order_items i ON l.id = i.order_id
         WHERE l.phone_number = ?
         ORDER BY l.created_at DESC LIMIT 1`,
        [phone]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        dbMatch = rows[0];
      }
    } catch {}

    const orders = getInboundOrders();
    const matchedOrder = orders.find(
      (o) => o.customer?.phone?.includes(phone) || phone.includes(o.customer?.phone || '')
    );

    const orderContext: OrderContext = {
      orderId: dbMatch?.id || matchedOrder?.id || `conv-${Date.now()}`,
      orderNumber: dbMatch?.order_number || matchedOrder?.orderNumber || '',
      customerName: dbMatch?.customer_name || matchedOrder?.customer?.name || customerName || 'Client',
      phoneNumber: dbMatch?.phone_number || phone,
      city: dbMatch?.city || matchedOrder?.customer?.city || city,
      address: dbMatch?.address || matchedOrder?.customer?.address || '',
      totalAmount: Number(dbMatch?.total_amount) || matchedOrder?.payment?.amount || 0,
      items: dbMatch?.product_name
        ? [{ name: dbMatch.product_name, sku: dbMatch.sku || 'COD', quantity: dbMatch.quantity || 1, price: dbMatch.price || dbMatch.total_amount }]
        : (matchedOrder?.items || []).map((it) => ({
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
      toolDetails: aiResult.toolDetails,
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
