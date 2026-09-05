import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { subscribeLoading } from '@/services/api';

// Thin indeterminate progress bar pinned to the top — visible on EVERY page
// whenever any API request is in flight (including silent background refetches),
// so that ~1s refresh never looks dead. Pure CSS animation, zero layout cost.
function TopLoader(){
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  useEffect(()=> subscribeLoading(setActive),[]);
  useEffect(()=>{
    if(active > 0){
      // Don't flash for instant cache hits
      const t = setTimeout(()=> setVisible(true), 150);
      return ()=> clearTimeout(t);
    }
    // Linger briefly so it doesn't blink on fast requests
    const t = setTimeout(()=> setVisible(false), 300);
    return ()=> clearTimeout(t);
  },[active]);
  if(!visible) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[100] h-[3px] pointer-events-none" aria-label="Loading">
      <div className="h-full toploader-bar" />
    </div>
  );
}

// Code-split: auth pages load immediately, heavy pages load on demand.
// recharts (Overview/Analytics/Investments) is ~300KB — don't bundle it upfront.
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const Overview = lazy(() => import('@/pages/Overview'));
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'));
const BudgetsPage = lazy(() => import('@/pages/BudgetsPage'));
const InvestmentsPage = lazy(() => import('@/pages/InvestmentsPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const AssistantPage = lazy(() => import('@/pages/AssistantPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const InstallPage = lazy(() => import('@/pages/InstallPage'));

function PageFallback(){
  return (
    <div className="space-y-3 py-4" aria-label="Loading page">
      <div className="h-8 w-40 animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
      <div className="h-40 animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-[24px]" />
      <div className="grid md:grid-cols-3 gap-4">
        {[1,2,3].map(i=><div key={i} className="h-24 animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-[24px]" />)}
      </div>
    </div>
  );
}

function BrandLoader(){
  return (
    <div className="min-h-screen flex flex-col gap-3 items-center justify-center" aria-label="Loading">
      <div className="text-[28px] font-extrabold tracking-tight text-[#5f5b77]">KAKEIBO</div>
      <div className="flex items-center gap-1.5">
        {[0,1,2].map(i => (
          <span key={i} className="w-2.5 h-2.5 rounded-full bg-[#5f5b77] animate-bounce" style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }} />
        ))}
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }){
  const { user, loading } = useAuth();
  if (loading) return <BrandLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App(){
  // Capture the PWA install prompt once, globally — InstallPage triggers it on demand.
  useEffect(()=>{
    const h = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
      window.dispatchEvent(new Event('pwa-prompt-ready'));
    };
    window.addEventListener('beforeinstallprompt', h);
    return ()=> window.removeEventListener('beforeinstallprompt', h);
  },[]);
  return (
    <BrowserRouter>
      <TopLoader />
      <Suspense fallback={<BrandLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/*" element={
            <RequireAuth>
              <div className="min-h-screen flex bg-[#fcf9f8] dark:bg-zinc-900">
                <Sidebar />
                <main className="flex-1 min-w-0">
                  <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">
                    <Suspense fallback={<PageFallback />}>
                      <Routes>
                        <Route path="/" element={<Overview />} />
                        <Route path="/transactions" element={<TransactionsPage />} />
                        <Route path="/budgets" element={<BudgetsPage />} />
                        <Route path="/investments" element={<InvestmentsPage />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/assistant" element={<AssistantPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/install" element={<InstallPage />} />
                      </Routes>
                    </Suspense>
                  </div>
                </main>
              </div>
            </RequireAuth>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}