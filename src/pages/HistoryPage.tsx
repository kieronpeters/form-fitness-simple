import { History as HistoryIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { EntityImage } from '../components/EntityImage';
import { useAppStore } from '../store/appStore';
import { formatDuration, todayLabel } from '../lib/training';

export function HistoryPage() {
  const sessions = useAppStore((state) => state.sessions);

  return (
    <div className="page page--with-nav">
      <PageHeader icon={HistoryIcon} title="Workout History" subtitle="Your completed workouts" />
      {sessions.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No workouts logged yet"
          description="Finish a workout and it will appear here with its duration and recorded sets."
        />
      ) : (
        <div className="history-list">
          {sessions.map((session) => (
            <Link key={session.id} to={`/history/${session.id}`} className="history-card">
              <EntityImage src={session.programCover} alt="" className="history-card__image" />
              <span className="history-card__copy">
                <strong>{session.programName}</strong>
                <span className="history-card__meta">
                  <span>{todayLabel(session.completedAt)}</span>
                </span>
                <small>{formatDuration(session.durationSec)}</small>
              </span>
              <span className="history-card__chevron">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
