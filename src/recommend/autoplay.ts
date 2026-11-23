import type { Track } from '../types';
import { artistData, isSong } from './discovery';
import { similarFor } from './deezer';
import { recommend } from './recommend';
import { getSettings } from '../storage/settings';
import { getHistory, isExcluded } from '../storage/store';

/**
 * Автоплей «как в SoundCloud»: станция по треку.
 *
 * Когда очередь заканчивается, музыка продолжается треками, похожими на последний сыгранный:
 *   ~50%  похожие исполнители по данным Deezer — их популярные песни
 *   ~25%  другие песни этого же исполнителя (самые популярные)
 *   ~25%  то, что этот исполнитель лайкает в SoundCloud
 * Порядок: похожий, похожий, свой, лайк, … Не больше 2 треков одного исполнителя
 * (для самого исполнителя — 3). Недавно игравшее, скрытое и не-песни пропускаются.
 *
 * Если у трека нет ID исполнителя или станция пустая — запасной вариант из библиотеки по вкусу.
 */
export async function stationFor(seed: Track | undefined, exclude: Set<string>, limit = 15): Promise<Track[]> {
  if (!seed?.artistId) return recommend(limit, exclude);

  const recent = new Set(getHistory().slice(0, 50).map((t) => t.id));
  const ok = (t: Track) => !!t.title && t.title !== 'Трек SoundCloud' && !exclude.has(t.id) && !recent.has(t.id)
    && t.id !== seed.id && !isExcluded(t) && isSong(t);
  const popular = (ts: Track[]) => [...ts].sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));

  const [me, sims] = await Promise.all([
    artistData(seed.artistId, seed.artist, true).catch(() => null),
    getSettings().deezer ? similarFor(seed.artist, 6).catch(() => []) : Promise.resolve([]),
  ]);
  const simLists = await Promise.all(sims.slice(0, 4).map((a) =>
    artistData(a.scId, a.name, false).then((e) => popular(e?.uploads ?? []).filter(ok).slice(0, 6)).catch(() => [] as Track[])));

  // похожие — по очереди от каждого исполнителя, чтобы не шли пачкой
  const similar: Track[] = [];
  for (let i = 0; simLists.some((l) => i < l.length); i++) for (const l of simLists) if (l[i]) similar.push(l[i]);
  // свои — из 12 самых популярных в случайном порядке, чтобы станция не повторялась
  const own = popular(me?.uploads ?? []).filter(ok).slice(0, 12).sort(() => Math.random() - 0.5);
  const liked = (me?.likes ?? []).filter((t) => ok(t) && t.artist !== seed.artist).sort(() => Math.random() - 0.5);

  const pools = [similar, similar, own, liked];
  const out: Track[] = [];
  const used = new Set<string>();
  const perArtist = new Map<string, number>();
  for (let step = 0; out.length < limit && pools.some((p) => p.length) && step < 400; step++) {
    const t = pools[step % pools.length].shift();
    if (!t || used.has(t.id)) continue;
    const n = perArtist.get(t.artist) ?? 0;
    if (n >= (t.artist === seed.artist ? 3 : 2)) continue;
    perArtist.set(t.artist, n + 1);
    used.add(t.id);
    out.push(t);
  }

  if (out.length < 5) out.push(...(await recommend(limit - out.length, new Set([...exclude, ...used]))));
  return out;
}
