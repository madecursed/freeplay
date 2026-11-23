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
}

const VERSION = 2;
const DEFAULTS: Settings = { v: VERSION, name: 'Слушатель', sources: ['jamendo', 'archive'], jamendoId: '', scProxy: '' };

function init(): Settings {
  const saved = load<Partial<Settings>>('nc.settings', {});
  // v1 по умолчанию выбирал SoundCloud API, которому нужна подписка — сбрасываем выбор источников
  if (saved.v !== VERSION) return { ...DEFAULTS, name: saved.name ?? DEFAULTS.name, scProxy: saved.scProxy ?? '' };
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
  if (has && settings.sources.length === 1) return; // хотя бы один источник
  updateSettings({ sources: has ? settings.sources.filter((s) => s !== id) : [...settings.sources, id] });
}

/** Сделать источник основным (первым в списке). */
export function makePrimary(id: SourceId) {
  updateSettings({ sources: [id, ...settings.sources.filter((s) => s !== id)] });
}
