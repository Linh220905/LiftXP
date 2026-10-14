import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppState, type Routine } from '@/context/AppState';
import { ExerciseMannequinHighlight } from '@/components/ExerciseMannequinHighlight';
import { MUSCLE_NAMES, type MuscleSlug } from '@/lib/muscles';
import { type ProgressionPolicy } from '@/lib/progression';
import { getExerciseImageSource } from '@/lib/exerciseAssets';
import { useI18n } from '@/lib/i18n';
import { formatWeight, weightUnitLabel } from '@/lib/units';

// Exercise Database
import EXERCISES_DATA from '../../../../data/exercises_supabase_seed.json';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const { routines, weekSchedule, assignWeekSchedule, addRoutine, updateRoutine, deleteRoutine, loadStarterPlan, profile, updateProfile } = useAppState();
  const { t, locale } = useI18n();

  const splitTitle = useMemo(() => {
    const days = profile.daysPerWeek || 3;
    if (days === 2) return locale === 'vi' ? 'Full Body Split (2 buổi/tuần)' : 'Full Body Split (2 days/wk)';
    if (days === 3) return locale === 'vi' ? 'Push / Pull / Legs (3 buổi/tuần)' : 'Push / Pull / Legs (3 days/wk)';
    if (days === 4) return locale === 'vi' ? 'Upper / Lower Split (4 buổi/tuần)' : 'Upper / Lower Split (4 days/wk)';
    if (days === 5) return locale === 'vi' ? 'PPL + Upper/Lower (5 buổi/tuần)' : 'PPL + Upper/Lower (5 days/wk)';
    return locale === 'vi' ? 'PPL High Volume (6 buổi/tuần)' : 'PPL High Volume (6 days/wk)';
  }, [profile.daysPerWeek, locale]);

  const handleRegeneratePlan = (overrideDays?: number) => {
    const targetDays = overrideDays ?? profile.daysPerWeek ?? 3;
    const replace = () => loadStarterPlan({ ...profile, daysPerWeek: targetDays });
    if (routines.length === 0) {
      replace();
      return;
    }
    Alert.alert(
      locale === 'vi' ? 'Tạo lại giáo án?' : 'Replace your plan?',
      locale === 'vi'
        ? `Tạo lại giáo án tối ưu cho ${targetDays} buổi/tuần? Lịch hiện tại sẽ được thay thế.`
        : `Generate new plan tailored for ${targetDays} days/week? Current routines will be replaced.`,
      [
        { text: locale === 'vi' ? 'Hủy' : 'Cancel', style: 'cancel' },
        { text: locale === 'vi' ? 'Tạo lại' : 'Replace', style: 'destructive', onPress: replace },
      ],
    );
  };

  // Day Assignment Sheet
  const [assigningDay, setAssigningDay] = useState<number | null>(null);

  // Routine Editor Sheet
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [isNewRoutine, setIsNewRoutine] = useState(false);

  // Exercise Picker Modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [progressionModalOpen, setProgressionModalOpen] = useState(false);

  // Exercise Library Modal (Inspired by OpenGym Library.jsx)
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [selectedLibraryEx, setSelectedLibraryEx] = useState<(typeof EXERCISES_DATA)[0] | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState('All');
  const [libraryEquipmentFilter, setLibraryEquipmentFilter] = useState('All');
  const [routineSelectForAdd, setRoutineSelectForAdd] = useState<(typeof EXERCISES_DATA)[0] | null>(null);

  const PROGRESSION_POLICIES: { value: ProgressionPolicy; label: string; desc: string }[] = [
    { value: 'linear', label: t.progression.linear, desc: t.progression.linearDesc },
    { value: 'greyskull', label: t.progression.greyskull, desc: t.progression.greyskullDesc },
    { value: 'double', label: t.progression.double, desc: t.progression.doubleDesc },
    { value: 'off', label: t.progression.off, desc: t.progression.offDesc },
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
    if (libraryMuscleFilter !== 'All') {
      const mf = libraryMuscleFilter.toLowerCase();
      list = list.filter((e) =>
        e.primary_muscles.some((m) => m.toLowerCase().includes(mf)) ||
        (e.category && e.category.toLowerCase().includes(mf))
      );
    }
    if (libraryEquipmentFilter !== 'All') {
      const ef = libraryEquipmentFilter.toLowerCase();
      list = list.filter((e) => e.equipment && e.equipment.toLowerCase().includes(ef));
    }
    if (librarySearch.trim()) {
      const q = librarySearch.toLowerCase();
      list = list.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (e.name_vi && e.name_vi.toLowerCase().includes(q)) ||
        e.primary_muscles.some((m) => m.toLowerCase().includes(q))
      );
    }
    return list;
  }, [librarySearch, libraryMuscleFilter, libraryEquipmentFilter]);

  const routineMuscles = useMemo(() => {
    if (!editingRoutine || !editingRoutine.exercises || editingRoutine.exercises.length === 0) {
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

    const secondaryFiltered = Array.from(secondarySet).filter((m) => !primarySet.has(m));

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
      targetWeight: 40,
    };
    updateRoutine(routineId, {
      exercises: [...routine.exercises, newEx],
    });
    setRoutineSelectForAdd(null);
  };

  const handleCreateRoutine = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsNewRoutine(true);
    setEditingRoutine({
      id: '',
      name: t.plan.createRoutine,
      emoji: 'activity',
      progression: 'linear',
      exercises: [],
    });
  };

  const handleOpenEdit = (routine: Routine) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsNewRoutine(false);
    setEditingRoutine(JSON.parse(JSON.stringify(routine)));
  };

  const handleSaveRoutine = () => {
    if (!editingRoutine || !editingRoutine.name.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isNewRoutine) {
      addRoutine({
        name: editingRoutine.name,
        emoji: editingRoutine.emoji || 'zap',
        progression: editingRoutine.progression || 'linear',
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExList = [
      ...editingRoutine.exercises,
      {
        id: exId,
        sets: 3,
        reps: 10,
        targetWeight: 40,
      },
    ];
    setEditingRoutine({ ...editingRoutine, exercises: newExList });
    setPickerOpen(false);
  };

  const handleRemoveEx = (index: number) => {
    if (!editingRoutine) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = editingRoutine.exercises.filter((_, i) => i !== index);
    setEditingRoutine({ ...editingRoutine, exercises: updated });
  };

  const handleMoveEx = (fromIndex: number, direction: -1 | 1) => {
    if (!editingRoutine) return;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= editingRoutine.exercises.length) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const list = [...editingRoutine.exercises];
    const item = list.splice(fromIndex, 1)[0];
    list.splice(toIndex, 0, item);
    setEditingRoutine({ ...editingRoutine, exercises: list });
  };

  const handleToggleSuperset = (idx: number) => {
    if (!editingRoutine || idx === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const list = [...editingRoutine.exercises];
    const current = list[idx];
    const prev = list[idx - 1];

    if (current.supersetId && current.supersetId === prev.supersetId) {
      current.supersetId = undefined;
    } else {
      const ssId = prev.supersetId || `ss_${Date.now()}`;
      prev.supersetId = ssId;
      current.supersetId = ssId;
    }
    setEditingRoutine({ ...editingRoutine, exercises: list });
  };

  const getLocalizedMuscleName = (slug: string) => {
    const info = MUSCLE_NAMES[slug as MuscleSlug];
    if (!info) return slug;
    return locale === 'vi' ? info.vi : info.en;
  };

  // VIEW 1: ROUTINE BUILDER / EDITOR
  if (editingRoutine) {
    return (
      <View style={[styles.screen, { backgroundColor: '#080C14', paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={styles.editHdr}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEditingRoutine(null);
            }}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={locale === 'vi' ? 'Đóng chỉnh sửa routine' : 'Close routine editor'}
          >
            <Feather name="chevron-left" size={20} color="#FFF" />
          </Pressable>
          <TextInput
            value={editingRoutine.name}
            onChangeText={(val) => setEditingRoutine({ ...editingRoutine, name: val })}
            placeholder={t.plan.routineName}
            placeholderTextColor="#64748B"
            accessibilityLabel={locale === 'vi' ? 'Tên routine' : 'Routine name'}
            style={styles.routineTitleInput}
          />
          <Pressable onPress={handleSaveRoutine} accessibilityRole="button" accessibilityLabel={t.common.save} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{t.common.save}</Text>
          </Pressable>
        </View>

        <ScrollView
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
              accessibilityLabel={locale === 'vi' ? 'Chọn chính sách tăng tiến' : 'Choose progression policy'}
            >
              <View style={styles.lrowIconRail}>
                <Feather name="trending-up" size={16} color="#38BDF8" />
              </View>
              <View style={styles.lrowGrow}>
                <Text style={styles.lrowTitle}>{t.plan.progressionPolicy}</Text>
                <Text style={styles.lrowSub}>
                  {PROGRESSION_POLICIES.find((p) => p.value === editingRoutine.progression)?.label || 'Linear'}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color="#64748B" style={styles.chev} />
            </Pressable>
          </View>

          {/* Exercises Inset List */}
          <Text style={[styles.sectTitle, { marginTop: 14, marginBottom: 6 }]}>{t.plan.routines}</Text>

          {editingRoutine.exercises.length > 0 ? (
            <View style={styles.insetList}>
              {editingRoutine.exercises.map((item, idx) => {
                const ex = exMap.get(item.id);
                const isLast = idx === editingRoutine.exercises.length - 1;
                const prev = idx > 0 ? editingRoutine.exercises[idx - 1] : null;
                const linkedPrev = idx > 0 && item.supersetId && prev?.supersetId === item.supersetId;

                return (
                  <View key={idx} style={[styles.exItemContainer, !isLast && styles.lrowDivider]}>
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
                          {ex?.name_vi ? `${ex.name_vi} · ` : ''}{item.sets} {t.common.sets} × {item.reps} reps @ {formatWeight(item.targetWeight ?? 40, profile.unit, 1)} {weightUnitLabel(profile.unit)}
                        </Text>
                      </View>

                      {/* Control Rail */}
                      <View style={styles.controlRail}>
                        {idx > 0 && (
                          <Pressable
                            onPress={() => handleToggleSuperset(idx)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: Boolean(linkedPrev) }}
                            accessibilityLabel={locale === 'vi' ? `Ghép siêu hiệp cho bài ${idx + 1}` : `Toggle superset for exercise ${idx + 1}`}
                            style={[styles.controlBtn, linkedPrev && styles.controlBtnActiveSS]}
                          >
                            <Feather name="link" size={13} color={linkedPrev ? '#F59E0B' : '#94A3B8'} />
                          </Pressable>
                        )}
                        <Pressable onPress={() => handleMoveEx(idx, -1)} accessibilityRole="button" accessibilityLabel={locale === 'vi' ? `Di chuyển bài ${idx + 1} lên` : `Move exercise ${idx + 1} up`} style={styles.controlBtn}>
                          <Feather name="chevron-up" size={14} color="#94A3B8" />
                        </Pressable>
                        <Pressable onPress={() => handleMoveEx(idx, 1)} accessibilityRole="button" accessibilityLabel={locale === 'vi' ? `Di chuyển bài ${idx + 1} xuống` : `Move exercise ${idx + 1} down`} style={styles.controlBtn}>
                          <Feather name="chevron-down" size={14} color="#94A3B8" />
                        </Pressable>
                        <Pressable onPress={() => handleRemoveEx(idx)} accessibilityRole="button" accessibilityLabel={locale === 'vi' ? `Xóa bài ${idx + 1}` : `Remove exercise ${idx + 1}`} style={styles.controlBtnDanger}>
                          <Feather name="trash-2" size={13} color="#EF4444" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Chưa có bài tập trong giáo án</Text>
            </View>
          )}

          {/* Mannequin Target Highlight for Routine Coverage */}
          {editingRoutine.exercises.length > 0 && (
            <View style={[styles.card, { marginTop: 14 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.cardHeadTitle}>{t.plan.targetMuscles}</Text>
                <View style={styles.targetBadge}>
                  <Text style={styles.targetBadgeText}>
                    {routineMuscles.primary.length} {locale === 'vi' ? 'nhóm chính' : 'primary'}
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: 'center', marginVertical: 6 }}>
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
                    <Text style={styles.primaryMuscleChipText}>{getLocalizedMuscleName(m)}</Text>
                  </View>
                ))}
                {routineMuscles.secondary.map((m) => (
                  <View key={`sec-${m}`} style={styles.secondaryMuscleChip}>
                    <View style={styles.secondaryDot} />
                    <Text style={styles.secondaryMuscleChipText}>{getLocalizedMuscleName(m)}</Text>
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
                  deleteRoutine(editingRoutine.id);
                  setEditingRoutine(null);
                }}
                style={styles.btnDelete}
              >
                <Feather name="trash-2" size={15} color="#EF4444" />
                <Text style={styles.btnDeleteText}>{t.common.delete}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        {/* Progression Policy Picker Modal */}
        <Modal visible={progressionModalOpen} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <Pressable style={styles.modalDim} onPress={() => setProgressionModalOpen(false)} />
            <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{t.plan.progressionPolicy}</Text>

              <View style={styles.sheetList}>
                {PROGRESSION_POLICIES.map((opt) => {
                  const isSel = editingRoutine.progression === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        setEditingRoutine({ ...editingRoutine, progression: opt.value });
                        setProgressionModalOpen(false);
                      }}
                      style={[styles.sheetItem, isSel && styles.sheetItemSelected]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sheetItemTitle, isSel && { color: '#38BDF8' }]}>{opt.label}</Text>
                        <Text style={styles.sheetItemSub}>{opt.desc}</Text>
                      </View>
                      {isSel && <Feather name="check" size={18} color="#38BDF8" />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        {/* EXERCISE PICKER MODAL */}
        <Modal visible={pickerOpen} animationType="slide" transparent={false}>
          <View style={[styles.screen, { backgroundColor: '#080C14', paddingTop: insets.top + 8 }]}>
            <View style={styles.editHdr}>
              <Pressable onPress={() => setPickerOpen(false)} style={styles.iconBtn}>
                <Feather name="arrow-left" size={20} color="#FFF" />
              </Pressable>
              <Text style={styles.pickerHeaderTitle}>{t.plan.selectExercise}</Text>
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
                <Pressable onPress={() => setSearchQuery('')}>
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
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
              renderItem={({ item: ex, index }) => {
                const isLast = index === filteredExercises.length - 1;
                const imgSrc = getExerciseImageSource((ex as any).image_file, (ex as any).thumbnail_url);
                return (
                  <Pressable
                    key={ex.id}
                    onPress={() => handleAddEx(ex.id)}
                    style={({ pressed }) => [
                      styles.lrow,
                      { backgroundColor: '#111724' },
                      pressed && styles.lrowPressed,
                      !isLast && styles.lrowDivider,
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
                        <Feather name="crosshair" size={15} color="#38BDF8" />
                      )}
                    </View>
                    <View style={styles.lrowGrow}>
                      <Text style={styles.lrowTitle} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Text style={styles.lrowSub} numberOfLines={1}>
                        {ex.name_vi ? `${ex.name_vi} · ` : ''}{ex.primary_muscles.map((m) => getLocalizedMuscleName(m)).join(', ')}
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
                {locale === 'vi' ? 'GIÁO ÁN ĐANG ÁP DỤNG' : 'ACTIVE TRAINING SPLIT'}
              </Text>
              <Text style={styles.splitBadgeTitle}>{splitTitle}</Text>
              <Text style={styles.splitBadgeSub}>
                {profile.workoutDuration || '60 mins'} • {profile.experience || 'Intermediate'} • {profile.goal || 'Hypertrophy'}
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
              <Text style={styles.regenBtnText}>{locale === 'vi' ? 'Tạo lại' : 'Reset'}</Text>
            </Pressable>
          </View>

          {/* Quick daysPerWeek frequency switcher */}
          <View style={styles.daysSelectorRow}>
            <Text style={styles.daysSelectorLabel}>
              {locale === 'vi' ? 'Tần suất / tuần:' : 'Frequency:'}
            </Text>
            <View style={styles.daysChipsContainer}>
              {[2, 3, 4, 5, 6].map((num) => {
                const isActive = (profile.daysPerWeek || 3) === num;
                return (
                  <Pressable
                    key={num}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      updateProfile({ daysPerWeek: num });
                      handleRegeneratePlan(num);
                    }}
                    style={[styles.dayChip, isActive && styles.dayChipActive]}
                  >
                    <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                      {num}{locale === 'vi' ? 'b' : 'd'}
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
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAssigningDay(d);
                  }}
                  style={({ pressed }) => [
                    styles.lrow,
                    pressed && styles.lrowPressed,
                    !isLast && styles.lrowDivider,
                  ]}
                >
                  <View style={styles.lrowGrow}>
                    <Text style={styles.lrowTitle}>
                      {locale === 'vi'
                        ? d === 0
                          ? 'Chủ Nhật'
                          : `Thứ ${d + 1}`
                        : DAY_NAMES[d]}
                    </Text>
                  </View>
                  {r ? (
                    <View style={styles.tagAcc}>
                      <Feather name={r.emoji as any || 'zap'} size={12} color="#38BDF8" />
                      <Text style={styles.tagAccText} numberOfLines={1}>
                        {r.name}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.tagRest}>
                      <Text style={styles.tagRestText}>{t.common.rest}</Text>
                    </View>
                  )}
                  <Feather name="chevron-right" size={16} color="#64748B" style={styles.chev} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* SECTION 2: ROUTINES */}
        <View style={styles.sect}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectTitle}>{t.plan.routines}</Text>
            <Pressable onPress={handleCreateRoutine} style={styles.btnSmallTinted}>
              <Feather name="plus" size={13} color="#38BDF8" />
              <Text style={styles.btnSmallTintedText}>{locale === 'vi' ? 'Tạo mới' : 'New'}</Text>
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
                      <Feather name={r.emoji as any || 'zap'} size={16} color="#38BDF8" />
                    </View>
                    <View style={styles.lrowGrow}>
                      <Text style={styles.lrowTitle}>{r.name}</Text>
                      <Text style={styles.lrowSub}>
                        {r.exercises.length} bài • {r.progression.toUpperCase()}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#64748B" style={styles.chev} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Feather name="clipboard" size={26} color="#64748B" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>Chưa có giáo án</Text>
              <Pressable onPress={() => loadStarterPlan()} style={styles.btnPrimaryEmpty}>
                <Feather name="zap" size={14} color="#080C14" />
                <Text style={styles.btnPrimaryEmptyText}>{t.plan.loadStarterPlan}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* SECTION 3: EXERCISE LIBRARY EXPLORER */}
        <View style={styles.sect}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectTitle}>{locale === 'vi' ? 'THƯ VIỆN BÀI TẬP' : 'EXERCISE LIBRARY'}</Text>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLibraryModalOpen(true);
              }}
              style={styles.btnSmallTinted}
            >
              <Feather name="book-open" size={13} color="#38BDF8" />
              <Text style={styles.btnSmallTintedText}>{locale === 'vi' ? 'Khám phá tất cả' : 'Browse All'}</Text>
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
                  {locale === 'vi' ? '1,324+ Bài tập Gym chuẩn' : '1,324+ Exercise Database'}
                </Text>
                <Text style={styles.libraryBannerSub}>
                  {locale === 'vi' ? 'Minh họa cơ bắp 3D, hướng dẫn form & phân loại chuẩn' : '3D muscle maps, form cues & equipment'}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#64748B" />
          </Pressable>
        </View>
      </ScrollView>

      {/* MODAL 1: DAY ASSIGNMENT SHEET */}
      <Modal visible={assigningDay !== null} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDim} onPress={() => setAssigningDay(null)} />
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {assigningDay !== null
                ? locale === 'vi'
                  ? assigningDay === 0
                    ? 'Chủ Nhật'
                    : `Thứ ${assigningDay + 1}`
                  : DAY_NAMES[assigningDay]
                : ''}
            </Text>

            <View style={styles.sheetList}>
              <Pressable
                onPress={() => {
                  if (assigningDay !== null) assignWeekSchedule(assigningDay, null);
                  setAssigningDay(null);
                }}
                style={[
                  styles.sheetItem,
                  assigningDay !== null && weekSchedule[assigningDay] === null && styles.sheetItemSelected,
                ]}
              >
                <View style={styles.sheetItemIconRest}>
                  <Feather name="coffee" size={16} color="#94A3B8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetItemTitle}>{t.common.rest}</Text>
                </View>
                {assigningDay !== null && weekSchedule[assigningDay] === null && (
                  <Feather name="check" size={18} color="#38BDF8" />
                )}
              </Pressable>

              {routines.map((r) => {
                const isSelected = assigningDay !== null && weekSchedule[assigningDay] === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => {
                      if (assigningDay !== null) assignWeekSchedule(assigningDay, r.id);
                      setAssigningDay(null);
                    }}
                    style={[styles.sheetItem, isSelected && styles.sheetItemSelected]}
                  >
                    <View style={styles.sheetItemIcon}>
                      <Feather name={r.emoji as any || 'zap'} size={16} color="#38BDF8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>{r.name}</Text>
                      <Text style={styles.sheetItemSub}>{r.exercises.length} bài</Text>
                    </View>
                    {isSelected && <Feather name="check" size={18} color="#38BDF8" />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: EXERCISE LIBRARY BROWSER (OPEN GYM ARCHITECTURE) */}
      <Modal visible={libraryModalOpen} animationType="slide" transparent={false}>
        <View style={[styles.screen, { backgroundColor: '#080C14', paddingTop: insets.top + 8 }]}>
          <View style={styles.editHdr}>
            <Pressable
              onPress={() => setLibraryModalOpen(false)}
              style={styles.iconBtn}
            >
              <Feather name="arrow-left" size={20} color="#FFF" />
            </Pressable>
            <Text style={styles.pickerHeaderTitle}>
              {locale === 'vi' ? 'Thư viện bài tập (1,324)' : 'Exercise Library (1,324)'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Feather name="search" size={16} color="#64748B" />
            <TextInput
              value={librarySearch}
              onChangeText={setLibrarySearch}
              placeholder={locale === 'vi' ? 'Tìm bài tập, nhóm cơ...' : 'Search exercises, muscles...'}
              placeholderTextColor="#64748B"
              style={styles.searchInput}
            />
            {librarySearch.length > 0 && (
              <Pressable onPress={() => setLibrarySearch('')}>
                <Feather name="x" size={15} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {/* Muscle Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={styles.filterChipsRow}
          >
            {['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map((m) => {
              const isSel = libraryMuscleFilter === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLibraryMuscleFilter(m);
                  }}
                  style={[styles.filterChip, isSel && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>
                    {m === 'All' ? (locale === 'vi' ? 'Tất cả cơ' : 'All Muscles') : m}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <FlatList
            data={filteredLibraryExercises}
            keyExtractor={(item) => item.id}
            initialNumToRender={15}
            maxToRenderPerBatch={15}
            windowSize={5}
            removeClippedSubviews={true}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
            renderItem={({ item: ex, index }) => {
              const isLast = index === filteredLibraryExercises.length - 1;
              const imgSrc = getExerciseImageSource((ex as any).image_file, (ex as any).thumbnail_url);
              return (
                <Pressable
                  key={ex.id}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedLibraryEx(ex);
                  }}
                  style={({ pressed }) => [
                    styles.lrow,
                    { backgroundColor: '#111724' },
                    pressed && styles.lrowPressed,
                    !isLast && styles.lrowDivider,
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
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRoutineSelectForAdd(ex);
                    }}
                    style={styles.btnAddExSmall}
                    hitSlop={8}
                  >
                    <Feather name="plus" size={13} color="#38BDF8" />
                    <Text style={styles.btnAddExSmallText}>{locale === 'vi' ? 'Thêm' : 'Plan'}</Text>
                  </Pressable>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>

      {/* MODAL 3: EXERCISE DETAIL IN LIBRARY */}
      {selectedLibraryEx && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <Pressable style={styles.modalDim} onPress={() => setSelectedLibraryEx(null)} />
            <View style={[styles.bottomSheet, { maxHeight: '85%', paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>
                {selectedLibraryEx.name}
              </Text>
              <Text style={styles.sheetSub}>
                {selectedLibraryEx.name_vi ? `${selectedLibraryEx.name_vi} · ` : ''}{selectedLibraryEx.primary_muscles.map((m) => getLocalizedMuscleName(m)).join(', ')} • {selectedLibraryEx.equipment}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
                <View style={{ alignItems: 'center', marginVertical: 6 }}>
                  <ExerciseMannequinHighlight
                    primaryMuscles={selectedLibraryEx.primary_muscles}
                    secondaryMuscles={selectedLibraryEx.secondary_muscles}
                    height={190}
                  />
                </View>

                {selectedLibraryEx.instructions && selectedLibraryEx.instructions.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={[styles.sectTitle, { color: '#38BDF8', marginBottom: 6 }]}>
                      {locale === 'vi' ? 'HƯỚNG DẪN KỸ THUẬT (FORM)' : 'INSTRUCTIONS'}
                    </Text>
                    {selectedLibraryEx.instructions.map((inst, i) => (
                      <Text key={i} style={styles.instructionText}>
                        {i + 1}. {inst}
                      </Text>
                    ))}
                  </View>
                )}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <Pressable
                  onPress={() => {
                    const ex = selectedLibraryEx;
                    setSelectedLibraryEx(null);
                    setRoutineSelectForAdd(ex);
                  }}
                  style={[styles.btnPrimaryStart, { flex: 1, marginTop: 0 }]}
                >
                  <Feather name="plus" size={14} color="#080C14" />
                  <Text style={styles.btnPrimaryStartText}>
                    {locale === 'vi' ? 'Thêm vào lịch tập' : 'Add to Routine'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedLibraryEx(null)}
                  style={[styles.btnSheetCancel, { flex: 1, marginTop: 0 }]}
                >
                  <Text style={styles.btnSheetCancelText}>{t.common.done}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 4: SELECT ROUTINE TO ADD EXERCISE */}
      {routineSelectForAdd && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <Pressable style={styles.modalDim} onPress={() => setRoutineSelectForAdd(null)} />
            <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>
                {locale === 'vi' ? 'Chọn lịch tập để thêm' : 'Add to Routine'}
              </Text>
              <Text style={styles.sheetSub} numberOfLines={1}>
                {routineSelectForAdd.name}
              </Text>

              <View style={styles.sheetList}>
                {routines.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => handleAddExToRoutine(r.id, routineSelectForAdd.id)}
                    style={styles.sheetItem}
                  >
                    <View style={styles.sheetItemIcon}>
                      <Feather name={r.emoji as any || 'zap'} size={16} color="#38BDF8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>{r.name}</Text>
                      <Text style={styles.sheetItemSub}>{r.exercises.length} bài hiện có</Text>
                    </View>
                    <Feather name="plus" size={16} color="#38BDF8" />
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={() => setRoutineSelectForAdd(null)} style={[styles.btnSheetCancel, { marginTop: 12 }]}>
                <Text style={styles.btnSheetCancelText}>{t.common.cancel}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  hdrTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.4,
  },
  splitBanner: {
    backgroundColor: '#111724',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    marginBottom: 16,
  },
  splitBadgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  splitBadgeTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.2,
  },
  splitBadgeSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  regenBtnText: {
    color: '#080C14',
    fontSize: 11,
    fontWeight: '800',
  },
  daysSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  daysSelectorLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  daysChipsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#162032',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  dayChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  dayChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  dayChipTextActive: {
    color: '#080C14',
    fontWeight: '900',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#162032',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sect: { marginBottom: 16 },
  sectTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    paddingHorizontal: 2,
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  btnSmallTinted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#162032',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnSmallTintedText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  insetList: {
    backgroundColor: '#111724',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  lrow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  lrowPressed: { backgroundColor: '#162032' },
  lrowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  lrowIconRail: {
    width: 24,
    alignItems: 'center',
  },
  lrowGrow: { flex: 1 },
  lrowTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  lrowSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  tagAcc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#14233D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagAccText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  tagRest: {
    backgroundColor: '#162032',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagRestText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  chev: { marginLeft: 2 },
  emptyCard: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: '#FFF', fontSize: 13, fontWeight: '800', marginBottom: 10 },
  btnPrimaryEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnPrimaryEmptyText: { color: '#080C14', fontSize: 12, fontWeight: '900' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  modalDim: { flex: 1 },
  bottomSheet: {
    backgroundColor: '#111724',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
  },
  sheetHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: { color: '#FFF', fontSize: 17, fontWeight: '800', marginBottom: 10 },
  sheetSub: { color: '#94A3B8', fontSize: 12, marginTop: 4, marginBottom: 8 },
  sheetList: { gap: 6 },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162032',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  sheetItemSelected: {
    backgroundColor: '#14233D',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  sheetItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetItemIconRest: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetItemTitle: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  sheetItemSub: { color: '#64748B', fontSize: 11 },
  editHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  routineTitleInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    backgroundColor: '#162032',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  saveBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveBtnText: { color: '#080C14', fontSize: 12, fontWeight: '900' },
  exItemContainer: { padding: 10 },
  exItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exOrderBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#162032',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exOrderText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  controlRail: { flexDirection: 'row', gap: 4 },
  controlBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#162032',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnActiveSS: { backgroundColor: '#F59E0B22', borderWidth: 1, borderColor: '#F59E0B' },
  controlBtnDanger: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#EF444422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ssBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    paddingLeft: 28,
  },
  ssBannerText: { color: '#F59E0B', fontSize: 9, fontWeight: '800' },
  card: {
    backgroundColor: '#111724',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
  },
  cardHeadTitle: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  btnAddEx: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnAddExText: { color: '#080C14', fontSize: 13, fontWeight: '900' },
  btnDelete: {
    backgroundColor: '#162032',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnDeleteText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  pickerHeaderTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    marginHorizontal: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13 },
  lrowThumbRail: { width: 34, height: 34, borderRadius: 6, overflow: 'hidden', backgroundColor: '#162032', alignItems: 'center', justifyContent: 'center' },
  searchThumbImg: { width: 34, height: 34 },
  libraryBannerCard: {
    backgroundColor: '#111724',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  libraryBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  libraryIconBox: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#14233D', alignItems: 'center', justifyContent: 'center' },
  libraryBannerTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  libraryBannerSub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  filterChipsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#162032',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  filterChipText: { color: '#94A3B8', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  filterChipTextActive: { color: '#080C14', fontWeight: '900' },
  btnAddExSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#162032', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#1E293B' },
  btnAddExSmallText: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
  btnPrimaryStart: { backgroundColor: '#38BDF8', borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnPrimaryStartText: { color: '#080C14', fontSize: 13, fontWeight: '900' },
  btnSheetCancel: { backgroundColor: '#162032', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnSheetCancelText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  instructionText: { color: '#CBD5E1', fontSize: 11, lineHeight: 16, marginVertical: 3 },
  targetBadge: {
    backgroundColor: '#162032',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  targetBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  routineMusclesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    justifyContent: 'center',
  },
  primaryMuscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  primaryMuscleChipText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  secondaryMuscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  secondaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  secondaryMuscleChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
});
