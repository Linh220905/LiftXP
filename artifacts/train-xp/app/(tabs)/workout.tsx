import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useAppState, type WorkoutResult, type Routine } from '@/context/AppState';
import { ExerciseMannequinHighlight } from '@/components/ExerciseMannequinHighlight';
import { musclesOf, MUSCLE_NAMES, type MuscleSlug } from '@/lib/muscles';
import { type ProgressionPolicy, calculate1RM, calculateNextPrescription } from '@/lib/progression';
import { getExerciseImageSource, getExerciseGifSource } from '@/lib/exerciseAssets';
import { useI18n } from '@/lib/i18n';
import { liveActivity } from '@/lib/liveActivity';
import { displayWeightToKg, formatWeight, kgToDisplayWeight, weightUnitLabel } from '@/lib/units';

// Import seed dataset
import EXERCISES_DATA from '../../../../data/exercises_supabase_seed.json';

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

interface LoggedSet {
  setNumber: number;
  weight: string;
  reps: string;
  targetReps: number;
  rir?: number;
  isDropSet?: boolean;
  done: boolean;
}

interface ActiveExercise {
  exercise: ExerciseItem;
  progression: ProgressionPolicy;
  unilateral: boolean;
  sets: LoggedSet[];
}

interface DetailedFinishReport extends WorkoutResult {
  musclesTrained: MuscleSlug[];
  primaryMuscleNames: string[];
  secondaryMuscleNames: string[];
  setsDone: number;
  bestPrs: { name: string; weight: number; reps: number; est1RM: number }[];
  hypertrophyHighlights: string[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseWorkoutNumber(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { finishWorkout, profile, routines, weekSchedule, workoutsHistory } = useAppState();
  const { t, locale } = useI18n();

  const exMap = useMemo(() => {
    const map = new Map<string, ExerciseItem>();
    EXERCISES_DATA.forEach((e) => map.set(e.id, e as unknown as ExerciseItem));
    return map;
  }, []);

  // Today's Routine Detection
  const todayIdx = new Date().getDay();
  const todayRoutineId = weekSchedule[todayIdx];
  const todayRoutine = routines.find((r) => r.id === todayRoutineId) || null;
  const others = routines.filter((r) => r.id !== todayRoutineId);

  // Workout Session State
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [activeRoutineName, setActiveRoutineName] = useState<string>('Freestyle Workout');
  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const currentActive = activeExercises[currentExerciseIndex] || null;
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [detailedSummary, setDetailedSummary] = useState<DetailedFinishReport | null>(null);

  // Media Tab
  const [activeMediaTab, setActiveMediaTab] = useState<'gif' | 'mannequin'>('gif');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<ExerciseItem | null>(null);

  // Barbell Plate Calculator Modal
  const [plateModalOpen, setPlateModalOpen] = useState(false);
  const [plateTargetWeight, setPlateTargetWeight] = useState(profile.unit === 'Imperial' ? '135' : '60');
  const [barWeight, setBarWeight] = useState(profile.unit === 'Imperial' ? 45 : 20);

  useEffect(() => {
    setPlateTargetWeight(profile.unit === 'Imperial' ? '135' : '60');
    setBarWeight(profile.unit === 'Imperial' ? 45 : 20);
  }, [profile.unit]);

  // Floating Rest Timer
  const [restSeconds, setRestSeconds] = useState(120);
  const [isRestTimerRunning, setIsRestTimerRunning] = useState(false);

  const draftStorageKey = `@train-xp/workout-draft:${profile.authUserId || 'guest'}`;

  useEffect(() => {
    let cancelled = false;
    setDraftReady(false);
    void AsyncStorage.getItem(draftStorageKey).then((raw) => {
      if (cancelled) return;
      if (raw) {
        try {
          const draft = JSON.parse(raw) as {
            routineName: string;
            exercises: ActiveExercise[];
            currentExerciseIndex: number;
            duration: number;
            savedAt: number;
          };
          if (draft.exercises.length) {
            setActiveRoutineName(draft.routineName);
            setActiveExercises(draft.exercises);
            setCurrentExerciseIndex(Math.min(draft.currentExerciseIndex, draft.exercises.length - 1));
            setWorkoutDuration(draft.duration + Math.max(0, Math.floor((Date.now() - draft.savedAt) / 1000)));
            setDetailedSummary(null);
            setIsWorkoutActive(true);
          }
        } catch {
          void AsyncStorage.removeItem(draftStorageKey);
        }
      }
      setDraftReady(true);
    }).catch(() => setDraftReady(true));
    return () => { cancelled = true; };
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftReady) return;
    if (!isWorkoutActive || activeExercises.length === 0) {
      void AsyncStorage.removeItem(draftStorageKey);
      return;
    }
    void AsyncStorage.setItem(draftStorageKey, JSON.stringify({
      routineName: activeRoutineName,
      exercises: activeExercises,
      currentExerciseIndex,
      duration: workoutDuration,
      savedAt: Date.now(),
    }));
  }, [draftReady, draftStorageKey, isWorkoutActive, activeRoutineName, activeExercises, currentExerciseIndex, workoutDuration]);

  // Search Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('All');

  // Keep screen awake during active workout
  useEffect(() => {
    if (isWorkoutActive && activeExercises.length > 0) {
      void activateKeepAwakeAsync();
      void liveActivity.ensureActiveState();
    } else {
      void deactivateKeepAwake();
    }
    return () => {
      void deactivateKeepAwake();
    };
  }, [isWorkoutActive, activeExercises.length]);

  // Timer: Only ticks when workout is ACTIVE and has AT LEAST 1 EXERCISE
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isWorkoutActive && activeExercises.length > 0 && !detailedSummary) {
      interval = setInterval(() => {
        setWorkoutDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutActive, activeExercises.length, detailedSummary]);

  const currentTotalVolume = useMemo(() => {
    let vol = 0;
    activeExercises.forEach((act) => {
      act.sets.forEach((s) => {
        if (s.done) {
          const w = displayWeightToKg(parseWorkoutNumber(s.weight) ?? 0, profile.unit);
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
      const exName =
        locale === 'vi' ? actEx.exercise.name_vi || actEx.exercise.name : actEx.exercise.name;
      const payload = {
        exerciseName: exName,
        currentSet: setIdx + 1,
        totalSets: actEx.sets.length,
        weightKg: displayWeightToKg(parseWorkoutNumber(targetSet?.weight || '0') ?? 0, profile.unit),
        reps: parseInt(targetSet?.reps || '0', 10) || 0,
        isResting: isRest,
        restSeconds: restSec > 0 ? restSec : undefined,
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
    [activeRoutineName, currentTotalVolume, locale, workoutDuration, profile.unit]
  );

  // Periodic sync Live Activity duration every 10s
  useEffect(() => {
    if (isWorkoutActive && liveActivity.isLive() && workoutDuration > 0 && workoutDuration % 10 === 0) {
      void liveActivity.updateActivity({
        totalDurationSeconds: workoutDuration,
        totalVolumeKg: currentTotalVolume,
      });
    }
  }, [workoutDuration, isWorkoutActive, currentTotalVolume]);

  // Rest Timer Countdown
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isRestTimerRunning && restSeconds > 0) {
      timer = setInterval(() => {
        setRestSeconds((prev) => {
          if (prev <= 1) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsRestTimerRunning(false);
            if (currentActive) {
              const nextUnfinishedIdx = currentActive.sets.findIndex((s) => !s.done);
              syncLiveActivitySet(
                currentActive,
                nextUnfinishedIdx >= 0 ? nextUnfinishedIdx : currentActive.sets.length - 1,
                false
              );
            }
            return 120;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRestTimerRunning, restSeconds, currentActive, syncLiveActivitySet]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartRoutine = (routine: Routine | null) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setWorkoutDuration(0);
    setDetailedSummary(null);
    setActiveMediaTab('gif');

    if (routine && routine.exercises.length > 0) {
      setActiveRoutineName(routine.name);
      const loaded: ActiveExercise[] = (routine.exercises
        .map((re) => {
          const ex = exMap.get(re.id);
          if (!ex) return null;
          const previousEntry = workoutsHistory
            .find((workout) => workout.entries?.some((entry) => entry.id === re.id))
            ?.entries?.find((entry) => entry.id === re.id);
          const previousSets = previousEntry?.sets
            .map((set) => ({
              weightKg: Number(set.weight) || 0,
              reps: Number(set.reps) || 0,
              targetReps: re.reps ?? 10,
              done: set.done,
              rir: set.rir,
            })) ?? [];
          const lastWeight = previousSets[previousSets.length - 1]?.weightKg ?? (re.targetWeight ?? 50);
          const prescription = previousSets.length
            ? calculateNextPrescription(lastWeight, previousSets, {
                policy: routine.progression || 'linear',
                minReps: 8,
                maxReps: 12,
              }, ex.category)
            : { weightKg: re.targetWeight ?? 50, targetReps: re.reps ?? 10, reason: 'Starting prescription.' };
          return {
            exercise: ex,
            progression: routine.progression || 'linear',
            unilateral: false,
            sets: Array.from({ length: re.sets || 3 }).map((_, i) => ({
              setNumber: i + 1,
              weight: String(kgToDisplayWeight(prescription.weightKg, profile.unit)),
              reps: String(prescription.targetReps),
              targetReps: prescription.targetReps,
              rir: re.rir ?? 2,
              done: false,
            })),
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)) as ActiveExercise[];

      setActiveExercises(loaded);
      setCurrentExerciseIndex(0);
      setIsWorkoutActive(true);

      if (loaded.length > 0) {
        const firstEx = loaded[0];
        const firstSet = firstEx.sets[0];
        const exName =
          locale === 'vi' ? firstEx.exercise.name_vi || firstEx.exercise.name : firstEx.exercise.name;
        void liveActivity.startActivity({
          workoutName: routine.name,
          exerciseName: exName,
          currentSet: 1,
          totalSets: firstEx.sets.length,
          weightKg: displayWeightToKg(parseWorkoutNumber(firstSet?.weight || '0') ?? 0, profile.unit),
          reps: parseInt(firstSet?.reps || '0', 10) || 0,
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newActive: ActiveExercise = {
      exercise: ex,
      progression: 'linear',
      unilateral: false,
      sets: [
        { setNumber: 1, weight: String(kgToDisplayWeight(40, profile.unit)), reps: '10', targetReps: 10, rir: 2, done: false },
        { setNumber: 2, weight: String(kgToDisplayWeight(40, profile.unit)), reps: '10', targetReps: 10, rir: 2, done: false },
        { setNumber: 3, weight: String(kgToDisplayWeight(40, profile.unit)), reps: '10', targetReps: 10, rir: 2, done: false },
      ],
    };

    if (activeExercises.length === 0) {
      const exName = locale === 'vi' ? ex.name_vi || ex.name : ex.name;
      void liveActivity.startActivity({
        workoutName: activeRoutineName,
        exerciseName: exName,
        currentSet: 1,
        totalSets: 3,
        weightKg: 40,
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
          const dateStr = d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
            month: 'short',
            day: 'numeric',
          });
          return {
            dateStr,
            summary: doneSets.map((s) => `${formatWeight(Number(s.weight) || 0, profile.unit, 1)}${weightUnitLabel(profile.unit)} × ${s.reps}`).join(', '),
          };
        }
      }
    }
    return null;
  }, [currentActive, workoutsHistory, locale]);

  const handleCancelWorkout = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      locale === 'vi' ? 'Hủy buổi tập?' : 'Discard Workout?',
      locale === 'vi'
        ? 'Bạn có chắc muốn hủy buổi tập? Toàn bộ các hiệp đã ghi trong buổi này sẽ không được lưu.'
        : 'Are you sure you want to discard this workout? Unfinished logs will not be saved.',
      [
        { text: locale === 'vi' ? 'Tiếp tục tập' : 'Keep Training', style: 'cancel' },
        {
          text: locale === 'vi' ? 'Hủy buổi tập' : 'Discard',
          style: 'destructive',
          onPress: () => {
            void liveActivity.endActivity();
            setIsWorkoutActive(false);
            setWorkoutDuration(0);
            setIsRestTimerRunning(false);
          },
        },
      ]
    );
  };

  const plateBreakdown = useMemo(() => {
    const total = parseWorkoutNumber(plateTargetWeight) ?? 0;
    const canLoadBar = total >= barWeight;
    const perSide = canLoadBar ? (total - barWeight) / 2 : 0;
    const available = profile.unit === 'Imperial' ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
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
    if (!currentActive) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...activeExercises];
    const prevSet = currentActive.sets[currentActive.sets.length - 1];
    const newNum = currentActive.sets.length + 1;
    updated[currentExerciseIndex].sets.push({
      setNumber: newNum,
      weight: prevSet ? prevSet.weight : '40',
      reps: prevSet ? prevSet.reps : '10',
      targetReps: prevSet ? prevSet.targetReps : 10,
      rir: 2,
      isDropSet: isDrop,
      done: false,
    });
    setActiveExercises(updated);
  };

  const handleRemoveSet = () => {
    if (!currentActive || currentActive.sets.length <= 1) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...activeExercises];
    updated[currentExerciseIndex].sets.pop();
    setActiveExercises(updated);
  };

  const updateSetField = (setIdx: number, field: 'weight' | 'reps' | 'rir', val: any) => {
    const updated = [...activeExercises];
    const target = updated[currentExerciseIndex].sets[setIdx];
    if (field === 'weight') target.weight = String(val);
    if (field === 'reps') target.reps = String(val);
    if (field === 'rir') target.rir = typeof val === 'number' ? val : parseInt(val, 10) || 0;
    setActiveExercises(updated);
  };

  const toggleSetDone = (setIdx: number) => {
    const currentSet = currentActive?.sets[setIdx];
    if (!currentSet) return;
    if (!currentSet.done) {
      const weight = parseWorkoutNumber(currentSet.weight);
      const reps = parseWorkoutNumber(currentSet.reps);
      if (weight === null || weight < 0 || reps === null || !Number.isInteger(reps) || reps < 1 || reps > 36 ||
          (currentSet.rir !== undefined && (!Number.isInteger(currentSet.rir) || currentSet.rir < 0 || currentSet.rir > 10))) {
        Alert.alert(
          locale === 'vi' ? 'Giá trị hiệp chưa hợp lệ' : 'Invalid set values',
          locale === 'vi'
            ? 'Tạ phải từ 0 trở lên, reps là số nguyên từ 1 đến 36 và RIR từ 0 đến 10.'
            : 'Weight must be 0 or higher, reps must be a whole number from 1 to 36, and RIR must be 0 to 10.',
        );
        return;
      }
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = [...activeExercises];
    const target = updated[currentExerciseIndex].sets[setIdx];
    target.done = !target.done;
    setActiveExercises(updated);

    if (target.done) {
      setRestSeconds(120);
      setIsRestTimerRunning(true);
      if (currentActive) {
        const exName =
          locale === 'vi'
            ? currentActive.exercise.name_vi || currentActive.exercise.name
            : currentActive.exercise.name;
        const addedVol = displayWeightToKg(parseWorkoutNumber(target.weight) ?? 0, profile.unit) * (parseWorkoutNumber(target.reps) ?? 0);
        void liveActivity.startRestTimer(120, {
          exerciseName: exName,
          currentSet: setIdx + 1,
          totalSets: currentActive.sets.length,
          weightKg: displayWeightToKg(parseWorkoutNumber(target.weight) ?? 0, profile.unit),
          reps: parseInt(target.reps, 10) || 0,
          totalDurationSeconds: workoutDuration,
          totalVolumeKg: currentTotalVolume + addedVol,
        });
      }
    } else {
      setIsRestTimerRunning(false);
      if (currentActive) {
        syncLiveActivitySet(currentActive, setIdx, false);
      }
    }
  };

  const handleFinishWorkout = () => {
    const hasInvalidCompletedSet = activeExercises.some((act) => act.sets.some((set) => {
      if (!set.done) return false;
      const weight = parseWorkoutNumber(set.weight);
      const reps = parseWorkoutNumber(set.reps);
      return weight === null || displayWeightToKg(weight, profile.unit) < 0 || reps === null ||
        !Number.isInteger(reps) || reps < 1 || reps > 36 ||
        (set.rir !== undefined && (!Number.isInteger(set.rir) || set.rir < 0 || set.rir > 10));
    }));
    if (hasInvalidCompletedSet) {
      Alert.alert(
        locale === 'vi' ? 'Giá trị hiệp chưa hợp lệ' : 'Invalid set values',
        locale === 'vi' ? 'Kiểm tra lại tạ, reps và RIR của các hiệp đã đánh dấu.' : 'Check the weight, reps, and RIR on completed sets.',
      );
      return;
    }

    let totalVol = 0;
    let completedSets = 0;
    const trainedMusclesSet = new Set<MuscleSlug>();
    const primSet = new Set<string>();
    const secSet = new Set<string>();
    const bestPrs: { name: string; weight: number; reps: number; est1RM: number }[] = [];
    const hypertrophyHighlights: string[] = [];

    const entriesData: { id: string; sets: { weight?: number | string; reps?: number | string; rir?: number; done: boolean }[] }[] = [];

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
        totalVol += w * r;
        completedSets += 1;

        const est = calculate1RM(w, r);
        if (est > bestEx1RM) {
          bestEx1RM = est;
          bestWeight = w;
          bestReps = r;
        }
      });

      if (bestEx1RM > 0) {
        bestPrs.push({
          name: locale === 'vi' ? (act.exercise.name_vi || act.exercise.name) : act.exercise.name,
          weight: bestWeight,
          reps: bestReps,
          est1RM: bestEx1RM,
        });
      }

      entriesData.push({
        id: act.exercise.id,
        sets: act.sets.map((s) => ({
          weight: displayWeightToKg(parseWorkoutNumber(s.weight) ?? 0, profile.unit),
          reps: s.reps,
          rir: s.rir,
          done: s.done,
        })),
      });

      if (setsDone.length > 0) {
        const m = musclesOf({ primary: act.exercise.primary_muscles, secondary: act.exercise.secondary_muscles });
        Object.keys(m).forEach((slug) => trainedMusclesSet.add(slug as MuscleSlug));
      }
    });

    if (completedSets === 0) {
      Alert.alert(
        locale === 'vi' ? 'Chưa có hiệp hoàn thành' : 'No completed sets',
        locale === 'vi' ? 'Hãy đánh dấu ít nhất một hiệp trước khi kết thúc buổi tập.' : 'Complete at least one set before finishing this workout.',
      );
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const musclesListTrained = Array.from(trainedMusclesSet);
    musclesListTrained.forEach((slug) => {
      const info = MUSCLE_NAMES[slug];
      if (info) {
        hypertrophyHighlights.push(locale === 'vi' ? info.vi : info.en);
      }
    });

    const summary = finishWorkout({
      volume: Math.round(totalVol),
      exercises: activeExercises.length,
      sets: completedSets,
      muscles: musclesListTrained,
      duration: formatTimer(workoutDuration),
      routineName: activeRoutineName,
      entries: entriesData,
    });

    setDetailedSummary({
      ...summary,
      musclesTrained: musclesListTrained,
      primaryMuscleNames: Array.from(primSet),
      secondaryMuscleNames: Array.from(secSet),
      setsDone: completedSets,
      bestPrs: bestPrs.slice(0, 3),
      hypertrophyHighlights: hypertrophyHighlights.slice(0, 4),
    });

    void liveActivity.endActivity();
    setIsWorkoutActive(false);
    setIsRestTimerRunning(false);
    void AsyncStorage.removeItem(draftStorageKey);
  };

  const categories = useMemo(() => {
    return ['All', 'Gym', 'Home', 'Calisthenics'];
  }, []);

  const getLocalizedMuscleName = (slug: string) => {
    const info = MUSCLE_NAMES[slug as MuscleSlug];
    if (!info) return slug;
    return locale === 'vi' ? info.vi : info.en;
  };

  const filteredSearchList = useMemo(() => {
    return EXERCISES_DATA.filter((ex) => {
      const matchCat = selectedCategory === 'All' || ex.category.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchCat) return false;

      const matchMuscle =
        selectedMuscle === 'All' ||
        ex.primary_muscles.some((m) => m.toLowerCase() === selectedMuscle.toLowerCase()) ||
        (selectedMuscle === 'Arms' && (ex.primary_muscles.includes('biceps') || ex.primary_muscles.includes('triceps') || ex.primary_muscles.includes('forearms'))) ||
        (selectedMuscle === 'Legs' && (ex.primary_muscles.includes('quads') || ex.primary_muscles.includes('calves') || ex.primary_muscles.includes('glutes')));
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

  // RENDER 1: START CHOOSER
  if (!isWorkoutActive) {
    return (
      <View style={[styles.screen, { backgroundColor: '#080C14' }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* NAV HEADER */}
          <View style={styles.hdr}>
            <Text style={styles.hdrTitle}>{t.workout.startChooserTitle}</Text>
          </View>

          {/* 1. TODAY'S PLAN CARD */}
          {todayRoutine && (
            <View style={[styles.card, { borderColor: '#38BDF8', borderWidth: 1 }]}>
              <Text style={styles.todayPlanKicker}>{t.workout.todaysRoutine}</Text>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.todayBigTitle}>{todayRoutine.name}</Text>
                  <Text style={styles.dimSub}>{todayRoutine.exercises.length} bài tập</Text>
                </View>
                <View style={styles.todayIconBox}>
                  <Feather name={todayRoutine.emoji as any || 'zap'} size={20} color="#38BDF8" />
                </View>
              </View>

              <Pressable
                onPress={() => handleStartRoutine(todayRoutine)}
                style={styles.btnPrimaryStart}
              >
                <Feather name="play" size={15} color="#080C14" />
                <Text style={styles.btnPrimaryStartText}>{t.workout.startSession}</Text>
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
                        <Feather name={r.emoji as any || 'activity'} size={16} color="#38BDF8" />
                      </View>
                      <View style={styles.lrowGrow}>
                        <Text style={styles.lrowTitle}>{r.name}</Text>
                        <Text style={styles.lrowSub}>{r.exercises.length} bài tập</Text>
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
              <Text style={styles.btnFreestyleText}>{t.workout.freestyleTitle}</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* MODAL: SUMMARY REPORT */}
        {detailedSummary && (
          <Modal visible animationType="fade" transparent>
            <View style={styles.modalBackdrop}>
              <View style={[styles.summaryCard, { maxHeight: '90%' }]}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
                  <View style={styles.summaryIconWrap}>
                    <Feather name="award" size={30} color="#22C55E" />
                  </View>
                  <Text style={styles.summaryTitle}>{t.workout.summaryTitle}</Text>

                  {/* 4 Core KPIs */}
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryTile}>
                      <Text style={styles.summaryTileLabel}>THỜI GIAN</Text>
                      <Text style={styles.summaryTileVal}>{detailedSummary.duration}</Text>
                    </View>
                    <View style={styles.summaryTile}>
                      <Text style={styles.summaryTileLabel}>VOLUME</Text>
                      <Text style={styles.summaryTileVal}>{detailedSummary.volume} kg</Text>
                    </View>
                    <View style={styles.summaryTile}>
                      <Text style={styles.summaryTileLabel}>HIỆP</Text>
                      <Text style={styles.summaryTileVal}>{detailedSummary.setsDone}</Text>
                    </View>
                    <View style={styles.summaryTile}>
                      <Text style={styles.summaryTileLabel}>XP</Text>
                      <Text style={[styles.summaryTileVal, { color: '#38BDF8' }]}>+{detailedSummary.xp}</Text>
                    </View>
                  </View>

                  {/* Hypertrophy Stimulus & Mannequin */}
                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionTitle}>{t.workout.musclesHit}</Text>
                    <View style={{ alignItems: 'center', marginVertical: 6 }}>
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
                      <Text style={styles.reportSectionTitle}>{t.workout.newRecords}</Text>
                      {detailedSummary.bestPrs.map((pr, i) => (
                        <View key={i} style={styles.prRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.prName} numberOfLines={1}>{pr.name}</Text>
                            <Text style={styles.prSub}>{formatWeight(pr.weight, profile.unit, 1)}{weightUnitLabel(profile.unit)} × {pr.reps} {t.common.reps}</Text>
                          </View>
                          <Text style={styles.prVal}>{formatWeight(pr.est1RM, profile.unit, 1)} {weightUnitLabel(profile.unit)} 1RM</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={{ width: '100%', gap: 8, marginTop: 12 }}>
                    <Pressable
                      onPress={() => {
                        setDetailedSummary(null);
                        router.push('/(tabs)/stats');
                      }}
                      style={[styles.btnPrimaryStart, { backgroundColor: '#162032', borderWidth: 1, borderColor: '#38BDF8' }]}
                    >
                      <Feather name="bar-chart-2" size={15} color="#38BDF8" />
                      <Text style={[styles.btnPrimaryStartText, { color: '#38BDF8' }]}>{t.workout.viewAnalytics}</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setDetailedSummary(null)}
                      style={styles.btnPrimaryStart}
                    >
                      <Text style={styles.btnPrimaryStartText}>{t.common.done}</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  }

  // RENDER 2: LIVE WORKOUT VIEW
  return (
    <View style={[styles.screen, { backgroundColor: '#080C14' }]}>
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
            {activeExercises.length > 0 ? `${currentExerciseIndex + 1}/${activeExercises.length}` : '0'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
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

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeExercises.length === 0 ? (
          <View style={styles.emptySessionWrap}>
            <Feather name="activity" size={36} color="#38BDF8" />
            <Text style={styles.emptySessionTitle}>{t.workout.freestyleTitle}</Text>
            <Pressable
              onPress={() => setShowSearchModal(true)}
              style={styles.btnAddExPrompt}
            >
              <Feather name="plus" size={16} color="#080C14" />
              <Text style={styles.btnAddExPromptText}>{t.workout.addExercise}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Horizontal Exercise Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exCarousel}>
              {activeExercises.map((act, idx) => {
                const isSelected = idx === currentExerciseIndex;
                const doneSets = act.sets.filter((s) => s.done).length;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCurrentExerciseIndex(idx);
                      setActiveMediaTab('gif');
                      const unfinishedIdx = act.sets.findIndex((s) => !s.done);
                      syncLiveActivitySet(
                        act,
                        unfinishedIdx >= 0 ? unfinishedIdx : 0,
                        isRestTimerRunning,
                        isRestTimerRunning ? restSeconds : 0
                      );
                    }}
                    style={[styles.carouselCard, isSelected && styles.carouselCardActive]}
                  >
                    <Text style={[styles.carouselName, isSelected && { color: '#38BDF8' }]} numberOfLines={1}>
                      {locale === 'vi' ? (act.exercise.name_vi || act.exercise.name) : act.exercise.name}
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
                    <Text style={styles.activeExName}>{currentActive.exercise.name}</Text>
                    <Text style={styles.dimSub}>
                      {currentActive.exercise.name_vi ? `${currentActive.exercise.name_vi} · ` : ''}{currentActive.exercise.primary_muscles.map((m) => getLocalizedMuscleName(m)).join(', ')}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
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
                      onPress={() => setSelectedExerciseDetail(currentActive.exercise)}
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
                      {locale === 'vi' ? 'Lần trước' : 'Last time'} ({lastPerformance.dateStr}): {lastPerformance.summary}
                    </Text>
                  </View>
                )}

                {/* Media Segmented Tabs */}
                <View style={styles.mediaTabTrack}>
                  {(currentActive.exercise.gif_file || currentActive.exercise.motion_gif_url) && (
                    <Pressable
                      onPress={() => setActiveMediaTab('gif')}
                      style={[styles.mediaTabBtn, activeMediaTab === 'gif' && styles.mediaTabBtnActive]}
                    >
                      <Feather name="play-circle" size={12} color={activeMediaTab === 'gif' ? '#FFF' : '#64748B'} />
                      <Text style={[styles.mediaTabText, activeMediaTab === 'gif' && styles.mediaTabTextActive]}>Motion</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => setActiveMediaTab('mannequin')}
                    style={[styles.mediaTabBtn, activeMediaTab === 'mannequin' && styles.mediaTabBtnActive]}
                  >
                    <Feather name="user" size={12} color={activeMediaTab === 'mannequin' ? '#FFF' : '#64748B'} />
                    <Text style={[styles.mediaTabText, activeMediaTab === 'mannequin' && styles.mediaTabTextActive]}>Cơ bắp</Text>
                  </Pressable>
                </View>

                {/* Media Stage */}
                <View style={styles.mediaStage}>
                  {activeMediaTab === 'gif' && (currentActive.exercise.gif_file || currentActive.exercise.motion_gif_url) ? (
                    <View style={styles.gifWrapper}>
                      {getExerciseGifSource(currentActive.exercise.gif_file, currentActive.exercise.motion_gif_url) && (
                        <Image
                          source={getExerciseGifSource(currentActive.exercise.gif_file, currentActive.exercise.motion_gif_url)!}
                          style={styles.exerciseMediaImage}
                          resizeMode="contain"
                        />
                      )}
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                      <ExerciseMannequinHighlight
                        primaryMuscles={currentActive.exercise.primary_muscles}
                        secondaryMuscles={currentActive.exercise.secondary_muscles}
                        height={180}
                      />
                    </View>
                  )}
                </View>

                {/* Sets Logging Table */}
                <View style={styles.tableHead}>
                  <Text style={[styles.th, { width: 32 }]}>SET</Text>
                  <Text style={[styles.th, { flex: 1 }]}>{weightUnitLabel(profile.unit).toUpperCase()}</Text>
                  <Text style={[styles.th, { flex: 1 }]}>REPS</Text>
                  <Text style={[styles.th, { width: 44 }]}>RIR</Text>
                  <Text style={[styles.th, { width: 40, textAlign: 'center' }]}>✓</Text>
                </View>

                {currentActive.sets.map((set, sIdx) => (
                  <View key={sIdx} style={[styles.setRow, set.done && styles.setRowDone]}>
                    <View style={styles.setNumberBadge}>
                      <Text style={[styles.setNumberText, set.done && { color: '#22C55E' }]}>
                        {set.setNumber}
                      </Text>
                    </View>

                    <TextInput
                      keyboardType="decimal-pad"
                      value={set.weight}
                      onChangeText={(val) => updateSetField(sIdx, 'weight', val)}
                      accessibilityLabel={locale === 'vi' ? `Tạ, hiệp ${set.setNumber}` : `Weight, set ${set.setNumber}`}
                      style={[styles.setInput, set.done && styles.setInputDone]}
                    />

                    <TextInput
                      keyboardType="numeric"
                      value={set.reps}
                      onChangeText={(val) => updateSetField(sIdx, 'reps', val)}
                      accessibilityLabel={locale === 'vi' ? `Số lần, hiệp ${set.setNumber}` : `Reps, set ${set.setNumber}`}
                      style={[styles.setInput, set.done && styles.setInputDone]}
                    />

                    <TextInput
                      keyboardType="numeric"
                      value={String(set.rir ?? 2)}
                      onChangeText={(val) => {
                        if (val === '') updateSetField(sIdx, 'rir', undefined);
                        else if (/^\d{1,2}$/.test(val) && Number(val) <= 10) updateSetField(sIdx, 'rir', Number(val));
                      }}
                      accessibilityLabel={locale === 'vi' ? `RIR, hiệp ${set.setNumber}` : `RIR, set ${set.setNumber}`}
                      style={[styles.setInput, { width: 44 }, set.done && styles.setInputDone]}
                    />

                    <Pressable
                      onPress={() => toggleSetDone(sIdx)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: set.done }}
                      accessibilityLabel={locale === 'vi' ? `Hoàn thành hiệp ${set.setNumber}` : `Complete set ${set.setNumber}`}
                      style={[styles.checkBtn, set.done && styles.checkBtnDone]}
                    >
                      <Feather
                        name="check"
                        size={14}
                        color={set.done ? '#080C14' : '#64748B'}
                      />
                    </Pressable>
                  </View>
                ))}

                {/* Set Actions */}
                <View style={styles.setActionsRow}>
                  <Pressable onPress={() => handleAddSet(false)} accessibilityRole="button" accessibilityLabel={locale === 'vi' ? 'Thêm hiệp' : 'Add set'} style={styles.btnSmallTinted}>
                    <Feather name="plus" size={12} color="#38BDF8" />
                    <Text style={styles.btnSmallTintedText}>Set</Text>
                  </Pressable>
                  <Pressable onPress={() => handleAddSet(true)} accessibilityRole="button" accessibilityLabel={locale === 'vi' ? 'Thêm drop set' : 'Add drop set'} style={styles.btnSmallTinted}>
                    <Feather name="zap" size={11} color="#F59E0B" />
                    <Text style={[styles.btnSmallTintedText, { color: '#F59E0B' }]}>Drop</Text>
                  </Pressable>
                  {currentActive.sets.length > 1 && (
                    <Pressable onPress={handleRemoveSet} style={styles.btnRemoveSet}>
                      <Feather name="minus" size={12} color="#EF4444" />
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FLOATING REST TIMER WIDGET */}
      {isRestTimerRunning && (
        <View
          style={[
            styles.restWidget,
            { bottom: activeExercises.length > 0 ? insets.bottom + 76 : insets.bottom + 20 },
          ]}
        >
          <View style={styles.restWidgetLeft}>
            <Feather name="clock" size={14} color="#38BDF8" />
            <Text style={styles.restWidgetTimer}>{formatTimer(restSeconds)}</Text>
            <Text style={styles.restWidgetSub}>{t.common.rest.toUpperCase()}</Text>
          </View>
          <View style={styles.restWidgetPresets}>
            {[60, 90, 120, 180].map((sec) => (
              <Pressable
                key={sec}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRestSeconds(sec);
                  if (currentActive) {
                    const exName =
                      locale === 'vi'
                        ? currentActive.exercise.name_vi || currentActive.exercise.name
                        : currentActive.exercise.name;
                    void liveActivity.startRestTimer(sec, {
                      exerciseName: exName,
                      currentSet: currentActive.sets.findIndex((s) => !s.done) + 1 || 1,
                      totalSets: currentActive.sets.length,
                      weightKg: displayWeightToKg(parseWorkoutNumber(currentActive.sets[0]?.weight || '0') ?? 0, profile.unit),
                      reps: parseInt(currentActive.sets[0]?.reps || '0', 10) || 0,
                      totalDurationSeconds: workoutDuration,
                      totalVolumeKg: currentTotalVolume,
                    });
                  }
                }}
                style={[styles.restPresetBtn, restSeconds === sec && styles.restPresetBtnActive]}
              >
                <Text style={[styles.restPresetText, restSeconds === sec && styles.restPresetTextActive]}>
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
                  const exName =
                    locale === 'vi'
                      ? currentActive.exercise.name_vi || currentActive.exercise.name
                      : currentActive.exercise.name;
                  void liveActivity.startRestTimer(nextSec, {
                    exerciseName: exName,
                    currentSet: currentActive.sets.findIndex((s) => !s.done) + 1 || 1,
                    totalSets: currentActive.sets.length,
                    weightKg: displayWeightToKg(parseWorkoutNumber(currentActive.sets[0]?.weight || '0') ?? 0, profile.unit),
                    reps: parseInt(currentActive.sets[0]?.reps || '0', 10) || 0,
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
                if (currentActive) {
                  const nextUnfinishedIdx = currentActive.sets.findIndex((s) => !s.done);
                  syncLiveActivitySet(
                    currentActive,
                    nextUnfinishedIdx >= 0 ? nextUnfinishedIdx : currentActive.sets.length - 1,
                    false
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
        <View style={[styles.liveBottomDock, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
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
                setCurrentExerciseIndex((prev) => prev + 1);
              } else {
                handleFinishWorkout();
              }
            }}
            style={styles.dockNextBtn}
          >
            <Text style={styles.dockNextBtnText}>
              {currentExerciseIndex < activeExercises.length - 1
                ? (locale === 'vi' ? 'Bài tiếp theo' : 'Hoàn thành buổi tập')
                : (locale === 'vi' ? 'Hoàn thành buổi tập' : 'Finish Session')}
            </Text>
            <Feather
              name={currentExerciseIndex < activeExercises.length - 1 ? 'chevron-right' : 'check'}
              size={16}
              color="#080C14"
            />
          </Pressable>
        </View>
      )}

      {/* EXERCISE SEARCH MODAL */}
      <Modal visible={showSearchModal} animationType="slide" transparent={false}>
        <View style={[styles.screen, { backgroundColor: '#080C14', paddingTop: insets.top + 8 }]}>
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
            <Text style={styles.pickerHeaderTitle}>{t.workout.addExercise}</Text>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={styles.catChipsRow}
          >
            {categories.map((cat) => {
              const isSel = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat);
                  }}
                  style={[styles.catChip, isSel && styles.catChipActive]}
                >
                  <Text style={[styles.catChipText, isSel && styles.catChipTextActive]}>{cat}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Search Result List */}
          <FlatList
            data={filteredSearchList}
            keyExtractor={(item) => item.id}
            initialNumToRender={15}
            maxToRenderPerBatch={15}
            windowSize={5}
            removeClippedSubviews={true}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 24) + 60 }}
            renderItem={({ item: ex }) => {
              const imgSrc = getExerciseImageSource(ex.image_file, ex.thumbnail_url);
              return (
                <Pressable
                  key={ex.id}
                  onPress={() => addExerciseToWorkout(ex as unknown as ExerciseItem)}
                  style={({ pressed }) => [
                    styles.searchExCard,
                    pressed && styles.searchExCardPressed,
                  ]}
                >
                  <View style={styles.lrowThumbRail}>
                    {imgSrc ? (
                      <Image
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
                      {ex.name_vi ? `${ex.name_vi} · ` : ''}{ex.primary_muscles.map((m) => getLocalizedMuscleName(m)).join(', ')} • {ex.equipment}
                    </Text>
                  </View>
                  <Feather name="plus" size={15} color="#38BDF8" />
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptySearchWrap}>
                <Feather name="search" size={36} color="#334155" />
                <Text style={styles.emptySearchTitle}>
                  {locale === 'vi' ? 'Không tìm thấy bài tập' : 'No exercises found'}
                </Text>
                <Text style={styles.emptySearchSub}>
                  {locale === 'vi'
                    ? `Không có kết quả khớp với "${searchQuery}". Hãy thử từ khóa khác hoặc chọn nhóm cơ khác.`
                    : `No results matching "${searchQuery}". Try a different keyword or category.`}
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* EXERCISE DETAIL INFO MODAL */}
      {selectedExerciseDetail && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <Pressable style={styles.modalDim} onPress={() => setSelectedExerciseDetail(null)} />
            <View style={[styles.bottomSheet, { maxHeight: '80%', paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>
                {selectedExerciseDetail.name}
              </Text>
              <Text style={styles.sheetSub}>
                {selectedExerciseDetail.name_vi ? `${selectedExerciseDetail.name_vi} · ` : ''}{selectedExerciseDetail.primary_muscles.map((m) => getLocalizedMuscleName(m)).join(', ')} • {selectedExerciseDetail.equipment}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
                <View style={{ alignItems: 'center', marginVertical: 6 }}>
                  <ExerciseMannequinHighlight
                    primaryMuscles={selectedExerciseDetail.primary_muscles}
                    secondaryMuscles={selectedExerciseDetail.secondary_muscles}
                    height={180}
                  />
                </View>

                {selectedExerciseDetail.instructions && selectedExerciseDetail.instructions.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.sectTitle, { color: '#38BDF8' }]}>HƯỚNG DẪN</Text>
                    {selectedExerciseDetail.instructions.map((inst, i) => (
                      <Text key={i} style={styles.instructionText}>
                        {i + 1}. {inst}
                      </Text>
                    ))}
                  </View>
                )}
              </ScrollView>

              <Pressable onPress={() => setSelectedExerciseDetail(null)} style={styles.btnPrimaryStart}>
                <Text style={styles.btnPrimaryStartText}>{t.common.done}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* BARBELL PLATE CALCULATOR MODAL */}
      <Modal visible={plateModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDim} onPress={() => setPlateModalOpen(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.rowBetween}>
              <Text style={styles.sheetTitle}>
                {locale === 'vi' ? 'Tính bánh tạ (Plate Math)' : 'Plate Calculator'}
              </Text>
              <Pressable onPress={() => setPlateModalOpen(false)}>
                <Feather name="x" size={18} color="#94A3B8" />
              </Pressable>
            </View>
            <Text style={styles.sheetSub}>
              {locale === 'vi' ? 'Bánh tạ cần lắp trên MỖI BÊN thanh đòn' : 'Plates needed on EACH SIDE of the bar'}
            </Text>

            {/* Input Total Weight */}
            <View style={styles.plateInputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.plateLabel}>{locale === 'vi' ? `Tổng mức tạ (${weightUnitLabel(profile.unit)})` : `Target Weight (${weightUnitLabel(profile.unit)})`}</Text>
                <TextInput
                  value={plateTargetWeight}
                  onChangeText={setPlateTargetWeight}
                  keyboardType="decimal-pad"
                  style={styles.plateTextInput}
                />
              </View>
              <View style={{ width: 12 }} />
              <View>
                <Text style={styles.plateLabel}>{locale === 'vi' ? 'Thanh đòn (Bar)' : 'Barbell'}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  {(profile.unit === 'Imperial' ? [45, 35, 25] : [20, 15, 10]).map((bw) => (
                    <Pressable
                      key={bw}
                      onPress={() => setBarWeight(bw)}
                      style={[styles.barWeightBtn, barWeight === bw && styles.barWeightBtnActive]}
                    >
                      <Text style={[styles.barWeightText, barWeight === bw && styles.barWeightTextActive]}>
                        {bw}{weightUnitLabel(profile.unit)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Summary Per Side */}
            <View style={styles.platePerSideCard}>
              <Text style={styles.platePerSideLabel}>
                {locale === 'vi' ? 'Mỗi bên thanh đòn:' : 'Each side weight:'}
              </Text>
              <Text style={styles.platePerSideVal}>
                {plateBreakdown.perSide.toFixed(1)} <Text style={{ fontSize: 13, color: '#94A3B8' }}>{weightUnitLabel(profile.unit)}</Text>
              </Text>
            </View>

            {/* Visual Plates List */}
            <View style={{ marginVertical: 12 }}>
              {!plateBreakdown.canLoadBar ? (
                <Text style={[styles.dimSub, { color: '#F59E0B', textAlign: 'center', marginVertical: 10 }]}>
                  {locale === 'vi' ? 'Tổng tạ phải lớn hơn hoặc bằng trọng lượng thanh đòn.' : 'Target weight must be at least the bar weight.'}
                </Text>
              ) : plateBreakdown.plates.length > 0 ? (
                <View style={styles.plateBadgesWrap}>
                  {plateBreakdown.plates.map((p, idx) => (
                    <View key={idx} style={styles.plateBadge}>
                      <View style={[styles.plateDiscIcon, { height: Math.min(48, 28 + p.plate * 0.7) }]}>
                        <Text style={styles.plateDiscText}>{p.plate}</Text>
                      </View>
                      <Text style={styles.plateCountText}>× {p.count}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.dimSub, { textAlign: 'center', marginVertical: 10 }]}>
                  {plateBreakdown.rem > 0
                    ? (locale === 'vi' ? `Không thể ghép chính xác; còn thiếu ${plateBreakdown.rem} ${weightUnitLabel(profile.unit)} mỗi bên.` : `No exact plate match; ${plateBreakdown.rem} ${weightUnitLabel(profile.unit)} remains per side.`)
                    : (locale === 'vi' ? 'Chỉ cần nâng thanh đòn trống' : 'Empty bar only')}
                </Text>
              )}
            </View>

            <Pressable onPress={() => setPlateModalOpen(false)} style={styles.btnPrimaryStart}>
              <Text style={styles.btnPrimaryStartText}>{t.common.done}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  hdr: { marginBottom: 14 },
  hdrTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: -0.4 },
  sect: { marginTop: 12 },
  sectTitle: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 6 },
  card: {
    backgroundColor: '#111724',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    marginBottom: 10,
  },
  todayPlanKicker: { color: '#38BDF8', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  todayBigTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  todayIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#14233D', alignItems: 'center', justifyContent: 'center' },
  dimSub: { color: '#64748B', fontSize: 11, marginTop: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btnPrimaryStart: {
    backgroundColor: '#38BDF8',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  btnPrimaryStartText: { color: '#080C14', fontSize: 13, fontWeight: '900' },
  btnFreestyle: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnFreestyleText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  insetList: {
    backgroundColor: '#111724',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  lrow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  lrowPressed: { backgroundColor: '#162032' },
  lrowDivider: { borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  lrowIconRail: { width: 22, alignItems: 'center' },
  lrowGrow: { flex: 1 },
  lrowTitle: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  lrowSub: { color: '#64748B', fontSize: 11, marginTop: 1 },
  tagAcc: { backgroundColor: '#14233D', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagAccText: { color: '#38BDF8', fontSize: 10, fontWeight: '800' },
  liveHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#080C14',
  },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#14233D', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  timerText: { color: '#38BDF8', fontSize: 12, fontWeight: '800' },
  activeRoutineTitle: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  activeRoutineSub: { color: '#64748B', fontSize: 10 },
  cancelSessionBtn: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#162032', alignItems: 'center', justifyContent: 'center' },
  finishBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22C55E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  finishBtnText: { color: '#080C14', fontSize: 11, fontWeight: '900' },
  emptySessionWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  emptySessionTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  btnAddExPrompt: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#38BDF8', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 10 },
  btnAddExPromptText: { color: '#080C14', fontSize: 13, fontWeight: '900' },
  exCarousel: { gap: 6, paddingVertical: 10 },
  carouselCard: { backgroundColor: '#111724', borderWidth: 1, borderColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 90 },
  carouselCardActive: { borderColor: '#38BDF8', backgroundColor: '#14233D' },
  carouselName: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  carouselSub: { color: '#64748B', fontSize: 9, marginTop: 1 },
  carouselAddBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#162032', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  activeExName: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  infoBtn: { padding: 4 },
  mediaTabTrack: { flexDirection: 'row', backgroundColor: '#162032', borderRadius: 6, padding: 2, marginVertical: 8 },
  mediaTabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4, borderRadius: 4 },
  mediaTabBtnActive: { backgroundColor: '#080C14' },
  mediaTabText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  mediaTabTextActive: { color: '#FFF', fontWeight: '800' },
  mediaStage: { backgroundColor: '#0B0F19', borderRadius: 10, overflow: 'hidden', marginVertical: 6 },
  gifWrapper: {
    width: '100%',
    height: 190,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  exerciseMediaImage: { width: '100%', height: '100%' },
  tableHead: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1E293B', gap: 6 },
  th: { color: '#64748B', fontSize: 9, fontWeight: '800' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  setRowDone: { opacity: 0.6 },
  setNumberBadge: { width: 32, alignItems: 'center' },
  setNumberText: { color: '#94A3B8', fontSize: 12, fontWeight: '800' },
  setInput: { flex: 1, backgroundColor: '#162032', color: '#FFF', borderRadius: 6, paddingVertical: 5, textAlign: 'center', fontSize: 13, fontWeight: '800' },
  setInputDone: { backgroundColor: '#0E1726' },
  checkBtn: { width: 40, height: 32, borderRadius: 6, backgroundColor: '#162032', alignItems: 'center', justifyContent: 'center' },
  checkBtnDone: { backgroundColor: '#22C55E' },
  setActionsRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  btnSmallTinted: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#162032', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  btnSmallTintedText: { color: '#38BDF8', fontSize: 10, fontWeight: '700' },
  btnRemoveSet: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#EF444422', alignItems: 'center', justifyContent: 'center' },
  lastTimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#0B1320', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginVertical: 6 },
  lastTimeText: { color: '#38BDF8', fontSize: 11, fontWeight: '600' },
  restWidget: { position: 'absolute', left: 16, right: 16, backgroundColor: '#111724', borderWidth: 1, borderColor: '#38BDF8', borderRadius: 12, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restWidgetLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  restWidgetTimer: { color: '#38BDF8', fontSize: 16, fontWeight: '900' },
  restWidgetSub: { color: '#64748B', fontSize: 9, fontWeight: '800' },
  restWidgetPresets: { flexDirection: 'row', gap: 4 },
  restPresetBtn: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, backgroundColor: '#162032' },
  restPresetBtnActive: { backgroundColor: '#38BDF8' },
  restPresetText: { color: '#94A3B8', fontSize: 10, fontWeight: '700' },
  restPresetTextActive: { color: '#080C14', fontWeight: '900' },
  restWidgetRight: { flexDirection: 'row', gap: 6 },
  restPlusBtn: { backgroundColor: '#162032', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  restPlusText: { color: '#38BDF8', fontSize: 10, fontWeight: '700' },
  restSkipBtn: { padding: 4 },
  plateInputRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 8 },
  plateLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '800', marginBottom: 4 },
  plateTextInput: { backgroundColor: '#162032', color: '#FFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontWeight: '900' },
  barWeightBtn: { paddingHorizontal: 8, paddingVertical: 8, borderRadius: 6, backgroundColor: '#162032' },
  barWeightBtnActive: { backgroundColor: '#38BDF8' },
  barWeightText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  barWeightTextActive: { color: '#080C14', fontWeight: '900' },
  platePerSideCard: { backgroundColor: '#162032', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  platePerSideLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  platePerSideVal: { color: '#38BDF8', fontSize: 18, fontWeight: '900' },
  plateBadgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  plateBadge: { alignItems: 'center', gap: 4 },
  plateDiscIcon: { width: 44, borderRadius: 6, backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#38BDF8', alignItems: 'center', justifyContent: 'center' },
  plateDiscText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  plateCountText: { color: '#38BDF8', fontSize: 11, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  modalDim: { flex: 1 },
  bottomSheet: { backgroundColor: '#111724', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: '#1E293B', padding: 16 },
  sheetHandle: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 10 },
  sheetTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  sheetSub: { color: '#64748B', fontSize: 11, marginTop: 2, marginBottom: 8 },
  summaryCard: { backgroundColor: '#111724', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, width: '100%' },
  summaryIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#22C55E22', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  summaryGrid: { flexDirection: 'row', gap: 6, marginVertical: 12, width: '100%' },
  summaryTile: { flex: 1, backgroundColor: '#162032', borderRadius: 8, padding: 8, alignItems: 'center' },
  summaryTileLabel: { color: '#94A3B8', fontSize: 8, fontWeight: '800' },
  summaryTileVal: { color: '#FFF', fontSize: 14, fontWeight: '900', marginTop: 2 },
  reportSection: { width: '100%', marginTop: 8 },
  reportSectionTitle: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#162032', padding: 8, borderRadius: 6, marginBottom: 4 },
  prName: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  prSub: { color: '#64748B', fontSize: 9 },
  prVal: { color: '#22C55E', fontSize: 12, fontWeight: '900' },
  pickerHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  iconBtn: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#162032', alignItems: 'center', justifyContent: 'center' },
  pickerHeaderTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111724', borderWidth: 1, borderColor: '#1E293B', borderRadius: 8, marginHorizontal: 16, paddingHorizontal: 10, paddingVertical: 6, gap: 6, marginBottom: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13 },
  catChipsRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 4, marginBottom: 12 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#162032',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChipActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  catChipText: { color: '#94A3B8', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  catChipTextActive: { color: '#080C14', fontWeight: '900' },
  searchExCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    backgroundColor: '#111724',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 8,
  },
  searchExCardPressed: {
    backgroundColor: '#162032',
    borderColor: '#38BDF8',
  },
  lrowThumbRail: { width: 34, height: 34, borderRadius: 6, overflow: 'hidden', backgroundColor: '#162032', alignItems: 'center', justifyContent: 'center' },
  searchThumbImg: { width: 34, height: 34 },
  instructionText: { color: '#CBD5E1', fontSize: 11, lineHeight: 16, marginVertical: 2 },
  emptySearchWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptySearchTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySearchSub: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  liveBottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0D131F',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  dockAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#162032',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  dockAddBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  dockNextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#38BDF8',
  },
  dockNextBtnText: {
    color: '#080C14',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
