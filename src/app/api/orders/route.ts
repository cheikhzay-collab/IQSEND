import { NextResponse } from 'next/server';
import { getOrdersFromDb, saveOrderToDb, updateOrderStageInDb } from '@/lib/db-service';
import { getInboundOrders, addInboundOrder, IngestedOrder } from '@/lib/orders-store';
import { LifecycleOrder } from '@/context/OrderLifecycleContext';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbOrders = await getOrdersFromDb();
    if (dbOrders && dbOrders.length > 0) {
      return NextResponse.json({
        success: true,
        source: 'database',
        orders: dbOrders,
        count: dbOrders.length,
      });
    }

    // Fallback to in-memory store if DB has no orders yet
    const fallbackOrders = getInboundOrders();
    return NextResponse.json({
      success: true,
      source: 'memory_fallback',
      orders: fallbackOrders,
      count: fallbackOrders.length,
    });
  } catch (error) {
    console.error('[API Orders GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        orders: getInboundOrders(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.orderNumber) {
      return NextResponse.json(
        { success: false, message: 'Invalid order data' },
        { status: 400 }
      );
    }

    // Save to Database
    const saved = await saveOrderToDb(body);

    // Keep in-memory store in sync
    addInboundOrder(body as IngestedOrder);

    return NextResponse.json({
      success: true,
      message: 'Order saved to database successfully',
      persistedToDb: saved,
      order: body,
    });
  } catch (error) {
    console.error('[API Orders POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { orderId, stage } = body;

    if (!orderId || !stage) {
      return NextResponse.json(
        { success: false, message: 'orderId and stage are required' },
        { status: 400 }
      );
    }

    // Update in MySQL Database
    const updated = await updateOrderStageInDb(orderId, stage);

    return NextResponse.json({
      success: true,
      message: `Order ${orderId} stage updated to ${stage}`,
      persistedToDb: updated,
    });
  } catch (error) {
    console.error('[API Orders PATCH] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
