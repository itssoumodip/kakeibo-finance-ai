import { useEffect, useMemo, useRef, useState } from 'react';
import { TrendingUp, Utensils } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api, getToken } from '@/services/api';
import { pageIn, staggerCards } from '@/utils/gsap';

export default function ReportsPage(){
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(!!getToken());
  const [month, setMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`);
  const [toast, setToast] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{ if(rootRef.current) pageIn(rootRef.current); },[]);
  useEffect(()=>{
    if(!getToken()){ setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    api.report(month).then(d => { if(!cancelled) setData(d); }).catch(()=>{}).finally(()=> { if(!cancelled) setLoading(false); });
    return ()=>{ cancelled = true; };
  },[month]);
  useEffect(()=>{ if(!loading && rootRef.current) staggerCards(rootRef.current, '.gsap-card'); },[loading, data]);
  const summary = useMemo(() => data?.summary || { income:0, expenses:0, investments:0, available:0, savingsRate:0 }, [data]);
  const exportFile = async(type:'csv'|'excel')=>{
    if(!getToken()){ setToast('Login to export'); setTimeout(()=>setToast(''),2000); return; }
    try{
      const url = type==='csv' ? api.exportCsv() : api.exportExcel();
      const res = await fetch(url, { headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }});
      if(!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = type==='csv' ? 'transactions.csv' : 'transactions.xlsx'; a.click();
    } catch(e:any){ setToast(e.message); setTimeout(()=>setToast(''),2000); }
  };
  if(loading && !data) return <div className="space-y-4"><div className="h-32 animate-pulse bg-zinc-100 rounded-[24px]" /><div className="h-48 animate-pulse bg-zinc-100 rounded-[24px]" /></div>;
  return (
    <div ref={rootRef} className="space-y-5 pb-20">
      {toast && <div className="fixed top-4 right-4 z-50 bg-zinc-900 text-white text-sm px-4 py-2 rounded-full">{toast}</div>}
      <div className="flex justify-between items-start gsap-card">
        <div><h1 className="text-[32px] font-extrabold tracking-tight leading-none">{month}</h1><p className="text-sm text-zinc-500">Monthly Financial Report</p><input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="mt-2 text-sm neumorphic-inset rounded-full px-3 py-1" /></div>
        <div className="flex gap-2"><button onClick={()=>exportFile('csv')} className="px-4 py-2 rounded-full bg-[#e8e2ff] text-sm font-medium hover:bg-[#dcd6ff]">↓ CSV</button><button onClick={()=>exportFile('excel')} className="px-4 py-2 rounded-full bg-[#e8e2ff] text-sm font-medium hover:bg-[#dcd6ff]">Excel</button></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { k: 'INCOME', v: `₹${summary.income.toLocaleString('en-IN')}`, d: 'from this month', c: 'text-emerald-700' },
          { k: 'EXPENSES', v: `₹${summary.expenses.toLocaleString('en-IN')}`, d: 'from this month', c: 'text-red-600' },
          { k: 'INVESTMENTS', v: `₹${summary.investments.toLocaleString('en-IN')}`, d: 'Steady', c: 'text-zinc-500' },
          { k: 'SAVINGS RATE', v: `${summary.savingsRate}%`, d: '', c: '', highlight: true },
        ].map(s => (
          <Card key={s.k} className={`p-4 gsap-card ${s.highlight ? 'bg-[#e8e2ff] dark:bg-zinc-800' : ''}`}>
            <div className="flex justify-between items-start"><span className="text-[11px] tracking-widest font-semibold text-zinc-500">{s.k}</span><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${s.highlight ? 'bg-white' : s.k === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : s.k === 'EXPENSES' ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-sky-600'}`}>{s.k === 'INCOME' ? '↓' : s.k === 'EXPENSES' ? '↑' : '↗'}</span></div>
            <div className="text-[20px] font-bold mt-2">{s.v}</div>
            <div className={`text-xs mt-1 ${s.c}`}>{s.d}</div>
            {s.highlight && <div className="h-1 bg-white rounded-full mt-3"><div className="h-full w-[48%] bg-[#5f5b77] rounded-full" /></div>}
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 gsap-card">
            <h3 className="font-semibold mb-4">Biggest Spending Categories</h3>
            {(data?.categories?.length) ? (
            <div className="space-y-4">
              {data.categories.slice(0,3).map((b:any) => (
                <div key={b._id} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center"><Utensils size={12} /></span>
                  <div className="flex-1"><div className="flex justify-between text-sm"><span>{b._id}</span><span className="font-semibold">₹{b.total.toLocaleString('en-IN')}</span></div><div className="h-2 bg-zinc-100 rounded-full mt-1"><div className="h-full rounded-full" style={{ width: `${Math.min(100,b.total/(data.categories[0]?.total||1)*100)}%`, background: '#a7f3d0' }} /></div></div>
                </div>
              ))}
            </div>
            ) : <div className="text-sm text-zinc-500 py-6 text-center">No spending data yet — add transactions to see categories</div>}
          </Card>
          <Card className="p-5 gsap-card">
            <h3 className="font-semibold mb-3">Changes from Last Month</h3>
            {(data?.comparison && (data.summary.expenses || data.comparison.prevSummary?.expenses)) ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="neumorphic-inset rounded-2xl p-4 text-center"><div className="text-red-600 flex justify-center"><TrendingUp size={20} /></div><div className="text-[11px] tracking-widest font-semibold mt-2">EXPENSES</div><div className="font-bold">{(data.summary.expenses - (data.comparison.prevSummary?.expenses||0)) >=0 ? '+' : ''}₹{(data.summary.expenses - (data.comparison.prevSummary?.expenses||0)).toLocaleString('en-IN')}</div></div>
              <div className="neumorphic-inset rounded-2xl p-4 text-center"><div className="text-emerald-600 flex justify-center"><TrendingUp size={20} className="rotate-180" /></div><div className="text-[11px] tracking-widest font-semibold mt-2">INCOME</div><div className="font-bold">{(data.summary.income - (data.comparison.prevSummary?.income||0)) >=0 ? '+' : ''}₹{(data.summary.income - (data.comparison.prevSummary?.income||0)).toLocaleString('en-IN')}</div></div>
            </div>
            ) : <div className="text-sm text-zinc-500 py-6 text-center">No comparison data yet — add transactions this and last month</div>}
          </Card>
        </div>
        <Card className="p-5 bg-[#e8e2ff] dark:bg-zinc-800 gsap-card">
          <h3 className="font-semibold flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-white flex items-center justify-center">💡</span> AI Insights</h3>
          {(data?.summary?.expenses || data?.summary?.income) ? (
          <div className="space-y-3 mt-4">
            <div className="bg-white dark:bg-zinc-900 rounded-[24px] p-4 text-sm leading-relaxed italic shadow-sm">{data.categories?.[0] ? `"${data.categories[0]._id} is your top spend at ₹${data.categories[0].total.toLocaleString('en-IN')} this month."` : `"Add transactions to get AI insights."`}</div>
            <div className="bg-white dark:bg-zinc-900 rounded-[24px] p-4 text-sm leading-relaxed italic shadow-sm">{summary.savingsRate > 0 ? `"Savings rate ${summary.savingsRate}% — ${summary.savingsRate>40 ? 'great job' : 'try to save more'}."` : `"No savings data yet."`}</div>
          </div>
          ) : <div className="text-sm text-zinc-500 py-6 text-center">No insights yet — add data to get AI tips</div>}
          <button onClick={()=> setToast('Ask AI in Assistant tab for personalized tips')} className="mt-6 w-full py-2.5 rounded-full bg-white dark:bg-zinc-700 font-medium text-sm shadow">Ask for more tips</button>
        </Card>
      </div>
    </div>
  );
}