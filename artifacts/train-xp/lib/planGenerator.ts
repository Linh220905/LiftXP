import { type Profile, type Routine, type RoutineExercise } from '@/context/AppState';
import { type ProgressionPolicy } from '@/lib/progression';
import EXERCISES_DATA from '../../../data/exercises_supabase_seed.json';

interface ExerciseDef {
  id: string;
  name: string;
  name_vi?: string;
  category: string;
  equipment: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  level: string;
  mechanic: string;
  force: string;
}

const ALL_EXERCISES = EXERCISES_DATA as ExerciseDef[];

// Map user equipment selection strings to exercise equipment tags
function isEquipmentMatched(exerciseEquip: string, userEquip: string[]): boolean {
  if (!userEquip || userEquip.length === 0) return true; // default all
  const normUser = userEquip.map((e) => e.toLowerCase());
  const eq = exerciseEquip.toLowerCase();

  if (eq === 'bodyweight' || eq === 'body only' || eq === 'none') return true;
  if (eq === 'barbell' && (normUser.includes('barbell') || normUser.includes('bars & plates'))) return true;
  if (eq === 'dumbbell' && (normUser.includes('dumbbell') || normUser.includes('small weights'))) return true;
  if (eq === 'kettlebell' && normUser.includes('kettlebell')) return true;
  if (eq === 'cable' && normUser.includes('cable machine')) return true;
  if (eq === 'machine' && (normUser.includes('machines') || normUser.includes('equipment'))) return true;
  if (eq === 'bench' && normUser.includes('bench')) return true;

  return normUser.some((u) => eq.includes(u) || u.includes(eq));
}

// Check if exercise avoids sensitive joint areas
function avoidsSensitiveJoints(ex: ExerciseDef, sensitiveJoints: string[]): boolean {
  if (!sensitiveJoints || sensitiveJoints.length === 0) return true;
  const sens = sensitiveJoints.map((s) => s.toLowerCase());

  if (sens.some((s) => s.includes('knee')) && (ex.id.includes('squat') || ex.id.includes('leg_extension'))) {
    // Knee sensitivity - prefer leg press or light compound over deep squat
    if (ex.level === 'advanced') return false;
  }
  if (sens.some((s) => s.includes('back')) && (ex.id.includes('deadlift') || ex.id === 'barbell_bent_over_row')) {
    // Back sensitivity - prefer chest-supported / cable rows over heavy barbell deadlift/row
    return false;
  }
  if (sens.some((s) => s.includes('shoulder')) && ex.id.includes('behind_neck')) {
    return false;
  }
  return true;
}

// Find exercise candidates matching muscle category and criteria
function findCandidates(
  muscleGroup: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'abs',
  userEquip: string[],
  sensitiveJoints: string[],
  mechanicFilter?: 'compound' | 'isolation',
): ExerciseDef[] {
  return ALL_EXERCISES.filter((e) => {
    const hitsMuscle =
      e.primary_muscles.includes(muscleGroup) ||
      (muscleGroup === 'legs' && (e.primary_muscles.includes('quadriceps') || e.primary_muscles.includes('gluteal') || e.primary_muscles.includes('hamstring'))) ||
      (muscleGroup === 'back' && (e.primary_muscles.includes('upper-back') || e.primary_muscles.includes('trapezius') || e.primary_muscles.includes('lower-back'))) ||
      (muscleGroup === 'arms' && (e.primary_muscles.includes('biceps') || e.primary_muscles.includes('triceps') || e.primary_muscles.includes('forearm'))) ||
      (muscleGroup === 'shoulders' && e.primary_muscles.includes('deltoids'));

    if (!hitsMuscle) return false;
    if (mechanicFilter && e.mechanic !== mechanicFilter) return false;
    if (!isEquipmentMatched(e.equipment, userEquip)) return false;
    if (!avoidsSensitiveJoints(e, sensitiveJoints)) return false;
    return true;
  });
}

function pickExercise(
  muscle: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'abs',
  userEquip: string[],
  sensitiveJoints: string[],
  mechanic: 'compound' | 'isolation',
  usedIds: Set<string>,
  fallbackId: string,
): string {
  const cands = findCandidates(muscle, userEquip, sensitiveJoints, mechanic).filter((c) => !usedIds.has(c.id));
  if (cands.length > 0) {
    usedIds.add(cands[0].id);
    return cands[0].id;
  }
  const anyCand = findCandidates(muscle, userEquip, sensitiveJoints).filter((c) => !usedIds.has(c.id));
  if (anyCand.length > 0) {
    usedIds.add(anyCand[0].id);
    return anyCand[0].id;
  }
  usedIds.add(fallbackId);
  return fallbackId;
}

export interface GeneratedPlan {
  routines: Routine[];
  weekSchedule: Record<number, string | null>;
  splitName: string;
}

export function generatePersonalizedPlan(profile: Profile): GeneratedPlan {
  const days = Math.min(Math.max(profile.daysPerWeek || 3, 2), 6);
  const equip = profile.equipment || [];
  const sensitive = profile.sensitiveJoints || [];
  const goal = profile.goal || 'Build Muscle';
  const exp = profile.experience || 'Regularly';

  // Base rep/set schema based on goal & experience
  let baseSets = 3;
  let baseReps = 10;
  let progression: ProgressionPolicy = 'linear';

  if (goal === 'Build Muscle') {
    baseSets = exp === 'Regularly' ? 4 : 3;
    baseReps = 8;
    progression = exp === 'Regularly' ? 'greyskull' : 'linear';
  } else if (goal === 'Burn Fat' || goal === 'Weight Loss') {
    baseSets = 3;
    baseReps = 12;
    progression = 'double';
  } else if (goal === 'Increase Endurance') {
    baseSets = 3;
    baseReps = 15;
    progression = 'double';
  }

  const used = new Set<string>();

  // 1. GENERATE ROUTINES BY SPLIT
  let routines: Routine[] = [];
  let weekSchedule: Record<number, string | null> = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 0: null };
  let splitName = '';

  if (days <= 2) {
    // 2-DAY FULL BODY SPLIT
    splitName = '2-Day Full Body Split';
    const fbA: RoutineExercise[] = [
      { id: pickExercise('chest', equip, sensitive, 'compound', used, 'barbell_bench_press'), sets: baseSets, reps: baseReps, targetWeight: 50, rir: 2 },
      { id: pickExercise('back', equip, sensitive, 'compound', used, 'lat_pulldown'), sets: baseSets, reps: baseReps, targetWeight: 45, rir: 2 },
      { id: pickExercise('legs', equip, sensitive, 'compound', used, 'barbell_squat'), sets: baseSets, reps: baseReps, targetWeight: 60, rir: 2 },
      { id: pickExercise('shoulders', equip, sensitive, 'compound', used, 'overhead_shoulder_press'), sets: baseSets, reps: 10, targetWeight: 30, rir: 2 },
      { id: pickExercise('arms', equip, sensitive, 'isolation', used, 'standing_bicep_cable_curl'), sets: 3, reps: 12, targetWeight: 20, rir: 1, supersetId: 'ss_fba_1' },
      { id: pickExercise('arms', equip, sensitive, 'isolation', used, 'tricep_rope_pushdown'), sets: 3, reps: 12, targetWeight: 20, rir: 1, supersetId: 'ss_fba_1' },
    ];

    const fbB: RoutineExercise[] = [
      { id: pickExercise('legs', equip, sensitive, 'compound', used, 'leg_press_machine'), sets: baseSets, reps: baseReps, targetWeight: 100, rir: 2 },
      { id: pickExercise('back', equip, sensitive, 'compound', used, 'seated_cable_row'), sets: baseSets, reps: baseReps, targetWeight: 45, rir: 2 },
      { id: pickExercise('chest', equip, sensitive, 'compound', used, 'incline_barbell_bench_press'), sets: baseSets, reps: baseReps, targetWeight: 45, rir: 2 },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'lying_leg_curl'), sets: 3, reps: 12, targetWeight: 35, rir: 1, supersetId: 'ss_fbb_1' },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'leg_extension_machine'), sets: 3, reps: 12, targetWeight: 40, rir: 1, supersetId: 'ss_fbb_1' },
      { id: pickExercise('abs', equip, sensitive, 'isolation', used, 'crunch'), sets: 3, reps: 15, targetWeight: 0, rir: 1 },
    ];

    routines = [
      { id: 'routine_fb_a', name: 'Full Body A (Foundation)', emoji: 'zap', progression, exercises: fbA },
      { id: 'routine_fb_b', name: 'Full Body B (Hypertrophy)', emoji: 'shield', progression, exercises: fbB },
    ];

    weekSchedule = { 1: 'routine_fb_a', 2: null, 3: null, 4: 'routine_fb_b', 5: null, 6: null, 0: null };
  } else if (days === 3) {
    // 3-DAY PUSH / PULL / LEGS
    splitName = '3-Day Push / Pull / Legs (PPL)';
    const pushEx: RoutineExercise[] = [
      { id: pickExercise('chest', equip, sensitive, 'compound', used, 'barbell_bench_press'), sets: baseSets, reps: baseReps, targetWeight: 60, rir: 2 },
      { id: pickExercise('chest', equip, sensitive, 'compound', used, 'incline_barbell_bench_press'), sets: 3, reps: 10, targetWeight: 50, rir: 2 },
      { id: pickExercise('shoulders', equip, sensitive, 'compound', used, 'overhead_shoulder_press'), sets: 3, reps: 8, targetWeight: 40, rir: 2 },
      { id: pickExercise('chest', equip, sensitive, 'isolation', used, 'pec_deck_fly'), sets: 3, reps: 12, targetWeight: 45, rir: 1, supersetId: 'ss_push_1' },
      { id: pickExercise('arms', equip, sensitive, 'isolation', used, 'tricep_rope_pushdown'), sets: 3, reps: 12, targetWeight: 25, rir: 1, supersetId: 'ss_push_1' },
    ];

    const pullEx: RoutineExercise[] = [
      { id: pickExercise('back', equip, sensitive, 'compound', used, 'lat_pulldown'), sets: baseSets, reps: baseReps, targetWeight: 55, rir: 2 },
      { id: pickExercise('back', equip, sensitive, 'compound', used, 'barbell_bent_over_row'), sets: baseSets, reps: 8, targetWeight: 60, rir: 2 },
      { id: pickExercise('back', equip, sensitive, 'compound', used, 'seated_cable_row'), sets: 3, reps: 10, targetWeight: 50, rir: 2 },
      { id: pickExercise('arms', equip, sensitive, 'isolation', used, 'standing_bicep_cable_curl'), sets: 3, reps: 12, targetWeight: 25, rir: 1, supersetId: 'ss_pull_1' },
      { id: pickExercise('arms', equip, sensitive, 'isolation', used, 'hammer_curls'), sets: 3, reps: 12, targetWeight: 14, rir: 1, supersetId: 'ss_pull_1' },
    ];

    const legEx: RoutineExercise[] = [
      { id: pickExercise('legs', equip, sensitive, 'compound', used, 'barbell_squat'), sets: baseSets, reps: baseReps, targetWeight: 80, rir: 2 },
      { id: pickExercise('legs', equip, sensitive, 'compound', used, 'leg_press_machine'), sets: 3, reps: 10, targetWeight: 140, rir: 2 },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'lying_leg_curl'), sets: 3, reps: 12, targetWeight: 40, rir: 1, supersetId: 'ss_leg_1' },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'leg_extension_machine'), sets: 3, reps: 12, targetWeight: 45, rir: 1, supersetId: 'ss_leg_1' },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'standing_calf_raise'), sets: 4, reps: 15, targetWeight: 50, rir: 1 },
    ];

    routines = [
      { id: 'routine_push', name: 'Push Day (Chest, Delts & Tris)', emoji: 'zap', progression, exercises: pushEx },
      { id: 'routine_pull', name: 'Pull Day (Lats, Traps & Biceps)', emoji: 'anchor', progression, exercises: pullEx },
      { id: 'routine_legs', name: 'Leg Day (Quads, Hamstrings & Calves)', emoji: 'shield', progression, exercises: legEx },
    ];

    weekSchedule = { 1: 'routine_push', 2: null, 3: 'routine_pull', 4: null, 5: 'routine_legs', 6: null, 0: null };
  } else if (days === 4) {
    // 4-DAY UPPER / LOWER SPLIT
    splitName = '4-Day Upper / Lower Split';
    const upperA: RoutineExercise[] = [
      { id: pickExercise('chest', equip, sensitive, 'compound', used, 'barbell_bench_press'), sets: baseSets, reps: baseReps, targetWeight: 60, rir: 2 },
      { id: pickExercise('back', equip, sensitive, 'compound', used, 'barbell_bent_over_row'), sets: baseSets, reps: baseReps, targetWeight: 60, rir: 2 },
      { id: pickExercise('shoulders', equip, sensitive, 'compound', used, 'overhead_shoulder_press'), sets: 3, reps: 8, targetWeight: 40, rir: 2 },
      { id: pickExercise('chest', equip, sensitive, 'isolation', used, 'cable_crossover'), sets: 3, reps: 12, targetWeight: 20, rir: 1, supersetId: 'ss_up_a' },
      { id: pickExercise('arms', equip, sensitive, 'isolation', used, 'tricep_rope_pushdown'), sets: 3, reps: 12, targetWeight: 25, rir: 1, supersetId: 'ss_up_a' },
    ];

    const lowerA: RoutineExercise[] = [
      { id: pickExercise('legs', equip, sensitive, 'compound', used, 'barbell_squat'), sets: baseSets, reps: baseReps, targetWeight: 80, rir: 2 },
      { id: pickExercise('legs', equip, sensitive, 'compound', used, 'leg_press_machine'), sets: 3, reps: 10, targetWeight: 140, rir: 2 },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'lying_leg_curl'), sets: 3, reps: 12, targetWeight: 40, rir: 1 },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'standing_calf_raise'), sets: 4, reps: 15, targetWeight: 50, rir: 1 },
      { id: pickExercise('abs', equip, sensitive, 'isolation', used, 'hanging_leg_raise'), sets: 3, reps: 12, targetWeight: 0, rir: 1 },
    ];

    const upperB: RoutineExercise[] = [
      { id: pickExercise('chest', equip, sensitive, 'compound', used, 'incline_barbell_bench_press'), sets: baseSets, reps: baseReps, targetWeight: 50, rir: 2 },
      { id: pickExercise('back', equip, sensitive, 'compound', used, 'lat_pulldown'), sets: baseSets, reps: baseReps, targetWeight: 55, rir: 2 },
      { id: pickExercise('back', equip, sensitive, 'compound', used, 'seated_cable_row'), sets: 3, reps: 10, targetWeight: 50, rir: 2 },
      { id: pickExercise('arms', equip, sensitive, 'isolation', used, 'standing_bicep_cable_curl'), sets: 3, reps: 12, targetWeight: 25, rir: 1, supersetId: 'ss_up_b' },
      { id: pickExercise('arms', equip, sensitive, 'isolation', used, 'hammer_curls'), sets: 3, reps: 12, targetWeight: 14, rir: 1, supersetId: 'ss_up_b' },
    ];

    const lowerB: RoutineExercise[] = [
      { id: pickExercise('legs', equip, sensitive, 'compound', used, 'leg_press_machine'), sets: 4, reps: 10, targetWeight: 150, rir: 2 },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'leg_extension_machine'), sets: 3, reps: 12, targetWeight: 45, rir: 1, supersetId: 'ss_low_b' },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'lying_leg_curl'), sets: 3, reps: 12, targetWeight: 40, rir: 1, supersetId: 'ss_low_b' },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'seated_calf_raise'), sets: 4, reps: 15, targetWeight: 45, rir: 1 },
      { id: pickExercise('abs', equip, sensitive, 'isolation', used, 'crunch'), sets: 3, reps: 15, targetWeight: 0, rir: 1 },
    ];

    routines = [
      { id: 'routine_upper_a', name: 'Upper Power (Chest & Back focus)', emoji: 'zap', progression, exercises: upperA },
      { id: 'routine_lower_a', name: 'Lower Power (Quad & Glute focus)', emoji: 'shield', progression, exercises: lowerA },
      { id: 'routine_upper_b', name: 'Upper Hypertrophy (Arms & Lats)', emoji: 'anchor', progression, exercises: upperB },
      { id: 'routine_lower_b', name: 'Lower Hypertrophy (Hamstrings & Calves)', emoji: 'target', progression, exercises: lowerB },
    ];

    weekSchedule = { 1: 'routine_upper_a', 2: 'routine_lower_a', 3: null, 4: 'routine_upper_b', 5: 'routine_lower_b', 6: null, 0: null };
  } else {
    // 5 OR 6-DAY HYBRID PPL SPLIT
    splitName = `${days}-Day High Volume Split (PPL + Upper/Lower)`;
    const pushA: RoutineExercise[] = [
      { id: pickExercise('chest', equip, sensitive, 'compound', used, 'barbell_bench_press'), sets: baseSets, reps: baseReps, targetWeight: 65, rir: 2 },
      { id: pickExercise('chest', equip, sensitive, 'compound', used, 'incline_barbell_bench_press'), sets: 3, reps: 10, targetWeight: 50, rir: 2 },
      { id: pickExercise('shoulders', equip, sensitive, 'compound', used, 'overhead_shoulder_press'), sets: 3, reps: 8, targetWeight: 40, rir: 2 },
      { id: pickExercise('chest', equip, sensitive, 'isolation', used, 'pec_deck_fly'), sets: 3, reps: 12, targetWeight: 45, rir: 1, supersetId: 'ss_p1' },
      { id: pickExercise('arms', equip, sensitive, 'isolation', used, 'tricep_rope_pushdown'), sets: 3, reps: 12, targetWeight: 25, rir: 1, supersetId: 'ss_p1' },
    ];

    const pullA: RoutineExercise[] = [
      { id: pickExercise('back', equip, sensitive, 'compound', used, 'lat_pulldown'), sets: baseSets, reps: baseReps, targetWeight: 60, rir: 2 },
      { id: pickExercise('back', equip, sensitive, 'compound', used, 'barbell_bent_over_row'), sets: baseSets, reps: 8, targetWeight: 60, rir: 2 },
      { id: pickExercise('back', equip, sensitive, 'compound', used, 'seated_cable_row'), sets: 3, reps: 10, targetWeight: 50, rir: 2 },
      { id: pickExercise('arms', equip, sensitive, 'isolation', used, 'standing_bicep_cable_curl'), sets: 3, reps: 12, targetWeight: 25, rir: 1, supersetId: 'ss_pu1' },
      { id: pickExercise('arms', equip, sensitive, 'isolation', used, 'hammer_curls'), sets: 3, reps: 12, targetWeight: 14, rir: 1, supersetId: 'ss_pu1' },
    ];

    const legA: RoutineExercise[] = [
      { id: pickExercise('legs', equip, sensitive, 'compound', used, 'barbell_squat'), sets: baseSets, reps: baseReps, targetWeight: 85, rir: 2 },
      { id: pickExercise('legs', equip, sensitive, 'compound', used, 'leg_press_machine'), sets: 3, reps: 10, targetWeight: 150, rir: 2 },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'lying_leg_curl'), sets: 3, reps: 12, targetWeight: 40, rir: 1, supersetId: 'ss_l1' },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'leg_extension_machine'), sets: 3, reps: 12, targetWeight: 45, rir: 1, supersetId: 'ss_l1' },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'standing_calf_raise'), sets: 4, reps: 15, targetWeight: 50, rir: 1 },
    ];

    const upperX: RoutineExercise[] = [
      { id: pickExercise('chest', equip, sensitive, 'compound', used, 'chest_press_machine'), sets: 3, reps: 10, targetWeight: 55, rir: 2 },
      { id: pickExercise('back', equip, sensitive, 'compound', used, 't_bar_row'), sets: 3, reps: 10, targetWeight: 50, rir: 2 },
      { id: pickExercise('shoulders', equip, sensitive, 'isolation', used, 'cable_crossover'), sets: 3, reps: 12, targetWeight: 20, rir: 1 },
      { id: pickExercise('arms', equip, sensitive, 'isolation', used, 'standing_bicep_cable_curl'), sets: 3, reps: 12, targetWeight: 25, rir: 1 },
    ];

    const lowerX: RoutineExercise[] = [
      { id: pickExercise('legs', equip, sensitive, 'compound', used, 'leg_press_machine'), sets: 4, reps: 12, targetWeight: 140, rir: 2 },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'lying_leg_curl'), sets: 4, reps: 12, targetWeight: 40, rir: 1 },
      { id: pickExercise('legs', equip, sensitive, 'isolation', used, 'seated_calf_raise'), sets: 4, reps: 15, targetWeight: 45, rir: 1 },
      { id: pickExercise('abs', equip, sensitive, 'isolation', used, 'hanging_leg_raise'), sets: 3, reps: 12, targetWeight: 0, rir: 1 },
    ];

    routines = [
      { id: 'routine_p1', name: 'Push (Chest & Delts)', emoji: 'zap', progression, exercises: pushA },
      { id: 'routine_pu1', name: 'Pull (Lats & Arms)', emoji: 'anchor', progression, exercises: pullA },
      { id: 'routine_l1', name: 'Legs (Quads & Glutes)', emoji: 'shield', progression, exercises: legA },
      { id: 'routine_up_x', name: 'Upper Body Pump', emoji: 'activity', progression, exercises: upperX },
      { id: 'routine_low_x', name: 'Lower Body & Core', emoji: 'target', progression, exercises: lowerX },
    ];

    if (days === 5) {
      weekSchedule = { 1: 'routine_p1', 2: 'routine_pu1', 3: 'routine_l1', 4: null, 5: 'routine_up_x', 6: 'routine_low_x', 0: null };
    } else {
      weekSchedule = { 1: 'routine_p1', 2: 'routine_pu1', 3: 'routine_l1', 4: 'routine_up_x', 5: 'routine_p1', 6: 'routine_low_x', 0: null };
    }
  }

  return { routines, weekSchedule, splitName };
}
