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
  const [form,setForm]=useState({ amount:'', type:'expense', category:'Food', subcategory:'', merchant:'', paymentMethod:'UPI' });

  const openAdd = ()=>{ setEditing(null); setForm({ amount:'', type:'expense', category:'Food', subcategory:'', merchant:'', paymentMethod:'UPI' }); setShowModal(true); };
  const openEdit = (t:any)=>{ setEditing(t); setForm({ amount:String(Math.abs(t.amount)), type: t.plus ? 'income' : (t.cat==='Investment'?'investment':'expense'), category:t.cat, subcategory:t.raw?.subcategory||'', merchant:t.name, paymentMethod:t.raw?.paymentMethod||'UPI' }); setShowModal(true); };
  const handleDelete = async(t:any)=>{
    if(!t._id || !getToken()){ showToast('Demo item — login to delete'); return; }
    if(!confirm(`Delete ${t.name}?`)) return;
    try{ await api.deleteTx(t._id); showToast('Deleted'); doRefresh(); } catch(e:any){ showToast(e.message); }
  };
  const handleToggleRecurring = async(r:any)=>{
    if(!r._id){ showToast('Demo — login to toggle'); return; }
    try{ await fetch(`${import.meta.env.VITE_API_URL||'http://localhost:5000'}/api/recurring/${r._id}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ active: !r.active }) }); fetchRecurring(); } catch(e:any){ showToast(e.message); }
  };

  return (
    <div ref={rootRef} className="space-y-5 pb-20">
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
        <div className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <Card className="w-full max-w-md p-6 shadow-2xl" onClick={(e: any) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">{editing ? 'Edit transaction' : 'Add transaction'}</h3><button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full neumorphic flex items-center justify-center"><X size={14} /></button></div>
            <form className="space-y-3" onSubmit={async e => { e.preventDefault(); try{ const payload={ amount: Number(form.amount), type: form.type, category: form.category, subcategory: form.subcategory, merchant: form.merchant || form.subcategory || form.category, paymentMethod: form.paymentMethod }; if(editing && editing._id && getToken()){ await api.updateTx(editing._id, payload); showToast('Updated'); } else { if(getToken()){ await api.createTx(payload); showToast('Added'); } else { showToast('Demo — login to save'); }} doRefresh(); }catch(ex:any){ showToast(ex.message);} setShowModal(false); }}>
              <input value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="Amount" type="number" required className="w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none" />
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none"><option value="expense">Expense</option><option value="income">Income</option><option value="investment">Investment</option></select>
              <input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Category e.g. Food" required className="w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none" />
              <input value={form.subcategory} onChange={e=>setForm({...form,subcategory:e.target.value})} placeholder="Subcategory e.g. Pizza" className="w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none" />
              <input value={form.merchant} onChange={e=>setForm({...form,merchant:e.target.value})} placeholder="Merchant e.g. Rapido" className="w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none" />
              <input value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})} placeholder="Payment UPI/Card/Cash" className="w-full neumorphic-inset rounded-2xl px-4 py-3 text-sm outline-none" />
              <button className="w-full py-3 rounded-full bg-[#5f5b77] text-white font-medium hover:bg-[#4a4760]">{editing ? 'Update' : 'Add transaction'}</button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}