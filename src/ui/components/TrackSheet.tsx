import { useState } from 'react';
import { player } from '../../player/player';
import { record, SIGNAL } from '../../recommend/profile';
import { addToPlaylist, blockArtist, createPlaylist, dislike, getPlaylists, isLiked, removeFromPlaylist, toggleLike } from '../../storage/store';
import { refreshDiscovery } from '../../recommend/discovery';
import { nav, useNav } from '../navigation';
import { usePlayer, useStore } from '../hooks';
import { Cover } from './Cover';
import { Icon } from './Icon';

/** Нижняя шторка действий с треком. */
export function TrackSheet() {
  const { sheet, sheetClosing } = useNav();
  const playlists = useStore(getPlaylists);
  useStore(() => sheet && isLiked(sheet.track.id));
  const [mode, setMode] = useState<'actions' | 'playlists'>('actions');
  const [name, setName] = useState('');
  const ps = usePlayer();
  if (!sheet) return null;
  const { track: t, playlistId, fromPlayer } = sheet;
  const close = () => { nav.closeSheet(); setMode('actions'); setName(''); };
  const act = (fn: () => void) => () => { fn(); close(); };

  return (
    <div className={`sheet-backdrop ${sheetClosing ? 'is-closing' : ''}`} onClick={close}>
      <div className="sheet glass" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <Cover track={t} size="sm" />
          <div className="track-meta"><div className="track-title">{t.title}</div><div className="track-sub">{t.artist} · {t.source}</div></div>
        </div>
        {mode === 'actions' ? (
          <div className="sheet-list">
            {fromPlayer ? (<>
              <button onClick={act(() => nav.toggleQueue(true))}><Icon name="queue" />Очередь</button>
              <button onClick={act(() => player.setAutoRadio(!ps.autoRadio))}><Icon name="sparkle" />Автомикс: {ps.autoRadio ? 'вкл' : 'выкл'}</button>
              {t.embed && <button onClick={act(() => document.getElementById('sc-host')?.classList.toggle('is-visible'))}><Icon name="cloud" />Не играет? Показать плеер SoundCloud</button>}
            </>) : (<>
              <button onClick={act(() => player.playNext(t))}><Icon name="next1" />Играть следующим</button>
              <button onClick={act(() => player.addToQueue(t))}><Icon name="queue" />Добавить в очередь</button>
            </>)}
            <button onClick={act(() => record(t, toggleLike(t) ? SIGNAL.like : SIGNAL.unlike))}>
              <Icon name="heart" filled={isLiked(t.id)} className={isLiked(t.id) ? 'liked' : ''} />{isLiked(t.id) ? 'Убрать из избранного' : 'В избранное'}
            </button>
            <button onClick={() => setMode('playlists')}><Icon name="plus" />Добавить в плейлист</button>
            {playlistId && playlistId !== 'liked' && (
              <button onClick={act(() => removeFromPlaylist(playlistId, t.id))}><Icon name="trash" />Удалить из плейлиста</button>
            )}
            <button onClick={act(() => { dislike(t.id); record(t, SIGNAL.dislike); refreshDiscovery().catch(() => {}); })}><Icon name="ban" />Не рекомендовать трек</button>
            <button onClick={act(() => { blockArtist(t.artist); record(t, SIGNAL.dislike); refreshDiscovery().catch(() => {}); })}><Icon name="user" />Не рекомендовать {t.artist}</button>
            {t.permalink && <a href={t.permalink} target="_blank" rel="noreferrer" onClick={close}><Icon name="link" />Открыть в {t.source}</a>}
          </div>
        ) : (
          <div className="sheet-list">
            <form className="inline-create" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; addToPlaylist(createPlaylist(name).id, t); close(); }}>
              <input placeholder="Новый плейлист…" value={name} onChange={(e) => setName(e.target.value)} />
              <button type="submit" className="icon-btn"><Icon name="plus" /></button>
            </form>
            {playlists.map((p) => (
              <button key={p.id} onClick={act(() => addToPlaylist(p.id, t))}><Icon name="library" />{p.name}<small>{p.tracks.length}</small></button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
