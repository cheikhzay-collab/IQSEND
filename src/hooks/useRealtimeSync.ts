'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppRealtimeEvent, RealtimeEventType } from '@/lib/realtime-events';

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'error';

interface UseRealtimeSyncOptions {
  onEvent?: (event: AppRealtimeEvent) => void;
  eventTypes?: RealtimeEventType[];
  enabled?: boolean;
}

/**
 * useRealtimeSync
 *
 * Client React hook to listen for real-time events streamed from Hostinger MySQL via SSE.
 * Automatically recovers from connection drops and keeps UI updated instantaneously.
 */
export function useRealtimeSync({ onEvent, eventTypes, enabled = true }: UseRealtimeSyncOptions = {}) {
  const [status, setStatus] = useState<RealtimeConnectionStatus>('connecting');
  const [lastEvent, setLastEvent] = useState<AppRealtimeEvent | null>(null);
  const [eventCount, setEventCount] = useState<number>(0);

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const eventTypesRef = useRef(eventTypes);
  eventTypesRef.current = eventTypes;

  const retryCount = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || !enabled) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus(retryCount.current > 0 ? 'reconnecting' : 'connecting');

    try {
      const es = new EventSource('/api/realtime/stream');
      eventSourceRef.current = es;

      es.addEventListener('open', () => {
        setStatus('connected');
        retryCount.current = 0;
      });

      es.addEventListener('connected', () => {
        setStatus('connected');
        retryCount.current = 0;
      });

      const handleIncoming = (raw: MessageEvent) => {
        try {
          const parsed: AppRealtimeEvent = JSON.parse(raw.data);
          const filter = eventTypesRef.current;
          if (!filter || filter.length === 0 || filter.includes(parsed.eventType)) {
            setLastEvent(parsed);
            setEventCount((prev) => prev + 1);
            if (onEventRef.current) {
              onEventRef.current(parsed);
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      es.addEventListener('realtime_update', handleIncoming);
      es.addEventListener('history_event', handleIncoming);

      es.onerror = () => {
        setStatus('error');
        es.close();
        eventSourceRef.current = null;

        // Exponential backoff reconnect
        const backoff = Math.min(1000 * 2 ** retryCount.current, 15000);
        retryCount.current += 1;
        retryTimeoutRef.current = setTimeout(connect, backoff);
      };
    } catch {
      setStatus('error');
    }
  }, [enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return {
    status,
    isConnected: status === 'connected',
    lastEvent,
    eventCount,
    reconnect: connect,
  };
}
