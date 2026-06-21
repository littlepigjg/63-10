import { useState } from 'react';
import { FileSearch, ChevronDown, ChevronUp, Search, RotateCcw, Calendar, Shield, Eye, EyeOff, Filter } from 'lucide-react';
import { useAuditLogs, useProjects } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import {
  formatTime,
  auditOperationLabel,
  auditOperationColor,
  changeFieldLabel,
  formatEncryptedDisplay,
  maskToken,
  envColor,
  envLabel,
} from '@/utils/format';
import type { AuditLogEntry, AuditValueChange } from '../../shared/types';

const OPERATION_TYPES = [
  { value: '', label: '全部' },
  { value: 'create', label: '新增' },
  { value: 'update', label: '修改' },
  { value: 'delete', label: '删除' },
  { value: 'encrypt', label: '加密' },
  { value: 'decrypt', label: '解密' },
];

interface ExpandedState {
  [key: string]: boolean;
}

function ChangeRow({ change }: { change: AuditValueChange }) {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const isValueField = change.field === 'value';

  const renderValue = (val: string | null, show: boolean) => {
    if (val === null) return <span className="text-[#475569] italic">（空）</span>;
    if (change.field === 'encrypted') {
      return (
        <span className={val === 'true' ? 'text-amber-400' : 'text-slate-400'}>
          {formatEncryptedDisplay(val === 'true')}
        </span>
      );
    }
    if (isValueField && val.includes('****') && !show) {
      return (
        <span className="font-mono text-xs text-amber-400/80">{val}</span>
      );
    }
    return (
      <span className="font-mono text-xs text-[#CBD5E1] break-all">
        {show ? val : (isValueField && val.length > 20 ? val.slice(0, 20) + '...' : val)}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-[100px_1fr_40px_1fr] gap-3 py-2 border-b border-[#334155]/30 last:border-0 items-start">
      <div className="text-xs text-[#94A3B8] pt-1">{changeFieldLabel(change.field)}</div>
      <div className="bg-rose-500/5 rounded px-2 py-1 min-h-[28px] flex items-center gap-1">
        {renderValue(change.oldValue, showOld)}
        {isValueField && change.oldValue && !change.oldValue.includes('****') && change.oldValue.length > 8 && (
          <button onClick={() => setShowOld(!showOld)} className="text-[#64748B] hover:text-[#F1F5F9] ml-1">
            {showOld ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        )}
      </div>
      <div className="text-center text-emerald-400 pt-1">→</div>
      <div className="bg-emerald-500/5 rounded px-2 py-1 min-h-[28px] flex items-center gap-1">
        {renderValue(change.newValue, showNew)}
        {isValueField && change.newValue && !change.newValue.includes('****') && change.newValue.length > 8 && (
          <button onClick={() => setShowNew(!showNew)} className="text-[#64748B] hover:text-[#F1F5F9] ml-1">
            {showNew ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

function LogDetailPanel({ log }: { log: AuditLogEntry }) {
  return (
    <div className="bg-[#0F172A]/60 border-t border-[#334155] p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1">操作人ID</div>
          <div className="text-xs text-[#94A3B8] font-mono">{log.operatorId}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1">客户端Token</div>
          <div className="text-xs text-[#94A3B8] font-mono">{maskToken(log.operatorToken)}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1">客户端IP</div>
          <div className="text-xs text-[#94A3B8] font-mono">{log.clientIp || '-'}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1">User-Agent</div>
          <div className="text-xs text-[#94A3B8] truncate max-w-[200px]" title={log.userAgent}>
            {log.userAgent || '-'}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          变更详情
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-3">
          <div className="grid grid-cols-[100px_1fr_40px_1fr] gap-3 pb-2 mb-2 border-b border-[#334155] text-[10px] text-[#64748B] uppercase tracking-wider">
            <div>字段</div>
            <div>变更前</div>
            <div></div>
            <div>变更后</div>
          </div>
          {log.changes.map((change, idx) => (
            <ChangeRow key={idx} change={change} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AuditLogs() {
  const { projects } = useProjects({ autoRefresh: false });
  const {
    logs,
    total,
    totalPages,
    loading,
    page,
    setPage,
    filters,
    updateFilter,
    resetFilters,
  } = useAuditLogs({ pageSize: 20 });

  const [expanded, setExpanded] = useState<ExpandedState>({});

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hasActiveFilters =
    filters.operationType ||
    filters.projectId ||
    filters.environment ||
    filters.configKey ||
    filters.operatorId ||
    filters.from ||
    filters.to;

  const environments: { value: string; label: string }[] = [];
  if (filters.projectId) {
    const project = projects.find((p) => p.id === filters.projectId);
    if (project) {
      project.environments.forEach((env) => {
        environments.push({ value: env.name, label: envLabel(env.name) });
      });
    }
  }

  return (
    <div className="animate-slide-in">
      <PageHeader title="配置审计日志" subtitle="记录所有配置变更操作，支持多条件筛选和变更详情追溯" />

      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <Filter className="w-4 h-4" />
            <span>筛选条件</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#F1F5F9] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              重置筛选
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-[#64748B] mb-1.5">操作类型</label>
            <select
              value={filters.operationType}
              onChange={(e) => updateFilter('operationType', e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50"
            >
              {OPERATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#64748B] mb-1.5">项目</label>
            <select
              value={filters.projectId}
              onChange={(e) => {
                updateFilter('projectId', e.target.value);
                updateFilter('environment', '');
              }}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">全部项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#64748B] mb-1.5">环境</label>
            <select
              value={filters.environment}
              onChange={(e) => updateFilter('environment', e.target.value)}
              disabled={!filters.projectId}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">全部环境</option>
              {environments.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#64748B] mb-1.5">配置键名</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B]" />
              <input
                type="text"
                value={filters.configKey}
                onChange={(e) => updateFilter('configKey', e.target.value)}
                placeholder="搜索配置键名..."
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg pl-9 pr-3 py-2 text-xs text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#64748B] mb-1.5">操作人ID</label>
            <input
              type="text"
              value={filters.operatorId}
              onChange={(e) => updateFilter('operatorId', e.target.value)}
              placeholder="输入操作人ID..."
              className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs text-[#64748B] mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              开始时间
            </label>
            <input
              type="datetime-local"
              value={filters.from}
              onChange={(e) => updateFilter('from', e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs text-[#64748B] mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              结束时间
            </label>
            <input
              type="datetime-local"
              value={filters.to}
              onChange={(e) => updateFilter('to', e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#334155]/50">
          <span className="text-xs text-[#64748B]">共找到 <span className="text-[#94A3B8] font-medium">{total}</span> 条审计记录</span>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="text-center py-16 text-[#64748B]">
          <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-50 animate-pulse" />
          <p>加载中...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-[#64748B]">
          <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无审计日志记录</p>
          {hasActiveFilters && <p className="text-xs mt-2">尝试调整筛选条件</p>}
        </div>
      ) : (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="w-10 text-left text-xs font-medium text-[#64748B] px-3 py-3"></th>
                <th className="text-left text-xs font-medium text-[#64748B] px-3 py-3">时间</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-3 py-3">操作</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-3 py-3">操作人</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-3 py-3">项目/环境</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-3 py-3">配置键</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-3 py-3">加密</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-3 py-3">变更项</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <>
                  <tr
                    key={log.id}
                    className={`border-b border-[#334155]/50 hover:bg-[#0F172A]/50 transition-colors cursor-pointer ${
                      idx % 2 === 1 ? 'bg-[#0F172A]/20' : ''
                    }`}
                    onClick={() => toggleExpand(log.id)}
                  >
                    <td className="px-3 py-3 text-[#64748B]">
                      {expanded[log.id] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${auditOperationColor(
                          log.operationType
                        )}`}
                      >
                        {auditOperationLabel(log.operationType)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs text-[#F1F5F9]">{log.operatorName}</div>
                      <div className="text-[10px] text-[#64748B] font-mono">{log.operatorId}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs text-[#F1F5F9]">{log.projectName}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${envColor(
                            log.environment
                          )}`}
                        >
                          {envLabel(log.environment)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs font-mono text-[#E2E8F0]">{log.configKey}</div>
                      {log.configDescription && (
                        <div className="text-[10px] text-[#64748B] truncate max-w-[160px]">
                          {log.configDescription}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {log.configEncrypted ? (
                        <Shield className="w-4 h-4 text-amber-400" />
                      ) : (
                        <span className="text-[10px] text-[#475569]">明文</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-[#94A3B8]">{log.changes.length} 项变更</span>
                    </td>
                  </tr>
                  {expanded[log.id] && (
                    <tr>
                      <td colSpan={8}>
                        <LogDetailPanel log={log} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-xs text-[#94A3B8] border border-[#334155] rounded-lg hover:bg-[#334155] disabled:opacity-50 transition-colors"
          >
            上一页
          </button>
          <span className="text-xs text-[#64748B] px-4">
            第 {page + 1} / {totalPages} 页
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 text-xs text-[#94A3B8] border border-[#334155] rounded-lg hover:bg-[#334155] disabled:opacity-50 transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
