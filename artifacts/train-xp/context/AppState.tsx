import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as NativeAppState } from 'react-native';
import {
  syncProfileToCloud,
  syncRoutineToCloud,
  deleteRoutineFromCloud,
  syncWorkoutToCloud,
  deleteWorkoutFromCloud,
  syncBodyweightLogToCloud,
  fetchCloudUserData,
  replayCloudOutbox,
  clearCloudOutboxForUser,
  syncAppStateToCloud,
} from '@/lib/supabase';
import { type MuscleSlug } from '@/lib/muscles';
import { type ProgressionPolicy } from '@/lib/progression';
import { type WorkoutHistoryItem } from '@/lib/effort';
import { calculate1RM } from '@/lib/progression';
import { calculateInitialGamification } from '@/lib/onboardingGamification';
import { generatePersonalizedPlan } from '@/lib/planGenerator';
import { localDateKey } from '@/lib/units';
import {
  initPurchases,
  checkHasProEntitlement,
  setupPurchasesListener,
  syncPurchasesUser,
  logOutPurchases,
} from '@/lib/purchases';
import { signInWithApple, signInWithGoogle, deleteUserAccount } from '@/lib/auth';
import { ensureUserSession, supabase } from '@/lib/supabase';

export type Experience = 'Regularly' | 'Less than 1 year ago' | 'More than 1 year ago' | 'No experience';
export type PrimaryGoal = 'Build Muscle' | 'Burn Fat' | 'Increase Endurance' | 'Weight Loss' | 'Weight Gain' | 'Optimize Workouts';
export type BodyType = 'Athletic' | 'Balanced' | 'Strong';
export type Gender = 'Male' | 'Female';
export type UnitSystem = 'Metric' | 'Imperial';

export interface RoutineExercise {
  id: string;
  sets: number;
  reps: number;
  targetWeight?: number;
  targetReps?: number;
  rir?: number;
  supersetId?: string; // Links consecutive exercises into superset
  progression?: ProgressionPolicy;
}

export interface Routine {
  id: string;
  name: string;
  emoji: string;
  progression: ProgressionPolicy;
  exercises: RoutineExercise[];
}

export interface BodyweightLog {
  date: string;
  weight: number;
  timestamp: number;
}

export interface Profile {
  name: string;
  unit: UnitSystem;
  weight: number;
  height: number;
  thinkAboutFitness: string;
  achieveMotivations: string[];
  goal: PrimaryGoal;
  sensitiveJoints: string[];
  experience: Experience;
  hasRoutine: boolean;
  equipment: string[];
  lastMusclesWorked: string[];
  workoutDuration: string;
  daysPerWeek: number;
  targetMuscles: string[];
  bodyType: BodyType;
  gender: Gender;
  birthYear: number;
  birthMonth: string;
  birthDay: number;
  prSquat: number;
  benchPressPR?: number;
  deadliftPR?: number;
  goalWeight: number;
  goalWeeks: number;
  streakCommitment: number;
  notificationsEnabled: boolean;
  username?: string;
  referralSource?: string;
  rating?: number;
  isPro: boolean;
  authEmail?: string;
  authProvider?: 'apple' | 'google' | null;
  authUserId?: string;
}

export interface PlayerStats {
  level: number;
  xp: number;
  xpToNext: number;
  streak: number;
  workouts: number;
  prs: number;
  totalVolume: number;
  muscleTrainedCount: Partial<Record<MuscleSlug, number>>;
}

export interface WorkoutResult {
  xp: number;
  duration: string;
  exercises: number;
  sets: number;
  volume: number;
  newPr: boolean;
  rankedUp: boolean;
}

interface AppStateValue {
  hydrated: boolean;
  hasOnboarded: boolean;
  profile: Profile;
  stats: PlayerStats;
  lastWorkout: WorkoutResult | null;
  routines: Routine[];
  weekSchedule: Record<number, string | null>; // 0=Sun, 1=Mon... 6=Sat -> routineId or null
  bodyweightLogs: BodyweightLog[];
  workoutsHistory: WorkoutHistoryItem[];
  addRoutine: (routine: Omit<Routine, 'id'>) => Routine;
  updateRoutine: (id: string, updates: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  deleteWorkout: (id: string) => void;
  assignWeekSchedule: (dayIdx: number, routineId: string | null) => void;
  loadStarterPlan: (customProfile?: Profile) => void;
  logBodyweight: (weight: number) => void;
  finishWorkout: (customMetrics?: {
    volume?: number;
    exercises?: number;
    sets?: number;
    muscles?: MuscleSlug[];
    duration?: string;
    routineName?: string;
    entries?: { id: string; sets: { weight?: number | string; reps?: number | string; rir?: number; done: boolean }[] }[];
  }) => WorkoutResult;
  completeOnboarding: (profile: Profile) => void;
  resetOnboarding: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void;
  setProStatus: (isPro: boolean) => void;
  loginApple: () => Promise<boolean>;
  loginGoogle: () => Promise<boolean>;
  logoutAuth: () => Promise<void>;
  deleteAccountData: () => Promise<void>;
}

const LEGACY_STORAGE_KEY = '@train-xp/state';
const STORAGE_KEY_PREFIX = '@train-xp/state:';

export const STARTER_ROUTINES: Routine[] = [
  {
    id: 'starter_push',
    name: 'Push Day (Chest, Shoulders & Tris)',
    emoji: 'zap',
    progression: 'linear',
    exercises: [
      { id: 'barbell_bench_press', sets: 4, reps: 8, targetWeight: 60, rir: 2 },
      { id: 'incline_barbell_bench_press', sets: 3, reps: 10, targetWeight: 50, rir: 2 },
      { id: 'overhead_shoulder_press', sets: 3, reps: 8, targetWeight: 40, rir: 2 },
      { id: 'pec_deck_fly', sets: 3, reps: 12, targetWeight: 45, rir: 1, supersetId: 'ss_push_1' },
      { id: 'tricep_rope_pushdown', sets: 3, reps: 12, targetWeight: 25, rir: 1, supersetId: 'ss_push_1' },
    ],
  },
  {
    id: 'starter_pull',
    name: 'Pull Day (Back & Biceps)',
    emoji: 'anchor',
    progression: 'linear',
    exercises: [
      { id: 'lat_pulldown', sets: 4, reps: 10, targetWeight: 55, rir: 2 },
      { id: 'barbell_bent_over_row', sets: 4, reps: 8, targetWeight: 60, rir: 2 },
      { id: 'seated_cable_row', sets: 3, reps: 10, targetWeight: 50, rir: 2 },
      { id: 'standing_bicep_cable_curl', sets: 3, reps: 12, targetWeight: 25, rir: 1 },
      { id: 'hammer_curls', sets: 3, reps: 12, targetWeight: 14, rir: 1 },
    ],
  },
  {
    id: 'starter_legs',
    name: 'Leg Day (Quads, Glutes & Calves)',
    emoji: 'shield',
    progression: 'linear',
    exercises: [
      { id: 'barbell_back_squat', sets: 4, reps: 8, targetWeight: 80, rir: 2 },
      { id: 'leg_press_machine', sets: 3, reps: 10, targetWeight: 140, rir: 2 },
      { id: 'lying_leg_curl', sets: 3, reps: 12, targetWeight: 40, rir: 1, supersetId: 'ss_leg_1' },
      { id: 'leg_extension_machine', sets: 3, reps: 12, targetWeight: 45, rir: 1, supersetId: 'ss_leg_1' },
      { id: 'standing_calf_raise', sets: 4, reps: 15, targetWeight: 50, rir: 1 },
    ],
  },
];

const defaultWeekSchedule: Record<number, string | null> = {
  1: 'starter_push', // Mon
  2: null,           // Tue
  3: 'starter_pull', // Wed
  4: null,           // Thu
  5: 'starter_legs', // Fri
  6: null,           // Sat
  0: null,           // Sun
};

const defaultProfile: Profile = {
  name: 'Lifter',
  unit: 'Metric',
  weight: 68,
  height: 170,
  thinkAboutFitness: 'Often',
  achieveMotivations: ['Health & Wellness', 'Build Discipline'],
  goal: 'Build Muscle',
  sensitiveJoints: [],
  experience: 'Regularly',
  hasRoutine: true,
  equipment: ['Dumbbell', 'Barbell', 'Bench', 'Plate', 'Cable Machine'],
  lastMusclesWorked: ['Chest', 'Arms'],
  workoutDuration: '60 minutes',
  daysPerWeek: 3,
  targetMuscles: ['Full chest', 'Big arms', 'Broad shoulders'],
  bodyType: 'Athletic',
  gender: 'Male',
  birthYear: 2000,
  birthMonth: 'Dec',
  birthDay: 10,
  prSquat: 85,
  benchPressPR: 60,
  deadliftPR: 100,
  goalWeight: 75,
  goalWeeks: 4,
  streakCommitment: 30,
  notificationsEnabled: false,
  isPro: false,
};

const defaultStats: PlayerStats = {
  level: 1,
  xp: 0,
  xpToNext: 500,
  streak: 0,
  workouts: 0,
  prs: 0,
  totalVolume: 0,
  muscleTrainedCount: {},
};

const defaultWorkoutsHistory: WorkoutHistoryItem[] = [];
const defaultBodyweightLogs: BodyweightLog[] = [];

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const storageKeyRef = useRef(LEGACY_STORAGE_KEY);
  const identityVersionRef = useRef(0);
  const purchasesListenerCleanupRef = useRef<(() => void) | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [cloudSnapshotReady, setCloudSnapshotReady] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [stats, setStats] = useState<PlayerStats>(defaultStats);
  const [lastWorkout, setLastWorkout] = useState<WorkoutResult | null>(null);
  const [routines, setRoutines] = useState<Routine[]>(STARTER_ROUTINES);
  const [weekSchedule, setWeekSchedule] = useState<Record<number, string | null>>(defaultWeekSchedule);
  const [bodyweightLogs, setBodyweightLogs] = useState<BodyweightLog[]>(defaultBodyweightLogs);
  const [workoutsHistory, setWorkoutsHistory] = useState<WorkoutHistoryItem[]>(defaultWorkoutsHistory);

  const activateStorageForUser = async (
    userId: string,
    migrateLegacy: boolean,
    guestSnapshot?: Partial<AppStateValue>,
  ) => {
    const version = ++identityVersionRef.current;
    setHydrated(false);
    setCloudSnapshotReady(false);
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    activeUserIdRef.current = userId;
    storageKeyRef.current = key;
    // Remove the previous identity's data immediately while the next cache/cloud
    // snapshot is loading, so account switching cannot briefly reveal old history.
    setHasOnboarded(false);
    setProfile({ ...defaultProfile, authUserId: userId });
    setStats(defaultStats);
    setLastWorkout(null);
    setRoutines(STARTER_ROUTINES);
    setWeekSchedule(defaultWeekSchedule);
    setBodyweightLogs(defaultBodyweightLogs);
    setWorkoutsHistory(defaultWorkoutsHistory);

    let localValue: string | null = null;
    try {
      localValue = await AsyncStorage.getItem(key);
      if (!localValue && migrateLegacy) {
        localValue = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
        if (localValue) await AsyncStorage.setItem(key, localValue);
      }
    } catch {
      // The account can still load from cloud if local storage is unavailable.
    }
    void replayCloudOutbox(userId);
    const cloud = await Promise.race([
      fetchCloudUserData(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (version !== identityVersionRef.current) return;
    setCloudSnapshotReady(Boolean(cloud));

    if (localValue) {
      try {
        const saved = JSON.parse(localValue) as Partial<AppStateValue>;
        setHasOnboarded(Boolean(saved.hasOnboarded));
        setProfile({ ...defaultProfile, ...(saved.profile ?? {}), authUserId: userId });
        setStats({ ...defaultStats, ...(saved.stats ?? {}) });
        setLastWorkout(saved.lastWorkout ?? null);
        if (Array.isArray(saved.routines)) setRoutines(saved.routines);
        if (saved.weekSchedule) setWeekSchedule(saved.weekSchedule);
        if (Array.isArray(saved.bodyweightLogs)) setBodyweightLogs(saved.bodyweightLogs);
        if (Array.isArray(saved.workoutsHistory)) setWorkoutsHistory(saved.workoutsHistory);
      } catch {
        // Ignore malformed local cache and continue with cloud/default data.
      }
    }
    const remoteHasData = Boolean(cloud && (
      cloud.appState || cloud.profile || cloud.routines?.length || cloud.workouts?.length || cloud.bodyweightLogs?.length
    ));
    if (guestSnapshot && cloud && !localValue && !remoteHasData && version === identityVersionRef.current) {
      setHasOnboarded(Boolean(guestSnapshot.hasOnboarded));
      setProfile({ ...defaultProfile, ...(guestSnapshot.profile ?? {}), authUserId: userId });
      setStats({ ...defaultStats, ...(guestSnapshot.stats ?? {}) });
      setLastWorkout(guestSnapshot.lastWorkout ?? null);
      setRoutines(guestSnapshot.routines ?? STARTER_ROUTINES);
      setWeekSchedule(guestSnapshot.weekSchedule ?? defaultWeekSchedule);
      setBodyweightLogs(guestSnapshot.bodyweightLogs ?? []);
      setWorkoutsHistory(guestSnapshot.workoutsHistory ?? []);
    } else if (cloud?.appState && version === identityVersionRef.current) {
      const saved = cloud.appState as Partial<AppStateValue>;
      setHasOnboarded(Boolean(saved.hasOnboarded));
      setProfile({ ...defaultProfile, ...(saved.profile ?? {}), authUserId: userId });
      setStats({ ...defaultStats, ...(saved.stats ?? {}) });
      setLastWorkout(saved.lastWorkout ?? null);
      setRoutines(saved.routines ?? STARTER_ROUTINES);
      setWeekSchedule(saved.weekSchedule ?? defaultWeekSchedule);
      setBodyweightLogs(saved.bodyweightLogs ?? []);
      setWorkoutsHistory(saved.workoutsHistory ?? []);
    } else if (cloud && version === identityVersionRef.current) {
      if (cloud.profile) {
        setHasOnboarded(true);
        setProfile((p) => ({ ...p, ...cloud.profile, authUserId: userId }));
      }
      if (cloud.stats) setStats((s) => ({ ...s, ...cloud.stats }));
      if (cloud.weekSchedule) setWeekSchedule(cloud.weekSchedule);
      if (cloud.routines) setRoutines(cloud.routines);
      if (cloud.workouts) setWorkoutsHistory(cloud.workouts);
      if (cloud.bodyweightLogs) setBodyweightLogs(cloud.bodyweightLogs);
    }
    setHydrated(true);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      let activeUserId = sessionData.session?.user.id;
      let isAnonymous = Boolean(sessionData.session?.user.is_anonymous);
      if (!activeUserId) {
        activeUserId = await ensureUserSession() ?? undefined;
        const { data } = await supabase.auth.getUser();
        isAnonymous = data.user?.is_anonymous ?? true;
      }
      if (!cancelled && activeUserId) await activateStorageForUser(activeUserId, isAnonymous);
      else if (!cancelled) setHydrated(true);

      const ready = await initPurchases();
      if (cancelled || !ready) return;
      const hasPro = await checkHasProEntitlement();
      setProfile((p) => p.isPro === hasPro ? p : { ...p, isPro: hasPro });
      purchasesListenerCleanupRef.current = setupPurchasesListener((isPro) =>
        setProfile((prev) => prev.isPro === isPro ? prev : { ...prev, isPro }),
      );
    })();
    const appStateSubscription = NativeAppState.addEventListener('change', (state) => {
      if (state === 'active' && activeUserIdRef.current) {
        void replayCloudOutbox(activeUserIdRef.current);
      }
    });
    return () => {
      cancelled = true;
      identityVersionRef.current += 1;
      appStateSubscription.remove();
      purchasesListenerCleanupRef.current?.();
      purchasesListenerCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const appSnapshot = {
      hasOnboarded,
      profile,
      stats,
      lastWorkout,
      routines,
      weekSchedule,
      bodyweightLogs,
      workoutsHistory,
    };
    void AsyncStorage.setItem(
      storageKeyRef.current,
      JSON.stringify(appSnapshot),
    );
    if (cloudSnapshotReady) void syncAppStateToCloud(appSnapshot);
  }, [hydrated, cloudSnapshotReady, hasOnboarded, profile, stats, lastWorkout, routines, weekSchedule, bodyweightLogs, workoutsHistory]);

  const addRoutine = (newRoutine: Omit<Routine, 'id'>): Routine => {
    const routine: Routine = {
      ...newRoutine,
      id: 'routine_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    };
    setRoutines((prev) => [...prev, routine]);
    void syncRoutineToCloud(routine);
    return routine;
  };

  const updateRoutine = (id: string, updates: Partial<Routine>) => {
    setRoutines((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
      const target = next.find((r) => r.id === id);
      if (target) void syncRoutineToCloud(target);
      return next;
    });
  };

  const deleteRoutine = (id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    void deleteRoutineFromCloud(id);
    setWeekSchedule((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        const numKey = Number(key);
        if (next[numKey] === id) {
          next[numKey] = null;
        }
      });
      return next;
    });
  };

  const assignWeekSchedule = (dayIdx: number, routineId: string | null) => {
    setWeekSchedule((prev) => {
      const next = {
        ...prev,
        [dayIdx]: routineId,
      };
      void syncProfileToCloud(profile, stats, next);
      return next;
    });
  };

  const loadStarterPlan = (customProfile?: Profile) => {
    const targetProf = customProfile || profile;
    const gen = generatePersonalizedPlan(targetProf);
    const nextIds = new Set(gen.routines.map((routine) => routine.id));
    routines.filter((routine) => !nextIds.has(routine.id)).forEach((routine) => {
      void deleteRoutineFromCloud(routine.id);
    });
    setRoutines(gen.routines);
    setWeekSchedule(gen.weekSchedule);
    gen.routines.forEach((r) => void syncRoutineToCloud(r));
    void syncProfileToCloud(targetProf, stats, gen.weekSchedule);
  };

  const logBodyweight = (w: number) => {
    const dateStr = localDateKey();
    const newLog: BodyweightLog = {
      date: dateStr,
      weight: w,
      timestamp: Date.now(),
    };
    setBodyweightLogs((prev) => [...prev.filter((l) => l.date !== dateStr), newLog]);
    setProfile((prev) => {
      const next = { ...prev, weight: w };
      void syncProfileToCloud(next, stats, weekSchedule);
      return next;
    });
    void syncBodyweightLogToCloud(newLog);
  };

  const completeOnboarding = (nextProfile: Profile) => {
    setProfile(nextProfile);
    setHasOnboarded(true);

    // Initial starting log for bodyweight trend chart
    if (nextProfile.weight && nextProfile.weight >= 15) {
      const initialLog: BodyweightLog = {
        date: localDateKey(),
        weight: nextProfile.weight,
        timestamp: Date.now(),
      };
      setBodyweightLogs([initialLog]);
      void syncBodyweightLogToCloud(initialLog);
    }

    // Compute starting RPG Level, total XP and initial trophies from benchmark PRs
    const gamification = calculateInitialGamification({
      benchKg: nextProfile.benchPressPR,
      squatKg: nextProfile.prSquat,
      deadliftKg: nextProfile.deadliftPR,
      bodyweightKg: nextProfile.weight,
      unit: nextProfile.unit,
    });

    const prCount = [nextProfile.prSquat, nextProfile.benchPressPR, nextProfile.deadliftPR].filter((v) => Number(v) > 0).length;

    const onboardStats: PlayerStats = {
      ...stats,
      level: gamification.endLevel,
      xp: gamification.totalExp,
      xpToNext: gamification.xpNeededForNext,
      prs: prCount > 0 ? prCount : stats.prs,
    };
    setStats(onboardStats);

    // Auto generate tailored workout split routines matching user's selections
    const plan = generatePersonalizedPlan(nextProfile);
    setRoutines(plan.routines);
    setWeekSchedule(plan.weekSchedule);

    void syncProfileToCloud(nextProfile, onboardStats, plan.weekSchedule);
    plan.routines.forEach((r) => void syncRoutineToCloud(r));
  };

  const resetOnboarding = async () => {
    setHasOnboarded(false);
    await AsyncStorage.setItem(
      storageKeyRef.current,
      JSON.stringify({ hasOnboarded: false, profile, stats, lastWorkout, routines, weekSchedule }),
    );
  };

  const updateProfile = (updates: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      void syncProfileToCloud(next, stats, weekSchedule);
      return next;
    });
  };

  const setProStatus = (isPro: boolean) => {
    setProfile((prev) => {
      const next = { ...prev, isPro };
      void syncProfileToCloud(next, stats, weekSchedule);
      return next;
    });
  };

  const loginApple = async (): Promise<boolean> => {
    try {
      const guestSnapshot = { hasOnboarded, profile, stats, lastWorkout, routines, weekSchedule, bodyweightLogs, workoutsHistory };
      const user = await signInWithApple();
      if (!user) return false;
      await activateStorageForUser(user.id, false, guestSnapshot);
      void syncPurchasesUser(user.id);
      setProfile((prev) => {
        const next = {
          ...prev,
          name: user.fullName || prev.name,
          authEmail: user.email || prev.authEmail,
          authProvider: 'apple' as const,
          authUserId: user.id,
        };
        void syncProfileToCloud(next, stats, weekSchedule);
        return next;
      });
      return true;
    } catch (err) {
      console.warn('[Auth] Apple login error:', err);
      throw err;
    }
  };

  const loginGoogle = async (): Promise<boolean> => {
    try {
      const guestSnapshot = { hasOnboarded, profile, stats, lastWorkout, routines, weekSchedule, bodyweightLogs, workoutsHistory };
      const user = await signInWithGoogle();
      if (!user) return false;
      await activateStorageForUser(user.id, false, guestSnapshot);
      void syncPurchasesUser(user.id);
      setProfile((prev) => {
        const next = {
          ...prev,
          name: user.fullName || prev.name,
          authEmail: user.email || prev.authEmail,
          authProvider: 'google' as const,
          authUserId: user.id,
        };
        void syncProfileToCloud(next, stats, weekSchedule);
        return next;
      });
      return true;
    } catch (err) {
      console.warn('[Auth] Google login error:', err);
      throw err;
    }
  };

  const logoutAuth = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await logOutPurchases();
    const anonymousId = await ensureUserSession();
    if (anonymousId) await activateStorageForUser(anonymousId, false);
    setProfile((prev) => ({ ...prev, authEmail: undefined, authProvider: null }));
  };

  const deleteAccountData = async () => {
    const currentStorageKey = storageKeyRef.current;
    const userId = profile.authUserId;
    await deleteUserAccount();
    if (userId) await clearCloudOutboxForUser(userId);
    await AsyncStorage.removeItem(currentStorageKey);
    if (userId) await AsyncStorage.removeItem(`@train-xp/workout-draft:${userId}`);
    storageKeyRef.current = LEGACY_STORAGE_KEY;
    await logOutPurchases();
    setHasOnboarded(false);
    setProfile(defaultProfile);
    setStats(defaultStats);
    setRoutines(STARTER_ROUTINES);
    setWeekSchedule(defaultWeekSchedule);
    setBodyweightLogs(defaultBodyweightLogs);
    setWorkoutsHistory(defaultWorkoutsHistory);
    setLastWorkout(null);
    setProfile(defaultProfile);
    setHydrated(true);
    setCloudSnapshotReady(false);
  };

  const deleteWorkout = (id: string) => {
    const remaining = workoutsHistory.filter((workout) => workout.id !== id);
    setWorkoutsHistory(remaining);
    const bestByExercise = new Map<string, number>();
    let personalRecords = 0;
    [...remaining].reverse().forEach((workout) => {
      let setNewRecord = false;
      workout.entries.forEach((entry) => {
        const workoutBest = Math.max(0, ...entry.sets.filter((set) => set.done)
          .map((set) => calculate1RM(Number(set.weight), Number(set.reps))));
        const previousBest = bestByExercise.get(entry.id) ?? 0;
        if (workoutBest > previousBest) setNewRecord = true;
        if (workoutBest > previousBest) bestByExercise.set(entry.id, workoutBest);
      });
      if (setNewRecord) personalRecords++;
    });
    const distinctDays = [...new Set(remaining.map((workout) => localDateKey(new Date(workout.date))))];
    let streak = 0;
    if (distinctDays.length) {
      const latest = new Date(`${distinctDays[0]}T12:00:00`);
      for (const key of distinctDays) {
        const date = new Date(`${key}T12:00:00`);
        const expected = new Date(latest);
        expected.setDate(expected.getDate() - streak);
        if (localDateKey(date) !== localDateKey(expected)) break;
        streak++;
      }
    }
    setStats((current) => ({
      ...current,
      workouts: remaining.length,
      prs: personalRecords,
      streak,
      totalVolume: remaining.reduce((total, workout) => total + (Number(workout.volume) || 0), 0),
    }));
    void deleteWorkoutFromCloud(id);
  };

  const finishWorkout = (customMetrics?: {
    volume?: number;
    exercises?: number;
    sets?: number;
    muscles?: MuscleSlug[];
    duration?: string;
    routineName?: string;
    entries?: { id: string; sets: { weight?: number | string; reps?: number | string; rir?: number; done: boolean }[] }[];
  }) => {
    const xpGain = profile.isPro ? 250 : 180;
    const rankedUp = stats.xp + xpGain >= stats.xpToNext;
    const vol = customMetrics?.volume !== undefined ? customMetrics.volume : 0;
    const exCount = customMetrics?.exercises !== undefined ? customMetrics.exercises : 0;
    const setCount = customMetrics?.sets !== undefined ? customMetrics.sets : 0;
    const duration = customMetrics?.duration || '00:00';

    const previousBestByExercise = new Map<string, number>();
    workoutsHistory.forEach((workout) => {
      workout.entries?.forEach((entry) => {
        entry.sets?.forEach((set) => {
          if (!set.done) return;
          const weight = Number(set.weight);
          const reps = Number(set.reps);
          const estimated = calculate1RM(weight, reps);
          if (estimated > (previousBestByExercise.get(entry.id) ?? 0)) {
            previousBestByExercise.set(entry.id, estimated);
          }
        });
      });
    });
    let newPr = false;
    customMetrics?.entries?.forEach((entry) => {
      const previousBest = previousBestByExercise.get(entry.id) ?? 0;
      const nextBest = Math.max(0, ...entry.sets.filter((set) => set.done)
        .map((set) => calculate1RM(Number(set.weight), Number(set.reps))));
      if (nextBest > previousBest) newPr = true;
    });

    const result: WorkoutResult = {
      xp: xpGain,
      duration,
      exercises: exCount,
      sets: setCount,
      volume: vol,
      newPr,
      rankedUp,
    };

    const historyItem: WorkoutHistoryItem = {
      id: 'w_' + Date.now().toString(36),
      date: new Date().toISOString(),
      duration,
      volume: vol,
      xp: xpGain,
      routineName: customMetrics?.routineName || 'Custom Workout',
      entries: (customMetrics?.entries || []).map((e) => ({
        id: e.id,
        sets: e.sets.map((s) => ({
          weight: s.weight,
          reps: s.reps,
          rir: s.rir,
          done: s.done,
        })),
      })),
    };

    setWorkoutsHistory((prev) => [historyItem, ...prev]);

    setStats((current) => {
      const nextMuscleCounts = { ...(current.muscleTrainedCount || {}) };
      if (customMetrics?.muscles) {
        customMetrics.muscles.forEach((m) => {
          nextMuscleCounts[m] = (nextMuscleCounts[m] || 0) + 1;
        });
      }

      const nextStats = {
        ...current,
        level: rankedUp ? current.level + 1 : current.level,
        xp: rankedUp ? current.xp + xpGain - current.xpToNext : current.xp + xpGain,
        xpToNext: rankedUp ? current.xpToNext + 250 : current.xpToNext,
        streak: (() => {
          const today = new Date();
          const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
          const last = workoutsHistory[0]?.date ? new Date(workoutsHistory[0].date) : null;
          if (!last || Number.isNaN(last.getTime())) return 1;
          const lastKey = `${last.getFullYear()}-${last.getMonth()}-${last.getDate()}`;
          if (lastKey === todayKey) return current.streak;
          const todayStart = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
          const lastStart = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
          return todayStart - lastStart === 86400000 ? current.streak + 1 : 1;
        })(),
        workouts: current.workouts + 1,
        prs: current.prs + (newPr ? 1 : 0),
        totalVolume: current.totalVolume + result.volume,
        muscleTrainedCount: nextMuscleCounts,
      };

      void syncProfileToCloud(profile, nextStats);
      return nextStats;
    });

    setLastWorkout(result);
    void syncWorkoutToCloud(historyItem);

    return result;
  };

  const value = useMemo(
    () => ({
      hydrated,
      hasOnboarded,
      profile,
      stats,
      lastWorkout,
      routines,
      weekSchedule,
      bodyweightLogs,
      workoutsHistory,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      deleteWorkout,
      assignWeekSchedule,
      loadStarterPlan,
      logBodyweight,
      finishWorkout,
      completeOnboarding,
      resetOnboarding,
      updateProfile,
      setProStatus,
      loginApple,
      loginGoogle,
      logoutAuth,
      deleteAccountData,
    }),
    [hydrated, hasOnboarded, profile, stats, lastWorkout, routines, weekSchedule, bodyweightLogs, workoutsHistory],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}
