import type { Activity, ActivityCategory, ActivityField, Program, ProgramActivity, Target } from '../types';
import { createId } from '../lib/ids';

const STRENGTH_FIELDS: ActivityField[] = ['sets', 'reps', 'weight', 'rest'];
const BODYWEIGHT_FIELDS: ActivityField[] = ['sets', 'reps', 'weight', 'rest'];

interface SeedActivityInput {
  id: string;
  name: string;
  category: ActivityCategory;
  fields: ActivityField[];
  image: string;
  description: string;
  repsLabel?: string;
}

const ACTIVITY_INPUTS: SeedActivityInput[] = [
  {
    id: 'bench-press',
    name: 'Bench Press',
    category: 'Chest',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/bench-press.jpg',
    description: 'Barbell bench press for horizontal pressing strength.',
  },
  {
    id: 'chest-press',
    name: 'Chest Press',
    category: 'Chest',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/chest-press.jpg',
    description: 'Machine or cable chest press with a stable pressing path.',
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    category: 'Shoulders',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/overhead-press.jpg',
    description: 'Standing or seated overhead press for shoulder strength.',
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raises',
    category: 'Shoulders',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/lateral-raise.jpg',
    description: 'Side-delt raises with controlled tempo.',
  },
  {
    id: 'push-up',
    name: 'Push-Ups',
    category: 'Chest',
    fields: BODYWEIGHT_FIELDS,
    image: '/images/activities/push-up.jpg',
    description: 'Bodyweight pressing, scaled to a challenging set.',
  },
  {
    id: 'pull-up',
    name: 'Pull-Ups',
    category: 'Back',
    fields: BODYWEIGHT_FIELDS,
    image: '/images/activities/pull-up.jpg',
    description: 'Vertical bodyweight pull for back and biceps strength.',
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'Back',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/lat-pulldown.jpg',
    description: 'Cable vertical pull for the lats.',
  },
  {
    id: 'seated-row',
    name: 'Seated Row',
    category: 'Back',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/seated-row.jpg',
    description: 'Seated cable row for mid-back strength.',
  },
  {
    id: 'straight-arm-pulldown',
    name: 'Straight-Arm Pulldown',
    category: 'Back',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/straight-arm-pulldown.jpg',
    description: 'Cable lat isolation with a long, controlled sweep.',
  },
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    category: 'Arms',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/barbell-curl.jpg',
    description: 'Loadable standing curl for the biceps.',
  },
  {
    id: 'hack-squat',
    name: 'Hack Squat',
    category: 'Legs',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/hack-squat.jpg',
    description: 'Machine squat for quad strength.',
  },
  {
    id: 'belt-squat',
    name: 'Belt Squat',
    category: 'Legs',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/belt-squat.jpg',
    description: 'Hip-belt squat that loads the legs with less spinal load.',
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    category: 'Legs',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/leg-extension.jpg',
    description: 'Machine quad isolation.',
  },
  {
    id: 'hamstring-curl',
    name: 'Hamstring Curl',
    category: 'Legs',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/hamstring-curl.jpg',
    description: 'Machine hamstring curl, controlled through a full range.',
  },
  {
    id: 'seated-calf-raise',
    name: 'Seated Calf Raise',
    category: 'Legs',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/seated-calf-raise.jpg',
    description: 'Seated calf raise for the soleus.',
  },
  {
    id: 'cable-fly',
    name: 'Cable Fly',
    category: 'Chest',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/cable-fly.jpg',
    description: 'Cable chest fly with a controlled stretch and squeeze.',
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    category: 'Arms',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/tricep-pushdown.jpg',
    description: 'Cable triceps isolation with fixed elbows.',
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    category: 'Legs',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/goblet-squat.jpg',
    description: 'Front-loaded squat with an upright torso.',
  },
  {
    id: 'walking-lunge',
    name: 'Walking Lunges',
    category: 'Legs',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/walking-lunge.jpg',
    description: 'Traveling lunge for legs, glutes and balance.',
    repsLabel: 'steps/leg',
  },
  {
    id: 'lying-leg-curl',
    name: 'Lying Leg Curl',
    category: 'Legs',
    fields: STRENGTH_FIELDS,
    image: '/images/activities/lying-leg-curl.jpg',
    description: 'Lying hamstring curl with a strong squeeze.',
  },
  {
    id: 'treadmill',
    name: 'Treadmill',
    category: 'Cardio',
    fields: ['duration', 'speed', 'incline'],
    image: '/images/activities/treadmill.jpg',
    description: 'Incline treadmill walk for a simple cardio warm-up or cool-down.',
  },
  {
    id: 'back-stretches',
    name: 'Back Stretches',
    category: 'Back',
    fields: ['duration', 'notes'],
    image: '/images/activities/back-stretches.jpg',
    description: 'A short, easy back-stretching block.',
  },
];

export function seedActivities(now = new Date().toISOString()): Activity[] {
  return ACTIVITY_INPUTS.map((input) => ({
    ...input,
    isCustom: false,
    createdAt: now,
    updatedAt: now,
  }));
}

type SeedTarget = Target;

function programActivity(activityId: string, label: string, target: SeedTarget): ProgramActivity {
  return { id: createId('pa'), activityId, label, target };
}

function treadmill(label: string): ProgramActivity {
  return programActivity('treadmill', label, {
    durationSec: 5 * 60,
    speedKmh: 5,
    incline: 9,
  });
}

function strength(
  activityId: string,
  label: string,
  sets: number,
  repsMin: number | null,
  repsMax: number | null,
  options: { repsText?: string; perLeg?: boolean; restSec?: number } = {},
): ProgramActivity {
  return programActivity(activityId, label, {
    sets,
    repsMin,
    repsMax,
    repsText: options.repsText ?? null,
    perLeg: options.perLeg ?? false,
    restSec: options.restSec ?? 90,
    note: null,
  });
}

export function seedPrograms(now = new Date().toISOString()): Program[] {
  const backStretches = () =>
    programActivity('back-stretches', 'Back Stretches', {
      durationSec: 5 * 60,
      note: null,
    });

  const days: Array<{ key: string; name: string; description: string; cover: string; activities: ProgramActivity[] }> = [
    {
      key: 'push',
      name: 'Day 1 – Push',
      description: 'Chest · shoulders · triceps',
      cover: '/images/activities/bench-press.jpg',
      activities: [
        treadmill('Treadmill (Warm-up)'),
        backStretches(),
        strength('bench-press', 'Bench Press', 3, 8, 10),
        strength('chest-press', 'Chest Press', 3, 8, 10),
        strength('overhead-press', 'Overhead Press', 3, 8, 10),
        strength('lateral-raise', 'Lateral Raises', 3, 12, 15, { restSec: 60 }),
        strength('push-up', 'Push-Ups', 3, null, null, { repsText: 'near failure', restSec: 60 }),
        treadmill('Treadmill (Cool-down)'),
      ],
    },
    {
      key: 'pull',
      name: 'Day 2 – Pull',
      description: 'Back · biceps',
      cover: '/images/activities/pull-up.jpg',
      activities: [
        treadmill('Treadmill (Warm-up)'),
        backStretches(),
        strength('pull-up', 'Pull-Ups', 3, 6, 10),
        strength('lat-pulldown', 'Lat Pulldown', 3, 8, 10),
        strength('seated-row', 'Seated Row', 3, 8, 10),
        strength('straight-arm-pulldown', 'Straight-Arm Pulldown', 3, 10, 12),
        strength('barbell-curl', 'Barbell Curl', 3, 8, 10, { restSec: 60 }),
        treadmill('Treadmill (Cool-down)'),
      ],
    },
    {
      key: 'legs',
      name: 'Day 3 – Legs',
      description: 'Quads · hamstrings · calves',
      cover: '/images/activities/hack-squat.jpg',
      activities: [
        treadmill('Treadmill (Warm-up)'),
        backStretches(),
        strength('hack-squat', 'Hack Squat', 3, 6, 8),
        strength('belt-squat', 'Belt Squat', 3, 8, 10),
        strength('leg-extension', 'Leg Extension', 3, 10, 12),
        strength('hamstring-curl', 'Hamstring Curl', 3, 10, 12),
        strength('seated-calf-raise', 'Seated Calf Raise', 4, 12, 15, { restSec: 60 }),
        treadmill('Treadmill (Cool-down)'),
      ],
    },
    {
      key: 'upper',
      name: 'Day 4 – Upper (Accessory)',
      description: 'Chest · back · arms',
      cover: '/images/activities/cable-fly.jpg',
      activities: [
        treadmill('Treadmill (Warm-up)'),
        backStretches(),
        strength('chest-press', 'Chest Press (Light)', 3, 10, 12),
        strength('cable-fly', 'Cable Fly', 3, 12, 15, { restSec: 60 }),
        strength('lat-pulldown', 'Pulldown Bar', 3, 10, 12),
        strength('barbell-curl', 'Bicep Curl Bar', 3, 10, 12, { restSec: 60 }),
        strength('tricep-pushdown', 'Tricep Pushdown', 3, 10, 12, { restSec: 60 }),
        treadmill('Treadmill (Cool-down)'),
      ],
    },
    {
      key: 'lower',
      name: 'Day 5 – Lower (Volume)',
      description: 'Legs · glutes · calves',
      cover: '/images/activities/walking-lunge.jpg',
      activities: [
        treadmill('Treadmill (Warm-up)'),
        backStretches(),
        strength('goblet-squat', 'Goblet Squat', 4, 10, 12),
        strength('walking-lunge', 'Walking Lunges', 4, 12, 12, { perLeg: true }),
        strength('lying-leg-curl', 'Lying Leg Curl', 3, 10, 12),
        strength('leg-extension', 'Leg Extension', 3, 10, 12),
        strength('seated-calf-raise', 'Seated Calf Raise', 4, 12, 15, { restSec: 60 }),
        treadmill('Treadmill (Cool-down)'),
      ],
    },
  ];

  return days.map((day) => ({
    id: createId('program'),
    name: day.name,
    description: day.description,
    coverImage: day.cover,
    activities: day.activities,
    seedKey: day.key,
    createdAt: now,
    updatedAt: now,
  }));
}

export const SEED_VERSION = 1;

export const ACTIVITY_ALIASES: Record<string, string> = {
  'machine-chest-press': 'chest-press',
  'ez-bar-curl': 'barbell-curl',
  'triceps-pushdown': 'tricep-pushdown',
  'dumbbell-lateral-raise': 'lateral-raise',
  'walking-lunge': 'walking-lunge',
  'lying-leg-curl': 'lying-leg-curl',
};

export function seedData(): { activities: Activity[]; programs: Program[]; seedVersion: number } {
  const now = new Date().toISOString();
  return {
    activities: seedActivities(now),
    programs: seedPrograms(now),
    seedVersion: SEED_VERSION,
  };
}

