import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/utils/api';
import { useSSE } from './useSSE';
import { useDocumentVisibility } from './useDocumentVisibility';
import type { ClientInfo } from '../../shared/types';

interface UseClientsOptions {
  autoRefresh?: boolean;
  refreshOnVisible?: boolean;
  pollInterval?: number;
}

export function useClients(options: UseClientsOptions = {}) {
  const { autoRefresh = true, refreshOnVisible = true, pollInterval = 30000 } = options;
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isVisible } = useDocumentVisibility();
  const lastFetchRef = useRef<number>(0);
  const MIN_REFRESH_INTERVAL = 2000;

  const fetchClients = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < MIN_REFRESH_INTERVAL) {
      return;
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ClientInfo[]>('/clients');
      if (res.success && res.data) {
        setClients(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, []);

  const registerClient = useCallback(async (name: string, ip?: string) => {
    const res = await api.post<ClientInfo>('/clients', { name, ip });
    if (res.success && res.data) {
      lastFetchRef.current = 0;
      await fetchClients();
      return res.data;
    }
    return null;
  }, [fetchClients]);

  const deleteClient = useCallback(async (id: string) => {
    const res = await api.delete(`/clients/${id}`);
    if (res.success) {
      lastFetchRef.current = 0;
      await fetchClients();
      return true;
    }
    return false;
  }, [fetchClients]);

  const notifyClient = useCallback(async (clientId?: string) => {
    const res = await api.post('/clients/notify', { targetClientId: clientId });
    if (res.success) {
      lastFetchRef.current = 0;
      await fetchClients();
      return true;
    }
    return false;
  }, [fetchClients]);

  useEffect(() => {
    fetchClients();
    if (pollInterval > 0) {
      const interval = setInterval(() => {
        lastFetchRef.current = 0;
        fetchClients();
      }, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchClients, pollInterval]);

  useEffect(() => {
    if (!refreshOnVisible || !isVisible) return;

    const timer = setTimeout(() => {
      lastFetchRef.current = 0;
      fetchClients();
    }, 100);

    return () => clearTimeout(timer);
  }, [isVisible, refreshOnVisible, fetchClients]);

  useSSE({
    enabled: autoRefresh,
    filter: { eventTypes: ['refresh'] },
    onRefresh: () => {
      lastFetchRef.current = 0;
      fetchClients();
    },
  });

  const onlineCount = clients.filter((c) => c.online).length;
  const offlineCount = clients.length - onlineCount;

  return {
    clients,
    loading,
    error,
    onlineCount,
    offlineCount,
    fetchClients,
    registerClient,
    deleteClient,
    notifyClient,
  };
}
