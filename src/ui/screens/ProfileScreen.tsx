import { useState } from 'react';
import { ALL_SOURCES } from '../../sources';
import { resetProfile } from '../../recommend/profile';
import { clearHistory } from '../../storage/store';
import { toggleSource, updateSettings } from '../../storage/settings';
import { useSettings } from '../hooks';
import { Icon } from '../components/Icon';
import { SceneArt } from '../components/SceneArt';

/** Профиль и настройки. */
export function ProfileScreen() {
  const st = useSettings();
  const [about, setAbout] = useState(false);
  const [done, setDone] = useState('');
  const flash = (msg: string) => { setDone(msg); setTimeout(() => setDone(''), 2000); };

  return (
    <div className="screen">
      <div className="profile-bg"><SceneArt hue={268} seed={21} /></div>
      <header className="screen-head"><h1>Настройки</h1><Icon name="sparkle" size={18} className="accent" /></header>

      <div className="profile-card">
        <div className="avatar big">{st.name.slice(0, 1).toUpperCase()}</div>
        <div>
          <input className="name-input" value={st.name} onChange={(e) => updateSettings({ name: e.target.value })} />
          <div className="track-sub">Профиль</div>
        </div>
      </div>

      <h3 className="settings-title">Источники музыки</h3>
      <ul className="settings-list glass">
        {ALL_SOURCES.map((s) => {
          const idx = st.sources.indexOf(s.id);
          return (
            <li key={s.id} onClick={() => toggleSource(s.id)}>
              <Icon name="cloud" />
              <span>{s.label}{idx === 0 && <em className="badge">основной</em>}{!s.enabled() && <small> · не настроен</small>}</span>
              <span className={`switch ${idx >= 0 ? 'on' : ''}`} />
            </li>
          );
        })}
        <li className="col">
          <label>Адрес прокси SoundCloud</label>
          <input placeholder="https://….workers.dev" value={st.scProxy} onChange={(e) => updateSettings({ scProxy: e.target.value.trim() })} />
        </li>
      </ul>
      <p className="hint">Основной — тот, что включён первым. Чтобы сделать SoundCloud основным, выключите остальные и включите их снова.</p>

      <h3 className="settings-title">Приложение</h3>
      <ul className="settings-list glass">
        <li className="is-disabled"><Icon name="sliders" /><span>Эквалайзер</span><small>скоро</small></li>
        <li className="is-disabled"><Icon name="lyrics" /><span>Тексты песен</span><small>скоро</small></li>
        <li onClick={() => { if (confirm('Сбросить рекомендации? Приложение забудет ваш вкус.')) { resetProfile(); flash('Рекомендации сброшены'); } }}>
          <Icon name="refresh" /><span>Сбросить рекомендации</span><Icon name="chevron" size={16} />
        </li>
        <li onClick={() => { clearHistory(); flash('История очищена'); }}><Icon name="clock" /><span>Очистить историю</span><Icon name="chevron" size={16} /></li>
        <li onClick={() => setAbout(!about)}><Icon name="info" /><span>О приложении</span><Icon name={about ? 'down' : 'chevron'} size={16} /></li>
      </ul>
      {about && (
        <p className="hint">
          Nocturne 0.2 — плеер без рекламы. Музыка из открытых каталогов SoundCloud, Jamendo и Audius через их официальные API;
          права на треки принадлежат авторам. Вкус хранится только на этом устройстве.
        </p>
      )}
      {done && <div className="toast glass">{done}</div>}
    </div>
  );
}
