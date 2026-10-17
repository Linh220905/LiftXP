import { ExerciseThumbnail } from "@/components/ExerciseThumbnail";
import { PaywallModal } from "@/components/PaywallModal";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { writeJson, removeStored } from "@/lib/storage";
import { workoutDraftSchema } from "@/lib/workoutDraft";
import { useTodayKey } from "@/hooks/useTodayKey";
import { Text, TextInput } from "@/components/AppTypography";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  StyleSheet,
  View,
  ScrollView,
  FlatList,
  Pressable,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
  AppState as NativeAppState,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { router } from "expo-router";
import {
  useAppState,
  type WorkoutResult,
  type Routine,
} from "@/context/AppState";
import { ExerciseMannequinHighlight } from "@/components/ExerciseMannequinHighlight";
import { TrainingMetricsModal } from "@/components/TrainingMetricsModal";
import { musclesOf, MUSCLE_NAMES, type MuscleSlug } from "@/lib/muscles";
import {
  type ProgressionPolicy,
  calculate1RM,
  calculateNextPrescription,
} from "@/lib/progression";
import {
  getExerciseImageSource,
  getExerciseGifSource,
} from "@/lib/exerciseAssets";
import { useI18n } from "@/lib/i18n";
import { liveActivity } from "@/lib/liveActivity";
import { playRestTimerChime } from "@/lib/soundAlert";
import {
  displayWeightToKg,
  formatWeight,
  kgToDisplayWeight,
  weightUnitLabel,
} from "@/lib/units";
import {
  getExerciseDisplayName,
  getExerciseSecondaryName,
} from "@/lib/exerciseLocalization";

// Import seed dataset
import EXERCISES_DATA from "../../../../data/exercises_supabase_seed.json";

interface ExerciseItem {
  id: string;
  name: string;
  name_vi: string;
  category: string;
  equipment: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  level: string;
  mechanic: string;
  force: string;
  instructions: string[];
  thumbnail_url?: string;
  image_end_url?: string;
  motion_gif_url?: string;
  image_file?: string;
  gif_file?: string;
}

export type SetType = "normal" | "warmup" | "dropset" | "failure";

interface LoggedSet {
  setNumber: number;
  weight: string;
  reps: string;
  targetReps: number;
  rir?: number;
  setType?: SetType;
  isDropSet?: boolean;
  done: boolean;
}

interface ActiveExercise {
  exercise: ExerciseItem;
  progression: ProgressionPolicy;
  unilateral: boolean;
  supersetId?: string;
  sets: LoggedSet[];
}

interface DetailedFinishReport extends WorkoutResult {
  musclesTrained: MuscleSlug[];
  primaryMuscleNames: string[];
  secondaryMuscleNames: string[];
  setsDone: number;
  warmupSetsCount: number;
  dropSetsCount: number;
  failureSetsCount: number;
  bestPrs: { name: string; weight: number; reps: number; est1RM: number }[];
  hypertrophyHighlights: string[];
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function parseWorkoutNumber(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { finishWorkout, profile, routines, weekSchedule, workoutsHistory } =
    useAppState();
  const { t, locale } = useI18n();

  const exMap = useMemo(() => {
    const map = new Map<string, ExerciseItem>();
    EXERCISES_DATA.forEach((e) => map.set(e.id, e as unknown as ExerciseItem));
    return map;
  }, []);

  // Today's Routine Detection
  const todayKey = useTodayKey();
  const todayIdx = new Date(`${todayKey}T12:00:00`).getDay();
  const todayRoutineId = weekSchedule[todayIdx];
  const todayRoutine = routines.find((r) => r.id === todayRoutineId) || null;
  const others = routines.filter((r) => r.id !== todayRoutineId);

  // Workout Session State
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [activeRoutineName, setActiveRoutineName] =
    useState<string>("Freestyle Workout");
  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const currentActive = activeExercises[currentExerciseIndex] || null;
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const workoutDuration =
    startedAt === null
      ? 0
      : Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  const [sessionId, setSessionId] = useState("");
  const finishLock = useRef(false);
  const paywallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftError, setDraftError] = useState(false);
  const [draftRetry, setDraftRetry] = useState(0);
  const [restWidgetHeight, setRestWidgetHeight] = useState(0);
  const [dockHeight, setDockHeight] = useState(76);
  const { width: windowWidth } = useWindowDimensions();
  const [detailedSummary, setDetailedSummary] =
    useState<DetailedFinishReport | null>(null);

  // Media Tab
  const [activeMediaTab, setActiveMediaTab] = useState<"gif" | "mannequin">(
    "gif",
  );
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedExerciseDetail, setSelectedExerciseDetail] =
    useState<ExerciseItem | null>(null);

  // Barbell Plate Calculator Modal
  const [plateModalOpen, setPlateModalOpen] = useState(false);
  const [plateTargetWeight, setPlateTargetWeight] = useState(
    profile.unit === "Imperial" ? "135" : "60",
  );
  const [barWeight, setBarWeight] = useState(
    profile.unit === "Imperial" ? 45 : 20,
  );

  useEffect(() => {
    setPlateTargetWeight(profile.unit === "Imperial" ? "135" : "60");
    setBarWeight(profile.unit === "Imperial" ? 45 : 20);
  }, [profile.unit]);

  useEffect(() => {
    return () => {
      if (paywallTimerRef.current) {
        clearTimeout(paywallTimerRef.current);
      }
    };
  }, []);

  // Floating Rest Timer
  const previousUnit = useRef(profile.unit);
  useEffect(() => {
    if (previousUnit.current !== profile.unit) {
      const oldUnit = previousUnit.current;
      previousUnit.current = profile.unit;
      setActiveExercises((prev) =>
        prev.map((act) => ({
          ...act,
          sets: act.sets.map((set) => ({
            ...set,
            weight: String(
              kgToDisplayWeight(
                displayWeightToKg(parseWorkoutNumber(set.weight) ?? 0, oldUnit),
                profile.unit,
              ),
            ),
          })),
        })),
      );
    }
  }, [profile.unit]);
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const restSeconds =
    restEndAt === null
      ? 120
      : Math.max(0, Math.ceil((restEndAt - nowMs) / 1000));
  const setRestSeconds = (seconds: number) => {
    setRestEndAt(Date.now() + seconds * 1000);
    setNowMs(Date.now());
  };
  const [isRestTimerRunning, setIsRestTimerRunning] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [autoRestPref, setAutoRestPref] = useState(true);
  const [soundPref, setSoundPref] = useState(true);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const pairs = await AsyncStorage.multiGet([
          "@train-xp/pref:auto-rest",
          "@train-xp/pref:sound",
        ]);
        const autoRestVal = pairs.find(
          ([k]) => k === "@train-xp/pref:auto-rest",
        )?.[1];
        const soundVal = pairs.find(([k]) => k === "@train-xp/pref:sound")?.[1];
        if (autoRestVal !== null && autoRestVal !== undefined) {
          setAutoRestPref(autoRestVal !== "false");
        }
        if (soundVal !== null && soundVal !== undefined) {
          setSoundPref(soundVal !== "false");
        }
      } catch {
        // use defaults
      }
    };
    void loadPrefs();
  }, []);

  const draftStorageKey = `@train-xp/workout-draft:${profile.authUserId || "guest"}`;

  useEffect(() => {
    let cancelled = false;
    setDraftReady(false);
    void AsyncStorage.getItem(draftStorageKey)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const saved = JSON.parse(raw);
            // Migrate the old full-exercise draft before validating the compact representation.
            const candidate =
              saved.schemaVersion === 2
                ? saved
                : {
                    schemaVersion: 2,
                    sessionId:
                      saved.sessionId ?? `draft_${saved.savedAt ?? Date.now()}`,
                    routineName: saved.routineName,
                    startedAt:
                      (saved.savedAt ?? Date.now()) -
                      (saved.duration ?? 0) * 1000,
                    restEndAt: null,
                    currentExerciseIndex: Math.max(
                      0,
                      Number(saved.currentExerciseIndex) || 0,
                    ),
                    exercises: saved.exercises?.map((act: any) => ({
                      id: act.exercise?.id,
                      progression: act.progression ?? "off",
                      unilateral: !!act.unilateral,
                      supersetId: act.supersetId,
                      sets: act.sets?.map((set: any) => ({
                        ...set,
                        weightKg: displayWeightToKg(
                          parseWorkoutNumber(String(set.weight)) ?? 0,
                          profile.unit,
                        ),
                      })),
                    })),
                  };
            const parsed = workoutDraftSchema.safeParse(candidate);
            if (!parsed.success) throw new Error("Invalid draft");
            const draft = parsed.data;
            if (workoutsHistory.some((w) => w.id === draft.sessionId)) {
              void removeStored(draftStorageKey).catch(() => undefined);
            } else {
              const exercises: ActiveExercise[] = draft.exercises.flatMap(
                (act) => {
                  const exercise = exMap.get(act.id);
                  return exercise
                    ? [
                        {
                          exercise,
                          progression: act.progression,
                          unilateral: act.unilateral,
                          supersetId: act.supersetId,
                          sets: act.sets.map(
                            ({
                              weightKg,
                              weightInput,
                              weightUnit,
                              ...set
                            }) => ({
                              ...set,
                              weight:
                                weightInput !== undefined &&
                                weightUnit === profile.unit
                                  ? weightInput
                                  : String(
                                      kgToDisplayWeight(weightKg, profile.unit),
                                    ),
                            }),
                          ),
                        },
                      ]
                    : [];
                },
              );
              if (exercises.length) {
                setSessionId(draft.sessionId);
                finishLock.current = false;
                setActiveRoutineName(draft.routineName);
                setActiveExercises(exercises);
                setCurrentExerciseIndex(
                  Math.max(
                    0,
                    Math.min(draft.currentExerciseIndex, exercises.length - 1),
                  ),
                );
                setStartedAt(draft.startedAt);
                setNowMs(Date.now());
                setRestEndAt(draft.restEndAt);
                setIsRestTimerRunning(
                  draft.restEndAt !== null && draft.restEndAt > Date.now(),
                );
                setDetailedSummary(null);
                setIsWorkoutActive(true);
              }
            }
          } catch {
            void removeStored(draftStorageKey).catch(() => undefined);
          }
        }
        setDraftReady(true);
      })
      .catch(() => {
        if (!cancelled) setDraftReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftReady) return;
    if (!isWorkoutActive || !activeExercises.length || startedAt === null) {
      void removeStored(draftStorageKey).catch(() => undefined);
      return;
    }
    const draft = {
      schemaVersion: 2,
      sessionId,
      routineName: activeRoutineName,
      startedAt,
      restEndAt,
      currentExerciseIndex,
      exercises: activeExercises.map((act) => ({
        id: act.exercise.id,
        progression: act.progression,
        unilateral: act.unilateral,
        supersetId: act.supersetId,
        sets: act.sets.map(({ weight, ...set }) => ({
          ...set,
          weightInput: weight,
          weightUnit: profile.unit,
          weightKg: displayWeightToKg(
            parseWorkoutNumber(weight) ?? 0,
            profile.unit,
          ),
        })),
      })),
    };
    const save = () => {
      void writeJson(draftStorageKey, draft)
        .then(() => setDraftError(false))
        .catch(() => setDraftError(true));
    };
    const timer = setTimeout(save, 300);
    const sub = NativeAppState.addEventListener("change", (state) => {
      if (state !== "active") {
        clearTimeout(timer);
        save();
      }
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [
    draftReady,
    draftStorageKey,
    isWorkoutActive,
    sessionId,
    activeRoutineName,
    activeExercises,
    currentExerciseIndex,
    startedAt,
    restEndAt,
    profile.unit,
    draftRetry,
  ]);

  // Search Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("All");

  // Keep screen awake during active workout
  useEffect(() => {
    if (!isWorkoutActive || activeExercises.length === 0) return;
    void activateKeepAwakeAsync().catch(() => {});
    void liveActivity.ensureActiveState();
    return () => {
      void deactivateKeepAwake().catch(() => {});
    };
  }, [isWorkoutActive, activeExercises.length]);

  useEffect(() => {
    if (!isWorkoutActive || startedAt === null) return;
    const tick = () => setNowMs(Date.now());
    const interval = setInterval(tick, 1000);
    const sub = NativeAppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [isWorkoutActive, startedAt]);

  const currentTotalVolume = useMemo(() => {
    let vol = 0;
    activeExercises.forEach((act) => {
      act.sets.forEach((s) => {
        if (s.done && s.setType !== "warmup") {
          const w = displayWeightToKg(
            parseWorkoutNumber(s.weight) ?? 0,
            profile.unit,
          );
          const r = parseWorkoutNumber(s.reps) ?? 0;
          vol += w * r;
        }
      });
    });
    return Math.round(vol);
  }, [activeExercises, profile.unit]);

  const syncLiveActivitySet = useCallback(
    (actEx: ActiveExercise, setIdx: number, isRest = false, restSec = 0) => {
      const targetSet = actEx.sets[setIdx] || actEx.sets[0];
      const exName = getExerciseDisplayName(actEx.exercise, locale);
      const payload = {
        exerciseName: exName,
        currentSet: setIdx + 1,
        totalSets: actEx.sets.length,
        weightKg: displayWeightToKg(
          parseWorkoutNumber(targetSet?.weight || "0") ?? 0,
          profile.unit,
        ),
        reps: parseInt(targetSet?.reps || "0", 10) || 0,
        isResting: isRest,
        restSeconds: restSec > 0 ? restSec : undefined,
        restEndTime:
          isRest && restEndAt ? new Date(restEndAt).toISOString() : undefined,
        totalDurationSeconds: workoutDuration,
        totalVolumeKg: currentTotalVolume,
      };

      if (!liveActivity.isLive()) {
        void liveActivity.startActivity({
          workoutName: activeRoutineName,
          ...payload,
        });
      } else {
        void liveActivity.updateActivity(payload);
      }
    },
    [
      activeRoutineName,
      currentTotalVolume,
      locale,
      workoutDuration,
      restEndAt,
      profile.unit,
    ],
  );

  useEffect(() => {
    if (!isWorkoutActive || !currentActive || liveActivity.isLive()) return;
    const nextSet = Math.max(
      0,
      currentActive.sets.findIndex((set) => !set.done),
    );
    syncLiveActivitySet(
      currentActive,
      nextSet,
      isRestTimerRunning,
      restSeconds,
    );
  }, [
    isWorkoutActive,
    currentActive,
    syncLiveActivitySet,
    isRestTimerRunning,
    restSeconds,
  ]);

  // Periodic sync Live Activity duration every 10s
  useEffect(() => {
    if (
      isWorkoutActive &&
      liveActivity.isLive() &&
      workoutDuration > 0 &&
      workoutDuration % 10 === 0
    ) {
      void liveActivity.updateActivity({
        totalDurationSeconds: workoutDuration,
        totalVolumeKg: currentTotalVolume,
      });
    }
  }, [workoutDuration, isWorkoutActive, currentTotalVolume]);

  useEffect(() => {
    if (!isRestTimerRunning || restEndAt === null || nowMs < restEndAt) return;
    setIsRestTimerRunning(false);
    setRestEndAt(null);
    if (soundPref) {
      playRestTimerChime();
    }
    if (currentActive) {
      const idx = currentActive.sets.findIndex((set) => !set.done);
      syncLiveActivitySet(currentActive, Math.max(0, idx), false);
    }
  }, [
    isRestTimerRunning,
    restEndAt,
    nowMs,
    currentActive,
    syncLiveActivitySet,
    soundPref,
  ]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleStartRoutine = (routine: Routine | null) => {
    if (!draftReady) return;
    if (routine !== null && !profile.isPro) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowPaywall(true);
      return;
    }
    finishLock.current = false;
    setSessionId(
      `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStartedAt(null);
    setRestEndAt(null);
    setIsRestTimerRunning(false);
    setDetailedSummary(null);
    setActiveMediaTab("gif");

    if (routine && routine.exercises.length > 0) {
      setActiveRoutineName(routine.name);
      const loaded: ActiveExercise[] = routine.exercises
        .map((re) => {
          const ex = exMap.get(re.id);
          if (!ex) return null;
          const previousWorkout = workoutsHistory.find((workout) =>
            workout.entries.some(
              (entry) => entry.id === re.id && entry.sets.some((set) => set.done),
            ),
          );
          const previousSets =
            previousWorkout?.entries
              .filter((entry) => entry.id === re.id)
              .flatMap((entry) => entry.sets)
              .filter((set) => !set.isDropSet && set.setType !== "warmup")
              .map((set) => ({
                weightKg: Number(set.weight) || 0,
                reps: Number(set.reps) || 0,
                targetReps: set.targetReps ?? re.targetReps ?? re.reps,
                done: set.done,
                rir: set.rir,
              })) ?? [];
          const working = previousSets.filter((set) => set.done);
          const lastWeight = working[0]?.weightKg ?? re.targetWeight ?? 0;
          const prescription = previousSets.length
            ? calculateNextPrescription(
                lastWeight,
                previousSets,
                {
                  policy: re.progression ?? routine.progression ?? "off",
                  minReps: re.minReps ?? re.reps,
                  maxReps: re.maxReps ?? Math.max(re.reps, 12),
                },
                `${ex.mechanic} ${ex.primary_muscles.join(" ")}`,
              )
            : {
                weightKg: re.targetWeight ?? 0,
                targetReps: re.targetReps ?? re.reps,
                reason: "Starting prescription.",
              };
          return {
            exercise: ex,
            progression: re.progression ?? routine.progression ?? "off",
            supersetId: re.supersetId,
            unilateral: false,
            sets: Array.from({ length: re.sets || 3 }).map((_, i) => ({
              setNumber: i + 1,
              weight: String(
                kgToDisplayWeight(prescription.weightKg, profile.unit),
              ),
              reps: String(prescription.targetReps),
              targetReps: prescription.targetReps,
              rir: re.rir ?? 2,
              done: false,
            })),
          };
        })
        .filter(
          (e): e is NonNullable<typeof e> => e !== null,
        ) as ActiveExercise[];

      if (!loaded.length) {
        Alert.alert(t.workout.noValidExercisesTitle);
        return;
      }
      setStartedAt(Date.now());
      setNowMs(Date.now());
      setActiveExercises(loaded);
      setCurrentExerciseIndex(0);
      setIsWorkoutActive(true);

      if (loaded.length > 0) {
        const firstEx = loaded[0];
        const firstSet = firstEx.sets[0];
        const exName = getExerciseDisplayName(firstEx.exercise, locale);
        void liveActivity.startActivity({
          workoutName: routine.name,
          exerciseName: exName,
          currentSet: 1,
          totalSets: firstEx.sets.length,
          weightKg: displayWeightToKg(
            parseWorkoutNumber(firstSet?.weight || "0") ?? 0,
            profile.unit,
          ),
          reps: parseInt(firstSet?.reps || "0", 10) || 0,
          isResting: false,
          totalDurationSeconds: 0,
          totalVolumeKg: 0,
        });
      }
    } else {
      setActiveRoutineName(t.workout.freestyleTitle);
      setActiveExercises([]);
      setCurrentExerciseIndex(0);
      setIsWorkoutActive(true);
      setShowSearchModal(true);
    }
  };

  const addExerciseToWorkout = (ex: ExerciseItem) => {
    if (!profile.isPro) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setSelectedExerciseDetail(null);
      setShowSearchModal(false);
      if (activeExercises.length === 0) {
        setIsWorkoutActive(false);
      }
      if (paywallTimerRef.current) {
        clearTimeout(paywallTimerRef.current);
      }
      paywallTimerRef.current = setTimeout(() => {
        setShowPaywall(true);
      }, Platform.OS === "ios" ? 250 : 50);
      return;
    }
    setSelectedExerciseDetail(null);
    const duplicate = activeExercises.findIndex(
      (act) => act.exercise.id === ex.id,
    );
    if (duplicate >= 0) {
      setCurrentExerciseIndex(duplicate);
      setShowSearchModal(false);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newActive: ActiveExercise = {
      exercise: ex,
      progression: "linear",
      unilateral: false,
      sets: [
        {
          setNumber: 1,
          weight: String(kgToDisplayWeight(0, profile.unit)),
          reps: "10",
          targetReps: 10,
          rir: 2,
          done: false,
        },
        {
          setNumber: 2,
          weight: String(kgToDisplayWeight(0, profile.unit)),
          reps: "10",
          targetReps: 10,
          rir: 2,
          done: false,
        },
        {
          setNumber: 3,
          weight: String(kgToDisplayWeight(0, profile.unit)),
          reps: "10",
          targetReps: 10,
          rir: 2,
          done: false,
        },
      ],
    };

    if (activeExercises.length === 0) {
      setStartedAt(Date.now());
      setNowMs(Date.now());
      const exName = getExerciseDisplayName(ex, locale);
      void liveActivity.startActivity({
        workoutName: activeRoutineName,
        exerciseName: exName,
        currentSet: 1,
        totalSets: 3,
        weightKg: 0,
        reps: 10,
        isResting: false,
        totalDurationSeconds: workoutDuration,
        totalVolumeKg: 0,
      });
    }
    setActiveExercises((prev) => [...prev, newActive]);
    setCurrentExerciseIndex(activeExercises.length);
    setShowSearchModal(false);
  };

  const lastPerformance = useMemo(() => {
    if (!currentActive) return null;
    const exId = currentActive.exercise.id;
    for (const w of workoutsHistory) {
      const match = w.entries?.find((e) => e.id === exId);
      if (match && match.sets && match.sets.length > 0) {
        const doneSets = match.sets.filter((s) => s.done);
        if (doneSets.length > 0) {
          const d = new Date(w.date);
          const dateStr = d.toLocaleDateString(t.common.dateLocale, {
            month: "short",
            day: "numeric",
          });
          return {
            dateStr,
            summary: doneSets
              .map(
                (s) =>
                  `${formatWeight(Number(s.weight) || 0, profile.unit, 1)}${weightUnitLabel(profile.unit)} × ${s.reps}`,
              )
              .join(", "),
          };
        }
      }
    }
    return null;
  }, [currentActive, workoutsHistory, locale, profile.unit]);

  const handleCancelWorkout = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      t.workout.discardWorkoutTitle,
      t.workout.discardWorkoutMsg,
      [
        {
          text: t.workout.keepTraining,
          style: "cancel",
        },
        {
          text: t.workout.discardWorkoutAction,
          style: "destructive",
          onPress: () => {
            void liveActivity.endActivity();
            setIsWorkoutActive(false);
            setStartedAt(null);
            setRestEndAt(null);
            setIsRestTimerRunning(false);
          },
        },
      ],
    );
  };

  const plateBreakdown = useMemo(() => {
    const total = parseWorkoutNumber(plateTargetWeight) ?? 0;
    const canLoadBar = total >= barWeight;
    const perSide = canLoadBar ? (total - barWeight) / 2 : 0;
    const available =
      profile.unit === "Imperial"
        ? [45, 35, 25, 10, 5, 2.5]
        : [25, 20, 15, 10, 5, 2.5, 1.25];
    const plates: { plate: number; count: number }[] = [];
    let rem = perSide;
    for (const p of available) {
      if (rem >= p) {
        const c = Math.floor(rem / p);
        plates.push({ plate: p, count: c });
        rem = Math.round((rem - c * p) * 100) / 100;
      }
    }
    return { perSide, plates, rem, canLoadBar };
  }, [plateTargetWeight, barWeight, profile.unit]);

  const handleAddSet = (isDrop = false) => {
    if (!currentActive || currentActive.sets.length >= 20) return;
    setActiveExercises((prev) =>
      prev.map((act, idx) =>
        idx !== currentExerciseIndex
          ? act
          : {
              ...act,
              sets: [
                ...act.sets,
                {
                  ...act.sets[act.sets.length - 1],
                  setNumber: act.sets.length + 1,
                  setType: isDrop ? "dropset" : "normal",
                  isDropSet: isDrop,
                  done: false,
                },
              ],
            },
      ),
    );
  };

  const cycleSetType = (setIdx: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveExercises((prev) =>
      prev.map((act, idx) => {
        if (idx !== currentExerciseIndex) return act;
        const targetSet = act.sets[setIdx];
        if (!targetSet) return act;
        const current =
          targetSet.setType || (targetSet.isDropSet ? "dropset" : "normal");
        let next: SetType = "normal";
        if (current === "normal") next = "warmup";
        else if (current === "warmup") next = "dropset";
        else if (current === "dropset") next = "failure";
        else if (current === "failure") next = "normal";

        return {
          ...act,
          sets: act.sets.map((s, sI) =>
            sI === setIdx
              ? {
                  ...s,
                  setType: next,
                  isDropSet: next === "dropset",
                  rir: next === "failure" ? 0 : s.rir,
                }
              : s,
          ),
        };
      }),
    );
  };
  const handleRemoveSet = () => {
    if (!currentActive || currentActive.sets.length <= 1) return;
    setActiveExercises((prev) =>
      prev.map((act, idx) =>
        idx !== currentExerciseIndex
          ? act
          : { ...act, sets: act.sets.slice(0, -1) },
      ),
    );
  };
  const updateSetField = (
    setIdx: number,
    field: "weight" | "reps" | "rir",
    value: string | number | undefined,
  ) => {
    setActiveExercises((prev) =>
      prev.map((act, idx) =>
        idx !== currentExerciseIndex
          ? act
          : {
              ...act,
              sets: act.sets.map((set, idx) =>
                idx !== setIdx
                  ? set
                  : {
                      ...set,
                      [field]:
                        field === "rir"
                          ? value === undefined || value === ""
                            ? undefined
                            : Number(value)
                          : String(value ?? ""),
                    },
              ),
            },
      ),
    );
  };

  const toggleSetDone = (setIdx: number) => {
    const currentSet = currentActive?.sets[setIdx];
    if (!currentSet) return;
    if (!currentSet.done) {
      const weight = parseWorkoutNumber(currentSet.weight);
      const reps = parseWorkoutNumber(currentSet.reps);
      if (
        weight === null ||
        weight < 0 ||
        displayWeightToKg(weight, profile.unit) > 1000 ||
        reps === null ||
        !Number.isInteger(reps) ||
        reps < 1 ||
        reps > 36 ||
        (currentSet.rir !== undefined &&
          (!Number.isInteger(currentSet.rir) ||
            currentSet.rir < 0 ||
            currentSet.rir > 10))
      ) {
        Alert.alert(
          t.workout.invalidSetValuesTitle,
          t.workout.invalidSetValuesMsg,
        );
        return;
      }
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const target = { ...currentSet, done: !currentSet.done };
    setActiveExercises((prev) =>
      prev.map((act, idx) =>
        idx !== currentExerciseIndex
          ? act
          : {
              ...act,
              sets: act.sets.map((set, idx) =>
                idx !== setIdx ? set : { ...set, done: !set.done },
              ),
            },
      ),
    );

    if (target.done) {
      const nextDrop = currentActive?.sets[setIdx + 1]?.isDropSet;
      const nextSuperset = currentActive?.supersetId
        ? activeExercises.findIndex(
            (act, idx) =>
              idx !== currentExerciseIndex &&
              act.supersetId === currentActive.supersetId &&
              !act.sets[setIdx]?.done &&
              !!act.sets[setIdx],
          )
        : -1;
      if (nextDrop || nextSuperset >= 0) {
        setIsRestTimerRunning(false);
        setRestEndAt(null);
        const nextAct =
          nextSuperset >= 0 ? activeExercises[nextSuperset] : currentActive!;
        if (nextSuperset >= 0) setCurrentExerciseIndex(nextSuperset);
        syncLiveActivitySet(
          nextAct,
          nextSuperset >= 0 ? setIdx : setIdx + 1,
          false,
        );
        return;
      }
      if (autoRestPref) {
        setRestSeconds(120);
        setIsRestTimerRunning(true);
        if (currentActive) {
          const exName = getExerciseDisplayName(currentActive.exercise, locale);
          const addedVol =
            displayWeightToKg(
              parseWorkoutNumber(target.weight) ?? 0,
              profile.unit,
            ) * (parseWorkoutNumber(target.reps) ?? 0);
          void liveActivity.startRestTimer(120, {
            exerciseName: exName,
            currentSet: setIdx + 1,
            totalSets: currentActive.sets.length,
            weightKg: displayWeightToKg(
              parseWorkoutNumber(target.weight) ?? 0,
              profile.unit,
            ),
            reps: parseInt(target.reps, 10) || 0,
            totalDurationSeconds: workoutDuration,
            totalVolumeKg: currentTotalVolume + addedVol,
          });
        }
      }
    } else {
      setIsRestTimerRunning(false);
      setRestEndAt(null);
      if (currentActive) {
        syncLiveActivitySet(currentActive, setIdx, false);
      }
    }
  };

  const handleFinishWorkout = () => {
    if (finishLock.current || !isWorkoutActive) return;
    const hasInvalidCompletedSet = activeExercises.some((act) =>
      act.sets.some((set) => {
        if (!set.done) return false;
        const weight = parseWorkoutNumber(set.weight);
        const reps = parseWorkoutNumber(set.reps);
        return (
          weight === null ||
          displayWeightToKg(weight, profile.unit) < 0 ||
          displayWeightToKg(weight, profile.unit) > 1000 ||
          reps === null ||
          !Number.isInteger(reps) ||
          reps < 1 ||
          reps > 36 ||
          (set.rir !== undefined &&
            (!Number.isInteger(set.rir) || set.rir < 0 || set.rir > 10))
        );
      }),
    );
    if (hasInvalidCompletedSet) {
      Alert.alert(
        t.workout.invalidSetValuesTitle,
        t.workout.invalidSetValuesMsg,
      );
      return;
    }

    let totalVol = 0;
    let completedSets = 0;
    let warmupSetsCount = 0;
    let dropSetsCount = 0;
    let failureSetsCount = 0;
    const trainedMusclesSet = new Set<MuscleSlug>();
    const primSet = new Set<string>();
    const secSet = new Set<string>();
    const bestPrs: {
      name: string;
      weight: number;
      reps: number;
      est1RM: number;
    }[] = [];
    const hypertrophyHighlights: string[] = [];

    const entriesData: {
      id: string;
      sets: {
        weight?: number | string;
        reps?: number | string;
        targetReps?: number;
        rir?: number;
        isDropSet?: boolean;
        setType?: "normal" | "warmup" | "dropset" | "failure";
        done: boolean;
      }[];
      supersetId?: string;
      progression?: ProgressionPolicy;
    }[] = [];

    activeExercises.forEach((act) => {
      const setsDone = act.sets.filter((s) => s.done);
      let bestEx1RM = 0;
      let bestWeight = 0;
      let bestReps = 0;

      if (setsDone.length > 0) {
        (act.exercise.primary_muscles || []).forEach((m) => primSet.add(m));
        (act.exercise.secondary_muscles || []).forEach((m) => secSet.add(m));
      }

      setsDone.forEach((s) => {
        const inputWeight = parseWorkoutNumber(s.weight);
        const w = displayWeightToKg(inputWeight ?? 0, profile.unit);
        const r = parseWorkoutNumber(s.reps) ?? 0;
        const isWarmup = s.setType === "warmup";
        const isDrop = s.setType === "dropset" || s.isDropSet;
        const isFail = s.setType === "failure";

        if (isWarmup) {
          warmupSetsCount += 1;
        } else {
          totalVol += w * r;
        }

        if (isDrop) dropSetsCount += 1;
        if (isFail) failureSetsCount += 1;

        completedSets += 1;

        if (!isWarmup) {
          const est = calculate1RM(w, r);
          if (est > bestEx1RM) {
            bestEx1RM = est;
            bestWeight = w;
            bestReps = r;
          }
        }
      });

      const baseline = /bench_press/.test(act.exercise.id)
        ? (profile.benchPressPR ?? 0)
        : /squat/.test(act.exercise.id)
          ? profile.prSquat
          : /deadlift/.test(act.exercise.id)
            ? (profile.deadliftPR ?? 0)
            : 0;
      const previousBest = Math.max(
        baseline,
        ...workoutsHistory.flatMap((w) =>
          w.entries
            .filter((e) => e.id === act.exercise.id)
            .flatMap((e) =>
              e.sets
                .filter((s) => s.done)
                .map((s) => calculate1RM(Number(s.weight), Number(s.reps))),
            ),
        ),
      );
      if (bestEx1RM > previousBest) {
        bestPrs.push({
          name: getExerciseDisplayName(act.exercise, locale),
          weight: bestWeight,
          reps: bestReps,
          est1RM: bestEx1RM,
        });
      }

      entriesData.push({
        id: act.exercise.id,
        supersetId: act.supersetId,
        progression: act.progression,
        sets: act.sets.map((s) => ({
          weight: displayWeightToKg(
            parseWorkoutNumber(s.weight) ?? 0,
            profile.unit,
          ),
          reps: s.reps,
          targetReps: s.targetReps,
          isDropSet: s.isDropSet,
          setType: s.setType,
          rir: s.rir,
          done: s.done,
        })),
      });

      if (setsDone.length > 0) {
        const m = musclesOf({
          primary: act.exercise.primary_muscles,
          secondary: act.exercise.secondary_muscles,
        });
        Object.keys(m).forEach((slug) =>
          trainedMusclesSet.add(slug as MuscleSlug),
        );
      }
    });

    if (completedSets === 0) {
      Alert.alert(
        t.workout.noCompletedSetsTitle,
        t.workout.noCompletedSetsMsg,
      );
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const musclesListTrained = Array.from(trainedMusclesSet);
    musclesListTrained.forEach((slug) => {
      hypertrophyHighlights.push(t.muscles[slug] || slug);
    });

    finishLock.current = true;
    let summary: WorkoutResult;
    try {
      summary = finishWorkout({
        sessionId,
        volume: Math.round(totalVol),
        exercises: activeExercises.filter((act) => act.sets.some((s) => s.done))
          .length,
        sets: completedSets,
        muscles: musclesListTrained,
        duration: formatTimer(workoutDuration),
        routineName: activeRoutineName,
        entries: entriesData,
      });
    } catch (error) {
      finishLock.current = false;
      Alert.alert(
        t.workout.saveWorkoutFailedTitle,
        error instanceof Error ? error.message : t.common.pleaseRetry,
      );
      return;
    }

    setDetailedSummary({
      ...summary,
      musclesTrained: musclesListTrained,
      primaryMuscleNames: Array.from(primSet),
      secondaryMuscleNames: Array.from(secSet),
      setsDone: completedSets,
      warmupSetsCount,
      dropSetsCount,
      failureSetsCount,
      bestPrs: bestPrs.slice(0, 3),
      hypertrophyHighlights: hypertrophyHighlights.slice(0, 4),
    });

    void liveActivity.endActivity();
    setIsWorkoutActive(false);
    setIsRestTimerRunning(false);
    setRestEndAt(null);
    void removeStored(draftStorageKey).catch(() => undefined);
  };

  const categories = useMemo(() => {
    return ["All", "Gym", "Home", "Calisthenics"];
  }, []);

  const getLocalizedMuscleName = (slug: string) => {
    return t.muscles[slug] || slug;
  };

  const filteredSearchList = useMemo(() => {
    return EXERCISES_DATA.filter((ex) => {
      const matchCat =
        selectedCategory === "All" ||
        ex.category.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchCat) return false;

      const matchMuscle =
        selectedMuscle === "All" ||
        ex.primary_muscles.some(
          (m) => m.toLowerCase() === selectedMuscle.toLowerCase(),
        ) ||
        (selectedMuscle === "Arms" &&
          (ex.primary_muscles.includes("biceps") ||
            ex.primary_muscles.includes("triceps") ||
            ex.primary_muscles.includes("forearms"))) ||
        (selectedMuscle === "Legs" &&
          (ex.primary_muscles.includes("quads") ||
            ex.primary_muscles.includes("calves") ||
            ex.primary_muscles.includes("glutes")));
      if (!matchMuscle) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        ex.name.toLowerCase().includes(q) ||
        (ex.name_vi && ex.name_vi.toLowerCase().includes(q)) ||
        ex.primary_muscles.some((m) => m.toLowerCase().includes(q)) ||
        ex.equipment.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory, selectedMuscle]);

  if (!draftReady)
    return (
      <View
        style={[
          styles.screen,
          {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#080C14",
          },
        ]}
      >
        <ActivityIndicator color="#38BDF8" />
      </View>
    );

  // RENDER 1: START CHOOSER
  if (!isWorkoutActive) {
    return (
      <View style={[styles.screen, { backgroundColor: "#080C14" }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 12, paddingBottom: 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* NAV HEADER */}
          <View style={styles.hdr}>
            <Text style={styles.hdrTitle}>{t.workout.startChooserTitle}</Text>
          </View>

          {/* 1. TODAY'S PLAN CARD */}
          {todayRoutine && (
            <View
              style={[styles.card, { borderColor: "#38BDF8", borderWidth: 1 }]}
            >
              <Text style={styles.todayPlanKicker}>
                {t.workout.todaysRoutine}
              </Text>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.todayBigTitle}>{todayRoutine.name}</Text>
                  <Text style={styles.dimSub}>
                    {todayRoutine.exercises.length}{" "}
                    {t.workout.exercisesUnit}
                  </Text>
                </View>
                <View style={styles.todayIconBox}>
                  <Feather
                    name={(todayRoutine.emoji as any) || "zap"}
                    size={20}
                    color="#38BDF8"
                  />
                </View>
              </View>

              <Pressable
                onPress={() => handleStartRoutine(todayRoutine)}
                style={styles.btnPrimaryStart}
              >
                <Feather name="play" size={15} color="#080C14" />
                <Text style={styles.btnPrimaryStartText}>
                  {t.workout.startSession}
                </Text>
              </Pressable>
            </View>
          )}

          {/* 2. OTHER ROUTINES */}
          {others.length > 0 && (
            <View style={styles.sect}>
              <Text style={styles.sectTitle}>{t.workout.otherRoutines}</Text>
              <View style={styles.insetList}>
                {others.map((r, index) => {
                  const isLast = index === others.length - 1;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => handleStartRoutine(r)}
                      style={({ pressed }) => [
                        styles.lrow,
                        pressed && styles.lrowPressed,
                        !isLast && styles.lrowDivider,
                      ]}
                    >
                      <View style={styles.lrowIconRail}>
                        <Feather
                          name={(r.emoji as any) || "activity"}
                          size={16}
                          color="#38BDF8"
                        />
                      </View>
                      <View style={styles.lrowGrow}>
                        <Text style={styles.lrowTitle}>{r.name}</Text>
                        <Text style={styles.lrowSub}>
                          {r.exercises.length} {t.common.exercises}
                        </Text>
                      </View>
                      <View style={styles.tagAcc}>
                        <Text style={styles.tagAccText}>{t.common.start}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* 3. FREESTYLE WORKOUT BUTTON */}
          <View style={{ marginTop: 12 }}>
            <Pressable
              onPress={() => handleStartRoutine(null)}
              style={styles.btnFreestyle}
            >
              <Feather name="shuffle" size={16} color="#38BDF8" />
              <Text style={styles.btnFreestyleText}>
                {t.workout.freestyleTitle}
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* MODAL: SUMMARY REPORT */}
        {detailedSummary && (
          <Modal
            visible
            animationType="fade"
            transparent
            onRequestClose={() => setDetailedSummary(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.summaryCard, { maxHeight: "90%" }]}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ alignItems: "center" }}
                >
                  <View style={styles.summaryIconWrap}>
                    <Feather name="award" size={30} color="#22C55E" />
                  </View>
                  <Text style={styles.summaryTitle}>
                    {t.workout.summaryTitle}
                  </Text>

                  {/* 4 Core KPIs */}
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryTile}>
                      <Text style={styles.summaryTileLabel}>
                        {t.workout.durationLabel.toUpperCase()}
                      </Text>
                      <Text style={styles.summaryTileVal}>
                        {detailedSummary.duration}
                      </Text>
                    </View>
                    <View style={styles.summaryTile}>
                      <Text style={styles.summaryTileLabel}>VOLUME</Text>
                      <Text style={styles.summaryTileVal}>
                        {formatWeight(detailedSummary.volume, profile.unit, 0)}{" "}
                        {weightUnitLabel(profile.unit)}
                      </Text>
                    </View>
                    <View style={styles.summaryTile}>
                      <Text style={styles.summaryTileLabel}>
                        {t.workout.setsLabel.toUpperCase()}
                      </Text>
                      <Text style={styles.summaryTileVal}>
                        {detailedSummary.setsDone}
                      </Text>
                    </View>
                    <View style={styles.summaryTile}>
                      <Text style={styles.summaryTileLabel}>XP</Text>
                      <Text
                        style={[styles.summaryTileVal, { color: "#38BDF8" }]}
                      >
                        +{detailedSummary.xp}
                      </Text>
                    </View>
                  </View>

                  {/* Set Breakdown Pills */}
                  {(detailedSummary.warmupSetsCount > 0 ||
                    detailedSummary.dropSetsCount > 0 ||
                    detailedSummary.failureSetsCount > 0) && (
                    <View style={styles.summarySetPillRow}>
                      {detailedSummary.warmupSetsCount > 0 && (
                        <View
                          style={[
                            styles.summarySetPill,
                            {
                              borderColor: "rgba(245, 158, 11, 0.4)",
                              backgroundColor: "rgba(245, 158, 11, 0.1)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.summarySetPillText,
                              { color: "#F59E0B" },
                            ]}
                          >
                            {detailedSummary.warmupSetsCount}{" "}
                            {t.workout.warmup}
                          </Text>
                        </View>
                      )}
                      {detailedSummary.dropSetsCount > 0 && (
                        <View
                          style={[
                            styles.summarySetPill,
                            {
                              borderColor: "rgba(168, 85, 247, 0.4)",
                              backgroundColor: "rgba(168, 85, 247, 0.1)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.summarySetPillText,
                              { color: "#C084FC" },
                            ]}
                          >
                            {detailedSummary.dropSetsCount}{" "}
                            {t.workout.dropSet}
                          </Text>
                        </View>
                      )}
                      {detailedSummary.failureSetsCount > 0 && (
                        <View
                          style={[
                            styles.summarySetPill,
                            {
                              borderColor: "rgba(239, 68, 68, 0.4)",
                              backgroundColor: "rgba(239, 68, 68, 0.1)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.summarySetPillText,
                              { color: "#F87171" },
                            ]}
                          >
                            {detailedSummary.failureSetsCount}{" "}
                            {t.workout.failure}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Hypertrophy Stimulus & Mannequin */}
                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionTitle}>
                      {t.workout.musclesHit}
                    </Text>
                    <View style={{ alignItems: "center", marginVertical: 6 }}>
                      <ExerciseMannequinHighlight
                        primaryMuscles={detailedSummary.primaryMuscleNames}
                        secondaryMuscles={detailedSummary.secondaryMuscleNames}
                        primaryColor="#22C55E"
                        secondaryColor="#38BDF8"
                        height={190}
                      />
                    </View>
                  </View>

                  {/* PRs */}
                  {detailedSummary.bestPrs.length > 0 && (
                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>
                        {t.workout.newRecords}
                      </Text>
                      {detailedSummary.bestPrs.map((pr, i) => (
                        <View key={i} style={styles.prRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.prName} numberOfLines={1}>
                              {pr.name}
                            </Text>
                            <Text style={styles.prSub}>
                              {formatWeight(pr.weight, profile.unit, 1)}
                              {weightUnitLabel(profile.unit)} × {pr.reps}{" "}
                              {t.common.reps}
                            </Text>
                          </View>
                          <Text style={styles.prVal}>
                            {formatWeight(pr.est1RM, profile.unit, 1)}{" "}
                            {weightUnitLabel(profile.unit)} 1RM
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={{ width: "100%", gap: 8, marginTop: 12 }}>
                    <Pressable
                      onPress={() => {
                        setDetailedSummary(null);
                        router.push("/(tabs)/stats");
                      }}
                      style={[
                        styles.btnPrimaryStart,
                        {
                          backgroundColor: "#162032",
                          borderWidth: 1,
                          borderColor: "#38BDF8",
                        },
                      ]}
                    >
                      <Feather name="bar-chart-2" size={15} color="#38BDF8" />
                      <Text
                        style={[
                          styles.btnPrimaryStartText,
                          { color: "#38BDF8" },
                        ]}
                      >
                        {t.workout.viewAnalytics}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setDetailedSummary(null)}
                      style={styles.btnPrimaryStart}
                    >
                      <Text style={styles.btnPrimaryStartText}>
                        {t.common.done}
                      </Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
        {/* PAYWALL MODAL */}
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          onSubscribe={() => setShowPaywall(false)}
          onSuccess={() => setShowPaywall(false)}
        />
      </View>
    );
  }

  // RENDER 2: LIVE WORKOUT VIEW
  return (
    <View style={[styles.screen, { backgroundColor: "#080C14" }]}>
      {draftError ? (
        <Pressable
          style={{ padding: 12, minHeight: 48 }}
          onPress={() => setDraftRetry((n) => n + 1)}
        >
          <Text style={{ color: "#F59E0B" }}>
            {t.workout.draftSaveFailedRetry}
          </Text>
        </Pressable>
      ) : null}
      {/* COMPACT HEADER */}
      <View style={[styles.liveHdr, { paddingTop: insets.top + 8 }]}>
        <View style={styles.timerBadge}>
          <Feather name="clock" size={13} color="#38BDF8" />
          <Text style={styles.timerText}>{formatTimer(workoutDuration)}</Text>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 10 }}>
          <Text style={styles.activeRoutineTitle} numberOfLines={1}>
            {activeRoutineName}
          </Text>
          <Text style={styles.activeRoutineSub}>
            {activeExercises.length > 0
              ? `${currentExerciseIndex + 1}/${activeExercises.length}`
              : "0"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pressable
            onPress={handleCancelWorkout}
            style={styles.cancelSessionBtn}
          >
            <Feather name="x" size={14} color="#94A3B8" />
          </Pressable>
          <Pressable onPress={handleFinishWorkout} style={styles.finishBtn}>
            <Text style={styles.finishBtnText}>{t.common.finish}</Text>
            <Feather name="check" size={13} color="#080C14" />
          </Pressable>
        </View>
      </View>

      <KeyboardAwareScrollViewCompat
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeExercises.length === 0 ? (
          <View style={styles.emptySessionWrap}>
            <Feather name="activity" size={36} color="#38BDF8" />
            <Text style={styles.emptySessionTitle}>
              {t.workout.freestyleTitle}
            </Text>
            <Pressable
              onPress={() => setShowSearchModal(true)}
              style={styles.btnAddExPrompt}
            >
              <Feather name="plus" size={16} color="#080C14" />
              <Text style={styles.btnAddExPromptText}>
                {t.workout.addExercise}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Horizontal Exercise Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.exCarousel}
            >
              {activeExercises.map((act, idx) => {
                const isSelected = idx === currentExerciseIndex;
                const doneSets = act.sets.filter((s) => s.done).length;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );
                      setCurrentExerciseIndex(idx);
                      setActiveMediaTab("gif");
                      const unfinishedIdx = act.sets.findIndex((s) => !s.done);
                      syncLiveActivitySet(
                        act,
                        unfinishedIdx >= 0 ? unfinishedIdx : 0,
                        isRestTimerRunning,
                        isRestTimerRunning ? restSeconds : 0,
                      );
                    }}
                    style={[
                      styles.carouselCard,
                      isSelected && styles.carouselCardActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.carouselName,
                        isSelected && { color: "#38BDF8" },
                      ]}
                      numberOfLines={1}
                    >
                      {getExerciseDisplayName(act.exercise, locale)}
                    </Text>
                    <Text style={styles.carouselSub}>
                      {doneSets}/{act.sets.length}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setShowSearchModal(true)}
                style={styles.carouselAddBtn}
              >
                <Feather name="plus" size={16} color="#38BDF8" />
              </Pressable>
            </ScrollView>

            {/* Current Active Exercise Card */}
            {currentActive && (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeExName}>
                      {getExerciseDisplayName(currentActive.exercise, locale)}
                    </Text>
                    <Text style={styles.dimSub}>
                      {getExerciseSecondaryName(currentActive.exercise, locale)}
                      {currentActive.exercise.primary_muscles
                        .map((m) => getLocalizedMuscleName(m))
                        .join(", ")}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Pressable
                      onPress={() => {
                        const firstSetW = currentActive.sets[0]?.weight;
                        if (firstSetW && !isNaN(parseFloat(firstSetW))) {
                          setPlateTargetWeight(firstSetW);
                        }
                        setPlateModalOpen(true);
                      }}
                      style={styles.infoBtn}
                      hitSlop={8}
                    >
                      <Feather name="disc" size={15} color="#38BDF8" />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setSelectedExerciseDetail(currentActive.exercise)
                      }
                      style={styles.infoBtn}
                      hitSlop={8}
                    >
                      <Feather name="info" size={15} color="#38BDF8" />
                    </Pressable>
                  </View>
                </View>

                {/* Last Performance ghost info */}
                {lastPerformance && (
                  <View style={styles.lastTimeBadge}>
                    <Feather name="clock" size={11} color="#38BDF8" />
                    <Text style={styles.lastTimeText}>
                      {t.workout.lastTime} (
                      {lastPerformance.dateStr}): {lastPerformance.summary}
                    </Text>
                  </View>
                )}

                {/* Media Segmented Tabs */}
                <View style={styles.mediaTabTrack}>
                  {(currentActive.exercise.gif_file ||
                    currentActive.exercise.motion_gif_url) && (
                    <Pressable
                      onPress={() => setActiveMediaTab("gif")}
                      style={[
                        styles.mediaTabBtn,
                        activeMediaTab === "gif" && styles.mediaTabBtnActive,
                      ]}
                    >
                      <Feather
                        name="play-circle"
                        size={12}
                        color={activeMediaTab === "gif" ? "#FFF" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.mediaTabText,
                          activeMediaTab === "gif" && styles.mediaTabTextActive,
                        ]}
                      >
                        {t.workout.motion}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => setActiveMediaTab("mannequin")}
                    style={[
                      styles.mediaTabBtn,
                      activeMediaTab === "mannequin" &&
                        styles.mediaTabBtnActive,
                    ]}
                  >
                    <Feather
                      name="user"
                      size={12}
                      color={
                        activeMediaTab === "mannequin" ? "#FFF" : "#64748B"
                      }
                    />
                    <Text
                      style={[
                        styles.mediaTabText,
                        activeMediaTab === "mannequin" &&
                          styles.mediaTabTextActive,
                      ]}
                    >
                      {t.workout.muscles}
                    </Text>
                  </Pressable>
                </View>

                {/* Media Stage */}
                <View
                  style={[
                    styles.mediaStage,
                    activeMediaTab === "gif" && styles.mediaStageGif,
                  ]}
                >
                  {activeMediaTab === "gif" &&
                  (currentActive.exercise.gif_file ||
                    currentActive.exercise.motion_gif_url) ? (
                    <ExerciseMedia
                      uri={
                        getExerciseGifSource(
                          currentActive.exercise.gif_file,
                          currentActive.exercise.motion_gif_url,
                        )?.uri
                      }
                      primaryMuscles={currentActive.exercise.primary_muscles}
                      secondaryMuscles={
                        currentActive.exercise.secondary_muscles
                      }
                    />
                  ) : (
                    <View style={{ alignItems: "center", paddingVertical: 4 }}>
                      <ExerciseMannequinHighlight
                        primaryMuscles={currentActive.exercise.primary_muscles}
                        secondaryMuscles={
                          currentActive.exercise.secondary_muscles
                        }
                        height={180}
                      />
                    </View>
                  )}
                </View>

                {/* Sets Logging Table */}
                <View style={styles.tableHead}>
                  <Text style={[styles.th, { width: 32 }]}>SET</Text>
                  <Text style={[styles.th, { flex: 1 }]}>
                    {weightUnitLabel(profile.unit).toUpperCase()}
                  </Text>
                  <Text style={[styles.th, { flex: 1 }]}>REPS</Text>
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowMetricsModal(true);
                    }}
                    hitSlop={6}
                    style={{
                      width: 44,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Text style={styles.th}>RIR</Text>
                    <Feather name="help-circle" size={10} color="#64748B" />
                  </Pressable>
                  <Text style={[styles.th, { width: 48, textAlign: "center" }]}>
                    ✓
                  </Text>
                </View>

                {currentActive.sets.map((set, sIdx) => {
                  const setType =
                    set.setType || (set.isDropSet ? "dropset" : "normal");
                  let badgeText = String(set.setNumber);
                  let badgeBg = "#1E293B";
                  let badgeBorder = "#2A364F";
                  let badgeColor = set.done ? "#22C55E" : "#94A3B8";

                  if (setType === "warmup") {
                    badgeText = "W";
                    badgeBg = "rgba(245, 158, 11, 0.18)";
                    badgeBorder = "#F59E0B";
                    badgeColor = "#F59E0B";
                  } else if (setType === "dropset") {
                    badgeText = "D";
                    badgeBg = "rgba(168, 85, 247, 0.18)";
                    badgeBorder = "#A855F7";
                    badgeColor = "#C084FC";
                  } else if (setType === "failure") {
                    badgeText = "F";
                    badgeBg = "rgba(239, 68, 68, 0.18)";
                    badgeBorder = "#EF4444";
                    badgeColor = "#F87171";
                  }

                  return (
                    <View
                      key={sIdx}
                      style={[styles.setRow, set.done && styles.setRowDone]}
                    >
                      <Pressable
                        onPress={() => cycleSetType(sIdx)}
                        accessibilityRole="button"
                        accessibilityLabel={
                          t.workout.setTypeA11y
                            .replace("{num}", String(set.setNumber))
                            .replace("{type}", String(setType))
                        }
                        style={[
                          styles.setNumberBadge,
                          {
                            backgroundColor: badgeBg,
                            borderColor: badgeBorder,
                            borderWidth: 1.2,
                          },
                        ]}
                        hitSlop={6}
                      >
                        <Text
                          style={[
                            styles.setNumberText,
                            { color: badgeColor, fontWeight: "900" },
                          ]}
                        >
                          {badgeText}
                        </Text>
                      </Pressable>

                      <TextInput
                        keyboardType="decimal-pad"
                        value={set.weight}
                        onChangeText={(val) =>
                          updateSetField(sIdx, "weight", val)
                        }
                        accessibilityLabel={
                          t.workout.setWeightA11y.replace(
                            "{num}",
                            String(set.setNumber),
                          )
                        }
                        style={[
                          styles.setInput,
                          set.done && styles.setInputDone,
                        ]}
                      />

                      <TextInput
                        keyboardType="numeric"
                        value={set.reps}
                        onChangeText={(val) =>
                          updateSetField(sIdx, "reps", val)
                        }
                        accessibilityLabel={
                          t.workout.setRepsA11y.replace(
                            "{num}",
                            String(set.setNumber),
                          )
                        }
                        style={[
                          styles.setInput,
                          set.done && styles.setInputDone,
                        ]}
                      />

                      <TextInput
                        keyboardType="numeric"
                        value={set.rir === undefined ? "" : String(set.rir)}
                        onChangeText={(val) => {
                          if (val === "")
                            updateSetField(sIdx, "rir", undefined);
                          else if (/^\d{1,2}$/.test(val) && Number(val) <= 10)
                            updateSetField(sIdx, "rir", Number(val));
                        }}
                        accessibilityLabel={
                          t.workout.setRirA11y.replace(
                            "{num}",
                            String(set.setNumber),
                          )
                        }
                        style={[
                          styles.setInput,
                          { flex: 0, flexBasis: 44, width: 44 },
                          set.done && styles.setInputDone,
                        ]}
                      />

                      <Pressable
                        onPress={() => toggleSetDone(sIdx)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: set.done }}
                        accessibilityLabel={
                          t.workout.setCompleteA11y.replace(
                            "{num}",
                            String(set.setNumber),
                          )
                        }
                        style={[
                          styles.checkBtn,
                          set.done && styles.checkBtnDone,
                        ]}
                      >
                        <Feather
                          name="check"
                          size={14}
                          color={set.done ? "#080C14" : "#64748B"}
                        />
                      </Pressable>
                    </View>
                  );
                })}

                {/* Set Actions */}
                <View style={styles.setActionsRow}>
                  <Pressable
                    onPress={() => handleAddSet(false)}
                    accessibilityRole="button"
                    accessibilityLabel={t.workout.addSetA11y}
                    style={styles.btnSmallTinted}
                  >
                    <Feather name="plus" size={12} color="#38BDF8" />
                    <Text style={styles.btnSmallTintedText}>Set</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleAddSet(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t.workout.addDropSetA11y}
                    style={styles.btnSmallTinted}
                  >
                    <Feather name="zap" size={11} color="#F59E0B" />
                    <Text
                      style={[styles.btnSmallTintedText, { color: "#F59E0B" }]}
                    >
                      Drop
                    </Text>
                  </Pressable>
                  {currentActive.sets.length > 1 && (
                    <Pressable
                      onPress={handleRemoveSet}
                      style={styles.btnRemoveSet}
                    >
                      <Feather name="minus" size={12} color="#EF4444" />
                    </Pressable>
                  )}
                </View>

                {/* Set Types Legend */}
                <View style={styles.setTypeLegendRow}>
                  <Text style={styles.setTypeLegendHint}>
                    {t.workout.tapBadgeToCycle}
                  </Text>
                  <View style={styles.setTypeChip}>
                    <Text
                      style={[styles.setTypeChipText, { color: "#94A3B8" }]}
                    >
                      1..N {t.workout.work}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.setTypeChip,
                      {
                        borderColor: "rgba(245, 158, 11, 0.4)",
                        backgroundColor: "rgba(245, 158, 11, 0.08)",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.setTypeChipText, { color: "#F59E0B" }]}
                    >
                      W {t.workout.warmup}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.setTypeChip,
                      {
                        borderColor: "rgba(168, 85, 247, 0.4)",
                        backgroundColor: "rgba(168, 85, 247, 0.08)",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.setTypeChipText, { color: "#C084FC" }]}
                    >
                      D Drop
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.setTypeChip,
                      {
                        borderColor: "rgba(239, 68, 68, 0.4)",
                        backgroundColor: "rgba(239, 68, 68, 0.08)",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.setTypeChipText, { color: "#F87171" }]}
                    >
                      F {t.workout.failure}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </KeyboardAwareScrollViewCompat>

      {/* FLOATING REST TIMER WIDGET */}
      {isRestTimerRunning && (
        <View
          onLayout={(event) =>
            setRestWidgetHeight(event.nativeEvent.layout.height)
          }
          style={[
            styles.restWidget,
            { bottom: dockHeight + 12 },
            windowWidth < 420 && { flexWrap: "wrap", gap: 8 },
          ]}
        >
          <View style={styles.restWidgetLeft}>
            <Feather name="clock" size={14} color="#38BDF8" />
            <Text style={styles.restWidgetTimer}>
              {formatTimer(restSeconds)}
            </Text>
            <Text style={styles.restWidgetSub}>
              {t.common.rest.toUpperCase()}
            </Text>
          </View>
          <View style={styles.restWidgetPresets}>
            {[60, 90, 120, 180].map((sec) => (
              <Pressable
                key={sec}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRestSeconds(sec);
                  if (currentActive) {
                    const exName = getExerciseDisplayName(
                      currentActive.exercise,
                      locale,
                    );
                    void liveActivity.startRestTimer(sec, {
                      exerciseName: exName,
                      currentSet:
                        currentActive.sets.findIndex((s) => !s.done) + 1 || 1,
                      totalSets: currentActive.sets.length,
                      weightKg: displayWeightToKg(
                        parseWorkoutNumber(
                          currentActive.sets[0]?.weight || "0",
                        ) ?? 0,
                        profile.unit,
                      ),
                      reps:
                        parseInt(currentActive.sets[0]?.reps || "0", 10) || 0,
                      totalDurationSeconds: workoutDuration,
                      totalVolumeKg: currentTotalVolume,
                    });
                  }
                }}
                style={[
                  styles.restPresetBtn,
                  restSeconds === sec && styles.restPresetBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.restPresetText,
                    restSeconds === sec && styles.restPresetTextActive,
                  ]}
                >
                  {sec}s
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.restWidgetRight}>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const nextSec = restSeconds + 30;
                setRestSeconds(nextSec);
                if (currentActive) {
                  const exName = getExerciseDisplayName(
                    currentActive.exercise,
                    locale,
                  );
                  void liveActivity.startRestTimer(nextSec, {
                    exerciseName: exName,
                    currentSet:
                      currentActive.sets.findIndex((s) => !s.done) + 1 || 1,
                    totalSets: currentActive.sets.length,
                    weightKg: displayWeightToKg(
                      parseWorkoutNumber(
                        currentActive.sets[0]?.weight || "0",
                      ) ?? 0,
                      profile.unit,
                    ),
                    reps: parseInt(currentActive.sets[0]?.reps || "0", 10) || 0,
                    totalDurationSeconds: workoutDuration,
                    totalVolumeKg: currentTotalVolume,
                  });
                }
              }}
              style={styles.restPlusBtn}
            >
              <Text style={styles.restPlusText}>+30s</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsRestTimerRunning(false);
                setRestEndAt(null);
                if (currentActive) {
                  const nextUnfinishedIdx = currentActive.sets.findIndex(
                    (s) => !s.done,
                  );
                  syncLiveActivitySet(
                    currentActive,
                    nextUnfinishedIdx >= 0
                      ? nextUnfinishedIdx
                      : currentActive.sets.length - 1,
                    false,
                  );
                }
              }}
              style={styles.restSkipBtn}
            >
              <Feather name="skip-forward" size={14} color="#94A3B8" />
            </Pressable>
          </View>
        </View>
      )}

      {/* LIVE WORKOUT FLOATING ACTION DOCK */}
      {activeExercises.length > 0 && (
        <View
          onLayout={(event) => setDockHeight(event.nativeEvent.layout.height)}
          style={[
            styles.liveBottomDock,
            { paddingBottom: Math.max(insets.bottom, 12) + 6 },
          ]}
        >
          <Pressable
            onPress={() => setShowSearchModal(true)}
            style={styles.dockAddBtn}
          >
            <Feather name="plus" size={16} color="#38BDF8" />
            <Text style={styles.dockAddBtnText}>{t.workout.addExercise}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (currentExerciseIndex < activeExercises.length - 1) {
                const next = currentExerciseIndex + 1;
                setCurrentExerciseIndex(next);
                syncLiveActivitySet(
                  activeExercises[next],
                  Math.max(
                    0,
                    activeExercises[next].sets.findIndex((set) => !set.done),
                  ),
                  isRestTimerRunning,
                  restSeconds,
                );
              } else {
                handleFinishWorkout();
              }
            }}
            style={styles.dockNextBtn}
          >
            <Text style={styles.dockNextBtnText}>
              {currentExerciseIndex < activeExercises.length - 1
                ? t.workout.nextExercise
                : t.workout.finishWorkout}
            </Text>
            <Feather
              name={
                currentExerciseIndex < activeExercises.length - 1
                  ? "chevron-right"
                  : "check"
              }
              size={16}
              color="#080C14"
            />
          </Pressable>
        </View>
      )}

      {/* EXERCISE SEARCH MODAL */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowSearchModal(false);
          if (!activeExercises.length) setIsWorkoutActive(false);
        }}
      >
        <View
          style={[
            styles.screen,
            { backgroundColor: "#080C14", paddingTop: insets.top + 8 },
          ]}
        >
          <View style={styles.pickerHdr}>
            <Pressable
              onPress={() => {
                setShowSearchModal(false);
                if (activeExercises.length === 0) {
                  setIsWorkoutActive(false);
                }
              }}
              style={styles.iconBtn}
            >
              <Feather name="x" size={18} color="#FFF" />
            </Pressable>
            <Text style={styles.pickerHeaderTitle}>
              {t.workout.addExercise}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.searchBar}>
            <Feather name="search" size={15} color="#64748B" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t.common.search}
              placeholderTextColor="#64748B"
              style={styles.searchInput}
            />
          </View>

          {/* Category Filter Chips */}
          <View style={styles.catChipsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              bounces={false}
              alwaysBounceVertical={false}
              contentInsetAdjustmentBehavior="never"
              style={styles.catChipsScrollView}
              contentContainerStyle={styles.catChipsRow}
            >
              {categories.map((cat) => {
                const isSel =
                  selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategory(cat);
                    }}
                    style={[styles.catChip, isSel && styles.catChipActive]}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        isSel && styles.catChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Search Result List */}
          <FlatList
            data={filteredSearchList}
            keyExtractor={(item) => item.id}
            initialNumToRender={15}
            maxToRenderPerBatch={15}
            windowSize={5}
            removeClippedSubviews={true}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: Math.max(insets.bottom, 24) + 60,
            }}
            renderItem={({ item: ex }) => {
              const imgSrc = getExerciseImageSource(
                ex.image_file,
                ex.thumbnail_url,
              );
              return (
                <Pressable
                  key={ex.id}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedExerciseDetail(ex as unknown as ExerciseItem);
                  }}
                  style={({ pressed }) => [
                    styles.searchExCard,
                    pressed && styles.searchExCardPressed,
                  ]}
                >
                  <View style={styles.lrowThumbRail}>
                    {imgSrc ? (
                      <ExerciseThumbnail
                        source={imgSrc}
                        style={styles.searchThumbImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <Feather name="crosshair" size={14} color="#38BDF8" />
                    )}
                  </View>
                  <View style={styles.lrowGrow}>
                    <Text style={styles.lrowTitle} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={styles.lrowSub} numberOfLines={1}>
                      {ex.name_vi ? `${ex.name_vi} · ` : ""}
                      {ex.primary_muscles
                        .map((m) => getLocalizedMuscleName(m))
                        .join(", ")}{" "}
                      • {ex.equipment}
                    </Text>
                  </View>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      addExerciseToWorkout(ex as unknown as ExerciseItem);
                    }}
                    hitSlop={12}
                    style={{ padding: 6 }}
                  >
                    <Feather name="plus" size={18} color="#38BDF8" />
                  </Pressable>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptySearchWrap}>
                <Feather name="search" size={36} color="#334155" />
                <Text style={styles.emptySearchTitle}>
                  {t.workout.noExercisesFound}
                </Text>
                <Text style={styles.emptySearchSub}>
                  {t.workout.noResultsMatching.replace(
                    "{query}",
                    searchQuery,
                  )}
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* EXERCISE DETAIL INFO MODAL */}
      {selectedExerciseDetail && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedExerciseDetail(null)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={styles.modalDim}
              onPress={() => setSelectedExerciseDetail(null)}
            />
            <View
              style={[
                styles.bottomSheet,
                { maxHeight: "80%", paddingBottom: insets.bottom + 20 },
              ]}
            >
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>
                {getExerciseDisplayName(selectedExerciseDetail, locale)}
              </Text>
              <Text style={styles.sheetSub}>
                {getExerciseSecondaryName(selectedExerciseDetail, locale)}
                {selectedExerciseDetail.primary_muscles
                  .map((m) => getLocalizedMuscleName(m))
                  .join(", ")}{" "}
                • {selectedExerciseDetail.equipment}
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ marginVertical: 8 }}
              >
                <View style={{ alignItems: "center", marginVertical: 6 }}>
                  <ExerciseMannequinHighlight
                    primaryMuscles={selectedExerciseDetail.primary_muscles}
                    secondaryMuscles={selectedExerciseDetail.secondary_muscles}
                    height={180}
                  />
                </View>

                {selectedExerciseDetail.instructions &&
                  selectedExerciseDetail.instructions.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={[styles.sectTitle, { color: "#38BDF8" }]}>
                        {t.workout.instructions}
                      </Text>
                      {selectedExerciseDetail.instructions.map((inst, i) => (
                        <Text key={i} style={styles.instructionText}>
                          {i + 1}. {inst}
                        </Text>
                      ))}
                    </View>
                  )}
              </ScrollView>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Pressable
                  onPress={() => {
                    if (selectedExerciseDetail) {
                      addExerciseToWorkout(selectedExerciseDetail);
                    }
                  }}
                  style={[styles.btnPrimaryStart, { flex: 1, marginTop: 0 }]}
                >
                  <Feather name="plus" size={15} color="#080C14" />
                  <Text style={styles.btnPrimaryStartText}>
                    {t.workout.addToWorkout}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedExerciseDetail(null)}
                  style={[styles.btnSheetCancel, { width: 84, marginTop: 0 }]}
                >
                  <Text style={styles.btnSheetCancelText}>{t.common.done}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* BARBELL PLATE CALCULATOR MODAL */}
      <Modal
        visible={plateModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPlateModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={styles.modalDim}
              onPress={() => setPlateModalOpen(false)}
            />
            <View
              style={[
                styles.bottomSheet,
                { paddingBottom: insets.bottom + 20 },
              ]}
            >
              <View style={styles.sheetHandle} />
              <View style={styles.rowBetween}>
                <Text style={styles.sheetTitle}>
                  {t.workout.plateCalculator}
                </Text>
                <Pressable onPress={() => setPlateModalOpen(false)}>
                  <Feather name="x" size={18} color="#94A3B8" />
                </Pressable>
              </View>
              <Text style={styles.sheetSub}>
                {t.workout.plateEachSide}
              </Text>

              {/* Input Total Weight */}
              <View style={styles.plateInputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.plateLabel}>
                    {t.workout.targetWeightLabel} ({weightUnitLabel(profile.unit)})
                  </Text>
                  <TextInput
                    value={plateTargetWeight}
                    onChangeText={setPlateTargetWeight}
                    keyboardType="decimal-pad"
                    style={styles.plateTextInput}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View>
                  <Text style={styles.plateLabel}>
                    {t.workout.barbell}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                    {(profile.unit === "Imperial"
                      ? [45, 35, 25]
                      : [20, 15, 10]
                    ).map((bw) => (
                      <Pressable
                        key={bw}
                        onPress={() => setBarWeight(bw)}
                        style={[
                          styles.barWeightBtn,
                          barWeight === bw && styles.barWeightBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.barWeightText,
                            barWeight === bw && styles.barWeightTextActive,
                          ]}
                        >
                          {bw}
                          {weightUnitLabel(profile.unit)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              {/* Summary Per Side */}
              <View style={styles.platePerSideCard}>
                <Text style={styles.platePerSideLabel}>
                  {t.workout.eachSideWeight}
                </Text>
                <Text style={styles.platePerSideVal}>
                  {plateBreakdown.perSide.toFixed(1)}{" "}
                  <Text style={{ fontSize: 13, color: "#94A3B8" }}>
                    {weightUnitLabel(profile.unit)}
                  </Text>
                </Text>
              </View>

              {/* Visual Plates List */}
              <View style={{ marginVertical: 12 }}>
                {!plateBreakdown.canLoadBar ? (
                  <Text
                    style={[
                      styles.dimSub,
                      {
                        color: "#F59E0B",
                        textAlign: "center",
                        marginVertical: 10,
                      },
                    ]}
                  >
                    {t.workout.targetWeightMinError}
                  </Text>
                ) : plateBreakdown.plates.length > 0 ? (
                  <View style={styles.plateBadgesWrap}>
                    {plateBreakdown.plates.map((p, idx) => (
                      <View key={idx} style={styles.plateBadge}>
                        <View
                          style={[
                            styles.plateDiscIcon,
                            { height: Math.min(48, 28 + p.plate * 0.7) },
                          ]}
                        >
                          <Text style={styles.plateDiscText}>{p.plate}</Text>
                        </View>
                        <Text style={styles.plateCountText}>× {p.count}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.dimSub,
                      { textAlign: "center", marginVertical: 10 },
                    ]}
                  >
                    {plateBreakdown.rem > 0
                      ? t.workout.plateNoExactMatchRem
                          .replace("{rem}", String(plateBreakdown.rem))
                          .replace("{unit}", weightUnitLabel(profile.unit))
                      : t.workout.emptyBarOnly}
                  </Text>
                )}
              </View>

              <Pressable
                onPress={() => setPlateModalOpen(false)}
                style={styles.btnPrimaryStart}
              >
                <Text style={styles.btnPrimaryStartText}>{t.common.done}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* TRAINING METRICS & RIR GUIDE */}
      <TrainingMetricsModal
        visible={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
      />

      {/* PAYWALL MODAL */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribe={() => setShowPaywall(false)}
        onSuccess={() => setShowPaywall(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  hdr: { marginBottom: 14 },
  hdrTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.4,
  },
  sect: { marginTop: 12 },
  sectTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#111724",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 14,
    marginBottom: 10,
  },
  todayPlanKicker: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  todayBigTitle: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  todayIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#14233D",
    alignItems: "center",
    justifyContent: "center",
  },
  dimSub: { color: "#94A3B8", fontSize: 12, marginTop: 1 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btnPrimaryStart: {
    backgroundColor: "#38BDF8",
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  btnPrimaryStartText: { color: "#080C14", fontSize: 13, fontWeight: "900" },
  btnSheetCancel: {
    backgroundColor: "#162032",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSheetCancelText: { color: "#94A3B8", fontSize: 13, fontWeight: "800" },
  btnFreestyle: {
    backgroundColor: "#111724",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnFreestyleText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  insetList: {
    backgroundColor: "#111724",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    overflow: "hidden",
  },
  lrow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  lrowPressed: { backgroundColor: "#162032" },
  lrowDivider: { borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  lrowIconRail: { width: 22, alignItems: "center" },
  lrowGrow: { flex: 1 },
  lrowTitle: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  lrowSub: { color: "#94A3B8", fontSize: 12, marginTop: 1 },
  tagAcc: {
    backgroundColor: "#14233D",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagAccText: { color: "#38BDF8", fontSize: 12, fontWeight: "800" },
  liveHdr: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    backgroundColor: "#080C14",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#14233D",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  timerText: { color: "#38BDF8", fontSize: 12, fontWeight: "800" },
  activeRoutineTitle: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  activeRoutineSub: { color: "#94A3B8", fontSize: 10 },
  cancelSessionBtn: {
    width: 48,
    minHeight: 48,
    borderRadius: 6,
    backgroundColor: "#162032",
    alignItems: "center",
    justifyContent: "center",
  },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  finishBtnText: { color: "#080C14", fontSize: 12, fontWeight: "900" },
  emptySessionWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptySessionTitle: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  btnAddExPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#38BDF8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  btnAddExPromptText: { color: "#080C14", fontSize: 13, fontWeight: "900" },
  exCarousel: { gap: 6, paddingVertical: 10 },
  carouselCard: {
    backgroundColor: "#111724",
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 90,
  },
  carouselCardActive: { borderColor: "#38BDF8", backgroundColor: "#14233D" },
  carouselName: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  carouselSub: { color: "#94A3B8", fontSize: 12, marginTop: 1 },
  carouselAddBtn: {
    width: 48,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: "#162032",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  activeExName: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  infoBtn: { padding: 4 },
  mediaTabTrack: {
    flexDirection: "row",
    backgroundColor: "#162032",
    borderRadius: 6,
    padding: 2,
    marginVertical: 8,
  },
  mediaTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
    borderRadius: 4,
  },
  mediaTabBtnActive: { backgroundColor: "#080C14" },
  mediaTabText: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  mediaTabTextActive: { color: "#FFF", fontWeight: "800" },
  mediaStage: {
    backgroundColor: "#0B0F19",
    borderRadius: 14,
    overflow: "hidden",
    marginVertical: 8,
    borderWidth: 1.5,
    borderColor: "#1E293B",
  },
  mediaStageGif: {
    backgroundColor: "#FFFFFF",
    borderColor: "#334155",
  },
  gifWrapper: {
    width: "100%",
    height: 190,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  exerciseMediaImage: { width: "100%", height: "100%" },
  tableHead: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    gap: 6,
  },
  th: { color: "#94A3B8", fontSize: 12, fontWeight: "800" },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  setRowDone: { opacity: 1 },
  setNumberBadge: {
    width: 32,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  setNumberText: { color: "#94A3B8", fontSize: 12, fontWeight: "800" },
  setInput: {
    flex: 1,
    minWidth: 0,
    width: 0,
    minHeight: 48,
    backgroundColor: "#162032",
    color: "#FFF",
    borderRadius: 6,
    paddingVertical: 5,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
  },
  setInputDone: { backgroundColor: "#0E1726" },
  checkBtn: {
    width: 48,
    minHeight: 48,
    borderRadius: 6,
    backgroundColor: "#162032",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBtnDone: { backgroundColor: "#22C55E" },
  setActionsRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  btnSmallTinted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#162032",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnSmallTintedText: { color: "#38BDF8", fontSize: 12, fontWeight: "700" },
  btnRemoveSet: {
    width: 48,
    minHeight: 48,
    borderRadius: 6,
    backgroundColor: "#EF444422",
    alignItems: "center",
    justifyContent: "center",
  },
  lastTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0B1320",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginVertical: 6,
  },
  lastTimeText: { color: "#38BDF8", fontSize: 12, fontWeight: "600" },
  restWidget: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#111724",
    borderWidth: 1,
    borderColor: "#38BDF8",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restWidgetLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  restWidgetTimer: { color: "#38BDF8", fontSize: 16, fontWeight: "900" },
  restWidgetSub: { color: "#94A3B8", fontSize: 12, fontWeight: "800" },
  restWidgetPresets: { flexDirection: "row", gap: 4 },
  restPresetBtn: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "#162032",
  },
  restPresetBtnActive: { backgroundColor: "#38BDF8" },
  restPresetText: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  restPresetTextActive: { color: "#080C14", fontWeight: "900" },
  restWidgetRight: { flexDirection: "row", gap: 6 },
  restPlusBtn: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: "center",
    backgroundColor: "#162032",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  restPlusText: { color: "#38BDF8", fontSize: 12, fontWeight: "700" },
  restSkipBtn: {
    padding: 12,
    minHeight: 48,
    minWidth: 48,
    justifyContent: "center",
  },
  plateInputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 8,
  },
  plateLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },
  plateTextInput: {
    backgroundColor: "#162032",
    color: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "900",
  },
  barWeightBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#162032",
  },
  barWeightBtnActive: { backgroundColor: "#38BDF8" },
  barWeightText: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  barWeightTextActive: { color: "#080C14", fontWeight: "900" },
  platePerSideCard: {
    backgroundColor: "#162032",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  platePerSideLabel: { color: "#CBD5E1", fontSize: 12, fontWeight: "700" },
  platePerSideVal: { color: "#38BDF8", fontSize: 18, fontWeight: "900" },
  plateBadgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 8,
  },
  plateBadge: { alignItems: "center", gap: 4 },
  plateDiscIcon: {
    width: 44,
    borderRadius: 6,
    backgroundColor: "#1E293B",
    borderWidth: 2,
    borderColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
  },
  plateDiscText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  plateCountText: { color: "#38BDF8", fontSize: 12, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  modalDim: { flex: 1 },
  bottomSheet: {
    backgroundColor: "#111724",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
  },
  sheetHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#334155",
    alignSelf: "center",
    marginBottom: 10,
  },
  sheetTitle: { color: "#FFF", fontSize: 17, fontWeight: "800" },
  sheetSub: { color: "#94A3B8", fontSize: 12, marginTop: 2, marginBottom: 8 },
  summaryCard: {
    backgroundColor: "#111724",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    width: "100%",
  },
  summaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#22C55E22",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryTitle: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  summaryGrid: {
    flexDirection: "row",
    gap: 6,
    marginVertical: 12,
    width: "100%",
  },
  summaryTile: {
    flex: 1,
    backgroundColor: "#162032",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  summaryTileLabel: { color: "#94A3B8", fontSize: 8, fontWeight: "800" },
  summaryTileVal: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  reportSection: { width: "100%", marginTop: 8 },
  reportSectionTitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  prRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#162032",
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  prName: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  prSub: { color: "#94A3B8", fontSize: 9 },
  prVal: { color: "#22C55E", fontSize: 12, fontWeight: "900" },
  pickerHdr: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  iconBtn: {
    width: 48,
    minHeight: 48,
    borderRadius: 6,
    backgroundColor: "#162032",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerHeaderTitle: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111724",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    marginHorizontal: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 8,
  },
  searchInput: { flex: 1, color: "#FFF", fontSize: 13 },
  catChipsWrapper: {
    height: 44,
    marginBottom: 8,
  },
  catChipsScrollView: {
    flex: 1,
  },
  catChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    height: 44,
    alignItems: "center",
  },
  catChip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#162032",
    borderWidth: 1,
    borderColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  catChipActive: { backgroundColor: "#38BDF8", borderColor: "#38BDF8" },
  catChipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  catChipTextActive: { color: "#080C14", fontWeight: "900" },
  searchExCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    backgroundColor: "#111724",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 8,
  },
  searchExCardPressed: {
    backgroundColor: "#162032",
    borderColor: "#38BDF8",
  },
  lrowThumbRail: {
    width: 34,
    height: 34,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#162032",
    alignItems: "center",
    justifyContent: "center",
  },
  searchThumbImg: { width: 34, height: 34 },
  instructionText: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 16,
    marginVertical: 2,
  },
  emptySearchWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptySearchTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },
  emptySearchSub: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  liveBottomDock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0D131F",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  dockAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#162032",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  dockAddBtnText: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "700",
  },
  dockNextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#38BDF8",
  },
  dockNextBtnText: {
    color: "#080C14",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  setTypeLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  setTypeLegendHint: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  setTypeChip: {
    borderWidth: 1,
    borderColor: "#223049",
    backgroundColor: "#111724",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  setTypeChipText: {
    fontSize: 10,
    fontWeight: "800",
  },
  summarySetPillRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  summarySetPill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  summarySetPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
});
