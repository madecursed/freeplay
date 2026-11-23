import type { Track } from '../types';
import { record, SIGNAL } from '../recommend/profile';
import { recommend } from '../recommend/recommend';
import { patchTrack, pushHistory } from '../storage/store';
import { scPause, scPlay, scResume, scSeek, scStop, type ScHandlers } from './scWidget';

/**
 * Плеер-синглтон: очередь, фоновое воспроизведение, экран блокировки, автомикс, shuffle/repeat.
 * Два движка: <audio> для прямых ссылок и официальный виджет SoundCloud для треков с embed.
 */
export type Repeat = 'off' | 'all' | 'one';
export interface PlayerState {
  queue: Track[];
  index: number;
  playing: boolean;
  loading: boolean;
  duration: number;
  autoRadio: boolean;
  shuffle: boolean;
  repeat: Repeat;
  error?: string;
}

const audio = new Audio();
audio.preload = 'auto';
let state: PlayerState = {
  queue: [], index: -1, playing: false, loading: false, duration: 0,
  autoRadio: true, shuffle: false, repeat: 'off',
};
const listeners = new Set<() => void>();
const set = (patch: Partial<PlayerState>) => { state = { ...state, ...patch }; listeners.forEach((f) => f()); };
const isEmbed = () => !!state.queue[state.index]?.embed;

/**
 * Позиция трека — отдельное хранилище: обновляется часто, и подписаны на неё
 * только полоски прогресса, а не всё приложение (иначе интерфейс тормозит).
 */
let time = 0, lastEmit = 0;
const timeListeners = new Set<() => void>();
function setTime(t: number, force = false) {
  time = t;
  const now = performance.now();
  if (!force && now - lastEmit < 250) return; // не чаще 4 раз в секунду
  lastEmit = now;
  timeListeners.forEach((f) => f());
}
export const progress = {
  subscribe(fn: () => void) { timeListeners.add(fn); return () => { timeListeners.delete(fn); }; },
  get: () => time,
};

export const player = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  get: () => state,
  current: () => state.queue[state.index] as Track | undefined,

  playList(tracks: Track[], start = 0) {
    let q = tracks;
    if (state.shuffle) { const first = tracks[start]; q = [first, ...shuffled(tracks.filter((_, i) => i !== start))]; start = 0; }
    set({ queue: q, index: -1 });
    load(start);
  },
  playNext(t: Track) { const q = state.queue.filter((x) => x.id !== t.id); q.splice(state.index + 1, 0, t); set({ queue: q }); },
  addToQueue(t: Track) { set({ queue: [...state.queue, t] }); },
  play() { set({ playing: true }); if (isEmbed()) scResume(); else audio.play().catch(onError); },
  pause() { set({ playing: false }); if (isEmbed()) scPause(); else audio.pause(); },
  toggle() { if (!player.current()) return; state.playing ? player.pause() : player.play(); },
  next() { skipSignal(); advance(1, true); },
  prev() { if (time > 5) player.seek(0); else advance(-1, true); },
  seek(sec: number) { if (isEmbed()) scSeek(sec); else audio.currentTime = sec; setTime(sec, true); },
  setAutoRadio(v: boolean) { set({ autoRadio: v }); },
  toggleShuffle() {
    const on = !state.shuffle;
    // перемешиваем только то, что ещё не играло
    const q = on ? [...state.queue.slice(0, state.index + 1), ...shuffled(state.queue.slice(state.index + 1))] : state.queue;
    set({ shuffle: on, queue: q });
  },
  cycleRepeat() { set({ repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off' }); },
};

function shuffled<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

function load(i: number) {
  const t = state.queue[i];
  if (!t) return;
  set({ index: i, loading: true, playing: true, duration: t.duration, error: undefined });
  setTime(0, true);
  if (t.embed) {
    audio.pause();
    audio.removeAttribute('src');
    scPlay(t.embed, sc).catch(() => set({ error: 'Плеер SoundCloud недоступен', loading: false }));
  } else {
    scStop();
    audio.src = t.streamUrl;
    audio.play().catch(onError);
  }
  pushHistory(t);
  updateMediaSession(t);
  maybeRefill();
}

function finished() {
  const t = player.current();
  if (t) record(t, SIGNAL.complete);
  advance(1);
}

async function advance(dir: number, manual = false) {
  if (!manual && state.repeat === 'one') { player.seek(0); player.play(); return; }
  const i = state.index + dir;
  if (i >= 0 && i < state.queue.length) return load(i);
  if (dir < 0) return;
  if (state.repeat === 'all' && state.queue.length) return load(0);
  if (state.autoRadio) { await refill(); if (state.index + 1 < state.queue.length) load(state.index + 1); }
}

// Пропуск в первые 30 сек — отрицательный сигнал для рекомендаций.
function skipSignal() {
  const t = player.current();
  if (t && time < 30) record(t, SIGNAL.skipEarly);
}

let refilling = false;
async function refill() {
  if (refilling) return;
  refilling = true;
  try {
    const more = await recommend(15, new Set(state.queue.map((t) => t.id)));
    set({ queue: [...state.queue, ...more] });
  } finally { refilling = false; }
}
function maybeRefill() { if (state.autoRadio && state.repeat === 'off' && state.queue.length - state.index <= 3) refill(); }

function onError(e: unknown) {
  if ((e as DOMException)?.name === 'NotAllowedError') { set({ playing: false, loading: false }); return; }
  set({ error: 'Не удалось воспроизвести трек', loading: false });
}

// ---- движок <audio> ----
audio.addEventListener('playing', () => set({ playing: true, loading: false }));
audio.addEventListener('pause', () => { if (!isEmbed()) set({ playing: false }); });
audio.addEventListener('waiting', () => set({ loading: true }));
audio.addEventListener('timeupdate', () => { if (!isEmbed()) setTime(audio.currentTime); });
audio.addEventListener('durationchange', () => { if (!isEmbed() && audio.duration && isFinite(audio.duration)) set({ duration: audio.duration }); });
audio.addEventListener('ended', finished);
audio.addEventListener('error', () => {
  if (isEmbed() || !audio.getAttribute('src')) return;
  set({ error: 'Трек недоступен, переключаю…' });
  setTimeout(() => advance(1, true), 800);
});

// ---- движок виджета SoundCloud ----
const sc: ScHandlers = {
  onPlay: () => set({ playing: true, loading: false }),
  onPause: () => set({ playing: false }),
  onFinish: finished,
  onProgress: (sec) => setTime(sec),
  onMeta: (meta) => {
    const t = player.current();
    if (!t?.embed) return;
    const updated = { ...t, ...meta };
    set({ queue: state.queue.map((x, i) => (i === state.index ? updated : x)), duration: meta.duration || state.duration });
    patchTrack(t.id, meta);
    updateMediaSession(updated);
  },
  onError: () => { set({ error: 'Трек SoundCloud недоступен, переключаю…' }); setTimeout(() => advance(1, true), 800); },
};

function updateMediaSession(t: Track) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title, artist: t.artist, album: 'Nocturne',
    artwork: t.artwork ? [{ src: t.artwork, sizes: '480x480' }] : [],
  });
}
if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => player.play());
  ms.setActionHandler('pause', () => player.pause());
  ms.setActionHandler('nexttrack', () => player.next());
  ms.setActionHandler('previoustrack', () => player.prev());
  ms.setActionHandler('seekto', (d) => { if (d.seekTime != null) player.seek(d.seekTime); });
}
