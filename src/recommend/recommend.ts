import type { Track } from '../types';
import { fromAll } from '../sources';
import { features, isEmpty, top, weight } from './profile';
import { getHistory, isDisliked } from '../storage/store';

/**
 * Рекомендации в 2 шага:
 *  1. Кандидаты — треки по любимым жанрам/тегам (или по заданным seedTags — настроение, микс)
 *     из выбранных источников + тренды для разнообразия.
 *  2. Ранжирование — сходство с профилем + немного новизны − недавно слушанное.
 */
export async function recommend(limit = 30, exclude: Set<string> = new Set(), seedTags?: string[]): Promise<Track[]> {
  const seeds = seedTags ?? [...new Set([...top('genre', 3), ...top('tag', 3)])].slice(0, 5);
  const queries: Promise<Track[]>[] = seeds.map((seed) => fromAll((s) => s.byTag(seed, 20)));
  if (!seedTags || seeds.length === 0) queries.push(fromAll((s) => s.trending(20)));

  const pools = await Promise.allSettled(queries);
  const candidates = new Map<string, Track>();
  for (const p of pools) if (p.status === 'fulfilled') for (const t of p.value) candidates.set(t.id, t);

  const recent = new Set(getHistory().slice(0, 50).map((t) => t.id));
  const scored = [...candidates.values()]
    .filter((t) => !exclude.has(t.id) && !isDisliked(t.id) && t.duration > 60)
    .map((t) => ({ t, s: score(t, recent.has(t.id)) }))
    .sort((a, b) => b.s - a.s);

  return diversify(scored.map((x) => x.t), limit);
}

export function score(t: Track, recentlyPlayed: boolean): number {
  if (isEmpty()) return Math.random();
  const f = features(t);
  const taste = f.reduce((sum, k) => sum + weight(k), 0) / Math.sqrt(f.length);
  const novelty = Math.random() * 0.8;            // исследование нового
  const penalty = recentlyPlayed ? 3 : 0;
  return taste + novelty - penalty;
}

// Не больше 2 треков одного артиста в выдаче.
function diversify(tracks: Track[], limit: number): Track[] {
  const perArtist = new Map<string, number>();
  const out: Track[] = [];
  for (const t of tracks) {
    const n = perArtist.get(t.artist) ?? 0;
    if (n >= 2) continue;
    perArtist.set(t.artist, n + 1);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}
