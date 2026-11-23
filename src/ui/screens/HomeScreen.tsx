import { useState } from 'react';
import { player } from '../../player/player';
import { recommend } from '../../recommend/recommend';
import { refreshDiscovery, useDiscovery } from '../../recommend/discovery';
import { getHistory, getPlaylists, libraryTracks } from '../../storage/store';
import { nav } from '../navigation';
import { greeting, tracksWord, useSettings, useStore } from '../hooks';
import { Cover } from '../components/Cover';
import { Icon } from '../components/Icon';
import { SceneArt } from '../components/SceneArt';
import { TrackCards } from '../components/TrackCards';
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
  const d = useDiscovery();
  const [slide, setSlide] = useState(0);
  const [busy, setBusy] = useState(false);
  const libEmpty = playlists.length === 0 && history.length === 0;

  const runHero = async (action: string) => {
    if (action === 'mood') return nav.push({ kind: 'mood' });
    if (action === 'import' || !libraryTracks().length) return nav.setTab('library');
    if (d.forYou.length) return player.playList(d.forYou);
    setBusy(true);
    try { const t = await recommend(40); if (t.length) player.playList(t); } finally { setBusy(false); }
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

      {libEmpty ? (
        <Onboarding />
      ) : (
        <>
          <div className="section-head">
            <h2>Для тебя</h2>
            <div className="row">
              {d.loading ? <span className="spinner small" /> : <button onClick={() => refreshDiscovery(true)} aria-label="Обновить"><Icon name="refresh" size={16} /></button>}
              {d.forYou.length > 6 && <button onClick={() => nav.push({ kind: 'mix', title: 'Для тебя', subtitle: 'подборка', load: async () => d.forYou })}>Все →</button>}
            </div>
          </div>
          {d.forYou.length ? <TrackList tracks={d.forYou.slice(0, 6)} />
            : <p className="empty">{d.loading ? 'Подбираю треки по вашему вкусу…' : 'Послушайте несколько треков — подборка появится здесь'}</p>}

          {d.fresh.length > 0 && (<>
            <div className="section-head"><h2>Новое от твоих артистов</h2></div>
            <TrackCards tracks={d.fresh} />
          </>)}

          {d.similar.map((r) => (
            <div key={r.artist}>
              <div className="section-head"><h2 className="ellipsis">Если нравится {r.artist}</h2></div>
              <TrackCards tracks={r.tracks} />
            </div>
          ))}

          <div className="section-head"><h2>Твои плейлисты</h2>{playlists.length > 0 && <button onClick={() => nav.setTab('library')}>Все →</button>}</div>
          {playlists.length ? (
            <div className="card-row">
              {playlists.slice(0, 10).map((p, i) => (
                <button key={p.id} className="mix-card" onClick={() => nav.push({ kind: 'playlist', id: p.id })}>
                  <div className="mix-art">{p.tracks[0]?.artwork ? <Cover track={p.tracks[0]} size="md" /> : <SceneArt hue={260 + i * 9} seed={i * 7 + 2} />}</div>
                  <span>{p.name}</span>
                  <small>{tracksWord(p.tracks.length)}</small>
                </button>
              ))}
            </div>
          ) : <Onboarding compact />}

          {d.rediscover.length > 0 && (<>
            <div className="section-head"><h2>Давно не слушал</h2></div>
            <TrackCards tracks={d.rediscover} />
          </>)}

          <div className="section-head">
            <h2>Недавно прослушанное</h2>
            {history.length > 4 && <button onClick={() => nav.push({ kind: 'mix', title: 'Недавно', subtitle: 'прослушанное', load: async () => getHistory().slice(0, 50) })}>Все →</button>}
          </div>
          <TrackList tracks={history.slice(0, 4)} empty="Здесь появятся треки, которые вы слушали" />
        </>
      )}
    </div>
  );
}

function Onboarding({ compact }: { compact?: boolean }) {
  return (
    <div className="onboarding">
      {!compact && <h2>С чего начать</h2>}
      <button className="cta" onClick={() => nav.setTab('profile')}>
        <Icon name="user" size={22} />
        <span><b>Подключите профиль SoundCloud</b><br />Ваши лайки и треки — основа рекомендаций</span>
      </button>
      <button className="cta" onClick={() => nav.setTab('library')}>
        <Icon name="cloud" size={22} />
        <span><b>Перенесите плейлисты</b><br />Вставьте ссылки — можно сразу несколько</span>
      </button>
      {!compact && <p className="hint">Дальше Nocturne сам найдёт новое: по лайкам и релизам исполнителей, которых вы слушаете.</p>}
    </div>
  );
}
