const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Network error' };
  }
}

export const api = {
  get: <T>(url: string) => request<T>(url),

  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

export const auditApi = {
  getLogs: (params: {
    operationType?: string;
    projectId?: string;
    environment?: string;
    configKey?: string;
    operatorId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.set(k, String(v));
      }
    });
    return request<{ logs: unknown[]; total: number }>(`/audit-logs?${query.toString()}`);
  },

  getRecentLogs: (count: number = 10) =>
    request<unknown[]>(`/audit-logs/recent?count=${count}`),
};
