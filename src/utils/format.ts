export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function maskValue(value: string, visible: number = 4): string {
  if (value.length <= visible) return '****';
  return value.slice(0, visible) + '****';
}

export function logTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    pull: '拉取配置',
    change: '配置变更',
    encrypt: '加密',
    decrypt: '解密',
    client_register: '客户端注册',
    notify: '通知推送',
  };
  return labels[type] || type;
}

export function logTypeColor(type: string): string {
  const colors: Record<string, string> = {
    pull: 'bg-blue-500/20 text-blue-400',
    change: 'bg-emerald-500/20 text-emerald-400',
    encrypt: 'bg-amber-500/20 text-amber-400',
    decrypt: 'bg-purple-500/20 text-purple-400',
    client_register: 'bg-cyan-500/20 text-cyan-400',
    notify: 'bg-rose-500/20 text-rose-400',
  };
  return colors[type] || 'bg-slate-500/20 text-slate-400';
}

export function envLabel(env: string): string {
  const labels: Record<string, string> = {
    development: '开发',
    testing: '测试',
    production: '生产',
  };
  return labels[env] || env;
}

export function envColor(env: string): string {
  const colors: Record<string, string> = {
    development: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    testing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    production: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };
  return colors[env] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}
