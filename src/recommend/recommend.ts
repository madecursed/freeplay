import type { Track } from '../types';
import { fromAll } from '../sources';
import { features, isEmpty, top, weight } from './profile';
import { getHistory, isDisliked, libraryTracks } from '../storage/store';
import { discoveryPool } from './discovery';

/**
 * Рекомендации в 2 шага:
 *  1. Кандидаты — ваша библиотека SoundCloud, найденное discovery (+ каталоги, если включены).
 *     С seedTags (настроение, микс) — только треки с подходящими жанрами/тегами.
 *  2. Ранжирование — сходство с профилем вкуса + немного новизны − недавно слушанное.
 */
export async function recommend(limit = 30, exclude: Set<string> = new Set(), seedTags?: string[]): Promise<Track[]> {
  const candidates = new Map<string, Track>();

  // библиотека + найденное в SoundCloud (лайки и новинки ваших исполнителей)
  for (const t of [...libraryTracks(), ...discoveryPool()]) if (!seedTags || matches(t, seedTags)) candidates.set(t.id, t);

  // каталоги (если включены в настройках)
  const seeds = seedTags ?? [...new Set([...top('genre', 3), ...top('tag', 3)])].slice(0, 5);
  const queries: Promise<Track[]>[] = seeds.map((seed) => fromAll((s) => s.byTag(seed, 20)));
  if (!seedTags) queries.push(fromAll((s) => s.trending(20)));
  const pools = await Promise.allSettled(queries);
  for (const p of pools) if (p.status === 'fulfilled') for (const t of p.value) candidates.set(t.id, t);

  const recent = new Set(getHistory().slice(0, 30).map((t) => t.id));
  const scored = [...candidates.values()]
    .filter((t) => !exclude.has(t.id) && !isDisliked(t.id) && (t.duration === 0 || t.duration > 60))
    .map((t) => ({ t, s: score(t, recent.has(t.id)) }))
    .sort((a, b) => b.s - a.s);

  return diversify(scored.map((x) => x.t), limit);
}

export function matches(t: Track, tags: string[]): boolean {
  const own = [t.genre ?? '', ...t.tags].join(' ').toLowerCase();
  return tags.some((tag) => own.includes(tag.toLowerCase()));
}

export function score(t: Track, recentlyPlayed: boolean): number {
  const novelty = Math.random() * 1.2;            // исследование + перемешивание
  const penalty = recentlyPlayed ? 3 : 0;
  if (isEmpty()) return novelty - penalty;
  const f = features(t);
  const taste = f.reduce((sum, k) => sum + weight(k), 0) / Math.sqrt(f.length);
  return taste + novelty - penalty;
}

// Не больше 2 треков одного артиста подряд.
function diversify(tracks: Track[], limit: number): Track[] {
  const out: Track[] = [];
  const rest: Track[] = [];
  for (const t of tracks) {
    const last2 = out.slice(-2);
    if (last2.length === 2 && last2.every((x) => x.artist === t.artist)) rest.push(t);
    else out.push(t);
    if (out.length >= limit) return out;
  }
  return [...out, ...rest].slice(0, limit);
}
