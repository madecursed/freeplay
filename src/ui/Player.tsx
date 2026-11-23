import { useState } from 'react';
import { player } from '../player/player';
import { dislike, isLiked, toggleLike } from '../storage/store';
import { record, SIGNAL } from '../recommend/profile';
import { Cover } from './TrackList';
import { fmt, useLiked, usePlayer } from './hooks';

export function PlayerBar() {
  const s = usePlayer();
  const [open, setOpen] = useState(false);
  useLiked();
  const t = s.queue[s.index];
  if (!t) return null;
  const playBtn = <button className="play" onClick={(e) => { e.stopPropagation(); player.toggle(); }}>{s.loading ? '…' : s.playing ? '❚❚' : '▶'}</button>;

  if (!open)
    return (
      <div className="bar" onClick={() => setOpen(true)}>
        <div className="progress" style={{ width: `${(s.time / (s.duration || 1)) * 100}%` }} />
        <Cover t={t} />
        <div className="meta"><div className="title">{t.title}</div><div className="sub">{t.artist}</div></div>
        {playBtn}
        <button className="icon" onClick={(e) => { e.stopPropagation(); player.next(); }}>⏭</button>
      </div>
    );

  return (
    <div className="full">
      <button className="close" onClick={() => setOpen(false)}>⌄</button>
      <Cover t={t} big />
      <h2>{t.title}</h2>
      <p className="sub">{t.artist}</p>
      {t.permalink && <a className="sub" href={t.permalink} target="_blank" rel="noreferrer">Открыть в {t.source}</a>}
      {s.error && <p className="err">{s.error}</p>}
      <input type="range" min={0} max={s.duration || 0} step={1} value={s.time} onChange={(e) => player.seek(+e.target.value)} />
      <div className="times"><span>{fmt(s.time)}</span><span>{fmt(s.duration)}</span></div>
      <div className="controls">
        <button className="icon" title="Не нравится" onClick={() => { dislike(t.id); record(t, SIGNAL.dislike); player.next(); }}>✕</button>
        <button className="icon" onClick={() => player.prev()}>⏮</button>
        {playBtn}
        <button className="icon" onClick={() => player.next()}>⏭</button>
        <button className={`icon ${isLiked(t.id) ? 'liked' : ''}`} onClick={() => record(t, toggleLike(t) ? SIGNAL.like : SIGNAL.unlike)}>♥</button>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={s.autoRadio} onChange={(e) => player.setAutoRadio(e.target.checked)} /> Автомикс (радио по вкусу)
      </label>
      <p className="muted">Дальше в очереди: {s.queue.slice(s.index + 1, s.index + 4).map((x) => x.title).join(' · ') || '—'}</p>
    </div>
  );
}
