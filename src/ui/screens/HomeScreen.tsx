import { useState } from 'react';
import { player } from '../../player/player';
import { recommend } from '../../recommend/recommend';
import { getHistory, getPlaylists, libraryTracks } from '../../storage/store';
import { nav } from '../navigation';
import { greeting, tracksWord, useSettings, useStore } from '../hooks';
import { Cover } from '../components/Cover';
import { Icon } from '../components/Icon';
import { SceneArt } from '../components/SceneArt';
import { TrackList } from '../components/TrackList';

const HERO = [
  { title: ['Твоя', 'ночная волна'], hue: 270, seed: 4, action: 'wave' },
  { title: ['Подобрать', 'по настроению'], hue: 290, seed: 9, action: 'mood' },
  { title: ['Перенести', 'из SoundCloud'], hue: 250, seed: 17, action: 'import' },
] as const;

export function HomeScreen() {
  const { name } = useSettings();
  const history = useStore(getHistory);
  const playlists = useStore(getPlaylists);
  const [slide, setSlide] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');
  const empty = playlists.length === 0;

  const runHero = async (action: string) => {
    if (action === 'mood') return nav.push({ kind: 'mood' });
    if (action === 'import' || !libraryTracks().length) return nav.setTab('library');
    setBusy(true);
    try {
      const t = await recommend(40);
      if (t.length) player.playList(t); else setHint('Импортируйте плейлисты — волна строится из вашей библиотеки');
    } finally { setBusy(false); }
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

      <div className="hero-scroller" onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {HERO.map((h) => (
          <div key={h.action} className="hero" onClick={() => runHero(h.action)}>
            <SceneArt hue={h.hue} seed={h.seed} className="hero-art" />
            <div className="hero-text">{h.title[0]}<br />{h.title[1]}</div>
            <button className="play-btn" aria-label="Открыть">
              {busy && h.action === 'wave' ? <span className="spinner" /> : <Icon name={h.action === 'import' ? 'plus' : 'play'} size={22} />}
            </button>
          </div>
        ))}
      </div>
      <div className="dots">{HERO.map((_, i) => <i key={i} className={i === slide ? 'on' : ''} />)}</div>
      {hint && <p className="hint center">{hint}</p>}

      <div className="section-head"><h2>Твои плейлисты</h2>{!empty && <button onClick={() => nav.setTab('library')}>Все →</button>}</div>
      {empty ? (
        <button className="cta" onClick={() => nav.setTab('library')}>
          <Icon name="cloud" size={22} />
          <span><b>Перенесите музыку из SoundCloud</b><br />Вставьте ссылки на плейлисты или подключите профиль</span>
        </button>
      ) : (
        <div className="card-row">
          {playlists.slice(0, 10).map((p, i) => (
            <button key={p.id} className="mix-card" onClick={() => nav.push({ kind: 'playlist', id: p.id })}>
              <div className="mix-art">{p.tracks[0]?.artwork ? <Cover track={p.tracks[0]} size="md" /> : <SceneArt hue={260 + i * 9} seed={i * 7 + 2} />}</div>
              <span>{p.name}</span>
              <small>{tracksWord(p.tracks.length)}</small>
            </button>
          ))}
        </div>
      )}

      <div className="section-head">
        <h2>Недавно прослушанное</h2>
        {history.length > 4 && <button onClick={() => nav.push({ kind: 'mix', title: 'Недавно', subtitle: 'прослушанное', load: async () => getHistory().slice(0, 50) })}>Все →</button>}
      </div>
      <TrackList tracks={history.slice(0, 4)} empty="Здесь появятся треки, которые вы слушали" />
    </div>
  );
}
