/**
 * tracking-events.ts — SSE Event Bus
 *
 * Singleton in-memory event bus (EdgeRuntime compatible).
 * يربط بين:
 *   • webhook Sendit  → يبثّ أحداث الحالة
 *   • /api/tracking/live SSE → يرسلها للـ browser فوراً
 */

export interface TrackingEvent {
  /** رمز التتبع Sendit (DHF420101C) */
  trackingCode: string;
  /** الحالة الجديدة من Sendit */
  senditStatus: string;
  /** الحالة المحوّلة (IN_TRANSIT, OUT_FOR_DELIVERY …) */
  mappedStatus: string;
  /** رسالة تفسيرية */
  message?: string;
  /** تاريخ الحدث */
  timestamp: string;
  /** عدد محاولات التسليم */
  counterUnreachable?: number;
  /** صورة إثبات التسليم */
  proofImage?: string;
}

type Listener = (event: TrackingEvent) => void;

class TrackingEventBus {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: TrackingEvent): void {
    console.log(`[TrackingEventBus] 📡 Emitting: ${event.trackingCode} → ${event.mappedStatus}`);
    this.listeners.forEach((l) => {
      try {
        l(event);
      } catch (err) {
        console.error('[TrackingEventBus] Listener error:', err);
      }
    });
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}

// ── Singleton (global scope survives hot-reload in dev) ──────────────
const globalKey = '__sendit_tracking_event_bus__';

declare global {
  // eslint-disable-next-line no-var
  var __sendit_tracking_event_bus__: TrackingEventBus | undefined;
}

export const trackingEventBus: TrackingEventBus =
  globalThis[globalKey] ?? (globalThis[globalKey] = new TrackingEventBus());
