import { player } from '../../player/player';
import { nav, useNav } from '../navigation';
import { usePlayer, useProgress } from '../hooks';
import { Cover } from './Cover';
import { Icon } from './Icon';

/** Мини-плеер над нижней панелью. */
export function MiniPlayer() {
  const s = usePlayer();
  const { playerOpen } = useNav();
  const t = s.queue[s.index];
  if (!t || playerOpen) return null;
  return (
    <div className="mini-player" onClick={() => nav.openPlayer()}>
      <Cover track={t} size="sm" />
      <div className="track-meta">
        <div className="track-title">{t.title}</div>
        <div className="track-sub">{t.artist}</div>
      </div>
      <button className="icon-btn" aria-label="Пауза/играть" onClick={(e) => { e.stopPropagation(); player.toggle(); }}>
        {s.loading ? <span className="spinner small" /> : <Icon name={s.playing ? 'pause' : 'play'} size={22} />}
      </button>
      <MiniProgress duration={s.duration} />
    </div>
  );
}

// отдельный компонент — перерисовывается только он, а не весь мини-плеер
function MiniProgress({ duration }: { duration: number }) {
  const time = useProgress();
  return <div className="mini-progress" style={{ transform: `scaleX(${duration ? Math.min(1, time / duration) : 0})` }} />;
}
