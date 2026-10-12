import { pgTable, text, serial, integer, timestamp, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  experience: text("experience").notNull().default("Just starting"),
  goal: text("goal").notNull().default("Build muscle"),
  age: text("age"),
  height: text("height"),
  weight: text("weight"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  xpToNext: integer("xp_to_next").notNull().default(1000),
  streak: integer("streak").notNull().default(0),
  workoutsCount: integer("workouts_count").notNull().default(0),
  prsCount: integer("prs_count").notNull().default(0),
  totalVolume: doublePrecision("total_volume").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

export const exercisesTable = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(), // 'Chest', 'Legs', 'Back', 'Shoulders', 'Arms'
  primaryLift: boolean("primary_lift").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExerciseSchema = createInsertSchema(exercisesTable).omit({ id: true, createdAt: true });
export type InsertExercise = typeof exercisesTable.$inferInsert;
export type Exercise = typeof exercisesTable.$inferSelect;

export const userExerciseRanksTable = pgTable("user_exercise_ranks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  exerciseName: text("exercise_name").notNull(),
  rank: text("rank").notNull().default("Bronze I"), // 'Bronze I', 'Bronze II', 'Silver I', 'Silver II', 'Silver III', 'Gold I', etc.
  bestWeight: doublePrecision("best_weight").notNull().default(0),
  bestReps: integer("best_reps").notNull().default(0),
  nextTarget: text("next_target").notNull().default(""),
  progress: doublePrecision("progress").notNull().default(0), // 0 to 1
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserExerciseRankSchema = createInsertSchema(userExerciseRanksTable).omit({ id: true, updatedAt: true });
export type InsertUserExerciseRank = typeof userExerciseRanksTable.$inferInsert;
export type UserExerciseRank = typeof userExerciseRanksTable.$inferSelect;

export const workoutsTable = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(), // 'Push day', 'Pull day', 'Leg day', etc.
  durationMinutes: integer("duration_minutes").notNull().default(0),
  xpEarned: integer("xp_earned").notNull().default(0),
  totalSets: integer("total_sets").notNull().default(0),
  totalVolume: doublePrecision("total_volume").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(true),
  hasNewPr: boolean("has_new_pr").notNull().default(false),
  rankedUp: boolean("ranked_up").notNull().default(false),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertWorkoutSchema = createInsertSchema(workoutsTable).omit({ id: true, completedAt: true });
export type InsertWorkout = typeof workoutsTable.$inferInsert;
export type Workout = typeof workoutsTable.$inferSelect;

export const workoutSetsTable = pgTable("workout_sets", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").references(() => workoutsTable.id, { onDelete: "cascade" }).notNull(),
  exerciseName: text("exercise_name").notNull(),
  setNumber: integer("set_number").notNull(),
  weight: doublePrecision("weight").notNull(),
  reps: integer("reps").notNull(),
  isCompleted: boolean("is_completed").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWorkoutSetSchema = createInsertSchema(workoutSetsTable).omit({ id: true, createdAt: true });
export type InsertWorkoutSet = typeof workoutSetsTable.$inferInsert;
export type WorkoutSet = typeof workoutSetsTable.$inferSelect;

export const socialActivitiesTable = pgTable("social_activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  userName: text("user_name").notNull(),
  activityType: text("activity_type").notNull(), // 'workout_completed', 'pr_hit', 'streak_milestone', 'rank_up'
  detail: text("detail").notNull(),
  xpAmount: integer("xp_amount").notNull().default(0),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSocialActivitySchema = createInsertSchema(socialActivitiesTable).omit({ id: true, createdAt: true });
export type InsertSocialActivity = typeof socialActivitiesTable.$inferInsert;
export type SocialActivity = typeof socialActivitiesTable.$inferSelect;
