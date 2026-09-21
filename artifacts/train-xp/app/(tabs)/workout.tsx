import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressBar } from '@/components/ProgressBar';
import { TrainMascot } from '@/components/TrainMascot';
import { useAppState, type WorkoutResult } from '@/context/AppState';
import { useColors } from '@/hooks/useColors';

interface SetRow { weight: string; reps: string; done: boolean }

export default function WorkoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { finishWorkout } = useAppState();
  const [sets, setSets] = useState<SetRow[]>([
    { weight: '60', reps: '8', done: true },
    { weight: '60', reps: '8', done: true },
    { weight: '65', reps: '6', done: false },
  ]);
  const [rest, setRest] = useState(0);
  const [result, setResult] = useState<WorkoutResult | null>(null);

  useEffect(() => {
    if (rest <= 0) return;
    const timer = setInterval(() => setRest((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [rest]);

  const toggleSet = (index: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, done: !item.done } : item));
  };

  const updateSet = (index: number, key: 'weight' | 'reps', value: string) => setSets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const addSet = () => setSets((current) => [...current, { weight: current[current.length - 1]?.weight ?? '60', reps: current[current.length - 1]?.reps ?? '8', done: false }]);
  const finish = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResult(finishWorkout());
  };

  if (result) return <Completion result={result} colors={colors} insets={insets} />;

  const completed = sets.filter((item) => item.done).length;
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 104 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.secondary }]}><Feather name="chevron-left" size={20} color={colors.foreground} /></Pressable><View style={styles.headerCopy}><Text style={[styles.kicker, { color: colors.tint }]}>ACTIVE WORKOUT</Text><Text style={[styles.title, { color: colors.foreground }]}>Push day</Text></View><View style={[styles.timerPill, { backgroundColor: colors.secondary }]}><Feather name="clock" size={14} color={colors.tint} /><Text style={[styles.timerText, { color: colors.foreground }]}>18:24</Text></View></View>
        <View style={[styles.workoutMeta, { backgroundColor: colors.card, borderColor: colors.border }]}><View><Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>TODAY’S TARGET</Text><Text style={[styles.metaValue, { color: colors.foreground }]}>12 sets · 4 exercises</Text></View><Text style={[styles.metaProgress, { color: colors.tint }]}>{completed}/12</Text></View>
        <View style={styles.progressWrap}><ProgressBar value={completed / 12} height={6} color={colors.tint} /></View>
        <View style={styles.exerciseHeader}><View><Text style={[styles.exerciseName, { color: colors.foreground }]}>Bench Press</Text><Text style={[styles.previous, { color: colors.mutedForeground }]}>Last time · 60 kg × 8</Text></View><View style={[styles.rankBadge, { backgroundColor: colors.secondary }]}><Feather name="award" size={13} color={colors.gold} /><Text style={[styles.rankBadgeText, { color: colors.gold }]}>SILVER III</Text></View></View>
        <View style={[styles.setTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.tableHead}><Text style={[styles.tableLabel, { color: colors.mutedForeground }]}>SET</Text><Text style={[styles.tableLabel, { color: colors.mutedForeground }]}>WEIGHT</Text><Text style={[styles.tableLabel, { color: colors.mutedForeground }]}>REPS</Text><Text style={[styles.tableLabel, { color: colors.mutedForeground }]}>DONE</Text></View>
          {sets.map((item, index) => <View key={index} style={[styles.setRow, { borderTopColor: colors.border }]}><Text style={[styles.setNumber, { color: colors.mutedForeground }]}>{String(index + 1).padStart(2, '0')}</Text><TextInput value={item.weight} onChangeText={(value) => updateSet(index, 'weight', value)} keyboardType="numeric" style={[styles.setInput, { color: colors.foreground, backgroundColor: colors.secondary }]} /><TextInput value={item.reps} onChangeText={(value) => updateSet(index, 'reps', value)} keyboardType="numeric" style={[styles.setInput, { color: colors.foreground, backgroundColor: colors.secondary }]} /><Pressable testID={`set-${index}`} onPress={() => toggleSet(index)} style={[styles.checkButton, { backgroundColor: item.done ? colors.tint : colors.secondary }]}><Feather name="check" size={17} color={item.done ? colors.primaryForeground : colors.mutedForeground} /></Pressable></View>)}
          <Pressable onPress={addSet} style={({ pressed }) => [styles.addSet, { opacity: pressed ? 0.6 : 1 }]}><Feather name="plus" size={16} color={colors.tint} /><Text style={[styles.addText, { color: colors.tint }]}>ADD SET</Text></Pressable>
        </View>
        <View style={styles.tools}><Pressable onPress={() => setRest(rest > 0 ? 0 : 60)} style={[styles.tool, { backgroundColor: colors.secondary }]}><Feather name="clock" size={17} color={colors.tint} /><Text style={[styles.toolText, { color: colors.foreground }]}>{rest > 0 ? `${rest}s rest` : 'Start rest timer'}</Text></Pressable><Pressable style={[styles.tool, { backgroundColor: colors.secondary }]}><Feather name="skip-forward" size={17} color={colors.mutedForeground} /><Text style={[styles.toolText, { color: colors.foreground }]}>Skip exercise</Text></Pressable></View>
        <View style={[styles.nextExercise, { borderColor: colors.border }]}><Text style={[styles.nextLabel, { color: colors.mutedForeground }]}>UP NEXT</Text><Text style={[styles.nextName, { color: colors.foreground }]}>Incline Dumbbell Press</Text><Text style={[styles.nextDetail, { color: colors.mutedForeground }]}>3 sets · 8–10 reps</Text></View>
      </ScrollView>
      <View style={[styles.finishDock, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}><Pressable testID="finish-workout" onPress={finish} style={({ pressed }) => [styles.finishButton, { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 }]}><Text style={[styles.finishText, { color: colors.primaryForeground }]}>FINISH WORKOUT</Text><Feather name="check-circle" size={19} color={colors.primaryForeground} /></Pressable></View>
    </View>
  );
}

function Completion({ result, colors, insets }: { result: WorkoutResult; colors: ReturnType<typeof useColors>; insets: { top: number; bottom: number } }) {
  return <View style={[styles.completion, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 18) }]}><View style={styles.completionTop}><Text style={[styles.kicker, { color: colors.tint }]}>SESSION COMPLETE</Text><Feather name="x" size={22} color={colors.mutedForeground} /></View><View style={styles.celebrate}><TrainMascot mood="celebrate" size={132} /><Text style={[styles.completeTitle, { color: colors.foreground }]}>That’s a wrap.</Text><Text style={[styles.completeSub, { color: colors.mutedForeground }]}>You showed up and moved the bar.</Text></View><View style={[styles.xpReward, { backgroundColor: colors.tint }]}><Text style={[styles.rewardLabel, { color: colors.primaryForeground }]}>XP EARNED</Text><Text style={[styles.rewardValue, { color: colors.primaryForeground }]}>+{result.xp}</Text><Text style={[styles.rewardHint, { color: colors.primaryForeground }]}>{result.newPr ? 'New Bench Press PR unlocked' : 'Workout logged'}</Text></View><View style={styles.resultGrid}><ResultMetric label="DURATION" value={result.duration} colors={colors} /><ResultMetric label="EXERCISES" value={String(result.exercises)} colors={colors} /><ResultMetric label="SETS" value={String(result.sets)} colors={colors} /><ResultMetric label="VOLUME" value={`${result.volume.toLocaleString()} kg`} colors={colors} /></View><View style={styles.completionFooter}><Pressable onPress={() => router.replace('/(tabs)')} style={[styles.homeButton, { backgroundColor: colors.cobalt }]}><Text style={[styles.finishText, { color: colors.foreground }]}>VIEW PROGRESS</Text><Feather name="arrow-right" size={18} color={colors.foreground} /></Pressable><Text style={[styles.encourage, { color: colors.mutedForeground }]}>{result.rankedUp ? 'You ranked up. You’re getting stronger.' : 'Your next rank is closer than you think.'}</Text></View></View>;
}

function ResultMetric({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.resultMetric, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 23 },
  back: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 29, fontWeight: '800', letterSpacing: -1, marginTop: 3 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9 },
  timerText: { fontSize: 12, fontWeight: '700' },
  workoutMeta: { borderWidth: 1, borderRadius: 19, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  metaValue: { fontSize: 15, fontWeight: '700', marginTop: 5 },
  metaProgress: { fontSize: 25, fontWeight: '800' },
  progressWrap: { marginVertical: 13 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 11, marginBottom: 12 },
  exerciseName: { fontSize: 22, fontWeight: '800' },
  previous: { fontSize: 11, marginTop: 5 },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9 },
  rankBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  setTable: { borderWidth: 1, borderRadius: 19, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  tableLabel: { flex: 1, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center' },
  setRow: { borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 9 },
  setNumber: { width: 27, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  setInput: { flex: 1, height: 41, borderRadius: 11, textAlign: 'center', fontSize: 15, fontWeight: '700' },
  checkButton: { width: 41, height: 41, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addSet: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  tools: { flexDirection: 'row', gap: 10, marginTop: 14 },
  tool: { flex: 1, minHeight: 49, borderRadius: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolText: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  nextExercise: { marginTop: 19, borderWidth: 1, borderRadius: 18, padding: 16, gap: 5 },
  nextLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  nextName: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  nextDetail: { fontSize: 11 },
  finishDock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 10, paddingHorizontal: 20 },
  finishButton: { height: 58, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  finishText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  completion: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' },
  completionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  celebrate: { alignItems: 'center', gap: 8 },
  completeTitle: { fontSize: 36, fontWeight: '800', letterSpacing: -1.3, marginTop: 12 },
  completeSub: { fontSize: 14 },
  xpReward: { borderRadius: 22, padding: 19, alignItems: 'center', marginVertical: 20 },
  rewardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  rewardValue: { fontSize: 48, fontWeight: '800', letterSpacing: -2, marginVertical: 2 },
  rewardHint: { fontSize: 12, fontWeight: '600' },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  resultMetric: { width: '48.5%', borderWidth: 1, borderRadius: 16, padding: 13 },
  metricValue: { fontSize: 17, fontWeight: '800' },
  metricLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 5 },
  completionFooter: { gap: 13, alignItems: 'center' },
  homeButton: { width: '100%', height: 56, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  encourage: { fontSize: 12 },
});