// 1RM Estimation and Historical Progression Engine for TrainXP

import { calculate1RM } from './progression';
import { type WorkoutHistoryItem } from './effort';

export interface OneRmPoint {
  date: string;
  timestamp: number;
  est1RM: number;
  weight: number;
  reps: number;
}

export interface Best1RmRecord {
  est1RM: number;
  weight: number;
  reps: number;
  date: string;
}

/** Get best 1RM set from a list of sets for an exercise entry */
export function bestSetOfEntry(sets: { weight?: number | string; reps?: number | string; done: boolean }[]): { est1RM: number; weight: number; reps: number } | null {
  let best: { est1RM: number; weight: number; reps: number } | null = null;

  sets.forEach((s) => {
    if (!s.done) return;
    const w = Number(s.weight);
    const r = Number(s.reps);
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;

    const est = calculate1RM(w, r);
    if (!best || est > best.est1RM) {
      best = { est1RM: est, weight: w, reps: r };
    }
  });

  return best;
}

/** Get 1RM timeline progression series for a specific exercise */
export function getExercise1RmSeries(workouts: WorkoutHistoryItem[], exerciseId: string): OneRmPoint[] {
  const points: OneRmPoint[] = [];

  workouts.forEach((w) => {
    const entry = w.entries.find((e) => e.id === exerciseId);
    if (!entry) return;

    const best = bestSetOfEntry(entry.sets);
    if (best) {
      points.push({
        date: w.date,
        timestamp: new Date(w.date).getTime(),
        est1RM: best.est1RM,
        weight: best.weight,
        reps: best.reps,
      });
    }
  });

  return points.sort((a, b) => a.timestamp - b.timestamp);
}

/** Get all-time best estimated 1RM for an exercise */
export function getExerciseBest1RM(workouts: WorkoutHistoryItem[], exerciseId: string): Best1RmRecord | null {
  const series = getExercise1RmSeries(workouts, exerciseId);
  if (series.length === 0) return null;

  let best: OneRmPoint = series[0];
  series.forEach((p) => {
    if (p.est1RM > best.est1RM) {
      best = p;
    }
  });

  return {
    est1RM: best.est1RM,
    weight: best.weight,
    reps: best.reps,
    date: best.date,
  };
}
