import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Login(){
  const { login } = useAuth();
  const nav = useNavigate();
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [err,setErr]=useState(''); const [loading,setLoading]=useState(false);
  const submit = async(e:React.FormEvent)=>{ e.preventDefault(); setErr(''); setLoading(true); try{ await login(email,password); nav('/'); } catch(ex:any){ setErr(ex.message); } finally{ setLoading(false); } };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcf9f8] dark:bg-zinc-900 p-4">
      <div className="w-full max-w-md neumorphic rounded-[24px] p-8">
        <div className="text-center mb-6"><div className="text-[28px] font-extrabold tracking-tight text-[#5f5b77]">MONEYY</div><div className="text-sm text-zinc-500">AI Financial Assistant</div></div>
        <h1 className="text-xl font-semibold mb-1">Welcome back</h1><p className="text-sm text-zinc-500 mb-6">Login to continue to your finances.</p>
        <form onSubmit={submit} className="space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" required className="w-full neumorphic-inset rounded-full px-4 py-3 text-sm outline-none" />
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" required className="w-full neumorphic-inset rounded-full px-4 py-3 text-sm outline-none" />
          {err && <div className="text-sm text-red-600 bg-red-50 rounded-2xl px-3 py-2">{err}</div>}
          <button disabled={loading} className="w-full py-3 rounded-full bg-[#5f5b77] text-white font-medium disabled:opacity-60">{loading?'Logging in...':'Login'}</button>
        </form>
        <div className="flex justify-between text-sm mt-4"><Link to="/forgot-password" className="text-[#5f5b77]">Forgot password?</Link><Link to="/register" className="text-[#5f5b77]">Create account</Link></div>
      </div>
    </div>
  );
}