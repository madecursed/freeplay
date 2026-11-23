/**
 * Перенос библиотеки между версиями (Safari ↔ приложение): у них разные хранилища.
 * Экспорт — все данные пользователя одним JSON (избранное, история, плейлисты, профиль вкуса,
 * настройки, скрытые исполнители). Кэши (исполнители, Deezer) не переносятся — соберутся заново.
 */
const PREFIXES = ['fp.', 'nc.'];
const SKIP = ['nc.discovery', 'nc.dz.', 'nc.splash'];

export function exportLibrary(): string {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (!PREFIXES.some((p) => k.startsWith(p)) || SKIP.some((s) => k.startsWith(s))) continue;
    try { data[k] = JSON.parse(localStorage.getItem(k)!); } catch { /* повреждённое — пропускаем */ }
  }
  return JSON.stringify({ app: 'nocturne', v: 1, exportedAt: new Date().toISOString(), data });
}

/** Импорт заменяет данные на устройстве. После него приложение перезагружается. */
export function importLibrary(text: string): { keys: number; tracks: number } {
  const parsed = JSON.parse(text.trim());
  if (parsed?.app !== 'nocturne' || typeof parsed.data !== 'object') throw new Error('Это не файл библиотеки Nocturne');
  let tracks = 0;
  for (const [k, v] of Object.entries(parsed.data as Record<string, unknown>)) {
    if (!PREFIXES.some((p) => k.startsWith(p))) continue;
    localStorage.setItem(k, JSON.stringify(v));
    if (k === 'nc.playlists' && Array.isArray(v)) tracks += v.reduce((s: number, p: { tracks?: unknown[] }) => s + (p.tracks?.length ?? 0), 0);
    if (k === 'fp.liked' && Array.isArray(v)) tracks += v.length;
  }
  return { keys: Object.keys(parsed.data).length, tracks };
}
