import { ExerciseThumbnail } from "@/components/ExerciseThumbnail";
import { PaywallModal } from "@/components/PaywallModal";
import { RoutinePrescriptionEditor } from "@/components/RoutinePrescriptionEditor";
import { matchesMuscleGroup } from "@/lib/input";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Text, TextInput } from "@/components/AppTypography";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  FlatList,
  Pressable,
  Modal,
  Alert,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppState, type Routine } from "@/context/AppState";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { ExerciseMannequinHighlight } from "@/components/ExerciseMannequinHighlight";
import { MUSCLE_NAMES, type MuscleSlug } from "@/lib/muscles";
import { type ProgressionPolicy } from "@/lib/progression";
import {
  getExerciseImageSource,
  getExerciseGifUrl,
} from "@/lib/exerciseAssets";
import { useI18n } from "@/lib/i18n";
import { formatWeight, weightUnitLabel } from "@/lib/units";
import {
  getExerciseDisplayName,
  getExerciseSecondaryName,
} from "@/lib/exerciseLocalization";

// Exercise Database
import EXERCISES_DATA from "../../../../data/exercises_supabase_seed.json";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const {
    routines,
    weekSchedule,
    assignWeekSchedule,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    loadStarterPlan,
    profile,
    updateProfile,
  } = useAppState();
  const { t, locale } = useI18n();
  const [showPaywall, setShowPaywall] = useState(false);

  const splitTitle = useMemo(() => {
    const days = profile.daysPerWeek || 3;
    if (days === 2) return t.plan.splitFullBody;
    if (days === 3) return t.plan.splitPushPullLegs;
    if (days === 4) return t.plan.splitUpperLower;
    if (days === 5) return t.plan.splitPPLUpperLower;
    return t.plan.splitPPLHighVolume;
  }, [profile.daysPerWeek, t.plan]);

  const handleRegeneratePlan = (overrideDays?: number) => {
    if (!profile.isPro) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowPaywall(true);
      return;
    }
    const targetDays = overrideDays ?? profile.daysPerWeek ?? 3;
    const replace = () => {
      updateProfile({ daysPerWeek: targetDays });
      loadStarterPlan({ ...profile, daysPerWeek: targetDays });
    };
    if (routines.length === 0) {
      replace();
      return;
    }
    Alert.alert(
      t.plan.regeneratePlanTitle,
      t.plan.regeneratePlanMsg.replace("{days}", String(targetDays)),
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.plan.regenerate,
          style: "destructive",
          onPress: replace,
        },
      ],
    );
  };

  // Day Assignment Sheet
  const [assigningDay, setAssigningDay] = useState<number | null>(null);

  // Routine Editor Sheet
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [isNewRoutine, setIsNewRoutine] = useState(false);
  const originalRoutine = useRef("");
  const saveLock = useRef(false);
  const [invalidExercises, setInvalidExercises] = useState<
    Record<string, boolean>
  >({});
  const closeEditor = () => {
    const close = () => setEditingRoutine(null);
    if (
      editingRoutine &&
      JSON.stringify(editingRoutine) !== originalRoutine.current
    ) {
      Alert.alert(
        t.plan.discardChangesTitle,
        "",
        [
          { text: t.common.cancel, style: "cancel" },
          {
            text: t.plan.discardChangesAction,
            style: "destructive",
            onPress: close,
          },
        ],
      );
    } else close();
  };

  useEffect(() => {
    if (!editingRoutine) return;
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      closeEditor();
      return true;
    });
    return () => back.remove();
  }, [editingRoutine, t.plan]);

  const normalizeSupersets = (exercises: Routine["exercises"]) => {
    const groups = new Map<string, number[]>();
    exercises.forEach((exercise, index) => {
      if (exercise.supersetId)
        groups.set(exercise.supersetId, [
          ...(groups.get(exercise.supersetId) ?? []),
          index,
        ]);
    });
    return exercises.map((exercise) => {
      const members = exercise.supersetId
        ? groups.get(exercise.supersetId)!
        : [];
      const valid =
        members.length > 1 &&
        members.every((index, i) => !i || index === members[i - 1] + 1);
      return {
        ...exercise,
        supersetId: valid ? exercise.supersetId : undefined,
      };
    });
  };

  // Exercise Picker Modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [progressionModalOpen, setProgressionModalOpen] = useState(false);

  // Exercise Library Modal (Inspired by OpenGym Library.jsx)
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [selectedLibraryEx, setSelectedLibraryEx] = useState<
    (typeof EXERCISES_DATA)[0] | null
  >(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState("All");
  const [libraryEquipmentFilter, setLibraryEquipmentFilter] = useState("All");
  const [routineSelectForAdd, setRoutineSelectForAdd] = useState<
    (typeof EXERCISES_DATA)[0] | null
  >(null);

  const PROGRESSION_POLICIES: {
    value: ProgressionPolicy;
    label: string;
    desc: string;
  }[] = [
    {
      value: "linear",
      label: t.progression.linear,
      desc: t.progression.linearDesc,
    },
    {
      value: "greyskull",
      label: t.progression.greyskull,
      desc: t.progression.greyskullDesc,
    },
    {
      value: "double",
      label: t.progression.double,
      desc: t.progression.doubleDesc,
    },
    { value: "off", label: t.progression.off, desc: t.progression.offDesc },
  ];

  const exMap = useMemo(() => {
    const map = new Map<string, (typeof EXERCISES_DATA)[0]>();
    EXERCISES_DATA.forEach((e) => map.set(e.id, e));
    return map;
  }, []);

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return EXERCISES_DATA;
    const q = searchQuery.toLowerCase();
    return EXERCISES_DATA.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.name_vi && e.name_vi.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q) ||
        e.primary_muscles.some((m) => m.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const filteredLibraryExercises = useMemo(() => {
    let list = EXERCISES_DATA;
    if (libraryMuscleFilter !== "All") {
      list = list.filter((exercise) =>
        matchesMuscleGroup(exercise.primary_muscles, libraryMuscleFilter),
      );
    }
    if (libraryEquipmentFilter !== "All") {
      const ef = libraryEquipmentFilter.toLowerCase();
      list = list.filter(
        (e) => e.equipment && e.equipment.toLowerCase().includes(ef),
      );
    }
    if (librarySearch.trim()) {
      const q = librarySearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.name_vi && e.name_vi.toLowerCase().includes(q)) ||
          e.primary_muscles.some((m) => m.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [librarySearch, libraryMuscleFilter, libraryEquipmentFilter]);

  const routineMuscles = useMemo(() => {
    if (
      !editingRoutine ||
      !editingRoutine.exercises ||
      editingRoutine.exercises.length === 0
    ) {
      return { primary: [] as string[], secondary: [] as string[] };
    }
    const primarySet = new Set<string>();
    const secondarySet = new Set<string>();

    editingRoutine.exercises.forEach((item) => {
      const data = exMap.get(item.id);
      if (data) {
        (data.primary_muscles || []).forEach((m) => primarySet.add(m));
        (data.secondary_muscles || []).forEach((m) => secondarySet.add(m));
      }
    });

    const secondaryFiltered = Array.from(secondarySet).filter(
      (m) => !primarySet.has(m),
    );

    return {
      primary: Array.from(primarySet),
      secondary: secondaryFiltered,
    };
  }, [editingRoutine?.exercises, exMap]);

  const handleAddExToRoutine = (routineId: string, exId: string) => {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newEx = {
      id: exId,
      sets: 3,
      reps: 10,
      targetWeight: 0,
    };
    updateRoutine(routineId, {
      exercises: [...routine.exercises, newEx],
    });
    const addedName =
      getExerciseDisplayName(routineSelectForAdd, locale) || t.common.exercises;
    setRoutineSelectForAdd(null);
    Alert.alert(
      t.plan.exerciseAddedTitle,
      t.plan.exerciseAddedMsg
        .replace("{name}", addedName)
        .replace("{routine}", routine.name),
      [{ text: t.common.done }],
    );
  };

  const handleCreateRoutine = () => {
    if (!profile.isPro) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowPaywall(true);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveLock.current = false;
    setInvalidExercises({});
    setLibraryModalOpen(false);
    setRoutineSelectForAdd(null);
    setIsNewRoutine(true);
    const created: Routine = {
      id: "",
      name: t.plan.createRoutine,
      emoji: "activity",
      progression: "linear",
      exercises: [],
    };
    originalRoutine.current = JSON.stringify(created);
    setEditingRoutine(created);
  };

  const handleOpenEdit = (routine: Routine) => {
    if (!profile.isPro) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowPaywall(true);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveLock.current = false;
    setInvalidExercises({});
    originalRoutine.current = JSON.stringify(routine);
    setIsNewRoutine(false);
    setEditingRoutine(JSON.parse(JSON.stringify(routine)));
  };

  const handleSaveRoutine = () => {
    if (saveLock.current) return;
    if (
      !editingRoutine ||
      !editingRoutine.name.trim() ||
      !editingRoutine.exercises.length ||
      Object.values(invalidExercises).some(Boolean)
    ) {
      Alert.alert(
        t.plan.invalidRoutineTitle,
        t.plan.invalidRoutineMsg,
      );
      return;
    }
    saveLock.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isNewRoutine) {
      addRoutine({
        name: editingRoutine.name,
        emoji: editingRoutine.emoji || "zap",
        progression: editingRoutine.progression || "linear",
        exercises: editingRoutine.exercises,
      });
    } else {
      updateRoutine(editingRoutine.id, {
        name: editingRoutine.name,
        emoji: editingRoutine.emoji,
        progression: editingRoutine.progression,
        exercises: editingRoutine.exercises,
      });
    }
    setEditingRoutine(null);
  };

  const handleAddEx = (exId: string) => {
    if (!editingRoutine) return;
    if (editingRoutine.exercises.some((exercise) => exercise.id === exId)) {
      setPickerOpen(false);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExList = [
      ...editingRoutine.exercises,
      {
        id: exId,
        sets: 3,
        reps: 10,
        targetWeight: 0,
      },
    ];
    setEditingRoutine({ ...editingRoutine, exercises: newExList });
    setPickerOpen(false);
  };

  const handleRemoveEx = (index: number) => {
    if (!editingRoutine) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = editingRoutine.exercises.filter((_, i) => i !== index);
    const removedId = editingRoutine.exercises[index].id;
    setInvalidExercises((previous) => {
      const next = { ...previous };
      delete next[removedId];
      return next;
    });
    setEditingRoutine({
      ...editingRoutine,
      exercises: normalizeSupersets(updated),
    });
  };

  const handleMoveEx = (fromIndex: number, direction: -1 | 1) => {
    if (!editingRoutine) return;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= editingRoutine.exercises.length) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const list = editingRoutine.exercises.map((exercise) => ({ ...exercise }));
    const item = list.splice(fromIndex, 1)[0];
    list.splice(toIndex, 0, item);
    setEditingRoutine({
      ...editingRoutine,
      exercises: normalizeSupersets(list),
    });
  };

  const handleToggleSuperset = (idx: number) => {
    if (!editingRoutine || idx === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const list = editingRoutine.exercises.map((exercise) => ({ ...exercise }));
    const current = list[idx];
    const prev = list[idx - 1];

    if (current.supersetId && current.supersetId === prev.supersetId) {
      current.supersetId = undefined;
    } else {
      const ssId = prev.supersetId || `ss_${Date.now()}`;
      prev.supersetId = ssId;
      current.supersetId = ssId;
    }
    setEditingRoutine({
      ...editingRoutine,
      exercises: normalizeSupersets(list),
    });
  };

  const getLocalizedMuscleName = (slug: string) => {
    return t.muscles[slug] || slug;
  };

  const getLocalizedEquipment = (eq?: string) => {
    if (!eq) return "";
    const lower = eq.toLowerCase();
    for (const [key, val] of Object.entries(t.plan.equipmentNames)) {
      if (lower.includes(key)) return val;
    }
    return eq;
  };

  // VIEW 1: ROUTINE BUILDER / EDITOR
  if (editingRoutine) {
    return (
      <View
        style={[
          styles.screen,
          { backgroundColor: "#080C14", paddingTop: insets.top + 8 },
        ]}
      >
        {/* Header */}
        <View style={styles.editHdr}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              closeEditor();
            }}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={t.plan.closeEditorA11y}
          >
            <Feather name="chevron-left" size={20} color="#FFF" />
          </Pressable>
          <TextInput
            value={editingRoutine.name}
            onChangeText={(val) =>
              setEditingRoutine({ ...editingRoutine, name: val })
            }
            placeholder={t.plan.routineName}
            placeholderTextColor="#64748B"
            accessibilityLabel={t.plan.routineName}
            style={styles.routineTitleInput}
          />
          <Pressable
            onPress={handleSaveRoutine}
            accessibilityRole="button"
            accessibilityLabel={t.common.save}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnText}>{t.common.save}</Text>
          </Pressable>
        </View>

        <KeyboardAwareScrollViewCompat
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Progression Select Row */}
          <View style={[styles.insetList, { marginTop: 10, marginBottom: 6 }]}>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setProgressionModalOpen(true);
              }}
              style={[styles.lrow, { paddingVertical: 12 }]}
              accessibilityRole="button"
              accessibilityLabel={t.plan.chooseProgression}
            >
              <View style={styles.lrowIconRail}>
                <Feather name="trending-up" size={16} color="#38BDF8" />
              </View>
              <View style={styles.lrowGrow}>
                <Text style={styles.lrowTitle}>{t.plan.progressionPolicy}</Text>
                <Text style={styles.lrowSub}>
                  {PROGRESSION_POLICIES.find(
                    (p) => p.value === editingRoutine.progression,
                  )?.label || "Linear"}
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={16}
                color="#64748B"
                style={styles.chev}
              />
            </Pressable>
          </View>

          {/* Exercises Inset List */}
          <Text style={[styles.sectTitle, { marginTop: 14, marginBottom: 6 }]}>
            {t.plan.routines}
          </Text>

          {editingRoutine.exercises.length > 0 ? (
            <View style={styles.insetList}>
              {editingRoutine.exercises.map((item, idx) => {
                const ex = exMap.get(item.id);
                const isLast = idx === editingRoutine.exercises.length - 1;
                const prev = idx > 0 ? editingRoutine.exercises[idx - 1] : null;
                const linkedPrev =
                  idx > 0 &&
                  item.supersetId &&
                  prev?.supersetId === item.supersetId;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.exItemContainer,
                      !isLast && styles.lrowDivider,
                    ]}
                  >
                    {linkedPrev && (
                      <View style={styles.ssBanner}>
                        <Feather name="link" size={11} color="#F59E0B" />
                        <Text style={styles.ssBannerText}>SUPERSET</Text>
                      </View>
                    )}
                    <View style={styles.exItemRow}>
                      <View style={styles.exOrderBox}>
                        <Text style={styles.exOrderText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lrowTitle} numberOfLines={1}>
                          {ex?.name || item.id}
                        </Text>
                        <Text style={styles.lrowSub} numberOfLines={1}>
                          {ex?.name_vi ? `${ex.name_vi} · ` : ""}
                          {item.sets} {t.common.sets} × {item.reps} reps @{" "}
                          {formatWeight(
                            item.targetWeight ?? 0,
                            profile.unit,
                            1,
                          )}{" "}
                          {weightUnitLabel(profile.unit)}
                        </Text>
                      </View>

                      {/* Control Rail */}
                      <View style={styles.controlRail}>
                        {idx > 0 && (
                          <Pressable
                            onPress={() => handleToggleSuperset(idx)}
                            accessibilityRole="checkbox"
                            accessibilityState={{
                              checked: Boolean(linkedPrev),
                            }}
                            accessibilityLabel={t.plan.supersetToggleA11y.replace(
                              "{index}",
                              String(idx + 1),
                            )}
                            style={[
                              styles.controlBtn,
                              linkedPrev && styles.controlBtnActiveSS,
                            ]}
                          >
                            <Feather
                              name="link"
                              size={13}
                              color={linkedPrev ? "#F59E0B" : "#94A3B8"}
                            />
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => handleMoveEx(idx, -1)}
                          accessibilityRole="button"
                          accessibilityLabel={t.plan.moveUpA11y.replace(
                            "{index}",
                            String(idx + 1),
                          )}
                          style={styles.controlBtn}
                        >
                          <Feather
                            name="chevron-up"
                            size={14}
                            color="#94A3B8"
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => handleMoveEx(idx, 1)}
                          accessibilityRole="button"
                          accessibilityLabel={t.plan.moveDownA11y.replace(
                            "{index}",
                            String(idx + 1),
                          )}
                          style={styles.controlBtn}
                        >
                          <Feather
                            name="chevron-down"
                            size={14}
                            color="#94A3B8"
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => handleRemoveEx(idx)}
                          accessibilityRole="button"
                          accessibilityLabel={t.plan.removeExA11y.replace(
                            "{index}",
                            String(idx + 1),
                          )}
                          style={styles.controlBtnDanger}
                        >
                          <Feather name="trash-2" size={13} color="#EF4444" />
                        </Pressable>
                      </View>
                    </View>
                    <RoutinePrescriptionEditor
                      key={`${item.id}:${profile.unit}`}
                      exercise={item}
                      unit={profile.unit}
                      onChange={(updates) =>
                        setEditingRoutine((prev) =>
                          prev
                            ? {
                                ...prev,
                                exercises: prev.exercises.map(
                                  (exercise, index) =>
                                    index === idx
                                      ? { ...exercise, ...updates }
                                      : exercise,
                                ),
                              }
                            : prev,
                        )
                      }
                      onValidityChange={(valid) =>
                        setInvalidExercises((prev) => ({
                          ...prev,
                          [item.id]: !valid,
                        }))
                      }
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {t.plan.noExercisesInRoutine}
              </Text>
            </View>
          )}

          {/* Mannequin Target Highlight for Routine Coverage */}
          {editingRoutine.exercises.length > 0 && (
            <View style={[styles.card, { marginTop: 14 }]}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <Text style={styles.cardHeadTitle}>{t.plan.targetMuscles}</Text>
                <View style={styles.targetBadge}>
                  <Text style={styles.targetBadgeText}>
                    {routineMuscles.primary.length}{" "}
                    {t.plan.primaryTarget}
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: "center", marginVertical: 6 }}>
                <ExerciseMannequinHighlight
                  primaryMuscles={routineMuscles.primary}
                  secondaryMuscles={routineMuscles.secondary}
                  height={200}
                />
              </View>

              {/* Muscle Chips Breakdown */}
              <View style={styles.routineMusclesChipsRow}>
                {routineMuscles.primary.map((m) => (
                  <View key={`pri-${m}`} style={styles.primaryMuscleChip}>
                    <View style={styles.primaryDot} />
                    <Text style={styles.primaryMuscleChipText}>
                      {getLocalizedMuscleName(m)}
                    </Text>
                  </View>
                ))}
                {routineMuscles.secondary.map((m) => (
                  <View key={`sec-${m}`} style={styles.secondaryMuscleChip}>
                    <View style={styles.secondaryDot} />
                    <Text style={styles.secondaryMuscleChipText}>
                      {getLocalizedMuscleName(m)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={{ marginTop: 14, gap: 10 }}>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setPickerOpen(true);
              }}
              style={styles.btnAddEx}
            >
              <Feather name="plus" size={16} color="#080C14" />
              <Text style={styles.btnAddExText}>{t.plan.addExercise}</Text>
            </Pressable>

            {!isNewRoutine && (
              <Pressable
                onPress={() => {
                  Alert.alert(
                    t.plan.deleteRoutineTitle,
                    editingRoutine.name,
                    [
                      { text: t.common.cancel, style: "cancel" },
                      {
                        text: t.common.delete,
                        style: "destructive",
                        onPress: () => {
                          deleteRoutine(editingRoutine.id);
                          setEditingRoutine(null);
                        },
                      },
                    ],
                  );
                }}
                style={styles.btnDelete}
              >
                <Feather name="trash-2" size={15} color="#EF4444" />
                <Text style={styles.btnDeleteText}>{t.common.delete}</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAwareScrollViewCompat>

        {/* Progression Policy Picker Modal */}
        <Modal
          visible={progressionModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setProgressionModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={styles.modalDim}
              onPress={() => setProgressionModalOpen(false)}
            />
            <View
              style={[
                styles.bottomSheet,
                { maxHeight: "85%", paddingBottom: insets.bottom + 20 },
              ]}
            >
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{t.plan.progressionPolicy}</Text>

              <ScrollView
                style={{ flexGrow: 0 }}
                contentContainerStyle={styles.sheetList}
                keyboardShouldPersistTaps="handled"
              >
                {PROGRESSION_POLICIES.map((opt) => {
                  const isSel = editingRoutine.progression === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        setEditingRoutine({
                          ...editingRoutine,
                          progression: opt.value,
                        });
                        setProgressionModalOpen(false);
                      }}
                      style={[
                        styles.sheetItem,
                        isSel && styles.sheetItemSelected,
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.sheetItemTitle,
                            isSel && { color: "#38BDF8" },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={styles.sheetItemSub}>{opt.desc}</Text>
                      </View>
                      {isSel && (
                        <Feather name="check" size={18} color="#38BDF8" />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* EXERCISE PICKER MODAL */}
        <Modal
          visible={pickerOpen}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setPickerOpen(false)}
        >
          <View
            style={[
              styles.screen,
              { backgroundColor: "#080C14", paddingTop: insets.top + 8 },
            ]}
          >
            <View style={styles.editHdr}>
              <Pressable
                onPress={() => setPickerOpen(false)}
                style={styles.iconBtn}
              >
                <Feather name="arrow-left" size={20} color="#FFF" />
              </Pressable>
              <Text style={styles.pickerHeaderTitle}>
                {t.plan.selectExercise}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            <View style={styles.searchBar}>
              <Feather name="search" size={16} color="#64748B" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t.common.search}
                placeholderTextColor="#64748B"
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Feather name="x" size={15} color="#94A3B8" />
                </Pressable>
              )}
            </View>

            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              windowSize={5}
              removeClippedSubviews={true}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: insets.bottom + 40,
              }}
              renderItem={({ item: ex, index }) => {
                const isLast = index === filteredExercises.length - 1;
                const imgSrc = getExerciseImageSource(
                  (ex as any).image_file,
                  (ex as any).thumbnail_url,
                );
                return (
                  <Pressable
                    key={ex.id}
                    onPress={() => handleAddEx(ex.id)}
                    style={({ pressed }) => [
                      styles.lrow,
                      { backgroundColor: "#111724" },
                      pressed && styles.lrowPressed,
                      !isLast && styles.lrowDivider,
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
                        <Feather name="crosshair" size={15} color="#38BDF8" />
                      )}
                    </View>
                    <View style={styles.lrowGrow}>
                      <Text style={styles.lrowTitle} numberOfLines={1}>
                        {getExerciseDisplayName(ex, locale)}
                      </Text>
                      <Text style={styles.lrowSub} numberOfLines={1}>
                        {getExerciseSecondaryName(ex, locale)}
                        {ex.primary_muscles
                          .map((m) => getLocalizedMuscleName(m))
                          .join(", ")}
                      </Text>
                    </View>
                    <Feather name="plus" size={16} color="#38BDF8" />
                  </Pressable>
                );
              }}
            />
          </View>
        </Modal>
      </View>
    );
  }

  // VIEW 2: MAIN PLAN SCREEN
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
          <View style={{ flex: 1 }}>
            <Text style={styles.hdrTitle}>{t.plan.title}</Text>
          </View>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleRegeneratePlan();
            }}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Feather name="refresh-cw" size={16} color="#38BDF8" />
          </Pressable>
        </View>

        {/* ACTIVE SPLIT & DAYS PER WEEK */}
        <View style={styles.splitBanner}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.splitBadgeLabel}>
                {t.plan.activeSplitBadge}
              </Text>
              <Text style={styles.splitBadgeTitle}>{splitTitle}</Text>
              <Text style={styles.splitBadgeSub}>
                {profile.workoutDuration || "60 mins"} •{" "}
                {profile.experience || "Intermediate"} •{" "}
                {profile.goal || "Hypertrophy"}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleRegeneratePlan();
              }}
              style={styles.regenBtn}
            >
              <Feather name="refresh-cw" size={12} color="#080C14" />
              <Text style={styles.regenBtnText}>
                {t.plan.resetBtn}
              </Text>
            </Pressable>
          </View>

          {/* Quick daysPerWeek frequency switcher */}
          <View style={styles.daysSelectorRow}>
            <Text style={styles.daysSelectorLabel}>
              {t.plan.frequency}
            </Text>
            <View style={styles.daysChipsContainer}>
              {[2, 3, 4, 5, 6].map((num) => {
                const isActive = (profile.daysPerWeek || 3) === num;
                return (
                  <Pressable
                    key={num}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      handleRegeneratePlan(num);
                    }}
                    style={[styles.dayChip, isActive && styles.dayChipActive]}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        isActive && styles.dayChipTextActive,
                      ]}
                    >
                      {num}
                      {t.plan.daysUnit}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* SECTION 1: WEEK SCHEDULE */}
        <View style={styles.sect}>
          <Text style={styles.sectTitle}>{t.plan.weeklySchedule}</Text>
          <View style={styles.insetList}>
            {DAYS_ORDER.map((d, index) => {
              const assignedId = weekSchedule[d];
              const r = routines.find((item) => item.id === assignedId);
              const isLast = index === DAYS_ORDER.length - 1;

              return (
                <Pressable
                  key={d}
                  onPress={() => {
                    if (!profile.isPro) {
                      void Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Warning,
                      );
                      setShowPaywall(true);
                      return;
                    }
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAssigningDay(d);
                  }}
                  style={({ pressed }) => [
                    styles.lrow,
                    pressed && styles.lrowPressed,
                    !isLast && styles.lrowDivider,
                  ]}
                >
                  <View style={{ width: 70, flexShrink: 0 }}>
                    <Text style={styles.lrowTitle}>
                      {t.plan.dayNames[d]}
                    </Text>
                  </View>
                  {r ? (
                    <View style={[styles.tagAcc, { flex: 1, minWidth: 0 }]}>
                      <Feather
                        name={(r.emoji as any) || "zap"}
                        size={12}
                        color="#38BDF8"
                      />
                      <Text
                        style={[styles.tagAccText, { flex: 1, minWidth: 0 }]}
                        numberOfLines={2}
                      >
                        {r.name}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.tagRest}>
                      <Text style={styles.tagRestText}>{t.common.rest}</Text>
                    </View>
                  )}
                  <Feather
                    name="chevron-right"
                    size={16}
                    color="#64748B"
                    style={styles.chev}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* SECTION 2: ROUTINES */}
        <View style={styles.sect}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectTitle}>{t.plan.routines}</Text>
            <Pressable
              onPress={handleCreateRoutine}
              style={styles.btnSmallTinted}
            >
              <Feather name="plus" size={13} color="#38BDF8" />
              <Text style={styles.btnSmallTintedText}>
                {t.plan.newRoutineBtn}
              </Text>
            </Pressable>
          </View>

          {routines.length > 0 ? (
            <View style={styles.insetList}>
              {routines.map((r, index) => {
                const isLast = index === routines.length - 1;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => handleOpenEdit(r)}
                    style={({ pressed }) => [
                      styles.lrow,
                      pressed && styles.lrowPressed,
                      !isLast && styles.lrowDivider,
                    ]}
                  >
                    <View style={styles.lrowIconRail}>
                      <Feather
                        name={(r.emoji as any) || "zap"}
                        size={16}
                        color="#38BDF8"
                      />
                    </View>
                    <View style={styles.lrowGrow}>
                      <Text style={styles.lrowTitle}>{r.name}</Text>
                      <Text style={styles.lrowSub}>
                        {r.exercises.length}{" "}
                        {t.plan.exercisesUnit} •{" "}
                        {r.progression.toUpperCase()}
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color="#64748B"
                      style={styles.chev}
                    />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Feather
                name="clipboard"
                size={26}
                color="#64748B"
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.emptyTitle}>
                {t.plan.noRoutines}
              </Text>
              <Pressable
                onPress={() => loadStarterPlan()}
                style={styles.btnPrimaryEmpty}
              >
                <Feather name="zap" size={14} color="#080C14" />
                <Text style={styles.btnPrimaryEmptyText}>
                  {t.plan.loadStarterPlan}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* SECTION 3: EXERCISE LIBRARY EXPLORER */}
        <View style={styles.sect}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectTitle}>
              {t.plan.exerciseLibraryTitle}
            </Text>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLibraryModalOpen(true);
              }}
              style={styles.btnSmallTinted}
            >
              <Feather name="book-open" size={13} color="#38BDF8" />
              <Text style={styles.btnSmallTintedText}>
                {t.plan.browseAll}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setLibraryModalOpen(true);
            }}
            style={styles.libraryBannerCard}
          >
            <View style={styles.libraryBannerLeft}>
              <View style={styles.libraryIconBox}>
                <Feather name="layers" size={20} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.libraryBannerTitle}>
                  {t.plan.exerciseCountFmt.replace(
                    "{count}",
                    String(EXERCISES_DATA.length),
                  )}
                </Text>
                <Text style={styles.libraryBannerSub}>
                  {t.plan.libraryCardSub}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#64748B" />
          </Pressable>
        </View>
      </ScrollView>

      {/* MODAL 1: DAY ASSIGNMENT SHEET */}
      <Modal
        visible={assigningDay !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setAssigningDay(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDim}
            onPress={() => setAssigningDay(null)}
          />
          <View
            style={[
              styles.bottomSheet,
              { maxHeight: "85%", paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {assigningDay !== null ? t.plan.dayNames[assigningDay] : ""}
            </Text>

            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.sheetList}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable
                onPress={() => {
                  if (assigningDay !== null)
                    assignWeekSchedule(assigningDay, null);
                  setAssigningDay(null);
                }}
                style={[
                  styles.sheetItem,
                  assigningDay !== null &&
                    weekSchedule[assigningDay] === null &&
                    styles.sheetItemSelected,
                ]}
              >
                <View style={styles.sheetItemIconRest}>
                  <Feather name="coffee" size={16} color="#94A3B8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetItemTitle}>{t.common.rest}</Text>
                </View>
                {assigningDay !== null &&
                  weekSchedule[assigningDay] === null && (
                    <Feather name="check" size={18} color="#38BDF8" />
                  )}
              </Pressable>

              {routines.map((r) => {
                const isSelected =
                  assigningDay !== null && weekSchedule[assigningDay] === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => {
                      if (assigningDay !== null)
                        assignWeekSchedule(assigningDay, r.id);
                      setAssigningDay(null);
                    }}
                    style={[
                      styles.sheetItem,
                      isSelected && styles.sheetItemSelected,
                    ]}
                  >
                    <View style={styles.sheetItemIcon}>
                      <Feather
                        name={(r.emoji as any) || "zap"}
                        size={16}
                        color="#38BDF8"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>{r.name}</Text>
                      <Text style={styles.sheetItemSub}>
                        {r.exercises.length} {t.plan.exercisesUnit}
                      </Text>
                    </View>
                    {isSelected && (
                      <Feather name="check" size={18} color="#38BDF8" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: EXERCISE LIBRARY BROWSER (OPEN GYM ARCHITECTURE) */}
      <Modal
        visible={libraryModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          if (routineSelectForAdd) {
            setRoutineSelectForAdd(null);
            return;
          }
          if (selectedLibraryEx) {
            setSelectedLibraryEx(null);
            return;
          }
          setLibraryModalOpen(false);
        }}
      >
        <View
          style={[
            styles.screen,
            { backgroundColor: "#080C14", paddingTop: insets.top + 8 },
          ]}
        >
          <View style={styles.editHdr}>
            <Pressable
              onPress={() => setLibraryModalOpen(false)}
              style={styles.iconBtn}
            >
              <Feather name="arrow-left" size={20} color="#FFF" />
            </Pressable>
            <Text style={styles.pickerHeaderTitle}>
              {t.plan.exerciseCountFmt.replace(
                "{count}",
                String(EXERCISES_DATA.length),
              )}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Feather name="search" size={16} color="#64748B" />
            <TextInput
              value={librarySearch}
              onChangeText={setLibrarySearch}
              placeholder={t.plan.searchExercisesPlaceholder}
              placeholderTextColor="#64748B"
              style={styles.searchInput}
            />
            {librarySearch.length > 0 && (
              <Pressable onPress={() => setLibrarySearch("")}>
                <Feather name="x" size={15} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {/* Muscle Filter Chips */}
          <View style={styles.filterChipsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              bounces={false}
              alwaysBounceVertical={false}
              contentInsetAdjustmentBehavior="never"
              style={styles.filterChipsScrollView}
              contentContainerStyle={styles.filterChipsRow}
            >
              {[
                "All",
                "Chest",
                "Back",
                "Shoulders",
                "Legs",
                "Arms",
                "Core",
              ].map((key) => {
                const isSel = libraryMuscleFilter === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );
                      setLibraryMuscleFilter(key);
                    }}
                    style={[
                      styles.filterChip,
                      isSel && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSel && styles.filterChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {t.plan.muscleFilters[key] || key}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <FlatList
            data={filteredLibraryExercises}
            keyExtractor={(item) => item.id}
            initialNumToRender={15}
            maxToRenderPerBatch={15}
            windowSize={5}
            removeClippedSubviews={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 40,
            }}
            renderItem={({ item: ex, index }) => {
              const isLast = index === filteredLibraryExercises.length - 1;
              const imgSrc = getExerciseImageSource(
                (ex as any).image_file,
                (ex as any).thumbnail_url,
              );
              return (
                <View
                  key={ex.id}
                  style={[
                    styles.lrow,
                    { backgroundColor: "#111724" },
                    !isLast && styles.lrowDivider,
                  ]}
                >
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );
                      setSelectedLibraryEx(ex);
                    }}
                    style={({ pressed }) => [
                      styles.lrowPressArea,
                      pressed && styles.lrowPressed,
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
                        {getExerciseDisplayName(ex, locale)}
                      </Text>
                      <Text style={styles.lrowSub} numberOfLines={1}>
                        {getExerciseSecondaryName(ex, locale)}
                        {ex.primary_muscles
                          .map((m) => getLocalizedMuscleName(m))
                          .join(", ")}{" "}
                        • {getLocalizedEquipment(ex.equipment)}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!profile.isPro) {
                        void Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Warning,
                        );
                        setShowPaywall(true);
                        return;
                      }
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );
                      setRoutineSelectForAdd(ex);
                    }}
                    style={styles.btnAddExSmall}
                    hitSlop={10}
                  >
                    <Feather name="plus" size={13} color="#38BDF8" />
                    <Text style={styles.btnAddExSmallText}>
                      {t.plan.planAction}
                    </Text>
                  </Pressable>
                </View>
              );
            }}
          />

          {/* OVERLAY 1: EXERCISE DETAIL IN LIBRARY */}
          {selectedLibraryEx && (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: "#080C14",
                  zIndex: 999,
                  elevation: 20,
                  paddingTop: insets.top + 8,
                },
              ]}
            >
              {/* Detail Header */}
              <View style={styles.editHdr}>
                <Pressable
                  onPress={() => setSelectedLibraryEx(null)}
                  style={styles.iconBtn}
                >
                  <Feather name="arrow-left" size={20} color="#FFF" />
                </Pressable>
                <Text style={styles.pickerHeaderTitle}>
                  {t.plan.exerciseDetailsTitle}
                </Text>
                <Pressable
                  onPress={() => setSelectedLibraryEx(null)}
                  style={styles.iconBtn}
                >
                  <Feather name="x" size={18} color="#94A3B8" />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingBottom: insets.bottom + 96,
                }}
              >
                <Text
                  style={[
                    styles.sheetTitle,
                    { fontSize: 20, marginTop: 10, marginBottom: 4 },
                  ]}
                >
                  {getExerciseDisplayName(selectedLibraryEx, locale)}
                </Text>
                <Text style={styles.sheetSub}>
                  {getExerciseSecondaryName(selectedLibraryEx, locale)}
                  {selectedLibraryEx.primary_muscles
                    .map((m) => getLocalizedMuscleName(m))
                    .join(", ")}{" "}
                  • {getLocalizedEquipment(selectedLibraryEx.equipment)}
                </Text>

                <View
                  style={{
                    alignItems: "center",
                    marginVertical: 12,
                    borderRadius: 16,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "#202A3C",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <ExerciseMedia
                    uri={
                      getExerciseGifUrl(
                        selectedLibraryEx.gif_file,
                        (selectedLibraryEx as any).motion_gif_url,
                      ) || undefined
                    }
                    primaryMuscles={selectedLibraryEx.primary_muscles}
                    secondaryMuscles={selectedLibraryEx.secondary_muscles}
                  />
                </View>

                {selectedLibraryEx.instructions &&
                  selectedLibraryEx.instructions.length > 0 && (
                    <View style={{ marginTop: 14 }}>
                      <Text
                        style={[
                          styles.sectTitle,
                          { color: "#38BDF8", marginBottom: 8, fontSize: 13 },
                        ]}
                      >
                        {t.plan.instructionsHeader}
                      </Text>
                      {selectedLibraryEx.instructions.map((inst, i) => (
                        <View
                          key={i}
                          style={{
                            flexDirection: "row",
                            marginBottom: 8,
                            gap: 10,
                            alignItems: "flex-start",
                          }}
                        >
                          <View
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              backgroundColor: "#162032",
                              alignItems: "center",
                              justifyContent: "center",
                              marginTop: 1,
                            }}
                          >
                            <Text
                              style={{
                                color: "#38BDF8",
                                fontSize: 11,
                                fontWeight: "800",
                              }}
                            >
                              {i + 1}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.instructionText,
                              { flex: 1, marginVertical: 0, lineHeight: 20 },
                            ]}
                          >
                            {inst}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
              </ScrollView>

              {/* Bottom Sticky Action Bar */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "#0D1321",
                  borderTopWidth: 1,
                  borderTopColor: "#1E293B",
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: Math.max(insets.bottom + 8, 16),
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                <Pressable
                  onPress={() => {
                    if (!profile.isPro) {
                      void Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Warning,
                      );
                      setShowPaywall(true);
                      return;
                    }
                    const ex = selectedLibraryEx;
                    setSelectedLibraryEx(null);
                    setRoutineSelectForAdd(ex);
                  }}
                  style={[styles.btnPrimaryStart, { flex: 1, marginTop: 0 }]}
                >
                  <Feather name="plus" size={15} color="#080C14" />
                  <Text style={styles.btnPrimaryStartText}>
                    {t.plan.addToRoutineAction}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedLibraryEx(null)}
                  style={[styles.btnSheetCancel, { width: 84, marginTop: 0 }]}
                >
                  <Text style={styles.btnSheetCancelText}>
                    {t.common.done}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* OVERLAY 2: SELECT ROUTINE TO ADD EXERCISE */}
          {routineSelectForAdd && (
            <View style={styles.sheetOverlay}>
              <Pressable
                style={styles.modalDim}
                onPress={() => setRoutineSelectForAdd(null)}
              />
              <View
                style={[
                  styles.bottomSheet,
                  { maxHeight: "85%", paddingBottom: insets.bottom + 20 },
                ]}
              >
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>
                  {t.plan.selectRoutineTitle}
                </Text>
                <Text style={styles.sheetSub} numberOfLines={1}>
                  {getExerciseDisplayName(routineSelectForAdd, locale)}
                </Text>

                <ScrollView
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={styles.sheetList}
                  keyboardShouldPersistTaps="handled"
                >
                  {routines.length === 0 ? (
                    <Pressable
                      style={styles.sheetItem}
                      onPress={handleCreateRoutine}
                    >
                      <Text style={styles.sheetItemTitle}>
                        {t.plan.createFirstRoutine}
                      </Text>
                    </Pressable>
                  ) : null}
                  {routines.map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() =>
                        handleAddExToRoutine(r.id, routineSelectForAdd.id)
                      }
                      style={styles.sheetItem}
                    >
                      <View style={styles.sheetItemIcon}>
                        <Feather
                          name={(r.emoji as any) || "zap"}
                          size={16}
                          color="#38BDF8"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sheetItemTitle}>{r.name}</Text>
                        <Text style={styles.sheetItemSub}>
                          {t.plan.currentRoutineExercisesFmt.replace(
                            "{count}",
                            String(r.exercises.length),
                          )}
                        </Text>
                      </View>
                      <Feather name="plus" size={16} color="#38BDF8" />
                    </Pressable>
                  ))}
                </ScrollView>

                <Pressable
                  onPress={() => setRoutineSelectForAdd(null)}
                  style={[styles.btnSheetCancel, { marginTop: 12 }]}
                >
                  <Text style={styles.btnSheetCancelText}>{t.common.cancel}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>

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
  hdr: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  hdrTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.4,
  },
  splitBanner: {
    backgroundColor: "#111724",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 14,
    marginBottom: 16,
  },
  splitBadgeLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#38BDF8",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  splitBadgeTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.2,
  },
  splitBadgeSub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
    fontFamily: "Inter_500Medium",
  },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#38BDF8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  regenBtnText: {
    color: "#080C14",
    fontSize: 12,
    fontWeight: "800",
  },
  daysSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  daysSelectorLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  daysChipsContainer: {
    flexDirection: "row",
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#162032",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  dayChipActive: {
    backgroundColor: "#38BDF8",
    borderColor: "#38BDF8",
  },
  dayChipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  dayChipTextActive: {
    color: "#080C14",
    fontWeight: "900",
  },
  iconBtn: {
    width: 48,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: "#162032",
    borderWidth: 1,
    borderColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  sect: { marginBottom: 16 },
  sectTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
    paddingHorizontal: 2,
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  btnSmallTinted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#162032",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnSmallTintedText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  insetList: {
    backgroundColor: "#111724",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    overflow: "hidden",
  },
  lrow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  lrowPressArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lrowPressed: { backgroundColor: "#162032" },
  lrowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  lrowIconRail: {
    width: 24,
    alignItems: "center",
  },
  lrowGrow: { flex: 1 },
  lrowTitle: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },
  lrowSub: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 1,
  },
  tagAcc: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#14233D",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagAccText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  tagRest: {
    backgroundColor: "#162032",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagRestText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  chev: { marginLeft: 2 },
  emptyCard: {
    backgroundColor: "#111724",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },
  btnPrimaryEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#38BDF8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnPrimaryEmptyText: { color: "#080C14", fontSize: 12, fontWeight: "900" },
  sheetOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.75)",
    zIndex: 1001,
    elevation: 30,
  },
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
    marginBottom: 12,
  },
  sheetTitle: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 10,
  },
  sheetSub: { color: "#94A3B8", fontSize: 12, marginTop: 4, marginBottom: 8 },
  sheetList: { gap: 6 },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#162032",
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  sheetItemSelected: {
    backgroundColor: "#14233D",
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  sheetItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetItemIconRest: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetItemTitle: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  sheetItemSub: { color: "#94A3B8", fontSize: 11 },
  editHdr: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  routineTitleInput: {
    flex: 1,
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    backgroundColor: "#162032",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  saveBtn: {
    backgroundColor: "#38BDF8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveBtnText: { color: "#080C14", fontSize: 12, fontWeight: "900" },
  exItemContainer: { padding: 10 },
  exItemRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  exOrderBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: "#162032",
    alignItems: "center",
    justifyContent: "center",
  },
  exOrderText: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  controlRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    justifyContent: "flex-end",
  },
  controlBtn: {
    width: 48,
    minHeight: 48,
    borderRadius: 6,
    backgroundColor: "#162032",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnActiveSS: {
    backgroundColor: "#F59E0B22",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  controlBtnDanger: {
    width: 48,
    minHeight: 48,
    borderRadius: 6,
    backgroundColor: "#EF444422",
    alignItems: "center",
    justifyContent: "center",
  },
  ssBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    paddingLeft: 28,
  },
  ssBannerText: { color: "#F59E0B", fontSize: 12, fontWeight: "800" },
  card: {
    backgroundColor: "#111724",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 12,
  },
  cardHeadTitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  btnAddEx: {
    backgroundColor: "#38BDF8",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnAddExText: { color: "#080C14", fontSize: 13, fontWeight: "900" },
  btnDelete: {
    backgroundColor: "#162032",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnDeleteText: { color: "#EF4444", fontSize: 13, fontWeight: "700" },
  pickerHeaderTitle: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111724",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 10,
    marginHorizontal: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: "#FFF", fontSize: 13 },
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
  libraryBannerCard: {
    backgroundColor: "#111724",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  libraryBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  libraryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#14233D",
    alignItems: "center",
    justifyContent: "center",
  },
  libraryBannerTitle: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  libraryBannerSub: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  filterChipsWrapper: {
    height: 44,
    marginBottom: 8,
  },
  filterChipsScrollView: {
    flex: 1,
  },
  filterChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    height: 44,
    alignItems: "center",
  },
  filterChip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#162032",
    borderWidth: 1,
    borderColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: { backgroundColor: "#38BDF8", borderColor: "#38BDF8" },
  filterChipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: { color: "#080C14", fontWeight: "900" },
  btnAddExSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#162032",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  btnAddExSmallText: { color: "#38BDF8", fontSize: 12, fontWeight: "700" },
  btnPrimaryStart: {
    backgroundColor: "#38BDF8",
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnPrimaryStartText: { color: "#080C14", fontSize: 13, fontWeight: "900" },
  btnSheetCancel: {
    backgroundColor: "#162032",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSheetCancelText: { color: "#94A3B8", fontSize: 13, fontWeight: "700" },
  instructionText: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 16,
    marginVertical: 3,
  },
  targetBadge: {
    backgroundColor: "#162032",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  targetBadgeText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
  },
  routineMusclesChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    justifyContent: "center",
  },
  primaryMuscleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.35)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  primaryMuscleChipText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
  },
  secondaryMuscleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  secondaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#38BDF8",
  },
  secondaryMuscleChipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
});
