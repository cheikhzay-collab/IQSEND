import { NextRequest, NextResponse } from 'next/server';
import { trackingEventBus } from '@/lib/tracking-events';
import { senditService } from '@/lib/sendit-service';
import { getInboundOrders } from '@/lib/orders-store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tracking/test-webhook
 *
 * Endpoint de test local pour simuler un webhook Sendit en direct.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let targetCode = body.trackingCode || body.code;
    const targetStatus = body.newStatus || body.status || 'OUT_FOR_DELIVERY';
    const message = body.message;

    // Si aucun trackingCode n'est fourni, trouver un colis existant en transit
    if (!targetCode) {
      const orders = getInboundOrders();
      const inTransit = orders.find(
        (o: any) => o.tracking?.trackingNumber || o.status === 'SHIPPED'
      );
      targetCode = inTransit?.tracking?.trackingNumber || 'SND-819204';
    }

    const mappedStatus = senditService.mapSenditStatus(targetStatus);

    // Émettre l'événement SSE
    trackingEventBus.emit({
      trackingCode: targetCode,
      senditStatus: targetStatus,
      mappedStatus,
      message: message || `Mise à jour Sendit en direct: ${targetStatus}`,
      timestamp: new Date().toISOString(),
      counterUnreachable: 0,
    });

    console.log(`[Test Webhook] ✅ Emitted: ${targetCode} -> ${mappedStatus} (${trackingEventBus.listenerCount} listeners)`);

    return NextResponse.json({
      success: true,
      trackingCode: targetCode,
      senditStatus: targetStatus,
      mappedStatus,
      listeners: trackingEventBus.listenerCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/tracking/test-webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    listeners: trackingEventBus.listenerCount,
    timestamp: new Date().toISOString(),
  });
}
