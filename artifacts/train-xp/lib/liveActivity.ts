import { Platform, NativeModules, AppState, type AppStateStatus } from 'react-native';

export interface WorkoutLiveActivityPayload {
  workoutName: string;
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  weightKg: number;
  reps: number;
  isResting: boolean;
  restSeconds?: number;
  restEndTime?: string; // ISO date string
  totalDurationSeconds: number;
  totalVolumeKg: number;
}

export interface UpdateLiveActivityPayload {
  exerciseName?: string;
  currentSet?: number;
  totalSets?: number;
  weightKg?: number;
  reps?: number;
  isResting?: boolean;
  restSeconds?: number;
  restEndTime?: string;
  totalDurationSeconds?: number;
  totalVolumeKg?: number;
}

class LiveActivityManager {
  private currentActivityId: string | null = null;
  private isSupported: boolean = Platform.OS === 'ios';
  private isWorkoutSessionActive: boolean = false;
  private lastPayload: WorkoutLiveActivityPayload | null = null;

  constructor() {
    if (this.isSupported) {
      AppState.addEventListener('change', (nextState: AppStateStatus) => {
        if (nextState === 'active' && this.isWorkoutSessionActive && this.lastPayload) {
          // Re-verify & re-assert Live Activity presence when returning to app
          void this.ensureActiveState();
        }
      });
    }
  }

  private getNativeModule() {
    return NativeModules.TrainXPLiveActivity || null;
  }

  async areActivitiesEnabled(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      const nativeMod = this.getNativeModule();
      if (nativeMod && typeof nativeMod.areActivitiesEnabled === 'function') {
        return await nativeMod.areActivitiesEnabled();
      }
      return true;
    } catch {
      return false;
    }
  }

  async hasActiveActivity(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      const nativeMod = this.getNativeModule();
      if (nativeMod && typeof nativeMod.hasActiveActivity === 'function') {
        return await nativeMod.hasActiveActivity();
      }
      return this.currentActivityId !== null;
    } catch {
      return false;
    }
  }

  async ensureActiveState(): Promise<void> {
    if (!this.isSupported || !this.isWorkoutSessionActive || !this.lastPayload) return;

    try {
      const isRunning = await this.hasActiveActivity();
      if (!isRunning) {
        // User swiped it away from lock screen -> immediately re-create!
        await this.startActivity(this.lastPayload);
      } else {
        // Still running -> push latest state
        await this.updateActivity(this.lastPayload);
      }
    } catch {
      // Safe fallback
    }
  }

  async startActivity(payload: WorkoutLiveActivityPayload): Promise<string | null> {
    if (!this.isSupported) return null;

    this.isWorkoutSessionActive = true;
    this.lastPayload = { ...payload };

    try {
      const nativeMod = this.getNativeModule();
      const restEndTime = payload.restSeconds
        ? new Date(Date.now() + payload.restSeconds * 1000).toISOString()
        : payload.restEndTime;

      const fullPayload = {
        ...payload,
        restEndTime,
      };

      if (nativeMod) {
        if (typeof nativeMod.ensureActiveActivity === 'function') {
          const id = await nativeMod.ensureActiveActivity(fullPayload);
          this.currentActivityId = id;
          return id;
        }
        if (typeof nativeMod.startActivity === 'function') {
          const id = await nativeMod.startActivity(fullPayload);
          this.currentActivityId = id;
          return id;
        }
      }

      this.currentActivityId = 'simulated-live-activity';
      return this.currentActivityId;
    } catch {
      return null;
    }
  }

  async updateActivity(payload: UpdateLiveActivityPayload): Promise<void> {
    if (!this.isSupported || !this.isWorkoutSessionActive) return;

    if (this.lastPayload) {
      this.lastPayload = {
        ...this.lastPayload,
        ...payload,
      };
    }

    try {
      const nativeMod = this.getNativeModule();
      const restEndTime = payload.restSeconds
        ? new Date(Date.now() + payload.restSeconds * 1000).toISOString()
        : payload.restEndTime;

      const updateData = {
        ...payload,
        restEndTime,
      };

      if (nativeMod) {
        if (this.currentActivityId && typeof nativeMod.updateActivity === 'function') {
          await nativeMod.updateActivity(this.currentActivityId, updateData);
          return;
        }
        if (typeof nativeMod.ensureActiveActivity === 'function' && this.lastPayload) {
          const id = await nativeMod.ensureActiveActivity({
            ...this.lastPayload,
            ...updateData,
          });
          this.currentActivityId = id;
          return;
        }
      }
    } catch {
      // Safe non-blocking fallback
    }
  }

  async startRestTimer(
    restSeconds: number,
    state: {
      exerciseName: string;
      currentSet: number;
      totalSets: number;
      weightKg: number;
      reps: number;
      totalDurationSeconds: number;
      totalVolumeKg: number;
    }
  ): Promise<void> {
    const restEndTime = new Date(Date.now() + restSeconds * 1000).toISOString();
    await this.updateActivity({
      ...state,
      isResting: true,
      restSeconds,
      restEndTime,
    });
  }

  async resumeActiveSet(state: {
    exerciseName: string;
    currentSet: number;
    totalSets: number;
    weightKg: number;
    reps: number;
    totalDurationSeconds: number;
    totalVolumeKg: number;
  }): Promise<void> {
    await this.updateActivity({
      ...state,
      isResting: false,
      restSeconds: 0,
      restEndTime: undefined,
    });
  }

  async endActivity(): Promise<void> {
    this.isWorkoutSessionActive = false;
    this.lastPayload = null;
    this.currentActivityId = null;

    if (!this.isSupported) return;

    try {
      const nativeMod = this.getNativeModule();
      if (nativeMod) {
        if (typeof nativeMod.endAllActivities === 'function') {
          await nativeMod.endAllActivities();
          return;
        }
        if (this.currentActivityId && typeof nativeMod.endActivity === 'function') {
          await nativeMod.endActivity(this.currentActivityId);
        }
      }
    } catch {
      // Safe fallback
    }
  }

  isLive(): boolean {
    return this.isWorkoutSessionActive;
  }
}

export const liveActivity = new LiveActivityManager();
