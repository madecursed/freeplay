import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { ART } from '../art';

/** Заставка (референс, экран 1): статуя ангела, кольцо-нимб, NOCTURNE · listen. dream. repeat. */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setLeaving(true), 1900);
    const b = setTimeout(onDone, 2500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [onDone]);
  return (
    <div className={`splash ${leaving ? 'is-leaving' : ''}`} onClick={onDone}>
      <img className="splash-photo" src={ART.splash} alt="" />
      <div className="splash-shade" />
      <div className="splash-halo" />
      <div className="splash-brand">
        <h1 className="logo logo-xl">NOCTURNE</h1>
        <p className="splash-tag">listen. dream. repeat.</p>
      </div>
      <Icon name="sparkle" size={20} className="splash-star" />
      <div className="splash-mist" />
    </div>
  );
}
