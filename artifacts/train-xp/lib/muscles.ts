// Muscle engine for TrainXP — normalization, alias resolution, and training load quantizer.

export const MUSCLES = [
  "trapezius",
  "deltoids",
  "chest",
  "upper-back",
  "serratus",
  "biceps",
  "triceps",
  "forearm",
  "abs",
  "obliques",
  "lower-back",
  "gluteal",
  "quadriceps",
  "hamstring",
  "adductors",
  "hip-flexors",
  "calves",
  "tibialis",
] as const;

export type MuscleSlug = (typeof MUSCLES)[number];

export const INERT_PARTS = [
  "head",
  "neck",
  "hands",
  "feet",
  "knees",
  "ankles",
] as const;

export const MUSCLE_NAMES: Record<MuscleSlug, { en: string; vi: string }> = {
  trapezius: { en: "Traps", vi: "Cầu vai" },
  deltoids: { en: "Shoulders", vi: "Cơ vai" },
  chest: { en: "Chest", vi: "Cơ ngực" },
  "upper-back": { en: "Upper Back / Lats", vi: "Lưng xô trên" },
  serratus: { en: "Serratus", vi: "Cơ liên sườn" },
  biceps: { en: "Biceps", vi: "Tay trước" },
  triceps: { en: "Triceps", vi: "Tay sau" },
  forearm: { en: "Forearms", vi: "Cẳng tay" },
  abs: { en: "Abs", vi: "Cơ bụng" },
  obliques: { en: "Obliques", vi: "Cơ bụng liên sườn" },
  "lower-back": { en: "Lower Back", vi: "Lưng dưới" },
  gluteal: { en: "Glutes", vi: "Cơ mông" },
  quadriceps: { en: "Quads", vi: "Đùi trước" },
  hamstring: { en: "Hamstrings", vi: "Đùi sau" },
  adductors: { en: "Adductors", vi: "Khép đùi" },
  "hip-flexors": { en: "Hip Flexors", vi: "Gập hông" },
  calves: { en: "Calves", vi: "Bắp chân" },
  tibialis: { en: "Shins", vi: "Ống đồng" },
};

// Aliases mapping free text from datasets to canonical muscle slugs
const ALIAS_MAP: Record<string, MuscleSlug | null> = {
  abs: "abs",
  abdominals: "abs",
  "lower abs": "abs",
  core: "abs",
  chest: "chest",
  pectorals: "chest",
  "upper chest": "chest",
  biceps: "biceps",
  brachialis: "biceps",
  triceps: "triceps",
  delts: "deltoids",
  deltoids: "deltoids",
  shoulders: "deltoids",
  "front delts": "deltoids",
  "rear deltoids": "deltoids",
  "rotator cuff": "deltoids",
  lats: "upper-back",
  "latissimus dorsi": "upper-back",
  rhomboids: "upper-back",
  "upper back": "upper-back",
  back: "upper-back",
  traps: "trapezius",
  trapezius: "trapezius",
  "levator scapulae": "trapezius",
  serratus: "serratus",
  "serratus anterior": "serratus",
  forearms: "forearm",
  forearm: "forearm",
  wrists: "forearm",
  "grip muscles": "forearm",
  obliques: "obliques",
  "lower back": "lower-back",
  spine: "lower-back",
  erector: "lower-back",
  glutes: "gluteal",
  gluteal: "gluteal",
  abductors: "gluteal",
  quads: "quadriceps",
  quadriceps: "quadriceps",
  hamstrings: "hamstring",
  hamstring: "hamstring",
  calves: "calves",
  soleus: "calves",
  gastrocnemius: "calves",
  shins: "tibialis",
  tibialis: "tibialis",
  "tibialis anterior": "tibialis",
  adductors: "adductors",
  groin: "adductors",
  "inner thighs": "adductors",
  "hip flexors": "hip-flexors",
  "hip-flexors": "hip-flexors",
  // Inert/Non-drawable
  neck: null,
  hands: null,
  feet: null,
  ankles: null,
  cardio: null,
  "cardiovascular system": null,
};

const SECONDARY_WEIGHT = 0.4;

export function resolveMuscleSlug(name: string): MuscleSlug | null {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  if (key in ALIAS_MAP) return ALIAS_MAP[key];
  return null;
}

export interface ExerciseMuscleInput {
  target?: string;
  primary?: string[];
  secondary?: string[];
}

export function musclesOf(ex: ExerciseMuscleInput): Record<MuscleSlug, number> {
  const result: Partial<Record<MuscleSlug, number>> = {};

  const add = (name?: string, weight = 1.0) => {
    if (!name) return;
    const slug = resolveMuscleSlug(name);
    if (slug) {
      result[slug] = Math.max(result[slug] || 0, weight);
    }
  };

  if (ex.target) add(ex.target, 1.0);
  if (ex.primary) ex.primary.forEach((m) => add(m, 1.0));
  if (ex.secondary) ex.secondary.forEach((m) => add(m, SECONDARY_WEIGHT));

  return result as Record<MuscleSlug, number>;
}

export interface SetLoadItem {
  target?: string;
  primary?: string[];
  secondary?: string[];
  sets: number;
}

export function loadOf(items: SetLoadItem[]): Record<MuscleSlug, number> {
  const load: Partial<Record<MuscleSlug, number>> = {};
  MUSCLES.forEach((m) => {
    load[m] = 0;
  });

  items.forEach((item) => {
    if (!item.sets || item.sets <= 0) return;
    const m = musclesOf(item);
    for (const slug in m) {
      const s = slug as MuscleSlug;
      load[s] = (load[s] || 0) + (m[s] || 0) * item.sets;
    }
  });

  return load as Record<MuscleSlug, number>;
}

export type IntensityLevel = 0 | 1 | 2 | 3 | 4;

export function levelsOf(
  load: Partial<Record<MuscleSlug, number>>,
): Record<MuscleSlug, IntensityLevel> {
  const max = Math.max(0, ...MUSCLES.map((m) => load[m] || 0));
  const levels: Partial<Record<MuscleSlug, IntensityLevel>> = {};

  MUSCLES.forEach((m) => {
    const v = load[m] || 0;
    if (!v || max <= 0) {
      levels[m] = 0;
    } else {
      const level = Math.max(
        1,
        Math.min(4, Math.ceil((v / max) * 4)),
      ) as IntensityLevel;
      levels[m] = level;
    }
  });

  return levels as Record<MuscleSlug, IntensityLevel>;
}

export function rankOf(load: Partial<Record<MuscleSlug, number>>): {
  worked: MuscleSlug[];
  missed: MuscleSlug[];
} {
  const entries = (Object.keys(load) as MuscleSlug[])
    .map((slug) => ({ slug, count: load[slug] || 0 }))
    .sort((a, b) => b.count - a.count);

  const worked = entries.filter((e) => e.count > 0).map((e) => e.slug);
  const missed = MUSCLES.filter((m) => !worked.includes(m));

  return { worked, missed };
}
