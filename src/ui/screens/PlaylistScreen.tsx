import { useEffect, useRef, useState } from 'react';
import type { Track } from '../../types';
import { player } from '../../player/player';
import { recommend } from '../../recommend/recommend';
import { addManyToPlaylist, createPlaylist, deletePlaylist, getLiked, getPlaylists } from '../../storage/store';
import { importLink } from '../../sync/scSync';
import { nav, type Page } from '../navigation';
import { fmtTotal, tracksWord, useAsync, usePlayer, useStore } from '../hooks';
import { Icon } from '../components/Icon';
import { artFor } from '../art';
import { TrackList } from '../components/TrackList';

type Props = { page: Extract<Page, { kind: 'playlist' | 'mix' }> };

/** Страница плейлиста: свой плейлист, «Избранное» или рекомендованная подборка. */
export function PlaylistScreen({ page }: Props) {
  const liked = useStore(getLiked);
  const playlists = useStore(getPlaylists);
  const mix = useAsync<Track[]>(
    () => (page.kind === 'mix' ? (page.load ? page.load() : recommend(30, new Set(), page.tags)) : Promise.resolve([])),
    [page],
  );
  const { queue, index, playing } = usePlayer();
  const [syncing, setSyncing] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const pl = page.kind === 'playlist' ? playlists.find((p) => p.id === page.id) : undefined;
  let title: string, subtitle = '', tracks: Track[], hue = 270;
  if (page.kind === 'playlist') {
    title = page.id === 'liked' ? 'Избранное' : pl?.name ?? 'Плейлист удалён';
    tracks = page.id === 'liked' ? liked : pl?.tracks ?? [];
  } else {
    title = page.title; subtitle = page.subtitle ?? ''; hue = page.hue ?? 270;
    tracks = mix.data ?? [];
  }
  const total = tracks.reduce((s, t) => s + t.duration, 0);
  const cover = (page.kind === 'mix' && page.cover) || tracks.find((t) => t.artwork)?.artwork || artFor(title);
  const isThisPlaying = playing && tracks.some((t) => t.id === queue[index]?.id);
  const saved = !!savedId && playlists.some((p) => p.id === savedId);

  const sync = async () => {
    if (!pl?.sourceUrl) return;
    setSyncing(true);
    try { await importLink(pl.sourceUrl); } catch { alert('Не удалось обновить — проверьте интернет'); } finally { setSyncing(false); }
  };
  const save = () => {
    if (saved || !tracks.length) return;
    const p = createPlaylist(subtitle ? `${title} ${subtitle}` : title);
    addManyToPlaylist(p.id, tracks);
    setSavedId(p.id);
  };
  const shuffle = () => { if (!player.get().shuffle) player.toggleShuffle(); player.playList(tracks, Math.floor(Math.random() * tracks.length)); };

  // автозапуск для настроения
  const started = useRef(false);
  useEffect(() => {
    if (page.kind === 'mix' && page.autoplay && !started.current && tracks.length) { started.current = true; player.playList(tracks); }
  }, [tracks, page]);

  return (
    <div className="screen playlist-screen">
      <div className="pl-cover">
        <img src={cover} alt="" />
        <div className="pl-cover-fade" />
        <header className="pl-top">
          <button className="icon-btn" aria-label="Назад" onClick={nav.pop}><Icon name="back" /></button>
          {page.kind === 'mix' ? (
            <button className={`icon-btn ${saved ? 'is-on' : ''}`} aria-label="Сохранить в библиотеку" onClick={save}>
              <Icon name="sparkle" size={20} filled={saved} />
            </button>
          ) : pl?.sourceUrl ? (
            <button className="icon-btn" aria-label="Обновить из SoundCloud" onClick={sync}>{syncing ? <span className="spinner" /> : <Icon name="refresh" />}</button>
          ) : <span />}
        </header>
        <div className="pl-head">
          <div className="pl-head-text">
            <h1 className="clamp-2">{title}{subtitle && <span className="pl-sub"> {subtitle}</span>}</h1>
            <p>{mix.loading && page.kind === 'mix' ? 'Подбираю…' : `${tracksWord(tracks.length)} · ${fmtTotal(total)}`}</p>
          </div>
          <button className="orb small" disabled={!tracks.length} aria-label="Играть"
            onClick={() => (isThisPlaying ? player.toggle() : player.playList(tracks))}>
            <Icon name={isThisPlaying ? 'pause' : 'play'} size={24} />
          </button>
        </div>
      </div>

      <div className="pl-actions">
        <button className="icon-btn" aria-label="Перемешать" disabled={!tracks.length} onClick={shuffle}><Icon name="shuffle" /></button>
        {page.kind === 'mix' && <button className="icon-btn" aria-label="Сохранить" disabled={saved} onClick={save}><Icon name="plus" /></button>}
        {page.kind === 'mix' && !page.load && <button className="icon-btn" aria-label="Пересобрать" onClick={mix.reload}><Icon name="refresh" /></button>}
        {page.kind === 'playlist' && page.id !== 'liked' && (
          <button className="icon-btn" aria-label="Удалить плейлист" onClick={() => { if (confirm(`Удалить плейлист «${title}»?`)) { deletePlaylist(page.id); nav.pop(); } }}><Icon name="trash" /></button>
        )}
        {saved && <span className="pl-saved">Сохранено в библиотеку</span>}
      </div>

      {mix.error ? <p className="empty">Не удалось загрузить. <button className="link" onClick={mix.reload}>Повторить</button></p>
        : <TrackList tracks={tracks} playlistId={page.kind === 'playlist' ? page.id : undefined}
            empty={page.kind === 'playlist' ? 'Добавляйте треки через ⋯ → «Добавить в плейлист»' : mix.loading ? '' : 'Пока нет подходящих треков — импортируйте больше плейлистов'} />}
    </div>
  );
}
