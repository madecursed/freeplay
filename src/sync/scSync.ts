import type { Playlist, Track } from '../types';
import { loadSounds, scResolve, scUser } from '../player/scWidget';
import {
  addManyToPlaylist, createPlaylist, findPlaylistBySource, getPlaylist, getPlaylists, replacePlaylistTracks,
} from '../storage/store';
import { updateSettings } from '../storage/settings';
import { libraryTracks } from '../storage/store';
import { refreshDiscovery } from '../recommend/discovery';

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
  return (await importAny(url))[0];
}

/**
 * Импорт ссылки любого типа. Ссылка на профиль даёт до двух плейлистов:
 * лайки пользователя и его собственные треки (пустые пропускаются).
 */
export async function importAny(url: string): Promise<Playlist[]> {
  if (url.startsWith('sc-likes:') || url.startsWith('sc-user:')) return [await syncSpecial(url)];
  const src = normalize(url);
  const r = await scResolve(src);
  if (r.userId) return importUser(r.userId, r.title);
  return [await importInto(src, r.title, async () => r.tracks)];
}

async function importUser(id: string, name: string): Promise<Playlist[]> {
  const jobs = [
    { src: `sc-likes:${id}`, title: `Лайки — ${name}`, url: `https://api.soundcloud.com/users/${id}/favorites` },
    { src: `sc-user:${id}`, title: `Треки — ${name}`, url: `https://api.soundcloud.com/users/${id}` },
  ];
  const out: Playlist[] = [];
  for (const job of jobs) {
    const tracks = await loadSounds(job.url).catch(() => [] as Track[]);
    if (tracks.length) out.push(await importInto(job.src, job.title, async () => tracks));
  }
  if (!out.length) throw new Error(`У профиля «${name}» нет публичных треков и лайков`);
  return out;
}

/** Импорт нескольких ссылок (через пробел/перенос строки). */
export async function importMany(text: string, onStep?: (done: number, total: number) => void) {
  const urls = [...new Set(text.split(/\s+/).filter((s) => /soundcloud\.com\//i.test(s)))];
  const ok: Playlist[] = [], failed: string[] = [];
  for (const [i, u] of urls.entries()) {
    onStep?.(i, urls.length);
    try { ok.push(...(await importAny(u))); } catch (e) { failed.push(`${u} — ${(e as Error).message || 'ошибка'}`); }
  }
  onStep?.(urls.length, urls.length);
  if (ok.length) refreshDiscovery().catch(() => {});
  return { ok, failed, total: urls.length };
}

// ---- профиль: лайки и собственные треки ----
async function syncSpecial(src: string): Promise<Playlist> {
  const [kind, id] = src.split(':');
  if (kind === 'sc-likes') return importInto(src, 'Мои лайки SoundCloud', () => loadSounds(`https://api.soundcloud.com/users/${id}/favorites`));
  return importInto(src, 'Мои треки SoundCloud', () => loadSounds(`https://api.soundcloud.com/users/${id}`));
}

/** Принимает ссылку на профиль, короткую ссылку, «@ник» или просто ник. */
export function profileUrl(input: string): string {
  const s = input.trim().replace(/^@/, '');
  if (/^[\w-]+$/.test(s)) return `https://soundcloud.com/${s.toLowerCase()}`;
  return normalize(s).replace(/\/(likes|sets|tracks|reposts|albums|popular-tracks|following|followers)$/, '');
}

export type ProfileStep = { name: string; state: 'loading' | 'ok' | 'empty' | 'error'; count?: number };

/**
 * Подключить профиль: лайки и собственные треки.
 * Пустой список — не ошибка (у слушателя может не быть своих треков).
 * Виджет отдаёт только последние ~20 лайков: для всех лайков — соберите их в плейлист и импортируйте ссылкой.
 */
export async function connectProfile(input: string, onStep?: (steps: ProfileStep[]) => void) {
  const url = profileUrl(input);
  const user = await scUser(url);
  updateSettings({ scProfile: url });
  const steps: ProfileStep[] = [{ name: 'Лайки', state: 'loading' }, { name: 'Мои треки', state: 'loading' }];
  onStep?.([...steps]);
  const jobs = [
    { src: `sc-likes:${user.id}`, title: 'Мои лайки SoundCloud', url: `https://api.soundcloud.com/users/${user.id}/favorites` },
    { src: `sc-user:${user.id}`, title: 'Мои треки SoundCloud', url: `https://api.soundcloud.com/users/${user.id}` },
  ];
  for (const [i, job] of jobs.entries()) {
    try {
      const tracks = await loadSounds(job.url);
      if (tracks.length) {
        const p = await importInto(job.src, job.title, async () => tracks);
        steps[i] = { ...steps[i], state: 'ok', count: p.tracks.length };
      } else steps[i] = { ...steps[i], state: 'empty' };
    } catch { steps[i] = { ...steps[i], state: 'error' }; }
    onStep?.([...steps]);
  }
  refreshDiscovery(true).catch(() => {});
  return { user, steps };
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

/**
 * Вызывается при старте: сначала рекомендации из кэша (мгновенно), затем синхронизация плейлистов.
 * Если у треков ещё нет ID исполнителей (импорт старой версией) — синхронизируем принудительно,
 * чтобы рекомендациям было от чего оттолкнуться.
 */
export function autoSync() {
  setTimeout(async () => {
    const lib = libraryTracks();
    const needIds = lib.length > 0 && !lib.some((t) => t.artistId);
    await refreshDiscovery().catch(() => {});
    if (getPlaylists().some((p) => p.sourceUrl)) await syncAll(needIds).catch(() => 0);
    if (needIds) await refreshDiscovery().catch(() => {});
  }, 2500);
}
