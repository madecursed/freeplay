import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';

/** Заставка при запуске: NOCTURNE · listen. dream. repeat. */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setLeaving(true), 1600);
    const b = setTimeout(onDone, 2200);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [onDone]);
  return (
    <div className={`splash ${leaving ? 'is-leaving' : ''}`} onClick={onDone}>
      <div className="splash-halo" />
      <h1 className="logo logo-xl">NOCTURNE</h1>
      <p className="splash-tag">listen. dream. repeat.</p>
      <Icon name="sparkle" size={22} className="splash-star" />
    </div>
  );
}
