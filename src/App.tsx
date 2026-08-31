import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import Overview from '@/pages/Overview';
import TransactionsPage from '@/pages/TransactionsPage';
import BudgetsPage from '@/pages/BudgetsPage';
import InvestmentsPage from '@/pages/InvestmentsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import AssistantPage from '@/pages/AssistantPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';

function RequireAuth({ children }: { children: React.ReactNode }){
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-zinc-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App(){
  return (
    <BrowserRouter>
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
                  <Routes>
                    <Route path="/" element={<Overview />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/budgets" element={<BudgetsPage />} />
                    <Route path="/investments" element={<InvestmentsPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/assistant" element={<AssistantPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </div>
              </main>
            </div>
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  );
}