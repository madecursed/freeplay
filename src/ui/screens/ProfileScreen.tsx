import { useState } from 'react';
import { resetProfile } from '../../recommend/profile';
import { clearHistory, getPlaylists } from '../../storage/store';
import { updateSettings } from '../../storage/settings';
import { connectProfile, syncAll, type ProfileStep } from '../../sync/scSync';
import { useSettings, useStore } from '../hooks';
import { ART } from '../art';
import { refreshDiscovery } from '../../recommend/discovery';
import { Icon } from '../components/Icon';

/** Профиль и настройки (референс, экран «Настройки»): фото луны над лесом, аватар, пункты с иконками. */
export function ProfileScreen() {
  const st = useSettings();
  const playlists = useStore(getPlaylists);
  const synced = playlists.filter((p) => p.sourceUrl);
  const lastSync = Math.max(0, ...synced.map((p) => p.syncedAt ?? 0));
  const [profile, setProfile] = useState(st.scProfile);
  const [busy, setBusy] = useState<'' | 'connect' | 'sync'>('');
  const [report, setReport] = useState('');
  const [open, setOpen] = useState<'' | 'about' | 'look'>('');
  const [done, setDone] = useState('');
  const flash = (msg: string) => { setDone(msg); setTimeout(() => setDone(''), 2200); };
  const toggle = (k: 'about' | 'look') => setOpen(open === k ? '' : k);

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
      const ok = r.steps.some((s) => s.state === 'ok');
      setReport(`${r.user.name} — ` + r.steps.map(label).join(' · ') + (ok ? '. Плейлисты в Библиотеке.' : ''));
    } catch (x) { setReport((x as Error).message); } finally { setBusy(''); }
  };

  const syncNow = async () => {
    setBusy('sync');
    const n = await syncAll(true).catch(() => 0);
    setBusy(''); flash(`Обновлено плейлистов: ${n}`);
  };

  return (
    <div className="screen profile-screen">
      <div className="profile-photo"><img src={ART.profile} alt="" /></div>
      <header className="screen-head"><h1>Настройки</h1><Icon name="sparkle" size={18} className="accent" /></header>

      <div className="profile-card">
        <div className="avatar big">{st.name.slice(0, 1).toUpperCase()}</div>
        <div className="track-meta">
          <input className="name-input" value={st.name} aria-label="Имя" onChange={(e) => updateSettings({ name: e.target.value })} />
          <div className="track-sub">{st.scProfile ? st.scProfile.replace('https://', '') : 'Профиль'}</div>
        </div>
      </div>

      <ul className="settings-list">
        <li onClick={() => toggle('look')}><Icon name="edit" /><span>Оформление</span><Icon name={open === 'look' ? 'down' : 'chevron'} size={16} /></li>
        {open === 'look' && (
          <li className="col">
            <label>Обложки треков</label>
            <div className="segmented small">
              <button className={st.coverStyle === 'nocturne' ? 'is-on' : ''} onClick={() => updateSettings({ coverStyle: 'nocturne' })}>В стиле Nocturne</button>
              <button className={st.coverStyle === 'original' ? 'is-on' : ''} onClick={() => updateSettings({ coverStyle: 'original' })}>Оригинальные</button>
            </div>
          </li>
        )}
        <li onClick={() => { updateSettings({ deezer: !st.deezer }); refreshDiscovery(true).catch(() => {}); }}>
          <Icon name="sparkle" />
          <span>Похожие исполнители в автоплее<small className="block">по данным Deezer — как станции SoundCloud</small></span>
          <span className={`switch ${st.deezer ? 'on' : ''}`} />
        </li>
        <li className="is-disabled"><Icon name="sliders" /><span>Эквалайзер</span><small>скоро</small></li>
        <li className="is-disabled"><Icon name="lyrics" /><span>Тексты песен</span><small>скоро</small></li>
        <li onClick={() => toggle('about')}><Icon name="info" /><span>О приложении</span><Icon name={open === 'about' ? 'down' : 'chevron'} size={16} /></li>
        {open === 'about' && (
          <li className="col about">
            <p>Nocturne 0.5 — плеер для вашей музыки из SoundCloud без рекламы. Треки играют через официальный встраиваемый плеер SoundCloud, права принадлежат авторам. Библиотека и вкус хранятся только на этом устройстве.</p>
            <p>Фото: Wikimedia Commons (CC BY, CC BY-SA, Public domain) — AnBuKu, Robert Lamb, Humphrey Bolton, Manasij Pal Chowdhury, Rhododendrites, Vian, Brady Smith, Le085, W.carter, Joshua Tree NP, Nelizaj. Обработаны в фиолетовый дуотон.</p>
            <a className="link" href="https://github.com/madecursed/freeplay/blob/main/docs/ART_CREDITS.md" target="_blank" rel="noreferrer">Полный список источников и лицензий →</a>
          </li>
        )}
      </ul>

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
      <p className="hint">Загрузка занимает до минуты. Без API SoundCloud отдаёт только последние ~20 лайков — чтобы перенести все, соберите их в плейлист и импортируйте ссылкой.</p>

      <h3 className="settings-title">Данные</h3>
      <ul className="settings-list">
        <li onClick={() => { if (confirm('Сбросить рекомендации? Приложение забудет ваш вкус.')) { resetProfile(); flash('Рекомендации сброшены'); } }}>
          <Icon name="sparkle" /><span>Сбросить рекомендации</span><Icon name="chevron" size={16} />
        </li>
        <li onClick={() => { clearHistory(); flash('История очищена'); }}><Icon name="clock" /><span>Очистить историю</span><Icon name="chevron" size={16} /></li>
      </ul>
      {done && <div className="toast">{done}</div>}
    </div>
  );
}
