import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeCtx = { dark: boolean; toggle: () => void; setDark: (v:boolean)=>void };

const Ctx = createContext<ThemeCtx>({ dark: false, toggle: ()=>{}, setDark: ()=>{} });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }){
  const [dark, setDark] = useState<boolean>(()=>{
    if(typeof window==='undefined') return false;
    const saved = localStorage.getItem('theme');
    if(saved) return saved==='dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(()=>{
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  },[dark]);
  const toggle = ()=> setDark(v=>!v);
  const value = useMemo(()=>({ dark, toggle, setDark }), [dark]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}