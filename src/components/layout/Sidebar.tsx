import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, Wallet, TrendingUp, BarChart3, Bot, FileText, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Sidebar(){
  const loc = useLocation();
  const { user, logout } = useAuth();
  const links = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: Receipt },
    { to: '/budgets', label: 'Budgets', icon: Wallet },
    { to: '/investments', label: 'Investments', icon: TrendingUp },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/assistant', label: 'AI Assistant', icon: Bot },
    { to: '/reports', label: 'Reports', icon: FileText },
  ];
  return (
    <>
      <aside className="hidden lg:flex w-[248px] shrink-0 flex-col bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 sticky top-0 h-screen p-4">
        <div className="px-2 pt-2 pb-6">
          <div className="text-[32px] font-extrabold tracking-tight leading-none text-[#5f5b77] dark:text-zinc-100" style={{ letterSpacing: '-0.03em' }}>MONEYY</div>
          <div className="text-[11px] tracking-wide text-zinc-500 dark:text-zinc-400 -mt-1">AI Financial Assistant</div>
        </div>
        <NavLink to="/assistant" className={`mx-2 mb-4 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${loc.pathname === '/assistant' ? 'bg-[#e8e2ff] dark:bg-zinc-800 text-[#5f5b77]' : 'bg-[#e8e2ff]/70 dark:bg-zinc-800 text-[#5f5b77] dark:text-zinc-300 hover:bg-[#e8e2ff]'}`}>
          <Bot size={16} /> Ask AI Assistant
        </NavLink>
        <nav className="flex flex-col gap-1 flex-1">
          {links.map(l => {
            const active = loc.pathname === l.to;
            return (
              <NavLink key={l.to} to={l.to} className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-[14px] font-medium transition ${active ? 'bg-[#e8e2ff] dark:bg-zinc-800 text-[#5f5b77] dark:text-white shadow-[inset_2px_2px_6px_rgba(0,0,0,0.04)]' : 'text-zinc-700 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                <l.icon size={18} strokeWidth={active ? 2.2 : 1.8} /> {l.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          {user && <div className="mx-2 mb-2 px-3 py-2 rounded-2xl neumorphic-inset text-xs"><div className="font-medium truncate">{user.name}</div><div className="text-zinc-500 truncate">{user.email}</div></div>}
          <NavLink to="/settings" className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm ${loc.pathname === '/settings' ? 'bg-[#e8e2ff] text-[#5f5b77]' : 'text-zinc-700 dark:text-zinc-400'}`}><Settings size={18} /> Settings</NavLink>
          <button onClick={logout} className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-400 hover:bg-red-50 hover:text-red-600"><LogOut size={18} /> Logout</button>
        </div>
      </aside>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-t border-zinc-100 dark:border-zinc-800 flex justify-around py-2 pb-3">
        {[
          { to: '/', icon: LayoutDashboard, label: 'Home' },
          { to: '/transactions', icon: Receipt, label: 'Tx' },
          { to: '/assistant', icon: Bot, label: 'AI', prominent: true },
          { to: '/analytics', icon: BarChart3, label: 'Stats' },
          { to: '/settings', icon: Settings, label: 'You' },
        ].map((l:any) => {
          const active = loc.pathname === l.to;
          return (
            <NavLink key={l.to} to={l.to} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-2xl ${l.prominent ? 'bg-[#5f5b77] text-white px-5 -mt-2 py-2 shadow-lg' : active ? 'text-[#5f5b77] dark:text-white' : 'text-zinc-400'}`}>
              <l.icon size={l.prominent ? 20 : 18} /> <span className="text-[10px] leading-none">{l.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}