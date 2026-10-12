import { z } from "zod";

export const HealthStatus = z.object({
  status: z.string(),
});
export type HealthStatus = z.infer<typeof HealthStatus>;

export const HealthCheckResponse = HealthStatus;
export type HealthCheckResponse = HealthStatus;

export const PlayerStats = z.object({
  level: z.number().int(),
  xp: z.number().int(),
  xpToNext: z.number().int(),
  streak: z.number().int(),
  workouts: z.number().int(),
  prs: z.number().int(),
  totalVolume: z.number(),
});
export type PlayerStats = z.infer<typeof PlayerStats>;

export const UserProfile = z.object({
  id: z.number().int(),
  handle: z.string(),
  displayName: z.string(),
  experience: z.string(),
  goal: z.string(),
  age: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
});
export type UserProfile = z.infer<typeof UserProfile>;

export const UserProfileResponse = z.object({
  profile: UserProfile,
  stats: PlayerStats,
});
export type UserProfileResponse = z.infer<typeof UserProfileResponse>;

export const OnboardingRequest = z.object({
  displayName: z.string().optional(),
  handle: z.string().optional(),
  experience: z.enum(["Just starting", "Less than 6 months", "6–12 months", "1–3 years", "3+ years"]),
  goal: z.enum(["Build muscle", "Get stronger", "Lose fat", "Improve fitness", "Stay consistent"]),
  age: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
});
export type OnboardingRequest = z.infer<typeof OnboardingRequest>;

export const UpdateProfileRequest = z.object({
  displayName: z.string().optional(),
  experience: z.string().optional(),
  goal: z.string().optional(),
  age: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;

export const WorkoutSetItem = z.object({
  exerciseName: z.string(),
  setNumber: z.number().int(),
  weight: z.number(),
  reps: z.number().int(),
  isCompleted: z.boolean(),
});
export type WorkoutSetItem = z.infer<typeof WorkoutSetItem>;

export const FinishWorkoutRequest = z.object({
  name: z.string(),
  durationMinutes: z.number().int(),
  sets: z.array(WorkoutSetItem),
});
export type FinishWorkoutRequest = z.infer<typeof FinishWorkoutRequest>;

export const WorkoutResultResponse = z.object({
  workoutId: z.number().int(),
  xpEarned: z.number().int(),
  duration: z.string(),
  exercisesCount: z.number().int(),
  setsCount: z.number().int(),
  totalVolume: z.number(),
  newPr: z.boolean(),
  rankedUp: z.boolean(),
  newStats: PlayerStats,
});
export type WorkoutResultResponse = z.infer<typeof WorkoutResultResponse>;

export const WorkoutTemplate = z.object({
  id: z.string(),
  name: z.string(),
  targetDescription: z.string(),
  targetSets: z.number().int(),
  exercises: z.array(
    z.object({
      name: z.string(),
      targetSets: z.number().int(),
      targetReps: z.string(),
      suggestedWeight: z.number().optional(),
    }),
  ),
});
export type WorkoutTemplate = z.infer<typeof WorkoutTemplate>;

export const WorkoutTemplatesResponse = z.object({
  templates: z.array(WorkoutTemplate),
});
export type WorkoutTemplatesResponse = z.infer<typeof WorkoutTemplatesResponse>;

export const WorkoutHistoryItem = z.object({
  id: z.number().int(),
  name: z.string(),
  durationMinutes: z.number().int(),
  xpEarned: z.number().int(),
  totalSets: z.number().int(),
  totalVolume: z.number(),
  completedAt: z.string(),
});
export type WorkoutHistoryItem = z.infer<typeof WorkoutHistoryItem>;

export const WorkoutHistoryResponse = z.object({
  history: z.array(WorkoutHistoryItem),
});
export type WorkoutHistoryResponse = z.infer<typeof WorkoutHistoryResponse>;

export const ExerciseRankItem = z.object({
  name: z.string(),
  rank: z.string(),
  detail: z.string(),
  nextTarget: z.string(),
  progress: z.number(),
  colorKey: z.string(),
});
export type ExerciseRankItem = z.infer<typeof ExerciseRankItem>;

export const RanksResponse = z.object({
  globalLevel: z.number().int(),
  globalDivision: z.string(),
  exercises: z.array(ExerciseRankItem),
});
export type RanksResponse = z.infer<typeof RanksResponse>;

export const LeaderboardItem = z.object({
  rank: z.number().int(),
  name: z.string(),
  initials: z.string(),
  detail: z.string(),
  xp: z.string(),
  xpNumber: z.number().int(),
  colorKey: z.string(),
});
export type LeaderboardItem = z.infer<typeof LeaderboardItem>;

export const LeaderboardResponse = z.object({
  scope: z.string(),
  items: z.array(LeaderboardItem),
});
export type LeaderboardResponse = z.infer<typeof LeaderboardResponse>;

export const SocialFeedItem = z.object({
  id: z.number().int(),
  name: z.string(),
  detail: z.string(),
  timeAgo: z.string(),
  icon: z.string(),
  colorKey: z.string(),
  likesCount: z.number().int(),
  isLiked: z.boolean(),
});
export type SocialFeedItem = z.infer<typeof SocialFeedItem>;

export const SocialFeedResponse = z.object({
  feed: z.array(SocialFeedItem),
});
export type SocialFeedResponse = z.infer<typeof SocialFeedResponse>;

export const LikeActivityResponse = z.object({
  id: z.number().int(),
  likesCount: z.number().int(),
  isLiked: z.boolean(),
});
export type LikeActivityResponse = z.infer<typeof LikeActivityResponse>;
