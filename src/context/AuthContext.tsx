import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, clearToken } from '@/services/api';

type User = { id:string; name:string; email:string; avatar?:string };
type Ctx = { user: User|null; loading:boolean; login:(e:string,p:string)=>Promise<void>; register:(n:string,e:string,p:string)=>Promise<void>; logout:()=>void; refresh:()=>Promise<void>; };

const C = createContext<Ctx>(null as any);
export const useAuth = ()=> useContext(C);

export function AuthProvider({ children }: { children: React.ReactNode }){
  const [user, setUser] = useState<User|null>(() => {
    try {
      const cached = localStorage.getItem('user');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  // If we have cached user + token, don't block UI on /me — revalidate in bg
  const [loading, setLoading] = useState(() => !localStorage.getItem('user') && !!getToken());
  const refresh = async()=>{
    const tok = getToken();
    if (!tok) { setLoading(false); return; }
    try{
      const { user } = await api.me();
      setUser(user);
      try { localStorage.setItem('user', JSON.stringify(user)); } catch {}
    } catch{
      clearToken();
      try { localStorage.removeItem('user'); } catch {}
      setUser(null);
    } finally{ setLoading(false); }
  };
  useEffect(()=>{
    const tok = getToken();
    if (!tok) { setLoading(false); return; }
    if (!localStorage.getItem('user')) setLoading(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const login = async(email:string,password:string)=>{
    const { token, user } = await api.login({email,password});
    setToken(token); setUser(user);
    try { localStorage.setItem('user', JSON.stringify(user)); } catch {}
  };
  const register = async(name:string,email:string,password:string)=>{
    const { token, user } = await api.register({name,email,password});
    setToken(token); setUser(user);
    try { localStorage.setItem('user', JSON.stringify(user)); } catch {}
  };
  const logout = ()=>{ clearToken(); try { localStorage.removeItem('user'); } catch {} setUser(null); };
  // Stable value identity — without this, every provider render re-renders
  // ALL consumers (RequireAuth → whole page tree) even when user/loading unchanged.
  const value = useMemo(()=>({ user, loading, login, register, logout, refresh }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading]);
  return <C.Provider value={value}>{children}</C.Provider>;
}