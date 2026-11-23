import { useSyncExternalStore } from 'react';
import type { Track } from '../types';
import { loadSounds } from '../player/scWidget';
import { getHistory, isDisliked, libraryTracks } from '../storage/store';
import { load, save } from '../storage/store';
import { score } from './recommend';
import { weight } from './profile';

/**
 * Поиск новой музыки в SoundCloud без API.
 *
 * Идея: исполнители, которых вы слушаете, лайкают похожую музыку и выпускают новое.
 * Официальный встраиваемый плеер умеет отдавать лайки пользователя (users/ID/favorites)
 * и его треки (users/ID) — это и есть кандидаты. Дальше их ранжирует ваш профиль вкуса.
 *
 * Результаты по каждому исполнителю кэшируются на CACHE_TTL, главная открывается мгновенно.
 */
const CACHE_KEY = 'nc.discovery.v1';
const CACHE_TTL = 12 * 3600_000;
const SEEDS = 5;           // сколько исполнителей опрашивать
const PER_LIST = 60;       // сколько треков брать из каждого списка

interface ArtistCache { ts: number; name: string; likes: Track[]; uploads: Track[] }
type Cache = Record<string, ArtistCache>;

export interface ArtistRow { artist: string; tracks: Track[] }
export interface Discovery {
  loading: boolean;
  updatedAt: number;
  forYou: Track[];        // главная подборка: новое + забытое из библиотеки
  fresh: Track[];         // новые треки ваших исполнителей
  similar: ArtistRow[];   // «Если нравится X» — из лайков исполнителя
  rediscover: Track[];    // из библиотеки, что давно не играло
  seeds: number;          // сколько исполнителей удалось опросить
}

let cache: Cache = load(CACHE_KEY, {});
let state: Discovery = { loading: false, updatedAt: 0, forYou: [], fresh: [], similar: [], rediscover: [], seeds: 0 };
const listeners = new Set<() => void>();
const set = (p: Partial<Discovery>) => { state = { ...state, ...p }; listeners.forEach((f) => f()); };

export const discovery = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  get: () => state,
};
export const useDiscovery = () => useSyncExternalStore(discovery.subscribe, discovery.get);

/** Все найденные треки (для автомикса). */
export function discoveryPool(): Track[] {
  return Object.values(cache).flatMap((c) => [...c.likes, ...c.uploads]);
}

/** Исполнители-«семена»: по весу в профиле вкуса, иначе по частоте в библиотеке. Нужен их ID. */
function seedArtists(): { id: number; name: string }[] {
  const lib = libraryTracks();
  const ids = new Map<string, number>();
  const freq = new Map<string, number>();
  for (const t of lib) {
    if (t.artistId) ids.set(t.artist, t.artistId);
    freq.set(t.artist, (freq.get(t.artist) ?? 0) + 1);
  }
  return [...ids.entries()]
    .map(([name, id]) => ({ id, name, w: weight(`artist:${name.toLowerCase()}`) * 3 + (freq.get(name) ?? 0) + Math.random() }))
    .sort((a, b) => b.w - a.w)
    .slice(0, SEEDS);
}

async function fetchArtist(id: number, name: string, force: boolean): Promise<ArtistCache | null> {
  const c = cache[id];
  if (c && !force && Date.now() - c.ts < CACHE_TTL) return c;
  const [likes, uploads] = await Promise.allSettled([
    loadSounds(`https://api.soundcloud.com/users/${id}/favorites`),
    loadSounds(`https://api.soundcloud.com/users/${id}`),
  ]);
  const entry: ArtistCache = {
    ts: Date.now(), name,
    likes: likes.status === 'fulfilled' ? likes.value.slice(0, PER_LIST) : c?.likes ?? [],
    uploads: uploads.status === 'fulfilled' ? uploads.value.slice(0, PER_LIST) : c?.uploads ?? [],
  };
  if (!entry.likes.length && !entry.uploads.length) return c ?? null;
  cache[id] = entry;
  return entry;
}

function rank(tracks: Track[], recent: Set<string>): Track[] {
  return tracks.map((t) => ({ t, s: score(t, recent.has(t.id)) })).sort((a, b) => b.s - a.s).map((x) => x.t);
}

const uniq = (tracks: Track[]) => [...new Map(tracks.map((t) => [t.id, t])).values()];

/** Собирает разделы главной из кэша (быстро, без сети). */
function compose(entries: ArtistCache[]) {
  const lib = libraryTracks();
  const inLib = new Set(lib.map((t) => t.id));
  const history = getHistory();
  const recent = new Set(history.slice(0, 40).map((t) => t.id));
  const ok = (t: Track) => !isDisliked(t.id) && !!t.title && t.title !== 'Трек SoundCloud';
  const fresh = (t: Track) => ok(t) && !inLib.has(t.id);

  const similar: ArtistRow[] = entries
    .map((e) => ({ artist: e.name, tracks: rank(uniq(e.likes.filter((t) => fresh(t) && t.artist !== e.name)), recent).slice(0, 12) }))
    .filter((r) => r.tracks.length >= 3);

  const newest = uniq(entries.flatMap((e) => e.uploads.filter(fresh)))
    .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''))
    .slice(0, 15);

  // давно не играло: есть в библиотеке, но нет в последних 60 прослушиваниях
  const played = new Set(history.slice(0, 60).map((t) => t.id));
  const rediscover = rank(lib.filter((t) => ok(t) && !played.has(t.id)), recent).slice(0, 12);

  // «Для тебя»: ~70% новое, ~30% забытое из библиотеки, по вкусу
  const newPool = rank(uniq([...similar.flatMap((r) => r.tracks), ...newest]), recent);
  const forYou: Track[] = [];
  const used = new Set<string>();
  let n = 0, o = 0;
  while (forYou.length < 30 && (n < newPool.length || o < rediscover.length)) {
    const takeOld = forYou.length % 10 >= 7 && o < rediscover.length;
    const t = takeOld ? rediscover[o++] : newPool[n++] ?? rediscover[o++];
    if (t && !used.has(t.id)) { used.add(t.id); forYou.push(t); }
  }
  set({ forYou: noRepeats(forYou), fresh: newest, similar, rediscover, seeds: entries.length });
}

// не больше 2 треков одного исполнителя подряд
function noRepeats(tracks: Track[]): Track[] {
  const out: Track[] = [], rest: Track[] = [];
  for (const t of tracks) {
    const l = out.slice(-2);
    (l.length === 2 && l.every((x) => x.artist === t.artist) ? rest : out).push(t);
  }
  return [...out, ...rest];
}

let running: Promise<void> | null = null;

/** Обновить рекомендации. Без force использует кэш (сеть — только для устаревших исполнителей). */
export function refreshDiscovery(force = false): Promise<void> {
  if (running) return running;
  running = (async () => {
    const seeds = seedArtists();
    // сразу показываем то, что есть в кэше
    compose(seeds.map((s) => cache[s.id]).filter(Boolean));
    if (!seeds.length) { set({ loading: false, updatedAt: Date.now() }); return; }
    set({ loading: true });
    const entries: ArtistCache[] = [];
    for (const s of seeds) {   // по очереди: каждый запрос — отдельный скрытый плеер
      const e = await fetchArtist(s.id, s.name, force).catch(() => null);
      if (e) { entries.push(e); compose(entries); }
    }
    // чистим кэш от исполнителей, которых давно нет среди семян
    for (const [id, c] of Object.entries(cache)) if (Date.now() - c.ts > 7 * CACHE_TTL) delete cache[id];
    save(CACHE_KEY, cache);
    set({ loading: false, updatedAt: Date.now() });
  })().finally(() => { running = null; });
  return running;
}
