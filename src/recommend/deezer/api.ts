/**
 * Клиент публичного API Deezer (ключ не нужен).
 * Браузер не пускает обычный fetch (Deezer не отдаёт Access-Control-Allow-Origin),
 * поэтому используем JSONP: api.deezer.com поддерживает ?output=jsonp&callback=…
 * Лимит Deezer — 50 запросов за 5 секунд; запросы кэшируются уровнем выше.
 */
import { normName } from './match';

export interface DzArtist { id: number; name: string; nb_fan: number; picture_medium?: string }

let seq = 0;
function jsonp<T>(path: string, params: Record<string, string | number> = {}, timeout = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cb = `__dz_${Date.now().toString(36)}_${seq++}`;
    const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), output: 'jsonp', callback: cb });
    const script = document.createElement('script');
    const w = window as unknown as Record<string, unknown>;
    const done = () => { delete w[cb]; script.remove(); clearTimeout(timer); };
    const timer = setTimeout(() => { done(); reject(new Error('Deezer не ответил')); }, timeout);
    w[cb] = (data: any) => { done(); data?.error ? reject(new Error(data.error.message ?? 'Deezer error')) : resolve(data as T); };
    script.onerror = () => { done(); reject(new Error('Deezer недоступен')); };
    script.src = `https://api.deezer.com${path}?${qs}`;
    document.head.appendChild(script);
  });
}

/**
 * Исполнитель по имени. Берём только точное совпадение имени с наибольшим числом фанатов:
 * первый результат поиска бывает «тёзкой» (на запрос Skrillex — аккаунт с 42 фанатами).
 */
export async function findArtist(name: string): Promise<DzArtist | null> {
  const r = await jsonp<{ data?: DzArtist[] }>('/search/artist', { q: name, limit: 8 });
  const target = normName(name);
  return (r.data ?? []).filter((a) => normName(a.name) === target).sort((a, b) => b.nb_fan - a.nb_fan)[0] ?? null;
}

/** Похожие исполнители по данным Deezer (их собственный алгоритм на основе прослушиваний). */
export async function relatedArtists(id: number, limit = 12): Promise<DzArtist[]> {
  const r = await jsonp<{ data?: DzArtist[] }>(`/artist/${id}/related`, { limit });
  return r.data ?? [];
}
