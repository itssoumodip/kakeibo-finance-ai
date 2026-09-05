const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

export function getToken(){ return localStorage.getItem('token'); }
export function setToken(t:string){ localStorage.setItem('token', t); }
export function clearToken(){ localStorage.removeItem('token'); }

// Simple GET cache + timeout + in-flight dedup to cut loading waterfalls
const cache = new Map<string, { ts: number; data: any }>();
const inflight = new Map<string, Promise<any>>();
const CACHE_TTL = 20_000; // 20s for analytics/transactions lists
const REQUEST_TIMEOUT = 12_000;

function cacheKey(path: string, opts: RequestInit) {
  return `${opts.method || 'GET'}:${path}:${getToken()?.slice(-8) || 'noauth'}`;
}

export function clearApiCache(prefix?: string) {
  if (!prefix) { cache.clear(); return; }
  for (const k of cache.keys()) if (k.includes(prefix)) cache.delete(k);
}

// Global network-activity signal for the TopLoader bar.
// Only real network fetches are tracked (instant cache hits stay silent).
let activeRequests = 0;
const loadingListeners = new Set<(n: number) => void>();
export function subscribeLoading(fn: (n: number) => void) {
  loadingListeners.add(fn);
  fn(activeRequests);
  return () => { loadingListeners.delete(fn); };
}
function emitLoading() {
  loadingListeners.forEach((fn) => { try { fn(activeRequests); } catch {} });
}
function trackStart() { activeRequests += 1; emitLoading(); }
function trackEnd() { activeRequests = Math.max(0, activeRequests - 1); emitLoading(); }

async function request(path:string, opts: RequestInit & { auth?: boolean; ttl?: number } = {}){
  const method = (opts.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const ttl = opts.ttl ?? CACHE_TTL;
  const headers: Record<string,string> = { 'Content-Type':'application/json', ...(opts.headers as any||{}) };
  if (opts.auth !== false) {
    const tok = getToken();
    if (tok) headers['Authorization'] = `Bearer ${tok}`;
  }
  const key = cacheKey(path, { ...opts, method });

  if (isGet) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < ttl) return hit.data;
    const pending = inflight.get(key);
    if (pending) return pending;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);

  trackStart();
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const p = (async () => {
    try {
      const res = await fetch(`${BASE}${path}`, { ...opts, headers, signal: ctrl.signal });
      const text = await res.text();
      let data:any = null; try{ data = text ? JSON.parse(text) : null; } catch{ data = text; }
      if (!res.ok) throw new Error(data?.message || `Request failed ${res.status}`);
      if (isGet) cache.set(key, { ts: Date.now(), data });
      return data;
    } finally {
      clearTimeout(timer);
      inflight.delete(key);
      trackEnd();
      // Dev-only: name the slow call so "takes so much time" is measurable, not a feeling
      if (import.meta.env.DEV && t0) {
        const dt = Math.round(performance.now() - t0);
        if (dt > 1000) console.warn(`[api] SLOW ${method} ${path} — ${dt}ms (check server/Atlas region)`);
      }
    }
  })();

  if (isGet) inflight.set(key, p);
  return p;
}

const invalidate = (prefixes: string[]) => prefixes.forEach(p => clearApiCache(p));

export const api = {
  register: (p:{name:string,email:string,password:string}) => request('/api/auth/register', { method:'POST', body: JSON.stringify(p), auth:false }),
  login: (p:{email:string,password:string}) => request('/api/auth/login', { method:'POST', body: JSON.stringify(p), auth:false }),
  me: () => request('/api/auth/me', { ttl: 60_000 }),
  updateMe: async (p:any) => { const r = await request('/api/auth/me', { method:'PATCH', body: JSON.stringify(p) }); clearApiCache('/api/auth/me'); return r; },
  forgot: (email:string) => request('/api/auth/forgot-password', { method:'POST', body: JSON.stringify({ email }), auth:false }),
  reset: (token:string,password:string) => request('/api/auth/reset-password', { method:'POST', body: JSON.stringify({ token, password }), auth:false }),
  transactions: (q='') => request(`/api/transactions${q}`, { ttl: 15_000 }),
  createTx: async (p:any) => { const r = await request('/api/transactions', { method:'POST', body: JSON.stringify(p) }); invalidate(['/api/transactions', '/api/analytics', '/api/reports']); return r; },
  updateTx: async (id:string,p:any) => { const r = await request(`/api/transactions/${id}`, { method:'PATCH', body: JSON.stringify(p) }); invalidate(['/api/transactions', '/api/analytics', '/api/reports']); return r; },
  deleteTx: async (id:string) => { const r = await request(`/api/transactions/${id}`, { method:'DELETE' }); invalidate(['/api/transactions', '/api/analytics', '/api/reports']); return r; },
  budgets: (month?:string) => request(`/api/budgets${month?`?month=${month}`:''}`, { ttl: 15_000 }),
  upsertBudget: async (p:any) => { const r = await request('/api/budgets', { method:'POST', body: JSON.stringify(p) }); clearApiCache('/api/budgets'); return r; },
  analytics: (range='30D') => request(`/api/analytics?range=${range}`, { ttl: 20_000 }),
  report: (month?:string) => request(`/api/reports${month?`?month=${month}`:''}`, { ttl: 20_000 }),
  investments: (month?:string) => request(`/api/investments${month?`?month=${month}`:''}`, { ttl: 20_000 }),
  recurring: () => request('/api/recurring', { ttl: 30_000 }),
  chat: (content:string, sessionId?:string) => request('/api/chat', { method:'POST', body: JSON.stringify({ content, sessionId }) }),
  exportCsv: () => `${BASE}/api/reports/export/csv`,
  exportExcel: () => `${BASE}/api/reports/export/excel`,
};