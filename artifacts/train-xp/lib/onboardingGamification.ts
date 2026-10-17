/**
 * Onboarding Gamification & Progression Engine
 * Reverse-engineered from Arrow (Levels) with RPG Leveling & Trophy Tiering.
 * Formula: Level N requires N * 1,000 XP.
 * Cumulative XP to reach level N: TotalXP(N) = 500 * (N - 1) * N.
 */

export type TrophyTier =
  | "Wood"
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Diamond"
  | "Amethyst"
  | "Ruby"
  | "Prismatic";

export const TROPHY_TIERS: TrophyTier[] = [
  "Wood",
  "Bronze",
  "Silver",
  "Gold",
  "Diamond",
  "Amethyst",
  "Ruby",
  "Prismatic",
];

export interface TierBenchmark {
  tier: TrophyTier;
  minRatio: number;
  xpAward: number;
  name: string;
  nameVi: string;
}

export interface LiftTrophyConfig {
  key: "bench" | "squat" | "deadlift";
  exerciseName: string;
  exerciseNameVi: string;
  benchmarks: TierBenchmark[];
}

export const LIFT_TROPHY_CONFIGS: LiftTrophyConfig[] = [
  {
    key: "bench",
    exerciseName: "Bench Press",
    exerciseNameVi: "Đẩy ngực ngang",
    benchmarks: [
      { tier: "Wood", minRatio: 0, xpAward: 250, name: "Wood Bench", nameVi: "Đẩy ngực - Gỗ" },
      { tier: "Bronze", minRatio: 0.5, xpAward: 500, name: "Bronze Bench", nameVi: "Đẩy ngực - Đồng" },
      { tier: "Silver", minRatio: 0.75, xpAward: 800, name: "Silver Bench", nameVi: "Đẩy ngực - Bạc" },
      { tier: "Gold", minRatio: 1.0, xpAward: 1200, name: "Gold Bench", nameVi: "Đẩy ngực - Vàng" },
      { tier: "Diamond", minRatio: 1.25, xpAward: 1500, name: "Diamond Bench", nameVi: "Đẩy ngực - Kim Cương" },
      { tier: "Amethyst", minRatio: 1.5, xpAward: 2000, name: "Amethyst Bench", nameVi: "Đẩy ngực - Thạch Anh Tím" },
      { tier: "Ruby", minRatio: 1.75, xpAward: 2500, name: "Ruby Bench", nameVi: "Đẩy ngực - Hồng Ngọc" },
      { tier: "Prismatic", minRatio: 2.0, xpAward: 3000, name: "Prismatic Bench", nameVi: "Đẩy ngực - Thần Thoại" },
    ],
  },
  {
    key: "squat",
    exerciseName: "Barbell Squat",
    exerciseNameVi: "Gánh tạ Squat",
    benchmarks: [
      { tier: "Wood", minRatio: 0, xpAward: 250, name: "Wood Squat", nameVi: "Squat - Gỗ" },
      { tier: "Bronze", minRatio: 0.75, xpAward: 500, name: "Bronze Squat", nameVi: "Squat - Đồng" },
      { tier: "Silver", minRatio: 1.0, xpAward: 800, name: "Silver Squat", nameVi: "Squat - Bạc" },
      { tier: "Gold", minRatio: 1.5, xpAward: 1200, name: "Gold Squat", nameVi: "Squat - Vàng" },
      { tier: "Diamond", minRatio: 1.75, xpAward: 1500, name: "Diamond Squat", nameVi: "Squat - Kim Cương" },
      { tier: "Amethyst", minRatio: 2.0, xpAward: 2000, name: "Amethyst Squat", nameVi: "Squat - Thạch Anh Tím" },
      { tier: "Ruby", minRatio: 2.25, xpAward: 2500, name: "Ruby Squat", nameVi: "Squat - Hồng Ngọc" },
      { tier: "Prismatic", minRatio: 2.5, xpAward: 3000, name: "Prismatic Squat", nameVi: "Squat - Thần Thoại" },
    ],
  },
  {
    key: "deadlift",
    exerciseName: "Deadlift",
    exerciseNameVi: "Kéo Deadlift",
    benchmarks: [
      { tier: "Wood", minRatio: 0, xpAward: 250, name: "Wood Deadlift", nameVi: "Deadlift - Gỗ" },
      { tier: "Bronze", minRatio: 0.85, xpAward: 500, name: "Bronze Deadlift", nameVi: "Deadlift - Đồng" },
      { tier: "Silver", minRatio: 1.25, xpAward: 800, name: "Silver Deadlift", nameVi: "Deadlift - Bạc" },
      { tier: "Gold", minRatio: 1.75, xpAward: 1200, name: "Gold Deadlift", nameVi: "Deadlift - Vàng" },
      { tier: "Diamond", minRatio: 2.0, xpAward: 1500, name: "Diamond Deadlift", nameVi: "Deadlift - Kim Cương" },
      { tier: "Amethyst", minRatio: 2.5, xpAward: 2000, name: "Amethyst Deadlift", nameVi: "Deadlift - Thạch Anh Tím" },
      { tier: "Ruby", minRatio: 2.75, xpAward: 2500, name: "Ruby Deadlift", nameVi: "Deadlift - Hồng Ngọc" },
      { tier: "Prismatic", minRatio: 3.0, xpAward: 3000, name: "Prismatic Deadlift", nameVi: "Deadlift - Thần Thoại" },
    ],
  },
];

export interface UnlockedTrophy {
  id: string;
  name: string;
  exercise: string;
  tier: TrophyTier;
  prKg: number;
  xpAward: number;
  description: string;
}

export interface GamificationResult {
  unlockedTrophies: UnlockedTrophy[];
  totalExp: number;
  startLevel: number;
  endLevel: number;
  xpProgressInLevel: number;
  xpNeededForNext: number;
  bestPrExercise: string;
}

export interface StreakCommitmentOption {
  key: string;
  days: number;
  label: string;
  secondaryText: string;
  multiplier: number;
}

export const STREAK_COMMITMENT_OPTIONS: StreakCommitmentOption[] = [
  {
    key: "7_day_streak",
    days: 7,
    label: "7 day streak",
    secondaryText: "Solid",
    multiplier: 3,
  },
  {
    key: "14_day_streak",
    days: 14,
    label: "14 day streak",
    secondaryText: "Great",
    multiplier: 5,
  },
  {
    key: "30_day_streak",
    days: 30,
    label: "30 day streak",
    secondaryText: "Incredible",
    multiplier: 8,
  },
  {
    key: "50_day_streak",
    days: 50,
    label: "50 day streak",
    secondaryText: "Unstoppable",
    multiplier: 12,
  },
];

/**
 * Maps exercise and tier to Arrow's extracted 3D Metallic Trophy PNG assets.
 */
export function getTrophyAsset(exercise: string, tier: TrophyTier) {
  const normExercise = exercise.toLowerCase();
  const normTier = tier.toLowerCase();

  if (normExercise.includes("squat")) {
    switch (normTier) {
      case "bronze":
        return require("@/assets/arrow/src_assets_trophies_normal_squatbwpercent_bronze.png");
      case "silver":
        return require("@/assets/arrow/src_assets_trophies_normal_squatbwpercent_silver.png");
      case "gold":
        return require("@/assets/arrow/src_assets_trophies_normal_squatbwpercent_gold.png");
      case "diamond":
        return require("@/assets/arrow/src_assets_trophies_normal_squatbwpercent_diamond.png");
      case "amethyst":
        return require("@/assets/arrow/src_assets_trophies_normal_squatbwpercent_amethyst.png");
      case "ruby":
        return require("@/assets/arrow/src_assets_trophies_normal_squatbwpercent_ruby.png");
      case "prismatic":
        return require("@/assets/arrow/src_assets_trophies_normal_squatbwpercent_prismatic.png");
      case "wood":
      default:
        return require("@/assets/arrow/src_assets_trophies_normal_squatbwpercent_wood.png");
    }
  }

  if (normExercise.includes("deadlift")) {
    switch (normTier) {
      case "bronze":
        return require("@/assets/arrow/src_assets_trophies_normal_deadliftbwpercent_bronze.png");
      case "silver":
        return require("@/assets/arrow/src_assets_trophies_normal_deadliftbwpercent_silver.png");
      case "gold":
        return require("@/assets/arrow/src_assets_trophies_normal_deadliftbwpercent_gold.png");
      case "diamond":
        return require("@/assets/arrow/src_assets_trophies_normal_deadliftbwpercent_diamond.png");
      case "amethyst":
        return require("@/assets/arrow/src_assets_trophies_normal_deadliftbwpercent_amethyst.png");
      case "ruby":
        return require("@/assets/arrow/src_assets_trophies_normal_deadliftbwpercent_ruby.png");
      case "prismatic":
        return require("@/assets/arrow/src_assets_trophies_normal_deadliftbwpercent_prismatic.png");
      case "wood":
      default:
        return require("@/assets/arrow/src_assets_trophies_normal_deadliftbwpercent_wood.png");
    }
  }

  // Bench Press default
  switch (normTier) {
    case "bronze":
      return require("@/assets/arrow/src_assets_trophies_normal_benchbwpercent_bronze.png");
    case "silver":
      return require("@/assets/arrow/src_assets_trophies_normal_benchbwpercent_silver.png");
    case "gold":
      return require("@/assets/arrow/src_assets_trophies_normal_benchbwpercent_gold.png");
    case "diamond":
      return require("@/assets/arrow/src_assets_trophies_normal_benchbwpercent_diamond.png");
    case "amethyst":
      return require("@/assets/arrow/src_assets_trophies_normal_benchbwpercent_amethyst.png");
    case "ruby":
      return require("@/assets/arrow/src_assets_trophies_normal_benchbwpercent_ruby.png");
    case "prismatic":
      return require("@/assets/arrow/src_assets_trophies_normal_benchbwpercent_prismatic.png");
    case "wood":
    default:
      return require("@/assets/arrow/src_assets_trophies_normal_benchbwpercent_wood.png");
  }
}

/**
 * Maps streak duration to Arrow's streak flame artwork.
 */
export function getStreakAsset(days: number) {
  if (days >= 50) {
    return require("@/assets/arrow/src_assets_svg_streak_prismaticstreak.png");
  }
  if (days >= 30) {
    return require("@/assets/arrow/src_assets_svg_streak_bluestreak.png");
  }
  if (days >= 14) {
    return require("@/assets/arrow/src_assets_svg_streak_yellowstreak.png");
  }
  return require("@/assets/arrow/src_assets_svg_streak_orangestreak.png");
}

/**
 * Evaluates initial PRs against bodyweight ratios to award starter trophies & XP.
 */
export function calculateInitialGamification(params: {
  benchKg?: number;
  squatKg?: number;
  deadliftKg?: number;
  bodyweightKg: number;
  unit?: "Metric" | "Imperial";
}): GamificationResult {
  const bw = Math.max(params.bodyweightKg || 68, 30);
  const trophies: UnlockedTrophy[] = [];
  let totalExp = 0;

  // 1. Bench Press Evaluation
  if (params.benchKg && params.benchKg > 0) {
    const ratio = params.benchKg / bw;
    let tier: TrophyTier = "Wood";
    let xp = 250;

    if (ratio >= 2.0) {
      tier = "Prismatic";
      xp = 3000;
    } else if (ratio >= 1.75) {
      tier = "Ruby";
      xp = 2500;
    } else if (ratio >= 1.5) {
      tier = "Amethyst";
      xp = 2000;
    } else if (ratio >= 1.25) {
      tier = "Diamond";
      xp = 1500;
    } else if (ratio >= 1.0) {
      tier = "Gold";
      xp = 1200;
    } else if (ratio >= 0.75) {
      tier = "Silver";
      xp = 800;
    } else if (ratio >= 0.5) {
      tier = "Bronze";
      xp = 500;
    }

    trophies.push({
      id: "trophy_bench",
      name: "Bench Press Mastery",
      exercise: "Bench Press",
      tier,
      prKg: params.benchKg,
      xpAward: xp,
      description: `Hit ${Math.round(params.benchKg)}kg Bench Press benchmark (${Math.round(ratio * 100)}% bodyweight).`,
    });
    totalExp += xp;
  }

  // 2. Squat Evaluation
  if (params.squatKg && params.squatKg > 0) {
    const ratio = params.squatKg / bw;
    let tier: TrophyTier = "Wood";
    let xp = 250;

    if (ratio >= 2.5) {
      tier = "Prismatic";
      xp = 3000;
    } else if (ratio >= 2.25) {
      tier = "Ruby";
      xp = 2500;
    } else if (ratio >= 2.0) {
      tier = "Amethyst";
      xp = 2000;
    } else if (ratio >= 1.75) {
      tier = "Diamond";
      xp = 1500;
    } else if (ratio >= 1.5) {
      tier = "Gold";
      xp = 1200;
    } else if (ratio >= 1.0) {
      tier = "Silver";
      xp = 800;
    } else if (ratio >= 0.75) {
      tier = "Bronze";
      xp = 500;
    }

    trophies.push({
      id: "trophy_squat",
      name: "Squat Mastery",
      exercise: "Barbell Squat",
      tier,
      prKg: params.squatKg,
      xpAward: xp,
      description: `Hit ${Math.round(params.squatKg)}kg Squat benchmark (${Math.round(ratio * 100)}% bodyweight).`,
    });
    totalExp += xp;
  }

  // 3. Deadlift Evaluation
  if (params.deadliftKg && params.deadliftKg > 0) {
    const ratio = params.deadliftKg / bw;
    let tier: TrophyTier = "Wood";
    let xp = 250;

    if (ratio >= 3.0) {
      tier = "Prismatic";
      xp = 3000;
    } else if (ratio >= 2.75) {
      tier = "Ruby";
      xp = 2500;
    } else if (ratio >= 2.5) {
      tier = "Amethyst";
      xp = 2000;
    } else if (ratio >= 2.0) {
      tier = "Diamond";
      xp = 1500;
    } else if (ratio >= 1.75) {
      tier = "Gold";
      xp = 1200;
    } else if (ratio >= 1.25) {
      tier = "Silver";
      xp = 800;
    } else if (ratio >= 0.85) {
      tier = "Bronze";
      xp = 500;
    }

    trophies.push({
      id: "trophy_deadlift",
      name: "Deadlift Mastery",
      exercise: "Deadlift",
      tier,
      prKg: params.deadliftKg,
      xpAward: xp,
      description: `Hit ${Math.round(params.deadliftKg)}kg Deadlift benchmark (${Math.round(ratio * 100)}% bodyweight).`,
    });
    totalExp += xp;
  }

  // Base onboarding participation XP if no PRs were entered
  if (totalExp === 0) {
    totalExp = 500;
  }

  // Exact Arrow RPG level loop calculation (Line 985522 of Arrow bundle)
  // Level N requires N * 1,000 XP
  let currentLevel = 1;
  let remainingXp = totalExp;
  let xpForNext = currentLevel * 1000;

  while (remainingXp >= xpForNext) {
    remainingXp -= xpForNext;
    currentLevel += 1;
    xpForNext = currentLevel * 1000;
  }

  // Determine best exercise
  let bestExercise = "Bench Press";
  if (trophies.length > 0) {
    bestExercise = trophies.reduce((prev, curr) =>
      curr.xpAward > prev.xpAward ? curr : prev,
    ).exercise;
  }

  return {
    unlockedTrophies: trophies,
    totalExp,
    startLevel: 1,
    endLevel: currentLevel,
    xpProgressInLevel: remainingXp,
    xpNeededForNext: xpForNext,
    bestPrExercise: bestExercise,
  };
}
