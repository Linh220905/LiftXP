export interface HealthStatus {
  status: string;
}

export interface PlayerStats {
  level: number;
  xp: number;
  xpToNext: number;
  streak: number;
  workouts: number;
  prs: number;
  totalVolume: number;
}

export interface UserProfile {
  id: number;
  handle: string;
  displayName: string;
  experience: string;
  goal: string;
  age?: string;
  height?: string;
  weight?: string;
}

export interface UserProfileResponse {
  profile: UserProfile;
  stats: PlayerStats;
}

export interface OnboardingRequest {
  displayName?: string;
  handle?: string;
  experience: "Just starting" | "Less than 6 months" | "6–12 months" | "1–3 years" | "3+ years";
  goal: "Build muscle" | "Get stronger" | "Lose fat" | "Improve fitness" | "Stay consistent";
  age?: string;
  height?: string;
  weight?: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  experience?: string;
  goal?: string;
  age?: string;
  height?: string;
  weight?: string;
}

export interface WorkoutSetItem {
  exerciseName: string;
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted: boolean;
}

export interface FinishWorkoutRequest {
  name: string;
  durationMinutes: number;
  sets: WorkoutSetItem[];
}

export interface WorkoutResultResponse {
  workoutId: number;
  xpEarned: number;
  duration: string;
  exercisesCount: number;
  setsCount: number;
  totalVolume: number;
  newPr: boolean;
  rankedUp: boolean;
  newStats: PlayerStats;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  targetDescription: string;
  targetSets: number;
  exercises: {
    name: string;
    targetSets: number;
    targetReps: string;
    suggestedWeight?: number;
  }[];
}

export interface WorkoutTemplatesResponse {
  templates: WorkoutTemplate[];
}

export interface WorkoutHistoryItem {
  id: number;
  name: string;
  durationMinutes: number;
  xpEarned: number;
  totalSets: number;
  totalVolume: number;
  completedAt: string;
}

export interface WorkoutHistoryResponse {
  history: WorkoutHistoryItem[];
}

export interface ExerciseRankItem {
  name: string;
  rank: string;
  detail: string;
  nextTarget: string;
  progress: number;
  colorKey: string;
}

export interface RanksResponse {
  globalLevel: number;
  globalDivision: string;
  exercises: ExerciseRankItem[];
}

export interface LeaderboardItem {
  rank: number;
  name: string;
  initials: string;
  detail: string;
  xp: string;
  xpNumber: number;
  colorKey: string;
}

export interface LeaderboardResponse {
  scope: string;
  items: LeaderboardItem[];
}

export interface SocialFeedItem {
  id: number;
  name: string;
  detail: string;
  timeAgo: string;
  icon: string;
  colorKey: string;
  likesCount: number;
  isLiked: boolean;
}

export interface SocialFeedResponse {
  feed: SocialFeedItem[];
}

export interface LikeActivityResponse {
  id: number;
  likesCount: number;
  isLiked: boolean;
}
