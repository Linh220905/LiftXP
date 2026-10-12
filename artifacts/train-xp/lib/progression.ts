// Progression engine for TrainXP: Linear, Greyskull LP, Double Progression, and 1RM calculators.

export type ProgressionPolicy = 'off' | 'linear' | 'greyskull' | 'double' | 'time';

export interface ProgressionConfig {
  policy: ProgressionPolicy;
  incrementKg?: number;
  minReps?: number;
  maxReps?: number;
  targetTimeSec?: number;
  incrementTimeSec?: number;
}

export interface SetHistoryEntry {
  weightKg: number;
  reps: number;
  targetReps: number;
  done: boolean;
  timeSec?: number;
  rir?: number;
}

export interface Prescription {
  weightKg: number;
  targetReps: number;
  reason: string;
  isDeload?: boolean;
}

export const HEAVY_BODY_PARTS = ['legs', 'quadriceps', 'hamstrings', 'glutes', 'back', 'chest'];

export function getDefaultIncrement(category: string): number {
  const cat = (category || '').toLowerCase();
  if (HEAVY_BODY_PARTS.some((p) => cat.includes(p))) {
    return 5.0; // 5kg for heavy compound lifts
  }
  return 2.5; // 2.5kg for upper body / isolation
}

/**
 * Calculate Estimated 1RM (1 Rep Max) using the Epley formula:
 * 1RM = Weight * (1 + Reps / 30)
 * For single rep: 1RM = Weight
 */
export function calculate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  if (reps > 15) {
    // Brzycki formula is safer for high reps
    return Math.round(weightKg * (36 / (37 - reps)) * 10) / 10;
  }
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Compute the next prescribed weight and target reps based on history & policy.
 */
export function calculateNextPrescription(
  lastWeight: number,
  lastSets: SetHistoryEntry[],
  config: ProgressionConfig,
  category = 'general'
): Prescription {
  const inc = config.incrementKg ?? getDefaultIncrement(category);
  const policy = config.policy;

  if (policy === 'off' || lastSets.length === 0) {
    return {
      weightKg: lastWeight,
      targetReps: lastSets[0]?.targetReps ?? 8,
      reason: 'Targets stay at current level.',
    };
  }

  const allDone = lastSets.every((s) => s.done && s.reps >= s.targetReps);
  const anyFailed = lastSets.some((s) => !s.done || s.reps < s.targetReps);

  if (policy === 'linear') {
    if (allDone) {
      return {
        weightKg: lastWeight + inc,
        targetReps: lastSets[0].targetReps,
        reason: `Completed all target reps! +${inc}kg progress unlocked.`,
      };
    }
    if (anyFailed) {
      return {
        weightKg: lastWeight,
        targetReps: lastSets[0].targetReps,
        reason: 'Repeat current weight to master form.',
      };
    }
  }

  if (policy === 'greyskull') {
    const lastSet = lastSets[lastSets.length - 1];
    const initialSetsPass = lastSets.slice(0, -1).every((s) => s.done && s.reps >= s.targetReps);

    if (initialSetsPass && lastSet && lastSet.done) {
      if (lastSet.reps >= lastSet.targetReps + 4) {
        // Double jump if crushed AMRAP by +4 reps
        return {
          weightKg: lastWeight + inc * 2,
          targetReps: lastSet.targetReps,
          reason: `Crushed AMRAP by ${lastSet.reps - lastSet.targetReps} reps! Double jump +${inc * 2}kg.`,
        };
      }
      if (lastSet.reps >= lastSet.targetReps) {
        return {
          weightKg: lastWeight + inc,
          targetReps: lastSet.targetReps,
          reason: `Beat AMRAP target (+${inc}kg progress).`,
        };
      }
    }

    // Fail -> 10% Deload
    const deloadWeight = Math.max(0, Math.round((lastWeight * 0.9) / 2.5) * 2.5);
    return {
      weightKg: deloadWeight,
      targetReps: lastSets[0].targetReps,
      reason: `Missed reps on AMRAP. Reset 10% deload to ${deloadWeight}kg for hypertrophy rebuild.`,
      isDeload: true,
    };
  }

  if (policy === 'double') {
    const minR = config.minReps ?? 8;
    const maxR = config.maxReps ?? 12;
    const currentR = lastSets[0]?.targetReps ?? minR;

    if (allDone) {
      if (currentR >= maxR) {
        return {
          weightKg: lastWeight + inc,
          targetReps: minR,
          reason: `Reached top of rep range (${maxR} reps)! Weight +${inc}kg, reset reps to ${minR}.`,
        };
      }
      return {
        weightKg: lastWeight,
        targetReps: currentR + 1,
        reason: `Target reps increased to ${currentR + 1} at ${lastWeight}kg.`,
      };
    }

    return {
      weightKg: lastWeight,
      targetReps: currentR,
      reason: `Hold at ${currentR} reps until full completion.`,
    };
  }

  return {
    weightKg: lastWeight,
    targetReps: lastSets[0]?.targetReps ?? 8,
    reason: 'Maintain current prescription.',
  };
}
