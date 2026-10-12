import { db, usersTable, userExerciseRanksTable, workoutsTable, workoutSetsTable, socialActivitiesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import type { OnboardingRequest, UpdateProfileRequest, FinishWorkoutRequest } from "@workspace/api-zod";

export class UserService {
  static async getOrCreateDefaultUser() {
    const existing = await db.select().from(usersTable).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    // Seed default user if not present
    const [created] = await db.insert(usersTable).values({
      handle: "linhtrains",
      displayName: "Linh",
      experience: "1–3 years",
      goal: "Build muscle",
      age: "24",
      height: "175 cm",
      weight: "72 kg",
      level: 4,
      xp: 820,
      xpToNext: 1000,
      streak: 7,
      workoutsCount: 18,
      prsCount: 4,
      totalVolume: 48200,
    }).returning();

    // Seed default ranks
    await db.insert(userExerciseRanksTable).values([
      { userId: created.id, exerciseName: "Bench Press", rank: "Silver III", bestWeight: 65, bestReps: 6, nextTarget: "70 kg × 6", progress: 0.72 },
      { userId: created.id, exerciseName: "Back Squat", rank: "Bronze II", bestWeight: 80, bestReps: 5, nextTarget: "90 kg × 5", progress: 0.48 },
      { userId: created.id, exerciseName: "Deadlift", rank: "Silver I", bestWeight: 110, bestReps: 4, nextTarget: "120 kg × 3", progress: 0.61 },
      { userId: created.id, exerciseName: "Shoulder Press", rank: "Bronze I", bestWeight: 28, bestReps: 8, nextTarget: "32 kg × 6", progress: 0.31 },
    ]);

    // Seed default social activities
    await db.insert(socialActivitiesTable).values([
      { userId: created.id, userName: "Minh", activityType: "rank_up", detail: "reached Gold on Squat", xpAmount: 250, likesCount: 4 },
      { userId: created.id, userName: "Linh", activityType: "pr_hit", detail: "hit a new Bench Press PR", xpAmount: 180, likesCount: 2 },
      { userId: created.id, userName: "Nam", activityType: "streak_milestone", detail: "completed a 30-day streak", xpAmount: 300, likesCount: 5 },
    ]);

    return created;
  }

  static async getProfileAndStats() {
    const user = await this.getOrCreateDefaultUser();
    return {
      profile: {
        id: user.id,
        handle: user.handle,
        displayName: user.displayName,
        experience: user.experience,
        goal: user.goal,
        age: user.age ?? undefined,
        height: user.height ?? undefined,
        weight: user.weight ?? undefined,
      },
      stats: {
        level: user.level,
        xp: user.xp,
        xpToNext: user.xpToNext,
        streak: user.streak,
        workouts: user.workoutsCount,
        prs: user.prsCount,
        totalVolume: user.totalVolume,
      },
    };
  }

  static async completeOnboarding(data: OnboardingRequest) {
    const user = await this.getOrCreateDefaultUser();
    const [updated] = await db.update(usersTable)
      .set({
        displayName: data.displayName || user.displayName,
        handle: data.handle || user.handle,
        experience: data.experience,
        goal: data.goal,
        age: data.age ?? user.age,
        height: data.height ?? user.height,
        weight: data.weight ?? user.weight,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    return {
      profile: {
        id: updated.id,
        handle: updated.handle,
        displayName: updated.displayName,
        experience: updated.experience,
        goal: updated.goal,
        age: updated.age ?? undefined,
        height: updated.height ?? undefined,
        weight: updated.weight ?? undefined,
      },
      stats: {
        level: updated.level,
        xp: updated.xp,
        xpToNext: updated.xpToNext,
        streak: updated.streak,
        workouts: updated.workoutsCount,
        prs: updated.prsCount,
        totalVolume: updated.totalVolume,
      },
    };
  }

  static async updateProfile(data: UpdateProfileRequest) {
    const user = await this.getOrCreateDefaultUser();
    const [updated] = await db.update(usersTable)
      .set({
        displayName: data.displayName ?? user.displayName,
        experience: data.experience ?? user.experience,
        goal: data.goal ?? user.goal,
        age: data.age ?? user.age,
        height: data.height ?? user.height,
        weight: data.weight ?? user.weight,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    return {
      profile: {
        id: updated.id,
        handle: updated.handle,
        displayName: updated.displayName,
        experience: updated.experience,
        goal: updated.goal,
        age: updated.age ?? undefined,
        height: updated.height ?? undefined,
        weight: updated.weight ?? undefined,
      },
      stats: {
        level: updated.level,
        xp: updated.xp,
        xpToNext: updated.xpToNext,
        streak: updated.streak,
        workouts: updated.workoutsCount,
        prs: updated.prsCount,
        totalVolume: updated.totalVolume,
      },
    };
  }

  static async finishWorkout(data: FinishWorkoutRequest) {
    const user = await this.getOrCreateDefaultUser();

    let sessionVolume = 0;
    const completedSets = data.sets.filter((s) => s.isCompleted);
    for (const set of completedSets) {
      sessionVolume += set.weight * set.reps;
    }

    const xpEarned = 180;
    const rankedUp = user.xp + xpEarned >= user.xpToNext;
    const newLevel = rankedUp ? user.level + 1 : user.level;
    const newXp = rankedUp ? user.xp + xpEarned - user.xpToNext : user.xp + xpEarned;
    const newXpToNext = rankedUp ? user.xpToNext + 250 : user.xpToNext;
    const newStreak = user.streak + 1;
    const newWorkoutsCount = user.workoutsCount + 1;
    const newPrsCount = user.prsCount + 1;
    const newTotalVolume = user.totalVolume + sessionVolume;

    const [workout] = await db.insert(workoutsTable).values({
      userId: user.id,
      name: data.name,
      durationMinutes: data.durationMinutes,
      xpEarned,
      totalSets: completedSets.length,
      totalVolume: sessionVolume,
      isCompleted: true,
      hasNewPr: true,
      rankedUp,
    }).returning();

    for (const s of data.sets) {
      await db.insert(workoutSetsTable).values({
        workoutId: workout.id,
        exerciseName: s.exerciseName,
        setNumber: s.setNumber,
        weight: s.weight,
        reps: s.reps,
        isCompleted: s.isCompleted,
      });
    }

    await db.update(usersTable)
      .set({
        level: newLevel,
        xp: newXp,
        xpToNext: newXpToNext,
        streak: newStreak,
        workoutsCount: newWorkoutsCount,
        prsCount: newPrsCount,
        totalVolume: newTotalVolume,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id));

    // Post social activity for this workout
    await db.insert(socialActivitiesTable).values({
      userId: user.id,
      userName: user.displayName,
      activityType: rankedUp ? "rank_up" : "workout_completed",
      detail: rankedUp ? `ranked up to Level ${newLevel}!` : `finished ${data.name} (+${xpEarned} XP)`,
      xpAmount: xpEarned,
      likesCount: 0,
    });

    const uniqueExercises = new Set(data.sets.map((s) => s.exerciseName)).size;

    return {
      workoutId: workout.id,
      xpEarned,
      duration: `${data.durationMinutes} min`,
      exercisesCount: uniqueExercises || 4,
      setsCount: completedSets.length,
      totalVolume: sessionVolume,
      newPr: true,
      rankedUp,
      newStats: {
        level: newLevel,
        xp: newXp,
        xpToNext: newXpToNext,
        streak: newStreak,
        workouts: newWorkoutsCount,
        prs: newPrsCount,
        totalVolume: newTotalVolume,
      },
    };
  }

  static async getWorkoutHistory() {
    const user = await this.getOrCreateDefaultUser();
    const history = await db.select().from(workoutsTable)
      .where(eq(workoutsTable.userId, user.id))
      .orderBy(desc(workoutsTable.completedAt));

    return {
      history: history.map((w) => ({
        id: w.id,
        name: w.name,
        durationMinutes: w.durationMinutes,
        xpEarned: w.xpEarned,
        totalSets: w.totalSets,
        totalVolume: w.totalVolume,
        completedAt: w.completedAt.toISOString(),
      })),
    };
  }

  static async getRanks() {
    const user = await this.getOrCreateDefaultUser();
    const ranks = await db.select().from(userExerciseRanksTable)
      .where(eq(userExerciseRanksTable.userId, user.id));

    const colorMap: Record<string, string> = {
      "Bench Press": "cobalt",
      "Back Squat": "coral",
      "Deadlift": "gold",
      "Shoulder Press": "tint",
    };

    return {
      globalLevel: user.level,
      globalDivision: user.level >= 5 ? "Gold division" : "Silver division",
      exercises: ranks.map((r) => ({
        name: r.exerciseName,
        rank: r.rank,
        detail: `${r.bestWeight} kg × ${r.bestReps}`,
        nextTarget: r.nextTarget,
        progress: r.progress,
        colorKey: colorMap[r.exerciseName] || "tint",
      })),
    };
  }

  static async getLeaderboard(scope: "Friends" | "Global" = "Friends") {
    const user = await this.getOrCreateDefaultUser();
    const items = [
      { rank: 1, name: "Minh", initials: "M", detail: "reached Gold on Squat", xp: "1,840 XP", xpNumber: 1840, colorKey: "cobalt" },
      { rank: 2, name: user.displayName, initials: user.displayName[0] ?? "L", detail: "hit a new Bench Press PR", xp: `${user.xp.toLocaleString()} XP`, xpNumber: user.xp, colorKey: "tint" },
      { rank: 3, name: "Nam", initials: "N", detail: "completed a 30-day streak", xp: "1,430 XP", xpNumber: 1430, colorKey: "coral" },
      { rank: 4, name: "Trang", initials: "T", detail: "finished Upper Body blast", xp: "1,210 XP", xpNumber: 1210, colorKey: "gold" },
    ].sort((a, b) => b.xpNumber - a.xpNumber).map((item, idx) => ({ ...item, rank: idx + 1 }));

    return { scope, items };
  }

  static async getSocialFeed() {
    await this.getOrCreateDefaultUser();
    const activities = await db.select().from(socialActivitiesTable)
      .orderBy(desc(socialActivitiesTable.createdAt))
      .limit(20);

    const iconMap: Record<string, string> = {
      rank_up: "award",
      pr_hit: "zap",
      streak_milestone: "activity",
      workout_completed: "check-circle",
    };

    const colorMap: Record<string, string> = {
      Minh: "cobalt",
      Linh: "tint",
      Nam: "coral",
      Trang: "gold",
    };

    return {
      feed: activities.map((a) => ({
        id: a.id,
        name: a.userName,
        detail: a.detail,
        timeAgo: "Today · 2h ago",
        icon: iconMap[a.activityType] || "zap",
        colorKey: colorMap[a.userName] || "tint",
        likesCount: a.likesCount,
        isLiked: false,
      })),
    };
  }

  static async likeActivity(activityId: number) {
    const [activity] = await db.select().from(socialActivitiesTable).where(eq(socialActivitiesTable.id, activityId));
    if (!activity) {
      throw new Error(`Activity ${activityId} not found`);
    }
    const [updated] = await db.update(socialActivitiesTable)
      .set({ likesCount: activity.likesCount + 1 })
      .where(eq(socialActivitiesTable.id, activityId))
      .returning();

    return {
      id: updated.id,
      likesCount: updated.likesCount,
      isLiked: true,
    };
  }
}
