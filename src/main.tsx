import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';
import { autoSync } from './sync/scSync';

createRoot(document.getElementById('root')!).render(<App />);

autoSync();

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js');
