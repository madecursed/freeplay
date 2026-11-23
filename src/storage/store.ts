import type { Track } from '../types';

// Простое локальное хранилище на телефоне. При росте данных — перейти на IndexedDB.
function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* переполнено/приватный режим */ }
}

const listeners = new Set<() => void>();
export const subscribeStore = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn());

let liked: Track[] = load('fp.liked', []);
let history: Track[] = load('fp.history', []);
let disliked: string[] = load('fp.disliked', []);

export const getLiked = () => liked;
export const isLiked = (id: string) => liked.some((t) => t.id === id);
export function toggleLike(t: Track): boolean {
  const was = isLiked(t.id);
  liked = was ? liked.filter((x) => x.id !== t.id) : [t, ...liked];
  save('fp.liked', liked); emit();
  return !was;
}

export const getHistory = () => history;
export function pushHistory(t: Track) {
  history = [t, ...history.filter((x) => x.id !== t.id)].slice(0, 200);
  save('fp.history', history); emit();
}

export const isDisliked = (id: string) => disliked.includes(id);
export function dislike(id: string) {
  if (!disliked.includes(id)) { disliked = [...disliked, id].slice(-1000); save('fp.disliked', disliked); emit(); }
}

export { load, save };
