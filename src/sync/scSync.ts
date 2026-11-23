import type { Playlist, Track } from '../types';
import { loadSounds, scResolve, scUser } from '../player/scWidget';
import {
  addManyToPlaylist, createPlaylist, findPlaylistBySource, getPlaylist, getPlaylists, replacePlaylistTracks,
} from '../storage/store';
import { getSettings, updateSettings } from '../storage/settings';

/**
 * Импорт и автосинхронизация SoundCloud без API:
 *  - ссылка на трек/плейлист/исполнителя → плейлист в Nocturne (запоминаем ссылку);
 *  - профиль → «Мои лайки» и «Мои треки»;
 *  - при запуске плейлисты со ссылкой обновляются (не чаще раза в SYNC_EVERY).
 */
const SYNC_EVERY = 6 * 3600_000;

/** Убираем мусорные параметры (?si=…, utm), чтобы одна и та же ссылка не импортировалась дважды. */
export function normalize(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//.test(u)) u = `https://${u}`;
  return u.replace(/^http:/, 'https:').replace(/^https:\/\/(m\.|www\.)/, 'https://').split('?')[0].replace(/\/$/, '');
}

/** Новые данные, но сохраняем то, что уже догрузили (название/обложка/длительность). */
function merge(old: Track[], fresh: Track[]): Track[] {
  const prev = new Map(old.map((t) => [t.id, t]));
  return fresh.map((t) => {
    const p = prev.get(t.id);
    return p && (!t.title || t.title === 'Трек SoundCloud') ? { ...t, ...p } : t;
  });
}

async function importInto(sourceUrl: string, name: string, load: () => Promise<Track[]>): Promise<Playlist> {
  const tracks = await load();
  if (!tracks.length) throw new Error('В ссылке нет треков');
  const existing = findPlaylistBySource(sourceUrl);
  if (existing) { replacePlaylistTracks(existing.id, merge(existing.tracks, tracks)); return getPlaylist(existing.id)!; }
  const p = createPlaylist(name, sourceUrl);
  addManyToPlaylist(p.id, tracks);
  return getPlaylist(p.id)!;
}

/** Импорт одной ссылки. Повторный импорт той же ссылки обновляет существующий плейлист. */
export async function importLink(url: string): Promise<Playlist> {
  if (url.startsWith('sc-likes:') || url.startsWith('sc-user:')) return syncSpecial(url);
  const src = normalize(url);
  const r = await scResolve(src);
  return importInto(src, r.title, async () => r.tracks);
}

/** Импорт нескольких ссылок (через пробел/перенос строки). */
export async function importMany(text: string, onStep?: (done: number, total: number) => void) {
  const urls = [...new Set(text.split(/\s+/).filter((s) => /soundcloud\.com\//i.test(s)))];
  const ok: Playlist[] = [], failed: string[] = [];
  for (const [i, u] of urls.entries()) {
    onStep?.(i, urls.length);
    try { ok.push(await importLink(u)); } catch { failed.push(u); }
  }
  onStep?.(urls.length, urls.length);
  return { ok, failed, total: urls.length };
}

// ---- профиль: лайки и собственные треки ----
async function syncSpecial(src: string): Promise<Playlist> {
  const [kind, id] = src.split(':');
  if (kind === 'sc-likes') return importInto(src, 'Мои лайки SoundCloud', () => loadSounds(`https://api.soundcloud.com/users/${id}/favorites`));
  return importInto(src, 'Мои треки SoundCloud', () => loadSounds(`https://api.soundcloud.com/users/${id}`));
}

/** Подключить профиль: импортирует лайки и загруженные треки. */
export async function connectProfile(profileUrl: string) {
  const url = normalize(profileUrl).replace(/\/(likes|sets|tracks|reposts|albums|popular-tracks)$/, '');
  const user = await scUser(url);
  updateSettings({ scProfile: url });
  const results: { name: string; ok: boolean; count?: number }[] = [];
  for (const [src, name] of [[`sc-likes:${user.id}`, 'Лайки'], [`sc-user:${user.id}`, 'Треки']] as const) {
    try { const p = await syncSpecial(src); results.push({ name, ok: true, count: p.tracks.length }); }
    catch { results.push({ name, ok: false }); }
  }
  return { user, results };
}

// ---- автосинхронизация ----
let running = false;
export async function syncAll(force = false): Promise<number> {
  if (running) return 0;
  running = true;
  let n = 0;
  try {
    for (const p of getPlaylists()) {
      if (!p.sourceUrl) continue;
      if (!force && p.syncedAt && Date.now() - p.syncedAt < SYNC_EVERY) continue;
      try { await importLink(p.sourceUrl); n++; } catch { /* офлайн или ссылка удалена — оставляем как есть */ }
    }
  } finally { running = false; }
  return n;
}

/** Вызывается при старте приложения. */
export function autoSync() {
  if (!getSettings().scProfile && !getPlaylists().some((p) => p.sourceUrl)) return;
  setTimeout(() => syncAll().catch(() => {}), 4000); // после загрузки интерфейса
}
