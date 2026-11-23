import { useState } from 'react';
import { player } from '../../player/player';
import { recommend } from '../../recommend/recommend';
import { refreshDiscovery, useDiscovery, type RecMix } from '../../recommend/discovery';
import { getHistory, getPlaylists, libraryTracks } from '../../storage/store';
import type { Playlist } from '../../types';
import { nav } from '../navigation';
import { greeting, tracksWord, usePlayer, useSettings, useStore } from '../hooks';
import { ART, artFor, mixArt } from '../art';
import { Cover } from '../components/Cover';
import { Icon } from '../components/Icon';
import { TrackCards } from '../components/TrackCards';
import { TrackList } from '../components/TrackList';

const HERO = [
  { title: ['Твоя', 'ночная волна'], img: ART.hero.wave, action: 'wave' },
  { title: ['Подобрать', 'по настроению'], img: ART.hero.mood, action: 'mood' },
  { title: ['Перенести', 'из SoundCloud'], img: ART.hero.import, action: 'import' },
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
    <div className="screen home-screen">
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
            <img className="hero-art" src={h.img} alt="" />
            <div className="hero-text">{h.title[0]}<br />{h.title[1]}</div>
            <button className="play-btn" aria-label="Открыть">
              {busy && h.action === 'wave' ? <span className="spinner" /> : <Icon name={h.action === 'import' ? 'plus' : 'play'} size={22} />}
            </button>
          </div>
        ))}
      </div>
      <div className="dots">{HERO.map((_, i) => <i key={i} className={i === slide ? 'on' : ''} />)}</div>

      {libEmpty ? <Onboarding /> : (
        <>
          <SectionHead title="Рекомендации" loading={d.loading && !d.mixes.length} />
          {d.mixes.length ? (
            <div className="card-row">{d.mixes.map((m) => <MixCard key={m.id} mix={m} />)}</div>
          ) : <p className="empty">{d.loading ? 'Собираю плейлисты по вашему вкусу…' : 'Импортируйте пару плейлистов — здесь появятся подборки'}</p>}

          <SectionHead title="Для тебя" loading={d.loading}
            onRefresh={() => refreshDiscovery(true)}
            onAll={d.forYou.length > 5 ? () => nav.push({ kind: 'mix', title: 'Для тебя', subtitle: 'подборка', cover: artFor('for-you'), load: async () => d.forYou }) : undefined} />
          {d.forYou.length ? <div className="glass-list"><TrackList tracks={d.forYou.slice(0, 5)} /></div>
            : <p className="empty">{d.loading ? 'Подбираю треки по вашему вкусу…' : 'Послушайте несколько треков — подборка появится здесь'}</p>}

          {d.fresh.length > 0 && (<>
            <SectionHead title="Новое от твоих артистов" />
            <TrackCards tracks={d.fresh} />
          </>)}

          <SectionHead title="Твои плейлисты" onAll={playlists.length ? () => nav.setTab('library') : undefined} />
          {playlists.length ? (
            <div className="card-row">{playlists.slice(0, 10).map((p) => <PlaylistCard key={p.id} p={p} />)}</div>
          ) : <Onboarding compact />}

          <SectionHead title="Недавно прослушанное"
            onAll={history.length > 3 ? () => nav.push({ kind: 'mix', title: 'Недавно', subtitle: 'прослушанное', cover: artFor('recent'), load: async () => getHistory().slice(0, 50) }) : undefined} />
          {history.length ? <RecentList /> : <p className="empty">Здесь появятся треки, которые вы слушали</p>}
        </>
      )}
    </div>
  );
}

function SectionHead({ title, loading, onAll, onRefresh }: { title: string; loading?: boolean; onAll?: () => void; onRefresh?: () => void }) {
  return (
    <div className="section-head">
      <h2 className="clamp-1">{title}</h2>
      <div className="row">
        {loading ? <span className="spinner small" /> : onRefresh && <button onClick={onRefresh} aria-label="Обновить"><Icon name="refresh" size={15} /></button>}
        {onAll && <button onClick={onAll}>Все →</button>}
      </div>
    </div>
  );
}

/** «Недавно прослушанное» — стеклянная плашка, как на референсе: текущий трек с паузой. */
function RecentList() {
  const history = useStore(getHistory);
  const { queue, index, playing } = usePlayer();
  const cur = queue[index]?.id;
  const items = history.slice(0, 3);
  return (
    <div className="recent">
      {items.map((t, i) => (
        <div key={t.id} className={`recent-row ${t.id === cur ? 'is-current' : ''}`}
          onClick={() => (t.id === cur ? player.toggle() : player.playList(items, i))}>
          <Cover track={t} size="sm" />
          <div className="track-meta"><div className="track-title">{t.title}</div><div className="track-sub">{t.artist}</div></div>
          <span className="recent-btn"><Icon name={t.id === cur && playing ? 'pause' : 'play'} size={18} /></span>
        </div>
      ))}
    </div>
  );
}

/** Карточка рекомендованного плейлиста: атмосферное фото + две строки. */
function MixCard({ mix }: { mix: RecMix }) {
  const art = mixArt(mix.id);
  return (
    <button className="mix-card" onClick={() => nav.push({ kind: 'mix', title: mix.title, subtitle: mix.subtitle, hue: mix.hue, cover: art, load: async () => mix.tracks })}>
      <div className="mix-art">
        <img src={art} alt="" loading="lazy" />
        {mix.source === 'deezer' && <span className="mix-badge">Deezer</span>}
        <span className="mix-count">{mix.tracks.length}</span>
      </div>
      <span className="clamp-2">{mix.title}</span>
      <small className="clamp-1">{mix.subtitle}</small>
    </button>
  );
}

function PlaylistCard({ p }: { p: Playlist }) {
  const art = p.tracks.find((t) => t.artwork)?.artwork;
  return (
    <button className="mix-card" onClick={() => nav.push({ kind: 'playlist', id: p.id })}>
      <div className="mix-art cover-like"><img src={art ?? artFor(p.id)} alt="" loading="lazy" /></div>
      <span className="clamp-2">{p.name}</span>
      <small className="clamp-1">{tracksWord(p.tracks.length)}</small>
    </button>
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
