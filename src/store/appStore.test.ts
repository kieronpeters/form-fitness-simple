import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFreshData } from '../data/migration';
import { useAppStore } from './appStore';

function resetStore() {
  try {
    window.localStorage.clear();
  } catch {
    // jsdom may not provide localStorage in every runner.
  }
  useAppStore.setState(buildFreshData());
}

function startPush() {
  const program = useAppStore.getState().programs.find((item) => item.name.includes('Day 1'));
  expect(program).toBeTruthy();
  const id = useAppStore.getState().startWorkout(program!.id);
  expect(id).toBeTruthy();
  const active = useAppStore.getState().activeSession;
  expect(active).toBeTruthy();
  const bench = active!.activities.find((activity) => activity.label === 'Bench Press');
  expect(bench).toBeTruthy();
  return { program: program!, active: active!, bench: bench! };
}

describe('workout store', () => {
  beforeEach(resetStore);

  afterEach(() => {
    vi.useRealTimers();
  });

  it('excludes paused time from the saved duration', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
    const { bench } = startPush();
    useAppStore.getState().updateActiveSet(bench.id, bench.sets[0].id, { reps: 10, weightKg: 60 });
    vi.advanceTimersByTime(60_000);
    useAppStore.getState().pauseWorkout();
    vi.advanceTimersByTime(120_000);
    useAppStore.getState().resumeWorkout();
    vi.advanceTimersByTime(60_000);
    const completion = useAppStore.getState().finishWorkout();
    expect(completion?.session.durationSec).toBe(120);
  });

  it('seeds five programmes and allows a workout to be completed', () => {
    expect(useAppStore.getState().programs).toHaveLength(5);
    const { bench } = startPush();
    useAppStore.getState().updateActiveSet(bench.id, bench.sets[0].id, { reps: 10, weightKg: 60 });
    useAppStore.getState().updateActiveSet(bench.id, bench.sets[1].id, { reps: 8, weightKg: 60 });
    const completion = useAppStore.getState().finishWorkout();
    expect(completion).toBeTruthy();
    expect(completion!.session.activities.some((activity) => activity.label === 'Bench Press')).toBe(true);
    expect(completion!.improvements.map((item) => item.activityName)).toContain('Bench Press');
    expect(useAppStore.getState().activeSession).toBeNull();
    expect(useAppStore.getState().sessions).toHaveLength(1);
  });

  it('prefills the next session with the last performance', () => {
    const first = startPush();
    useAppStore.getState().updateActiveSet(first.bench.id, first.bench.sets[0].id, { reps: 12, weightKg: 42.5 });
    useAppStore.getState().finishWorkout();

    const second = startPush();
    expect(second.bench.sets[0].reps).toBe(12);
    expect(second.bench.sets[0].weightKg).toBe(42.5);
    expect(second.bench.target.repsMin).toBe(8);
    useAppStore.getState().discardWorkout();
  });

  it('preserves timestamps and duration when history values are corrected', () => {
    const { bench } = startPush();
    useAppStore.getState().updateActiveSet(bench.id, bench.sets[0].id, { reps: 8, weightKg: 50 });
    const completion = useAppStore.getState().finishWorkout()!;
    const saved = useAppStore.getState().sessions[0];
    const corrected = saved.activities.map((activity) =>
      activity.label === 'Bench Press'
        ? { ...activity, sets: activity.sets.map((set, index) => (index === 0 ? { ...set, reps: 9 } : set)) }
        : activity,
    );
    useAppStore.getState().updateSessionValues(saved.id, corrected);
    const updated = useAppStore.getState().sessions[0];
    expect(updated.startedAt).toBe(completion.session.startedAt);
    expect(updated.completedAt).toBe(completion.session.completedAt);
    expect(updated.durationSec).toBe(completion.session.durationSec);
    expect(useAppStore.getState().sessions).toHaveLength(1);
    expect(updated.activities.find((activity) => activity.label === 'Bench Press')?.sets[0].reps).toBe(9);
  });

  it('deletes a session and removes its contribution to stats', () => {
    const { bench } = startPush();
    useAppStore.getState().updateActiveSet(bench.id, bench.sets[0].id, { reps: 10, weightKg: 60 });
    useAppStore.getState().finishWorkout();
    const saved = useAppStore.getState().sessions[0];
    useAppStore.getState().deleteSession(saved.id);
    expect(useAppStore.getState().sessions).toHaveLength(0);
  });

  it('keeps historical snapshots when an activity or programme is edited', () => {
    const { bench, program } = startPush();
    useAppStore.getState().updateActiveSet(bench.id, bench.sets[0].id, { reps: 10, weightKg: 60 });
    useAppStore.getState().finishWorkout();
    useAppStore.getState().saveProgram({
      ...program,
      name: 'Renamed after the session',
      updatedAt: new Date().toISOString(),
    });
    expect(useAppStore.getState().sessions[0].programName).toBe(program.name);
    expect(useAppStore.getState().sessions[0].activities.some((activity) => activity.label === 'Bench Press')).toBe(true);
    const result = useAppStore.getState().deleteActivity('bench-press');
    expect(result.ok).toBe(true);
    expect(useAppStore.getState().sessions[0].activities.some((activity) => activity.label === 'Bench Press')).toBe(true);
  });

  it('prevents starting a second workout while one is active', () => {
    startPush();
    const second = useAppStore.getState().programs[1];
    expect(useAppStore.getState().startWorkout(second.id)).toBeNull();
    useAppStore.getState().discardWorkout();
    expect(useAppStore.getState().activeSession).toBeNull();
  });
});
