import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';
import './ui/theme.css';
import { autoSync } from './sync/scSync';
import { checkForUpdate } from './update';
import { scWarmup } from './player/scWidget';
import { getHistory, libraryTracks } from './storage/store';
import { Capacitor } from '@capacitor/core';

createRoot(document.getElementById('root')!).render(<App />);

autoSync();

// плеер SoundCloud создаём заранее (последний трек, на паузе) — к первому нажатию он готов
scWarmup((getHistory()[0] ?? libraryTracks()[0])?.embed);

// В нативном приложении (Capacitor) обновления приходят новым .ipa — service worker и проверка сайта не нужны
if (Capacitor.isNativePlatform()) document.documentElement.classList.add('native');
else if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
  checkForUpdate();
  // приложение на iPhone чаще «просыпается», чем запускается заново — проверяем и при возврате
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
}
