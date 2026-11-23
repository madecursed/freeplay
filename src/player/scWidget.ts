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
    artistId: s.user?.id ?? s.user_id,
    created: s.created_at ?? s.display_date,
    plays: s.playback_count,
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
  /** Виджет так и не начал играть — нужна кнопка ▶. */
  onStuck(): void;
}

/**
 * Два скрытых плеера SoundCloud: «активный» играет, «запасной» заранее загружает следующий трек.
 *
 * Зачем: iPhone разрешает звук в плеере SoundCloud только в ответ на нажатие. Загрузка нового трека
 * занимает секунду-две, и к её концу нажатие «протухает» — трек молчит. Если следующий трек уже загружен
 * в запасном плеере, при нажатии «вперёд» мы запускаем его синхронно, ещё внутри нажатия, — и звук идёт.
 */
interface Slot { iframe: HTMLIFrameElement; w: any; url: string; ready: boolean }
let SC: any = null;              // Widget API, когда загружен
let active: Slot | null = null;
let standby: Slot | null = null;
let handlers: ScHandlers;

function host(): HTMLElement {
  let el = document.getElementById('sc-host');
  if (!el) { el = document.createElement('div'); el.id = 'sc-host'; document.body.appendChild(el); }
  return el;
}

function fetchMeta() {
  active?.w.getCurrentSound((s: any) => {
    if (!s) return;
    const t = toTrack(s);
    handlers.onMeta({ title: t.title, artist: t.artist, artwork: t.artwork, duration: t.duration, genre: t.genre, tags: t.tags, permalink: t.permalink, artistId: t.artistId, created: t.created });
  });
}

let attempt = 0;
/** Пока активный плеер переключается на новый трек, его события (позиция, пауза старого трека) игнорируем. */
let switching = false;

/**
 * Проверяем через 1.2 и 3 с, повторяем play(); если к 5 с так и не заиграло — сообщаем,
 * чтобы кнопка показала ▶ и одно нажатие запустило трек.
 */
function ensurePlaying() {
  const my = ++attempt;
  const check = (retry: boolean) => active?.w.isPaused((paused: boolean) => {
    if (my !== attempt || !paused) return;
    if (retry) active?.w.play(); else handlers.onStuck();
  });
  setTimeout(() => check(true), 1200);
  setTimeout(() => check(true), 3000);
  setTimeout(() => check(false), 5000);
}

function markActive() {
  for (const s of [active, standby]) s?.iframe.classList.toggle('is-active', s === active);
}

function makeSlot(url: string, autoplay: boolean, onReady?: (slot: Slot) => void): Slot {
  const iframe = document.createElement('iframe');
  iframe.allow = 'autoplay; encrypted-media';
  iframe.title = 'SoundCloud';
  iframe.src = widgetSrc(url, autoplay);
  host().appendChild(iframe);
  const slot: Slot = { iframe, w: SC.Widget(iframe), url, ready: false };
  const E = SC.Widget.Events;
  const live = () => slot === active && !switching;   // события только от активного плеера
  slot.w.bind(E.READY, () => { slot.ready = true; onReady?.(slot); });
  slot.w.bind(E.PLAY, () => { if (live()) { handlers.onPlay(); fetchMeta(); } });
  slot.w.bind(E.PAUSE, () => { if (live()) handlers.onPause(); });
  slot.w.bind(E.FINISH, () => { if (live()) handlers.onFinish(); });
  slot.w.bind(E.PLAY_PROGRESS, (e: any) => { if (live()) handlers.onProgress(e.currentPosition / 1000); });
  slot.w.bind(E.ERROR, () => {
    if (slot === active) { switching = false; handlers.onError(); }
    else slot.ready = false;  // запасной не загрузился — просто не используем его
  });
  return slot;
}

function loadInto(slot: Slot, url: string, autoplay: boolean, done?: () => void) {
  slot.ready = false;
  slot.url = url;
  slot.w.load(url, {
    auto_play: autoplay, visual: false, show_comments: false, hide_related: true,
    callback: () => { slot.ready = true; done?.(); },
  });
}

/**
 * Запустить трек. Если он уже загружен в запасном плеере — переключение мгновенное и синхронное
 * (вызывать прямо из обработчика нажатия, без await перед этим).
 */
export function scPlay(url: string, h: ScHandlers): void {
  handlers = h;
  if (SC && standby?.ready && standby.url === url) {
    const prev = active;
    active = standby;
    standby = prev;
    switching = false;
    active.w.play();        // ← синхронно, внутри нажатия
    prev?.w.pause();
    markActive();
    fetchMeta();
    ensurePlaying();
    return;
  }
  void playAsync(url);
}

async function playAsync(url: string) {
  SC ??= await loadApi();
  if (!active) {
    active = makeSlot(url, true, (slot) => { if (slot === active) { slot.w.play(); fetchMeta(); ensurePlaying(); } });
    markActive();
    return;
  }
  switching = true;
  attempt++;              // отменяем проверки старого трека
  active.w.pause();       // старый трек замолкает сразу
  const slot = active;
  loadInto(slot, url, true, () => {
    if (slot !== active) return;
    switching = false; slot.w.play(); fetchMeta(); ensurePlaying();
  });
  setTimeout(() => { switching = false; }, 8000);   // страховка, если колбэк не пришёл
}

/** Заранее загрузить следующий трек в запасной плеер (без звука). */
export function scPreload(url?: string) {
  if (!url || !SC || !active) return;
  if (standby?.url === url && standby.ready) return;
  if (!standby) { standby = makeSlot(url, false); markActive(); return; }
  standby.w.pause();
  loadInto(standby, url, false);
}

/** Показать официальный плеер SoundCloud (когда iPhone не дал запустить звук без нажатия в нём). */
export function revealWidget(show = true) {
  document.getElementById('sc-host')?.classList.toggle('is-visible', show);
}

export const scPause = () => active?.w.pause();
export const scResume = () => { active?.w.play(); attempt++; };
export const scSeek = (sec: number) => active?.w.seekTo(sec * 1000);
export const scStop = () => { active?.w.pause(); standby?.w.pause(); };

// ---------- импорт по ссылке ----------
/** Превращает ссылку SoundCloud (трек, плейлист, исполнитель) в список треков. */
export async function scResolve(url: string): Promise<{ title: string; tracks: Track[]; userId?: string }> {
  url = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
  // oEmbed разворачивает короткие ссылки on.soundcloud.com и отдаёт каноническую api-ссылку для виджета
  const o = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`)
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!o) throw new Error('SoundCloud не нашёл эту ссылку — проверьте, что трек или плейлист публичный');
  const src = (o.html as string | undefined)?.match(/src="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&');
  const widgetUrl = (src && new URL(src).searchParams.get('url')) || url;
  const title = (o.title as string | undefined)?.replace(/ by [^]+$/, '') || 'SoundCloud';

  // одиночный трек — хватает данных oEmbed, виджет не нужен (длительность придёт при воспроизведении)
  const trackId = widgetUrl.match(/api\.soundcloud\.com\/tracks\/(\d+)/)?.[1];
  if (trackId) {
    const pageUrl = url.includes('on.soundcloud.com') ? undefined : url.split('?')[0];
    return {
      title,
      tracks: [{
        id: `scw:${trackId}`, source: 'soundcloud', title, artist: o.author_name ?? 'SoundCloud',
        artwork: o.thumbnail_url, duration: 0, streamUrl: '', embed: widgetUrl, tags: [], permalink: pageUrl,
      }],
    };
  }

  // профиль — вызывающий сам решает, что импортировать (лайки и/или треки)
  const userId = widgetUrl.match(/api\.soundcloud\.com\/users\/(\d+)$/)?.[1];
  if (userId) return { title: o.author_name ?? title, tracks: [], userId };

  return { title, tracks: await loadSounds(widgetUrl) };
}

/** Метаданные профиля по ссылке: id пользователя и имя (через oEmbed). */
export async function scUser(profileUrl: string): Promise<{ id: string; name: string }> {
  const o = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(profileUrl)}`)
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const id = (o?.html as string | undefined)?.match(/api\.soundcloud\.com%2Fusers%2F(\d+)/)?.[1];
  if (!id) throw new Error('Профиль не найден — проверьте ссылку soundcloud.com/ваш_ник');
  return { id, name: o.author_name ?? o.title ?? 'SoundCloud' };
}

/** Загружает список треков через скрытый виджет (плейлист, треки пользователя, лайки). */
export async function loadSounds(widgetUrl: string): Promise<Track[]> {
  const SC = await loadApi();
  return new Promise<Track[]>((resolve, reject) => {
    const f = document.createElement('iframe');
    f.src = widgetSrc(widgetUrl, false);
    f.style.cssText = 'position:fixed;left:-9999px;width:300px;height:160px;';
    document.body.appendChild(f);
    const w = SC.Widget(f);
    const done = (fn: () => void) => { clearTimeout(timer); f.remove(); fn(); };
    // лайки и длинные списки на телефоне грузятся до 20+ секунд — ждём с запасом
    const timer = setTimeout(() => done(() => reject(new Error('SoundCloud не ответил — попробуйте ещё раз'))), 45000);
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
}
