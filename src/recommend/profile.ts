import type { Track } from '../types';
import { load, save } from '../storage/store';

/**
 * Профиль вкуса: вес каждого признака (артист, жанр, тег).
 * Веса «стареют» с периодом полураспада HALF_LIFE — вкус со временем меняется.
 */
const HALF_LIFE_DAYS = 30;
type Entry = { w: number; t: number };
let profile: Record<string, Entry> = load('fp.profile', {});

export const SIGNAL = {
  complete: 1,     // дослушал
  like: 3,
  unlike: -3,
  skipEarly: -1,   // пропустил в первые 30 сек
  dislike: -4,
} as const;

export function features(t: Track): string[] {
  const f = [`artist:${t.artist.toLowerCase()}`];
  if (t.genre) f.push(`genre:${t.genre.toLowerCase()}`);
  for (const tag of t.tags.slice(0, 6)) f.push(`tag:${tag}`);
  return f;
}

function decayed(e: Entry, now = Date.now()) {
  const days = (now - e.t) / 86_400_000;
  return e.w * Math.pow(0.5, days / HALF_LIFE_DAYS);
}

export function record(t: Track, signal: number) {
  const now = Date.now();
  for (const f of features(t)) {
    const prev = profile[f];
    profile[f] = { w: (prev ? decayed(prev, now) : 0) + signal, t: now };
  }
  save('fp.profile', profile);
}

export const weight = (feature: string) => (profile[feature] ? decayed(profile[feature]) : 0);

/** Топ признаков заданного типа — из них строим запросы к каталогам. */
export function top(prefix: 'genre' | 'tag' | 'artist', n: number): string[] {
  return Object.keys(profile)
    .filter((k) => k.startsWith(prefix + ':'))
    .map((k) => [k.slice(prefix.length + 1), weight(k)] as const)
    .filter(([, w]) => w > 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export const isEmpty = () => Object.keys(profile).length === 0;

/** Полный сброс вкуса (из настроек). */
export function resetProfile() { profile = {}; save('fp.profile', profile); }
