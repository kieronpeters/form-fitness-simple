import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { Activity } from '../types';
import { useAppStore } from '../store/appStore';
import { EntityImage } from './EntityImage';
import { Modal } from './Modal';
import { formatFields } from '../lib/training';

interface ActivityPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (activity: Activity) => void;
}

export function ActivityPicker({ open, onClose, onSelect }: ActivityPickerProps) {
  const activities = useAppStore((state) => state.activities);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const categories = useMemo(() => {
    const preferred = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Cardio', 'Core'];
    const present = new Set(activities.map((activity) => activity.category));
    return ['All', ...preferred.filter((category) => present.has(category as never))];
  }, [activities]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return activities.filter((activity) => {
      if (category !== 'All' && activity.category !== category) return false;
      if (!term) return true;
      return (
        activity.name.toLowerCase().includes(term) ||
        activity.category.toLowerCase().includes(term)
      );
    });
  }, [activities, category, query]);

  return (
    <Modal open={open} onClose={onClose} title="Add Activity" subtitle="Choose from your exercise library" fullScreen>
      <div className="search-field">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search activities..."
          aria-label="Search activities"
        />
      </div>
      <div className="chip-row">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={`chip${category === item ? ' is-active' : ''}`}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="picker-list">
        {filtered.map((activity) => (
          <button
            key={activity.id}
            type="button"
            className="picker-row"
            onClick={() => onSelect(activity)}
          >
            <EntityImage src={activity.image} alt="" className="picker-row__image" />
            <span className="picker-row__copy">
              <strong>{activity.name}</strong>
              <small>{activity.category}</small>
              <em>{formatFields(activity.fields)}</em>
            </span>
            <span className="picker-row__add"><Plus size={19} /></span>
          </button>
        ))}
        {!filtered.length && <p className="muted center">No activities match that search.</p>}
      </div>
    </Modal>
  );
}
