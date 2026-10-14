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

type CloudMutation = {
  id: string;
  userId: string;
  kind: 'profile' | 'app-state-upsert' | 'routine-upsert' | 'routine-delete' | 'workout-upsert' | 'workout-delete' | 'bodyweight-upsert';
  payload: any;
};

const CLOUD_OUTBOX_KEY = '@train-xp/cloud-outbox';
let outboxLock: Promise<void> = Promise.resolve();
let cloudWriteLock: Promise<void> = Promise.resolve();

async function readOutbox(): Promise<CloudMutation[]> {
  const raw = await AsyncStorage.getItem(CLOUD_OUTBOX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) =>
      item && typeof item.id === 'string' && typeof item.userId === 'string' && typeof item.kind === 'string'
    ) as CloudMutation[] : [];
  } catch {
    await AsyncStorage.removeItem(CLOUD_OUTBOX_KEY);
    return [];
  }
}

async function updateOutbox(update: (items: CloudMutation[]) => CloudMutation[]): Promise<void> {
  const operation = outboxLock.then(async () => {
    const items = await readOutbox();
    await AsyncStorage.setItem(CLOUD_OUTBOX_KEY, JSON.stringify(update(items)));
  });
  outboxLock = operation.catch(() => undefined);
  await operation;
}

async function executeCloudMutation(mutation: CloudMutation): Promise<void> {
  const { userId, kind, payload } = mutation;
  let result: any;
  switch (kind) {
    case 'profile':
      result = await supabase.from('profiles').upsert(payload);
      break;
    case 'app-state-upsert':
      result = await supabase.from('user_app_state').upsert(payload);
      break;
    case 'routine-upsert':
      result = await supabase.from('routines').upsert(payload);
      break;
    case 'routine-delete':
      result = await supabase.from('routines').delete().eq('id', payload.id).eq('user_id', userId);
      break;
    case 'workout-upsert':
      result = await supabase.from('workouts').upsert(payload);
      break;
    case 'workout-delete':
      result = await supabase.from('workouts').delete().eq('id', payload.id).eq('user_id', userId);
      break;
    case 'bodyweight-upsert': {
      const { data: existing, error: readError } = await supabase
        .from('bodyweight_logs').select('id').eq('user_id', userId).eq('date', payload.date).maybeSingle();
      if (readError) throw readError;
      result = existing?.id
        ? await supabase.from('bodyweight_logs').update({ weight: payload.weight }).eq('id', existing.id)
        : await supabase.from('bodyweight_logs').insert({ user_id: userId, weight: payload.weight, date: payload.date });
      break;
    }
  }
  if (result?.error) throw result.error;
}

async function saveAndSyncMutation(userId: string, kind: CloudMutation['kind'], payload: any): Promise<void> {
  const mutation: CloudMutation = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    userId,
    kind,
    payload,
  };
  await updateOutbox((items) => [...items, mutation]);
  try {
    const execution = cloudWriteLock.then(() => executeCloudMutation(mutation));
    cloudWriteLock = execution.catch(() => undefined);
    await execution;
    await updateOutbox((items) => items.filter((item) => item.id !== mutation.id));
  } catch (error) {
    console.warn('[Cloud sync] Mutation queued for retry:', kind, error);
  }
}

export async function replayCloudOutbox(expectedUserId: string): Promise<void> {
  const activeUserId = await ensureUserSession();
  if (!activeUserId || activeUserId !== expectedUserId) return;
  const items = await readOutbox();
  for (const mutation of items) {
    if (mutation.userId !== expectedUserId) continue;
    try {
      await executeCloudMutation(mutation);
      await updateOutbox((current) => current.filter((item) => item.id !== mutation.id));
    } catch {
      break;
    }
  }
}

export async function clearCloudOutboxForUser(userId: string): Promise<void> {
  await updateOutbox((items) => items.filter((item) => item.userId !== userId));
}

export async function syncAppStateToCloud(state: Record<string, unknown>): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;
    await saveAndSyncMutation(userId, 'app-state-upsert', {
      user_id: userId,
      state,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Keep startup and local writes usable if storage itself is unavailable.
  }
}

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

    await saveAndSyncMutation(userId, 'profile', payload);
  } catch {
    // Non-blocking offline fallback
  }
}

export async function syncRoutineToCloud(routine: any): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    await saveAndSyncMutation(userId, 'routine-upsert', {
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

    await saveAndSyncMutation(userId, 'routine-delete', { id: routineId });
  } catch {
    // Non-blocking offline fallback
  }
}

export async function syncWorkoutToCloud(workout: any): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    await saveAndSyncMutation(userId, 'workout-upsert', {
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

    await saveAndSyncMutation(userId, 'workout-delete', { id: workoutId });
  } catch {
    // Non-blocking offline fallback
  }
}

export async function syncBodyweightLogToCloud(log: any): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    await saveAndSyncMutation(userId, 'bodyweight-upsert', { date: log.date, weight: log.weight });
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
  appState?: Record<string, any>;
} | null> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return null;

    const [profileRes, routinesRes, workoutsRes, bwRes, appStateRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('routines').select('*').eq('user_id', userId),
      supabase.from('workouts').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('bodyweight_logs').select('*').eq('user_id', userId).order('date', { ascending: true }),
      supabase.from('user_app_state').select('state').eq('user_id', userId).maybeSingle(),
    ]);

    const queryError = profileRes.error || routinesRes.error || workoutsRes.error || bwRes.error;
    if (queryError) throw queryError;

    const result: any = {};
    if (!appStateRes.error && appStateRes.data?.state) result.appState = appStateRes.data.state;

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

    if (routinesRes.data) {
      result.routines = routinesRes.data.map((r) => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        progression: r.progression,
        exercises: r.exercises || [],
      }));
    }

    if (workoutsRes.data) {
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

    if (bwRes.data) {
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
