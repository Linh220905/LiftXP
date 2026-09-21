import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Experience = 'Just starting' | 'Less than 6 months' | '6–12 months' | '1–3 years' | '3+ years';
export type Goal = 'Build muscle' | 'Get stronger' | 'Lose fat' | 'Improve fitness' | 'Stay consistent';

export interface Profile {
  experience: Experience;
  goal: Goal;
  age: string;
  height: string;
  weight: string;
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
  finishWorkout: () => WorkoutResult;
  completeOnboarding: (profile: Profile) => void;
}

const STORAGE_KEY = '@train-xp/state';

const defaultProfile: Profile = {
  experience: 'Just starting',
  goal: 'Build muscle',
  age: '',
  height: '',
  weight: '',
};

const defaultStats: PlayerStats = {
  level: 4,
  xp: 820,
  xpToNext: 1000,
  streak: 7,
  workouts: 18,
  prs: 4,
  totalVolume: 48200,
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [stats, setStats] = useState<PlayerStats>(defaultStats);
  const [lastWorkout, setLastWorkout] = useState<WorkoutResult | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) {
          const saved = JSON.parse(value) as Partial<AppStateValue>;
          setHasOnboarded(Boolean(saved.hasOnboarded));
          setProfile({ ...defaultProfile, ...(saved.profile ?? {}) });
          setStats({ ...defaultStats, ...(saved.stats ?? {}) });
          setLastWorkout(saved.lastWorkout ?? null);
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ hasOnboarded, profile, stats, lastWorkout }),
    );
  }, [hydrated, hasOnboarded, profile, stats, lastWorkout]);

  const completeOnboarding = (nextProfile: Profile) => {
    setProfile(nextProfile);
    setHasOnboarded(true);
  };

  const finishWorkout = () => {
    const rankedUp = stats.xp + 180 >= stats.xpToNext;
    const result: WorkoutResult = {
      xp: 180,
      duration: '42 min',
      exercises: 4,
      sets: 12,
      volume: 3180,
      newPr: true,
      rankedUp,
    };
    setStats((current) => ({
      ...current,
      level: rankedUp ? current.level + 1 : current.level,
      xp: rankedUp ? current.xp + 180 - current.xpToNext : current.xp + 180,
      xpToNext: rankedUp ? current.xpToNext + 250 : current.xpToNext,
      streak: current.streak + 1,
      workouts: current.workouts + 1,
      prs: current.prs + 1,
      totalVolume: current.totalVolume + result.volume,
    }));
    setLastWorkout(result);
    return result;
  };

  const value = useMemo(
    () => ({ hydrated, hasOnboarded, profile, stats, lastWorkout, finishWorkout, completeOnboarding }),
    [hydrated, hasOnboarded, profile, stats, lastWorkout],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}