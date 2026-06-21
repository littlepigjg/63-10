import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Activity, Wifi, WifiOff, Plus, ArrowRight } from 'lucide-react';
import { useProjects, useClients, useLogs } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { formatTime, logTypeLabel, logTypeColor, envLabel, envColor } from '@/utils/format';
import type { LogEntry } from '../../shared/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { onlineCount, offlineCount } = useClients();
  const { fetchRecentLogs } = useLogs({ autoRefresh: false, pageSize: 8 });
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);

  const loadRecentLogs = useCallback(async () => {
    const logs = await fetchRecentLogs(8);
    setRecentLogs(logs);
  }, [fetchRecentLogs]);

  useEffect(() => {
    loadRecentLogs();
    const interval = setInterval(loadRecentLogs, 15000);
    return () => clearInterval(interval);
  }, [loadRecentLogs]);

  const totalConfigs = projects.reduce((sum, p) => sum + p.environments.reduce((s, e) => s + e.configs.length, 0), 0);

  return (
    <div className="animate-slide-in">
      <PageHeader title="仪表盘" subtitle="配置中心运行概览" actions={
        <button onClick={() => navigate('/configs')} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors text-sm">
          <Plus className="w-4 h-4" />
          管理配置
        </button>
      } />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FolderKanban} label="项目数" value={projects.length} color="emerald" />
        <StatCard icon={Activity} label="配置项总数" value={totalConfigs} color="blue" />
        <StatCard icon={Wifi} label="在线客户端" value={onlineCount} color="emerald" />
        <StatCard icon={WifiOff} label="离线客户端" value={offlineCount} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#F1F5F9]">项目列表</h2>
            <button onClick={() => navigate('/configs')} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              查看全部 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {projects.length === 0 ? (
            <div className="text-center py-8 text-[#64748B] text-sm">暂无项目，点击"管理配置"创建</div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} onClick={() => navigate('/configs')} className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg hover:border-emerald-500/30 border border-transparent transition-colors cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-[#F1F5F9]">{project.name}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{project.description || '无描述'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {project.environments.map((env) => (
                      <span key={env.name} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${envColor(env.name)}`}>
                        {envLabel(env.name)} ({env.configs.filter((c) => c.key !== '_init').length})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#F1F5F9]">最近操作</h2>
            <button onClick={() => navigate('/logs')} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              查看全部 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-[#64748B] text-sm">暂无操作记录</div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#0F172A] transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    log.type === 'pull' ? 'bg-blue-400' :
                    log.type === 'change' ? 'bg-emerald-400' :
                    log.type === 'encrypt' ? 'bg-amber-400' :
                    log.type === 'decrypt' ? 'bg-purple-400' :
                    'bg-rose-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${logTypeColor(log.type)}`}>
                        {logTypeLabel(log.type)}
                      </span>
                      <span className="text-xs text-[#64748B]">{formatTime(log.timestamp)}</span>
                    </div>
                    <div className="text-xs text-[#94A3B8] mt-0.5 truncate">{log.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-400',
    blue: 'bg-blue-500/15 text-blue-400',
    amber: 'bg-amber-500/15 text-amber-400',
    rose: 'bg-rose-500/15 text-rose-400',
  };
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-[#F1F5F9]">{value}</div>
          <div className="text-xs text-[#64748B]">{label}</div>
        </div>
      </div>
    </div>
  );
}
