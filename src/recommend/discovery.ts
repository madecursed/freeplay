import { useSyncExternalStore } from 'react';
import type { Track } from '../types';
import { loadSounds } from '../player/scWidget';
import { getHistory, getLiked, isArtistBlocked, isExcluded, libraryTracks, load, save } from '../storage/store';
import { weight } from './profile';

/**
 * Данные исполнителей из SoundCloud без API (через официальный встраиваемый плеер):
 *  - треки исполнителя (users/ID) и его лайки (users/ID/favorites);
 *  - «Новое от твоих артистов» на главной — свежие треки исполнителей, которых вы слушаете;
 *  - кэш для автоплея (recommend/autoplay.ts) и миксов по настроению.
 * Кэш по исполнителю — 12 часов, главная открывается мгновенно.
 */
const CACHE_KEY = 'nc.discovery.v1';
const CACHE_TTL = 12 * 3600_000;
const SEEDS = 5;           // сколько исполнителей проверять на новинки
const PER_LIST = 60;       // сколько треков хранить из каждого списка

/** likesLoaded — загружены ли лайки исполнителя (для новинок нужны только его треки). */
export interface ArtistCache { ts: number; name: string; likes: Track[]; uploads: Track[]; likesLoaded?: boolean }
type Cache = Record<string, ArtistCache>;

export interface Discovery {
  loading: boolean;
  updatedAt: number;
  fresh: Track[];         // новые треки ваших исполнителей
}

let cache: Cache = load(CACHE_KEY, {});
let state: Discovery = { loading: false, updatedAt: 0, fresh: [] };
const listeners = new Set<() => void>();
const set = (p: Partial<Discovery>) => { state = { ...state, ...p }; listeners.forEach((f) => f()); };

export const discovery = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  get: () => state,
};
export const useDiscovery = () => useSyncExternalStore(discovery.subscribe, discovery.get);

/** Все треки из кэша исполнителей (для миксов по настроению). */
export function discoveryPool(): Track[] {
  return Object.values(cache).flatMap((c) => [...c.likes, ...c.uploads]);
}

/** Не песня: подкасты, радиошоу, интервью, сырые записи, многочасовые миксы. */
const NOT_SONG = /\b(podcast|episode|ep\.?\s?\d+|radio (hour|show)|interview|recording \d{4}|live stream|livestream|q&a|подкаст|выпуск|интервью|эфир)\b/i;
export const isSong = (t: Track) => !NOT_SONG.test(t.title) && (t.duration === 0 || (t.duration >= 60 && t.duration <= 600));

async function fetchArtist(id: number, name: string, force: boolean, withLikes: boolean): Promise<ArtistCache | null> {
  const c = cache[id];
  if (c && !force && Date.now() - c.ts < CACHE_TTL && (!withLikes || c.likesLoaded)) return c;
  const [likes, uploads] = await Promise.allSettled([
    withLikes ? loadSounds(`https://api.soundcloud.com/users/${id}/favorites`) : Promise.resolve(c?.likes ?? []),
    loadSounds(`https://api.soundcloud.com/users/${id}`),
  ]);
  const entry: ArtistCache = {
    ts: Date.now(), name,
    likesLoaded: withLikes || c?.likesLoaded,
    likes: likes.status === 'fulfilled' ? likes.value.slice(0, PER_LIST) : c?.likes ?? [],
    uploads: uploads.status === 'fulfilled' ? uploads.value.slice(0, PER_LIST) : c?.uploads ?? [],
  };
  if (!entry.likes.length && !entry.uploads.length) return c ?? null;
  cache[id] = entry;
  return entry;
}

/** Треки (и при withLikes — лайки) исполнителя: из кэша или загрузкой. Для автоплея. */
export async function artistData(id: number, name: string, withLikes: boolean): Promise<ArtistCache | null> {
  const e = await fetchArtist(id, name, false, withLikes);
  save(CACHE_KEY, cache);
  return e;
}

/**
 * Исполнители для «Новое от твоих артистов» — те, кого вы реально слушаете:
 * лайки (+2 за трек), недавняя история (+1), библиотека (+0.3), вес в профиле вкуса (×3).
 * Из лучших 12 случайно (пропорционально весу) берём SEEDS — новинки чередуются.
 */
function seedArtists(): { id: number; name: string }[] {
  const ids = new Map<string, number>();
  const sc = new Map<string, number>();
  const add = (name: string, v: number) => sc.set(name, (sc.get(name) ?? 0) + v);
  for (const t of libraryTracks()) { if (t.artistId) ids.set(t.artist, t.artistId); add(t.artist, 0.3); }
  for (const t of getLiked()) add(t.artist, 2);
  for (const t of getHistory().slice(0, 120)) add(t.artist, 1);
  const w = (name: string) => weight(`artist:${name.toLowerCase()}`);
  const cands = [...ids.entries()]
    .filter(([name]) => !isArtistBlocked(name) && w(name) > -1)
    .map(([name, id]) => ({ id, name, w: Math.max(0.1, (sc.get(name) ?? 0) + w(name) * 3) }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 12);
  const picked: typeof cands = [];
  while (picked.length < SEEDS && cands.length) {
    const total = cands.reduce((s, c) => s + c.w, 0);
    let r = Math.random() * total, i = 0;
    while (i < cands.length - 1 && (r -= cands[i].w) > 0) i++;
    picked.push(cands.splice(i, 1)[0]);
  }
  return picked;
}

/** Свежие песни исполнителей: не из библиотеки, не скрытые, не больше 3 от исполнителя. */
function compose(entries: ArtistCache[]) {
  const inLib = new Set(libraryTracks().map((t) => t.id));
  const perArtist = new Map<string, number>();
  const fresh = [...new Map(entries.flatMap((e) => e.uploads).map((t) => [t.id, t])).values()]
    .filter((t) => !inLib.has(t.id) && !isExcluded(t) && isSong(t) && !!t.title)
    .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''))
    .filter((t) => { const n = perArtist.get(t.artist) ?? 0; perArtist.set(t.artist, n + 1); return n < 3; })
    .slice(0, 20);
  set({ fresh });
}

let running: Promise<void> | null = null;

/** Обновить «Новое от твоих артистов». Без force использует кэш (сеть — только для устаревших). */
export function refreshDiscovery(force = false): Promise<void> {
  if (running) return running;
  running = (async () => {
    const seeds = seedArtists();
    compose(seeds.map((s) => cache[s.id]).filter(Boolean));   // сразу из кэша
    if (!seeds.length) { set({ loading: false, updatedAt: Date.now() }); return; }
    set({ loading: true });
    const entries: ArtistCache[] = [];
    for (const s of seeds) {
      const e = await fetchArtist(s.id, s.name, force, false).catch(() => null);
      if (e) { entries.push(e); compose(entries); }
    }
    for (const [id, c] of Object.entries(cache)) if (Date.now() - c.ts > 7 * CACHE_TTL) delete cache[id];
    save(CACHE_KEY, cache);
    set({ loading: false, updatedAt: Date.now() });
  })().finally(() => { running = null; });
  return running;
}
