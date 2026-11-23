import type { MusicSource, Track } from '../types';

import { getSettings } from '../storage/settings';
const ENV_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID as string | undefined;
const clientId = () => getSettings().jamendoId || ENV_ID || '';

async function get(params: Record<string, string>): Promise<Track[]> {
  const qs = new URLSearchParams({ client_id: clientId(), format: 'json', include: 'musicinfo', audioformat: 'mp32', ...params });
  const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?${qs}`);
  if (!res.ok) throw new Error(`Jamendo ${res.status}`);
  const json = await res.json();
  return (json.results ?? []).filter((t: any) => t.audio).map(map);
}

function map(t: any): Track {
  const genres: string[] = t.musicinfo?.tags?.genres ?? [];
  const vartags: string[] = t.musicinfo?.tags?.vartags ?? [];
  return {
    id: `jamendo:${t.id}`,
    source: 'jamendo',
    title: t.name,
    artist: t.artist_name,
    artwork: t.image || t.album_image,
    duration: Number(t.duration) || 0,
    streamUrl: t.audio,
    genre: genres[0],
    tags: [...genres, ...vartags].map((s) => s.toLowerCase()),
    permalink: t.shareurl,
  };
}

export const jamendo: MusicSource = {
  id: 'jamendo',
  label: 'Jamendo',
  enabled: () => !!clientId(),
  search: (q, limit = 20) => get({ search: q, limit: String(limit) }),
  // свежие популярные треки за неделю
  trending: (limit = 20) => get({ order: 'popularity_week', limit: String(limit) }),
  byTag: (tag, limit = 20) => get({ fuzzytags: tag, order: 'popularity_month', limit: String(limit) }),
};
