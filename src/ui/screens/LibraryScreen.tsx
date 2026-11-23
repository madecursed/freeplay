import { useMemo, useState } from 'react';
import { fromAll } from '../../sources';
import { createPlaylist, getHistory, getLiked, getPlaylists } from '../../storage/store';
import { nav } from '../navigation';
import { tracksWord, useStore } from '../hooks';
import { Cover } from '../components/Cover';
import { Icon } from '../components/Icon';

export function LibraryScreen() {
  const [tab, setTab] = useState<'playlists' | 'artists'>('playlists');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const liked = useStore(getLiked);
  const playlists = useStore(getPlaylists);
  const history = useStore(getHistory);

  // исполнители из избранного и истории, по частоте
  const artists = useMemo(() => {
    const m = new Map<string, { name: string; count: number; art?: string }>();
    for (const t of [...liked, ...history]) {
      const a = m.get(t.artist) ?? { name: t.artist, count: 0, art: t.artwork };
      a.count++; m.set(t.artist, a);
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [liked, history]);

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const p = createPlaylist(name);
    setCreating(false); setName('');
    nav.push({ kind: 'playlist', id: p.id });
  };

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Библиотека</h1>
        <div className="row">
          <button className="icon-btn" onClick={() => nav.setTab('search')}><Icon name="search" /></button>
          <button className="icon-btn" onClick={() => { setTab('playlists'); setCreating(true); }}><Icon name="plus" /></button>
        </div>
      </header>
      <div className="segmented">
        <button className={tab === 'playlists' ? 'is-on' : ''} onClick={() => setTab('playlists')}>Плейлисты</button>
        <button className={tab === 'artists' ? 'is-on' : ''} onClick={() => setTab('artists')}>Исполнители</button>
      </div>

      {tab === 'playlists' ? (
        <ul className="lib-list">
          {creating ? (
            <li><form className="inline-create glass" onSubmit={create}>
              <input autoFocus placeholder="Название плейлиста" value={name} onChange={(e) => setName(e.target.value)} />
              <button type="submit" className="icon-btn"><Icon name="plus" /></button>
            </form></li>
          ) : (
            <li onClick={() => setCreating(true)}>
              <div className="cover cover-md create-tile"><Icon name="plus" size={26} /></div>
              <div className="track-meta"><div className="track-title">Создать</div><div className="track-sub">плейлист</div></div>
            </li>
          )}
          <li onClick={() => nav.push({ kind: 'playlist', id: 'liked' })}>
            <div className="cover cover-md liked-tile"><Icon name="sparkle" size={26} /></div>
            <div className="track-meta"><div className="track-title">Избранное</div><div className="track-sub">{tracksWord(liked.length)}</div></div>
            <Icon name="heart" filled className="liked" size={18} />
          </li>
          {playlists.map((p) => (
            <li key={p.id} onClick={() => nav.push({ kind: 'playlist', id: p.id })}>
              <Cover track={p.tracks[0]} size="md" />
              <div className="track-meta"><div className="track-title">{p.name}</div><div className="track-sub">{tracksWord(p.tracks.length)}</div></div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="lib-list">
          {artists.length === 0 && <p className="empty">Слушайте и лайкайте треки — исполнители появятся здесь</p>}
          {artists.map((a) => (
            <li key={a.name} onClick={() => nav.push({
              kind: 'mix', title: a.name, subtitle: 'исполнитель',
              load: async () => (await fromAll((s) => s.search(a.name, 30))).sort((x, y) => +(y.artist === a.name) - +(x.artist === a.name)),
            })}>
              <Cover src={a.art} size="md" className="round" />
              <div className="track-meta"><div className="track-title">{a.name}</div><div className="track-sub">{tracksWord(a.count)} в библиотеке</div></div>
              <Icon name="chevron" size={16} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
