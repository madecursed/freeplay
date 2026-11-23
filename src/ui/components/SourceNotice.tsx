import { activeSources } from '../../sources';
import { nav } from '../navigation';
import { useSettings } from '../hooks';

/** Подсказка, если выбранный источник (например, SoundCloud) ещё не настроен. */
export function SourceNotice() {
  useSettings();
  const { list, fallback } = activeSources();
  if (!fallback) return null;
  return (
    <button className="notice glass" onClick={() => nav.setTab('profile')}>
      Выбранный источник не настроен — сейчас играет {list.map((s) => s.label).join(', ') || 'ничего'}. <b>Настроить →</b>
    </button>
  );
}
