import type { MusicSource, Track } from '../types';
import { audius } from './audius';
import { jamendo } from './jamendo';
import { soundcloud } from './soundcloud';

export const ALL_SOURCES: MusicSource[] = [audius, jamendo, soundcloud];
export const activeSources = () => ALL_SOURCES.filter((s) => s.enabled());

/** Опрашивает все источники параллельно; упавший источник не ломает результат. */
export async function fromAll(fn: (s: MusicSource) => Promise<Track[]>): Promise<Track[]> {
  const results = await Promise.allSettled(activeSources().map(fn));
  const lists = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  return interleave(lists);
}

// Чередуем источники, чтобы выдача не состояла из одного каталога.
function interleave(lists: Track[][]): Track[] {
  const out: Track[] = [];
  const seen = new Set<string>();
  for (let i = 0; lists.some((l) => i < l.length); i++)
    for (const l of lists) if (l[i] && !seen.has(l[i].id)) { seen.add(l[i].id); out.push(l[i]); }
  return out;
}
