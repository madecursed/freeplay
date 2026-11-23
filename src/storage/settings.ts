import type { SourceId } from '../types';
import { load, save } from './store';

export interface Settings {
  v: number;
  name: string;
  /** Выбранные источники; первый — основной. */
  sources: SourceId[];
  /** Jamendo Client ID (перекрывает VITE_JAMENDO_CLIENT_ID). */
  jamendoId: string;
  /** Адрес прокси SoundCloud API — только для подписки Pro (перекрывает VITE_SOUNDCLOUD_PROXY). */
  scProxy: string;
  /** Профиль SoundCloud пользователя (soundcloud.com/ник) — для импорта лайков и треков. */
  scProfile: string;
}

// v3: приложение работает только с SoundCloud — каталожные источники выключены (код оставлен)
const VERSION = 3;
const DEFAULTS: Settings = { v: VERSION, name: 'Слушатель', sources: [], jamendoId: '', scProxy: '', scProfile: '' };

function init(): Settings {
  const saved = load<Partial<Settings>>('nc.settings', {});
    // при смене версии сбрасываем только выбор источников
  if (saved.v !== VERSION) return { ...DEFAULTS, ...saved, v: VERSION, sources: DEFAULTS.sources };
  return { ...DEFAULTS, ...saved };
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

export function toggleSource(id: SourceId) {
  const has = settings.sources.includes(id);
  updateSettings({ sources: has ? settings.sources.filter((s) => s !== id) : [...settings.sources, id] });
}

/** Сделать источник основным (первым в списке). */
export function makePrimary(id: SourceId) {
  updateSettings({ sources: [id, ...settings.sources.filter((s) => s !== id)] });
}
