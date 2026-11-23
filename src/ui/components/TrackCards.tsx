import type { Track } from '../../types';
import { player } from '../../player/player';
import { nav } from '../navigation';
import { usePlayer } from '../hooks';
import { Cover } from './Cover';

/** Горизонтальная лента треков-карточек. Нажатие запускает ленту с этого трека; долгое — меню. */
export function TrackCards({ tracks }: { tracks: Track[] }) {
  const { queue, index } = usePlayer();
  const cur = queue[index]?.id;
  return (
    <div className="card-row">
      {tracks.map((t, i) => (
        <button key={t.id} className={`track-card ${t.id === cur ? 'is-current' : ''}`}
          onClick={() => (t.id === cur ? player.toggle() : player.playList(tracks, i))}
          onContextMenu={(e) => { e.preventDefault(); nav.openSheet(t); }}>
          <Cover track={t} size="md" className="card-cover" />
          <span>{t.title}</span>
          <small>{t.artist}</small>
        </button>
      ))}
    </div>
  );
}
