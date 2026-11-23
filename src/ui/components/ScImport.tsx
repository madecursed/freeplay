import { useState } from 'react';
import { importMany } from '../../sync/scSync';
import { nav } from '../navigation';
import { Icon } from './Icon';

/** Импорт по ссылкам SoundCloud: одна или сразу несколько (каждая с новой строки). */
export function ScImport({ initialUrl = '', onDone }: { initialUrl?: string; onDone?: () => void }) {
  const [text, setText] = useState(initialUrl);
  const [step, setStep] = useState<[number, number] | null>(null);
  const [msg, setMsg] = useState('');
  const busy = !!step && step[0] < step[1];

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || busy) return;
    setMsg('');
    const r = await importMany(text, (d, t) => setStep([d, t]));
    setStep(null);
    if (!r.total) return setMsg('Не нашёл ссылок soundcloud.com');
    if (r.ok.length === 1 && !r.failed.length) { onDone?.(); return nav.push({ kind: 'playlist', id: r.ok[0].id }); }
    setMsg(`Импортировано: ${r.ok.length} из ${r.total}` + (r.failed.length ? '. Не открылись: ' + r.failed.join(', ') : ''));
    if (r.ok.length) { setText(''); onDone?.(); }
  };

  return (
    <form className="sc-import" onSubmit={run}>
      <textarea rows={Math.min(5, Math.max(2, text.split('\n').length))} autoFocus={!initialUrl}
        placeholder={'Ссылки soundcloud.com/… — по одной на строку'} value={text} onChange={(e) => setText(e.target.value)} />
      {!initialUrl && !msg && !busy && (
        <p className="hint">Плейлисты профиля: в приложении SoundCloud → Библиотека → Плейлисты → откройте плейлист → «Поделиться» → «Копировать ссылку». Вставьте сюда все ссылки и нажмите «Импорт» один раз.</p>
      )}
      <div className="sc-import-row">
        <span className="hint">{busy ? `Импорт ${step![0] + 1} из ${step![1]}…` : msg || 'Трек, плейлист или исполнитель'}</span>
        <button type="submit" className="pill" disabled={busy || !text.trim()}>{busy ? <span className="spinner" /> : <><Icon name="plus" size={16} /> Импорт</>}</button>
      </div>
    </form>
  );
}
