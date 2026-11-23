import { useEffect, useState } from 'react';
import type { Track } from '../../types';
import { fromAll } from '../../sources';
import { addSearch, clearSearches, getSearches } from '../../storage/store';
import { useAsync, useSettings, useStore } from '../hooks';
import { Icon } from '../components/Icon';
import { SourceChips } from '../components/SourceChips';
import { TrackList } from '../components/TrackList';

export function SearchScreen() {
  const { sources } = useSettings();
  const searches = useStore(getSearches);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [res, setRes] = useState<Track[] | null>(null);
  const [busy, setBusy] = useState(false);
  const popular = useAsync(() => fromAll((s) => s.trending(10)), [sources.join()]);

  // поиск с задержкой при вводе
  useEffect(() => {
    if (!query) { setRes(null); return; }
    let alive = true;
    setBusy(true);
    fromAll((s) => s.search(query, 25)).then((r) => alive && setRes(r)).catch(() => alive && setRes([])).finally(() => alive && setBusy(false));
    return () => { alive = false; };
  }, [query, sources.join()]);
  useEffect(() => { const id = setTimeout(() => setQuery(q.trim()), 600); return () => clearTimeout(id); }, [q]);

  const submit = (text: string) => { setQ(text); setQuery(text.trim()); if (text.trim()) addSearch(text.trim()); };

  return (
    <div className="screen">
      <form className="search-box glass" onSubmit={(e) => { e.preventDefault(); submit(q); (document.activeElement as HTMLElement)?.blur(); }}>
        <Icon name="search" size={18} />
        <input type="search" placeholder="Поиск музыки…" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button type="button" className="icon-btn" onClick={() => submit('')}><Icon name="close" size={16} /></button>}
      </form>
      <SourceChips />

      {query ? (
        busy ? <p className="empty">Ищу…</p> : <TrackList tracks={res ?? []} empty="Ничего не найдено" />
      ) : (
        <>
          {searches.length > 0 && (
            <>
              <div className="section-head"><h3>Недавние запросы</h3><button onClick={clearSearches}>Очистить</button></div>
              <ul className="link-list">
                {searches.map((s) => (
                  <li key={s} onClick={() => submit(s)}><Icon name="clock" size={18} /><span>{s}</span><Icon name="chevron" size={16} /></li>
                ))}
              </ul>
            </>
          )}
          <div className="section-head"><h3>Популярные</h3></div>
          {popular.loading ? <p className="empty">Загрузка…</p> : <TrackList tracks={popular.data ?? []} empty="Не удалось загрузить" />}
        </>
      )}
    </div>
  );
}
