import { load, save } from './store';

export interface Settings {
  name: string;
  /** Профиль SoundCloud пользователя (soundcloud.com/ник) — для импорта лайков и треков. */
  scProfile: string;
  /** Обложки: фиолетовые в стиле Nocturne или оригинальные. */
  coverStyle: 'nocturne' | 'original';
  /** Рекомендации «Похожие на…» по данным Deezer. */
  deezer: boolean;
}

const DEFAULTS: Settings = { name: 'Слушатель', scProfile: '', coverStyle: 'nocturne', deezer: true };

/** Берём из сохранённого только известные поля — устаревшие (источники, ключ Jamendo, прокси) отбрасываются. */
function init(): Settings {
  const saved = load<Record<string, unknown>>('nc.settings', {});
  const out = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS) as (keyof Settings)[]) if (k in saved) (out as Record<string, unknown>)[k] = saved[k];
  return out;
}

let settings: Settings = init();
const listeners = new Set<() => void>();

export const getSettings = () => settings;
export const subscribeSettings = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  save('nc.settings', settings);
  listeners.forEach((f) => f());
}
