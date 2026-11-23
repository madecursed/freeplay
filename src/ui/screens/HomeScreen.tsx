import { useRef, useState } from 'react';
import { player } from '../../player/player';
import { recommend } from '../../recommend/recommend';
import { MIXES } from '../../recommend/moods';
import { fromAll } from '../../sources';
import { getHistory } from '../../storage/store';
import { nav } from '../navigation';
import { greeting, useSettings, useStore } from '../hooks';
import { Icon } from '../components/Icon';
import { SceneArt } from '../components/SceneArt';
import { TrackList } from '../components/TrackList';
import { SourceNotice } from '../components/SourceNotice';

const HERO = [
  { title: ['Твоя', 'ночная волна'], hue: 270, seed: 4, action: 'wave' },
  { title: ['Подобрать', 'по настроению'], hue: 290, seed: 9, action: 'mood' },
  { title: ['В тренде', 'на этой неделе'], hue: 250, seed: 17, action: 'trend' },
] as const;

export function HomeScreen() {
  const { name } = useSettings();
  const history = useStore(getHistory);
  const [slide, setSlide] = useState(0);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const runHero = async (action: string) => {
    if (action === 'mood') return nav.push({ kind: 'mood' });
    if (action === 'trend') return nav.push({ kind: 'mix', title: 'В тренде', subtitle: 'на этой неделе', hue: 250, load: () => fromAll((s) => s.trending(30)) });
    setBusy(true);
    try { const t = await recommend(30); if (t.length) player.playList(t); } finally { setBusy(false); }
  };

  return (
    <div className="screen">
      <header className="home-head">
        <h1 className="logo">NOCTURNE</h1>
        <div className="row">
          <button className="icon-btn glow" aria-label="Настроение" onClick={() => nav.push({ kind: 'mood' })}><Icon name="sparkle" size={18} /></button>
          <button className="avatar" onClick={() => nav.setTab('profile')}>{name.slice(0, 1).toUpperCase()}</button>
        </div>
      </header>
      <p className="greeting">{greeting()}.<br />Что сегодня слушаем?</p>

      <SourceNotice />

      <div className="hero-scroller" ref={scroller}
        onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {HERO.map((h) => (
          <div key={h.action} className="hero glass" onClick={() => runHero(h.action)}>
            <SceneArt hue={h.hue} seed={h.seed} className="hero-art" />
            <div className="hero-text">{h.title[0]}<br />{h.title[1]}</div>
            <button className="play-btn" aria-label="Играть">
              {busy && h.action === 'wave' ? <span className="spinner" /> : <Icon name="play" size={22} />}
            </button>
          </div>
        ))}
      </div>
      <div className="dots">{HERO.map((_, i) => <i key={i} className={i === slide ? 'on' : ''} />)}</div>

      <div className="section-head"><h2>Рекомендации</h2><button onClick={() => nav.push({ kind: 'mood' })}>Все →</button></div>
      <div className="card-row">
        {MIXES.map((m, i) => (
          <button key={m.id} className="mix-card" onClick={() => nav.push({ kind: 'mix', title: m.title, subtitle: m.subtitle, hue: m.hue, tags: m.tags })}>
            <div className="mix-art"><SceneArt hue={m.hue} seed={i * 7 + 2} moon={i % 2 === 0} /></div>
            <span>{m.title}</span>
            <small>{m.subtitle}</small>
          </button>
        ))}
      </div>

      <div className="section-head">
        <h2>Недавно прослушанное</h2>
        {history.length > 4 && <button onClick={() => nav.push({ kind: 'mix', title: 'Недавно', subtitle: 'прослушанное', load: async () => getHistory().slice(0, 50) })}>Все →</button>}
      </div>
      <TrackList tracks={history.slice(0, 4)} empty="Здесь появятся треки, которые вы слушали" />
    </div>
  );
}
