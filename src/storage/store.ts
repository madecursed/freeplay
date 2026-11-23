import type { Playlist, Track } from '../types';

// Локальное хранилище на телефоне. При росте данных — перейти на IndexedDB.
export function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
export function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* переполнено/приватный режим */ }
}

const listeners = new Set<() => void>();
export const subscribeStore = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const emit = () => listeners.forEach((fn) => fn());

// ---- Избранное ----
let liked: Track[] = load('fp.liked', []);
export const getLiked = () => liked;
export const isLiked = (id: string) => liked.some((t) => t.id === id);
export function toggleLike(t: Track): boolean {
  const was = isLiked(t.id);
  liked = was ? liked.filter((x) => x.id !== t.id) : [t, ...liked];
  save('fp.liked', liked); emit();
  return !was;
}

// ---- История прослушивания ----
let history: Track[] = load('fp.history', []);
export const getHistory = () => history;
export function pushHistory(t: Track) {
  history = [t, ...history.filter((x) => x.id !== t.id)].slice(0, 200);
  save('fp.history', history); emit();
}
export function clearHistory() { history = []; save('fp.history', history); emit(); }

// ---- Чистка: приложение работает только с SoundCloud, треки старых каталогов (Audius, Jamendo…) убираем ----
const onlySc = (list: Track[]) => list.filter((t) => t.source === 'soundcloud');
if (liked.some((t) => t.source !== 'soundcloud')) { liked = onlySc(liked); save('fp.liked', liked); }
if (history.some((t) => t.source !== 'soundcloud')) { history = onlySc(history); save('fp.history', history); }

// ---- Скрытые исполнители (не рекомендовать) ----
let blocked: string[] = load('nc.blockedArtists', []);
export const getBlocked = () => blocked;
export const isArtistBlocked = (artist: string) => blocked.includes(artist.toLowerCase());
export function blockArtist(artist: string) {
  const a = artist.toLowerCase();
  if (!blocked.includes(a)) { blocked = [...blocked, a]; save('nc.blockedArtists', blocked); emit(); }
}
export function unblockArtist(artist: string) { blocked = blocked.filter((a) => a !== artist.toLowerCase()); save('nc.blockedArtists', blocked); emit(); }

// ---- Дизлайки ----
let disliked: string[] = load('fp.disliked', []);
export const isDisliked = (id: string) => disliked.includes(id);
/** Не рекомендовать: дизлайк трека или скрытый исполнитель. */
export const isExcluded = (t: Track) => disliked.includes(t.id) || blocked.includes(t.artist.toLowerCase());
export function dislike(id: string) {
  if (!disliked.includes(id)) { disliked = [...disliked, id].slice(-1000); save('fp.disliked', disliked); emit(); }
}

// ---- Плейлисты ----
let playlists: Playlist[] = load('nc.playlists', []);
if (playlists.some((p) => p.tracks.some((t) => t.source !== 'soundcloud'))) {
  playlists = playlists.map((p) => ({ ...p, tracks: p.tracks.filter((t) => t.source === 'soundcloud') }));
  save('nc.playlists', playlists);
}
const savePl = () => { save('nc.playlists', playlists); emit(); };
export const getPlaylists = () => playlists;
export const getPlaylist = (id: string) => playlists.find((p) => p.id === id);
export function createPlaylist(name: string, sourceUrl?: string): Playlist {
  const p: Playlist = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: name.trim() || 'Новый плейлист', tracks: [], created: Date.now(), sourceUrl, syncedAt: sourceUrl ? Date.now() : undefined };
  playlists = [p, ...playlists]; savePl();
  return p;
}
export function deletePlaylist(id: string) { playlists = playlists.filter((p) => p.id !== id); savePl(); }
export function addToPlaylist(id: string, t: Track) {
  playlists = playlists.map((p) => (p.id === id && !p.tracks.some((x) => x.id === t.id) ? { ...p, tracks: [...p.tracks, t] } : p));
  savePl();
}
export function removeFromPlaylist(id: string, trackId: string) {
  playlists = playlists.map((p) => (p.id === id ? { ...p, tracks: p.tracks.filter((x) => x.id !== trackId) } : p));
  savePl();
}

// ---- Недавние поисковые запросы ----
let searches: string[] = load('nc.searches', []);
export const getSearches = () => searches;
export function addSearch(q: string) {
  searches = [q, ...searches.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 8);
  save('nc.searches', searches); emit();
}
export function clearSearches() { searches = []; save('nc.searches', searches); emit(); }

/** Добавить сразу много треков (импорт). */
export function addManyToPlaylist(id: string, tracks: Track[]) {
  playlists = playlists.map((p) => {
    if (p.id !== id) return p;
    const have = new Set(p.tracks.map((t) => t.id));
    return { ...p, tracks: [...p.tracks, ...tracks.filter((t) => !have.has(t.id))] };
  });
  savePl();
}

/** Обновить данные трека везде (виджет SoundCloud догружает название/обложку при воспроизведении). */
export function patchTrack(id: string, patch: Partial<Track>) {
  const fix = (list: Track[]) => list.map((t) => (t.id === id ? { ...t, ...patch } : t));
  liked = fix(liked); history = fix(history);
  playlists = playlists.map((p) => ({ ...p, tracks: fix(p.tracks) }));
  save('fp.liked', liked); save('fp.history', history); savePl();
}

export const findPlaylistBySource = (url: string) => playlists.find((p) => p.sourceUrl === url);

/** Заменить треки плейлиста актуальными из источника (синхронизация). */
export function replacePlaylistTracks(id: string, tracks: Track[]) {
  playlists = playlists.map((p) => (p.id === id ? { ...p, tracks, syncedAt: Date.now() } : p));
  savePl();
}

/** Вся библиотека: избранное + плейлисты + история, без повторов. */
export function libraryTracks(): Track[] {
  const m = new Map<string, Track>();
  for (const t of [...liked, ...playlists.flatMap((p) => p.tracks), ...history]) if (!m.has(t.id)) m.set(t.id, t);
  return [...m.values()];
}
