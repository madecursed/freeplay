import type { MusicSource, SourceId, Track } from '../types';
import { getSettings } from '../storage/settings';
import { audius } from './audius';
import { jamendo } from './jamendo';
import { archive } from './archive';
import { soundcloud } from './soundcloud';

export const ALL_SOURCES: MusicSource[] = [jamendo, archive, audius, soundcloud];
export const sourceById = (id: SourceId) => ALL_SOURCES.find((s) => s.id === id)!;

/** Источники, которые показываем в выборе: SoundCloud API — только если настроен прокси (подписка Pro). */
export const visibleSources = () => ALL_SOURCES.filter((s) => s.id !== 'soundcloud' || s.enabled());

/** Источники-каталоги, выбранные в настройках (основной — первый). В режиме «только SoundCloud» их нет. */
export function activeSources(): { list: MusicSource[]; fallback: boolean } {
  const chosen = getSettings().sources.map(sourceById).filter((s) => s && s.enabled());
  // пустой список — нормальный режим «только SoundCloud»: всё берётся из библиотеки
  return { list: chosen, fallback: false };
}

/** Опрашивает активные источники параллельно; упавший источник не ломает результат. */
export async function fromAll(fn: (s: MusicSource) => Promise<Track[]>): Promise<Track[]> {
  const results = await Promise.allSettled(activeSources().list.map(fn));
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
