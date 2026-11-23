import { useMemo, useState } from 'react';
import { addSearch, clearSearches, getSearches, libraryTracks, subscribeStore } from '../../storage/store';
import { useStore } from '../hooks';
import { Icon } from '../components/Icon';
import { ScImport } from '../components/ScImport';
import { TrackList } from '../components/TrackList';
import { isSoundCloudUrl } from '../../player/scWidget';
import { useSyncExternalStore } from 'react';

/**
 * Поиск по вашей библиотеке SoundCloud (мгновенно, без лимитов) + вставка ссылок для импорта.
 * Поиска по всему SoundCloud без их API нет.
 */
export function SearchScreen() {
  const searches = useStore(getSearches);
  const version = useSyncExternalStore(subscribeStore, () => libraryTracks().length);
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const isLink = isSoundCloudUrl(q);

  const results = useMemo(() => {
    if (!query || isLink) return [];
    const words = query.split(/\s+/);
    return libraryTracks().filter((t) => {
      const hay = `${t.title} ${t.artist} ${t.genre ?? ''} ${t.tags.join(' ')}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    }).slice(0, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isLink, version]);

  return (
    <div className="screen">
      <form className="search-box" onSubmit={(e) => { e.preventDefault(); if (query && !isLink) addSearch(q.trim()); (document.activeElement as HTMLElement)?.blur(); }}>
        <Icon name="search" size={18} />
        <input type="search" placeholder="Поиск в библиотеке или ссылка SoundCloud" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button type="button" className="icon-btn" onClick={() => setQ('')}><Icon name="close" size={16} /></button>}
      </form>

      {isLink ? (
        <ScImport key={q} initialUrl={q.trim()} onDone={() => setQ('')} />
      ) : query ? (
        <TrackList tracks={results} empty="В библиотеке не нашлось. Вставьте ссылку SoundCloud, чтобы добавить музыку." />
      ) : (
        <>
          {searches.length > 0 && (
            <>
              <div className="section-head"><h3>Недавние запросы</h3><button onClick={clearSearches}>Очистить</button></div>
              <ul className="link-list">
                {searches.map((s) => (
                  <li key={s} onClick={() => setQ(s)}><Icon name="clock" size={18} /><span>{s}</span><Icon name="chevron" size={16} /></li>
                ))}
              </ul>
            </>
          )}
          <p className="hint">Ищет по названию, исполнителю, жанру и тегам среди импортированных треков. Чтобы добавить новую музыку — вставьте ссылку SoundCloud.</p>
        </>
      )}
    </div>
  );
}
