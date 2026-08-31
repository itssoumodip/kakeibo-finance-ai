import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, clearToken } from '@/services/api';

type User = { id:string; name:string; email:string; avatar?:string };
type Ctx = { user: User|null; loading:boolean; login:(e:string,p:string)=>Promise<void>; register:(n:string,e:string,p:string)=>Promise<void>; logout:()=>void; refresh:()=>Promise<void>; };

const C = createContext<Ctx>(null as any);
export const useAuth = ()=> useContext(C);

export function AuthProvider({ children }: { children: React.ReactNode }){
  const [user, setUser] = useState<User|null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async()=>{
    const tok = getToken();
    if (!tok) { setLoading(false); return; }
    try{ const {user} = await api.me(); setUser(user); } catch{ clearToken(); setUser(null); } finally{ setLoading(false); }
  };
  useEffect(()=>{ refresh(); },[]);
  const login = async(email:string,password:string)=>{
    const { token, user } = await api.login({email,password});
    setToken(token); setUser(user);
  };
  const register = async(name:string,email:string,password:string)=>{
    const { token, user } = await api.register({name,email,password});
    setToken(token); setUser(user);
  };
  const logout = ()=>{ clearToken(); setUser(null); };
  return <C.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</C.Provider>;
}