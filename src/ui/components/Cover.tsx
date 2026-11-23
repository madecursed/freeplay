import type { Track } from '../../types';
import { SceneArt } from './SceneArt';

/** Обложка, подкрашенная в фиолетовый, чтобы любые картинки выглядели в стиле приложения. */
export function Cover({ track, src, size = 'md', hue, className = '' }: { track?: Track; src?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; hue?: number; className?: string }) {
  const img = src ?? track?.artwork;
  const seed = track ? [...track.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 50 : 3;
  return (
    <div className={`cover cover-${size} ${className}`}>
      <SceneArt hue={hue ?? 255 + (seed % 5) * 10} seed={seed} moon={size !== 'sm'} />
      {img && <img src={img} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />}
    </div>
  );
}
