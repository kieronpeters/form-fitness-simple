import { describe, expect, it } from 'vitest';
import type { Session, SessionActivity } from '../types';
import { seedActivities, seedPrograms } from '../data/seed';
import {
  computePersonalRecords,
  computeStats,
  detectImprovements,
  formatDuration,
  formatTargetText,
  formatWeight,
  sessionVolumeKg,
  toDisplayWeight,
} from './training';

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    programId: 'p1',
    programName: 'Day 1 – Push',
    programCover: '/img.jpg',
    startedAt: '2026-01-01T10:00:00.000Z',
    completedAt: '2026-01-01T11:00:00.000Z',
    durationSec: 3600,
    activities: [],
    ...overrides,
  };
}

describe('seed data', () => {
  it('creates exactly five programmes with eight ordered activities each', () => {
    const programs = seedPrograms('2026-01-01T00:00:00.000Z');
    expect(programs).toHaveLength(5);
    for (const program of programs) {
      expect(program.activities).toHaveLength(8);
      expect(program.activities[0].label).toBe('Treadmill (Warm-up)');
      expect(program.activities[1].label).toBe('Back Stretches');
      expect(program.activities[7].label).toBe('Treadmill (Cool-down)');
    }
  });

  it('keeps only the expected activity library and the supplied targets', () => {
    const activities = seedActivities('2026-01-01T00:00:00.000Z');
    expect(activities).toHaveLength(22);
    expect(activities.map((activity) => activity.name)).toEqual(
      expect.arrayContaining([
        'Bench Press',
        'Chest Press',
        'Overhead Press',
        'Lateral Raises',
        'Push-Ups',
        'Pull-Ups',
        'Lat Pulldown',
        'Seated Row',
        'Straight-Arm Pulldown',
        'Barbell Curl',
        'Hack Squat',
        'Belt Squat',
        'Leg Extension',
        'Hamstring Curl',
        'Seated Calf Raise',
        'Cable Fly',
        'Tricep Pushdown',
        'Goblet Squat',
        'Walking Lunges',
        'Lying Leg Curl',
        'Treadmill',
        'Back Stretches',
      ]),
    );

    const programs = seedPrograms('2026-01-01T00:00:00.000Z');
    const push = programs[0];
    const bench = push.activities.find((entry) => entry.label === 'Bench Press');
    const pushUps = push.activities.find((entry) => entry.label === 'Push-Ups');
    const stretch = push.activities.find((entry) => entry.label === 'Back Stretches');
    const warmup = push.activities[0];
    expect(bench?.target).toMatchObject({ sets: 3, repsMin: 8, repsMax: 10, restSec: 90 });
    expect(bench?.target).not.toHaveProperty('weightKg');
    expect(pushUps?.target.repsText).toBe('near failure');
    expect(stretch?.target.durationSec).toBe(300);
    expect(warmup.target).toMatchObject({ durationSec: 300, speedKmh: 5, incline: 9 });

    const day4 = programs[3];
    expect(day4.activities.map((entry) => entry.label)).toContain('Chest Press (Light)');
    expect(day4.activities.map((entry) => entry.label)).toContain('Pulldown Bar');
    expect(day4.activities.map((entry) => entry.label)).toContain('Bicep Curl Bar');
    expect(day4.activities.map((entry) => entry.label)).toContain('Cable Fly');
  });

  it('formats the provided targets without inventing weight values', () => {
    expect(
      formatTargetText({ sets: 3, repsMin: 8, repsMax: 10 }, 'kg'),
    ).toBe('3 × 8–10');
    expect(
      formatTargetText({ sets: 3, repsText: 'near failure' }, 'kg'),
    ).toBe('3 sets near failure');
    expect(
      formatTargetText({ sets: 4, repsMin: 12, repsMax: 12, perLeg: true }, 'kg'),
    ).toBe('4 × 12 steps/leg');
    expect(
      formatTargetText({ durationSec: 300, speedKmh: 5, incline: 9 }, 'kg'),
    ).toBe('5 min · 5 km/h · incline 9');
  });
});

describe('workout statistics and records', () => {
  const bench = (sessionId: string, reps: number, weightKg: number): SessionActivity => ({
    id: `${sessionId}-sa`,
    activityId: 'bench-press',
    label: 'Bench Press',
    category: 'Chest',
    image: '/bench.jpg',
    fields: ['sets', 'reps', 'weight', 'rest'],
    target: { sets: 3, repsMin: 8, repsMax: 10 },
    sets: [{ id: `${sessionId}-set`, reps, weightKg }],
    durationSec: null,
    speedKmh: null,
    incline: null,
    notes: '',
  });

  it('calculates volume, sets, reps, duration and records from real sessions', () => {
    const first = session({
      id: 's1',
      completedAt: '2026-01-01T11:00:00.000Z',
      durationSec: 3600,
      activities: [bench('s1', 10, 60)],
    });
    const second = session({
      id: 's2',
      completedAt: '2026-01-02T11:00:00.000Z',
      durationSec: 1800,
      activities: [bench('s2', 8, 70)],
    });
    const stats = computeStats([first, second]);
    expect(stats.workoutCount).toBe(2);
    expect(stats.totalDurationSec).toBe(5400);
    expect(stats.totalSets).toBe(2);
    expect(stats.totalReps).toBe(18);
    expect(stats.totalVolumeKg).toBe(10 * 60 + 8 * 70);
    expect(stats.longestDurationSec).toBe(3600);
    expect(stats.records[0].weightKg).toBe(70);
    expect(stats.records[0].reps).toBe(10);
    expect(stats.bestStreak).toBe(2);
    expect(sessionVolumeKg(first)).toBe(600);
    expect(computePersonalRecords([first, second])).toHaveLength(1);
  });

  it('does not create personal records from warm-up, cardio or stretching activities', () => {
    const treadmill: SessionActivity = {
      id: 'cardio',
      activityId: 'treadmill',
      label: 'Treadmill (Warm-up)',
      category: 'Cardio',
      image: '/treadmill.jpg',
      fields: ['duration', 'speed', 'incline'],
      target: {},
      sets: [],
      durationSec: 300,
      speedKmh: 5,
      incline: 9,
      notes: '',
    };
    const first = session({ id: 's1', activities: [treadmill] });
    expect(computePersonalRecords([first])).toHaveLength(0);
    expect(computeStats([first]).records).toHaveLength(0);
  });

  it('detects a genuine improvement and keeps history corrections separate', () => {
    const first = session({ id: 's1', completedAt: '2026-01-01T11:00:00.000Z', activities: [bench('s1', 8, 50)] });
    const after = session({ id: 's2', completedAt: '2026-01-02T11:00:00.000Z', activities: [bench('s2', 10, 55)] });
    const improvements = detectImprovements([first], after);
    expect(improvements).toHaveLength(1);
    expect(improvements[0].fields).toEqual(expect.arrayContaining(['weight', 'reps']));
    expect(improvements[0].first).toBe(false);
  });

  it('formats units and empty durations sensibly', () => {
    expect(formatWeight(100, 'kg')).toBe('100 kg');
    expect(formatWeight(100, 'lb')).toBe('220.5 lb');
    expect(toDisplayWeight(100, 'lb')).toBeCloseTo(220.46, 1);
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(3660)).toBe('1h 1m');
  });
});
