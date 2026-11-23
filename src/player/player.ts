import type { Track } from '../types';
import { record, SIGNAL } from '../recommend/profile';
import { recommend } from '../recommend/recommend';
import { pushHistory } from '../storage/store';

/** Плеер-синглтон: очередь, фоновое воспроизведение, экран блокировки, автомикс, shuffle/repeat. */
export type Repeat = 'off' | 'all' | 'one';
export interface PlayerState {
  queue: Track[];
  index: number;
  playing: boolean;
  loading: boolean;
  time: number;
  duration: number;
  autoRadio: boolean;
  shuffle: boolean;
  repeat: Repeat;
  error?: string;
}

const audio = new Audio();
audio.preload = 'auto';
let state: PlayerState = {
  queue: [], index: -1, playing: false, loading: false, time: 0, duration: 0,
  autoRadio: true, shuffle: false, repeat: 'off',
};
const listeners = new Set<() => void>();
const set = (patch: Partial<PlayerState>) => { state = { ...state, ...patch }; listeners.forEach((f) => f()); };

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
  toggle() { if (!player.current()) return; audio.paused ? audio.play().catch(onError) : audio.pause(); },
  next() { skipSignal(); advance(1, true); },
  prev() { if (audio.currentTime > 5) audio.currentTime = 0; else advance(-1, true); },
  seek(sec: number) { audio.currentTime = sec; },
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
  set({ index: i, loading: true, time: 0, duration: t.duration, error: undefined });
  audio.src = t.streamUrl;
  audio.play().catch(onError);
  pushHistory(t);
  updateMediaSession(t);
  maybeRefill();
}

async function advance(dir: number, manual = false) {
  if (!manual && state.repeat === 'one') { audio.currentTime = 0; audio.play().catch(onError); return; }
  const i = state.index + dir;
  if (i >= 0 && i < state.queue.length) return load(i);
  if (dir < 0) return;
  if (state.repeat === 'all' && state.queue.length) return load(0);
  if (state.autoRadio) { await refill(); if (state.index + 1 < state.queue.length) load(state.index + 1); }
}

// Пропуск в первые 30 сек — отрицательный сигнал для рекомендаций.
function skipSignal() {
  const t = player.current();
  if (t && audio.currentTime < 30) record(t, SIGNAL.skipEarly);
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

audio.addEventListener('playing', () => set({ playing: true, loading: false }));
audio.addEventListener('pause', () => set({ playing: false }));
audio.addEventListener('waiting', () => set({ loading: true }));
audio.addEventListener('timeupdate', () => set({ time: audio.currentTime, duration: audio.duration || state.duration }));
audio.addEventListener('ended', () => { const t = player.current(); if (t) record(t, SIGNAL.complete); advance(1); });
audio.addEventListener('error', () => { set({ error: 'Трек недоступен, переключаю…' }); setTimeout(() => advance(1, true), 800); });

function updateMediaSession(t: Track) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title, artist: t.artist, album: 'Nocturne',
    artwork: t.artwork ? [{ src: t.artwork, sizes: '480x480' }] : [],
  });
}
if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => audio.play());
  ms.setActionHandler('pause', () => audio.pause());
  ms.setActionHandler('nexttrack', () => player.next());
  ms.setActionHandler('previoustrack', () => player.prev());
  ms.setActionHandler('seekto', (d) => { if (d.seekTime != null) audio.currentTime = d.seekTime; });
}
