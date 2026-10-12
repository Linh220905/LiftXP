import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  syncProfileToCloud,
  syncRoutineToCloud,
  deleteRoutineFromCloud,
  syncWorkoutToCloud,
  deleteWorkoutFromCloud,
  syncBodyweightLogToCloud,
  fetchCloudUserData,
} from '@/lib/supabase';
import { type MuscleSlug } from '@/lib/muscles';
import { type ProgressionPolicy } from '@/lib/progression';
import { type WorkoutHistoryItem } from '@/lib/effort';
import { generatePersonalizedPlan } from '@/lib/planGenerator';
import {
  initPurchases,
  checkHasProEntitlement,
  setupPurchasesListener,
  syncPurchasesUser,
  logOutPurchases,
} from '@/lib/purchases';
import { signInWithApple, signInWithGoogle, deleteUserAccount } from '@/lib/auth';

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
  goalWeight: number;
  goalWeeks: number;
  streakCommitment: number;
  notificationsEnabled: boolean;
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
  setProStatus: (isPro: boolean) => void;
  loginApple: () => Promise<boolean>;
  loginGoogle: () => Promise<boolean>;
  logoutAuth: () => Promise<void>;
  deleteAccountData: () => Promise<void>;
}

const STORAGE_KEY = '@train-xp/state';

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
  goalWeight: 75,
  goalWeeks: 4,
  streakCommitment: 30,
  notificationsEnabled: true,
  isPro: false,
};

const defaultStats: PlayerStats = {
  level: 1,
  xp: 120,
  xpToNext: 500,
  streak: 1,
  workouts: 3,
  prs: 2,
  totalVolume: 9600,
  muscleTrainedCount: { chest: 6, deltoids: 4, triceps: 4, 'upper-back': 4 },
};

const defaultWorkoutsHistory: WorkoutHistoryItem[] = [
  {
    id: 'w_demo_1',
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    duration: '45 min',
    volume: 3100,
    xp: 180,
    routineName: 'Push Day (Chest, Shoulders & Tris)',
    entries: [
      {
        id: 'barbell_bench_press',
        sets: [
          { weight: 60, reps: 8, rir: 2, done: true },
          { weight: 60, reps: 8, rir: 2, done: true },
          { weight: 65, reps: 6, rir: 1, done: true },
        ],
      },
      {
        id: 'incline_barbell_bench_press',
        sets: [
          { weight: 50, reps: 10, rir: 2, done: true },
          { weight: 50, reps: 10, rir: 2, done: true },
        ],
      },
    ],
  },
  {
    id: 'w_demo_2',
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    duration: '42 min',
    volume: 3400,
    xp: 180,
    routineName: 'Pull Day (Back & Biceps)',
    entries: [
      {
        id: 'lat_pulldown',
        sets: [
          { weight: 55, reps: 10, rir: 2, done: true },
          { weight: 55, reps: 10, rir: 2, done: true },
          { weight: 60, reps: 8, rir: 1, done: true },
        ],
      },
      {
        id: 'barbell_bent_over_row',
        sets: [
          { weight: 60, reps: 8, rir: 2, done: true },
          { weight: 65, reps: 8, rir: 1, done: true },
        ],
      },
    ],
  },
];

const defaultBodyweightLogs: BodyweightLog[] = [
  { date: '2026-09-10', weight: 67.2, timestamp: Date.now() - 28 * 86400000 },
  { date: '2026-09-17', weight: 67.5, timestamp: Date.now() - 21 * 86400000 },
  { date: '2026-09-24', weight: 67.8, timestamp: Date.now() - 14 * 86400000 },
  { date: '2026-10-01', weight: 68.0, timestamp: Date.now() - 7 * 86400000 },
  { date: '2026-10-08', weight: 68.4, timestamp: Date.now() },
];

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [stats, setStats] = useState<PlayerStats>(defaultStats);
  const [lastWorkout, setLastWorkout] = useState<WorkoutResult | null>(null);
  const [routines, setRoutines] = useState<Routine[]>(STARTER_ROUTINES);
  const [weekSchedule, setWeekSchedule] = useState<Record<number, string | null>>(defaultWeekSchedule);
  const [bodyweightLogs, setBodyweightLogs] = useState<BodyweightLog[]>(defaultBodyweightLogs);
  const [workoutsHistory, setWorkoutsHistory] = useState<WorkoutHistoryItem[]>(defaultWorkoutsHistory);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) {
          const saved = JSON.parse(value) as Partial<AppStateValue>;
          setHasOnboarded(Boolean(saved.hasOnboarded));
          setProfile({ ...defaultProfile, ...(saved.profile ?? {}) });
          setStats({ ...defaultStats, ...(saved.stats ?? {}) });
          setLastWorkout(saved.lastWorkout ?? null);
          if (saved.routines && Array.isArray(saved.routines) && saved.routines.length > 0) {
            setRoutines(saved.routines);
          }
          if (saved.weekSchedule) {
            setWeekSchedule(saved.weekSchedule);
          }
          if (saved.bodyweightLogs && saved.bodyweightLogs.length > 0) {
            setBodyweightLogs(saved.bodyweightLogs);
          }
          if (saved.workoutsHistory && saved.workoutsHistory.length > 0) {
            setWorkoutsHistory(saved.workoutsHistory);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        setHydrated(true);

        // Fetch latest cloud data in background
        void fetchCloudUserData().then((cloud) => {
          if (cloud) {
            if (cloud.profile) setProfile((p) => ({ ...p, ...cloud.profile }));
            if (cloud.stats) setStats((s) => ({ ...s, ...cloud.stats }));
            if (cloud.weekSchedule) setWeekSchedule(cloud.weekSchedule);
            if (cloud.routines && cloud.routines.length > 0) setRoutines(cloud.routines);
            if (cloud.workouts && cloud.workouts.length > 0) setWorkoutsHistory(cloud.workouts);
            if (cloud.bodyweightLogs && cloud.bodyweightLogs.length > 0) setBodyweightLogs(cloud.bodyweightLogs);
          }
        });

        void initPurchases().then(async (ready) => {
          if (ready) {
            const hasPro = await checkHasProEntitlement();
            if (hasPro) setProfile((p) => ({ ...p, isPro: true }));

            // Real-time listener: unlocks immediately when purchase or renewal occurs
            setupPurchasesListener((isPro) => {
              setProfile((prev) => {
                if (prev.isPro === isPro) return prev;
                const next = { ...prev, isPro };
                void syncProfileToCloud(next, stats, weekSchedule);
                return next;
              });
            });
          }
        });
      });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        hasOnboarded,
        profile,
        stats,
        lastWorkout,
        routines,
        weekSchedule,
        bodyweightLogs,
        workoutsHistory,
      }),
    );
  }, [hydrated, hasOnboarded, profile, stats, lastWorkout, routines, weekSchedule, bodyweightLogs, workoutsHistory]);

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
    setRoutines(gen.routines);
    setWeekSchedule(gen.weekSchedule);
    gen.routines.forEach((r) => void syncRoutineToCloud(r));
    void syncProfileToCloud(targetProf, stats, gen.weekSchedule);
  };

  const logBodyweight = (w: number) => {
    const dateStr = new Date().toISOString().split('T')[0];
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

    // Sync onboarding Level 14 (+91,000 XP) achievement
    const onboardStats: PlayerStats = {
      ...stats,
      level: 14,
      xp: 91000,
      xpToNext: 100000,
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
      STORAGE_KEY,
      JSON.stringify({ hasOnboarded: false, profile, stats, lastWorkout, routines, weekSchedule }),
    );
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
      const user = await signInWithApple();
      if (!user) return false;
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
      const user = await signInWithGoogle();
      if (!user) return false;
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
    void logOutPurchases();
    setProfile((prev) => ({
      ...prev,
      authEmail: undefined,
      authProvider: null,
      authUserId: undefined,
    }));
  };

  const deleteAccountData = async () => {
    const currentId = profile.authUserId;
    await deleteUserAccount(currentId);
    await AsyncStorage.clear();
    setHasOnboarded(false);
    setProfile(defaultProfile);
    setStats(defaultStats);
    setRoutines(STARTER_ROUTINES);
    setWeekSchedule(defaultWeekSchedule);
    setBodyweightLogs(defaultBodyweightLogs);
    setWorkoutsHistory(defaultWorkoutsHistory);
  };

  const deleteWorkout = (id: string) => {
    setWorkoutsHistory((prev) => prev.filter((w) => w.id !== id));
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

    const result: WorkoutResult = {
      xp: xpGain,
      duration,
      exercises: exCount,
      sets: setCount,
      volume: vol,
      newPr: true,
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
        streak: current.streak + 1,
        workouts: current.workouts + 1,
        prs: current.prs + 1,
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
