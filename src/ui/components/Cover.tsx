import type { Track } from '../../types';
import { SceneArt } from './SceneArt';

/**
 * Обложка с лёгкой фиолетовой подкраской.
 * Нарисованная сцена — только когда картинки нет и обложка крупная (SVG дорогой для длинных списков).
 */
export function Cover({ track, src, size = 'md', hue, className = '' }: { track?: Track; src?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; hue?: number; className?: string }) {
  const img = src ?? track?.artwork;
  const seed = track ? [...track.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 50 : 3;
  return (
    <div className={`cover cover-${size} ${className}`}>
      {!img && size !== 'sm' && <SceneArt hue={hue ?? 255 + (seed % 5) * 10} seed={seed} />}
      {img && <img src={img} alt="" loading="lazy" decoding="async" onError={(e) => (e.currentTarget.style.display = 'none')} />}
    </div>
  );
}
