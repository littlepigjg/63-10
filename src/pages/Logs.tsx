import { ScrollText } from 'lucide-react';
import { useLogs } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { formatTime, logTypeLabel, logTypeColor } from '@/utils/format';

const LOG_TYPES = [
  { value: '', label: '全部' },
  { value: 'pull', label: '拉取配置' },
  { value: 'change', label: '配置变更' },
  { value: 'encrypt', label: '加密' },
  { value: 'decrypt', label: '解密' },
  { value: 'client_register', label: '客户端注册' },
  { value: 'notify', label: '通知推送' },
];

export default function Logs() {
  const { logs, total, totalPages, loading, typeFilter, setTypeFilter, page, setPage } = useLogs();

  return (
    <div className="animate-slide-in">
      <PageHeader title="操作日志" subtitle="查看所有配置操作和客户端拉取记录" />

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1 bg-[#1E293B] border border-[#334155] rounded-lg p-1">
          {LOG_TYPES.map((t) => (
            <button key={t.value} onClick={() => setTypeFilter(t.value as typeof typeFilter)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              typeFilter === t.value ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}>
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#64748B]">共 {total} 条记录</span>
      </div>

      {loading && logs.length === 0 ? (
        <div className="text-center py-16 text-[#64748B]">
          <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-50 animate-pulse" />
          <p>加载中...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-[#64748B]">
          <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无日志记录</p>
        </div>
      ) : (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="text-left text-xs font-medium text-[#64748B] px-4 py-3">时间</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-4 py-3">类型</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-4 py-3">客户端</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-4 py-3">项目/环境</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-4 py-3">详情</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={`${log.id}-${idx}`} className={`border-b border-[#334155]/50 hover:bg-[#0F172A]/50 transition-colors ${idx % 2 === 1 ? 'bg-[#0F172A]/20' : ''}`}>
                  <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">{formatTime(log.timestamp)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${logTypeColor(log.type)}`}>
                      {logTypeLabel(log.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-[#94A3B8]">{log.clientName || '-'}</div>
                    <div className="text-[10px] text-[#64748B]">{log.clientIp || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94A3B8]">
                    {log.project ? `${log.project}${log.environment ? '/' + log.environment : ''}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94A3B8] max-w-[300px] truncate">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1.5 text-xs text-[#94A3B8] border border-[#334155] rounded-lg hover:bg-[#334155] disabled:opacity-50 transition-colors">上一页</button>
          <span className="text-xs text-[#64748B]">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 text-xs text-[#94A3B8] border border-[#334155] rounded-lg hover:bg-[#334155] disabled:opacity-50 transition-colors">下一页</button>
        </div>
      )}
    </div>
  );
}
