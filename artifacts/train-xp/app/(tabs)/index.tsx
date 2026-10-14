import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressBar } from '@/components/ProgressBar';
import { DualMannequinFocusPicker, type FocusArea } from '@/components/DualMannequinFocusPicker';
import { useAppState } from '@/context/AppState';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/lib/i18n';
import { displayWeightToKg, formatWeight, localDateKey, weightUnitLabel } from '@/lib/units';

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { stats, profile, routines, weekSchedule, workoutsHistory, logBodyweight, updateProfile } = useAppState();
  const { t, locale } = useI18n();
  const progress = Math.min(1, stats.xp / stats.xpToNext);

  // Weight Log Modal State
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState(formatWeight(profile.weight || 68, profile.unit, 1));

  // Today Routine
  const todayIdx = new Date().getDay();
  const todayRoutineId = weekSchedule[todayIdx];
  const todayRoutine = routines.find((r) => r.id === todayRoutineId);

  const handleToggleMuscle = (area: FocusArea) => {
    const current = profile.targetMuscles && profile.targetMuscles.length > 0
      ? profile.targetMuscles
      : [];

    let updated: string[];
    if (area === 'Full body') {
      updated = current.includes('Full body') ? [] : ['Full body'];
    } else {
      const filtered = current.filter((a) => a !== 'Full body');
      if (filtered.includes(area)) {
        updated = filtered.filter((a) => a !== area);
      } else {
        updated = [...filtered, area];
      }
    }
    updateProfile({ targetMuscles: updated });
  };

  const handleSaveWeight = () => {
    const val = Number(newWeightInput.trim().replace(',', '.'));
    const kg = displayWeightToKg(val, profile.unit);
    if (Number.isFinite(kg) && kg >= 15 && kg <= 300) {
      logBodyweight(kg);
      setShowWeightModal(false);
      return;
    }
    Alert.alert(locale === 'vi' ? 'Cân nặng không hợp lệ' : 'Invalid weight', locale === 'vi' ? 'Nhập cân nặng từ 15 đến 300 kg.' : 'Enter a weight between 15 and 300 kg.');
  };

  // 7-day strip calculation for current week
  const weekStrip = useMemo(() => {
    const today = new Date();
    const currentDayIdx = (today.getDay() + 6) % 7; // Mon = 0, Sun = 6
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDayIdx);

    return DAYS_SHORT.map((dayName, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const isToday = idx === currentDayIdx;
      const actualDayOfWeek = (idx + 1) % 7; // 1=Mon...6=Sat, 0=Sun
      const isPlanned = weekSchedule[actualDayOfWeek] !== null;
      const dateKey = localDateKey(d);
      const isDone = workoutsHistory.some((workout) => localDateKey(new Date(workout.date)) === dateKey);
      return {
        name: dayName,
        date: d.getDate(),
        isToday,
        isDone,
        isPlanned,
      };
    });
  }, [workoutsHistory, weekSchedule]);

  const kickerText = useMemo(() => {
    switch (profile.thinkAboutFitness) {
      case 'All The Time':
        return locale === 'vi' ? 'KỶ LUẬT THÉP • KHÔNG THỎA HIỆP' : 'IRON DISCIPLINE • UNCOMPROMISING';
      case 'Often':
        return locale === 'vi' ? 'TRUNG TÂM HUẤN LUYỆN • BỨT PHÁ GIỚI HẠN' : 'TRAINING HUB • BREAKING LIMITS';
      case 'Sometimes':
      case 'Never':
        return locale === 'vi' ? 'HÀNH TRÌNH TỪNG BƯỚC • BẮT ĐẦU NGAY' : 'STEP BY STEP • START NOW';
      default:
        return t.home.trainingHub;
    }
  }, [profile.thinkAboutFitness, locale, t.home.trainingHub]);

  return (
    <View style={[styles.screen, { backgroundColor: '#080C14' }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 98 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{kickerText}</Text>
            <Text style={styles.greeting}>{t.home.readyPrompt} {profile.name || 'Lifter'}?</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile.name || 'L').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* 7-DAY SCHEDULE STRIP */}
        <Pressable onPress={() => router.push('/(tabs)/plan')} style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <View>
              <Text style={styles.weekTitle}>{t.plan.weeklySchedule}</Text>
              <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, fontFamily: 'PlusJakartaSans_500Medium' }}>
                {locale === 'vi' ? `Mục tiêu: ${profile.daysPerWeek || 3} buổi/tuần` : `Goal: ${profile.daysPerWeek || 3} days/wk`}
              </Text>
            </View>
            <Text style={styles.weekSub} numberOfLines={1}>
              {locale === 'vi'
                ? `Chuỗi ${stats.streak}/${profile.streakCommitment || 30} ngày`
                : `${stats.streak}/${profile.streakCommitment || 30}d Streak`}
            </Text>
          </View>
          <View style={styles.weekRow}>
            {weekStrip.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.dayBox,
                  item.isToday && styles.dayBoxToday,
                ]}
              >
                <Text style={[styles.dayName, item.isToday && styles.dayNameToday]}>{item.name}</Text>
                <Text style={[styles.dayDate, item.isToday && styles.dayDateToday]}>{item.date}</Text>
                <View
                  style={[
                    styles.dayDot,
                    item.isDone
                      ? styles.dayDotDone
                      : item.isPlanned
                      ? styles.dayDotPlanned
                      : styles.dayDotRest,
                  ]}
                />
              </View>
            ))}
          </View>
        </Pressable>

        {/* PLAYER XP LEVEL HUD CARD */}
        <View style={styles.levelCard}>
          <View style={styles.levelTop}>
            <View>
              <Text style={styles.label}>PROGRESSION</Text>
              <Text style={styles.level}>LVL {stats.level}</Text>
            </View>
            <View style={styles.xpCopy}>
              <Text style={styles.xpValue}>
                {stats.xp} <Text style={styles.xpSmall}>/ {stats.xpToNext} XP</Text>
              </Text>
            </View>
          </View>
          <ProgressBar value={progress} height={6} color="#38BDF8" />
        </View>

        {/* TODAY'S ROUTINE & LAUNCH CTA */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t.home.weeklyQuest}</Text>
          <Pressable onPress={() => router.push('/(tabs)/plan')}>
            <Text style={styles.sectionLink}>{t.common.all.toUpperCase()}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/(tabs)/workout')} style={styles.quest}>
          <View style={styles.questIcon}>
            <Feather name="crosshair" size={20} color="#080C14" />
          </View>
          <View style={styles.questCopy}>
            <Text style={styles.questTitle} numberOfLines={1}>
              {todayRoutine?.name || t.workout.freestyleTitle}
            </Text>
            <Text style={styles.questSub} numberOfLines={1}>
              {todayRoutine
                ? `${todayRoutine.exercises.length} ${locale === 'vi' ? 'bài tập' : 'exercises'} • ~${profile.workoutDuration || '60 mins'}`
                : t.workout.freestyleDesc}
            </Text>
          </View>
          <Text style={styles.questXp}>+180 XP</Text>
        </Pressable>

        {/* START WORKOUT CTA BUTTON */}
        <Pressable
          testID="start-workout"
          onPress={() => router.push('/(tabs)/workout')}
          style={({ pressed }) => [
            styles.startButton,
            { opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Text style={styles.startText}>{t.home.startTodayPlan.toUpperCase()}</Text>
          <Feather name="play" size={17} color="#080C14" />
        </Pressable>

        {/* BODY WEIGHT TRACKER CARD */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>{t.home.logBodyWeight}</Text>
            <Pressable
              onPress={() => {
                setNewWeightInput(formatWeight(profile.weight || 68, profile.unit, 1));
                setShowWeightModal(true);
              }}
              style={styles.logBtn}
            >
              <Feather name="plus" size={14} color="#38BDF8" />
              <Text style={styles.logBtnText}>{t.home.quickLogWeight}</Text>
            </Pressable>
          </View>

          <View style={styles.weightDataRow}>
            <View>
              <Text style={styles.weightValue}>{formatWeight(profile.weight || 68, profile.unit, 1)} <Text style={styles.weightUnit}>{weightUnitLabel(profile.unit)}</Text></Text>
              <Text style={styles.weightMeta}>
                {t.stats.goalLine}: {formatWeight(profile.goalWeight || 75, profile.unit, 1)} {weightUnitLabel(profile.unit)}
                {profile.goalWeeks ? ` (${profile.goalWeeks} ${locale === 'vi' ? 'tuần' : 'wks'})` : ''}
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/stats')} style={styles.statsLink}>
              <Text style={styles.statsLinkText}>{t.workout.viewAnalytics}</Text>
              <Feather name="chevron-right" size={14} color="#38BDF8" />
            </Pressable>
          </View>
        </View>

        {/* DUAL MANNEQUIN FOCUS PICKER */}
        <View style={styles.mannequinCard}>
          <View style={styles.mannequinHead}>
            <View>
              <Text style={styles.mannequinTitle}>{t.home.activeTargetMap}</Text>
              <Text style={styles.mannequinSubtitle}>
                {locale === 'vi' ? 'Chạm để chọn các nhóm cơ ưu tiên phát triển' : 'Tap to select priority target muscle groups'}
              </Text>
            </View>
            <View style={styles.focusBadge}>
              <Text style={styles.focusBadgeText}>TARGET</Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <DualMannequinFocusPicker
              selectedAreas={profile.targetMuscles || ['Full chest', 'Big arms', 'Broad shoulders']}
              onToggleArea={handleToggleMuscle}
            />
          </View>
        </View>
      </ScrollView>

      {/* MODAL: QUICK WEIGHT LOG */}
      <Modal visible={showWeightModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setShowWeightModal(false)} />
          <View style={[styles.weightModalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>{t.home.logBodyWeight}</Text>

            <View style={styles.weightInputRow}>
              <TextInput
                keyboardType="decimal-pad"
                value={newWeightInput}
                onChangeText={setNewWeightInput}
                style={styles.weightTextInput}
                autoFocus
              />
              <Text style={styles.weightInputUnit}>{weightUnitLabel(profile.unit)}</Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowWeightModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveWeight}
                style={styles.modalSaveBtn}
              >
                <Text style={styles.modalSaveText}>{t.common.save}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  kicker: { color: '#38BDF8', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  greeting: { color: '#FFF', fontSize: 24, lineHeight: 32, fontWeight: '900', letterSpacing: 0 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#162032',
    borderWidth: 1,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#38BDF8', fontSize: 14, fontWeight: '900' },
  weekCard: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weekTitle: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  weekSub: { color: '#38BDF8', fontSize: 10, fontWeight: '800' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayBox: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    gap: 3,
  },
  dayBoxToday: { backgroundColor: '#162032', borderWidth: 1, borderColor: '#1E3A5F' },
  dayName: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  dayNameToday: { color: '#38BDF8' },
  dayDate: { color: '#CBD5E1', fontSize: 12, fontWeight: '800' },
  dayDateToday: { color: '#FFF' },
  dayDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
  dayDotDone: { backgroundColor: '#22C55E' },
  dayDotPlanned: { backgroundColor: '#38BDF8' },
  dayDotRest: { backgroundColor: '#1E293B' },
  levelCard: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  levelTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  label: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  level: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 2 },
  xpCopy: { alignItems: 'flex-end' },
  xpValue: { color: '#38BDF8', fontSize: 13, fontWeight: '900' },
  xpSmall: { color: '#94A3B8', fontSize: 11 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
  },
  sectionTitle: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  sectionLink: { color: '#38BDF8', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  quest: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  questIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questCopy: { flex: 1 },
  questTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  questSub: { color: '#94A3B8', fontSize: 11, marginTop: 1 },
  questXp: { color: '#38BDF8', fontSize: 12, fontWeight: '800' },
  startButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  startText: { color: '#080C14', fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },
  card: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#162032',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  logBtnText: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
  weightDataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weightValue: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  weightUnit: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  weightMeta: { color: '#94A3B8', fontSize: 11, marginTop: 1 },
  statsLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsLinkText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  mannequinCard: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  mannequinHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mannequinTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  mannequinSubtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2, fontWeight: '500' },
  focusBadge: { backgroundColor: '#14233D', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  focusBadgeText: { color: '#38BDF8', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  backdrop: { flex: 1 },
  weightModalSheet: {
    backgroundColor: '#111724',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 18,
  },
  sheetHandle: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 10 },
  modalTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#162032',
    borderRadius: 12,
    paddingVertical: 12,
    marginVertical: 14,
  },
  weightTextInput: { color: '#FFF', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  weightInputUnit: { color: '#94A3B8', fontSize: 18, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, backgroundColor: '#162032', alignItems: 'center' },
  modalCancelText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  modalSaveBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, backgroundColor: '#38BDF8', alignItems: 'center' },
  modalSaveText: { color: '#080C14', fontSize: 13, fontWeight: '900' },
});
