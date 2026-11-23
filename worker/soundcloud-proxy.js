// Cloudflare Worker (бесплатный тариф). Хранит секрет SoundCloud на сервере.
// Секреты воркера: SC_CLIENT_ID, SC_CLIENT_SECRET.
// Маршруты: GET /search?q=&tags=&genres=&limit=  и  GET /stream/:id  (302 на аудио)
const ALLOWED = ['https://madecursed.github.io', 'http://localhost', 'http://192.168.'];

let token = null, tokenExp = 0;
async function getToken(env) {
  if (token && Date.now() < tokenExp) return token;
  const res = await fetch('https://secure.soundcloud.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${env.SC_CLIENT_ID}:${env.SC_CLIENT_SECRET}`),
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const j = await res.json();
  token = j.access_token;
  tokenExp = Date.now() + (j.expires_in - 60) * 1000;
  return token;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin');
    // чужие сайты не могут пользоваться вашим ключом (у <audio> Origin нет — его пропускаем)
    if (origin && !ALLOWED.some((a) => origin.startsWith(a))) return new Response('forbidden', { status: 403 });
    const cors = { 'Access-Control-Allow-Origin': origin ?? '*', Vary: 'Origin' };

    try {
      const auth = { Authorization: `OAuth ${await getToken(env)}` };

      if (url.pathname === '/search') {
        const p = new URLSearchParams({ access: 'playable', limit: url.searchParams.get('limit') ?? '20', linked_partitioning: 'true' });
        for (const k of ['q', 'tags', 'genres']) if (url.searchParams.get(k)) p.set(k, url.searchParams.get(k));
        const r = await fetch(`https://api.soundcloud.com/tracks?${p}`, { headers: auth });
        return new Response(r.body, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } });
      }

      const m = url.pathname.match(/^\/stream\/(\d+)$/);
      if (m) {
        const r = await fetch(`https://api.soundcloud.com/tracks/${m[1]}/streams`, { headers: auth });
        if (!r.ok) return new Response('no stream', { status: r.status, headers: cors });
        const j = await r.json();
        // mp3 предпочтительнее; HLS iPhone играет нативно
        const src = j.http_mp3_128_url || j.hls_mp3_128_url || j.hls_aac_160_url;
        if (!src) return new Response('no stream', { status: 404, headers: cors });
        const s = await fetch(src, { headers: auth, redirect: 'manual' });
        return Response.redirect(s.headers.get('location') ?? src, 302);
      }
      return new Response('Nocturne SoundCloud proxy', { status: 200, headers: cors });
    } catch (e) {
      return new Response(`proxy error: ${e.message}`, { status: 502, headers: cors });
    }
  },
};
