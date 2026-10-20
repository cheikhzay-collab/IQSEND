'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ShipmentStatus } from '@/types';

export interface LiveTrackingUpdate {
  trackingCode: string;
  senditStatus: string;
  mappedStatus: string;
  message?: string;
  timestamp: string;
  counterUnreachable?: number;
  proofImage?: string;
}

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'error';

interface UseLiveTrackingOptions {
  /** Called when a Sendit status update arrives */
  onUpdate: (update: LiveTrackingUpdate) => void;
  /** Enable / disable (default: true) */
  enabled?: boolean;
}

/**
 * useLiveTracking
 *
 * Hook يفتح اتصال SSE مع /api/tracking/live
 * ويستقبل تحديثات Sendit في الوقت الفعلي.
 *
 * يعيد محاولة الاتصال تلقائياً بـ Exponential Backoff عند الانقطاع.
 */
export function useLiveTracking({ onUpdate, enabled = true }: UseLiveTrackingOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [lastEventAt, setLastEventAt]         = useState<string | null>(null);
  const [eventCount, setEventCount]           = useState(0);

  const esRef        = useRef<EventSource | null>(null);
  const retryRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount   = useRef(0);
  const onUpdateRef  = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const clearRetry = () => {
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
  };

  const connect = useCallback(() => {
    // Nettoyage de l'ancienne connexion
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    if (!enabled || typeof window === 'undefined') return;

    setConnectionState(retryCount.current > 0 ? 'reconnecting' : 'connecting');

    const es = new EventSource('/api/tracking/live');
    esRef.current = es;

    es.addEventListener('connected', () => {
      setConnectionState('connected');
      retryCount.current = 0;
      console.log('[useLiveTracking] ✅ SSE connected to Sendit live feed');
    });

    es.addEventListener('tracking_update', (e: MessageEvent) => {
      try {
        const data: LiveTrackingUpdate = JSON.parse(e.data);
        setLastEventAt(new Date().toISOString());
        setEventCount((n) => n + 1);
        onUpdateRef.current(data);

        console.log(
          `[useLiveTracking] 🔴 LIVE: ${data.trackingCode} → ${data.mappedStatus}`
        );
      } catch (err) {
        console.error('[useLiveTracking] Parse error:', err);
      }
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setConnectionState('reconnecting');

      // Exponential backoff: 2s → 4s → 8s → 16s → max 30s
      const delay = Math.min(2_000 * Math.pow(2, retryCount.current), 30_000);
      retryCount.current += 1;
      console.warn(`[useLiveTracking] ⚠️ SSE disconnected. Retry #${retryCount.current} in ${delay / 1000}s`);

      clearRetry();
      retryRef.current = setTimeout(connect, delay);
    };
  }, [enabled]);

  useEffect(() => {
    connect();
    return () => {
      clearRetry();
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connect]);

  return { connectionState, lastEventAt, eventCount };
}
