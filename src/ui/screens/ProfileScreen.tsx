import { useState } from 'react';
import { resetProfile } from '../../recommend/profile';
import { clearHistory, getPlaylists } from '../../storage/store';
import { updateSettings } from '../../storage/settings';
import { connectProfile, syncAll, type ProfileStep } from '../../sync/scSync';
import { useSettings, useStore } from '../hooks';
import { Icon } from '../components/Icon';
import { SceneArt } from '../components/SceneArt';

/** Профиль: подключение SoundCloud, синхронизация, настройки. */
export function ProfileScreen() {
  const st = useSettings();
  const playlists = useStore(getPlaylists);
  const synced = playlists.filter((p) => p.sourceUrl);
  const lastSync = Math.max(0, ...synced.map((p) => p.syncedAt ?? 0));
  const [profile, setProfile] = useState(st.scProfile);
  const [busy, setBusy] = useState<'' | 'connect' | 'sync'>('');
  const [report, setReport] = useState('');
  const [about, setAbout] = useState(false);
  const [done, setDone] = useState('');
  const flash = (msg: string) => { setDone(msg); setTimeout(() => setDone(''), 2200); };

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.trim()) return;
    setBusy('connect'); setReport('Ищу профиль…');
    const label = (s: ProfileStep) =>
      s.state === 'loading' ? `${s.name}: загружаю…`
      : s.state === 'ok' ? `${s.name}: ${s.count} ✓`
      : s.state === 'empty' ? `${s.name}: нет`
      : `${s.name}: SoundCloud не ответил`;
    try {
      const r = await connectProfile(profile, (steps) => setReport(steps.map(label).join(' · ')));
      setProfile(st.scProfile || profile);
      const ok = r.steps.filter((s) => s.state === 'ok').length;
      setReport(`${r.user.name} — ` + r.steps.map(label).join(' · ') + (ok ? '. Плейлисты в Библиотеке.' : ''));
    } catch (x) { setReport((x as Error).message); } finally { setBusy(''); }
  };

  const syncNow = async () => {
    setBusy('sync');
    const n = await syncAll(true).catch(() => 0);
    setBusy(''); flash(`Обновлено плейлистов: ${n}`);
  };

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

      <h3 className="settings-title">SoundCloud</h3>
      <ul className="settings-list">
        <li className="col">
          <label>Ваш профиль — импортируем лайки и ваши треки</label>
          <form className="row" onSubmit={connect}>
            <input placeholder="ник или ссылка на профиль" autoCapitalize="none" autoCorrect="off" value={profile} onChange={(e) => setProfile(e.target.value)} />
            <button className="pill" disabled={!!busy}>{busy === 'connect' ? <span className="spinner" /> : st.scProfile ? 'Обновить' : 'Подключить'}</button>
          </form>
          {report && <small className="report">{report}</small>}
        </li>
        <li onClick={busy ? undefined : syncNow}>
          <Icon name="refresh" />
          <span>Синхронизировать сейчас<small className="block">
            {synced.length ? `${synced.length} плейлистов со ссылкой · ${lastSync ? new Date(lastSync).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'ещё не обновлялись'}` : 'нет импортированных плейлистов'}
          </small></span>
          {busy === 'sync' ? <span className="spinner" /> : <Icon name="chevron" size={16} />}
        </li>
      </ul>
      <p className="hint">Загрузка занимает до минуты. SoundCloud без API отдаёт только последние ~20 лайков — чтобы перенести все, соберите их в плейлист и импортируйте ссылкой. Плейлисты со ссылкой обновляются сами при запуске (раз в 6 часов).</p>

      <h3 className="settings-title">Приложение</h3>
      <ul className="settings-list">
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
          Nocturne 0.4 — плеер для вашей музыки из SoundCloud. Треки играют через официальный встраиваемый плеер SoundCloud;
          права принадлежат авторам. Библиотека и вкус хранятся только на этом устройстве.
        </p>
      )}
      {done && <div className="toast">{done}</div>}
    </div>
  );
}
