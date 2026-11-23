import type { MusicSource, Track } from '../types';

// SoundCloud API требует секретный ключ, его нельзя хранить в браузере,
// поэтому запросы идут через маленький прокси (worker/soundcloud-proxy.js).
const PROXY = import.meta.env.VITE_SOUNDCLOUD_PROXY as string | undefined;

async function get(path: string, params: Record<string, string>): Promise<Track[]> {
  const res = await fetch(`${PROXY}${path}?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error(`SoundCloud ${res.status}`);
  const json = await res.json();
  const list: any[] = Array.isArray(json) ? json : json.collection ?? [];
  // 'preview' = только 30 секунд (лейбловые треки) — пропускаем
  return list.filter((t) => t.access === 'playable' && t.streamable !== false).map(map);
}

function map(t: any): Track {
  return {
    id: `soundcloud:${t.id}`,
    source: 'soundcloud',
    title: t.title,
    artist: t.user?.username ?? 'Unknown',
    artwork: t.artwork_url?.replace('-large', '-t500x500') ?? t.user?.avatar_url,
    duration: Math.round((t.duration ?? 0) / 1000),
    streamUrl: `${PROXY}/stream/${t.id}`,
    genre: t.genre || undefined,
    tags: (t.tag_list ?? '').match(/"[^"]+"|\S+/g)?.map((s: string) => s.replace(/"/g, '').toLowerCase()) ?? [],
    permalink: t.permalink_url,
  };
}

export const soundcloud: MusicSource = {
  id: 'soundcloud',
  label: 'SoundCloud',
  enabled: () => !!PROXY,
  search: (q, limit = 20) => get('/search', { q, limit: String(limit) }),
  trending: (limit = 20) => get('/search', { q: 'new', limit: String(limit) }),
  byTag: (tag, limit = 20) => get('/search', { tags: tag, limit: String(limit) }),
};
