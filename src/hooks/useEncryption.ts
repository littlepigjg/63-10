import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/utils/api';
import { useSSE } from './useSSE';
import { useDocumentVisibility } from './useDocumentVisibility';
import type { ConfigItem, Project } from '../../shared/types';

interface EncryptionStatusItem {
  project: string;
  environment: string;
  key: string;
  encrypted: boolean;
  projectId?: string;
}

interface UseEncryptionOptions {
  autoRefresh?: boolean;
  refreshOnVisible?: boolean;
}

export function useEncryption(options: UseEncryptionOptions = {}) {
  const { autoRefresh = true, refreshOnVisible = true } = options;
  const [statusItems, setStatusItems] = useState<EncryptionStatusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isVisible } = useDocumentVisibility();
  const lastFetchRef = useRef<number>(0);
  const MIN_REFRESH_INTERVAL = 2000;

  const fetchStatus = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < MIN_REFRESH_INTERVAL) {
      return;
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const [projectsRes, statusRes] = await Promise.all([
        api.get<Project[]>('/projects'),
        api.get<EncryptionStatusItem[]>('/encryption/status'),
      ]);
      if (statusRes.success && statusRes.data) {
        const items = statusRes.data.map((item) => {
          const project = projectsRes.data?.find((p) => p.name === item.project);
          return { ...item, projectId: project?.id };
        });
        setStatusItems(items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch encryption status');
    } finally {
      setLoading(false);
    }
  }, []);

  const encryptConfig = useCallback(async (projectId: string, envName: string, key: string) => {
    const res = await api.post<ConfigItem>(`/encryption/${projectId}/${envName}/${key}`);
    if (res.success && res.data) {
      lastFetchRef.current = 0;
      await fetchStatus();
      return res.data;
    }
    return null;
  }, [fetchStatus]);

  const decryptConfig = useCallback(async (projectId: string, envName: string, key: string) => {
    const res = await api.post<ConfigItem>(`/encryption/${projectId}/${envName}/${key}/decrypt`);
    if (res.success && res.data) {
      lastFetchRef.current = 0;
      await fetchStatus();
      return res.data;
    }
    return null;
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!refreshOnVisible || !isVisible) return;

    const timer = setTimeout(() => {
      lastFetchRef.current = 0;
      fetchStatus();
    }, 100);

    return () => clearTimeout(timer);
  }, [isVisible, refreshOnVisible, fetchStatus]);

  useSSE({
    enabled: autoRefresh,
    filter: { eventTypes: ['config_changed'] },
    onConfigChanged: () => {
      lastFetchRef.current = 0;
      fetchStatus();
    },
    onRefresh: () => {
      lastFetchRef.current = 0;
      fetchStatus();
    },
  });

  const encryptedCount = statusItems.filter((i) => i.encrypted).length;
  const totalCount = statusItems.length;

  return {
    statusItems,
    loading,
    error,
    encryptedCount,
    totalCount,
    fetchStatus,
    encryptConfig,
    decryptConfig,
  };
}
