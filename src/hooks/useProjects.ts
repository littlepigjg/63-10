import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/utils/api';
import { useSSE } from './useSSE';
import { useDocumentVisibility } from './useDocumentVisibility';
import type { Project } from '../../shared/types';

interface UseProjectsOptions {
  autoRefresh?: boolean;
  refreshOnVisible?: boolean;
}

export function useProjects(options: UseProjectsOptions = {}) {
  const { autoRefresh = true, refreshOnVisible = true } = options;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isVisible } = useDocumentVisibility();
  const lastFetchRef = useRef<number>(0);
  const MIN_REFRESH_INTERVAL = 2000;

  const fetchProjects = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < MIN_REFRESH_INTERVAL) {
      return;
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Project[]>('/projects');
      if (res.success && res.data) {
        setProjects(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name: string, description?: string) => {
    const res = await api.post<Project>('/projects', { name, description });
    if (res.success && res.data) {
      lastFetchRef.current = 0;
      await fetchProjects();
      return res.data;
    }
    return null;
  }, [fetchProjects]);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const res = await api.put<Project>(`/projects/${id}`, updates);
    if (res.success && res.data) {
      lastFetchRef.current = 0;
      await fetchProjects();
      return res.data;
    }
    return null;
  }, [fetchProjects]);

  const deleteProject = useCallback(async (id: string) => {
    const res = await api.delete(`/projects/${id}`);
    if (res.success) {
      lastFetchRef.current = 0;
      await fetchProjects();
      return true;
    }
    return false;
  }, [fetchProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!refreshOnVisible || !isVisible) return;

    const timer = setTimeout(() => {
      fetchProjects();
    }, 100);

    return () => clearTimeout(timer);
  }, [isVisible, refreshOnVisible, fetchProjects]);

  useSSE({
    enabled: autoRefresh,
    filter: { eventTypes: ['config_changed'] },
    onConfigChanged: () => {
      lastFetchRef.current = 0;
      fetchProjects();
    },
    onRefresh: () => {
      lastFetchRef.current = 0;
      fetchProjects();
    },
  });

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
