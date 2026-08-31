const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function getToken(){ return localStorage.getItem('token'); }
export function setToken(t:string){ localStorage.setItem('token', t); }
export function clearToken(){ localStorage.removeItem('token'); }

async function request(path:string, opts: RequestInit & { auth?: boolean } = {}){
  const headers: Record<string,string> = { 'Content-Type':'application/json', ...(opts.headers as any||{}) };
  if (opts.auth !== false) {
    const tok = getToken();
    if (tok) headers['Authorization'] = `Bearer ${tok}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let data:any = null; try{ data = text ? JSON.parse(text) : null; } catch{ data = text; }
  if (!res.ok) throw new Error(data?.message || `Request failed ${res.status}`);
  return data;
}

export const api = {
  register: (p:{name:string,email:string,password:string}) => request('/api/auth/register', { method:'POST', body: JSON.stringify(p), auth:false }),
  login: (p:{email:string,password:string}) => request('/api/auth/login', { method:'POST', body: JSON.stringify(p), auth:false }),
  me: () => request('/api/auth/me'),
  updateMe: (p:any) => request('/api/auth/me', { method:'PATCH', body: JSON.stringify(p) }),
  forgot: (email:string) => request('/api/auth/forgot-password', { method:'POST', body: JSON.stringify({ email }), auth:false }),
  reset: (token:string,password:string) => request('/api/auth/reset-password', { method:'POST', body: JSON.stringify({ token, password }), auth:false }),
  transactions: (q='') => request(`/api/transactions${q}`),
  createTx: (p:any) => request('/api/transactions', { method:'POST', body: JSON.stringify(p) }),
  updateTx: (id:string,p:any) => request(`/api/transactions/${id}`, { method:'PATCH', body: JSON.stringify(p) }),
  deleteTx: (id:string) => request(`/api/transactions/${id}`, { method:'DELETE' }),
  budgets: (month?:string) => request(`/api/budgets${month?`?month=${month}`:''}`),
  upsertBudget: (p:any) => request('/api/budgets', { method:'POST', body: JSON.stringify(p) }),
  analytics: (range='30D') => request(`/api/analytics?range=${range}`),
  report: (month?:string) => request(`/api/reports${month?`?month=${month}`:''}`),
  investments: (month?:string) => request(`/api/investments${month?`?month=${month}`:''}`),
  recurring: () => request('/api/recurring'),
  chat: (content:string, sessionId?:string) => request('/api/chat', { method:'POST', body: JSON.stringify({ content, sessionId }) }),
  exportCsv: () => `${BASE}/api/reports/export/csv`,
  exportExcel: () => `${BASE}/api/reports/export/excel`,
};