import { useEffect, useState } from 'react';

const PREFIX = 'pwc-cpi.';
export function load(key, fallback) {
  try { const v = localStorage.getItem(PREFIX + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* storage blocked: keep in memory */ }
}
/** useState that survives reloads. Falls back to memory when storage is blocked. */
export function usePersist(key, initial) {
  const [v, setV] = useState(() => load(key, typeof initial === 'function' ? initial() : initial));
  useEffect(() => { save(key, v); }, [key, v]);
  return [v, setV];
}
export const uid = () => Math.random().toString(36).slice(2, 9);
