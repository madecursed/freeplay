import { useState } from 'react';
import { scResolve } from '../../player/scWidget';
import { addManyToPlaylist, createPlaylist } from '../../storage/store';
import { nav } from '../navigation';
import { Icon } from './Icon';

/** Импорт плейлиста/трека/исполнителя SoundCloud по ссылке в новый плейлист. */
export function ScImport({ initialUrl = '', onDone }: { initialUrl?: string; onDone?: () => void }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true); setErr('');
    try {
      const { title, tracks } = await scResolve(url);
      if (!tracks.length) throw new Error('В ссылке нет треков');
      const p = createPlaylist(title);
      addManyToPlaylist(p.id, tracks);
      onDone?.();
      nav.push({ kind: 'playlist', id: p.id });
    } catch (x) {
      setErr((x as Error).message || 'Не удалось импортировать');
    } finally { setBusy(false); }
  };

  return (
    <form className="sc-import glass" onSubmit={run}>
      <div className="inline-create">
        <Icon name="cloud" size={18} />
        <input autoFocus={!initialUrl} placeholder="Ссылка soundcloud.com/…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="submit" className="icon-btn" disabled={busy}>{busy ? <span className="spinner" /> : <Icon name="plus" />}</button>
      </div>
      {err ? <p className="err">{err}</p> : <p className="hint">Трек, плейлист или страница исполнителя. Играет через официальный плеер SoundCloud.</p>}
    </form>
  );
}
