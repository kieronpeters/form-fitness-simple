import { useMemo, useState } from 'react';
import { Layers3, Plus, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EntityImage } from '../components/EntityImage';
import { useAppStore } from '../store/appStore';
import { formatFields } from '../lib/training';

export function ActivitiesPage() {
  const navigate = useNavigate();
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
    <div className="page page--with-nav">
      <PageHeader icon={Layers3} title="Activities" subtitle="Exercise library" />

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

      <div className="activity-list">
        {filtered.map((activity) => (
          <button
            key={activity.id}
            type="button"
            className="activity-card"
            onClick={() => navigate(`/activities/${activity.id}/edit`)}
          >
            <EntityImage src={activity.image} alt="" className="activity-card__image" />
            <span className="activity-card__copy">
              <strong>{activity.name}</strong>
              <small>{activity.category}</small>
              <em>{formatFields(activity.fields)}</em>
            </span>
            <span className="activity-card__chevron">›</span>
          </button>
        ))}
      </div>

      {!filtered.length && <p className="muted center">No activities match that search.</p>}

      <Link to="/activities/new" className="button button--primary button--full button--add">
        <Plus size={18} /> Add Custom Activity
      </Link>
    </div>
  );
}
