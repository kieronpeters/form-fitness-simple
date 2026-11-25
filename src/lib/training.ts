import type { PersonalRecord, Session, SessionActivity, TrainingStats } from '../types';

const KG_TO_LB = 2.2046226218;

export const LBS_PER_KG = KG_TO_LB;

export function toDisplayWeight(weightKg: number, unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? weightKg * KG_TO_LB : weightKg;
}

export function toStoredWeight(value: number, unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? value / KG_TO_LB : value;
}

export function formatWeight(weightKg: number | null, unit: 'kg' | 'lb', includeUnit = true): string {
  if (weightKg === null || !Number.isFinite(weightKg)) return '—';
  const value = toDisplayWeight(weightKg, unit);
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return includeUnit ? `${rounded} ${unit}` : rounded;
}

export function formatSpeed(speedKmh: number | null, unit: 'kg' | 'lb'): string {
  if (speedKmh === null || !Number.isFinite(speedKmh)) return '—';
  if (unit === 'lb') {
    return `${(speedKmh / 1.609344).toFixed(1)} mph`;
  }
  return `${Number.isInteger(speedKmh) ? speedKmh : speedKmh.toFixed(1)} km/h`;
}

export function formatDuration(totalSeconds: number, style: 'short' | 'clock' = 'short'): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (style === 'clock') {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }
  if (seconds === 0) return '0 min';
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `${hours}h` : `${hours}h ${remaining}m`;
}

export function sessionElapsedSec(
  session: Pick<Session, 'startedAt' | 'pausedAt' | 'pausedDurationSec'>,
  now = Date.now(),
): number {
  const started = new Date(session.startedAt).getTime();
  if (!Number.isFinite(started)) return 0;
  let pausedMs = Math.max(0, (session.pausedDurationSec ?? 0) * 1000);
  if (session.pausedAt) {
    const paused = new Date(session.pausedAt).getTime();
    if (Number.isFinite(paused)) pausedMs += Math.max(0, now - paused);
  }
  return Math.max(0, Math.floor((now - started - pausedMs) / 1000));
}

export function formatDate(iso: string): string {  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function todayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return `Today, ${formatTime(iso)}`;
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function formatTargetText(
  target: {
    sets?: number | null;
    repsMin?: number | null;
    repsMax?: number | null;
    repsText?: string | null;
    perLeg?: boolean;
    durationSec?: number | null;
    speedKmh?: number | null;
    incline?: number | null;
  },
  unit: 'kg' | 'lb',
): string {
  if (target.durationSec != null) {
    const pieces = [formatDuration(target.durationSec)];
    if (target.speedKmh != null) pieces.push(formatSpeed(target.speedKmh, unit));
    if (target.incline != null) pieces.push(`incline ${target.incline}`);
    return pieces.join(' · ');
  }
  if (target.sets != null) {
    if (target.repsText) {
      return `${target.sets} sets ${target.repsText}`;
    }
    const reps =
      target.repsMin != null && target.repsMax != null
        ? target.repsMin === target.repsMax
          ? `${target.repsMin}`
          : `${target.repsMin}–${target.repsMax}`
        : '—';
    const perLeg = target.perLeg ? ' steps/leg' : '';
    return `${target.sets} × ${reps}${perLeg}`;
  }
  return target.repsText ?? '—';
}

export function formatFields(fields: string[]): string {
  const labels: Record<string, string> = {
    sets: 'Sets',
    reps: 'Reps',
    weight: 'Weight',
    duration: 'Duration',
    speed: 'Speed',
    incline: 'Incline',
    rest: 'Rest',
    notes: 'Notes',
  };
  return fields.map((field) => labels[field] ?? field).join(' · ');
}

function workingSets(activity: SessionActivity) {
  return activity.sets.filter((set) => (set.kind ?? 'working') === 'working');
}

export function sessionVolumeKg(session: Session): number {
  return session.activities.reduce((total, activity) => {
    return (
      total +
      workingSets(activity).reduce((activityTotal, set) => {
        if (set.reps == null || set.weightKg == null) return activityTotal;
        return activityTotal + set.reps * set.weightKg;
      }, 0)
    );
  }, 0);
}

export function formatSessionActivitySummary(activity: SessionActivity, unit: 'kg' | 'lb'): string {
  if (activity.fields.includes('sets')) {
    const filled = workingSets(activity).filter((set) => set.reps != null || set.weightKg != null);
    if (!filled.length) return 'No sets recorded';
    const reps = filled.map((set) => set.reps ?? '—').join(' / ');
    const weights = [
      ...new Set(
        filled
          .map((set) => set.weightKg)
          .filter((weight): weight is number => weight != null),
      ),
    ];
    const weight = weights.length ? ` · ${formatWeight(Math.max(...weights), unit)}` : '';
    return `${filled.length} ${filled.length === 1 ? 'set' : 'sets'} · ${reps} reps${weight}`;
  }
  if (activity.fields.includes('duration')) {
    const pieces = [formatDuration(activity.durationSec ?? 0)];
    if (activity.speedKmh != null) pieces.push(formatSpeed(activity.speedKmh, unit));
    if (activity.incline != null) pieces.push(`incline ${activity.incline}`);
    return pieces.join(' · ');
  }
  if (activity.fields.includes('notes') && activity.notes.trim()) return activity.notes.trim();
  return 'Recorded';
}

export function sessionSetCount(session: Session): number {
  return session.activities.reduce((total, activity) => {
    return total + workingSets(activity).filter((set) => set.reps != null || set.weightKg != null).length;
  }, 0);
}

export function sessionRepCount(session: Session): number {
  return session.activities.reduce((total, activity) => {
    return (
      total +
      workingSets(activity).reduce((activityTotal, set) => activityTotal + (set.reps ?? 0), 0)
    );
  }, 0);
}

export function activityRecord(activity: SessionActivity) {
  const working = workingSets(activity);
  const weights = working.map((set) => set.weightKg).filter((value): value is number => value != null);
  const reps = working.map((set) => set.reps).filter((value): value is number => value != null);
  const filled = working.filter((set) => set.reps != null || set.weightKg != null);
  return {
    weightKg: weights.length ? Math.max(...weights) : null,
    reps: reps.length ? Math.max(...reps) : null,
    sets: filled.length ? filled.length : null,
    durationSec:
      activity.fields.includes('duration') && activity.durationSec != null && activity.durationSec > 0
        ? activity.durationSec
        : null,
  };
}

export function computePersonalRecords(sessions: Session[]): PersonalRecord[] {
  const byActivity = new Map<string, PersonalRecord>();
  const ordered = [...sessions].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  for (const session of ordered) {
    for (const activity of session.activities) {
      if (!activity.fields.includes('sets')) continue;
      const record = activityRecord(activity);
      if (record.weightKg == null && record.reps == null && record.sets == null && record.durationSec == null) continue;
      const existing = byActivity.get(activity.activityId);
      if (!existing) {
        byActivity.set(activity.activityId, {
          activityId: activity.activityId,
          activityName: activity.label,
          image: activity.image,
          weightKg: record.weightKg,
          reps: record.reps,
          sets: record.sets,
          durationSec: record.durationSec,
          achievedAt: session.completedAt,
          sessionId: session.id,
        });
        continue;
      }
      const weightImproved = record.weightKg != null && (existing.weightKg == null || record.weightKg > existing.weightKg);
      const repsImproved = record.reps != null && (existing.reps == null || record.reps > existing.reps);
      const setsImproved = record.sets != null && (existing.sets == null || record.sets > existing.sets);
      const durationImproved =
        record.durationSec != null && (existing.durationSec == null || record.durationSec > existing.durationSec);
      if (weightImproved || repsImproved || setsImproved || durationImproved) {
        if (weightImproved) existing.weightKg = record.weightKg;
        if (repsImproved) existing.reps = record.reps;
        if (setsImproved) existing.sets = record.sets;
        if (durationImproved) existing.durationSec = record.durationSec;
        existing.achievedAt = session.completedAt;
        existing.sessionId = session.id;
        existing.activityName = activity.label;
        existing.image = activity.image;
      }
    }
  }
  return [...byActivity.values()].sort((a, b) => b.achievedAt.localeCompare(a.achievedAt));
}

function localDateKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysKey(key: string, delta: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + delta);
  return localDateKey(date.toISOString());
}

function streakFromDates(dates: string[]): { current: number; best: number } {
  const unique = [...new Set(dates)].sort();
  if (!unique.length) return { current: 0, best: 0 };
  let best = 1;
  let running = 1;
  for (let index = 1; index < unique.length; index += 1) {
    if (unique[index] === addDaysKey(unique[index - 1], 1)) {
      running += 1;
    } else {
      running = 1;
    }
    best = Math.max(best, running);
  }
  const today = localDateKey(new Date().toISOString());
  const yesterday = addDaysKey(today, -1);
  const latest = unique[unique.length - 1];
  if (latest !== today && latest !== yesterday) return { current: 0, best };
  let current = 1;
  for (let index = unique.length - 1; index > 0; index -= 1) {
    if (unique[index - 1] === addDaysKey(unique[index], -1)) current += 1;
    else break;
  }
  return { current, best };
}

export function computeStats(sessions: Session[]): TrainingStats {
  const records = computePersonalRecords(sessions);
  const duration = sessions.reduce((total, session) => total + session.durationSec, 0);
  const volume = sessions.reduce((total, session) => total + sessionVolumeKg(session), 0);
  const sets = sessions.reduce((total, session) => total + sessionSetCount(session), 0);
  const reps = sessions.reduce((total, session) => total + sessionRepCount(session), 0);
  const longest = sessions.reduce((value, session) => Math.max(value, session.durationSec), 0);
  const streaks = streakFromDates(sessions.map((session) => localDateKey(session.completedAt)));
  return {
    workoutCount: sessions.length,
    totalDurationSec: duration,
    totalVolumeKg: volume,
    totalSets: sets,
    totalReps: reps,
    longestDurationSec: longest,
    currentStreak: streaks.current,
    bestStreak: streaks.best,
    records,
  };
}

export interface RecordImprovement {
  activityId: string;
  activityName: string;
  fields: string[];
  first: boolean;
}

export function detectImprovements(previousSessions: Session[], saved: Session): RecordImprovement[] {
  const previous = new Map<string, ReturnType<typeof activityRecord>>();
  for (const session of previousSessions) {
    for (const activity of session.activities) {
      if (!activity.fields.includes('sets')) continue;
      const record = activityRecord(activity);
      const current = previous.get(activity.activityId);
      if (!current) {
        previous.set(activity.activityId, record);
      } else {
        if (record.weightKg != null) current.weightKg = Math.max(current.weightKg ?? 0, record.weightKg);
        if (record.reps != null) current.reps = Math.max(current.reps ?? 0, record.reps);
        if (record.sets != null) current.sets = Math.max(current.sets ?? 0, record.sets);
        if (record.durationSec != null) current.durationSec = Math.max(current.durationSec ?? 0, record.durationSec);
      }
    }
  }

  const improvements: RecordImprovement[] = [];
  for (const activity of saved.activities) {
    if (!activity.fields.includes('sets')) continue;
    const record = activityRecord(activity);
    const before = previous.get(activity.activityId);
    const fields: string[] = [];
    if (!before) {
      if (record.weightKg != null || record.reps != null || record.sets != null || record.durationSec != null) {
        improvements.push({ activityId: activity.activityId, activityName: activity.label, fields: [], first: true });
      }
      continue;
    }
    if (record.weightKg != null && (before.weightKg == null || record.weightKg > before.weightKg)) fields.push('weight');
    if (record.reps != null && (before.reps == null || record.reps > before.reps)) fields.push('reps');
    if (record.sets != null && (before.sets == null || record.sets > before.sets)) fields.push('sets');
    if (record.durationSec != null && (before.durationSec == null || record.durationSec > before.durationSec)) {
      fields.push('duration');
    }
    if (fields.length) {
      improvements.push({ activityId: activity.activityId, activityName: activity.label, fields, first: false });
    }
  }
  return improvements;
}


