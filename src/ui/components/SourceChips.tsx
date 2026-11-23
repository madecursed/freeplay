import { ALL_SOURCES } from '../../sources';
import { toggleSource } from '../../storage/settings';
import { useSettings } from '../hooks';

/** Выбор источников поиска. Первый выбранный — основной. */
export function SourceChips() {
  const { sources } = useSettings();
  return (
    <div className="chips">
      {ALL_SOURCES.map((s) => {
        const on = sources.includes(s.id);
        return (
          <button key={s.id} className={`chip ${on ? 'is-on' : ''} ${s.enabled() ? '' : 'is-off'}`} onClick={() => toggleSource(s.id)}>
            {s.label}{!s.enabled() && ' ·  не настроен'}
          </button>
        );
      })}
    </div>
  );
}
