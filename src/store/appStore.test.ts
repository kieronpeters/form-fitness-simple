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

  it('prefills programme target defaults when an exercise has no history', () => {
    const { bench, active } = startPush();
    expect(bench.sets).toHaveLength(3);
    expect(bench.sets.map((set) => set.reps)).toEqual([8, 8, 8]);
    expect(bench.sets.every((set) => set.weightKg == null)).toBe(true);
    const pushUps = active.activities.find((activity) => activity.activityId === 'push-up');
    expect(pushUps?.sets.every((set) => set.reps == null)).toBe(true);
    const treadmill = active.activities.find((activity) => activity.activityId === 'treadmill');
    expect(treadmill?.durationSec).toBe(300);
    expect(treadmill?.speedKmh).toBe(5);
    expect(treadmill?.incline).toBe(9);
    useAppStore.getState().discardWorkout();
  });

  it('edits prefilled duration metrics and saves them', () => {
    const { active } = startPush();
    const treadmill = active.activities.find((activity) => activity.activityId === 'treadmill');
    expect(treadmill).toBeTruthy();
    useAppStore.getState().updateActiveMetrics(treadmill!.id, {
      durationSec: 7 * 60,
      speedKmh: 6.2,
      incline: 10,
    });
    const completion = useAppStore.getState().finishWorkout();
    const saved = completion?.session.activities.find((activity) => activity.activityId === 'treadmill');
    expect(saved?.durationSec).toBe(420);
    expect(saved?.speedKmh).toBe(6.2);
    expect(saved?.incline).toBe(10);
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

  it('uses the latest exercise history even when it came from a different programme', () => {
    const startProgram = (needle: string) => {
      const program = useAppStore.getState().programs.find((item) => item.name.includes(needle));
      expect(program).toBeTruthy();
      const id = useAppStore.getState().startWorkout(program!.id);
      expect(id).toBeTruthy();
      const active = useAppStore.getState().activeSession!;
      const legExtension = active.activities.find((activity) => activity.activityId === 'leg-extension');
      expect(legExtension).toBeTruthy();
      return { active, legExtension: legExtension! };
    };

    const day3 = startProgram('Day 3');
    useAppStore.getState().updateActiveSet(day3.legExtension.id, day3.legExtension.sets[0].id, { reps: 12, weightKg: 50 });
    useAppStore.getState().finishWorkout();

    const day5 = startProgram('Day 5');
    useAppStore.getState().updateActiveSet(day5.legExtension.id, day5.legExtension.sets[0].id, { reps: 15, weightKg: 60 });
    useAppStore.getState().finishWorkout();

    const day3Again = startProgram('Day 3');
    expect(day3Again.legExtension.sets[0].reps).toBe(15);
    expect(day3Again.legExtension.sets[0].weightKg).toBe(60);
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
