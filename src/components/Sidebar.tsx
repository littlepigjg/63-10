import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, Shield, ScrollText, Radio, ChevronLeft, ChevronRight, Server, FileSearch } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/configs', icon: Settings, label: '配置管理' },
  { to: '/encryption', icon: Shield, label: '加密管理' },
  { to: '/logs', icon: ScrollText, label: '操作日志' },
  { to: '/audit-logs', icon: FileSearch, label: '审计日志' },
  { to: '/clients', icon: Radio, label: '客户端通知' },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-[#1E293B] border-r border-[#334155] transition-all duration-200 z-40 flex flex-col ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#334155]">
        <Server className="w-6 h-6 text-emerald-500 shrink-0" />
        {!sidebarCollapsed && (
          <span className="text-lg font-semibold text-[#F1F5F9] whitespace-nowrap">配置中心</span>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-[#94A3B8] hover:bg-[#334155] hover:text-[#F1F5F9]'
              } ${sidebarCollapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-12 border-t border-[#334155] text-[#64748B] hover:text-[#F1F5F9] transition-colors"
      >
        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
