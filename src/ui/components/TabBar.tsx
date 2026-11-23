import { nav, useNav, type Tab } from '../navigation';
import { Icon } from './Icon';

const TABS: [Tab, string, string][] = [
  ['home', 'home', 'Главная'],
  ['search', 'search', 'Поиск'],
  ['library', 'library', 'Библиотека'],
  ['profile', 'user', 'Профиль'],
];

export function TabBar() {
  const { tab } = useNav();
  return (
    <nav className="tab-bar">
      {TABS.map(([id, icon, label]) => (
        <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => nav.setTab(id)}>
          <Icon name={icon} size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
