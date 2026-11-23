import type { Track } from '../../types';
import { artFor } from '../art';

/**
 * Обложка. Нет картинки у трека — подставляем атмосферное фото (стабильно для трека).
 * В режиме «обложки в стиле Nocturne» картинки тонируются в фиолетовый (класс .duo на <html>).
 */
export function Cover({ track, src, size = 'md', className = '' }: { track?: Track; src?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; hue?: number; className?: string }) {
  const img = src ?? track?.artwork ?? artFor(track?.id ?? 'empty');
  return (
    <div className={`cover cover-${size} ${className}`}>
      <img src={img} alt="" loading="lazy" decoding="async"
        onError={(e) => { const el = e.currentTarget; const fb = artFor(track?.id ?? img); if (!el.src.endsWith(fb)) el.src = fb; }} />
    </div>
  );
}
