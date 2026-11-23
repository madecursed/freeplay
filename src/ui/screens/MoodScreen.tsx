import { MOODS } from '../../recommend/moods';
import { nav } from '../navigation';
import { Icon } from '../components/Icon';

/** «Какое у тебя настроение?» → микс по тегам настроения, сразу играет. */
export function MoodScreen() {
  return (
    <div className="screen mood-screen">
      <header className="screen-head">
        <button className="icon-btn" onClick={nav.pop}><Icon name="back" /></button>
        <h3>Настроение</h3>
        <span style={{ width: 40 }} />
      </header>
      <div className="mood-burst"><Icon name="sparkle" size={90} /></div>
      <h1 className="mood-title">Какое у тебя<br />настроение?</h1>
      <div className="mood-grid">
        {MOODS.map((m) => (
          <button key={m.id} className="mood-chip glass" onClick={() => nav.push({ kind: 'mix', title: m.label, subtitle: 'настроение', tags: m.tags, hue: 280, autoplay: true })}>
            <Icon name={m.icon} size={20} filled={m.icon === 'heart'} />{m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
