import { useEffect, useState } from 'react';
import type { Track } from '../types';
import { fromAll, activeSources } from '../sources';
import { recommend } from '../recommend/recommend';
import { player } from '../player/player';
import { TrackList } from './TrackList';
import { PlayerBar } from './Player';
import { useHistory, useLiked } from './hooks';

type Tab = 'home' | 'search' | 'library';

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  return (
    <div className="app">
      <main>{tab === 'home' ? <Home /> : tab === 'search' ? <Search /> : <Library />}</main>
      <PlayerBar />
      <nav>
        {([['home', 'Для вас'], ['search', 'Поиск'], ['library', 'Библиотека']] as const).map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
    </div>
  );
}

function Home() {
  const [recs, setRecs] = useState<Track[] | null>(null);
  const [trend, setTrend] = useState<Track[] | null>(null);
  const refresh = () => {
    setRecs(null);
    recommend(25).then(setRecs).catch(() => setRecs([]));
  };
  useEffect(() => {
    refresh();
    fromAll((s) => s.trending(15)).then(setTrend).catch(() => setTrend([]));
  }, []);
  return (
    <>
      <header>
        <h1>Для вас</h1>
        <div className="row">
          <button className="pill" disabled={!recs?.length} onClick={() => recs && player.playList(recs)}>▶ Слушать</button>
          <button className="pill ghost" onClick={refresh}>↻</button>
        </div>
      </header>
      <p className="muted small">Источники: {activeSources().map((s) => s.label).join(', ')}</p>
      {recs ? <TrackList tracks={recs} empty="Не удалось загрузить. Проверьте интернет." /> : <p className="muted">Подбираю…</p>}
      <h2>В тренде</h2>
      {trend ? <TrackList tracks={trend} /> : <p className="muted">Загрузка…</p>}
    </>
  );
}

function Search() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Track[] | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setRes(await fromAll((s) => s.search(q.trim(), 20)).catch(() => []));
    setBusy(false);
  };
  return (
    <>
      <form onSubmit={go}><input className="search" type="search" placeholder="Трек, артист, жанр…" value={q} onChange={(e) => setQ(e.target.value)} /></form>
      {busy ? <p className="muted">Ищу…</p> : res && <TrackList tracks={res} empty="Ничего не найдено" />}
    </>
  );
}

function Library() {
  const liked = useLiked();
  const history = useHistory();
  return (
    <>
      <h1>Понравилось</h1>
      <TrackList tracks={liked} empty="Нажмите ♥ на треке, чтобы сохранить" />
      <h2>Недавно</h2>
      <TrackList tracks={history.slice(0, 30)} empty="История пуста" />
    </>
  );
}
