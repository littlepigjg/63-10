import { Shield, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { useEncryption } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';

export default function Encryption() {
  const { statusItems, loading, encryptedCount, totalCount, encryptConfig, decryptConfig } = useEncryption();

  return (
    <div className="animate-slide-in">
      <PageHeader title="加密管理" subtitle="管理配置项的加密状态" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#F1F5F9]">{totalCount}</div>
              <div className="text-xs text-[#64748B]">配置项总数</div>
            </div>
          </div>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#F1F5F9]">{encryptedCount}</div>
              <div className="text-xs text-[#64748B]">已加密</div>
            </div>
          </div>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Unlock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#F1F5F9]">{totalCount - encryptedCount}</div>
              <div className="text-xs text-[#64748B]">未加密</div>
            </div>
          </div>
        </div>
      </div>

      {loading && totalCount === 0 ? (
        <div className="text-center py-16 text-[#64748B]">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-50 animate-pulse" />
          <p>加载中...</p>
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-16 text-[#64748B]">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无配置项</p>
          <p className="text-xs mt-1">请先在配置管理中添加配置项</p>
        </div>
      ) : (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="text-left text-xs font-medium text-[#64748B] px-4 py-3">项目</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-4 py-3">环境</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-4 py-3">键名</th>
                <th className="text-left text-xs font-medium text-[#64748B] px-4 py-3">状态</th>
                <th className="text-right text-xs font-medium text-[#64748B] px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {statusItems.map((item, idx) => (
                <tr key={`${item.project}-${item.environment}-${item.key}-${idx}`} className="border-b border-[#334155]/50 hover:bg-[#0F172A]/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-[#F1F5F9]">{item.project}</td>
                  <td className="px-4 py-3 text-sm text-[#94A3B8]">{item.environment}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-emerald-400">{item.key}</span>
                  </td>
                  <td className="px-4 py-3">
                    {item.encrypted ? (
                      <Badge variant="warning">
                        <Lock className="w-3 h-3 mr-1" /> 已加密
                      </Badge>
                    ) : (
                      <Badge variant="info">明文</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {item.encrypted ? (
                        <button onClick={() => item.projectId && decryptConfig(item.projectId, item.environment, item.key)} disabled={!item.projectId} className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-400 bg-blue-500/10 rounded hover:bg-blue-500/20 transition-colors disabled:opacity-50">
                          <Unlock className="w-3 h-3" /> 解密
                        </button>
                      ) : (
                        <button onClick={() => item.projectId && encryptConfig(item.projectId, item.environment, item.key)} disabled={!item.projectId} className="flex items-center gap-1 px-2.5 py-1 text-xs text-amber-400 bg-amber-500/10 rounded hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                          <Lock className="w-3 h-3" /> 加密
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 bg-[#1E293B] border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-amber-400">加密说明</h4>
          <p className="text-xs text-[#94A3B8] mt-1">使用 AES-256-GCM 对称加密算法。加密后的值将无法直接查看，客户端拉取配置时自动解密。加密密钥存储在服务器配置文件中，请妥善保管。</p>
        </div>
      </div>
    </div>
  );
}
