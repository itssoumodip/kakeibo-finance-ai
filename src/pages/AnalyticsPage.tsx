import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, Utensils } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { api, getToken } from '@/services/api';
import { categories, sixMonth } from '@/data/demo';
import { pageIn, staggerCards } from '@/utils/gsap';

export default function AnalyticsPage(){
  const [range, setRange] = useState('30D');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(!!getToken());
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{ if(rootRef.current) pageIn(rootRef.current); },[]);
  useEffect(()=>{
    if(!getToken()){ setLoading(false); return; }
    setLoading(true);
    api.analytics(range).then(d=> setData(d)).catch(()=>{}).finally(()=> setLoading(false));
  },[range]);
  useLayoutEffect(()=>{ if(!loading && rootRef.current) staggerCards(rootRef.current, '.gsap-card'); },[loading, data]);
  const catData = (data?.categoryBreakdown || []).map((c:any,i:number)=>({ name:c.category, amount:c.amount, color: categories[i%categories.length]?.color || '#9ca3af' }));
  const merchants = (data?.topMerchants || []).map((m:any,i:number)=>({ n:m.merchant||m._id, c:'', a:`₹${m.amount}`, bg:['#ffe4de','#c8c3e3','#fde68a','#e8e2ff'][i%4], s:(m.merchant||'')[0]||'?' }));
  const trend = (data?.monthlyTrend || []).map((m:any)=>({ name:m.month.slice(5), v:m.total }));
  const savings = data?.savingsRate ?? 0;
  if(loading) return <div className="space-y-4"><div className="h-32 animate-pulse bg-zinc-100 rounded-[24px]" /><div className="h-48 animate-pulse bg-zinc-100 rounded-[24px]" /></div>;
  return (
    <div ref={rootRef} className="space-y-4 pb-20">
      <Header title="Analytics Overview" subtitle="Here's a breakdown of your finances." />
      <div className="flex gap-2 justify-end gsap-card">
        {['7D','30D','3M','6M','1Y'].map(k=> <button key={k} onClick={()=>setRange(k)} className={`px-3 py-1 rounded-full text-xs font-medium ${range===k?'bg-[#5f5b77] text-white':'neumorphic'}`}>{k}</button>)}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 text-center gsap-card">
          <div className="text-[11px] tracking-widest font-semibold text-zinc-500">SAVINGS RATE</div>
          <div className="text-[36px] font-extrabold text-emerald-700 leading-none mt-2">{savings}%</div>
          <div className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full mt-2"><ArrowUpRight size={12} /> +2.4% vs last month</div>
        </Card>
        <Card className="lg:col-span-2 p-5 gsap-card">
          <div className="font-semibold mb-3">Income vs Expenses {data && <span className="text-emerald-600 text-xs">● live</span>}</div>
          {(data?.income || data?.expenses) ? (
          <div className="space-y-3">
            <div><div className="flex justify-between text-sm"><span>Income</span><span className="font-semibold text-emerald-700">₹{(data?.income ?? 0).toLocaleString('en-IN')}</span></div><div className="h-2 bg-zinc-100 rounded-full mt-1"><div className="h-full bg-emerald-700 rounded-full" style={{ width: `${data?.income ? 100 : 0}%` }} /></div></div>
            <div><div className="flex justify-between text-sm"><span>Expenses</span><span className="font-semibold text-red-600">₹{(data?.expenses ?? 0).toLocaleString('en-IN')}</span></div><div className="h-2 bg-zinc-100 rounded-full mt-1"><div className="h-full bg-red-700 rounded-full" style={{ width: `${data?.income ? Math.min(100, (data?.expenses||0)/data.income*100) : 0}%` }} /></div></div>
          </div>
          ) : <div className="text-sm text-zinc-500 py-4 text-center">No income/expenses yet — add transactions to see analytics</div>}
        </Card>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 gsap-card">
          <div className="flex justify-between"><h3 className="font-semibold">Spending Trend</h3><span className="text-xs neumorphic-inset px-3 py-1 rounded-full">Last 6 Months</span></div>
          <div className="h-[180px] mt-4">
            {trend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}><Area type="monotone" dataKey="v" stroke="#5f5b77" strokeWidth={2.5} fill="#f3f0ff" /></AreaChart>
            </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-sm text-zinc-500">No trend data yet</div>}
          </div>
        </Card>
        <Card className="p-5 gsap-card">
          <h3 className="font-semibold mb-3">Composition</h3>
          {catData.length ? (
          <div className="w-[160px] h-[160px] mx-auto relative">
            <PieChart width={160} height={160}><Pie data={catData} dataKey="amount" cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2}>{catData.map((c:any, i:number) => <Cell key={i} fill={c.color} />)}</Pie></PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-xs text-zinc-500">Total</span><span className="font-bold">₹{catData.reduce((s:number,c:any)=>s+c.amount,0).toLocaleString('en-IN')}</span></div>
          </div>
          ) : <div className="text-sm text-zinc-500 py-8 text-center">No composition data</div>}
        </Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 gsap-card">
          <h3 className="font-semibold mb-3">Top Merchants</h3>
          {merchants.length ? (
          <div className="space-y-2">
            {merchants.map((m:any) => (
              <div key={m.n} className="flex justify-between neumorphic-inset rounded-full px-3 py-2 items-center">
                <span className="flex items-center gap-3"><span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: m.bg }}>{m.s}</span><span><div className="text-sm font-medium">{m.n}</div><div className="text-xs text-zinc-500">{m.c}</div></span></span><span className="text-sm font-bold">{m.a}</span>
              </div>
            ))}
          </div>
          ) : <div className="text-sm text-zinc-500 py-4 text-center">No merchant data yet</div>}
        </Card>
        <Card className="p-5 gsap-card">
          <h3 className="font-semibold mb-3">Category Comparison</h3>
          {(data?.categoryBreakdown?.length) ? (
          <div className="space-y-3">
            {data.categoryBreakdown.slice(0,4).map((r:any)=>{
              const max = Math.max(...data.categoryBreakdown.map((x:any)=>x.amount));
              const c = categories.find(x=>x.name===r.category)?.color || '#5f5b77';
              return <div key={r.category}><div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{r.category}</span><span className="font-medium">₹{r.amount.toLocaleString('en-IN')}</span></div><div className="h-2 bg-zinc-100 rounded-full mt-1"><div className="h-full rounded-full" style={{ width: `${(r.amount / max) * 100}%`, background: c }} /></div></div>;
            })}
          </div>
          ) : <div className="text-sm text-zinc-500 py-4 text-center">No category data yet</div>}
        </Card>
      </div>
    </div>
  );
}