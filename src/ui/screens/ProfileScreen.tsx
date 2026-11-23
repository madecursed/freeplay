import { useState } from 'react';
import { ALL_SOURCES } from '../../sources';
import { resetProfile } from '../../recommend/profile';
import { clearHistory } from '../../storage/store';
import { makePrimary, toggleSource, updateSettings } from '../../storage/settings';
import { useSettings } from '../hooks';
import { Icon } from '../components/Icon';
import { SceneArt } from '../components/SceneArt';

/** Профиль и настройки. */
export function ProfileScreen() {
  const st = useSettings();
  const [about, setAbout] = useState(false);
  const [pro, setPro] = useState(!!st.scProxy);
  const [done, setDone] = useState('');
  const flash = (msg: string) => { setDone(msg); setTimeout(() => setDone(''), 2000); };
  const sources = ALL_SOURCES.filter((s) => s.id !== 'soundcloud' || s.enabled());

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
        {sources.map((s) => {
          const idx = st.sources.indexOf(s.id);
          return (
            <li key={s.id}>
              <button className={`star ${idx === 0 ? 'is-on' : ''}`} title="Сделать основным" onClick={() => makePrimary(s.id)}>
                <Icon name="sparkle" size={16} />
              </button>
              <span onClick={() => toggleSource(s.id)}>
                {s.label}{idx === 0 && <em className="badge">основной</em>}{!s.enabled() && <small> · нужен ключ</small>}
              </span>
              <span className={`switch ${idx >= 0 ? 'on' : ''}`} onClick={() => toggleSource(s.id)} />
            </li>
          );
        })}
        <li className="col">
          <label>Jamendo Client ID — бесплатно на devportal.jamendo.com</label>
          <input placeholder="например, 1a2b3c4d" value={st.jamendoId} onChange={(e) => updateSettings({ jamendoId: e.target.value.trim() })} />
        </li>
      </ul>
      <p className="hint">✦ — основной источник: его треки идут первыми. SoundCloud без подписки — через «Библиотека → Импорт из SoundCloud» или вставьте ссылку в поиск.</p>

      <button className="settings-title as-btn" onClick={() => setPro(!pro)}>SoundCloud API (подписка Pro) {pro ? '▾' : '▸'}</button>
      {pro && (
        <ul className="settings-list glass">
          <li className="col">
            <label>Адрес прокси (worker/ в репозитории)</label>
            <input placeholder="https://….workers.dev" value={st.scProxy} onChange={(e) => updateSettings({ scProxy: e.target.value.trim() })} />
          </li>
        </ul>
      )}

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
          Nocturne 0.3 — плеер без рекламы. Музыка из открытых каталогов Jamendo, Internet Archive и Audius через их официальные API,
          SoundCloud — через официальный встраиваемый плеер. Права на треки принадлежат авторам. Вкус хранится только на этом устройстве.
        </p>
      )}
      {done && <div className="toast glass">{done}</div>}
    </div>
  );
}
