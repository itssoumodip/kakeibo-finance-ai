import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bot, Plus, Utensils, X, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { api, getToken } from '@/services/api';
import { pageIn, staggerCards } from '@/utils/gsap';

type BudgetRow = { _id:string; category:string; limit:number; month:string; spent:number; remaining:number };

export default function BudgetsPage(){
  const [data, setData] = useState<{ budgets:BudgetRow[]; total:{ limit:number; spent:number; pct:number }}|null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<BudgetRow|null>(null);
  const [form, setForm] = useState({ category:'Food', limit:'3000' });
  const [toast, setToast] = useState('');
  const showToast = (m:string)=>{ setToast(m); setTimeout(()=>setToast(''),2500); };

  const fetchBudgets = async()=>{
    if(!getToken()){ setLoading(false); return; }
    try{ const r = await api.budgets(); setData(r); } catch(e:any){ showToast(e.message); } finally{ setLoading(false); }
  };
  useEffect(()=>{ fetchBudgets(); },[]);

  const total = data?.total.limit || 0;
  const spent = data?.total.spent || 0;
  const pct = data?.total.pct ?? (total ? Math.round((spent/total)*100) : 0);
  const rows = data?.budgets || [] as BudgetRow[];

  const handleUpsert = async(e:React.FormEvent)=>{
    e.preventDefault();
    try{
      await api.upsertBudget({ category: form.category, limit: Number(form.limit) });
      setShowAdd(false); setEdit(null);
      showToast(edit ? 'Budget updated' : 'Budget added');
      fetchBudgets();
    } catch(ex:any){ showToast(ex.message); }
  };
  const handleDelete = async(id:string)=>{
    try{ const { deleteBudget } = await import('@/services/api').then(m=> ({ deleteBudget: async (id:string)=> { const res=await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/budgets/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }}); if(!res.ok) throw new Error(await res.text()); }})); await deleteBudget(id); showToast('Deleted'); fetchBudgets(); } catch{ 
      // fallback direct
      try{ await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/budgets/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('token')}`} }); fetchBudgets(); showToast('Deleted'); } catch(e:any){ showToast(e.message); }
    }
  };

  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{ if(rootRef.current) pageIn(rootRef.current); },[]);
  useLayoutEffect(()=>{ if(!loading && rootRef.current) staggerCards(rootRef.current, '.gsap-card'); },[loading, data]);

  if(loading) return <div className="space-y-3 p-4"><div className="h-40 animate-pulse bg-zinc-100 rounded-[24px]" /><div className="grid md:grid-cols-3 gap-4">{[1,2,3].map(i=><div key={i} className="h-28 animate-pulse bg-zinc-100 rounded-[24px]" />)}</div></div>;

  return (
    <div ref={rootRef} className="space-y-5 pb-20">
      <Header title="Budgets" />
      {toast && <div className="fixed top-4 right-4 z-50 bg-zinc-900 text-white text-sm px-4 py-2 rounded-full shadow-lg">{toast}</div>}
      <Card className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 gsap-card">
        <div>
          <div className="text-lg font-semibold dark:text-zinc-100">August Budget</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">You're doing great this month. Keep it up!</div>
          <div className="mt-4 flex items-baseline gap-2"><span className="text-[36px] font-extrabold tracking-tight text-[#5f5b77] dark:text-white">₹{spent.toLocaleString('en-IN')}</span><span className="text-zinc-500 dark:text-zinc-400 text-sm">spent</span></div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">of ₹{total.toLocaleString('en-IN')} total budget {!getToken() && '(demo)'}</div>
        </div>
        <div className="relative w-[200px] h-[200px] shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--donut-track)" strokeWidth="12" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--donut-fill)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${pct * 3.27} 327`} />
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--donut-fill-strong)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${12} 327`} strokeDashoffset={-pct * 3.27} opacity={0.9} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl font-bold text-[#5f5b77] dark:text-white">{pct}%</div><div className="text-[10px] tracking-widest font-semibold dark:text-zinc-300">USED</div>
          </div>
          <button onClick={()=>{ setForm({ category:'Food', limit:'3000' }); setEdit(null); setShowAdd(true); }} className="absolute -right-2 bottom-6 w-10 h-10 rounded-full bg-[#e8e2ff] dark:bg-[#3a3450] dark:text-white flex items-center justify-center shadow hover:scale-105 transition"><Plus size={16} /></button>
        </div>
      </Card>

      <div className="flex items-center justify-between"><h3 className="font-semibold text-lg">Category Breakdown</h3><button onClick={()=>{ setForm({ category:'', limit:'' }); setEdit(null); setShowAdd(true); }} className="text-sm px-3 py-1 rounded-full neumorphic">+ New budget</button></div>
      <div className="grid md:grid-cols-3 gap-4">
        {rows.map(c => {
          const colors = c.category==='Food' ? 'from-[#356574] to-[#b2e2f4]' : c.category==='Transport' ? 'from-red-700 to-red-200' : 'from-emerald-700 to-emerald-200';
          const warn = c.spent / c.limit > 0.85;
          return (
            <Card key={c.category} className="p-5 relative group gsap-card">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-semibold"><span className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center"><Utensils size={12} /></span> {c.category}</span>{warn && <span className="text-red-500 text-xs">⚠</span>}</div>
              <div className="flex justify-between text-sm mt-3"><span className="font-bold">₹{c.spent.toLocaleString('en-IN')}</span><span className="text-zinc-500">/ ₹{c.limit.toLocaleString('en-IN')}</span></div>
              <div className="h-2 rounded-full bg-zinc-100 mt-2 overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${colors}`} style={{ width: `${Math.min(100,(c.spent / c.limit) * 100)}%` }} /></div>
              <div className={`text-xs mt-2 ${warn ? 'text-red-600' : 'text-emerald-700'}`}>₹{c.remaining} left</div>
              <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                <button onClick={()=>{ setEdit(c); setForm({ category:c.category, limit:String(c.limit) }); setShowAdd(true); }} className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center"><Pencil size={12} /></button>
                {c._id && c._id.length>5 && <button onClick={()=>handleDelete(c._id)} className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-red-600"><Trash2 size={12} /></button>}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 flex gap-3 gsap-card">
        <div className="w-8 h-8 rounded-full bg-[#e8e2ff] flex items-center justify-center shrink-0"><Bot size={14} /></div>
        <div><div className="text-sm font-semibold text-[#5f5b77]">AI Insight</div><div className="text-sm text-zinc-600 leading-relaxed">{rows.find(r=>r.spent/r.limit>0.85) ? `Transport is at ${Math.round(rows.find(r=>r.category==='Transport')!.spent/2000*100)}% — consider metro Fridays.` : 'Based on your spending pace, you are on track this month.'}</div></div>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-md flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <Card className="w-full max-w-sm p-6 shadow-2xl" onClick={(e:any)=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">{edit ? 'Edit budget' : 'New budget'}</h3><button onClick={()=>setShowAdd(false)} className="w-8 h-8 rounded-full neumorphic flex items-center justify-center"><X size={14} /></button></div>
            <form onSubmit={handleUpsert} className="space-y-3">
              <select value={form.category} onChange={e=>setForm({...form, category:e.target.value})} className="w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none">
                <option>Food</option><option>Transport</option><option>Shopping</option><option>Bills</option><option>Entertainment</option><option>Other</option>
              </select>
              <input value={form.limit} onChange={e=>setForm({...form, limit:e.target.value})} type="number" placeholder="Limit (₹)" required className="w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none" />
              <button className="w-full py-3 rounded-full bg-[#5f5b77] text-white font-medium">{edit ? 'Update' : 'Add budget'}</button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}