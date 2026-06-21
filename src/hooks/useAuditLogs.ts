import { useState, useCallback, useEffect, useRef } from 'react';
import { auditApi } from '@/utils/api';
import { useSSE } from './useSSE';
import { useDocumentVisibility } from './useDocumentVisibility';
import type { AuditLogEntry, AuditOperationTypeFilter } from '../../shared/types';

interface UseAuditLogsOptions {
  autoRefresh?: boolean;
  refreshOnVisible?: boolean;
  pageSize?: number;
}

interface AuditLogsResult {
  logs: AuditLogEntry[];
  total: number;
}

interface AuditLogFilters {
  operationType: AuditOperationTypeFilter;
  projectId: string;
  environment: string;
  configKey: string;
  operatorId: string;
  from: string;
  to: string;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { autoRefresh = true, refreshOnVisible = true, pageSize = 20 } = options;
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<AuditLogFilters>({
    operationType: '',
    projectId: '',
    environment: '',
    configKey: '',
    operatorId: '',
    from: '',
    to: '',
  });

  const { isVisible } = useDocumentVisibility();
  const lastFetchRef = useRef<number>(0);
  const MIN_REFRESH_INTERVAL = 2000;

  const fetchLogs = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < MIN_REFRESH_INTERVAL) {
      return;
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const res = await auditApi.getLogs({
        ...filters,
        limit: pageSize,
        offset: page * pageSize,
      });
      if (res.success && res.data) {
        const data = res.data as AuditLogsResult;
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  const fetchRecentLogs = useCallback(async (count: number = 10) => {
    try {
      const res = await auditApi.getRecentLogs(count);
      if (res.success && res.data) {
        return res.data as AuditLogEntry[];
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!refreshOnVisible || !isVisible) return;

    const timer = setTimeout(() => {
      lastFetchRef.current = 0;
      fetchLogs();
    }, 100);

    return () => clearTimeout(timer);
  }, [isVisible, refreshOnVisible, fetchLogs]);

  useSSE({
    enabled: autoRefresh,
    filter: { eventTypes: ['config_changed', 'refresh'] },
    onConfigChanged: () => {
      lastFetchRef.current = 0;
      fetchLogs();
    },
    onRefresh: () => {
      lastFetchRef.current = 0;
      fetchLogs();
    },
  });

  const totalPages = Math.ceil(total / pageSize);

  const updateFilter = useCallback((key: keyof AuditLogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
    lastFetchRef.current = 0;
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      operationType: '',
      projectId: '',
      environment: '',
      configKey: '',
      operatorId: '',
      from: '',
      to: '',
    });
    setPage(0);
    lastFetchRef.current = 0;
  }, []);

  return {
    logs,
    total,
    totalPages,
    loading,
    error,
    page,
    setPage,
    filters,
    updateFilter,
    resetFilters,
    fetchLogs,
    fetchRecentLogs,
  };
}
