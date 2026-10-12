import { useMutation, useQuery, type UseMutationOptions, type UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "../custom-fetch";
import type {
  HealthStatus,
  UserProfileResponse,
  UpdateProfileRequest,
  OnboardingRequest,
  WorkoutTemplatesResponse,
  FinishWorkoutRequest,
  WorkoutResultResponse,
  WorkoutHistoryResponse,
  RanksResponse,
  LeaderboardResponse,
  SocialFeedResponse,
  LikeActivityResponse,
} from "./api.schemas";

export const getHealthCheck = (options?: RequestInit): Promise<HealthStatus> => {
  return customFetch<HealthStatus>("/healthz", {
    ...options,
    method: "GET",
  });
};

export const getProfile = (options?: RequestInit): Promise<UserProfileResponse> => {
  return customFetch<UserProfileResponse>("/profile", {
    ...options,
    method: "GET",
  });
};

export const useGetProfile = (
  options?: { query?: UseQueryOptions<UserProfileResponse, Error> },
) => {
  return useQuery({
    queryKey: ["/profile"],
    queryFn: () => getProfile(),
    ...options?.query,
  });
};

export const updateProfile = (
  data: UpdateProfileRequest,
  options?: RequestInit,
): Promise<UserProfileResponse> => {
  return customFetch<UserProfileResponse>("/profile", {
    ...options,
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(data),
  });
};

export const useUpdateProfile = (
  options?: { mutation?: UseMutationOptions<UserProfileResponse, Error, { data: UpdateProfileRequest }> },
) => {
  return useMutation({
    mutationFn: ({ data }) => updateProfile(data),
    ...options?.mutation,
  });
};

export const completeOnboarding = (
  data: OnboardingRequest,
  options?: RequestInit,
): Promise<UserProfileResponse> => {
  return customFetch<UserProfileResponse>("/onboarding", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(data),
  });
};

export const useCompleteOnboarding = (
  options?: { mutation?: UseMutationOptions<UserProfileResponse, Error, { data: OnboardingRequest }> },
) => {
  return useMutation({
    mutationFn: ({ data }) => completeOnboarding(data),
    ...options?.mutation,
  });
};

export const getWorkoutTemplates = (options?: RequestInit): Promise<WorkoutTemplatesResponse> => {
  return customFetch<WorkoutTemplatesResponse>("/workouts/templates", {
    ...options,
    method: "GET",
  });
};

export const useGetWorkoutTemplates = (
  options?: { query?: UseQueryOptions<WorkoutTemplatesResponse, Error> },
) => {
  return useQuery({
    queryKey: ["/workouts/templates"],
    queryFn: () => getWorkoutTemplates(),
    ...options?.query,
  });
};

export const finishWorkout = (
  data: FinishWorkoutRequest,
  options?: RequestInit,
): Promise<WorkoutResultResponse> => {
  return customFetch<WorkoutResultResponse>("/workouts/finish", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(data),
  });
};

export const useFinishWorkout = (
  options?: { mutation?: UseMutationOptions<WorkoutResultResponse, Error, { data: FinishWorkoutRequest }> },
) => {
  return useMutation({
    mutationFn: ({ data }) => finishWorkout(data),
    ...options?.mutation,
  });
};

export const getWorkoutHistory = (options?: RequestInit): Promise<WorkoutHistoryResponse> => {
  return customFetch<WorkoutHistoryResponse>("/workouts/history", {
    ...options,
    method: "GET",
  });
};

export const useGetWorkoutHistory = (
  options?: { query?: UseQueryOptions<WorkoutHistoryResponse, Error> },
) => {
  return useQuery({
    queryKey: ["/workouts/history"],
    queryFn: () => getWorkoutHistory(),
    ...options?.query,
  });
};

export const getRanks = (options?: RequestInit): Promise<RanksResponse> => {
  return customFetch<RanksResponse>("/ranks", {
    ...options,
    method: "GET",
  });
};

export const useGetRanks = (
  options?: { query?: UseQueryOptions<RanksResponse, Error> },
) => {
  return useQuery({
    queryKey: ["/ranks"],
    queryFn: () => getRanks(),
    ...options?.query,
  });
};

export const getLeaderboard = (
  params?: { scope?: "Friends" | "Global" },
  options?: RequestInit,
): Promise<LeaderboardResponse> => {
  const query = params?.scope ? `?scope=${encodeURIComponent(params.scope)}` : "";
  return customFetch<LeaderboardResponse>(`/social/leaderboard${query}`, {
    ...options,
    method: "GET",
  });
};

export const useGetLeaderboard = (
  params?: { scope?: "Friends" | "Global" },
  options?: { query?: UseQueryOptions<LeaderboardResponse, Error> },
) => {
  return useQuery({
    queryKey: ["/social/leaderboard", params],
    queryFn: () => getLeaderboard(params),
    ...options?.query,
  });
};

export const getSocialFeed = (options?: RequestInit): Promise<SocialFeedResponse> => {
  return customFetch<SocialFeedResponse>("/social/feed", {
    ...options,
    method: "GET",
  });
};

export const useGetSocialFeed = (
  options?: { query?: UseQueryOptions<SocialFeedResponse, Error> },
) => {
  return useQuery({
    queryKey: ["/social/feed"],
    queryFn: () => getSocialFeed(),
    ...options?.query,
  });
};

export const likeActivity = (
  id: number,
  options?: RequestInit,
): Promise<LikeActivityResponse> => {
  return customFetch<LikeActivityResponse>(`/social/activities/${id}/like`, {
    ...options,
    method: "POST",
  });
};

export const useLikeActivity = (
  options?: { mutation?: UseMutationOptions<LikeActivityResponse, Error, { id: number }> },
) => {
  return useMutation({
    mutationFn: ({ id }) => likeActivity(id),
    ...options?.mutation,
  });
};
