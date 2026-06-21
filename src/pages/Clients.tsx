import { useState } from 'react';
import { Radio, UserPlus, Send, Trash2, Copy, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useClients } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import { formatTime } from '@/utils/format';

export default function Clients() {
  const { clients, loading, onlineCount, offlineCount, fetchClients, registerClient, deleteClient, notifyClient } = useClients();
  const [showAddModal, setShowAddModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientIp, setClientIp] = useState('');
  const [notifying, setNotifying] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!clientName) return;
    const result = await registerClient(clientName, clientIp);
    if (result) {
      setShowAddModal(false);
      setClientName('');
      setClientIp('');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除客户端 "${name}" 吗？`)) return;
    await deleteClient(id);
  };

  const handleNotify = async (targetClientId?: string) => {
    setNotifying(true);
    await notifyClient(targetClientId);
    setNotifying(false);
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="animate-slide-in">
      <PageHeader title="客户端通知" subtitle="管理注册客户端并推送配置刷新通知" actions={
        <div className="flex items-center gap-2">
          <button onClick={() => fetchClients()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#94A3B8] border border-[#334155] rounded-lg hover:bg-[#334155] transition-colors">
            <RefreshCw className="w-4 h-4" /> 刷新
          </button>
          <button onClick={() => handleNotify()} disabled={notifying} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500/15 text-blue-400 rounded-lg hover:bg-blue-500/25 transition-colors disabled:opacity-50">
            <Send className="w-4 h-4" /> {notifying ? '推送中...' : '通知全部刷新'}
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors">
            <UserPlus className="w-4 h-4" /> 注册客户端
          </button>
        </div>
      } />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#F1F5F9]">{onlineCount}</div>
              <div className="text-xs text-[#64748B]">在线客户端</div>
            </div>
          </div>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#F1F5F9]">{offlineCount}</div>
              <div className="text-xs text-[#64748B]">离线客户端</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 p-4 bg-[#1E293B] border border-[#334155] rounded-xl">
        <h3 className="text-sm font-medium text-[#F1F5F9] mb-2">SSE 事件流地址</h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-[#0F172A] rounded-lg text-sm text-emerald-400 font-mono">GET /api/events</code>
          <span className="text-xs text-[#64748B]">客户端连接此端点可实时接收配置变更通知</span>
        </div>
      </div>

      {loading && clients.length === 0 ? (
        <div className="text-center py-16 text-[#64748B]">
          <Radio className="w-12 h-12 mx-auto mb-3 opacity-50 animate-pulse" />
          <p>加载中...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-[#64748B]">
          <Radio className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无注册客户端</p>
          <p className="text-xs mt-1">点击"注册客户端"添加</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div key={client.id} className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 hover:border-emerald-500/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${client.online ? 'bg-emerald-400 animate-pulse-glow' : 'bg-slate-500'}`} />
                  <span className="text-sm font-medium text-[#F1F5F9]">{client.name}</span>
                </div>
                <Badge variant={client.online ? 'success' : 'default'}>{client.online ? '在线' : '离线'}</Badge>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">IP</span>
                  <span className="text-[#94A3B8] font-mono">{client.ip}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">最后心跳</span>
                  <span className="text-[#94A3B8]">{formatTime(client.lastHeartbeat)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Token</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[#94A3B8] font-mono text-[10px]">{client.token.slice(0, 8)}...</span>
                    <button onClick={() => copyToken(client.token)} className="text-[#64748B] hover:text-emerald-400 transition-colors">
                      <Copy className="w-3 h-3" />
                    </button>
                    {copiedToken === client.token && <span className="text-emerald-400 text-[10px]">已复制</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#334155]">
                <button onClick={() => handleNotify(client.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-blue-400 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors">
                  <Send className="w-3 h-3" /> 通知刷新
                </button>
                <button onClick={() => handleDelete(client.id, client.name)} className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-rose-400 bg-rose-500/10 rounded-lg hover:bg-rose-500/20 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-[#1E293B] border border-[#334155] rounded-xl p-4">
        <h4 className="text-sm font-medium text-[#F1F5F9] mb-3">客户端接入指南</h4>
        <div className="space-y-2 text-xs text-[#94A3B8]">
          <div><span className="text-emerald-400 font-mono">1.</span> 注册客户端获取 Token</div>
          <div><span className="text-emerald-400 font-mono">2.</span> 拉取配置: <code className="px-1.5 py-0.5 bg-[#0F172A] rounded text-emerald-400 font-mono">POST /api/pull {"{ project, environment, token }"}</code></div>
          <div><span className="text-emerald-400 font-mono">3.</span> 监听变更: <code className="px-1.5 py-0.5 bg-[#0F172A] rounded text-emerald-400 font-mono">GET /api/events</code> (SSE 事件流)</div>
          <div><span className="text-emerald-400 font-mono">4.</span> 心跳上报: <code className="px-1.5 py-0.5 bg-[#0F172A] rounded text-emerald-400 font-mono">POST /api/clients/:id/heartbeat</code></div>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="注册客户端">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#64748B] mb-1">客户端名称</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50" placeholder="例如: 用户服务-开发实例" />
          </div>
          <div>
            <label className="block text-xs text-[#64748B] mb-1">IP 地址（可选）</label>
            <input value={clientIp} onChange={(e) => setClientIp(e.target.value)} className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50" placeholder="例如: 192.168.1.100" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-[#64748B] hover:text-[#F1F5F9] transition-colors">取消</button>
            <button onClick={handleRegister} className="px-4 py-2 text-sm bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors">注册</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
