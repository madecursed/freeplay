import type { Track } from '../types';
import { player } from '../player/player';
import { isLiked, toggleLike } from '../storage/store';
import { record, SIGNAL } from '../recommend/profile';
import { fmt, useLiked, usePlayer } from './hooks';

export function TrackList({ tracks, empty }: { tracks: Track[]; empty?: string }) {
  const { queue, index } = usePlayer();
  useLiked();
  const currentId = queue[index]?.id;
  if (!tracks.length) return <p className="muted">{empty ?? 'Пусто'}</p>;
  return (
    <ul className="tracks">
      {tracks.map((t, i) => (
        <li key={t.id} className={t.id === currentId ? 'active' : ''} onClick={() => player.playList(tracks, i)}>
          <Cover t={t} />
          <div className="meta">
            <div className="title">{t.title}</div>
            <div className="sub">{t.artist} · <span className={`src ${t.source}`}>{t.source}</span> · {fmt(t.duration)}</div>
          </div>
          <button
            className={`icon ${isLiked(t.id) ? 'liked' : ''}`}
            aria-label="Лайк"
            onClick={(e) => { e.stopPropagation(); record(t, toggleLike(t) ? SIGNAL.like : SIGNAL.unlike); }}
          >♥</button>
          <button className="icon" aria-label="Играть следующим" onClick={(e) => { e.stopPropagation(); player.playNext(t); }}>⤴</button>
        </li>
      ))}
    </ul>
  );
}

export const Cover = ({ t, big }: { t?: Track; big?: boolean }) =>
  t?.artwork ? <img className={big ? 'cover big' : 'cover'} src={t.artwork} alt="" loading="lazy" /> : <div className={big ? 'cover big ph' : 'cover ph'}>♪</div>;
