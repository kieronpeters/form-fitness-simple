export type WeightUnit = 'kg' | 'lb';

export type ActivityCategory = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Cardio' | 'Core';

export type ActivityField =
  | 'sets'
  | 'reps'
  | 'weight'
  | 'duration'
  | 'speed'
  | 'incline'
  | 'rest'
  | 'notes';

export interface Activity {
  id: string;
  name: string;
  category: ActivityCategory;
  description?: string;
  image: string;
  fields: ActivityField[];
  repsLabel?: string;
  isCustom?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Target {
  sets?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  repsText?: string | null;
  perLeg?: boolean;
  durationSec?: number | null;
  speedKmh?: number | null;
  incline?: number | null;
  restSec?: number | null;
  note?: string | null;
}

export interface ProgramActivity {
  id: string;
  activityId: string;
  label: string;
  target: Target;
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  coverImage: string;
  activities: ProgramActivity[];
  seedKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionSet {
  id: string;
  reps: number | null;
  weightKg: number | null;
  kind?: 'working' | 'warmup';
}

export interface SessionActivity {
  id: string;
  activityId: string;
  label: string;
  category: ActivityCategory;
  image: string;
  fields: ActivityField[];
  repsLabel?: string;
  target: Target;
  sets: SessionSet[];
  durationSec: number | null;
  speedKmh: number | null;
  incline: number | null;
  notes: string;
}

export interface Session {
  id: string;
  programId: string | null;
  programName: string;
  programCover: string;
  startedAt: string;
  completedAt: string;
  durationSec: number;
  activities: SessionActivity[];
  notes?: string;
  isSample?: boolean;
}

export interface Settings {
  weightUnit: WeightUnit;
}

export interface AppData {
  activities: Activity[];
  programs: Program[];
  sessions: Session[];
  activeSession: Session | null;
  settings: Settings;
  seedVersion: number;
  hasLegacyBackup: boolean;
}

export interface ExportBundle {
  app: 'form-fitness';
  version: 1;
  exportedAt: string;
  data: AppData;
}

export interface PersonalRecord {
  activityId: string;
  activityName: string;
  image: string;
  weightKg: number | null;
  reps: number | null;
  sets: number | null;
  durationSec: number | null;
  achievedAt: string;
  sessionId: string;
}

export interface TrainingStats {
  workoutCount: number;
  totalDurationSec: number;
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  longestDurationSec: number;
  currentStreak: number;
  bestStreak: number;
  records: PersonalRecord[];
}
