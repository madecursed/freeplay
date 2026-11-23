import { useSyncExternalStore } from 'react';
import type { Track } from '../types';
import { loadSounds } from '../player/scWidget';
import { getHistory, getLiked, isArtistBlocked, isExcluded, libraryTracks } from '../storage/store';
import { load, save } from '../storage/store';
import { matches, score } from './recommend';
import { MIXES } from './moods';
import { similarFor, type SimilarArtist } from './deezer';
import { getSettings } from '../storage/settings';
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

/** simOnly — исполнитель найден через Deezer, загружены только его треки (без лайков). */
interface ArtistCache { ts: number; name: string; likes: Track[]; uploads: Track[]; simOnly?: boolean }
type Cache = Record<string, ArtistCache>;

export interface ArtistRow { artist: string; tracks: Track[] }

/** Рекомендованный плейлист (собирается автоматически). */
export interface RecMix { id: string; title: string; subtitle: string; tracks: Track[]; hue: number; source?: 'deezer' }
export interface Discovery {
  loading: boolean;
  updatedAt: number;
  forYou: Track[];        // главная подборка: новое + забытое из библиотеки
  fresh: Track[];         // новые треки ваших исполнителей
  similar: ArtistRow[];   // «Если нравится X» — из лайков исполнителя
  rediscover: Track[];    // из библиотеки, что давно не играло
  mixes: RecMix[];        // рекомендованные плейлисты
  seeds: number;          // сколько исполнителей удалось опросить
}

let cache: Cache = load(CACHE_KEY, {});
let state: Discovery = { loading: false, updatedAt: 0, forYou: [], fresh: [], similar: [], rediscover: [], mixes: [], seeds: 0 };
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

/**
 * Исполнители-«семена» — те, кого вы реально слушаете:
 * вес в профиле вкуса (дослушивания, лайки, пропуски) + лайки + недавняя история.
 * Просто присутствие в импортированных плейлистах весит мало. Скрытые и часто пропускаемые — исключены.
 * Из лучших 12 случайно (пропорционально весу) берём SEEDS — подборки меняются от обновления к обновлению.
 */
function seedArtists(): { id: number; name: string }[] {
  const ids = new Map<string, number>();
  const sc = new Map<string, number>();
  const add = (name: string, v: number) => sc.set(name, (sc.get(name) ?? 0) + v);
  for (const t of libraryTracks()) { if (t.artistId) ids.set(t.artist, t.artistId); add(t.artist, 0.3); }
  for (const t of getLiked()) add(t.artist, 2);
  for (const t of getHistory().slice(0, 120)) add(t.artist, 1);
  const cands = [...ids.entries()]
    .filter(([name]) => !isArtistBlocked(name) && artistWeight(name) > -1)
    .map(([name, id]) => ({ id, name, w: Math.max(0.1, (sc.get(name) ?? 0) + artistWeight(name) * 3) }))
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
const artistWeight = (name: string) => weight(`artist:${name.toLowerCase()}`);

async function fetchArtist(id: number, name: string, force: boolean, withLikes = true): Promise<ArtistCache | null> {
  const c = cache[id];
  if (c && !force && Date.now() - c.ts < CACHE_TTL && !(withLikes && c.simOnly)) return c;
  const [likes, uploads] = await Promise.allSettled([
    withLikes ? loadSounds(`https://api.soundcloud.com/users/${id}/favorites`) : Promise.resolve([] as Track[]),
    loadSounds(`https://api.soundcloud.com/users/${id}`),
  ]);
  const entry: ArtistCache = {
    ts: Date.now(), name, simOnly: !withLikes,
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

/** Не больше max треков одного исполнителя (по порядку — лучшие остаются). */
function capArtists(tracks: Track[], max = 2): Track[] {
  const n = new Map<string, number>();
  return tracks.filter((t) => { const c = n.get(t.artist) ?? 0; n.set(t.artist, c + 1); return c < max; });
}

/** Собирает разделы главной из кэша (быстро, без сети). */
function compose(entries: ArtistCache[]) {
  const lib = libraryTracks();
  const inLib = new Set(lib.map((t) => t.id));
  const history = getHistory();
  const recent = new Set(history.slice(0, 40).map((t) => t.id));
  const ok = (t: Track) => t.source === 'soundcloud' && !isExcluded(t) && artistWeight(t.artist) > -1.5 && !!t.title && t.title !== 'Трек SoundCloud';
  const fresh = (t: Track) => ok(t) && !inLib.has(t.id);

  const similar: ArtistRow[] = entries
    .map((e) => ({ artist: e.name, tracks: capArtists(rank(uniq(e.likes.filter((t) => fresh(t) && t.artist !== e.name)), recent)).slice(0, 15) }))
    .filter((r) => r.tracks.length >= 3);

  const newest = capArtists(uniq(entries.flatMap((e) => e.uploads.filter(fresh)))
    .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? '')), 3)
    .slice(0, 15);

  // давно не играло: есть в библиотеке, но нет в последних 60 прослушиваниях
  const played = new Set(history.slice(0, 60).map((t) => t.id));
  const rediscover = capArtists(rank(lib.filter((t) => ok(t) && !played.has(t.id)), recent)).slice(0, 15);

  // «Похожие на X» (Deezer): популярные треки похожих исполнителей, по 2 от каждого
  const dz: ArtistRow[] = simGroups
    .map((g) => ({ artist: g.seed, tracks: capArtists(rank(uniq(g.entries.flatMap(topUploads).filter(fresh)), recent)).slice(0, 20) }))
    .filter((r) => r.tracks.length >= 5);

  // «Для тебя»: ~70% новое, ~30% забытое из библиотеки, по вкусу; не больше 2 треков исполнителя
  const newPool = capArtists(rank(uniq([...dz.flatMap((r) => r.tracks), ...similar.flatMap((r) => r.tracks), ...newest]), recent), 3);
  const forYou: Track[] = [];
  const used = new Set<string>();
  let n = 0, o = 0;
  while (forYou.length < 30 && (n < newPool.length || o < rediscover.length)) {
    const takeOld = forYou.length % 10 >= 7 && o < rediscover.length;
    const t = takeOld ? rediscover[o++] : newPool[n++] ?? rediscover[o++];
    if (t && !used.has(t.id)) { used.add(t.id); forYou.push(t); }
  }
  const pool = uniq([...entries.flatMap((e) => [...e.likes, ...e.uploads]).filter(fresh), ...simGroups.flatMap((g) => g.entries.flatMap(topUploads)).filter(fresh), ...lib.filter(ok)]);
  const mixes = buildMixes({ dz, newPool, similar, newest, rediscover, pool, recent });
  set({ forYou: noRepeats(capArtists(forYou)), fresh: newest, similar, rediscover, mixes, seeds: entries.length });
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
    // сразу показываем то, что есть в кэше (включая прошлые находки Deezer)
    simGroups = loadGroups();
    compose(seeds.map((s) => cache[s.id]).filter(Boolean));
    if (!seeds.length) { set({ loading: false, updatedAt: Date.now() }); return; }
    set({ loading: true });
    const entries: ArtistCache[] = [];
    for (const s of seeds) {   // по очереди: каждый запрос — отдельный скрытый плеер
      const e = await fetchArtist(s.id, s.name, force).catch(() => null);
      if (e) { entries.push(e); compose(entries); }
    }
    if (getSettings().deezer !== false) await deezerStep(seeds, entries, force).catch(() => {});
    // чистим кэш от исполнителей, которых давно нет среди семян
    for (const [id, c] of Object.entries(cache)) if (Date.now() - c.ts > 7 * CACHE_TTL) delete cache[id];
    save(CACHE_KEY, cache);
    set({ loading: false, updatedAt: Date.now() });
  })().finally(() => { running = null; });
  return running;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Рекомендованные плейлисты:
 *  «Открытия» — лучшее новое; «Если нравится X» — по лайкам исполнителя; «Новинки»;
 *  жанровые миксы — группировка найденного и библиотеки по жанру;
 *  миксы-настроения («Потерянный сон», «Вечная осень»…) — по тегам; «Забытое» — из библиотеки.
 */
function buildMixes(p: { dz: ArtistRow[]; newPool: Track[]; similar: ArtistRow[]; newest: Track[]; rediscover: Track[]; pool: Track[]; recent: Set<string> }): RecMix[] {
  const out: RecMix[] = [];
  const taken = new Set<string>();
  const MIN = 5;
  // каждый трек — максимум в одной подборке; порядок = приоритет
  const add = (m: Omit<RecMix, 'tracks'>, tracks: Track[], limit = 30) => {
    const ts = capArtists(tracks.filter((t) => !taken.has(t.id))).slice(0, limit);
    if (ts.length < MIN) return;
    ts.forEach((t) => taken.add(t.id));
    out.push({ ...m, tracks: noRepeats(ts) });
  };

  for (const [i, r] of p.dz.entries()) add({ id: 'dz-' + r.artist, title: 'Похожие на', subtitle: r.artist, hue: 262 + i * 10, source: 'deezer' }, r.tracks, 20);
  for (const [i, r] of p.similar.entries()) add({ id: 'sim-' + r.artist, title: 'Если нравится', subtitle: r.artist, hue: 280 + i * 8 }, r.tracks, 15);
  for (const m of MIXES) add({ id: 'mood-' + m.id, title: m.title, subtitle: m.subtitle, hue: m.hue }, rank(p.pool.filter((t) => matches(t, m.tags)), p.recent));

  const byGenre = new Map<string, Track[]>();
  for (const t of p.pool) {
    const g = t.genre?.trim().toLowerCase();
    if (!g || g.length > 22 || g === 'none') continue;
    if (!byGenre.has(g)) byGenre.set(g, []);
    byGenre.get(g)!.push(t);
  }
  [...byGenre.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 5)
    .forEach(([g, ts], i) => add({ id: 'genre-' + g, title: cap(g), subtitle: 'микс', hue: 250 + i * 14 }, rank(ts, p.recent)));

  add({ id: 'discover', title: 'Открытия', subtitle: 'для тебя', hue: 270 }, p.newPool);
  add({ id: 'fresh', title: 'Новинки', subtitle: 'твоих артистов', hue: 255 }, p.newest);
  add({ id: 'forgotten', title: 'Забытое', subtitle: 'из библиотеки', hue: 300 }, p.rediscover);
  // «Открытия» — первыми на главной
  // на главной первыми — «Открытия», затем «Похожие на…» (Deezer)
  const rankOf = (m: RecMix) => (m.id === 'discover' ? 0 : m.source === 'deezer' ? 1 : 2);
  return out.sort((a, b) => rankOf(a) - rankOf(b));
}

// ---------------------------------------------------------------------------
// Deezer: похожие исполнители (модуль ./deezer). Подробно — docs/RECOMMENDATIONS.md.
// ---------------------------------------------------------------------------
interface SimGroup { seed: string; entries: ArtistCache[] }
let simGroups: SimGroup[] = [];
const GROUPS_KEY = 'nc.dz.groups.v1';

function loadGroups(): SimGroup[] {
  const saved = load<{ seed: string; ids: number[] }[]>(GROUPS_KEY, []);
  return saved.map((g) => ({ seed: g.seed, entries: g.ids.map((id) => cache[id]).filter(Boolean) })).filter((g) => g.entries.length);
}

/** Не песня: подкасты, радиошоу, интервью, сырые записи, многочасовые миксы. */
const NOT_SONG = /\b(podcast|episode|ep\.?\s?\d+|radio (hour|show)|interview|recording \d{4}|live stream|livestream|q&a|подкаст|выпуск|интервью|эфир)\b/i;
const isSong = (t: Track) => !NOT_SONG.test(t.title) && (t.duration === 0 || (t.duration >= 60 && t.duration <= 600));

/** Самые популярные песни исполнителя (по числу прослушиваний в SoundCloud). */
function topUploads(e: ArtistCache): Track[] {
  return e.uploads.filter(isSong).sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0)).slice(0, 10);
}

/**
 * Для 3 главных семян: Deezer → похожие исполнители → их профили на SoundCloud → их треки.
 * Не больше 4 похожих на семя; загружаем по 2 параллельно; разделы обновляются по мере загрузки.
 */
async function deezerStep(seeds: { id: number; name: string }[], entries: ArtistCache[], force: boolean) {
  const seedIds = new Set(seeds.map((s) => s.id));
  const groups: SimGroup[] = [];
  const saved: { seed: string; ids: number[] }[] = [];
  for (const s of seeds.slice(0, 3)) {
    const sims: SimilarArtist[] = await similarFor(s.name, 6).catch(() => []);
    const pick = sims.filter((a) => !seedIds.has(a.scId)).slice(0, 4);
    const got: { id: number; e: ArtistCache }[] = [];
    for (let i = 0; i < pick.length; i += 2) {
      const res = await Promise.all(pick.slice(i, i + 2).map(async (a) => ({ id: a.scId, e: await fetchArtist(a.scId, a.name, force, false).catch(() => null) })));
      for (const r of res) if (r.e) got.push({ id: r.id, e: r.e });
    }
    if (got.length) {
      groups.push({ seed: s.name, entries: got.map((g) => g.e) });
      saved.push({ seed: s.name, ids: got.map((g) => g.id) });
      simGroups = [...groups];
      compose(entries);
    }
  }
  if (saved.length) save(GROUPS_KEY, saved);
}
