import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Car, PiggyBank, TrendingUp, Utensils, ShoppingBag } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { api, getToken } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { pageIn, staggerCards } from '@/utils/gsap';

function Skeleton({ className='' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-2xl ${className}`} />;
}

export default function Overview(){
  const [filter, setFilter] = useState('30D');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [live, setLive] = useState<any>(null);
  const [recent, setRecent] = useState<any[]|null>(null);
  const [loading, setLoading] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ if(rootRef.current) pageIn(rootRef.current); },[]);

  useEffect(()=>{
    if(!getToken()){ setLoading(false); return; }
    let cancelled=false;
    setLoading(true);
    Promise.all([
      api.analytics(filter).catch(()=>null),
      api.transactions('?limit=3').catch(()=>null),
    ]).then(([a,t])=>{
      if(cancelled) return;
      if(a) setLive(a);
      if(t) setRecent((t as any).transactions);
    }).finally(()=>{ if(!cancelled) setLoading(false); });
    return ()=>{ cancelled=true; };
  },[filter]);

  useEffect(()=>{
    if(!loading && rootRef.current) staggerCards(rootRef.current, '.gsap-card');
  },[loading, live, recent]);

  // Memoize expensive derivations — must stay before early return
  const isLive = !!live;
  const sum = useMemo(() => isLive ? {
    income: live.income || 0,
    expenses: live.expenses || 0,
    investments: live.investments || 0,
    available: (live.income - live.expenses - (live.investments||0)) || 0,
    savingsRate: live.savingsRate || 0
  } : { income: 0, expenses: 0, investments: 0, available: 0, savingsRate: 0 }, [live, isLive]);

  const cats = useMemo(() => (live?.categoryBreakdown || []).slice(0,3).map((c:any)=>({ name:c.category, amount:c.amount })), [live]);
  const txs = useMemo(() => (recent || []).map((t:any)=>({
    id:t._id, name:t.merchant||t.subcategory||t.category, cat:t.category,
    amount: t.type==='income'? t.amount : -t.amount,
    date: new Date(t.date).toLocaleDateString(),
    icon: t.category==='Food'?Utensils:t.category==='Transport'?Car:ShoppingBag,
    bg:t.type==='income'?'#d1f0e3':'#f3f0ff', plus:t.type==='income'
  })), [recent]);
  const chartData = useMemo(() => (live?.spendingOverTime?.length ? live.spendingOverTime.slice(-7) : live?.monthlyTrend?.slice(-7) || []).map((p:any)=>({ name:(p.date||p.month||'').slice(5), v:p.amount||p.total||0 })), [live]);

  // Stale-while-revalidate: skeleton only on first load, keep old data visible on refetch
  if (loading && !live && !recent) {
    return (
      <div ref={rootRef} className="space-y-5 pb-20">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Skeleton className="h-[180px] xl:col-span-2" />
          <div className="space-y-3"><Skeleton className="h-[80px]" /><Skeleton className="h-[80px]" /></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i=><Skeleton key={i} className="h-[90px]" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><Skeleton className="h-[260px] lg:col-span-2" /><Skeleton className="h-[260px]" /></div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-5 pb-20">
      <div className="gsap-card">
        <div className="text-[18px] font-semibold">Hey {user?.name?.split(' ')[0] || 'there'} <span>👋</span></div>
        <p className="text-sm text-zinc-500">Here&apos;s your money this month. {isLive && <span className="text-emerald-600">● live</span>}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 p-6 md:p-7 gsap-card">
          <div className="text-[11px] tracking-widest font-semibold text-zinc-500">AVAILABLE BALANCE</div>
          <div className="text-[44px] font-extrabold tracking-tight text-[#5f5b77] dark:text-white leading-none mt-1">₹{sum.available.toLocaleString('en-IN')}</div>
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { k: 'INCOME', v: sum.income, c: 'text-emerald-700', icon: ArrowDownRight },
              { k: 'SPENT', v: sum.expenses, c: 'text-red-600', icon: ArrowUpRight },
              { k: 'INVESTED', v: sum.investments, c: 'text-sky-700', icon: TrendingUp },
            ].map(s => (
              <div key={s.k} className="neumorphic-inset rounded-2xl px-3 py-3 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-[10px] font-semibold tracking-widest text-zinc-500"><s.icon size={12} className={s.c} /> {s.k}</div>
                <div className="text-[16px] font-bold">₹{s.v.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-3">
          <Card className="p-4 flex gap-3 items-start gsap-card" hover>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0"><Car size={14} /></div>
            <div><div className="text-sm font-semibold">Budget Status</div><div className="text-xs text-zinc-500 leading-snug mt-1">{live ? `${live.categoryBreakdown?.[0]?.category || 'No'} is your top spend` : 'Connect to see alerts'}</div></div>
          </Card>
          <Card className="p-4 flex gap-3 items-start gsap-card" hover>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600"><PiggyBank size={14} /></div>
            <div><div className="text-sm font-semibold">Savings</div><div className="text-xs text-zinc-500 leading-snug mt-1">{sum.savingsRate}% savings rate this period</div></div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'INCOME', value: `₹${sum.income.toLocaleString('en-IN')}`, sub: isLive ? 'live' : 'no data', up: true },
          { label: 'EXPENSES', value: `₹${sum.expenses.toLocaleString('en-IN')}`, sub: isLive ? 'live' : 'no data', up: false },
          { label: 'INVESTMENTS', value: `₹${sum.investments.toLocaleString('en-IN')}`, sub: 'live', up: null as any },
          { label: 'SAVINGS', value: `₹${sum.available.toLocaleString('en-IN')}`, sub: `${sum.savingsRate}%`, up: null as any },
        ].map(m => (
          <Card key={m.label} className="p-4 gsap-card">
            <div className="text-[11px] tracking-widest font-semibold text-zinc-500">{m.label}</div>
            <div className="text-[18px] font-bold mt-1">{m.value}</div>
            <div className={`text-xs mt-1 flex items-center gap-1 ${m.up === true ? 'text-emerald-600' : 'text-zinc-500'}`}>{m.up !== null && (m.up ? <ArrowUpRight size={12} /> : <Minus size={12} />)} {m.sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 gsap-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Spending this period</h3>
            <div className="flex gap-1 p-1 rounded-full neumorphic-inset text-xs">
              {['7D', '30D', '3M'].map(k => (
                <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1 rounded-full font-medium ${filter === k ? 'bg-[#e8e2ff] text-[#5f5b77] shadow-sm' : 'text-zinc-500'}`}>{k}</button>
              ))}
            </div>
          </div>
          <div className="h-[220px] neumorphic-inset rounded-[20px] p-3">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c8c3e3" stopOpacity={0.9} /><stop offset="100%" stopColor="#c8c3e3" stopOpacity={0} /></linearGradient></defs>
                  <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '8px 8px 20px rgba(0,0,0,0.08)' }} />
                  <Area type="monotone" dataKey="v" stroke="#5f5b77" strokeWidth={2.5} fill="url(#g)" dot={{ r: 3, fill: '#5f5b77' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-sm text-zinc-500">No spending data yet — add a transaction via AI chat</div>}
          </div>
        </Card>
        <Card className="p-5 gsap-card">
          <h3 className="font-semibold mb-4">Where your money went</h3>
          {cats.length ? (
            <div className="space-y-4">
              {cats.map((c:any) => (
                <div key={c.name}>
                  <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><ShoppingBag size={14} className="text-zinc-500" /> {c.name}</span><span className="font-semibold">₹{c.amount.toLocaleString('en-IN')}</span></div>
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 mt-1 overflow-hidden">
                    <div className="h-full rounded-full bg-[#5f5b77]" style={{ width: `${(c.amount / (cats[0]?.amount||1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-zinc-500">No category data — add expenses to see breakdown</div>}
        </Card>
      </div>

      <Card className="p-5 gsap-card">
        <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Recent Transactions</h3><button onClick={()=>navigate('/transactions')} className="text-xs text-[#5f5b77] font-medium hover:underline">View All →</button></div>
        {txs.length ? (
          <div className="space-y-2">
            {txs.slice(0, 3).map((t:any) => (
              <div key={t.id} className="flex items-center justify-between neumorphic-inset rounded-full px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: t.bg }}><t.icon size={14} /></div>
                  <div><div className="text-sm font-semibold leading-none">{t.name}</div><div className="text-xs text-zinc-500">{t.cat} • {t.date}</div></div>
                </div>
                <div className={`text-sm font-bold ${t.plus ? 'text-emerald-600' : 'text-zinc-900 dark:text-white'}`}>{t.plus ? '+' : '-'}₹{Math.abs(t.amount).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        ) : <div className="text-sm text-zinc-500 text-center py-6">No transactions yet. Try: “Took Rapido for ₹120” in AI chat</div>}
      </Card>
    </div>
  );
}