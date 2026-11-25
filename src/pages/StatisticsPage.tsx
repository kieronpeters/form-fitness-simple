import { useMemo } from 'react';
import {
  BarChart3,
  Clock3,
  Dumbbell,
  Flame,
  Layers3,
  Star,
  Trophy,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { EntityImage } from '../components/EntityImage';
import { useAppStore } from '../store/appStore';
import {
  computeStats,
  formatDuration,
  formatWeight,
  toDisplayWeight,
} from '../lib/training';

function volumeLabel(volumeKg: number, unit: 'kg' | 'lb'): string {
  const value = Math.round(toDisplayWeight(volumeKg, unit));
  return `${value.toLocaleString('en-GB')} ${unit}`;
}

function recordLabel(record: ReturnType<typeof computeStats>['records'][number], unit: 'kg' | 'lb'): string {
  if (record.weightKg != null) return formatWeight(record.weightKg, unit);
  if (record.durationSec != null) return formatDuration(record.durationSec);
  if (record.reps != null) return `${record.reps} reps`;
  if (record.sets != null) return `${record.sets} sets`;
  return '—';
}

export function StatisticsPage() {
  const sessions = useAppStore((state) => state.sessions);
  const programs = useAppStore((state) => state.programs);
  const weightUnit = useAppStore((state) => state.settings.weightUnit);
  const stats = useMemo(() => computeStats(sessions), [sessions]);

  return (
    <div className="page page--with-nav">
      <PageHeader icon={BarChart3} title="Statistics" subtitle="Your training overview" />

      <div className="stat-grid">
        <article className="stat-card">
          <span className="stat-card__icon"><Dumbbell size={23} /></span>
          <strong>{stats.workoutCount}</strong>
          <span>Workouts Completed</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon"><Clock3 size={23} /></span>
          <strong>{formatDuration(stats.totalDurationSec)}</strong>
          <span>Time in Gym</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon"><Trophy size={23} /></span>
          <strong>{stats.records.length}</strong>
          <span>Personal Records</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon"><Layers3 size={23} /></span>
          <strong>{programs.length}</strong>
          <span>Programmes Created</span>
        </article>
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Overall progress</p>
            <h2>All-time training</h2>
          </div>
          <Star size={19} className="accent-icon" />
        </div>
        <div className="progress-rows">
          <div className="progress-row">
            <span className="progress-row__icon"><BarChart3 size={19} /></span>
            <span>Total volume lifted</span>
            <strong>{volumeLabel(stats.totalVolumeKg, weightUnit)}</strong>
          </div>
          <div className="progress-row">
            <span className="progress-row__icon"><Clock3 size={19} /></span>
            <span>Longest workout</span>
            <strong>{formatDuration(stats.longestDurationSec)}</strong>
          </div>
          <div className="progress-row">
            <span className="progress-row__icon"><Flame size={19} /></span>
            <span>Current streak</span>
            <strong>{stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}</strong>
          </div>
          <div className="progress-row">
            <span className="progress-row__icon"><Star size={19} /></span>
            <span>Best streak</span>
            <strong>{stats.bestStreak} {stats.bestStreak === 1 ? 'day' : 'days'}</strong>
          </div>
        </div>
      </section>

      <section className="panel panel--compact">
        <div className="mini-total-grid">
          <div><strong>{stats.totalSets}</strong><span>Total sets</span></div>
          <div><strong>{stats.totalReps}</strong><span>Total reps</span></div>
          <div><strong>{sessions.length ? formatDuration(stats.totalDurationSec / sessions.length) : '0 min'}</strong><span>Average session</span></div>
        </div>
      </section>

      {stats.records.length > 0 ? (
        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Best efforts</p>
              <h2>Personal records</h2>
            </div>
            <Trophy size={19} className="accent-icon" />
          </div>
          <div className="record-list">
            {stats.records.slice(0, 5).map((record) => (
              <div className="record-row" key={record.activityId}>
                <EntityImage src={record.image} alt="" className="record-row__image" />
                <span>{record.activityName}</span>
                <strong>{recordLabel(record, weightUnit)}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="stats-empty">
          Complete a workout to start building personal records, streaks and training totals.
        </p>
      )}
    </div>
  );
}
