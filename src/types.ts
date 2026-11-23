export type SourceId = 'audius' | 'jamendo' | 'soundcloud';

export interface Track {
  id: string;          // `${source}:${nativeId}` — уникален между источниками
  source: SourceId;
  title: string;
  artist: string;
  artwork?: string;
  duration: number;    // секунды
  streamUrl: string;
  genre?: string;
  tags: string[];
  permalink?: string;  // ссылка на оригинал (обязательна для атрибуции SoundCloud)
}

/** Единый интерфейс источника. Новый каталог = новый файл в src/sources + строка в sources/index.ts */
export interface MusicSource {
  id: SourceId;
  label: string;
  enabled(): boolean;
  search(query: string, limit?: number): Promise<Track[]>;
  trending(limit?: number): Promise<Track[]>;
  byTag(tag: string, limit?: number): Promise<Track[]>;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  created: number;
}
