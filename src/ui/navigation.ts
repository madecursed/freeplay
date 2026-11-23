import { useSyncExternalStore } from 'react';
import type { Track } from '../types';

/** Навигация: 4 вкладки + стек вложенных страниц + полноэкранный плеер + шторка действий. */
export type Tab = 'home' | 'search' | 'library' | 'profile';
export type Page =
  | { kind: 'playlist'; id: string } // id 'liked' — «Избранное»
  | { kind: 'mix'; title: string; subtitle?: string; hue?: number; tags?: string[]; load?: () => Promise<Track[]>; autoplay?: boolean }
  | { kind: 'mood' };

interface NavState {
  tab: Tab;
  stack: Page[];
  playerOpen: boolean;
  sheet: { track: Track; playlistId?: string } | null;
}

let state: NavState = { tab: 'home', stack: [], playerOpen: false, sheet: null };
const listeners = new Set<() => void>();
const set = (p: Partial<NavState>) => { state = { ...state, ...p }; listeners.forEach((f) => f()); };
const top = () => window.scrollTo(0, 0);

export const nav = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  get: () => state,
  setTab(tab: Tab) { set({ tab, stack: [] }); top(); },
  push(page: Page) { set({ stack: [...state.stack, page] }); top(); },
  pop() { set({ stack: state.stack.slice(0, -1) }); },
  openPlayer(open = true) { set({ playerOpen: open }); },
  openSheet(track: Track, playlistId?: string) { set({ sheet: { track, playlistId } }); },
  closeSheet() { set({ sheet: null }); },
};

export const useNav = () => useSyncExternalStore(nav.subscribe, nav.get);
