import { useEffect, useState } from 'react';
export const api = async (path, method = 'GET', body) => {
  const t = localStorage.getItem('token');
  const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(t && { Authorization: 'Bearer ' + t }) }, body: body && JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
};
export const useData = path => {
  const [d, setD] = useState([]);
  const load = () => api(path).then(setD).catch(e => alert(e.message));
  useEffect(() => { load(); }, [path]);
  return [d, load];
};
export const run = async (fn, reload) => { try { await fn(); reload && reload(); } catch (e) { alert(e.message); } };
export const fmt = d => d ? new Date(d).toLocaleDateString() : '-';
