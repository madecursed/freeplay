/**
 * Поиск исполнителя Deezer на SoundCloud без API.
 *
 * 1. Сначала — в вашей библиотеке (если у трека этого исполнителя уже есть ID SoundCloud).
 * 2. Иначе угадываем адрес профиля: soundcloud.com/<ник>. Варианты ника из имени:
 *    слитно, через дефис, через подчёркивание, +official, +music. Кириллица транслитерируется
 *    («Три дня дождя» → tri-dnya-dozhdya).
 * 3. Каждый вариант проверяем через oEmbed (официальный, работает из браузера) и сверяем имя профиля
 *    с именем исполнителя — так отсекаются чужие аккаунты (Flux Pavilion ≠ «BitRatOfficial»).
 *
 * Результаты (и неудачи) кэшируются: найденные — на 14 дней, ненайденные — на 3 дня.
 */
import { libraryTracks, load, save } from '../../storage/store';

const TR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
const translit = (s: string) => s.toLowerCase().split('').map((c) => TR[c] ?? c).join('');
const latin = (s: string) => translit(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/\$/g, '');

/** Имя для сравнения: латиница, без пробелов и знаков. «Ty Dolla $ign» → tydollaign. */
export const normName = (s: string) => latin(s).replace(/[^a-z0-9]+/g, '');

function slugCandidates(name: string): string[] {
  const b = latin(name);
  const joined = b.replace(/[^a-z0-9]+/g, '');
  return [...new Set([
    joined,
    b.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    b.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    joined + 'official',
    joined + 'music',
  ])].filter((s) => s.length > 1);
}

/** Имя профиля совпадает с исполнителем (точно или одно содержит другое). */
function sameArtist(artist: string, profileName: string): boolean {
  const a = normName(artist), p = normName(profileName);
  if (a.length < 2 || p.length < 2) return false;
  return a === p || p.includes(a) || (a.includes(p) && p.length >= 3);
}

export interface ScProfile { id: number; name: string }
type CacheEntry = { ts: number; id?: number; name?: string };
const KEY = 'nc.dz.match.v1';
const OK_TTL = 14 * 86_400_000, MISS_TTL = 3 * 86_400_000;
let cache: Record<string, CacheEntry> = load(KEY, {});
const persist = () => save(KEY, cache);

export async function findScProfile(artist: string): Promise<ScProfile | null> {
  const key = normName(artist);
  if (!key) return null;
  const c = cache[key];
  if (c && Date.now() - c.ts < (c.id ? OK_TTL : MISS_TTL)) return c.id ? { id: c.id, name: c.name! } : null;

  // 1. уже есть в библиотеке
  const known = libraryTracks().find((t) => t.artistId && normName(t.artist) === key);
  if (known?.artistId) { cache[key] = { ts: Date.now(), id: known.artistId, name: known.artist }; persist(); return { id: known.artistId, name: known.artist }; }

  // 2–3. угадываем ник и проверяем через oEmbed
  for (const slug of slugCandidates(artist)) {
    const o = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent('https://soundcloud.com/' + slug)}`)
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const id = Number((o?.html as string | undefined)?.match(/users%2F(\d+)/)?.[1]);
    if (id && sameArtist(artist, o.author_name ?? '')) {
      cache[key] = { ts: Date.now(), id, name: o.author_name };
      persist();
      return { id, name: o.author_name };
    }
  }
  cache[key] = { ts: Date.now() };
  persist();
  return null;
}
