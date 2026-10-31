import { NextResponse } from 'next/server';
import { getOrdersFromDb, saveOrderToDb, updateOrderStageInDb } from '@/lib/db-service';
import { getInboundOrders, addInboundOrder, IngestedOrder } from '@/lib/orders-store';
import { LifecycleOrder } from '@/context/OrderLifecycleContext';
import { realtimeHub } from '@/lib/realtime-events';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbOrders = await getOrdersFromDb();
    if (Array.isArray(dbOrders)) {
      return NextResponse.json({
        success: true,
        source: 'database',
        orders: dbOrders,
        count: dbOrders.length,
      });
    }

    // Fallback to in-memory store if DB query returned null/undefined
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

    // 🔴 Broadcast real-time order creation
    realtimeHub.broadcast({
      eventType: 'ORDER_CREATED',
      entityType: 'ORDER',
      entityId: body.id || body.orderNumber,
      title: `Nouvelle commande: ${body.orderNumber} (${body.customer?.name || 'Client'})`,
      payload: body,
      source: 'STORE_API',
    }).catch(() => {});

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
    const { 
      orderId, 
      stage, 
      cancellationStage, 
      cancellationReason, 
      returnReason, 
      stockReintegrated, 
      returnFeeAmount,
      canceledBy,
      returnedBy 
    } = body;

    if (!orderId || !stage) {
      return NextResponse.json(
        { success: false, message: 'orderId and stage are required' },
        { status: 400 }
      );
    }

    // Update in MySQL Database & in-memory store
    const updated = await updateOrderStageInDb(orderId, stage, {
      cancellationStage,
      cancellationReason,
      returnReason,
      stockReintegrated,
      returnFeeAmount,
      canceledBy,
      returnedBy,
    });
    const { updateOrderStatus } = await import('@/lib/orders-store');
    updateOrderStatus(orderId, stage);

    // 🔴 Broadcast real-time stage change
    realtimeHub.broadcast({
      eventType: 'ORDER_STATUS_CHANGED',
      entityType: 'ORDER',
      entityId: orderId,
      title: `Commande ${orderId}: Étape passée à ${stage}`,
      payload: { orderId, stage },
      source: 'DASHBOARD_UI',
    }).catch(() => {});

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
