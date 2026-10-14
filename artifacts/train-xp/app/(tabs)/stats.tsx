import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Polygon,
  Polyline,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useAppState } from '@/context/AppState';
import { ExerciseMannequinHighlight } from '@/components/ExerciseMannequinHighlight';
import { effortSummary, effortHistogram, type WorkoutHistoryItem } from '@/lib/effort';
import { getExercise1RmSeries, getExerciseBest1RM } from '@/lib/onerm';
import { loadOf, rankOf, MUSCLE_NAMES, type MuscleSlug } from '@/lib/muscles';
import { useI18n } from '@/lib/i18n';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { displayWeightToKg, formatWeight, localDateKey, weightUnitLabel } from '@/lib/units';
import { isHardSet } from '@/lib/effort';

import EXERCISES_DATA from '../../../../data/exercises_supabase_seed.json';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChartPoint {
  y: number;
  date?: string;
  label?: string;
}

function LineChartComponent({
  points,
  goal,
  unit = 'kg',
  color = '#38BDF8',
}: {
  points: ChartPoint[];
  goal?: number;
  unit?: string;
  color?: string;
}) {
  const chartW = SCREEN_WIDTH - 64;
  const chartH = 140;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 24;
  const plotW = Math.max(chartW - padLeft - padRight, 10);
  const plotH = Math.max(chartH - padTop - padBottom, 10);

  if (!points || points.length === 0) {
    return (
      <View style={[styles.emptyChart, { height: 110 }]}>
        <Feather name="bar-chart-2" size={24} color="#334155" />
        <Text style={[styles.dimSub, { marginTop: 6 }]}>Chưa có dữ liệu theo dõi</Text>
      </View>
    );
  }

  const allY = points.map((p) => p.y);
  if (goal) allY.push(goal);
  const rawMinY = Math.min(...allY);
  const rawMaxY = Math.max(...allY);
  const margin = (rawMaxY - rawMinY) * 0.15 || 2;
  const minY = Math.floor(rawMinY - margin);
  const maxY = Math.ceil(rawMaxY + margin);
  const rangeY = maxY - minY || 1;
  const midY = (maxY + minY) / 2;

  const getX = (idx: number) => {
    if (points.length === 1) return padLeft + plotW / 2;
    return padLeft + (idx / (points.length - 1)) * plotW;
  };

  const getY = (val: number) => {
    return padTop + plotH - ((val - minY) / rangeY) * plotH;
  };

  const polyPoints = points.map((p, idx) => `${getX(idx)},${getY(p.y)}`).join(' ');
  const areaPoints = `${getX(0)},${padTop + plotH} ${polyPoints} ${getX(points.length - 1)},${padTop + plotH}`;
  const goalY = goal ? getY(goal) : null;
  const gradId = `chartGrad_${color.replace('#', '')}`;

  const formatDateLabel = (dStr?: string) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return '';
      const day = d.getDate();
      const month = d.getMonth() + 1;
      return `${day < 10 ? '0' : ''}${day}/${month < 10 ? '0' : ''}${month}`;
    } catch {
      return '';
    }
  };

  const xTicks =
    points.length === 1
      ? [0]
      : points.length === 2
      ? [0, 1]
      : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  const lastIdx = points.length - 1;
  const lastPoint = points[lastIdx];

  return (
    <View style={{ marginVertical: 8 }}>
      <Svg width={chartW} height={chartH}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.00" />
          </LinearGradient>
        </Defs>

        {/* 1. TRỤC TUNG (Y-AXIS) GRIDLINES & TICKS */}
        {[maxY, midY, minY].map((tVal, tIdx) => {
          const tY = getY(tVal);
          return (
            <React.Fragment key={tIdx}>
              <Line
                x1={padLeft}
                y1={tY}
                x2={chartW - padRight}
                y2={tY}
                stroke="#1E293B"
                strokeWidth={1}
                strokeDasharray="3, 3"
              />
              <SvgText
                x={padLeft - 6}
                y={tY + 3.5}
                fill="#64748B"
                fontSize={9}
                fontWeight="700"
                textAnchor="end"
              >
                {Math.round(tVal)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* 2. TRỤC HOÀNH (X-AXIS) BASELINE */}
        <Line
          x1={padLeft}
          y1={padTop + plotH}
          x2={chartW - padRight}
          y2={padTop + plotH}
          stroke="#223049"
          strokeWidth={1.5}
        />

        {/* 3. TRỤC HOÀNH X-AXIS LABELS */}
        {xTicks.map((ptIdx, tickIdx) => {
          const pt = points[ptIdx];
          const xPos = getX(ptIdx);
          const dateLabel = formatDateLabel(pt.date) || pt.label || `B${ptIdx + 1}`;
          const anchor =
            tickIdx === 0
              ? 'start'
              : tickIdx === xTicks.length - 1
              ? 'end'
              : 'middle';

          return (
            <React.Fragment key={tickIdx}>
              <Line
                x1={xPos}
                y1={padTop + plotH}
                x2={xPos}
                y2={padTop + plotH + 4}
                stroke="#334155"
                strokeWidth={1}
              />
              <SvgText
                x={xPos}
                y={chartH - 6}
                fill="#64748B"
                fontSize={9}
                fontWeight="600"
                textAnchor={anchor}
              >
                {dateLabel}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* 4. GOAL DASHED REFERENCE LINE */}
        {goalY !== null && (
          <>
            <Line
              x1={padLeft}
              y1={goalY}
              x2={chartW - padRight}
              y2={goalY}
              stroke="#F59E0B"
              strokeWidth={1.5}
              strokeDasharray="4, 4"
            />
            <SvgText
              x={chartW - padRight}
              y={Math.max(goalY - 4, 12)}
              fill="#F59E0B"
              fontSize={8.5}
              fontWeight="800"
              textAnchor="end"
            >
              {`Mục tiêu: ${goal}${unit}`}
            </SvgText>
          </>
        )}

        {/* 5. AREA GRADIENT FILL */}
        {points.length > 1 && (
          <Polygon points={areaPoints} fill={`url(#${gradId})`} />
        )}

        {/* 6. DATA LINE */}
        {points.length > 1 && (
          <Polyline
            points={polyPoints}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* 7. DATA POINTS */}
        {points.map((p, idx) => (
          <Circle
            key={idx}
            cx={getX(idx)}
            cy={getY(p.y)}
            r={idx === lastIdx ? 4.5 : 3}
            fill={color}
            stroke="#080C14"
            strokeWidth={idx === lastIdx ? 2 : 1.5}
          />
        ))}

        {/* 8. LATEST VALUE CALLOUT BADGE */}
        {lastPoint && (
          <>
            <Rect
              x={Math.min(Math.max(getX(lastIdx) - 26, padLeft), chartW - padRight - 52)}
              y={Math.max(getY(lastPoint.y) - 20, 2)}
              width={52}
              height={16}
              rx={4}
              fill="#162032"
              stroke={color}
              strokeWidth={1}
            />
            <SvgText
              x={Math.min(Math.max(getX(lastIdx), padLeft + 26), chartW - padRight - 26)}
              y={Math.max(getY(lastPoint.y) - 8, 14)}
              fill="#FFF"
              fontSize={9}
              fontWeight="800"
              textAnchor="middle"
            >
              {`${lastPoint.y} ${unit}`}
            </SvgText>
          </>
        )}
      </Svg>
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { workoutsHistory, bodyweightLogs, profile, stats, logBodyweight, deleteWorkout } = useAppState();
  const { t, locale } = useI18n();

  const [muscleWin, setMuscleWin] = useState<7 | 30 | 90 | 0>(30);
  const [hardMode, setHardMode] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleSlug | null>(null);

  const [effortWin, setEffortWin] = useState<30 | 90 | 365 | 0>(30);
  const [curExId, setCurExId] = useState<string>('barbell_bench_press');
  const [exPickerOpen, setExPickerOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [bwModalOpen, setBwModalOpen] = useState(false);
  const [bwInput, setBwInput] = useState(formatWeight(profile.weight || 70, profile.unit, 1));
  const [selectedWorkoutDetail, setSelectedWorkoutDetail] = useState<WorkoutHistoryItem | null>(null);

  const handleDeleteWorkout = (id: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      locale === 'vi' ? 'Xóa buổi tập?' : 'Delete Workout?',
      locale === 'vi'
        ? 'Buổi tập này sẽ bị xóa vĩnh viễn khỏi lịch sử tập luyện.'
        : 'This workout will be permanently removed from your history.',
      [
        { text: locale === 'vi' ? 'Hủy' : 'Cancel', style: 'cancel' },
        {
          text: locale === 'vi' ? 'Xóa' : 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteWorkout(id);
            setSelectedWorkoutDetail(null);
          },
        },
      ]
    );
  };

  const exMap = useMemo(() => {
    const map = new Map<string, (typeof EXERCISES_DATA)[0]>();
    EXERCISES_DATA.forEach((e) => map.set(e.id, e));
    return map;
  }, []);

  const totalWorkouts = workoutsHistory.length;
  const thisMonthWorkouts = useMemo(() => {
    const now = new Date();
    return workoutsHistory.filter((w) => {
      const d = new Date(w.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [workoutsHistory]);

  const bwDelta = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recent = bodyweightLogs.filter((log) => new Date(`${log.date}T12:00:00`).getTime() >= cutoff.getTime());
    if (recent.length < 2) return '0.0';
    const first = recent[0].weight;
    const last = recent[recent.length - 1].weight;
    const diff = last - first;
    const shownDiff = Number(formatWeight(diff, profile.unit, 1));
    return (shownDiff > 0 ? `+${shownDiff.toFixed(1)}` : shownDiff.toFixed(1));
  }, [bodyweightLogs, profile.unit]);

  const sumEffort = useMemo(() => effortSummary(workoutsHistory, effortWin), [workoutsHistory, effortWin]);
  const histEffort = useMemo(() => effortHistogram(workoutsHistory, effortWin), [workoutsHistory, effortWin]);
  const maxHist = useMemo(() => Math.max(...histEffort.map((h) => h.count), 1), [histEffort]);

  const muscleLoad = useMemo(() => {
    const now = Date.now();
    const cutoff = muscleWin === 0 ? 0 : now - muscleWin * 86400000;
    const filtered = workoutsHistory.filter((w) => new Date(w.date).getTime() >= cutoff);

    const items: { primary: string[]; secondary: string[]; sets: number }[] = [];
    filtered.forEach((w) => {
      w.entries.forEach((e) => {
        const ex = exMap.get(e.id);
        if (!ex) return;
        const validSets = hardMode ? e.sets.filter(isHardSet) : e.sets.filter((s) => s.done);
        if (validSets.length > 0) {
          items.push({
            primary: ex.primary_muscles,
            secondary: ex.secondary_muscles,
            sets: validSets.length,
          });
        }
      });
    });

    return loadOf(items);
  }, [workoutsHistory, muscleWin, hardMode, exMap]);

  const { worked, missed } = useMemo(() => rankOf(muscleLoad), [muscleLoad]);
  const topMuscles = worked.slice(0, 6);
  const maxMuscleSets = worked.length ? muscleLoad[worked[0]] || 1 : 1;

  const e1Series = useMemo(() => getExercise1RmSeries(workoutsHistory, curExId), [workoutsHistory, curExId]);
  const e1Best = useMemo(() => getExerciseBest1RM(workoutsHistory, curExId), [workoutsHistory, curExId]);
  const e1Diff30d = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    const recent = e1Series.filter((point) => new Date(point.date).getTime() >= cutoff);
    if (recent.length < 2) return null;
    const first = recent[0].est1RM;
    const last = recent[recent.length - 1].est1RM;
    const diff = last - first;
    return diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
  }, [e1Series]);

  const handleSaveBw = () => {
    const num = Number(bwInput.trim().replace(',', '.'));
    const kg = displayWeightToKg(num, profile.unit);
    if (Number.isFinite(kg) && kg >= 15 && kg <= 300) {
      logBodyweight(kg);
      setBwModalOpen(false);
      return;
    }
    Alert.alert(locale === 'vi' ? 'Cân nặng không hợp lệ' : 'Invalid weight', locale === 'vi' ? 'Nhập cân nặng từ 15 đến 300 kg.' : 'Enter a weight between 15 and 300 kg.');
  };

  const getLocalizedMuscleName = (slug: string) => {
    const info = MUSCLE_NAMES[slug as MuscleSlug];
    if (!info) return slug;
    return locale === 'vi' ? info.vi : info.en;
  };

  const getLocalizedExName = (exId: string) => {
    const ex = exMap.get(exId);
    if (!ex) return exId;
    return locale === 'vi' ? (ex.name_vi || ex.name) : ex.name;
  };

  const exercisePickerItems = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase();
    const exercisedIds = new Set(workoutsHistory.flatMap((workout) => workout.entries.map((entry) => entry.id)));
    return [...EXERCISES_DATA]
      .filter((exercise) => !query || `${exercise.name} ${exercise.name_vi || ''} ${exercise.primary_muscles.join(' ')}`.toLowerCase().includes(query))
      .sort((a, b) => Number(exercisedIds.has(b.id)) - Number(exercisedIds.has(a.id)) || a.name.localeCompare(b.name));
  }, [exerciseSearch, workoutsHistory]);

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
            <Text style={styles.hdrTitle}>{t.stats.title}</Text>
          </View>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setBwModalOpen(true);
            }}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Feather name="plus" size={17} color="#38BDF8" />
          </Pressable>
        </View>

        {/* 1. TOP KPI 2x2 GRID */}
        <View style={styles.grid2}>
          <View style={styles.kpiCard}>
            <Text style={styles.cardHeaderTitle} numberOfLines={1}>{t.stats.totalWorkouts}</Text>
            <Text style={styles.bigStat}>{totalWorkouts}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.cardHeaderTitle} numberOfLines={1}>{t.stats.thisMonth}</Text>
            <Text style={styles.bigStat}>{thisMonthWorkouts}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.cardHeaderTitle} numberOfLines={1}>{t.stats.weekStreak}</Text>
            <Text style={styles.bigStat}>{stats.streak}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.cardHeaderTitle} numberOfLines={1}>{t.stats.weightChange}</Text>
            <Text style={[styles.bigStat, { color: Number(bwDelta) <= 0 ? '#22C55E' : '#F59E0B' }]}>
              {bwDelta} <Text style={styles.statUnit}>{weightUnitLabel(profile.unit)}</Text>
            </Text>
          </View>
        </View>

        {/* 2. 12-MONTH ACTIVITY HEATMAP */}
        <ActivityHeatmap workoutsHistory={workoutsHistory} weeks={20} />

        {/* 3. MUSCLE BALANCE CARD */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{t.stats.muscleBalance}</Text>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setHardMode((h) => !h);
              }}
              style={[styles.btnPillToggle, hardMode && styles.btnPillToggleActive]}
            >
              <Feather name="zap" size={12} color={hardMode ? '#080C14' : '#F59E0B'} />
              <Text style={[styles.btnPillToggleText, hardMode && { color: '#080C14' }]}>
                {hardMode ? 'Hard' : 'All'}
              </Text>
            </Pressable>
          </View>

          {/* Time Filter Segments */}
          <View style={styles.segTrack}>
            {([7, 30, 90, 0] as const).map((win) => {
              const label = win === 7 ? '7d' : win === 0 ? t.common.all : `${win}d`;
              const isSel = muscleWin === win;
              return (
                <Pressable
                  key={win}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMuscleWin(win);
                    setSelectedMuscle(null);
                  }}
                  style={[styles.segBtn, isSel && styles.segBtnActive]}
                >
                  <Text style={[styles.segBtnText, isSel && styles.segBtnTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Dual Mannequin View */}
          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <ExerciseMannequinHighlight
              primaryMuscles={selectedMuscle ? [selectedMuscle] : worked.slice(0, 4)}
              secondaryMuscles={selectedMuscle ? [] : worked.slice(4, 8)}
              primaryColor={hardMode ? '#F59E0B' : '#38BDF8'}
              secondaryColor="#38BDF888"
              height={230}
            />
          </View>

          {/* Selected Muscle Inspector */}
          {selectedMuscle && (
            <View style={styles.muscleInspectBanner}>
              <View>
                <Text style={styles.muscleInspectTitle}>
                  {getLocalizedMuscleName(selectedMuscle)}
                </Text>
                <Text style={styles.dimSub}>
                  {Math.round(muscleLoad[selectedMuscle] || 0)} {t.common.sets}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedMuscle(null)} style={styles.iconBtnSmall}>
                <Feather name="x" size={14} color="#94A3B8" />
              </Pressable>
            </View>
          )}

          {/* Muscle Rows / Bars */}
          {topMuscles.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 14 }}>
              <Text style={styles.dimSub}>
                {locale === 'vi' ? 'Chưa có dữ liệu bài tập trong khoảng thời gian này' : 'No workout data in this period'}
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 6 }}>
              {topMuscles.map((m) => {
                const sets = muscleLoad[m] || 0;
                const pct = Math.min(100, Math.round((sets / maxMuscleSets) * 100));
                const displayName = getLocalizedMuscleName(m);
                return (
                  <Pressable
                    key={m}
                    onPress={() => setSelectedMuscle((prev) => (prev === m ? null : (m as MuscleSlug)))}
                    style={styles.mrow}
                  >
                    <Text style={styles.mrowName} numberOfLines={1}>{displayName}</Text>
                    <View style={styles.mrowBarTrack}>
                      <View
                        style={[
                          styles.mrowBarFill,
                          { width: `${pct}%`, backgroundColor: hardMode ? '#F59E0B' : '#38BDF8' },
                        ]}
                      />
                    </View>
                    <Text style={styles.mrowVal}>{Math.round(sets)} {t.common.sets}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {missed.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.sectSubHead}>{t.stats.needsFocus}</Text>
              <View style={styles.chipRow}>
                {missed.slice(0, 5).map((m) => (
                  <View key={m} style={styles.missChip}>
                    <Text style={styles.missChipText}>{getLocalizedMuscleName(m)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 4. EFFORT & RIR CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.stats.effortAnalytics}</Text>

          <View style={styles.segTrack}>
            {([30, 90, 365, 0] as const).map((win) => {
              const label = win === 365 ? '1Y' : win === 0 ? t.common.all : `${win}d`;
              const isSel = effortWin === win;
              return (
                <Pressable
                  key={win}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEffortWin(win);
                  }}
                  style={[styles.segBtn, isSel && styles.segBtnActive]}
                >
                  <Text style={[styles.segBtnText, isSel && styles.segBtnTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.rowBetween, { marginTop: 10, alignItems: 'flex-end' }]}>
            <View>
              <Text style={styles.statLargeVal}>
                {sumEffort.avgRir !== null ? `${sumEffort.avgRir.toFixed(1)} RIR` : '--'}
              </Text>
              <Text style={styles.dimSub}>{t.stats.averageRir}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.statLargeVal, { color: '#F59E0B' }]}>
                {sumEffort.hardPct !== null ? `${sumEffort.hardPct}%` : '--'}
              </Text>
              <Text style={styles.dimSub}>RIR ≤ 3</Text>
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            {histEffort.map((b) => {
              const pct = Math.min(100, Math.round((b.count / maxHist) * 100));
              return (
                <View key={b.rirLabel} style={styles.mrow}>
                  <Text style={styles.mrowName}>{b.rirLabel}</Text>
                  <View style={styles.mrowBarTrack}>
                    <View
                      style={[
                        styles.mrowBarFill,
                        { width: `${pct}%`, backgroundColor: b.isHard ? '#F59E0B' : '#64748B' },
                      ]}
                    />
                  </View>
                  <Text style={styles.mrowVal}>{b.count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 5. BODY WEIGHT PROGRESSION CHART */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>{t.stats.bodyweightTrend}</Text>
              <Text style={styles.dimSub}>{t.stats.goalLine}: {formatWeight(profile.goalWeight || 75, profile.unit, 1)} {weightUnitLabel(profile.unit)}</Text>
            </View>
            <Pressable
              onPress={() => { setBwInput(formatWeight(profile.weight || 70, profile.unit, 1)); setBwModalOpen(true); }}
              style={styles.btnSmallTinted}
            >
              <Feather name="plus" size={13} color="#38BDF8" />
              <Text style={styles.btnSmallTintedText}>{locale === 'vi' ? 'Ghi cân' : 'Log'}</Text>
            </Pressable>
          </View>

          <LineChartComponent
            points={bodyweightLogs.map((b) => ({ y: Number(formatWeight(b.weight, profile.unit, 1)), date: b.date }))}
            goal={Number(formatWeight(profile.goalWeight || 75, profile.unit, 1))}
            unit={weightUnitLabel(profile.unit)}
            color="#38BDF8"
          />
        </View>

        {/* 6. EXERCISE 1RM PROGRESSION */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t.stats.oneRepMaxProgression}</Text>
            </View>
            <Pressable
              onPress={() => setExPickerOpen(true)}
              style={styles.btnSmallTinted}
            >
              <Text style={styles.btnSmallTintedText} numberOfLines={1}>
                {(exMap.get(curExId)?.name || 'Select').split(' ')[0]}
              </Text>
              <Feather name="chevron-down" size={13} color="#38BDF8" />
            </Pressable>
          </View>

          <View style={[styles.rowBetween, { marginVertical: 8 }]}>
            <View>
              <Text style={styles.bigStat}>
                {e1Best ? formatWeight(e1Best.est1RM, profile.unit, 1) : '--'} <Text style={styles.statUnit}>{e1Best ? weightUnitLabel(profile.unit) : ''}</Text>
              </Text>
              <Text style={styles.dimSub}>{t.stats.personalRecords}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.bigStat, { color: '#22C55E' }]}>
                {e1Diff30d ? `${formatWeight(Number(e1Diff30d), profile.unit, 1)} ` : '-- '}<Text style={styles.statUnit}>{e1Diff30d ? weightUnitLabel(profile.unit) : ''}</Text>
              </Text>
              <Text style={styles.dimSub}>30d</Text>
            </View>
          </View>

          <LineChartComponent
            points={e1Series.map((s) => ({ y: Number(formatWeight(s.est1RM, profile.unit, 1)), date: s.date }))}
            unit={weightUnitLabel(profile.unit)}
            color="#22C55E"
          />
        </View>

        {/* 7. WORKOUT HISTORY */}
        <View style={styles.sect}>
          <Text style={styles.sectTitle}>{t.stats.recentSessions} ({workoutsHistory.length})</Text>
          <View style={styles.insetList}>
            {workoutsHistory.map((w, idx) => {
              const isLast = idx === workoutsHistory.length - 1;
              const completedSets = w.entries.reduce((acc, e) => acc + e.sets.filter((s) => s.done).length, 0);
              const dateFormatted = new Date(w.date).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <Pressable
                  key={w.id}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedWorkoutDetail(w);
                  }}
                  style={({ pressed }) => [
                    styles.lrow,
                    pressed && styles.lrowPressed,
                    !isLast && styles.lrowDivider,
                  ]}
                >
                  <View style={styles.lrowIconRail}>
                    <Feather name="check-circle" size={15} color="#22C55E" />
                  </View>
                  <View style={styles.lrowGrow}>
                    <Text style={styles.lrowTitle}>{w.routineName || t.workout.title}</Text>
                    <Text style={styles.lrowSub}>
                      {dateFormatted} • {w.duration} • {completedSets} {t.common.sets} • {w.volume} kg
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#64748B" />
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* MODAL 1: WORKOUT DETAIL SHEET */}
      {selectedWorkoutDetail && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <Pressable style={styles.modalDim} onPress={() => setSelectedWorkoutDetail(null)} />
            <View style={[styles.bottomSheet, { maxHeight: '85%', paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{selectedWorkoutDetail.routineName || t.workout.summaryTitle}</Text>
              <Text style={styles.sheetSub}>
                {new Date(selectedWorkoutDetail.date).toLocaleDateString()} • {selectedWorkoutDetail.duration} • {selectedWorkoutDetail.volume} kg
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 10 }}>
                {selectedWorkoutDetail.entries.map((ent, eIdx) => {
                  return (
                    <View key={eIdx} style={styles.detailExCard}>
                      <Text style={styles.detailExTitle}>{getLocalizedExName(ent.id)}</Text>
                      <View style={styles.detailSetsWrap}>
                        {ent.sets.map((st, sIdx) => (
                          <View key={sIdx} style={styles.detailSetRow}>
                            <Text style={styles.detailSetNum}>{t.workout.setNumber} {sIdx + 1}</Text>
                            <Text style={styles.detailSetVals}>
                              {formatWeight(Number(st.weight) || 0, profile.unit, 1)} {weightUnitLabel(profile.unit)} × {st.reps} {t.common.reps} {st.rir !== undefined ? `(RIR ${st.rir})` : ''}
                            </Text>
                            <Feather name={st.done ? 'check' : 'minus'} size={13} color={st.done ? '#22C55E' : '#64748B'} />
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <Pressable
                  onPress={() => handleDeleteWorkout(selectedWorkoutDetail.id)}
                  style={styles.btnDeleteWorkout}
                >
                  <Feather name="trash-2" size={15} color="#EF4444" />
                  <Text style={styles.btnDeleteWorkoutText}>{locale === 'vi' ? 'Xóa' : 'Delete'}</Text>
                </Pressable>
                <Pressable onPress={() => setSelectedWorkoutDetail(null)} style={[styles.btnSheetSave, { flex: 1, marginTop: 0 }]}>
                  <Text style={styles.btnSheetSaveText}>{t.common.done}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 2: BODY WEIGHT SHEET */}
      <Modal visible={bwModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDim} onPress={() => setBwModalOpen(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t.home.logBodyWeight}</Text>

            <View style={styles.bwInputRow}>
              <TextInput
                value={bwInput}
                onChangeText={setBwInput}
                keyboardType="decimal-pad"
                style={styles.bwLargeInput}
                autoFocus
              />
              <Text style={styles.bwUnitText}>kg</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setBwModalOpen(false)} style={styles.btnSheetCancel}>
                <Text style={styles.btnSheetCancelText}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable onPress={handleSaveBw} style={styles.btnSheetSave}>
                <Text style={styles.btnSheetSaveText}>{t.common.save}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: EXERCISE PICKER FOR 1RM */}
      <Modal visible={exPickerOpen} animationType="slide" transparent={false}>
        <View style={[styles.screen, { backgroundColor: '#080C14', paddingTop: insets.top + 8 }]}>
          <View style={styles.pickerHdr}>
            <Pressable onPress={() => setExPickerOpen(false)} style={styles.iconBtn}>
              <Feather name="arrow-left" size={20} color="#FFF" />
            </Pressable>
            <Text style={styles.sheetTitle}>{t.plan.selectExercise}</Text>
            <View style={{ width: 36 }} />
          </View>

          <TextInput
            value={exerciseSearch}
            onChangeText={setExerciseSearch}
            placeholder={locale === 'vi' ? 'Tìm bài tập...' : 'Search exercises...'}
            placeholderTextColor="#718096"
            accessibilityLabel={locale === 'vi' ? 'Tìm bài tập' : 'Search exercises'}
            style={{ marginHorizontal: 16, marginVertical: 10, padding: 12, borderRadius: 12, color: '#FFF', backgroundColor: '#131926' }}
          />
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
            <View style={styles.insetList}>
              {exercisePickerItems.map((ex, idx) => (
                <Pressable
                  key={ex.id}
                  onPress={() => {
                    setCurExId(ex.id);
                    setExPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.lrow,
                    pressed && { backgroundColor: '#162032' },
                    idx < exercisePickerItems.length - 1 && styles.lrowDivider,
                  ]}
                >
                  <View style={styles.lrowGrow}>
                    <Text style={styles.lrowTitle}>{ex.name}</Text>
                    <Text style={styles.lrowSub}>
                      {ex.name_vi ? `${ex.name_vi} · ` : ''}{ex.primary_muscles.map((m) => getLocalizedMuscleName(m)).join(', ')}
                    </Text>
                  </View>
                  {curExId === ex.id && <Feather name="check" size={18} color="#38BDF8" />}
                </Pressable>
              ))}
              {exercisePickerItems.length === 0 ? (
                <Text style={{ color: '#94A3B8', padding: 16 }}>{locale === 'vi' ? 'Không tìm thấy bài tập.' : 'No exercises found.'}</Text>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  hdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  hdrTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
  },
  card: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardHeaderTitle: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.6, marginBottom: 4 },
  bigStat: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  statUnit: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  dimSub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  cardTitle: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btnPillToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#162032',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  btnPillToggleActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  btnPillToggleText: { color: '#F59E0B', fontSize: 10, fontWeight: '800' },
  segTrack: {
    flexDirection: 'row',
    backgroundColor: '#162032',
    borderRadius: 8,
    padding: 2,
    marginVertical: 10,
  },
  segBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  segBtnActive: { backgroundColor: '#080C14' },
  segBtnText: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  segBtnTextActive: { color: '#FFF', fontWeight: '800' },
  muscleInspectBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#162032',
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  muscleInspectTitle: { color: '#38BDF8', fontSize: 13, fontWeight: '800' },
  mrow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 },
  mrowName: { width: 90, color: '#CBD5E1', fontSize: 11, fontWeight: '700' },
  mrowBarTrack: { flex: 1, height: 6, backgroundColor: '#162032', borderRadius: 3, overflow: 'hidden' },
  mrowBarFill: { height: '100%', borderRadius: 3 },
  mrowVal: { width: 45, color: '#94A3B8', fontSize: 10, fontWeight: '700', textAlign: 'right' },
  sectSubHead: { color: '#64748B', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  missChip: { backgroundColor: '#162032', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  missChipText: { color: '#94A3B8', fontSize: 10, fontWeight: '700' },
  statLargeVal: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  btnSmallTinted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#162032',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  btnSmallTintedText: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
  sect: { marginTop: 12 },
  sectTitle: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
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
  lrowIconRail: { width: 24, alignItems: 'center' },
  lrowGrow: { flex: 1 },
  lrowTitle: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  lrowSub: { color: '#64748B', fontSize: 11, marginTop: 1 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#162032',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSmall: { padding: 4 },
  emptyChart: { alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  modalDim: { flex: 1 },
  bottomSheet: {
    backgroundColor: '#111724',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
  },
  sheetHandle: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  sheetSub: { color: '#64748B', fontSize: 12, marginTop: 2, marginBottom: 12 },
  detailExCard: { backgroundColor: '#162032', borderRadius: 10, padding: 10, marginBottom: 8 },
  detailExTitle: { color: '#38BDF8', fontSize: 13, fontWeight: '800', marginBottom: 6 },
  detailSetsWrap: { gap: 4 },
  detailSetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailSetNum: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  detailSetVals: { color: '#CBD5E1', fontSize: 11 },
  btnDeleteWorkout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1C1318',
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  btnDeleteWorkoutText: { color: '#EF4444', fontSize: 13, fontWeight: '800' },
  btnSheetSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    marginTop: 10,
  },
  btnSheetSaveText: { color: '#080C14', fontSize: 13, fontWeight: '900' },
  btnSheetCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#162032',
    alignItems: 'center',
    marginTop: 10,
  },
  btnSheetCancelText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  bwInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#162032',
    borderRadius: 12,
    paddingVertical: 12,
    marginVertical: 14,
  },
  bwLargeInput: { color: '#FFF', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  bwUnitText: { color: '#94A3B8', fontSize: 18, fontWeight: '700' },
  pickerHdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
});
