import { player } from '../../player/player';
import { record, SIGNAL } from '../../recommend/profile';
import { isLiked, toggleLike } from '../../storage/store';
import { nav, useNav } from '../navigation';
import { fmt, usePlayer, useStore } from '../hooks';
import { Cover } from '../components/Cover';
import { Icon } from '../components/Icon';

/** Полноэкранный плеер. */
export function PlayerScreen() {
  const { playerOpen } = useNav();
  const s = usePlayer();
  const t = s.queue[s.index];
  const liked = useStore(() => (t ? isLiked(t.id) : false));
  if (!playerOpen || !t) return null;
  const next = s.queue[s.index + 1];
  const pct = (s.time / (s.duration || 1)) * 100;

  return (
    <div className="player-screen">
      {t.artwork && <div className="player-bg" style={{ backgroundImage: `url(${t.artwork})` }} />}
      <div className="player-glow" />
      <header className="player-head">
        <button className="icon-btn" onClick={() => nav.openPlayer(false)}><Icon name="down" size={26} /></button>
        <Icon name="sparkle" size={16} className="accent" />
        <button className="icon-btn" onClick={() => nav.openSheet(t)}><Icon name="more" /></button>
      </header>

      <Cover track={t} size="xl" className="player-cover" />

      <div className="player-title">
        <div className="track-meta">
          <h2>{t.title}</h2>
          <p>{t.artist}</p>
        </div>
        <button className={`icon-btn ${liked ? 'liked' : ''}`} onClick={() => record(t, toggleLike(t) ? SIGNAL.like : SIGNAL.unlike)}>
          <Icon name="heart" filled={liked} size={26} />
        </button>
      </div>

      <input className="seek" type="range" min={0} max={s.duration || 0} step={1} value={s.time}
        style={{ ['--p' as string]: `${pct}%` }} onChange={(e) => player.seek(+e.target.value)} />
      <div className="times"><span>{fmt(s.time)}</span><span>{fmt(s.duration)}</span></div>
      {s.error && <p className="err">{s.error}</p>}

      <div className="controls">
        <button className={`icon-btn ${s.shuffle ? 'is-on' : ''}`} onClick={player.toggleShuffle}><Icon name="shuffle" /></button>
        <button className="icon-btn" onClick={player.prev}><Icon name="prev" size={28} /></button>
        <button className="play-btn huge" onClick={player.toggle}>
          {s.loading ? <span className="spinner" /> : <Icon name={s.playing ? 'pause' : 'play'} size={30} />}
        </button>
        <button className="icon-btn" onClick={player.next}><Icon name="next" size={28} /></button>
        <button className={`icon-btn ${s.repeat !== 'off' ? 'is-on' : ''}`} onClick={player.cycleRepeat}>
          <Icon name="repeat" />{s.repeat === 'one' && <sup>1</sup>}
        </button>
      </div>

      {t.embed ? (
        <div className="sc-slot"><p className="hint">Играет через официальный плеер SoundCloud. Если трек не запустился — нажмите ▶ в плеере ниже.</p></div>
      ) : (
      <div className="player-foot">
        <button className={`chip ${s.autoRadio ? 'is-on' : ''}`} onClick={() => player.setAutoRadio(!s.autoRadio)}>Автомикс</button>
        <div className="up-next glass">
          <span className="bars on"><i /><i /><i /></span>
          Далее: {next ? `${next.title} — ${next.artist}` : s.autoRadio ? 'подберу похожее' : '—'}
        </div>
      </div>
      )}
    </div>
  );
}
