import type {
  Activity,
  ActivityCategory,
  ActivityField,
  AppData,
  Program,
  ProgramActivity,
  Session,
  SessionActivity,
  SessionSet,
  Settings,
  WeightUnit,
} from '../types';
import { createId } from '../lib/ids';
import { SEED_VERSION, seedData } from './seed';
import { LEGACY_EXERCISES } from './legacyCatalog';

export const STORAGE_KEY = 'form-fitness-workout-v1';
export const LEGACY_STORAGE_KEY = 'form-fitness-app-v1';
export const LEGACY_STORAGE_KEY_OLD = 'form-app-v1';
export const LEGACY_BACKUP_KEY = 'form-fitness-legacy-backup-v1';

const IMPORTED_COVER = '/images/activities/imported.jpg';
const FALLBACK_ACTIVITY_IMAGE = '/images/activities/placeholder.jpg';

const STRENGTH_FIELDS: ActivityField[] = ['sets', 'reps', 'weight', 'rest'];
const ALIASES: Record<string, string> = {
  'machine-chest-press': 'chest-press',
  'ez-bar-curl': 'barbell-curl',
  'triceps-pushdown': 'tricep-pushdown',
  'dumbbell-lateral-raise': 'lateral-raise',
};

interface LegacyProgramExercise {
  id?: string;
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec?: number;
  note?: string;
}

interface LegacyProgramDay {
  id: string;
  name: string;
  focus?: string;
  exercises: LegacyProgramExercise[];
}

interface LegacyProgram {
  id: string;
  name: string;
  description?: string;
  isExample?: boolean;
  days: LegacyProgramDay[];
  createdAt?: string;
  updatedAt?: string;
}

interface LegacySet {
  id?: string;
  weightKg: number | null;
  reps: number | null;
  completed?: boolean;
  type?: 'normal' | 'warmup';
}

interface LegacySessionExercise {
  id?: string;
  exerciseId: string;
  sets: LegacySet[];
  note?: string;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
}

interface LegacySession {
  id: string;
  name: string;
  programId?: string;
  programDayId?: string;
  startedAt: string;
  completedAt?: string;
  status?: string;
  exercises: LegacySessionExercise[];
  isSample?: boolean;
}

interface LegacyExercise {
  id: string;
  name: string;
  primary?: string[];
}

interface LegacyState {
  profile?: { unitSystem?: 'metric' | 'imperial' };
  programs?: LegacyProgram[];
  sessions?: LegacySession[];
  customExercises?: LegacyExercise[];
}

interface LegacyEnvelope {
  state?: LegacyState;
  version?: number;
}

export interface MigrationResult {
  activities: Activity[];
  programs: Program[];
  sessions: Session[];
  settings: Settings;
  migratedProgramCount: number;
  migratedSessionCount: number;
  legacyBackupAvailable: boolean;
}

function readLegacyEnvelope(): LegacyEnvelope | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      window.localStorage.getItem(LEGACY_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY_OLD);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LegacyEnvelope;
    if (!parsed?.state) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveLegacyBackup(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem(LEGACY_BACKUP_KEY)) return true;
    const raw =
      window.localStorage.getItem(LEGACY_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY_OLD);
    if (!raw) return false;
    window.localStorage.setItem(LEGACY_BACKUP_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

export function hasLegacyBackup(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.localStorage.getItem(LEGACY_BACKUP_KEY));
  } catch {
    return false;
  }
}

export function readLegacyBackup(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LEGACY_BACKUP_KEY);
  } catch {
    return null;
  }
}

function categoryFor(primary?: string[]): ActivityCategory {
  const value = primary?.[0];
  if (value === 'chest') return 'Chest';
  if (value === 'back') return 'Back';
  if (value === 'shoulders') return 'Shoulders';
  if (value === 'biceps' || value === 'triceps' || value === 'forearms') return 'Arms';
  if (value === 'quads' || value === 'hamstrings' || value === 'glutes' || value === 'calves') return 'Legs';
  return 'Core';
}

function resolveActivity(
  oldId: string,
  activities: Activity[],
  legacyCustom: LegacyExercise[],
): Activity {
  const alias = ALIASES[oldId] ?? oldId;
  const existing = activities.find(
    (activity) => activity.id === alias || activity.id === `legacy_${oldId}`,
  );
  if (existing) return existing;
  const custom = legacyCustom.find((exercise) => exercise.id === oldId);
  const catalog = LEGACY_EXERCISES[oldId];
  const category = custom
    ? categoryFor(custom.primary)
    : ((catalog?.category as ActivityCategory) ?? 'Core');
  const activity: Activity = {
    id: `legacy_${oldId}`,
    name: custom?.name ?? catalog?.name ?? oldId.replace(/-/g, ' '),
    category,
    description: 'Imported from your previous Form Fitness data.',
    image: FALLBACK_ACTIVITY_IMAGE,
    fields: STRENGTH_FIELDS,
    isCustom: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  activities.push(activity);
  return activity;
}

function targetForExercise(exercise: LegacyProgramExercise): {
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
  note: string | null;
} {
  return {
    sets: exercise.sets,
    repsMin: exercise.repsMin,
    repsMax: exercise.repsMax,
    restSec: exercise.restSec ?? 90,
    note: exercise.note ?? null,
  };
}

function buildLegacyPrograms(
  legacy: LegacyState,
  activities: Activity[],
  legacyCustom: LegacyExercise[],
): { programs: Program[]; programLookup: Map<string, Program> } {
  const programs: Program[] = [];
  const programLookup = new Map<string, Program>();
  for (const legacyProgram of legacy.programs ?? []) {
    if (legacyProgram.isExample) continue;
    for (const day of legacyProgram.days ?? []) {
      if (!day.exercises?.length) continue;
      const name =
        (legacyProgram.days?.length ?? 0) > 1
          ? `${legacyProgram.name} — ${day.name}`
          : legacyProgram.name;
      const entries: ProgramActivity[] = day.exercises.map((exercise) => {
        const activity = resolveActivity(exercise.exerciseId, activities, legacyCustom);
        return {
          id: createId('pa'),
          activityId: activity.id,
          label:
            LEGACY_EXERCISES[exercise.exerciseId]?.name ??
            legacyCustom.find((item) => item.id === exercise.exerciseId)?.name ??
            activity.name,
          target: targetForExercise(exercise),
        };
      });
      const program: Program = {
        id: createId('program'),
        name,
        description: day.focus ?? legacyProgram.description ?? 'Imported programme',
        coverImage: IMPORTED_COVER,
        activities: entries,
        createdAt: legacyProgram.createdAt ?? new Date().toISOString(),
        updatedAt: legacyProgram.updatedAt ?? new Date().toISOString(),
      };
      programs.push(program);
      programLookup.set(`${legacyProgram.id}:${day.id}`, program);
    }
  }
  return { programs, programLookup };
}

function buildLegacySessions(
  legacy: LegacyState,
  activities: Activity[],
  legacyCustom: LegacyExercise[],
  programLookup: Map<string, Program>,
): Session[] {
  const sessions: Session[] = [];
  for (const old of legacy.sessions ?? []) {
    if (old.status !== 'completed' || !old.completedAt || old.isSample) continue;
    const started = new Date(old.startedAt).getTime();
    const completed = new Date(old.completedAt).getTime();
    if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started) continue;
    const oldProgram = (legacy.programs ?? []).find((program) => program.id === old.programId);
    const oldDay = oldProgram?.days.find((day) => day.id === old.programDayId);
    const mappedProgram = old.programId && old.programDayId
      ? programLookup.get(`${old.programId}:${old.programDayId}`)
      : undefined;
    const activityEntries: SessionActivity[] = [];
    for (const oldExercise of old.exercises ?? []) {
      const activity = resolveActivity(oldExercise.exerciseId, activities, legacyCustom);
      const sets: SessionSet[] = (oldExercise.sets ?? [])
        .filter((set) => set.reps != null || set.weightKg != null)
        .map((set) => ({
          id: createId('set'),
          reps: set.reps,
          weightKg: set.weightKg,
          kind: set.type === 'warmup' ? 'warmup' : 'working',
        }));
      const oldTarget = oldDay?.exercises.find((item) => item.exerciseId === oldExercise.exerciseId);
      const target = {
        sets: oldExercise.targetSets ?? oldTarget?.sets ?? null,
        repsMin: oldExercise.targetRepsMin ?? oldTarget?.repsMin ?? null,
        repsMax: oldExercise.targetRepsMax ?? oldTarget?.repsMax ?? null,
        restSec: oldTarget?.restSec ?? 90,
        note: oldTarget?.note ?? null,
      };
      if (!sets.length && !target.sets) continue;
      activityEntries.push({
        id: createId('sa'),
        activityId: activity.id,
        label:
          LEGACY_EXERCISES[oldExercise.exerciseId]?.name ??
          legacyCustom.find((item) => item.id === oldExercise.exerciseId)?.name ??
          activity.name,
        category: activity.category,
        image: activity.image,
        fields: activity.fields,
        repsLabel: activity.repsLabel,
        target,
        sets,
        durationSec: null,
        speedKmh: null,
        incline: null,
        notes: oldExercise.note ?? '',
      });
    }
    if (!activityEntries.length) continue;
    const fallbackName = old.name || oldDay?.name || 'Imported workout';
    sessions.push({
      id: createId('session'),
      programId: mappedProgram?.id ?? null,
      programName: mappedProgram?.name ?? fallbackName,
      programCover: mappedProgram?.coverImage ?? IMPORTED_COVER,
      startedAt: old.startedAt,
      completedAt: old.completedAt,
      durationSec: Math.max(1, Math.round((completed - started) / 1000)),
      activities: activityEntries,
    });
  }
  return sessions.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function migrateLegacy(): MigrationResult {
  const seed = seedData();
  const envelope = readLegacyEnvelope();
  const legacy = envelope?.state ?? null;
  const activities = seed.activities;
  const legacyCustom = legacy?.customExercises ?? [];
  const legacyProgramResult = legacy
    ? buildLegacyPrograms(legacy, activities, legacyCustom)
    : { programs: [], programLookup: new Map<string, Program>() };
  const sessions = legacy
    ? buildLegacySessions(legacy, activities, legacyCustom, legacyProgramResult.programLookup)
    : [];
  const weightUnit: WeightUnit = legacy?.profile?.unitSystem === 'imperial' ? 'lb' : 'kg';
  const backup = saveLegacyBackup();
  return {
    activities,
    programs: [...seed.programs, ...legacyProgramResult.programs],
    sessions,
    settings: { weightUnit },
    migratedProgramCount: legacyProgramResult.programs.length,
    migratedSessionCount: sessions.length,
    legacyBackupAvailable: backup,
  };
}

export function buildFreshData(): AppData {
  const seed = seedData();
  return {
    activities: seed.activities,
    programs: seed.programs,
    sessions: [],
    activeSession: null,
    settings: { weightUnit: 'kg' },
    seedVersion: SEED_VERSION,
    hasLegacyBackup: false,
  };
}

export function buildInitialData(): AppData {
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) {
        return {
          activities: [],
          programs: [],
          sessions: [],
          activeSession: null,
          settings: { weightUnit: 'kg' },
          seedVersion: SEED_VERSION,
          hasLegacyBackup: hasLegacyBackup(),
        };
      }
    } catch {
      // Storage can be blocked; continue with a safe local seed.
    }
  }
  const migrated = migrateLegacy();
  return {
    activities: migrated.activities,
    programs: migrated.programs,
    sessions: migrated.sessions,
    activeSession: null,
    settings: migrated.settings,
    seedVersion: SEED_VERSION,
    hasLegacyBackup: migrated.legacyBackupAvailable,
  };
}

export function clearLegacyData(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY_OLD);
    window.localStorage.removeItem(LEGACY_BACKUP_KEY);
  } catch {
    // Ignore storage denial; the caller can still clear the new store.
  }
}

