import { useEffect, useState } from 'react';
import { ChevronRight, Lock, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';

export default function SettingsPage(){
  const { dark, setDark } = useTheme();
  const { user, refresh } = useAuth();
  const [name,setName]=useState(user?.name||''); const [email,setEmail]=useState(user?.email||'');
  const [pw, setPw] = useState({ current:'', next:'', confirm:'' });
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(()=>{ if(user){ setName(user.name); setEmail(user.email);} },[user]);
  const save = async()=>{ try{ await api.updateMe({ name }); await refresh(); setMsg('Profile saved'); setTimeout(()=>setMsg(''),2000); } catch(e:any){ setMsg(e.message);} };
  const changePw = async(e:React.FormEvent)=>{
    e.preventDefault();
    if(pw.next !== pw.confirm) { setMsg('New passwords do not match'); return; }
    try{
      const res = await fetch(`${import.meta.env.VITE_API_URL||'http://localhost:5000'}/api/auth/change-password`, {
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.message);
      setMsg('Password changed successfully'); setPw({ current:'', next:'', confirm:'' });
      setTimeout(()=>setMsg(''),2500);
    } catch(ex:any){ setMsg(ex.message); }
  };
  return (
    <div className="space-y-5 pb-20 max-w-[760px]">
      <h1 className="text-[32px] font-extrabold tracking-tight">Settings</h1>
      <p className="text-sm text-zinc-500 -mt-3">Manage your preferences and security.</p>
      {msg && <div className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-full w-fit">{msg}</div>}
      <Card className="p-6">
        <h3 className="font-semibold flex items-center gap-2 text-[#5f5b77]">Profile</h3>
        <div className="mt-4 space-y-3">
          <div><label className="text-[11px] tracking-widest font-semibold text-zinc-500">Display Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="mt-1 w-full neumorphic-inset rounded-full px-4 py-2.5 text-sm outline-none" /></div>
          <div><label className="text-[11px] tracking-widest font-semibold text-zinc-500">Email Address</label><input value={email} disabled className="mt-1 w-full neumorphic-inset rounded-full px-4 py-2.5 text-sm outline-none opacity-60" /></div>
          <button onClick={save} className="px-5 py-2 rounded-full bg-[#5f5b77] text-white text-sm hover:bg-[#4a4760]">Save</button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold flex items-center gap-2 text-[#5f5b77]"><Lock size={16} /> Change Password</h3>
        <form onSubmit={changePw} className="mt-4 space-y-3">
          <div className="relative">
            <input type={show?'text':'password'} value={pw.current} onChange={e=>setPw({...pw, current:e.target.value})} placeholder="Current password" required className="w-full neumorphic-inset rounded-full px-4 py-2.5 text-sm outline-none pr-10" />
            <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">{show ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
          </div>
          <input type={show?'text':'password'} value={pw.next} onChange={e=>setPw({...pw, next:e.target.value})} placeholder="New password (min 6)" required className="w-full neumorphic-inset rounded-full px-4 py-2.5 text-sm outline-none" />
          <input type={show?'text':'password'} value={pw.confirm} onChange={e=>setPw({...pw, confirm:e.target.value})} placeholder="Confirm new password" required className="w-full neumorphic-inset rounded-full px-4 py-2.5 text-sm outline-none" />
          <button type="submit" className="w-full py-2.5 rounded-full bg-[#5f5b77] text-white text-sm font-medium hover:bg-[#4a4760]">Update password</button>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold flex items-center gap-2 text-[#5f5b77]">Preferences</h3>
        <div className="flex justify-between items-center py-4 border-b border-zinc-100 dark:border-zinc-800"><div><div className="text-sm font-medium">Dark Mode</div><div className="text-xs text-zinc-500">Switch between light and dark themes</div></div>
          <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={dark} onChange={e => setDark(e.target.checked)} className="sr-only peer" /><div className="w-11 h-6 bg-zinc-200 rounded-full peer peer-checked:bg-[#5f5b77] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" /></label>
        </div>
        <div className="flex justify-between items-center pt-4"><div><div className="text-sm font-medium">Language</div><div className="text-xs text-zinc-500">Current: English</div></div><button className="px-3 py-1.5 rounded-full neumorphic text-sm">English <ChevronRight size={12} className="inline rotate-90" /></button></div>
      </Card>
    </div>
  );
}