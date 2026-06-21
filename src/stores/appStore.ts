import { create } from 'zustand';
import type { Project, LogEntry, ClientInfo } from '../../shared/types';

interface AppState {
  projects: Project[];
  recentLogs: LogEntry[];
  clients: ClientInfo[];
  selectedProjectId: string | null;
  selectedEnv: string;
  loading: boolean;
  sidebarCollapsed: boolean;

  setProjects: (projects: Project[]) => void;
  setRecentLogs: (logs: LogEntry[]) => void;
  setClients: (clients: ClientInfo[]) => void;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedEnv: (env: string) => void;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;

  fetchProjects: () => Promise<void>;
  fetchRecentLogs: () => Promise<void>;
  fetchClients: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  recentLogs: [],
  clients: [],
  selectedProjectId: null,
  selectedEnv: 'development',
  loading: false,
  sidebarCollapsed: false,

  setProjects: (projects) => set({ projects }),
  setRecentLogs: (recentLogs) => set({ recentLogs }),
  setClients: (clients) => set({ clients }),
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
  setSelectedEnv: (selectedEnv) => set({ selectedEnv }),
  setLoading: (loading) => set({ loading }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  fetchProjects: async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        set({ projects: data.data });
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  },

  fetchRecentLogs: async () => {
    try {
      const res = await fetch('/api/logs/recent?count=10');
      const data = await res.json();
      if (data.success) {
        set({ recentLogs: data.data });
      }
    } catch (error) {
      console.error('Failed to fetch recent logs:', error);
    }
  },

  fetchClients: async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (data.success) {
        set({ clients: data.data });
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  },
}));
