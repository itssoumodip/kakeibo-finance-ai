import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';

export default function ForgotPassword(){
  const [email,setEmail]=useState(''); const [msg,setMsg]=useState(''); const [token,setToken]=useState('');
  const [newPw,setNewPw]=useState(''); const [done,setDone]=useState('');
  const submit = async(e:React.FormEvent)=>{ e.preventDefault(); setMsg(''); try{ const r=await api.forgot(email); setMsg(r.message); if((r as any).resetToken) setToken((r as any).resetToken); } catch(ex:any){ setMsg(ex.message); } };
  const reset = async(e:React.FormEvent)=>{ e.preventDefault(); try{ await api.reset(token,newPw); setDone('Password reset successful. You can now login.'); } catch(ex:any){ setDone(ex.message); } };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcf9f8] dark:bg-zinc-900 p-4">
      <div className="w-full max-w-md neumorphic rounded-[24px] p-8">
        <h1 className="text-xl font-semibold">Forgot password</h1><p className="text-sm text-zinc-500 mb-4">Enter your email to receive a reset link (dev: token shown below).</p>
        <form onSubmit={submit} className="space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" required className="w-full neumorphic-inset rounded-full px-4 py-3 text-sm outline-none" />
          <button className="w-full py-3 rounded-full bg-[#5f5b77] text-white font-medium">Send reset link</button>
        </form>
        {msg && <div className="mt-3 text-sm bg-emerald-50 text-emerald-700 rounded-2xl px-3 py-2 break-all">{msg}{token && <div className="mt-2"><b>Token (dev):</b> {token}</div>}</div>}
        {token && (
          <form onSubmit={reset} className="mt-6 space-y-3 border-t pt-4">
            <div className="text-sm font-medium">Reset with token</div>
            <input value={token} onChange={e=>setToken(e.target.value)} placeholder="Reset token" className="w-full neumorphic-inset rounded-full px-4 py-3 text-sm outline-none" />
            <input value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="New password" type="password" required className="w-full neumorphic-inset rounded-full px-4 py-3 text-sm outline-none" />
            <button className="w-full py-3 rounded-full bg-[#5f5b77] text-white font-medium">Reset password</button>
            {done && <div className="text-sm bg-zinc-100 rounded-2xl px-3 py-2">{done}</div>}
          </form>
        )}
        <div className="text-sm text-center mt-4"><Link to="/login" className="text-[#5f5b77]">Back to login</Link></div>
      </div>
    </div>
  );
}