/** Nocturne работает только с SoundCloud (треки старых каталогов удаляются при запуске — storage/store.ts). */
export type SourceId = 'soundcloud';

export interface Track {
  id: string;          // `scw:<id трека SoundCloud>`
  source: SourceId;
  title: string;
  artist: string;
  artwork?: string;
  duration: number;    // секунды (0 — неизвестна, придёт при воспроизведении)
  /** Прямая ссылка на аудио. У треков SoundCloud пустая — играет embed. */
  streamUrl: string;
  genre?: string;
  tags: string[];
  permalink?: string;  // ссылка на трек на soundcloud.com
  /** Ссылка для официального встраиваемого плеера SoundCloud. */
  embed?: string;
  /** ID исполнителя в SoundCloud — для рекомендаций (его лайки и новые треки). */
  artistId?: number;
  /** Дата публикации (ISO). */
  created?: string;
  plays?: number;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  created: number;
  /** Ссылка SoundCloud, из которой импортирован плейлист — для автосинхронизации. */
  sourceUrl?: string;
  syncedAt?: number;
}
