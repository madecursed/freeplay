import { useState } from 'react';
import { MOODS } from '../../recommend/moods';
import { nav } from '../navigation';
import { Icon } from '../components/Icon';

/** «Какое у тебя настроение?» → микс по тегам настроения из библиотеки и находок, сразу играет. */
export function MoodScreen() {
  const [picked, setPicked] = useState<string | null>(null);

  const choose = (id: string) => {
    const m = MOODS.find((x) => x.id === id)!;
    setPicked(id);
    // короткая подсветка выбора перед переходом
    setTimeout(() => nav.push({ kind: 'mix', title: m.label, subtitle: 'настроение', tags: m.tags, hue: 280, autoplay: true }), 180);
  };

  return (
    <div className="screen mood-screen">
      <NebulaBurst />
      <header className="mood-head">
        <button className="icon-btn" aria-label="Назад" onClick={nav.pop}><Icon name="back" /></button>
        <h3>Настроение</h3>
      </header>

      <h1 className="mood-title">Какое у тебя<br />настроение<span className="accent">?</span></h1>
      <p className="mood-sub">Соберу микс из вашей библиотеки и находок</p>

      <div className="mood-grid">
        {MOODS.map((m, i) => (
          <button key={m.id} className={`mood-chip ${picked === m.id ? 'is-picked' : ''}`}
            style={{ animationDelay: `${120 + i * 55}ms` }} onClick={() => choose(m.id)}>
            <Icon name={m.icon} size={19} filled={m.icon === 'heart'} />
            <span>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Туманность со звездой (как на референсе): свечение, вращающиеся кольца, лучи, искры. */
function NebulaBurst() {
  return (
    <svg className="mood-burst" viewBox="0 0 300 300" aria-hidden>
      <defs>
        <radialGradient id="mb-core">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".12" stopColor="#f5d0fe" />
          <stop offset=".35" stopColor="#c084fc" stopOpacity=".55" />
          <stop offset="1" stopColor="#7e22ce" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mb-star">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".25" stopColor="#f3e8ff" />
          <stop offset=".7" stopColor="#c084fc" />
          <stop offset="1" stopColor="#9333ea" />
        </radialGradient>
        <linearGradient id="mb-ring" x1="0" x2="1">
          <stop offset="0" stopColor="#c084fc" stopOpacity="0" />
          <stop offset=".5" stopColor="#e9d5ff" stopOpacity=".9" />
          <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="150" cy="150" r="140" fill="url(#mb-core)" opacity=".55" />
      <g className="mood-rings">
        <ellipse cx="150" cy="150" rx="128" ry="34" fill="none" stroke="url(#mb-ring)" strokeWidth="2" transform="rotate(-24 150 150)" />
        <ellipse cx="150" cy="150" rx="96" ry="22" fill="none" stroke="url(#mb-ring)" strokeWidth="1.2" opacity=".7" transform="rotate(38 150 150)" />
        <ellipse cx="150" cy="150" rx="140" ry="60" fill="none" stroke="url(#mb-ring)" strokeWidth=".8" opacity=".45" transform="rotate(8 150 150)" />
      </g>
      <path className="mood-star" fill="url(#mb-star)"
        d="M150 78 C151.5 132 156 146 222 150 C156 154 151.5 168 150 222 C148.5 168 144 154 78 150 C144 146 148.5 132 150 78Z" />
      <g fill="#f5d0fe" className="mood-sparks">
        <circle cx="60" cy="70" r="1.6" /><circle cx="240" cy="230" r="1.3" /><circle cx="230" cy="60" r="1" />
        <circle cx="80" cy="235" r="1.2" /><circle cx="270" cy="120" r=".9" />
      </g>
    </svg>
  );
}
