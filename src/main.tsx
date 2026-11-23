import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';
import './ui/theme.css';
import { autoSync } from './sync/scSync';
import { checkForUpdate } from './update';

createRoot(document.getElementById('root')!).render(<App />);

autoSync();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
  checkForUpdate();
  // приложение на iPhone чаще «просыпается», чем запускается заново — проверяем и при возврате
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
}
