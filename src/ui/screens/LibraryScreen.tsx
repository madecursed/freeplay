import { useMemo, useState } from 'react';
import { player } from '../../player/player';
import { createPlaylist, getBlocked, getHistory, getLiked, getPlaylists, libraryTracks, unblockArtist } from '../../storage/store';
import { refreshDiscovery } from '../../recommend/discovery';
import { nav } from '../navigation';
import { tracksWord, useStore } from '../hooks';
import { Cover } from '../components/Cover';
import { Icon } from '../components/Icon';
import { ScImport } from '../components/ScImport';
import { TrackList } from '../components/TrackList';

type LibTab = 'playlists' | 'artists' | 'tracks';
const TABS: [LibTab, string][] = [['playlists', 'Плейлисты'], ['artists', 'Исполнители'], ['tracks', 'Треки']];

export function LibraryScreen() {
  const [tab, setTab] = useState<LibTab>('playlists');
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [name, setName] = useState('');
  const liked = useStore(getLiked);
  const playlists = useStore(getPlaylists);
  const history = useStore(getHistory);
  const blocked = useStore(getBlocked);
  const all = useMemo(() => libraryTracks(), [liked, playlists, history]); // eslint-disable-line react-hooks/exhaustive-deps

  // исполнители библиотеки — по количеству треков
  const artists = useMemo(() => {
    const m = new Map<string, { name: string; count: number; art?: string }>();
    for (const t of all) {
      const a = m.get(t.artist) ?? { name: t.artist, count: 0, art: t.artwork };
      a.count++; a.art ??= t.artwork; m.set(t.artist, a);
    }
    return [...m.values()].filter((a) => !blocked.includes(a.name.toLowerCase())).sort((a, b) => b.count - a.count);
  }, [all, blocked]);

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const p = createPlaylist(name);
    setCreating(false); setName('');
    nav.push({ kind: 'playlist', id: p.id });
  };

  return (
    <div className="screen library-screen">
      <header className="screen-head">
        <h1>Библиотека</h1>
        <div className="row">
          <button className="icon-btn" aria-label="Поиск" onClick={() => nav.setTab('search')}><Icon name="search" /></button>
          <button className="icon-btn" aria-label="Создать плейлист" onClick={() => { setTab('playlists'); setCreating(true); }}><Icon name="plus" /></button>
        </div>
      </header>

      <div className="segmented">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'playlists' && (
        <ul className="lib-list stagger">
          {creating ? (
            <li className="lib-form"><form className="inline-create glass" onSubmit={create}>
              <input autoFocus placeholder="Название плейлиста" value={name} onChange={(e) => setName(e.target.value)} />
              <button type="submit" className="icon-btn"><Icon name="plus" /></button>
            </form></li>
          ) : (
            <li onClick={() => setCreating(true)}>
              <div className="tile tile-create"><Icon name="plus" size={24} /></div>
              <div className="track-meta"><div className="track-title">Создать</div><div className="track-sub">плейлист</div></div>
            </li>
          )}
          {importing ? <li className="lib-form"><ScImport onDone={() => setImporting(false)} /></li> : (
            <li onClick={() => setImporting(true)}>
              <div className="tile tile-sc"><Icon name="cloud" size={24} /></div>
              <div className="track-meta"><div className="track-title">Импорт из SoundCloud</div><div className="track-sub">по ссылкам, можно несколько</div></div>
            </li>
          )}
          <li onClick={() => nav.push({ kind: 'playlist', id: 'liked' })}>
            <div className="tile tile-liked"><Icon name="sparkle" size={26} /></div>
            <div className="track-meta"><div className="track-title">Избранное</div><div className="track-sub">{tracksWord(liked.length)}</div></div>
            <Icon name="heart" filled className="liked glow-heart" size={18} />
          </li>
          {playlists.map((p) => (
            <li key={p.id} onClick={() => nav.push({ kind: 'playlist', id: p.id })}>
              <Cover track={p.tracks.find((t) => t.artwork)} size="md" className="tile" />
              <div className="track-meta">
                <div className="track-title">{p.name}</div>
                <div className="track-sub">{tracksWord(p.tracks.length)}{p.sourceUrl ? ' · SoundCloud' : ''}</div>
              </div>
              <Icon name="chevron" size={16} className="muted" />
            </li>
          ))}
        </ul>
      )}

      {tab === 'artists' && (
        <>
          <ul className="lib-list stagger">
            {artists.length === 0 && <p className="empty">Импортируйте плейлисты — исполнители появятся здесь</p>}
            {artists.map((a) => (
              <li key={a.name} onClick={() => nav.push({
                kind: 'mix', title: a.name, subtitle: 'в библиотеке', cover: a.art,
                load: async () => libraryTracks().filter((t) => t.artist === a.name),
              })}>
                <Cover src={a.art} size="md" className="round" />
                <div className="track-meta"><div className="track-title">{a.name}</div><div className="track-sub">{tracksWord(a.count)}</div></div>
                <Icon name="chevron" size={16} className="muted" />
              </li>
            ))}
          </ul>
          {blocked.length > 0 && (
            <>
              <div className="section-head"><h3>Не рекомендовать</h3></div>
              <ul className="lib-list">
                {blocked.map((a) => (
                  <li key={a} className="is-static">
                    <div className="tile tile-blocked"><Icon name="ban" size={20} /></div>
                    <div className="track-meta"><div className="track-title cap">{a}</div><div className="track-sub">скрыт из рекомендаций</div></div>
                    <button className="chip" onClick={() => { unblockArtist(a); refreshDiscovery().catch(() => {}); }}>Вернуть</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {tab === 'tracks' && (
        <>
          <div className="lib-tracks-head">
            <span className="muted">{tracksWord(all.length)}</span>
            <button className="chip is-on" disabled={!all.length}
              onClick={() => { if (!player.get().shuffle) player.toggleShuffle(); player.playList(all, Math.floor(Math.random() * all.length)); }}>
              <Icon name="shuffle" size={14} /> Перемешать всё
            </button>
          </div>
          <TrackList tracks={all} empty="Библиотека пуста — импортируйте плейлисты" />
        </>
      )}
    </div>
  );
}
