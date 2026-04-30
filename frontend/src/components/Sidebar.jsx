import { useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard, List, PlusCircle, BarChart2, Settings, Shield
} from 'lucide-react'
import { cn } from '../lib/utils'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/events', label: '事件列表', icon: List },
  { path: '/events/new', label: '新增事件', icon: PlusCircle },
  { path: '/analytics', label: '分析報表', icon: BarChart2 },
  { path: '/settings', label: '系統設定', icon: Settings },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  return (
    <aside className="w-56 min-h-screen bg-slate-900 flex flex-col shadow-xl">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white text-sm font-semibold leading-tight">資安週報</div>
            <div className="text-slate-400 text-xs">分析平台</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = path === '/events/new'
            ? pathname === '/events/new'
            : pathname.startsWith(path) && !(path === '/events' && pathname === '/events/new')
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                active
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700">
        <p className="text-slate-500 text-xs">© 2026 資安週報平台 </p>
        <p className="text-slate-500 text-xs">Built By wliu</p>
      </div>
    </aside>
  )
}
