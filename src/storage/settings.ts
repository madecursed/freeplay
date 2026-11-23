import type { SourceId } from '../types';
import { load, save } from './store';

export interface Settings {
  name: string;
  /** Выбранные источники; первый — основной. */
  sources: SourceId[];
  /** Адрес прокси SoundCloud (перекрывает VITE_SOUNDCLOUD_PROXY). */
  scProxy: string;
}

const DEFAULTS: Settings = { name: 'Слушатель', sources: ['soundcloud'], scProxy: '' };
let settings: Settings = { ...DEFAULTS, ...load<Partial<Settings>>('nc.settings', {}) };
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
