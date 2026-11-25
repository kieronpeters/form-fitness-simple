import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  Activity,
  AppData,
  Program,
  ProgramActivity,
  Session,
  SessionActivity,
  SessionSet,
  Target,
  WeightUnit,
} from '../types';
import { createId } from '../lib/ids';
import { buildFreshData, buildInitialData, clearLegacyData } from '../data/migration';
import {
  computePersonalRecords,
  detectImprovements,
  type RecordImprovement,
} from '../lib/training';

export const STORE_VERSION = 1;
export const STORAGE_KEY = 'form-fitness-workout-v1';

const memoryStore = new Map<string, string>();
const fallbackStorage: Storage = {
  get length() {
    return memoryStore.size;
  },
  clear: () => memoryStore.clear(),
  getItem: (key) => memoryStore.get(key) ?? null,
  key: (index) => [...memoryStore.keys()][index] ?? null,
  removeItem: (key) => {
    memoryStore.delete(key);
  },
  setItem: (key, value) => {
    memoryStore.set(key, value);
  },
};

function resolveStorage(): Storage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // Use memory fallback in private/storage-blocked modes.
  }
  return fallbackStorage;
}

export interface WorkoutCompletion {
  session: Session;
  improvements: RecordImprovement[];
}

export interface DeleteActivityResult {
  ok: boolean;
  reason?: string;
}

export interface AppActions {
  setWeightUnit: (unit: WeightUnit) => void;
  saveProgram: (program: Program) => void;
  deleteProgram: (programId: string) => void;
  duplicateProgram: (programId: string) => string | null;
  saveActivity: (activity: Activity) => void;
  deleteActivity: (activityId: string) => DeleteActivityResult;
  startWorkout: (programId: string) => string | null;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  updateActiveSet: (
    activityId: string,
    setId: string,
    patch: Partial<Pick<SessionSet, 'reps' | 'weightKg'>>,
  ) => void;
  addActiveSet: (activityId: string) => void;
  removeActiveSet: (activityId: string, setId: string) => void;
  updateActiveMetrics: (
    activityId: string,
    patch: Partial<Pick<SessionActivity, 'durationSec' | 'speedKmh' | 'incline' | 'notes'>>,
  ) => void;
  finishWorkout: () => WorkoutCompletion | null;
  discardWorkout: () => void;
  updateSessionValues: (sessionId: string, activities: SessionActivity[]) => void;
  deleteSession: (sessionId: string) => void;
  importData: (data: AppData) => void;
  resetData: () => void;
}

export interface AppStore extends AppData, AppActions {}

function nowIso(): string {
  return new Date().toISOString();
}

function toTarget(programActivity: ProgramActivity, activity: Activity): Target {
  return {
    ...programActivity.target,
    sets: programActivity.target.sets ?? null,
    repsMin: programActivity.target.repsMin ?? null,
    repsMax: programActivity.target.repsMax ?? null,
    repsText: programActivity.target.repsText ?? null,
    restSec: programActivity.target.restSec ?? null,
    durationSec: programActivity.target.durationSec ?? null,
    speedKmh: programActivity.target.speedKmh ?? null,
    incline: programActivity.target.incline ?? null,
    perLeg: programActivity.target.perLeg ?? false,
    note: programActivity.target.note ?? null,
    // Keep the activity's tracking fields in sync with its configured template.
    ...(activity.fields.includes('sets') ? {} : { sets: null }),
  };
}

function lastActivityFor(
  sessions: Session[],
  activityId: string,
): SessionActivity | null {
  const sorted = [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  for (const session of sorted) {
    const activity = session.activities.find((item) => item.activityId === activityId);
    if (activity) return activity;
  }
  return null;
}

function buildSessionActivity(
  entry: ProgramActivity,
  activity: Activity,
  previous: SessionActivity | null,
): SessionActivity {
  const target = toTarget(entry, activity);
  const usesSets = activity.fields.includes('sets');
  const workingSets = previous?.sets.filter((set) => (set.kind ?? 'working') === 'working') ?? [];
  const defaultSetCount = target.sets ?? 1;
  const defaultReps = target.repsText
    ? null
    : (target.repsMin ?? target.repsMax ?? null);
  const sets: SessionSet[] = usesSets
    ? workingSets.length
      ? workingSets.map((set) => ({ id: createId('set'), reps: set.reps, weightKg: set.weightKg }))
      : Array.from({ length: Math.max(1, defaultSetCount) }, () => ({
          id: createId('set'),
          reps: defaultReps,
          weightKg: null,
        }))
    : [];
  return {
    id: createId('sa'),
    activityId: activity.id,
    label: entry.label,
    category: activity.category,
    image: activity.image,
    fields: activity.fields,
    repsLabel: activity.repsLabel,
    target,
    sets,
    durationSec:
      activity.fields.includes('duration')
        ? (previous?.durationSec ?? target.durationSec ?? null)
        : null,
    speedKmh:
      activity.fields.includes('speed') ? (previous?.speedKmh ?? target.speedKmh ?? null) : null,
    incline:
      activity.fields.includes('incline') ? (previous?.incline ?? target.incline ?? null) : null,
    notes: previous?.notes ?? '',
  };
}

function hasActivityData(activity: SessionActivity): boolean {
  if (activity.sets.some((set) => set.reps != null || set.weightKg != null)) return true;
  if (activity.fields.includes('duration') && activity.durationSec != null) return true;
  if (activity.fields.includes('speed') && activity.speedKmh != null) return true;
  if (activity.fields.includes('incline') && activity.incline != null) return true;
  if (activity.fields.includes('notes') && activity.notes.trim()) return true;
  return false;
}

function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...buildInitialData(),

      setWeightUnit: (weightUnit) =>
        set((state) => ({ settings: { ...state.settings, weightUnit } })),

      saveProgram: (program) =>
        set((state) => {
          const exists = state.programs.some((item) => item.id === program.id);
          const programs = exists
            ? state.programs.map((item) => (item.id === program.id ? program : item))
            : [...state.programs, program];
          return { programs };
        }),

      deleteProgram: (programId) =>
        set((state) => ({ programs: state.programs.filter((program) => program.id !== programId) })),

      duplicateProgram: (programId) => {
        const source = get().programs.find((program) => program.id === programId);
        if (!source) return null;
        const copy: Program = {
          ...source,
          id: createId('program'),
          name: `${source.name} (copy)`,
          seedKey: undefined,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          activities: source.activities.map((entry) => ({
            ...entry,
            id: createId('pa'),
          })),
        };
        set((state) => ({ programs: [...state.programs, copy] }));
        return copy.id;
      },

      saveActivity: (activity) =>
        set((state) => {
          const exists = state.activities.some((item) => item.id === activity.id);
          const activities = exists
            ? state.activities.map((item) => (item.id === activity.id ? activity : item))
            : [...state.activities, activity];
          return { activities };
        }),

      deleteActivity: (activityId) => {
        const state = get();
        if (state.activeSession?.activities.some((activity) => activity.activityId === activityId)) {
          return { ok: false, reason: 'Finish or discard the active workout before deleting this activity.' };
        }
        set((current) => ({
          activities: current.activities.filter((activity) => activity.id !== activityId),
          programs: current.programs.map((program) => ({
            ...program,
            activities: program.activities.filter((entry) => entry.activityId !== activityId),
          })),
        }));
        return { ok: true };
      },

      startWorkout: (programId) => {
        const state = get();
        if (state.activeSession) return null;
        const program = state.programs.find((item) => item.id === programId);
        if (!program) return null;
        const session: Session = {
          id: createId('session'),
          programId: program.id,
          programName: program.name,
          programCover: program.coverImage,
          startedAt: nowIso(),
          completedAt: '',
          durationSec: 0,
          pausedAt: null,
          pausedDurationSec: 0,
          activities: program.activities
            .map((entry) => {
              const activity = state.activities.find((item) => item.id === entry.activityId);
              if (!activity) return null;
              return buildSessionActivity(
                entry,
                activity,
                lastActivityFor(state.sessions, activity.id),
              );
            })
            .filter((activity): activity is SessionActivity => Boolean(activity)),
        };
        if (!session.activities.length) return null;
        set({ activeSession: session });
        return session.id;
      },

      pauseWorkout: () =>
        set((state) => {
          if (!state.activeSession || state.activeSession.pausedAt) return state;
          return {
            activeSession: {
              ...state.activeSession,
              pausedAt: nowIso(),
            },
          };
        }),

      resumeWorkout: () =>
        set((state) => {
          const active = state.activeSession;
          if (!active?.pausedAt) return state;
          const pausedAt = new Date(active.pausedAt).getTime();
          const additional = Number.isFinite(pausedAt) ? Math.max(0, Date.now() - pausedAt) / 1000 : 0;
          return {
            activeSession: {
              ...active,
              pausedAt: null,
              pausedDurationSec: (active.pausedDurationSec ?? 0) + additional,
            },
          };
        }),

      updateActiveSet: (activityId, setId, patch) =>
        set((state) => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              activities: state.activeSession.activities.map((activity) =>
                activity.id !== activityId
                  ? activity
                  : {
                      ...activity,
                      sets: activity.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
                    },
              ),
            },
          };
        }),

      addActiveSet: (activityId) =>
        set((state) => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              activities: state.activeSession.activities.map((activity) =>
                activity.id !== activityId
                  ? activity
                  : {
                      ...activity,
                      sets: [...activity.sets, { id: createId('set'), reps: null, weightKg: null }],
                    },
              ),
            },
          };
        }),

      removeActiveSet: (activityId, setId) =>
        set((state) => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              activities: state.activeSession.activities.map((activity) =>
                activity.id !== activityId || activity.sets.length <= 1
                  ? activity
                  : { ...activity, sets: activity.sets.filter((set) => set.id !== setId) },
              ),
            },
          };
        }),

      updateActiveMetrics: (activityId, patch) =>
        set((state) => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              activities: state.activeSession.activities.map((activity) =>
                activity.id === activityId ? { ...activity, ...patch } : activity,
              ),
            },
          };
        }),

      finishWorkout: () => {
        const state = get();
        if (!state.activeSession) return null;
        const completedAt = nowIso();
        const started = new Date(state.activeSession.startedAt).getTime();
        const ended = new Date(completedAt).getTime();
        const pausedAt = state.activeSession.pausedAt
          ? new Date(state.activeSession.pausedAt).getTime()
          : null;
        const additionalPause =
          pausedAt && Number.isFinite(pausedAt) ? Math.max(0, ended - pausedAt) / 1000 : 0;
        const pausedSec = (state.activeSession.pausedDurationSec ?? 0) + additionalPause;
        const durationSec = Math.max(1, Math.round((ended - started) / 1000 - pausedSec));
        const performed = state.activeSession.activities.filter(hasActivityData);
        if (!performed.length) return null;
        const session: Session = {
          ...state.activeSession,
          completedAt,
          durationSec,
          pausedAt: null,
          pausedDurationSec: pausedSec,
          activities: performed,
        };
        const improvements = detectImprovements(state.sessions, session);
        set({
          sessions: sortSessions([session, ...state.sessions]),
          activeSession: null,
        });
        return { session, improvements };
      },

      discardWorkout: () => set({ activeSession: null }),

      updateSessionValues: (sessionId, activities) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, activities: activities.filter(hasActivityData) }
              : session,
          ),
        })),

      deleteSession: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.filter((session) => session.id !== sessionId),
        })),

      importData: (data) =>
        set({
          activities: data.activities,
          programs: data.programs,
          sessions: data.sessions,
          activeSession: null,
          settings: data.settings,
          seedVersion: data.seedVersion ?? 1,
          hasLegacyBackup: data.hasLegacyBackup ?? false,
        }),

      resetData: () => {
        clearLegacyData();
        set(buildFreshData());
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(resolveStorage),
      partialize: (state) => ({
        activities: state.activities,
        programs: state.programs,
        sessions: state.sessions,
        activeSession: state.activeSession,
        settings: state.settings,
        seedVersion: state.seedVersion,
        hasLegacyBackup: state.hasLegacyBackup,
      }),
    },
  ),
);

export function getProgramLastCompleted(programId: string): string | null {
  const sessions = useAppStore.getState().sessions;
  let latest: string | null = null;
  for (const session of sessions) {
    if (session.programId !== programId) continue;
    if (!latest || session.completedAt > latest) latest = session.completedAt;
  }
  return latest;
}

export function getLastActivityPerformance(activityId: string): SessionActivity | null {
  return lastActivityFor(useAppStore.getState().sessions, activityId);
}

export function getRecordsCount(): number {
  return computePersonalRecords(useAppStore.getState().sessions).length;
}

