import type { Track } from '../../types';
import { player } from '../../player/player';
import { nav } from '../navigation';
import { usePlayer } from '../hooks';
import { Cover } from './Cover';
import { Icon } from './Icon';

/** Список треков. playlistId передаётся, чтобы в шторке можно было удалить трек из плейлиста. */
export function TrackList({ tracks, playlistId, empty }: { tracks: Track[]; playlistId?: string; empty?: string }) {
  const { queue, index, playing } = usePlayer();
  const cur = queue[index]?.id;
  if (!tracks.length) return <p className="empty">{empty ?? 'Пусто'}</p>;
  return (
    <ul className="track-list">
      {tracks.map((t, i) => (
        <li key={t.id} className={`track-row ${t.id === cur ? 'is-current' : ''}`}
          onClick={() => (t.id === cur ? player.toggle() : player.playList(tracks, i))}>
          <Cover track={t} size="sm" />
          <div className="track-meta">
            <div className="track-title">{t.title}</div>
            <div className="track-sub">{t.artist}</div>
          </div>
          {t.id === cur && <span className={`bars ${playing ? 'on' : ''}`}><i /><i /><i /></span>}
          <button className="icon-btn" aria-label="Ещё" onClick={(e) => { e.stopPropagation(); nav.openSheet(t, playlistId); }}>
            <Icon name="more" size={20} />
          </button>
        </li>
      ))}
    </ul>
  );
}
