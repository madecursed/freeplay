import { useRef } from 'react';
import { player } from '../../player/player';
import { record, SIGNAL } from '../../recommend/profile';
import { isLiked, toggleLike } from '../../storage/store';
import { nav, useNav } from '../navigation';
import { fmt, usePlayer, useProgress, useStore } from '../hooks';
import { Cover } from '../components/Cover';
import { Icon } from '../components/Icon';
import { TrackList } from '../components/TrackList';

/** Полноэкранный плеер (по референсу): обложка-карточка, тонкий прогресс, светящаяся кнопка, «Далее». */
export function PlayerScreen() {
  const { playerOpen, playerClosing, queueOpen } = useNav();
  const swipe = useSwipeDown(() => close());
  const s = usePlayer();
  const t = s.queue[s.index];
  const liked = useStore(() => (t ? isLiked(t.id) : false));
  if (!playerOpen || !t) return null;
  const next = s.queue[s.index + 1];

  const close = () => { document.getElementById('sc-host')?.classList.remove('is-visible'); nav.openPlayer(false); };

  return (
    <div className={`player-screen ${playerClosing ? 'is-closing' : ''}`} ref={swipe.ref} {...swipe.handlers}>
      {t.artwork && <div className="player-bg" style={{ backgroundImage: `url(${t.artwork})` }} />}
      <div className="player-aura" />

      <header className="player-head">
        <button className="icon-btn" aria-label="Свернуть" onClick={close}><Icon name="down" size={26} /></button>
        <div className="player-head-mark">
          <Icon name="sparkle" size={14} />
          <span>{queueOpen ? 'Очередь' : 'Сейчас играет'}</span>
        </div>
        <button className="icon-btn" aria-label="Ещё" onClick={() => nav.openSheet(t, undefined, true)}><Icon name="more" /></button>
      </header>

      {queueOpen ? (
        <div className="player-queue">
          <TrackList tracks={s.queue.slice(s.index)} empty="Очередь пуста" />
        </div>
      ) : (
        <div className="player-art">
          <Cover track={t} size="xl" className="player-cover" />
        </div>
      )}

      <div className="player-bottom">
        <div className="player-title">
          <div className="track-meta">
            <h2>{t.title}</h2>
            <p>{t.artist}</p>
          </div>
          <button className={`icon-btn heart ${liked ? 'liked' : ''}`} aria-label="Нравится"
            onClick={() => record(t, toggleLike(t) ? SIGNAL.like : SIGNAL.unlike)}>
            <Icon name="heart" filled={liked} size={26} />
          </button>
        </div>

        <Seek duration={s.duration} />
        {s.error && <p className="err">{s.error}</p>}

        <div className="controls">
          <button className={`icon-btn side ${s.shuffle ? 'is-on' : ''}`} aria-label="Перемешать" onClick={player.toggleShuffle}><Icon name="shuffle" /></button>
          <button className="icon-btn main" aria-label="Назад" onClick={player.prev}><Icon name="prev" size={30} /></button>
          <button className="orb" aria-label={s.playing ? 'Пауза' : 'Играть'} onClick={player.toggle}>
            <Icon name={s.playing ? 'pause' : 'play'} size={30} />
          </button>
          <button className="icon-btn main" aria-label="Вперёд" onClick={player.next}><Icon name="next" size={30} /></button>
          <button className={`icon-btn side ${s.repeat !== 'off' ? 'is-on' : ''}`} aria-label="Повтор" onClick={player.cycleRepeat}>
            <Icon name="repeat" />{s.repeat === 'one' && <sup>1</sup>}
          </button>
        </div>

        <button className="up-next" onClick={() => nav.toggleQueue()}>
          <span className={`wave ${s.playing ? 'on' : ''}`}><i /><i /><i /><i /><i /></span>
          <span className="up-next-text">
            {queueOpen ? 'Вернуться к обложке' : <>Далее: {next ? next.title : s.autoRadio ? 'подберу похожее' : '—'}</>}
          </span>
        </button>
      </div>
    </div>
  );
}

function Seek({ duration }: { duration: number }) {
  const time = useProgress();
  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;
  return (
    <div className="seek-wrap">
      <input className="seek" type="range" min={0} max={duration || 0} step={1} value={Math.min(time, duration || 0)}
        style={{ ['--p' as string]: `${pct}%` }} onChange={(e) => player.seek(+e.target.value)} />
      <div className="times"><span>{fmt(time)}</span><span>{fmt(duration)}</span></div>
    </div>
  );
}

/**
 * Свайп вниз закрывает плеер: экран едет за пальцем (без перерисовки React),
 * отпустили ниже порога — закрываем, иначе пружиной возвращаем.
 */
function useSwipeDown(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ y: number; x: number; active: boolean } | null>(null);
  const dy = useRef(0);
  const el = () => ref.current;
  return {
    ref,
    handlers: {
      onTouchStart: (e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        // не перехватываем прокрутку очереди и перемотку
        if (target.closest('.player-queue, .seek')) { start.current = null; return; }
        start.current = { y: e.touches[0].clientY, x: e.touches[0].clientX, active: false };
        dy.current = 0;
      },
      onTouchMove: (e: React.TouchEvent) => {
        const s = start.current, node = el();
        if (!s || !node) return;
        const d = e.touches[0].clientY - s.y;
        if (!s.active && (d < 8 || Math.abs(e.touches[0].clientX - s.x) > Math.abs(d))) return;
        s.active = true;
        dy.current = Math.max(0, d);
        node.style.transition = 'none';
        node.style.transform = `translateY(${dy.current}px)`;
        node.style.borderRadius = `${Math.min(28, dy.current / 6)}px`;
      },
      onTouchEnd: () => {
        const node = el();
        if (!start.current?.active || !node) { start.current = null; return; }
        start.current = null;
        node.style.transition = 'transform .32s cubic-bezier(.22,1,.36,1), border-radius .32s';
        if (dy.current > 110) {
          node.style.transform = 'translateY(100%)';
          setTimeout(() => { onClose(); node.style.transform = ''; node.style.borderRadius = ''; node.style.transition = ''; }, 260);
        } else {
          node.style.transform = '';
          node.style.borderRadius = '';
        }
      },
    },
  };
}
