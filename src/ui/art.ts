/**
 * Фото интерфейса (Wikimedia Commons, свободные лицензии — docs/ART_CREDITS.md),
 * обработаны в фиолетовый дуотон скриптом scripts/duotone.ps1.
 */
const base = import.meta.env.BASE_URL;
const a = (name: string) => `${base}art/${name}.jpg`;

export const ART = {
  splash: a('splash-angel'),
  profile: a('profile-moon'),
  hero: { wave: a('hero-castle'), mood: a('hero-wires'), import: a('hero-mist') },
} as const;

const CARDS = ['angel', 'castle', 'wires', 'moon', 'branches', 'statue', 'mist', 'tower', 'orchid', 'tree', 'grave', 'yucca'].map((n) => a(`card-${n}`));

/** Стабильное фото для ключа (одна и та же подборка — всегда одно фото). */
export function artFor(key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CARDS[h % CARDS.length];
}

/** Фото для тематических миксов — подобраны по смыслу. */
const BY_MIX: Record<string, string> = {
  'mood-lost-sleep': a('card-moon'), 'mood-autumn': a('card-branches'), 'mood-psy': a('card-orchid'),
  'mood-night-drive': a('card-wires'), 'mood-dream': a('card-mist'), discover: a('card-angel'),
  fresh: a('card-tower'), forgotten: a('card-grave'),
};
export const mixArt = (id: string) => BY_MIX[id] ?? artFor(id);

/** Предзагрузка крупных фото, чтобы заставка и баннеры появлялись без мигания. */
export function preloadArt() {
  for (const src of [ART.splash, ...Object.values(ART.hero)]) { const i = new Image(); i.src = src; }
}
