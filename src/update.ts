import { useSyncExternalStore } from 'react';
import { player } from './player/player';

/**
 * Автообновление: сравниваем имя бандла в свежем index.html с текущим.
 * Есть новая версия и музыка не играет — тихо перезагружаемся.
 * Музыка играет — показываем кнопку «Обновить», чтобы не оборвать трек.
 */
let available = false;
const listeners = new Set<() => void>();
export const useUpdateAvailable = () => useSyncExternalStore(
  (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  () => available,
);

let lastCheck = 0;
export async function checkForUpdate() {
  if (Date.now() - lastCheck < 30_000) return;
  lastCheck = Date.now();
  try {
    const html = await fetch(`./index.html?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.text());
    const fresh = html.match(/assets\/index-[\w-]+\.js/)?.[0];
    const current = [...document.querySelectorAll<HTMLScriptElement>('script[src]')]
      .map((s) => s.src).find((s) => s.includes('/assets/index-'));
    if (!fresh || !current || current.endsWith(fresh)) return;
    navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {});
    if (!player.get().playing) location.reload();
    else { available = true; listeners.forEach((f) => f()); }
  } catch { /* офлайн */ }
}
