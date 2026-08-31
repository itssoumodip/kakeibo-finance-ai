import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus, PiggyBank } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/Card';
import { api, getToken } from '@/services/api';
import { investments } from '@/data/demo';
import { pageIn, staggerCards } from '@/utils/gsap';

export default function InvestmentsPage(){
  const [data, setData] = useState<any>(null);
  const [income, setIncome] = useState<number>(0);
  const [range, setRange] = useState('1M');
  const [loading, setLoading] = useState(!!getToken());
  const [toast, setToast] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const showToast = (m:string)=>{ setToast(m); setTimeout(()=>setToast(''),2000); };
  const fetchData = async()=>{
    if(!getToken()){ setLoading(false); return; }
    try{
      const [inv, ana] = await Promise.all([api.investments().catch(()=>null), api.analytics('30D').catch(()=>null)]);
      if(inv) setData(inv);
      if(ana) setIncome(ana.income || 0);
    } catch{} finally{ setLoading(false); }
  };
  useLayoutEffect(()=>{ if(rootRef.current) pageIn(rootRef.current); },[]);
  useEffect(()=>{ fetchData(); },[]);
  useLayoutEffect(()=>{ if(!loading && rootRef.current) staggerCards(rootRef.current, '.gsap-card'); },[loading, data]);
  const chartData = data?.total ? [{ v: Math.max(0, data.total*0.4) }, { v: Math.max(0, data.total*0.6) }, { v: Math.max(0, data.total*0.72) }, { v: Math.max(0, data.total*0.85) }, { v: data.total }] : [{ v: 0 }, { v: 0 }];
  const breakdown = data?.breakdown?.length ? data.breakdown : [];
  const history = data?.investments?.length ? data.investments.slice(0,3).map((t:any)=>({ t: `${t.subcategory || t.merchant}`, d: new Date(t.date).toLocaleDateString(), a: `-₹${t.amount}` })) : [];
  if(loading) return <div className="space-y-4"><div className="h-40 animate-pulse bg-zinc-100 rounded-[24px]" /><div className="h-40 animate-pulse bg-zinc-100 rounded-[24px]" /></div>;
  return (
    <div ref={rootRef} className="space-y-5 pb-20">
      {toast && <div className="fixed top-4 right-4 z-50 bg-zinc-900 text-white text-sm px-4 py-2 rounded-full">{toast}</div>}
      <div className="flex justify-between items-start gsap-card">
        <div><h1 className="text-[30px] font-extrabold tracking-tight">Investments</h1><p className="text-sm text-zinc-500">Track your wealth building journey. {data && <span className="text-emerald-600">● live</span>}</p></div>
        <div className="flex gap-2"><button onClick={()=>showToast('Filter: coming soon')} className="px-4 py-2 rounded-full neumorphic text-sm flex items-center gap-2">Filter</button><button onClick={()=>showToast('New SIP: use AI chat "Invested ₹500 in Nifty 50 SIP"')} className="px-4 py-2 rounded-full bg-[#e8e2ff] text-sm flex items-center gap-2 font-medium"><Plus size={14} /> New SIP</button></div>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 gsap-card">
          <div className="flex justify-between"><div><div className="text-[11px] tracking-widest font-semibold text-zinc-500">INVESTED THIS MONTH</div><div className="flex items-center gap-2"><span className="text-[28px] font-extrabold">₹{(data?.total ?? 0).toLocaleString('en-IN')}</span><span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">↑ {data ? 'live' : 'no data'}</span></div></div><div className="flex gap-1 p-1 rounded-full neumorphic-inset text-xs h-fit">{['1W','1M','1Y'].map(k=> <button key={k} onClick={()=>setRange(k)} className={`px-2 py-1 rounded-full ${range===k?'bg-white shadow':''}`}>{k}</button>)}</div></div>
          <div className="h-[180px] neumorphic-inset rounded-2xl mt-4 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}><Area type="monotone" dataKey="v" stroke="#2c6956" strokeWidth={2} dot={{ r: 3 }} fill="#f0fdf4" /></AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5 bg-[#c7efff] dark:bg-sky-900/30 gsap-card">
            {(()=>{
              const total = data?.total || 0;
              const rate = income ? Math.round((total / income) * 100) : 0;
              const pct = Math.min(100, Math.max(0, rate));
              return (<>
                <div className="flex items-center gap-2 font-semibold text-sky-900 dark:text-sky-100"><span className="w-7 h-7 rounded-full bg-white flex items-center justify-center"><PiggyBank size={14} /></span> Investment Rate</div>
                <div className="text-[28px] font-extrabold mt-2">{rate}% <span className="text-sm font-normal text-zinc-600">of monthly income</span><span className="text-xs ml-2 text-zinc-500">₹{total.toLocaleString('en-IN')} / ₹{income.toLocaleString('en-IN')}</span></div>
                <div className="h-2 bg-white rounded-full mt-3 overflow-hidden"><div className="h-full bg-sky-900 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div>
                <div className="flex justify-between text-xs mt-1 text-zinc-600"><span>{pct}% now</span><span>Target: 20%</span></div>
              </>);
            })()}
          </Card>
          <Card className="p-5 gsap-card">
            <div className="font-semibold mb-3">Allocation Breakdown</div>
            <div className="space-y-3 text-sm">
              {breakdown.map((i:any) => (
                <div key={i.label} className="flex justify-between"><span className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs">●</span><span><div className="font-medium">{i.label}</div><div className="text-xs text-zinc-500">{(i.sub||'ETF')}</div></span></span><span className="font-medium self-center">₹{i.amount}</span></div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <Card className="p-5 gsap-card">
        <div className="flex justify-between items-center mb-3"><h3 className="font-semibold">Investment History</h3><button onClick={fetchData} className="text-xs text-[#5f5b77] hover:underline">Refresh</button></div>
        <div className="space-y-2">
          {history.map((r:any) => (
            <div key={r.t} className="flex justify-between neumorphic-inset rounded-full px-3 py-2 items-center">
              <span className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-white flex items-center justify-center">✓</span><span><div className="text-sm font-medium">{r.t}</div><div className="text-xs text-zinc-500">{r.d}</div></span></span>
              <span className="text-right"><div className="text-sm font-bold">{r.a}</div><div className="text-xs text-emerald-600">Success</div></span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}