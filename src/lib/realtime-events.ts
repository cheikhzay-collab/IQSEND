import { getMysqlPool } from './db';
import { trackingEventBus, TrackingEvent } from './tracking-events';

export type RealtimeEventType =
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CONFIRMED'
  | 'PACKING_UPDATED'
  | 'SHIPMENT_STATUS_UPDATED'
  | 'DELIVERY_RESCUE_TRIGGERED'
  | 'WHATSAPP_MESSAGE'
  | 'CALL_LOGGED'
  | 'STOCK_CHANGED'
  | 'PRODUCT_UPDATED'
  | 'CUSTOMER_UPDATED'
  | 'FINANCE_TRANSACTION'
  | 'FINANCE_UPDATED'
  | 'AI_CONFIG_UPDATED'
  | 'AUTOMATION_UPDATED'
  | 'TEAM_UPDATED'
  | 'NOTIFICATION';

export interface AppRealtimeEvent {
  id?: number;
  eventType: RealtimeEventType;
  entityType: 'ORDER' | 'PARCEL' | 'CUSTOMER' | 'PRODUCT' | 'PACKING' | 'WHATSAPP' | 'CALL' | 'FINANCE' | 'SYSTEM' | 'AI_AGENT' | 'AUTOMATION' | 'USER';
  entityId: string;
  title: string;
  payload?: any;
  source?: string;
  timestamp: string;
}

type RealtimeListener = (event: AppRealtimeEvent) => void;

class RealtimeEventHub {
  private listeners: Set<RealtimeListener> = new Set();

  subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async broadcast(event: Omit<AppRealtimeEvent, 'timestamp'>): Promise<AppRealtimeEvent> {
    const fullEvent: AppRealtimeEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // 1. Broadcast to all active SSE browser connections in real-time
    this.listeners.forEach((listener) => {
      try {
        listener(fullEvent);
      } catch (err) {
        console.error('[RealtimeEventHub] Listener error:', err);
      }
    });

    // 2. Also forward to trackingEventBus for backward compatibility
    if (event.entityType === 'PARCEL' || event.eventType === 'SHIPMENT_STATUS_UPDATED') {
      try {
        trackingEventBus.emit({
          trackingCode: event.entityId,
          senditStatus: event.payload?.senditStatus || event.payload?.status || 'UPDATED',
          mappedStatus: event.payload?.mappedStatus || event.payload?.status || 'IN_TRANSIT',
          message: event.title,
          timestamp: fullEvent.timestamp,
          counterUnreachable: event.payload?.counterUnreachable,
          proofImage: event.payload?.proofImage,
        });
      } catch (e) {
        // ignore
      }
    }

    // 3. Persist event asynchronously into Hostinger MySQL realtime_events table
    try {
      const pool = getMysqlPool();
      await pool.execute(
        `INSERT INTO realtime_events (event_type, entity_type, entity_id, title, payload, source, is_broadcast)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [
          fullEvent.eventType,
          fullEvent.entityType,
          fullEvent.entityId,
          fullEvent.title,
          fullEvent.payload ? JSON.stringify(fullEvent.payload) : null,
          fullEvent.source || 'SYSTEM',
        ]
      );
    } catch (err: any) {
      console.warn('[RealtimeEventHub] Async DB persist note:', err.message);
    }

    return fullEvent;
  }

  get activeConnectionsCount(): number {
    return this.listeners.size;
  }
}

const globalKey = '__sendit_realtime_event_hub__';

declare global {
  // eslint-disable-next-line no-var
  var __sendit_realtime_event_hub__: RealtimeEventHub | undefined;
}

export const realtimeHub: RealtimeEventHub =
  globalThis[globalKey] ?? (globalThis[globalKey] = new RealtimeEventHub());
