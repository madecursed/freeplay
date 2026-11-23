/** Нарисованная кодом ночная сцена: небо, луна, звёзды, лес. Используется в баннерах и как обложка-заглушка. */
function treeline(seed: number, w = 320, base = 170) {
  let d = `M0 ${base + 10} L0 ${base}`;
  for (let x = 0; x < w; x += 12) {
    const h = 26 + Math.abs(Math.sin(x * 0.13 + seed) * 34) + Math.abs(Math.cos(x * 0.05 + seed) * 18);
    d += ` L${x + 2} ${base} L${x + 6} ${base - h} L${x + 10} ${base}`;
  }
  return d + ` L${w} ${base + 10} Z`;
}

export function SceneArt({ hue = 270, seed = 1, moon = true, className }: { hue?: number; seed?: number; moon?: boolean; className?: string }) {
  const stars = Array.from({ length: 14 }, (_, i) => ({ x: (Math.sin(i * 12.9 + seed) * 0.5 + 0.5) * 320, y: (Math.cos(i * 7.3 + seed) * 0.5 + 0.5) * 90, r: i % 4 === 0 ? 1.2 : 0.6 }));
  const id = `sky${hue}${seed}`;
  return (
    <svg className={className} viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 55% 12%)`} />
          <stop offset="0.6" stopColor={`hsl(${hue} 60% 30%)`} />
          <stop offset="1" stopColor={`hsl(${hue + 15} 70% 42%)`} />
        </linearGradient>
        <radialGradient id={id + 'm'}>
          <stop offset="0.35" stopColor={`hsl(${hue + 20} 90% 88%)`} />
          <stop offset="0.5" stopColor={`hsl(${hue} 90% 70% / .45)`} />
          <stop offset="1" stopColor={`hsl(${hue} 90% 60% / 0)`} />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${id})`} />
      {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.7} />)}
      {moon && <circle cx={200 + (seed % 3) * 25} cy={62} r={44} fill={`url(#${id}m)`} />}
      <path d={treeline(seed)} fill={`hsl(${hue} 50% 6%)`} opacity={0.75} transform="translate(0 -8)" />
      <path d={treeline(seed + 2)} fill={`hsl(${hue} 60% 3%)`} />
    </svg>
  );
}
