import { useEffect, useState, useSyncExternalStore } from 'react';
import { player } from '../player/player';
import { subscribeStore } from '../storage/store';
import { getSettings, subscribeSettings } from '../storage/settings';

export const usePlayer = () => useSyncExternalStore(player.subscribe, player.get);
export const useStore = <T,>(get: () => T) => useSyncExternalStore(subscribeStore, get);
export const useSettings = () => useSyncExternalStore(subscribeSettings, getSettings);

/** Загрузка данных с состояниями «загрузка / ошибка» и перезагрузкой. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: boolean; loading: boolean }>({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    fn().then((data) => alive && setState({ data, loading: false })).catch(() => alive && setState({ error: true, loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { ...state, reload: () => setN((x) => x + 1) };
}

export const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const fmtTotal = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h ? `${h} ч ${m} мин` : `${m} мин`;
};

export function plural(n: number, [one, few, many]: [string, string, string]) {
  const a = n % 10, b = n % 100;
  const w = a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
  return `${n} ${w}`;
}
export const tracksWord = (n: number) => plural(n, ['трек', 'трека', 'треков']);

export function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 17 ? 'Добрый день' : h < 23 ? 'Добрый вечер' : 'Доброй ночи';
}
