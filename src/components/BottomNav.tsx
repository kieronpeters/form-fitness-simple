import { NavLink } from 'react-router-dom';
import { ChartNoAxesCombined, Dumbbell, History, Layers3 } from 'lucide-react';

const items = [
  { to: '/', label: 'Workouts', icon: Dumbbell, end: true },
  { to: '/history', label: 'History', icon: History },
  { to: '/activities', label: 'Activities', icon: Layers3 },
  { to: '/statistics', label: 'Stats', icon: ChartNoAxesCombined },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <div className="bottom-nav__inner">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}
            >
              <Icon size={22} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
