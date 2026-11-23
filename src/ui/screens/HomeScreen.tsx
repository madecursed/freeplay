import { useState } from 'react';
import { player } from '../../player/player';
import { refreshDiscovery, useDiscovery } from '../../recommend/discovery';
import { getHistory, getLiked, getPlaylists, libraryTracks } from '../../storage/store';
import type { Playlist } from '../../types';
import { nav } from '../navigation';
import { greeting, tracksWord, usePlayer, useSettings, useStore } from '../hooks';
import { ART, artFor } from '../art';
import { Cover } from '../components/Cover';
import { Icon } from '../components/Icon';
import { TrackCards } from '../components/TrackCards';

const HERO = [
  { title: ['Твоя', 'ночная волна'], img: ART.hero.wave, action: 'wave' },
  { title: ['Подобрать', 'по настроению'], img: ART.hero.mood, action: 'mood' },
  { title: ['Перенести', 'из SoundCloud'], img: ART.hero.import, action: 'import' },
] as const;

/**
 * Главная «как в SoundCloud»: только ваша музыка и новинки ваших исполнителей.
 * Подбор похожего — в автоплее: когда очередь заканчивается, играет станция по последнему треку.
 */
export function HomeScreen() {
  const { name } = useSettings();
  const history = useStore(getHistory);
  const playlists = useStore(getPlaylists);
  const liked = useStore(getLiked);
  const d = useDiscovery();
  const [slide, setSlide] = useState(0);
  const libEmpty = playlists.length === 0 && history.length === 0 && liked.length === 0;

  const runHero = (action: string) => {
    if (action === 'mood') return nav.push({ kind: 'mood' });
    if (action === 'import') return nav.setTab('library');
    // волна: последний трек (или случайный из библиотеки), дальше автоплей сам продолжит станцией
    const seed = getHistory()[0] ?? libraryTracks()[Math.floor(Math.random() * libraryTracks().length)];
    if (!seed) return nav.setTab('library');
    if (!player.get().autoRadio) player.setAutoRadio(true);
    player.playList([seed]);   // синхронно, внутри нажатия — иначе iPhone не даст звук
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
            <button className="play-btn" aria-label="Открыть"><Icon name={h.action === 'import' ? 'plus' : 'play'} size={22} /></button>
          </div>
        ))}
      </div>
      <div className="dots">{HERO.map((_, i) => <i key={i} className={i === slide ? 'on' : ''} />)}</div>

      {libEmpty ? <Onboarding /> : (
        <>
          <SectionHead title="Новое от твоих артистов" loading={d.loading} onRefresh={() => refreshDiscovery(true)} />
          {d.fresh.length ? <TrackCards tracks={d.fresh} />
            : <p className="empty">{d.loading ? 'Проверяю новые треки…' : 'Слушайте и лайкайте треки — здесь появятся новинки ваших исполнителей'}</p>}

          <SectionHead title="Твои плейлисты" onAll={() => nav.setTab('library')} />
          <div className="card-row">
            <button className="mix-card" onClick={() => nav.push({ kind: 'playlist', id: 'liked' })}>
              <div className="mix-art tile-liked liked-card"><Icon name="sparkle" size={34} /></div>
              <span className="clamp-2">Избранное</span>
              <small className="clamp-1">{tracksWord(liked.length)}</small>
            </button>
            {playlists.slice(0, 12).map((p) => <PlaylistCard key={p.id} p={p} />)}
          </div>
          {playlists.length === 0 && <Onboarding compact />}

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

/** «Недавно прослушанное» — стеклянная плашка: текущий трек с паузой. */
function RecentList() {
  const history = useStore(getHistory);
  const { queue, index, playing } = usePlayer();
  const cur = queue[index]?.id;
  const items = history.slice(0, 4);
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

function PlaylistCard({ p }: { p: Playlist }) {
  const art = p.tracks.find((t) => t.artwork)?.artwork;
  return (
    <button className="mix-card" onClick={() => nav.push({ kind: 'playlist', id: p.id })}>
      <div className="mix-art cover-like"><img src={art ?? artFor(p.id)} alt="" loading="lazy" /><span className="mix-count">{p.tracks.length}</span></div>
      <span className="clamp-2">{p.name}</span>
      <small className="clamp-1">{p.sourceUrl ? 'SoundCloud' : 'плейлист'}</small>
    </button>
  );
}

function Onboarding({ compact }: { compact?: boolean }) {
  return (
    <div className="onboarding">
      {!compact && <h2>С чего начать</h2>}
      <button className="cta" onClick={() => nav.setTab('profile')}>
        <Icon name="user" size={22} />
        <span><b>Подключите профиль SoundCloud</b><br />Ваши лайки и треки появятся в библиотеке</span>
      </button>
      <button className="cta" onClick={() => nav.setTab('library')}>
        <Icon name="cloud" size={22} />
        <span><b>Перенесите плейлисты</b><br />Вставьте ссылки — можно сразу несколько</span>
      </button>
      {!compact && <p className="hint">Когда плейлист закончится, музыка продолжится похожими треками — как автоплей в SoundCloud.</p>}
    </div>
  );
}
