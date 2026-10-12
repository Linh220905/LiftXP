// Effort analytics and RIR calculation engine for TrainXP

export const HARD_RIR = 3;
export const MIN_RATED = 3;

export interface LoggedSetData {
  weight?: number | string;
  reps?: number | string;
  rir?: number;
  rpe?: number;
  done: boolean;
  sec?: number;
}

export interface WorkoutEntryData {
  id: string;
  sets: LoggedSetData[];
}

export interface WorkoutHistoryItem {
  id: string;
  date: string; // ISO string or YYYY-MM-DD
  duration: string;
  volume: number;
  xp: number;
  routineName?: string;
  entries: WorkoutEntryData[];
}

/** Get numeric RIR of a set, or null if unrated */
export function rirOf(set?: LoggedSetData | null): number | null {
  if (!set || !set.done) return null;
  if (set.rir != null && !isNaN(Number(set.rir))) return Number(set.rir);
  if (set.rpe != null && !isNaN(Number(set.rpe))) return 10 - Number(set.rpe);
  return null;
}

/** Check if a set is considered a hard set (stimulus near failure) */
export function isHardSet(set?: LoggedSetData | null): boolean {
  const r = rirOf(set);
  return r !== null && r <= HARD_RIR;
}

/** Average RIR of a group of sets */
export function avgRir(sets: LoggedSetData[]): number | null {
  const values = sets.map(rirOf).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/** Calculate overall effort summary across workouts within a day window */
export function effortSummary(workouts: WorkoutHistoryItem[], days = 90) {
  const now = Date.now();
  const windowMs = days * 86400000;
  let doneCount = 0;
  let ratedCount = 0;
  let hardCount = 0;
  let rirSum = 0;

  workouts.forEach((w) => {
    const time = new Date(w.date).getTime();
    if (days > 0 && now - time > windowMs) return;

    w.entries.forEach((e) => {
      e.sets.forEach((s) => {
        if (!s.done) return;
        doneCount++;
        const r = rirOf(s);
        if (r !== null) {
          ratedCount++;
          rirSum += r;
          if (r <= HARD_RIR) hardCount++;
        }
      });
    });
  });

  return {
    doneCount,
    ratedCount,
    hardCount,
    avgRir: ratedCount >= MIN_RATED ? Math.round((rirSum / ratedCount) * 10) / 10 : null,
    hardPct: ratedCount >= MIN_RATED ? Math.round((hardCount / ratedCount) * 100) : null,
  };
}

/** Effort histogram bins: 0, 1, 2, 3, 4+ RIR */
export function effortHistogram(workouts: WorkoutHistoryItem[], days = 90) {
  const bins = [0, 0, 0, 0, 0]; // 0, 1, 2, 3, 4+
  let totalRated = 0;
  const now = Date.now();
  const windowMs = days * 86400000;

  workouts.forEach((w) => {
    const time = new Date(w.date).getTime();
    if (days > 0 && now - time > windowMs) return;

    w.entries.forEach((e) => {
      e.sets.forEach((s) => {
        if (!s.done) return;
        const r = rirOf(s);
        if (r !== null) {
          totalRated++;
          const idx = Math.min(4, Math.max(0, Math.floor(r)));
          bins[idx]++;
        }
      });
    });
  });

  return bins.map((count, i) => ({
    rirLabel: i === 4 ? '4+ RIR' : `${i} RIR`,
    count,
    pct: totalRated > 0 ? Math.round((count / totalRated) * 100) : 0,
    isHard: i <= HARD_RIR,
  }));
}
