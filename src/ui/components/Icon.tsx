/** Набор тонких линейных иконок в стиле макета. */
const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  library: 'M4 4h5a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-5a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h6z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  next: 'M5 5.5v13l9-6.5zM16 5h2.5v14H16z',
  prev: 'M19 5.5v13l-9-6.5zM5.5 5H8v14H5.5z',
  shuffle: 'M16 4h4v4M4 20 20 4M20 16v4h-4M14.5 14.5 20 20M4 4l5 5',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  heart: 'M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20z',
  plus: 'M12 5v14M5 12h14',
  back: 'M19 12H5M11 6l-6 6 6 6',
  chevron: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  close: 'M6 6l12 12M18 6 6 18',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  sparkle: 'M12 1 13.2 10.8 23 12 13.2 13.2 12 23 10.8 13.2 1 12 10.8 10.8z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  queue: 'M4 6h12M4 12h12M4 18h7M16 15l5 3-5 3z',
  next1: 'M4 6h12M4 12h8M16 10v10M12 16l4 4 4-4',
  ban: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  sliders: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  lyrics: 'M4 5h16M4 10h16M4 15h10M17 14v6M17 14l3-1',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01',
  cloud: 'M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z',
  sad: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 16.5a4 4 0 0 1 7 0M9 10h.01M15 10h.01',
  happy: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 14a4 4 0 0 0 8 0M9 10h.01M15 10h.01',
  anxious: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 16c1.3-1 2.7 1 4 0s2.7 1 4 0M9 10h.01M15 10h.01',
  calm: 'M12 19c-4 0-7.5-2-8.5-5.5 3.5 0 7 1.5 8.5 5.5zm0 0c4 0 7.5-2 8.5-5.5-3.5 0-7 1.5-8.5 5.5zm0 0c-2.2-3.5-2.2-8 0-12 2.2 4 2.2 8.5 0 12z',
  fire: 'M12 3c1 4 5.5 5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-3 2-4.5 2-6.5 1 1 2 2 2.2 3.2C11 7.5 11 5 12 3z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
};
const FILLED = new Set(['play', 'pause', 'next', 'prev', 'sparkle']);

export function Icon({ name, size = 22, filled, className }: { name: keyof typeof PATHS | string; size?: number; filled?: boolean; className?: string }) {
  const fill = filled ?? FILLED.has(name);
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden
      fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={name === 'more' ? 3 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}
