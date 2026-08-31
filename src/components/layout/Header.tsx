import { useState } from 'react';
import { Bell, Calendar, X } from 'lucide-react';

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const [showNotif, setShowNotif] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [month, setMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`);

  return (
    <div className="flex items-start justify-between gap-4 mb-6 relative">
      <div>
        <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight leading-none" style={{ letterSpacing: '-0.03em' }}>{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button onClick={()=> setShowCal(v=>!v)} className="w-9 h-9 rounded-full neumorphic flex items-center justify-center text-zinc-600 hover:text-[#5f5b77] transition"><Calendar size={16} /></button>
          {showCal && (
            <div className="absolute right-0 top-11 z-30 neumorphic rounded-2xl p-3 w-56">
              <div className="text-xs font-semibold mb-2">Select month</div>
              <input type="month" value={month} onChange={e=> setMonth(e.target.value)} className="w-full neumorphic-inset rounded-full px-3 py-2 text-sm outline-none" />
              <button onClick={()=> setShowCal(false)} className="mt-2 w-full py-2 rounded-full bg-[#5f5b77] text-white text-xs">Go to {month}</button>
            </div>
          )}
        </div>
        <div className="relative">
          <button onClick={()=> setShowNotif(v=>!v)} className="w-9 h-9 rounded-full neumorphic flex items-center justify-center text-zinc-600 hover:text-[#5f5b77] transition relative"><Bell size={16} /><span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" /></button>
          {showNotif && (
            <div className="absolute right-0 top-11 z-30 neumorphic rounded-2xl p-4 w-72">
              <div className="flex justify-between items-center mb-3"><span className="text-sm font-semibold">Notifications</span><button onClick={()=> setShowNotif(false)} className="w-6 h-6 rounded-full hover:bg-zinc-100 flex items-center justify-center"><X size={12} /></button></div>
              <div className="space-y-2 text-sm">
                <div className="neumorphic-inset rounded-2xl p-3"><div className="font-medium">Budget alert</div><div className="text-xs text-zinc-500">Transport is at 85% — consider metro</div></div>
                <div className="neumorphic-inset rounded-2xl p-3"><div className="font-medium">New insight</div><div className="text-xs text-zinc-500">Savings rate updated for this month</div></div>
                <button onClick={()=> setShowNotif(false)} className="w-full text-xs text-[#5f5b77] hover:underline mt-2">Mark all read</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}