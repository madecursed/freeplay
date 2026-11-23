import type { MusicSource, Track } from '../types';

const APP = 'freeplay';
let hostPromise: Promise<string> | null = null;

// Audius — децентрализованная сеть, сначала узнаём адрес живого узла.
function host(): Promise<string> {
  hostPromise ??= fetch('https://api.audius.co')
    .then((r) => r.json())
    .then((j: { data: string[] }) => j.data[Math.floor(Math.random() * j.data.length)])
    .catch(() => 'https://discoveryprovider.audius.co');
  return hostPromise;
}

async function get(path: string, params: Record<string, string> = {}): Promise<Track[]> {
  const h = await host();
  const qs = new URLSearchParams({ ...params, app_name: APP });
  const res = await fetch(`${h}/v1${path}?${qs}`);
  if (!res.ok) throw new Error(`Audius ${res.status}`);
  const json = await res.json();
  return (json.data ?? []).filter((t: any) => t.is_streamable !== false).map((t: any) => map(t, h));
}

function map(t: any, h: string): Track {
  return {
    id: `audius:${t.id}`,
    source: 'audius',
    title: t.title,
    artist: t.user?.name ?? 'Unknown',
    artwork: t.artwork?.['480x480'] ?? t.artwork?.['150x150'],
    duration: t.duration ?? 0,
    streamUrl: `${h}/v1/tracks/${t.id}/stream?app_name=${APP}`,
    genre: t.genre || undefined,
    tags: [t.mood, ...(t.tags ? String(t.tags).split(',') : [])].filter(Boolean).map((s: string) => s.trim().toLowerCase()),
    permalink: t.permalink ? `https://audius.co${t.permalink}` : undefined,
  };
}

export const audius: MusicSource = {
  id: 'audius',
  label: 'Audius',
  enabled: () => true,
  search: (q, limit = 20) => get('/tracks/search', { query: q, limit: String(limit) }),
  trending: (limit = 20) => get('/tracks/trending', { time: 'week', limit: String(limit) }),
  byTag: (tag, limit = 20) => get('/tracks/search', { query: tag, limit: String(limit) }),
};
