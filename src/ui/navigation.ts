import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import type { Track } from '../types';

/** Навигация: 4 вкладки + стек вложенных страниц + полноэкранный плеер + шторка действий. */
export type Tab = 'home' | 'search' | 'library' | 'profile';
export type Page =
  | { kind: 'playlist'; id: string } // id 'liked' — «Избранное»
  | { kind: 'mix'; title: string; subtitle?: string; hue?: number; tags?: string[]; load?: () => Promise<Track[]>; autoplay?: boolean; cover?: string }
  | { kind: 'mood' };

interface NavState {
  tab: Tab;
  stack: Page[];
  playerOpen: boolean;
  playerClosing: boolean;
  queueOpen: boolean;
  sheetClosing: boolean;
  sheet: { track: Track; playlistId?: string; fromPlayer?: boolean } | null;
}

let state: NavState = { tab: 'home', stack: [], playerOpen: false, playerClosing: false, queueOpen: false, sheetClosing: false, sheet: null };
const listeners = new Set<() => void>();
const set = (p: Partial<NavState>) => { state = { ...state, ...p }; listeners.forEach((f) => f()); };
const top = () => window.scrollTo(0, 0);

/**
 * Плавные переходы между экранами.
 * View Transitions API (Safari 18+, Chrome): старый экран уезжает, новый въезжает — направление в data-nav.
 * Без поддержки — CSS-анимация появления экрана в нужном направлении.
 */
type Dir = 'forward' | 'back' | 'tab';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function transition(dir: Dir, update: () => void) {
  const root = document.documentElement;
  root.dataset.navdir = dir; // для запасной анимации
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  if (!doc.startViewTransition || reduced()) { update(); return; }
  root.dataset.nav = dir;
  doc.startViewTransition(() => flushSync(update)).finished.finally(() => { delete root.dataset.nav; });
}

const scrollPos: number[] = []; // позиция прокрутки на каждом уровне стека — восстанавливаем при «назад»
const CLOSE_MS = 260;

export const nav = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  get: () => state,
  setTab(tab: Tab) {
    if (tab === state.tab && !state.stack.length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    transition('tab', () => { set({ tab, stack: [] }); top(); });
  },
  push(page: Page) {
    scrollPos[state.stack.length] = window.scrollY;
    transition('forward', () => { set({ stack: [...state.stack, page] }); top(); });
  },
  pop() {
    const y = scrollPos[state.stack.length - 1] ?? 0;
    transition('back', () => { set({ stack: state.stack.slice(0, -1) }); window.scrollTo(0, y); });
  },
  openPlayer(open = true) {
    if (open) return set({ playerOpen: true, playerClosing: false, queueOpen: false });
    if (!state.playerOpen || state.playerClosing) return;
    set({ playerClosing: true });
    setTimeout(() => set({ playerOpen: false, playerClosing: false, queueOpen: false }), reduced() ? 0 : CLOSE_MS);
  },
  toggleQueue(open = !state.queueOpen) { set({ queueOpen: open }); },
  openSheet(track: Track, playlistId?: string, fromPlayer = false) { set({ sheet: { track, playlistId, fromPlayer }, sheetClosing: false }); },
  closeSheet() {
    if (!state.sheet || state.sheetClosing) return;
    set({ sheetClosing: true });
    setTimeout(() => set({ sheet: null, sheetClosing: false }), reduced() ? 0 : 220);
  },
};

export const useNav = () => useSyncExternalStore(nav.subscribe, nav.get);
