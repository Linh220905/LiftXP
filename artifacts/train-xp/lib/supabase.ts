import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nmnqmpjpczvoxauyosbv.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbnFtcGpwY3p2b3hhdXlvc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3ODU5NjAsImV4cCI6MjEwNzM2MTk2MH0.D3qnHPiF8A5ttd2eqor8pl-t8gJ9TLg_duIEB7DD_K4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function ensureUserSession(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      return null;
    }
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function syncProfileToCloud(profile: any, stats: any, weekSchedule?: any): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    const payload: any = {
      id: userId,
      name: profile.name,
      gender: profile.gender,
      weight: profile.weight,
      height: profile.height,
      goal: profile.goal,
      experience: profile.experience,
      level: stats.level,
      xp: stats.xp,
      xp_to_next: stats.xpToNext,
      streak: stats.streak,
      is_pro: profile.isPro,
      target_muscles: profile.targetMuscles || [],
      updated_at: new Date().toISOString(),
    };

    if (weekSchedule !== undefined) {
      payload.week_schedule = weekSchedule;
    }

    await supabase.from('profiles').upsert(payload);
  } catch {
    // Non-blocking offline fallback
  }
}

export async function syncRoutineToCloud(routine: any): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    await supabase.from('routines').upsert({
      id: routine.id,
      user_id: userId,
      name: routine.name,
      emoji: routine.emoji || '⚡',
      progression: routine.progression || 'linear',
      exercises: routine.exercises || [],
    });
  } catch {
    // Non-blocking offline fallback
  }
}

export async function deleteRoutineFromCloud(routineId: string): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    await supabase.from('routines').delete().eq('id', routineId).eq('user_id', userId);
  } catch {
    // Non-blocking offline fallback
  }
}

export async function syncWorkoutToCloud(workout: any): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    await supabase.from('workouts').upsert({
      id: workout.id,
      user_id: userId,
      routine_name: workout.routineName,
      duration: workout.duration,
      volume: workout.volume,
      xp: workout.xp,
      date: workout.date,
      entries: workout.entries || [],
    });
  } catch {
    // Non-blocking offline fallback
  }
}

export async function deleteWorkoutFromCloud(workoutId: string): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    await supabase.from('workouts').delete().eq('id', workoutId).eq('user_id', userId);
  } catch {
    // Non-blocking offline fallback
  }
}

export async function syncBodyweightLogToCloud(log: any): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    const { data: existing } = await supabase
      .from('bodyweight_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('date', log.date)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('bodyweight_logs')
        .update({ weight: log.weight })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('bodyweight_logs')
        .insert({
          user_id: userId,
          weight: log.weight,
          date: log.date,
        });
    }
  } catch {
    // Non-blocking offline fallback
  }
}

export async function fetchCloudUserData(): Promise<{
  profile?: any;
  stats?: any;
  weekSchedule?: any;
  routines?: any[];
  workouts?: any[];
  bodyweightLogs?: any[];
} | null> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return null;

    const [profileRes, routinesRes, workoutsRes, bwRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('routines').select('*').eq('user_id', userId),
      supabase.from('workouts').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('bodyweight_logs').select('*').eq('user_id', userId).order('date', { ascending: true }),
    ]);

    const result: any = {};

    if (profileRes.data) {
      const p = profileRes.data;
      result.profile = {
        name: p.name,
        gender: p.gender,
        weight: Number(p.weight),
        height: Number(p.height),
        goal: p.goal,
        experience: p.experience,
        targetMuscles: p.target_muscles || [],
        isPro: p.is_pro || false,
      };
      result.stats = {
        level: p.level || 1,
        xp: p.xp || 0,
        xpToNext: p.xp_to_next || 1000,
        streak: p.streak || 0,
      };
      if (p.week_schedule) {
        result.weekSchedule = p.week_schedule;
      }
    }

    if (routinesRes.data && routinesRes.data.length > 0) {
      result.routines = routinesRes.data.map((r) => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        progression: r.progression,
        exercises: r.exercises || [],
      }));
    }

    if (workoutsRes.data && workoutsRes.data.length > 0) {
      result.workouts = workoutsRes.data.map((w) => ({
        id: w.id,
        date: w.date,
        duration: w.duration,
        volume: Number(w.volume),
        xp: w.xp,
        routineName: w.routine_name,
        entries: w.entries || [],
      }));
    }

    if (bwRes.data && bwRes.data.length > 0) {
      result.bodyweightLogs = bwRes.data.map((b) => ({
        date: b.date,
        weight: Number(b.weight),
        timestamp: new Date(b.date).getTime(),
      }));
    }

    return result;
  } catch {
    return null;
  }
}
