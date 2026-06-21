import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '@/utils/api';
import { useSSE } from './useSSE';
import { useDocumentVisibility } from './useDocumentVisibility';
import type { ConfigItem } from '../../shared/types';

interface UseConfigsOptions {
  projectId: string | null;
  envName: string | null;
  autoRefresh?: boolean;
  refreshOnVisible?: boolean;
}

export function useConfigs(options: UseConfigsOptions) {
  const { projectId, envName, autoRefresh = true, refreshOnVisible = true } = options;
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isVisible } = useDocumentVisibility();
  const lastFetchRef = useRef<number>(0);
  const MIN_REFRESH_INTERVAL = 2000;

  const fetchConfigs = useCallback(async () => {
    if (!projectId || !envName) {
      setConfigs([]);
      return;
    }

    const now = Date.now();
    if (now - lastFetchRef.current < MIN_REFRESH_INTERVAL) {
      return;
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ConfigItem[]>(`/projects/${projectId}/envs/${envName}`);
      if (res.success && res.data) {
        setConfigs(res.data);
      } else {
        setConfigs([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch configs');
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, envName]);

  const addConfig = useCallback(async (key: string, value: string, description?: string, encrypted?: boolean) => {
    if (!projectId || !envName) return null;
    const res = await api.post<ConfigItem>(`/projects/${projectId}/envs/${envName}`, {
      key,
      value,
      description,
      encrypted,
    });
    if (res.success && res.data) {
      lastFetchRef.current = 0;
      await fetchConfigs();
      return res.data;
    }
    return null;
  }, [projectId, envName, fetchConfigs]);

  const updateConfig = useCallback(async (key: string, updates: Partial<ConfigItem>) => {
    if (!projectId || !envName) return null;
    const res = await api.put<ConfigItem>(`/projects/${projectId}/envs/${envName}/${key}`, updates);
    if (res.success && res.data) {
      lastFetchRef.current = 0;
      await fetchConfigs();
      return res.data;
    }
    return null;
  }, [projectId, envName, fetchConfigs]);

  const deleteConfig = useCallback(async (key: string) => {
    if (!projectId || !envName) return false;
    const res = await api.delete(`/projects/${projectId}/envs/${envName}/${key}`);
    if (res.success) {
      lastFetchRef.current = 0;
      await fetchConfigs();
      return true;
    }
    return false;
  }, [projectId, envName, fetchConfigs]);

  const encryptConfig = useCallback(async (key: string) => {
    if (!projectId || !envName) return null;
    const res = await api.post<ConfigItem>(`/encryption/${projectId}/${envName}/${key}`);
    if (res.success && res.data) {
      lastFetchRef.current = 0;
      await fetchConfigs();
      return res.data;
    }
    return null;
  }, [projectId, envName, fetchConfigs]);

  const decryptConfig = useCallback(async (key: string) => {
    if (!projectId || !envName) return null;
    const res = await api.post<ConfigItem>(`/encryption/${projectId}/${envName}/${key}/decrypt`);
    if (res.success && res.data) {
      lastFetchRef.current = 0;
      await fetchConfigs();
      return res.data;
    }
    return null;
  }, [projectId, envName, fetchConfigs]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    if (!refreshOnVisible || !isVisible) return;

    const timer = setTimeout(() => {
      fetchConfigs();
    }, 100);

    return () => clearTimeout(timer);
  }, [isVisible, refreshOnVisible, fetchConfigs]);

  useSSE({
    enabled: autoRefresh,
    filter: { project: projectId, environment: envName, eventTypes: ['config_changed', 'connected'] },
    onConfigChanged: () => {
      lastFetchRef.current = 0;
      fetchConfigs();
    },
    onRefresh: () => {
      lastFetchRef.current = 0;
      fetchConfigs();
    },
  });

  return {
    configs,
    loading,
    error,
    fetchConfigs,
    addConfig,
    updateConfig,
    deleteConfig,
    encryptConfig,
    decryptConfig,
  };
}
