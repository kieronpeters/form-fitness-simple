import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Pause,
  Play,
  TimerReset,
  Trophy,
  X,
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { SessionActivity } from '../types';
import { useAppStore, type WorkoutCompletion } from '../store/appStore';
import { toast } from '../store/toastStore';
import {
  formatDuration,
  formatSpeed,
  formatTargetText,
  formatWeight,
  sessionElapsedSec,
  sessionVolumeKg,
} from '../lib/training';
import { useCountdown } from '../hooks/useCountdown';
import { EntityImage } from '../components/EntityImage';
import { ActivityLogFields } from '../components/ActivityLogFields';
import { ActivityTimer } from '../components/ActivityTimer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';

function previousFor(
  sessions: ReturnType<typeof useAppStore.getState>['sessions'],
  activityId: string,
): SessionActivity | null {
  const sorted = [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
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
  const pauseWorkout = useAppStore((state) => state.pauseWorkout);
  const resumeWorkout = useAppStore((state) => state.resumeWorkout);
  const finishWorkout = useAppStore((state) => state.finishWorkout);
  const discardWorkout = useAppStore((state) => state.discardWorkout);
  const [now, setNow] = useState(() => Date.now());
  const [cancelOpen, setCancelOpen] = useState(false);
  const [completion, setCompletion] = useState<WorkoutCompletion | null>(null);
  const customTimer = useCountdown();
  const [customOpen, setCustomOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('5');
  const [customSeconds, setCustomSeconds] = useState('0');

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const previousMap = useMemo(() => {
    const map = new Map<string, SessionActivity | null>();
    for (const activity of activeSession?.activities ?? []) {
      map.set(activity.id, previousFor(sessions, activity.activityId));
    }
    return map;
  }, [activeSession, sessions]);

  if (!activeSession && !completion) return <Navigate to="/" replace />;

  if (completion) {
    const volume = sessionVolumeKg(completion.session);
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
  const paused = Boolean(session.pausedAt);
  const elapsed = sessionElapsedSec(session, now);
  const customTotal = Math.max(0, (Number(customMinutes) || 0) * 60 + (Number(customSeconds) || 0));
  const customLabel = customTimer.completed
    ? 'Done'
    : formatDuration(customTimer.remainingSec, 'clock');

  const handleFinish = () => {
    const result = finishWorkout();
    if (!result) {
      toast('Add at least one set or activity value before finishing.', 'error');
      return;
    }
    setCompletion(result);
  };

  const startCustom = () => {
    if (customTotal < 1) {
      toast('Set a timer duration greater than zero.', 'error');
      return;
    }
    customTimer.start(customTotal);
    setCustomOpen(false);
  };

  return (
    <div className="page page--active">
      <header className="workout-topbar">
        <button type="button" className="icon-button" onClick={() => navigate('/')} aria-label="Leave workout">
          <ArrowLeft size={22} />
        </button>
        <div className="workout-topbar__title">
          <h1>{session.programName}</h1>
          <div className="workout-timer-line">
            <span className={`live-timer${paused ? ' is-paused' : ''}`}>
              <Clock3 size={14} /> {formatDuration(elapsed, 'clock')}
              {paused && <em>Paused</em>}
            </span>
            <button
              type="button"
              className="timer-control"
              onClick={() => (paused ? resumeWorkout() : pauseWorkout())}
              aria-label={paused ? 'Resume workout timer' : 'Pause workout timer'}
            >
              {paused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
            </button>
          </div>
        </div>
        <button type="button" className="icon-button" onClick={() => setCancelOpen(true)} aria-label="Cancel workout">
          <X size={22} />
        </button>
      </header>

      <section className="workout-hero">
        <EntityImage src={session.programCover} alt="" className="workout-hero__image" />
        <div className="workout-hero__overlay">
          <span>{session.activities.length} activities</span>
          <strong>{paused ? 'Paused' : 'In progress'}</strong>
        </div>
      </section>

      <div className="workout-tools">
        <button type="button" className="timer-tool" onClick={() => setCustomOpen(true)}>
          <TimerReset size={16} />
          <span>Custom timer</span>
        </button>
        {customTimer.durationSec > 0 && (
          <div className={`custom-timer-inline${customTimer.running ? ' is-running' : ''}${customTimer.completed ? ' is-complete' : ''}`}>
            <span>{customLabel}</span>
            {!customTimer.completed && (
              <button
                type="button"
                onClick={() => (customTimer.running ? customTimer.pause() : customTimer.resume())}
                aria-label={customTimer.running ? 'Pause custom timer' : 'Resume custom timer'}
              >
                {customTimer.running ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
              </button>
            )}
            <button type="button" onClick={customTimer.reset} aria-label="Reset custom timer">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

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
              {activity.fields.includes('duration') && (
                <div className="activity-timer-row">
                  <span>Timer</span>
                  <ActivityTimer label={activity.label} seconds={activity.durationSec} />
                </div>
              )}
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

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Custom timer"
        subtitle="Runs independently of the workout timer."
        footer={
          <>
            <button type="button" className="button button--ghost" onClick={() => setCustomOpen(false)}>Close</button>
            <button type="button" className="button button--primary" onClick={startCustom}>Start timer</button>
          </>
        }
      >
        <div className="timer-inputs">
          <label className="field">
            <span>Minutes</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={customMinutes}
              onChange={(event) => setCustomMinutes(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Seconds</span>
            <input
              type="number"
              min={0}
              max={59}
              inputMode="numeric"
              value={customSeconds}
              onChange={(event) => setCustomSeconds(event.target.value)}
            />
          </label>
        </div>
        {customTimer.durationSec > 0 && (
          <div className="custom-timer-sheet-value">
            <strong>{customLabel}</strong>
            <span>{customTimer.running ? 'Running' : customTimer.completed ? 'Complete' : 'Paused'}</span>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this workout?"
        message="This will discard the workout and everything you have entered. Use the back arrow instead if you want to leave it resumable from Workouts."
        confirmLabel="Cancel workout"
        danger
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          discardWorkout();
          navigate('/');
        }}
      />
    </div>
  );
}
