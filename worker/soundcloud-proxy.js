// Cloudflare Worker (бесплатный тариф). Хранит секрет SoundCloud на сервере.
// Переменные окружения воркера: SC_CLIENT_ID, SC_CLIENT_SECRET.
// Маршруты: GET /search?q=&tags=&limit=  и  GET /stream/:id  (302 на mp3)
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
  const j = await res.json();
  token = j.access_token;
  tokenExp = Date.now() + (j.expires_in - 60) * 1000;
  return token;
}

const cors = { 'Access-Control-Allow-Origin': '*' };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const auth = { Authorization: `OAuth ${await getToken(env)}` };

    if (url.pathname === '/search') {
      const p = new URLSearchParams({ access: 'playable', limit: url.searchParams.get('limit') ?? '20', linked_partitioning: 'true' });
      for (const k of ['q', 'tags', 'genres']) if (url.searchParams.get(k)) p.set(k, url.searchParams.get(k));
      const r = await fetch(`https://api.soundcloud.com/tracks?${p}`, { headers: auth });
      return new Response(r.body, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const m = url.pathname.match(/^\/stream\/(\d+)$/);
    if (m) {
      const r = await fetch(`https://api.soundcloud.com/tracks/${m[1]}/streams`, { headers: auth });
      const j = await r.json();
      const mp3 = j.http_mp3_128_url;
      if (!mp3) return new Response('no stream', { status: 404, headers: cors });
      const s = await fetch(mp3, { headers: auth, redirect: 'manual' });
      return Response.redirect(s.headers.get('location') ?? mp3, 302);
    }
    return new Response('not found', { status: 404, headers: cors });
  },
};
