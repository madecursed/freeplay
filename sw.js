// Кэшируем только оболочку приложения. Аудио не кэшируем.
// Страницы (index.html, sw.js) всегда берём из сети мимо HTTP-кэша — иначе iPhone до 10 минут
// показывает старую версию (GitHub Pages отдаёт max-age=600). Файлы в assets/ с хэшем в имени — неизменны.
const CACHE = 'nocturne-v3';
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  e.respondWith(
    fetch(req, isPage ? { cache: 'no-store' } : undefined)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req))
  );
});
