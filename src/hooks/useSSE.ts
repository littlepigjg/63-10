import { useEffect, useCallback, useRef, useState } from 'react';
import { sseManager } from './sseManager';
import { useDocumentVisibility } from './useDocumentVisibility';
import type { SSEEvent, SSEFilter } from './types';
import { matchSSEEvent } from './types';

interface UseSSEOptions {
  filter?: SSEFilter;
  onMessage?: (event: SSEEvent) => void;
  onConfigChanged?: (event: SSEEvent) => void;
  onRefresh?: (event: SSEEvent) => void;
  onConnected?: () => void;
  enabled?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}

let listenerIdCounter = 0;
const generateListenerId = () => `sse_${++listenerIdCounter}_${Date.now()}`;

export function useSSE(options: UseSSEOptions = {}) {
  const {
    filter,
    onMessage,
    onConfigChanged,
    onRefresh,
    onConnected,
    enabled = true,
    onVisibilityChange,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const listenerIdRef = useRef<string | null>(null);
  const { isVisible } = useDocumentVisibility();

  const handleMessage = useCallback(
    (event: SSEEvent) => {
      if (!enabled) return;

      if (filter && !matchSSEEvent(event, filter)) return;

      onMessage?.(event);

      if (event.type === 'connected') {
        setIsConnected(true);
        onConnected?.();
      } else if (event.type === 'config_changed') {
        onConfigChanged?.(event);
      } else if (event.type === 'refresh') {
        onRefresh?.(event);
      }
    },
    [enabled, filter, onMessage, onConfigChanged, onRefresh, onConnected],
  );

  useEffect(() => {
    if (!enabled) {
      if (listenerIdRef.current) {
        listenerIdRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const listenerId = generateListenerId();
    listenerIdRef.current = listenerId;

    const unsubscribe = sseManager.subscribe(listenerId, handleMessage);

    setIsConnected(sseManager.isConnected());

    return () => {
      unsubscribe();
      listenerIdRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, handleMessage]);

  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(isVisible);
    }
  }, [isVisible, onVisibilityChange]);

  const reconnect = useCallback(() => {
    sseManager.disconnect();
    setTimeout(() => {
      sseManager.connect();
    }, 100);
  }, []);

  return {
    isConnected,
    isVisible,
    reconnect,
  };
}

export type { SSEEvent, SSEFilter };
