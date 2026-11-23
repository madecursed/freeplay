/**
 * «Похожие исполнители» по данным Deezer, найденные на SoundCloud.
 * Семя (исполнитель, которого вы слушаете) → Deezer related → профили на SoundCloud.
 * Кэш на 3 дня на каждое семя: Deezer и oEmbed не дёргаются при каждом открытии приложения.
 */
import { load, save, isArtistBlocked } from '../../storage/store';
import { findArtist, relatedArtists } from './api';
import { findScProfile, normName } from './match';

export interface SimilarArtist { name: string; scId: number; seed: string; fans: number }

const KEY = 'nc.dz.similar.v1';
const TTL = 3 * 86_400_000;
let cache: Record<string, { ts: number; list: SimilarArtist[] }> = load(KEY, {});

export async function similarFor(seed: string, limit = 6): Promise<SimilarArtist[]> {
  const key = normName(seed);
  const c = cache[key];
  if (c && Date.now() - c.ts < TTL) return c.list.filter((a) => !isArtistBlocked(a.name));

  const artist = await findArtist(seed);
  const list: SimilarArtist[] = [];
  if (artist) {
    for (const r of await relatedArtists(artist.id, 14)) {
      if (list.length >= limit) break;
      if (isArtistBlocked(r.name)) continue;
      const p = await findScProfile(r.name).catch(() => null);
      if (p && !list.some((x) => x.scId === p.id)) list.push({ name: p.name, scId: p.id, seed, fans: r.nb_fan });
    }
  }
  cache[key] = { ts: Date.now(), list };
  // старые записи чистим, чтобы localStorage не рос
  for (const [k, v] of Object.entries(cache)) if (Date.now() - v.ts > 4 * TTL) delete cache[k];
  save(KEY, cache);
  return list;
}
