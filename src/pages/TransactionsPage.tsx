import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, X, Wallet, Utensils, Car, ShoppingBag, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api, getToken } from '@/services/api';
import { pageIn, staggerList } from '@/utils/gsap';

export default function TransactionsPage(){
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [liveTx, setLiveTx] = useState<any[]|null>(null);
  const [recurring, setRecurring] = useState<any[]|null>(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(!!getToken());
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const showToast=(m:string)=>{ setToast(m); setTimeout(()=>setToast(''),2000); };
  useEffect(()=>{ if(rootRef.current) pageIn(rootRef.current); },[]);
  // Stable fetch — takes explicit args so effects below fire exactly once per settle.
  // (Previously fetchTx closed over filter/q, so its identity changed every keystroke
  // and BOTH effects fired → immediate fetch + debounced fetch = double loading.)
  const fetchTx = useCallback((f: string = 'All', query: string = '')=> {
    if(!getToken()){ setLoading(false); return ()=>{}; }
    setLoading(true);
    const params = new URLSearchParams();
    if(f!=='All') params.set('type', f==='Income'?'income': f==='Expenses'?'expense':'investment');
    if(query) params.set('search', query);
    let cancelled = false;
    api.transactions(`?${params.toString()}`).then((r:any)=> { if(!cancelled) setLiveTx(r.transactions); }).catch(()=>{}).finally(()=> { if(!cancelled) setLoading(false); });
    return ()=>{ cancelled = true; };
  },[]);
  const doRefresh = useCallback(()=> fetchTx(filter, q), [fetchTx, filter, q]);
  const fetchRecurring = useCallback(()=>{
    if(!getToken()) return;
    api.recurring().then(setRecurring).catch(()=>{});
  },[]);
  const firstRun = useRef(true);
  useEffect(()=>{
    if(firstRun.current){
      firstRun.current = false;
      const cleanup = fetchTx(filter, q);
      fetchRecurring();
      return cleanup;
    }
    // filter/search changes: ONE debounced fetch (typing waits for pause)
    const t = setTimeout(()=> fetchTx(filter, q), q ? 400 : 0);
    return ()=> clearTimeout(t);
  },[filter, q, fetchTx, fetchRecurring]);
  useEffect(()=>{
    if(!loading && listRef.current) staggerList(listRef.current, '.gsap-item');
  },[loading, liveTx, filter, q]);
  const base = useMemo(() => (liveTx || []).map((t:any)=>({ _id:t._id, id:t._id, raw:t, name:t.merchant||t.subcategory||t.category, cat:t.category, amount: t.type==='income'? t.amount : -t.amount, date: new Date(t.date).toLocaleString(), icon: t.category==='Food'?Utensils:t.category==='Transport'?Car:t.category==='Investment'?TrendingUp:ShoppingBag, bg:t.type==='income'?'#d1f0e3': t.category==='Food'?'#e8e2ff':'#dff0ff', plus:t.type==='income' })), [liveTx]);
  const filtered = useMemo(() => base.filter((t:any) => {
    const qLower = q.toLowerCase();
    const matchesQ = !q || t.name.toLowerCase().includes(qLower) || t.cat.toLowerCase().includes(qLower);
    const matchesF = filter === 'All' || (filter === 'Income' && t.plus) || (filter === 'Expenses' && !t.plus && t.cat !== 'Investment') || (filter === 'Investments' && t.cat === 'Investment');
    return matchesQ && matchesF;
  }), [base, q, filter]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const todayISO = ()=> new Date().toISOString().slice(0,10);
  const toISODate = (d:any)=>{ try{ return d ? new Date(d).toISOString().slice(0,10) : todayISO(); } catch{ return todayISO(); } };
  const CATEGORIES = ['Food','Transport','Shopping','Bills','Entertainment','Health','Investment','Income','Other'];
  const [form,setForm]=useState({ amount:'', type:'expense', category:'Food', subcategory:'', merchant:'', paymentMethod:'UPI', date: todayISO() });

  const openAdd = ()=>{ setEditing(null); setForm({ amount:'', type:'expense', category:'Food', subcategory:'', merchant:'', paymentMethod:'UPI', date: todayISO() }); setShowModal(true); };
  const openEdit = (t:any)=>{ setEditing(t); setForm({ amount:String(Math.abs(t.amount)), type: t.plus ? 'income' : (t.cat==='Investment'?'investment':'expense'), category:t.cat, subcategory:t.raw?.subcategory||'', merchant:t.raw?.merchant||t.name, paymentMethod:t.raw?.paymentMethod||'UPI', date: toISODate(t.raw?.date) }); setShowModal(true); };
  const categoryOptions = CATEGORIES.includes(form.category) ? CATEGORIES : [form.category, ...CATEGORIES];
  const handleDelete = async(t:any)=>{
    if(!t._id || !getToken()){ showToast('Demo item — login to delete'); return; }
    if(!confirm(`Delete ${t.name}?`)) return;
    try{ await api.deleteTx(t._id); showToast('Deleted'); doRefresh(); } catch(e:any){ showToast(e.message); }
  };
  const handleToggleRecurring = async(r:any)=>{
    if(!r._id){ showToast('Demo — login to toggle'); return; }
    try{ await fetch(`${import.meta.env.VITE_API_URL||'http://localhost:5000'}/api/recurring/${r._id}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ active: !r.active }) }); fetchRecurring(); } catch(e:any){ showToast(e.message); }
  };

  // NOTE: this container MUST stay flex+gap, never space-y. space-y applies
  // margin-top to every child — including the fixed modal overlay below — which
  // pushed the backdrop 20px down and left an undimmed strip at the viewport top.
  // Flex gap spaces in-flow children identically but never touches fixed children.
  return (
    <div ref={rootRef} className="flex flex-col gap-5 pb-20">
      {toast && <div className="fixed top-4 right-4 z-50 bg-zinc-900 text-white text-sm px-4 py-2 rounded-full shadow-lg">{toast}</div>}
      <div className="flex justify-between items-start">
        <div><h1 className="text-[30px] font-extrabold tracking-tight">Transactions</h1><p className="text-sm text-zinc-500">Manage and review your recent financial activity. {liveTx && <span className="text-emerald-600">● live</span>}</p></div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#5f5b77] text-white text-sm font-medium hover:bg-[#4a4760]"><Plus size={16} /> Add</button>
      </div>
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 neumorphic-inset rounded-full flex items-center gap-2 px-4 py-2">
          <Search size={16} className="text-zinc-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search transactions..." className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', 'Income', 'Expenses', 'Investments'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-sm font-medium ${filter === f ? 'bg-[#5f5b77] text-white' : 'neumorphic text-zinc-600 hover:bg-zinc-50'}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Recent Activity</h3><button onClick={doRefresh} className="text-xs text-[#5f5b77] hover:underline">Refresh</button></div>
          <div ref={listRef} className="space-y-2">
            {loading && liveTx===null ? <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-[64px] animate-pulse bg-zinc-100 rounded-2xl" />)}</div> : filtered.length===0 ? <div className="text-sm text-zinc-500 text-center py-8 neumorphic rounded-2xl">No transactions{getToken()?'':' — login to see live data (showing demo)'}</div> : filtered.map((t:any) => (
              <div key={t.id} className="gsap-item flex items-center justify-between neumorphic rounded-2xl px-4 py-3 group">
                <span className="flex items-center gap-3"><span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: t.bg }}><t.icon size={14} /></span><span><div className="text-sm font-medium">{t.name}</div><div className="text-xs text-zinc-500">{t.cat} • {t.date}</div></span></span>
                <span className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${t.plus ? 'text-emerald-600' : ''}`}>{t.plus ? '+' : '-'}₹{Math.abs(t.amount).toLocaleString('en-IN')}</span>
                  <span className="hidden group-hover:flex gap-1 ml-2">
                    <button onClick={()=>openEdit(t)} className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center hover:bg-zinc-50"><Pencil size={12} /></button>
                    <button onClick={()=>handleDelete(t)} className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100"><Trash2 size={12} /></button>
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-3">Recurring</h3>
          <Card className="p-4 space-y-3">
            {(recurring && recurring.length > 0) ? recurring.slice(0,4).map((r:any) => (
              <div key={r._id || r.name} className="flex justify-between items-center">
                <span className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"><Wallet size={12} /></span><span><div className="text-sm font-medium">{r.name}</div><div className="text-xs text-zinc-500">₹{r.amount} / {r.frequency||'mo'}</div></span></span>
                <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={!!r.active} onChange={()=>handleToggleRecurring(r)} className="sr-only peer" /><div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:bg-[#5f5b77] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" /></label>
              </div>
            )) : <div className="text-sm text-zinc-500 py-4 text-center">No recurring yet<br/><span className="text-xs">Add via Transactions → + Add → recurring (coming soon) or create a monthly transaction</span></div>}
            <button onClick={()=>showToast('Add recurring: coming soon — use Transactions Add')} className="w-full text-xs text-[#5f5b77] hover:underline pt-2">+ Add recurring</button>
          </Card>
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 24px 64px -12px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.20)' }} onClick={(e: any) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1"><h3 className="font-semibold">{editing ? 'Edit transaction' : 'Add transaction'}</h3><button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full neumorphic flex items-center justify-center"><X size={14} /></button></div>
            {editing && <p className="text-xs text-zinc-500 mb-4">{editing.name} • {editing.cat} • {editing.date}</p>}
            <form className="space-y-3" onSubmit={async e => { e.preventDefault(); try{ const payload={ amount: Number(form.amount), type: form.type, category: form.category, subcategory: form.subcategory, merchant: form.merchant || form.subcategory || form.category, paymentMethod: form.paymentMethod, date: form.date }; if(editing && editing._id && getToken()){ await api.updateTx(editing._id, payload); showToast('Updated'); } else { if(getToken()){ await api.createTx(payload); showToast('Added'); } else { showToast('Demo — login to save'); }} doRefresh(); }catch(ex:any){ showToast(ex.message);} setShowModal(false); }}>
              <div>
                <label className="text-[11px] tracking-widest font-semibold text-zinc-500">Amount (₹)</label>
                <input value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0" type="number" min="1" required className="mt-1 w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[11px] tracking-widest font-semibold text-zinc-500">Type</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {(['expense','income','investment'] as const).map(t => (
                    <button type="button" key={t} onClick={()=>setForm({...form, type:t})} className={`py-2 rounded-full text-sm font-medium capitalize ${form.type===t ? 'bg-[#5f5b77] text-white' : 'neumorphic text-zinc-600'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] tracking-widest font-semibold text-zinc-500">Category</label>
                  <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-1 w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none">
                    {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] tracking-widest font-semibold text-zinc-500">Date</label>
                  <input value={form.date} onChange={e=>setForm({...form,date:e.target.value})} type="date" required className="mt-1 w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] tracking-widest font-semibold text-zinc-500">Detail <span className="normal-case font-normal">(e.g. Pizza, Rapido Bike)</span></label>
                <input value={form.subcategory} onChange={e=>setForm({...form,subcategory:e.target.value})} placeholder="What was it?" className="mt-1 w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[11px] tracking-widest font-semibold text-zinc-500">Merchant / name</label>
                <input value={form.merchant} onChange={e=>setForm({...form,merchant:e.target.value})} placeholder="Shop or person" className="mt-1 w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[11px] tracking-widest font-semibold text-zinc-500">Paid via</label>
                <select value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})} className="mt-1 w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none">
                  {['UPI','Card','Cash','Netbanking'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button className="w-full py-3 rounded-full bg-[#5f5b77] text-white font-medium hover:bg-[#4a4760]">{editing ? 'Update' : 'Add transaction'}</button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}