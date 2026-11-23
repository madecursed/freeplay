import { useEffect, useRef } from 'react';
import type { Track } from '../../types';
import { player } from '../../player/player';
import { recommend } from '../../recommend/recommend';
import { deletePlaylist, getLiked, getPlaylists } from '../../storage/store';
import { importLink } from '../../sync/scSync';
import { useState } from 'react';
import { nav, type Page } from '../navigation';
import { fmtTotal, tracksWord, useAsync, usePlayer, useStore } from '../hooks';
import { Cover } from '../components/Cover';
import { Icon } from '../components/Icon';
import { SceneArt } from '../components/SceneArt';
import { TrackList } from '../components/TrackList';

type Props = { page: Extract<Page, { kind: 'playlist' | 'mix' }> };

/** Страница плейлиста: пользовательский плейлист, «Избранное» или подборка (микс/настроение/исполнитель). */
export function PlaylistScreen({ page }: Props) {
  const liked = useStore(getLiked);
  const playlists = useStore(getPlaylists);
  const mix = useAsync<Track[]>(
    () => (page.kind === 'mix' ? (page.load ? page.load() : recommend(30, new Set(), page.tags)) : Promise.resolve([])),
    [page],
  );

  let title: string, subtitle = '', tracks: Track[], hue = 270;
  if (page.kind === 'playlist') {
    const pl = page.id === 'liked' ? { name: 'Избранное', tracks: liked } : playlists.find((p) => p.id === page.id);
    title = pl?.name ?? 'Плейлист удалён';
    tracks = pl?.tracks ?? [];
  } else {
    title = page.title; subtitle = page.subtitle ?? ''; hue = page.hue ?? 270;
    tracks = mix.data ?? [];
  }
  const total = tracks.reduce((s, t) => s + t.duration, 0);
  const { queue, index, playing } = usePlayer();
  const [syncing, setSyncing] = useState(false);
  const pl = page.kind === 'playlist' ? playlists.find((p) => p.id === page.id) : undefined;
  const sync = async () => { if (!pl?.sourceUrl) return; setSyncing(true); try { await importLink(pl.sourceUrl); } catch { alert('Не удалось обновить — проверьте интернет'); } finally { setSyncing(false); } };
  const isThisPlaying = playing && tracks.some((t) => t.id === queue[index]?.id);

  // автозапуск для настроения
  const started = useRef(false);
  useEffect(() => {
    if (page.kind === 'mix' && page.autoplay && !started.current && tracks.length) { started.current = true; player.playList(tracks); }
  }, [tracks, page]);

  return (
    <div className="screen playlist-screen">
      <header className="screen-head floating">
        <button className="icon-btn" onClick={nav.pop}><Icon name="back" /></button>
        <div className="row">
          {page.kind === 'mix' && !page.load && <button className="icon-btn" onClick={mix.reload}><Icon name="refresh" /></button>}
          {pl?.sourceUrl && <button className="icon-btn" title="Обновить из SoundCloud" onClick={sync}>{syncing ? <span className="spinner" /> : <Icon name="refresh" />}</button>}
          {page.kind === 'playlist' && page.id !== 'liked' && (
            <button className="icon-btn" onClick={() => { if (confirm(`Удалить плейлист «${title}»?`)) { deletePlaylist(page.id); nav.pop(); } }}><Icon name="trash" /></button>
          )}
        </div>
      </header>

      <div className="pl-hero">
        {tracks[0]?.artwork && page.kind === 'playlist' ? <Cover track={tracks[0]} size="xl" /> : <div className="cover cover-xl"><SceneArt hue={hue} seed={title.length} /></div>}
      </div>
      <div className="pl-info">
        <div>
          <h1>{title}{subtitle && <span className="pl-sub"> {subtitle}</span>}</h1>
          <p className="muted">{mix.loading && page.kind === 'mix' ? 'Подбираю…' : `${tracksWord(tracks.length)} · ${fmtTotal(total)}`}</p>
        </div>
        <button className="play-btn big" disabled={!tracks.length} onClick={() => (isThisPlaying ? player.toggle() : player.playList(tracks))}>
          <Icon name={isThisPlaying ? 'pause' : 'play'} size={26} />
        </button>
      </div>
      <div className="pl-actions">
        <button className="icon-btn" disabled={!tracks.length} onClick={() => { if (!player.get().shuffle) player.toggleShuffle(); player.playList(tracks, Math.floor(Math.random() * tracks.length)); }}>
          <Icon name="shuffle" />
        </button>
      </div>

      {mix.error ? <p className="empty">Не удалось загрузить. <button className="link" onClick={mix.reload}>Повторить</button></p>
        : <TrackList tracks={tracks} playlistId={page.kind === 'playlist' ? page.id : undefined}
            empty={page.kind === 'playlist' ? 'Добавляйте треки через ⋯ → «Добавить в плейлист»' : mix.loading ? '' : 'В библиотеке пока нет подходящих треков — импортируйте больше плейлистов'} />}
    </div>
  );
}
