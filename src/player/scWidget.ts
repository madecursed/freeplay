import type { Track } from '../types';

/**
 * Официальный встраиваемый плеер SoundCloud (Widget API). Ключ API не нужен.
 * https://developers.soundcloud.com/docs/api/html5-widget
 * Ограничения: нет поиска (только ссылки); на iPhone фоновое воспроизведение iframe не гарантируется.
 */
declare global { interface Window { SC?: any } }

let api: Promise<any> | null = null;
function loadApi(): Promise<any> {
  api ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://w.soundcloud.com/player/api.js';
    s.onload = () => resolve(window.SC);
    s.onerror = () => { api = null; reject(new Error('SoundCloud widget недоступен')); };
    document.head.appendChild(s);
  });
  return api;
}

const widgetSrc = (url: string, autoplay: boolean) =>
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=${autoplay}&visual=false&show_comments=false` +
  `&hide_related=true&show_reposts=false&show_teaser=false&show_user=true&color=%23c084fc`;

export const isSoundCloudUrl = (s: string) => /^(https?:\/\/)?(www\.|m\.|on\.)?soundcloud\.com\/\S+/i.test(s.trim());

function toTrack(s: any): Track {
  const tags = (s.tag_list ?? '').match(/"[^"]+"|\S+/g)?.map((x: string) => x.replace(/"/g, '').toLowerCase()) ?? [];
  return {
    id: `scw:${s.id}`,
    source: 'soundcloud',
    title: s.title ?? 'Трек SoundCloud',
    artist: s.user?.username ?? 'SoundCloud',
    artwork: (s.artwork_url ?? s.user?.avatar_url)?.replace('-large', '-t500x500'),
    duration: Math.round((s.duration ?? 0) / 1000),
    streamUrl: '',
    embed: s.permalink_url ?? `https://api.soundcloud.com/tracks/${s.id}`,
    genre: s.genre || undefined,
    tags: s.genre ? [s.genre.toLowerCase(), ...tags] : tags,
    permalink: s.permalink_url,
  };
}

// ---------- воспроизведение ----------
export interface ScHandlers {
  onPlay(): void;
  onPause(): void;
  onFinish(): void;
  onProgress(sec: number): void;
  onMeta(t: Partial<Track>): void;
  onError(): void;
}

let widget: any = null;
let handlers: ScHandlers;

function host(): HTMLElement {
  let el = document.getElementById('sc-host');
  if (!el) { el = document.createElement('div'); el.id = 'sc-host'; document.body.appendChild(el); }
  return el;
}

function fetchMeta() {
  widget?.getCurrentSound((s: any) => {
    if (!s) return;
    const t = toTrack(s);
    handlers.onMeta({ title: t.title, artist: t.artist, artwork: t.artwork, duration: t.duration, genre: t.genre, tags: t.tags, permalink: t.permalink });
  });
}

export async function scPlay(url: string, h: ScHandlers) {
  handlers = h;
  const SC = await loadApi();
  if (!widget) {
    const iframe = document.createElement('iframe');
    iframe.allow = 'autoplay; encrypted-media';
    iframe.title = 'SoundCloud';
    iframe.src = widgetSrc(url, true);
    host().appendChild(iframe);
    widget = SC.Widget(iframe);
    const E = SC.Widget.Events;
    widget.bind(E.READY, () => { widget.play(); fetchMeta(); });
    widget.bind(E.PLAY, () => { handlers.onPlay(); fetchMeta(); });
    widget.bind(E.PAUSE, () => handlers.onPause());
    widget.bind(E.FINISH, () => handlers.onFinish());
    widget.bind(E.PLAY_PROGRESS, (e: any) => handlers.onProgress(e.currentPosition / 1000));
    widget.bind(E.ERROR, () => handlers.onError());
  } else {
    widget.load(url, { auto_play: true, visual: false, show_comments: false, hide_related: true, callback: () => { widget.play(); fetchMeta(); } });
  }
}

export const scPause = () => widget?.pause();
export const scResume = () => widget?.play();
export const scSeek = (sec: number) => widget?.seekTo(sec * 1000);
export const scStop = () => widget?.pause();

// ---------- импорт по ссылке ----------
/** Превращает ссылку SoundCloud (трек, плейлист, исполнитель) в список треков. */
export async function scResolve(url: string): Promise<{ title: string; tracks: Track[] }> {
  url = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
  const SC = await loadApi();
  const titleP = fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`)
    .then((r) => (r.ok ? r.json() : null)).then((j) => (j?.title as string | undefined)?.replace(/ by .+$/, '')).catch(() => undefined);

  const tracks = await new Promise<Track[]>((resolve, reject) => {
    const f = document.createElement('iframe');
    f.src = widgetSrc(url, false);
    f.style.cssText = 'position:fixed;left:-9999px;width:300px;height:160px;';
    document.body.appendChild(f);
    const w = SC.Widget(f);
    const done = (fn: () => void) => { clearTimeout(timer); f.remove(); fn(); };
    const timer = setTimeout(() => done(() => reject(new Error('Не удалось открыть ссылку'))), 20000);
    w.bind(SC.Widget.Events.ERROR, () => done(() => reject(new Error('Ссылка недоступна'))));
    w.bind(SC.Widget.Events.READY, () => {
      // виджет догружает данные длинных плейлистов постепенно — ждём несколько раз
      const collect = (attempt: number) => w.getSounds((sounds: any[]) => {
        if (sounds.some((s) => !s.title) && attempt < 5) return setTimeout(() => collect(attempt + 1), 1500);
        done(() => resolve(sounds.map(toTrack)));
      });
      collect(0);
    });
  });
  const title = (await titleP) ?? decodeURIComponent(url.split('/').filter(Boolean).pop() ?? 'SoundCloud');
  return { title, tracks };
}
