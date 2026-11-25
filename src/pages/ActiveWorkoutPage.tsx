import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Dumbbell, Flame, Trophy } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { SessionActivity } from '../types';
import { useAppStore, type WorkoutCompletion } from '../store/appStore';
import { toast } from '../store/toastStore';
import { formatDuration, formatSpeed, formatTargetText, formatWeight, sessionVolumeKg } from '../lib/training';
import { EntityImage } from '../components/EntityImage';
import { ActivityLogFields } from '../components/ActivityLogFields';
import { ConfirmDialog } from '../components/ConfirmDialog';

function previousFor(
  sessions: ReturnType<typeof useAppStore.getState>['sessions'],
  programId: string | null,
  activityId: string,
): SessionActivity | null {
  const sorted = [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  if (programId) {
    for (const session of sorted) {
      if (session.programId !== programId) continue;
      const activity = session.activities.find((item) => item.activityId === activityId);
      if (activity) return activity;
    }
  }
  for (const session of sorted) {
    const activity = session.activities.find((item) => item.activityId === activityId);
    if (activity) return activity;
  }
  return null;
}

function previousLabel(activity: SessionActivity, unit: 'kg' | 'lb'): string {
  if (activity.fields.includes('sets')) {
    const filled = activity.sets.filter((set) => set.reps != null || set.weightKg != null);
    if (!filled.length) return 'No previous result';
    const reps = filled.map((set) => set.reps ?? '—').join(' / ');
    const weights = [...new Set(filled.map((set) => set.weightKg).filter((weight): weight is number => weight != null))];
    return `Last: ${filled.length} ${filled.length === 1 ? 'set' : 'sets'} · ${reps} reps${weights.length ? ` @ ${formatWeight(Math.max(...weights), unit)}` : ''}`;
  }
  if (activity.fields.includes('duration')) {
    const pieces = [formatDuration(activity.durationSec ?? 0)];
    if (activity.speedKmh != null) pieces.push(formatSpeed(activity.speedKmh, unit));
    if (activity.incline != null) pieces.push(`incline ${activity.incline}`);
    return `Last: ${pieces.join(' · ')}`;
  }
  return 'No previous result';
}

export function ActiveWorkoutPage() {
  const navigate = useNavigate();
  const activeSession = useAppStore((state) => state.activeSession);
  const sessions = useAppStore((state) => state.sessions);
  const weightUnit = useAppStore((state) => state.settings.weightUnit);
  const updateActiveSet = useAppStore((state) => state.updateActiveSet);
  const addActiveSet = useAppStore((state) => state.addActiveSet);
  const removeActiveSet = useAppStore((state) => state.removeActiveSet);
  const updateActiveMetrics = useAppStore((state) => state.updateActiveMetrics);
  const finishWorkout = useAppStore((state) => state.finishWorkout);
  const discardWorkout = useAppStore((state) => state.discardWorkout);
  const [elapsed, setElapsed] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [completion, setCompletion] = useState<WorkoutCompletion | null>(null);

  useEffect(() => {
    if (!activeSession) return;
    const update = () => {
      setElapsed(Math.max(0, Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000)));
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [activeSession]);

  const previousMap = useMemo(() => {
    const map = new Map<string, SessionActivity | null>();
    for (const activity of activeSession?.activities ?? []) {
      map.set(activity.id, previousFor(sessions, activeSession?.programId ?? null, activity.activityId));
    }
    return map;
  }, [activeSession, sessions]);

  if (!activeSession && !completion) return <Navigate to="/" replace />;

  if (completion) {    const volume = sessionVolumeKg(completion.session);
    return (
      <div className="page page--finish">
        <div className="finish-hero">
          <span className="finish-hero__icon"><CheckCircle2 size={34} /></span>
          <p className="eyebrow">Workout complete</p>
          <h1>{completion.session.programName}</h1>
          <p>{formatDuration(completion.session.durationSec)} in the gym</p>
        </div>
        <div className="finish-stats">
          <div><strong>{completion.session.activities.length}</strong><span>Activities</span></div>
          <div><strong>{formatDuration(completion.session.durationSec)}</strong><span>Duration</span></div>
          <div><strong>{formatWeight(volume, weightUnit)}</strong><span>Volume</span></div>
        </div>
        {completion.improvements.length > 0 && (
          <section className="pr-card">
            <p className="eyebrow"><Trophy size={14} /> New personal records</p>
            {completion.improvements.map((improvement, index) => (
              <div key={`${improvement.activityId}-${index}`} className="pr-row">
                <span>{improvement.activityName}</span>
                <strong>{improvement.first ? 'First record' : improvement.fields.join(' · ')}</strong>
              </div>
            ))}
          </section>
        )}
        <button type="button" className="button button--primary button--full" onClick={() => navigate(`/history/${completion.session.id}`)}>
          View workout details
        </button>
        <button type="button" className="button button--ghost button--full" onClick={() => navigate('/')}>
          Done
        </button>
      </div>
    );
  }

  if (!activeSession) return <Navigate to="/" replace />;

  const session = activeSession;
  const handleFinish = () => {
    const result = finishWorkout();
    if (!result) {
      toast('Add at least one set or activity value before finishing.', 'error');
      return;
    }
    setCompletion(result);
  };

  return (
    <div className="page page--active">
      <header className="workout-topbar">
        <button type="button" className="icon-button" onClick={() => navigate('/')} aria-label="Leave workout">
          <ArrowLeft size={22} />
        </button>
        <div className="workout-topbar__title">
          <h1>{session.programName}</h1>
          <span className="live-timer"><Clock3 size={14} /> {formatDuration(elapsed, 'clock')}</span>
        </div>
        <button type="button" className="icon-button" onClick={() => setDiscardOpen(true)} aria-label="Discard workout">
          <Flame size={21} />
        </button>
      </header>

      <section className="workout-hero">
        <EntityImage src={session.programCover} alt="" className="workout-hero__image" />
        <div className="workout-hero__overlay">
          <span>{session.activities.length} activities</span>
          <strong>In progress</strong>
        </div>
      </section>

      <div className="workout-activities">
        {session.activities.map((activity, index) => {
          const previous = previousMap.get(activity.id);
          return (
            <section className="workout-activity" key={activity.id}>
              <div className="workout-activity__header">
                <EntityImage src={activity.image} alt="" className="workout-activity__image" />
                <div className="workout-activity__copy">
                  <span className="workout-activity__index">0{index + 1}</span>
                  <h2>{activity.label}</h2>
                  <p>{activity.category}</p>
                </div>
              </div>
              <div className="target-strip">
                <span>Target</span>
                <strong>{formatTargetText(activity.target, weightUnit)}</strong>
              </div>
              {previous && <p className="previous-line">{previousLabel(previous, weightUnit)}</p>}
              {activity.target.note && <p className="programme-note">{activity.target.note}</p>}
              <ActivityLogFields
                activity={activity}
                weightUnit={weightUnit}
                onSetChange={(setId, patch) => updateActiveSet(activity.id, setId, patch)}
                onAddSet={() => addActiveSet(activity.id)}
                onRemoveSet={(setId) => removeActiveSet(activity.id, setId)}
                onMetricsChange={(patch) => updateActiveMetrics(activity.id, patch)}
              />
            </section>
          );
        })}
      </div>

      <div className="workout-finish-bar">
        <button type="button" className="button button--primary button--full" onClick={handleFinish}>
          <Dumbbell size={18} /> Finish &amp; Save Workout
        </button>
      </div>

      <ConfirmDialog
        open={discardOpen}
        title="Leave this workout?"
        message="This will discard the workout and everything you have entered. Use the back arrow instead if you want to leave it resumable from Workouts."
        confirmLabel="Discard workout"
        danger
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => {
          discardWorkout();
          navigate('/');
        }}
      />
    </div>
  );
}
