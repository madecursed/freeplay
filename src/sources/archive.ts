import type { MusicSource, Track } from '../types';

/**
 * Internet Archive — коллекция netlabels (бесплатные релизы независимых лейблов). Ключ не нужен.
 * Поиск находит релизы (альбомы), затем из каждого берём несколько mp3-треков.
 */
const BASE = 'https://archive.org';
const NOT_MUSIC = 'NOT subject:(poetry OR spoken OR audiobook OR podcast OR lecture OR reading OR interview)';
const ITEMS = 8, PER_ITEM = 3;

async function searchItems(query: string, sort: string, rows = ITEMS): Promise<string[]> {
  const q = `collection:netlabels AND mediatype:audio AND ${NOT_MUSIC}${query ? ` AND (${query})` : ''}`;
  const p = new URLSearchParams({ q, rows: String(rows), output: 'json' });
  p.append('fl[]', 'identifier');
  p.append('sort[]', sort);
  const res = await fetch(`${BASE}/advancedsearch.php?${p}`);
  if (!res.ok) throw new Error(`Archive ${res.status}`);
  const j = await res.json();
  return (j.response?.docs ?? []).map((d: any) => d.identifier as string);
}

const parseLen = (v?: string) => {
  if (!v) return 0;
  if (v.includes(':')) return v.split(':').reduce((a, x) => a * 60 + Number(x), 0);
  return Math.round(Number(v)) || 0;
};

async function itemTracks(id: string): Promise<Track[]> {
  const res = await fetch(`${BASE}/metadata/${id}`);
  if (!res.ok) return [];
  const j = await res.json();
  const md = j.metadata ?? {};
  const subjects: string[] = (Array.isArray(md.subject) ? md.subject : String(md.subject ?? '').split(/[;,]/))
    .map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  const creator = Array.isArray(md.creator) ? md.creator[0] : md.creator;
  return (j.files ?? [])
    .filter((f: any) => f.format === 'VBR MP3' || f.format === 'MP3' || f.format === '128Kbps MP3')
    .slice(0, PER_ITEM)
    .map((f: any): Track => ({
      id: `archive:${id}/${f.name}`,
      source: 'archive',
      title: f.title || f.name.replace(/\.mp3$/i, '').replace(/[_-]+/g, ' '),
      artist: f.artist || f.creator || creator || 'Unknown',
      artwork: `${BASE}/services/img/${id}`,
      duration: parseLen(f.length),
      streamUrl: `${BASE}/download/${id}/${encodeURIComponent(f.name)}`,
      genre: subjects[0],
      tags: subjects.slice(0, 6),
      permalink: `${BASE}/details/${id}`,
    }));
}

async function tracks(query: string, sort: string, limit: number): Promise<Track[]> {
  const ids = await searchItems(query, sort, Math.ceil(limit / PER_ITEM) + 2);
  const lists = await Promise.allSettled(ids.map(itemTracks));
  return lists.flatMap((l) => (l.status === 'fulfilled' ? l.value : [])).slice(0, limit);
}

const esc = (s: string) => s.replace(/[():"\\]/g, ' ').trim();

export const archive: MusicSource = {
  id: 'archive',
  label: 'Internet Archive',
  enabled: () => true,
  search: (q, limit = 20) => tracks(`title:(${esc(q)}) OR creator:(${esc(q)}) OR subject:(${esc(q)})`, 'downloads desc', limit),
  trending: (limit = 20) => tracks('', 'week desc', limit),
  byTag: (tag, limit = 20) => tracks(`subject:(${esc(tag)})`, 'downloads desc', limit),
};
