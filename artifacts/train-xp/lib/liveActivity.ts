import {
  Platform,
  NativeModules,
  AppState,
  type AppStateStatus,
} from "react-native";

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
  private isSupported: boolean =
    Platform.OS === "ios" && Boolean(NativeModules.TrainXPLiveActivity);
  private isWorkoutSessionActive: boolean = false;
  private lastPayload: WorkoutLiveActivityPayload | null = null;
  private subscription: ReturnType<typeof AppState.addEventListener> | null =
    null;
  private queue: Promise<unknown> = Promise.resolve();
  private generation = 0;

  constructor() {
    this.attach();
  }

  attach() {
    if (this.isSupported && !this.subscription) {
      this.subscription = AppState.addEventListener(
        "change",
        (nextState: AppStateStatus) => {
          if (
            nextState === "active" &&
            this.isWorkoutSessionActive &&
            this.lastPayload
          ) {
            // Re-verify & re-assert Live Activity presence when returning to app
            void this.ensureActiveState();
          }
        },
      );
    }
  }

  private getNativeModule() {
    return NativeModules.TrainXPLiveActivity || null;
  }

  async areActivitiesEnabled(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      const nativeMod = this.getNativeModule();
      if (nativeMod && typeof nativeMod.areActivitiesEnabled === "function") {
        return await nativeMod.areActivitiesEnabled();
      }
      return false;
    } catch {
      return false;
    }
  }

  async hasActiveActivity(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      const nativeMod = this.getNativeModule();
      if (nativeMod && typeof nativeMod.hasActiveActivity === "function") {
        return await nativeMod.hasActiveActivity();
      }
      return this.currentActivityId !== null;
    } catch {
      return false;
    }
  }

  async ensureActiveState(): Promise<void> {
    if (!this.isSupported || !this.isWorkoutSessionActive || !this.lastPayload)
      return;

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

  async startActivity(
    payload: WorkoutLiveActivityPayload,
  ): Promise<string | null> {
    if (!this.isSupported) return null;

    this.isWorkoutSessionActive = true;
    this.lastPayload = {
      ...payload,
      restEndTime:
        payload.restEndTime ??
        (payload.restSeconds
          ? new Date(Date.now() + payload.restSeconds * 1000).toISOString()
          : undefined),
    };
    const version = ++this.generation;

    try {
      const nativeMod = this.getNativeModule();
      const restEndTime = this.lastPayload.restEndTime;

      const fullPayload = {
        ...payload,
        restEndTime,
      };

      if (nativeMod) {
        if (typeof nativeMod.ensureActiveActivity === "function") {
          const id = await this.enqueue<string | null>(() =>
            nativeMod.ensureActiveActivity(fullPayload),
          );
          if (version !== this.generation) {
            if (
              !this.isWorkoutSessionActive &&
              id &&
              typeof nativeMod.endActivity === "function"
            )
              await this.enqueue(() => nativeMod.endActivity(id));
            return null;
          }
          this.currentActivityId = id;
          return id;
        }
        if (typeof nativeMod.startActivity === "function") {
          const id = await this.enqueue<string | null>(() =>
            nativeMod.startActivity(fullPayload),
          );
          if (version !== this.generation) {
            if (
              !this.isWorkoutSessionActive &&
              id &&
              typeof nativeMod.endActivity === "function"
            )
              await this.enqueue(() => nativeMod.endActivity(id));
            return null;
          }
          this.currentActivityId = id;
          return id;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  async updateActivity(payload: UpdateLiveActivityPayload): Promise<void> {
    if (!this.isSupported || !this.isWorkoutSessionActive) return;

    const version = this.generation;
    const mergedPayload = this.lastPayload
      ? { ...this.lastPayload, ...payload }
      : payload;
    if (payload.isResting === false) {
      mergedPayload.restEndTime = undefined;
      mergedPayload.restSeconds = undefined;
    }
    if (this.lastPayload)
      this.lastPayload = mergedPayload as WorkoutLiveActivityPayload;

    try {
      const nativeMod = this.getNativeModule();
      const restEndTime = mergedPayload.restEndTime;

      const updateData = {
        ...mergedPayload,
        restEndTime,
      };

      if (nativeMod) {
        if (
          this.currentActivityId &&
          typeof nativeMod.updateActivity === "function"
        ) {
          const id = this.currentActivityId;
          await this.enqueue(() =>
            version === this.generation && this.isWorkoutSessionActive
              ? nativeMod.updateActivity(id, updateData)
              : Promise.resolve(),
          );
          return;
        }
        if (
          typeof nativeMod.ensureActiveActivity === "function" &&
          this.lastPayload
        ) {
          const id = await this.enqueue<string | null>(() =>
            version === this.generation && this.isWorkoutSessionActive
              ? nativeMod.ensureActiveActivity(updateData)
              : Promise.resolve(null),
          );
          if (version === this.generation) this.currentActivityId = id;
          else if (
            !this.isWorkoutSessionActive &&
            id &&
            typeof nativeMod.endActivity === "function"
          )
            await this.enqueue(() => nativeMod.endActivity(id));
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
    },
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
    const endingId = this.currentActivityId;
    this.generation++;
    this.isWorkoutSessionActive = false;
    this.lastPayload = null;
    this.currentActivityId = null;

    if (!this.isSupported) return;

    try {
      const nativeMod = this.getNativeModule();
      if (nativeMod) {
        if (typeof nativeMod.endAllActivities === "function") {
          await this.enqueue(() => nativeMod.endAllActivities());
          return;
        }
        if (endingId && typeof nativeMod.endActivity === "function") {
          await this.enqueue(() => nativeMod.endActivity(endingId));
        }
      }
    } catch {
      // Safe fallback
    }
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => undefined).then(operation);
    this.queue = next.catch(() => undefined);
    return next;
  }

  dispose() {
    this.subscription?.remove();
    this.subscription = null;
  }

  isLive(): boolean {
    return this.isWorkoutSessionActive;
  }
}

export const liveActivity = new LiveActivityManager();
