import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressBar } from '@/components/ProgressBar';
import { TrainMascot } from '@/components/TrainMascot';
import { useAppState } from '@/context/AppState';
import { useColors } from '@/hooks/useColors';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { stats, profile, lastWorkout } = useAppState();
  const progress = stats.xp / stats.xpToNext;
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 98 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View><Text style={[styles.kicker, { color: colors.tint }]}>MONDAY, SEPT 21</Text><Text style={[styles.greeting, { color: colors.foreground }]}>Ready, Linh?</Text></View>
          <View style={[styles.avatar, { backgroundColor: colors.cobalt }]}><Text style={[styles.avatarText, { color: colors.foreground }]}>L</Text></View>
        </View>
        <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.levelTop}><View><Text style={[styles.label, { color: colors.mutedForeground }]}>PLAYER LEVEL</Text><Text style={[styles.level, { color: colors.foreground }]}>LVL {stats.level}</Text></View><View style={styles.xpCopy}><Text style={[styles.xpValue, { color: colors.tint }]}>{stats.xp} <Text style={[styles.xpSmall, { color: colors.mutedForeground }]}>/ {stats.xpToNext} XP</Text></Text><Text style={[styles.xpHint, { color: colors.mutedForeground }]}>Keep the momentum</Text></View></View>
          <ProgressBar value={progress} height={9} />
        </View>
        <View style={styles.statRow}>
          <View style={[styles.statBox, { backgroundColor: colors.secondary }]}><Feather name="zap" size={17} color={colors.tint} /><Text style={[styles.statValue, { color: colors.foreground }]}>{stats.streak}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>DAY STREAK</Text></View>
          <View style={[styles.statBox, { backgroundColor: colors.secondary }]}><Feather name="award" size={17} color={colors.gold} /><Text style={[styles.statValue, { color: colors.foreground }]}>{stats.prs}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>NEW PRS</Text></View>
          <View style={[styles.statBox, { backgroundColor: colors.secondary }]}><Feather name="activity" size={17} color={colors.cobalt} /><Text style={[styles.statValue, { color: colors.foreground }]}>{stats.workouts}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>WORKOUTS</Text></View>
        </View>
        <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's quest</Text><Text style={[styles.sectionLink, { color: colors.tint }]}>VIEW ALL</Text></View>
        <View style={[styles.quest, { backgroundColor: colors.tint }]}>
          <View style={[styles.questIcon, { backgroundColor: colors.primaryForeground }]}><Feather name="target" size={22} color={colors.tint} /></View>
          <View style={styles.questCopy}><Text style={[styles.questTitle, { color: colors.primaryForeground }]}>Complete today’s workout</Text><Text style={[styles.questSub, { color: colors.primaryForeground }]}>One focused session keeps the streak alive.</Text></View>
          <Text style={[styles.questXp, { color: colors.primaryForeground }]}>+100</Text>
        </View>
        <Pressable testID="start-workout" onPress={() => router.push('/(tabs)/workout')} style={({ pressed }) => [styles.startButton, { backgroundColor: colors.cobalt, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[styles.startText, { color: colors.foreground }]}>START WORKOUT</Text><Feather name="arrow-up-right" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your progress</Text><Pressable onPress={() => router.push('/(tabs)/rank')}><Text style={[styles.sectionLink, { color: colors.tint }]}>SEE RANKS</Text></Pressable></View>
        <ProgressRow name="Bench Press" rank="Silver III" detail="65 kg × 6" progress={0.72} color={colors.cobalt} colors={colors} />
        <ProgressRow name="Squat" rank="Bronze II" detail="80 kg × 5" progress={0.48} color={colors.coral} colors={colors} />
        <ProgressRow name="Chest" rank="Level 8" detail="82% complete" progress={0.82} color={colors.tint} colors={colors} />
        <View style={[styles.mascotNote, { borderColor: colors.border }]}>
          <TrainMascot size={58} mood={lastWorkout ? 'celebrate' : 'ready'} />
          <View style={styles.noteCopy}><Text style={[styles.noteTitle, { color: colors.foreground }]}>{lastWorkout ? 'That was a strong session.' : 'Ready for today’s workout?'}</Text><Text style={[styles.noteSub, { color: colors.mutedForeground }]}>{lastWorkout ? 'Your next rank is closer than you think.' : 'Your companion is waiting at the rack.'}</Text></View>
        </View>
        <Text style={[styles.goalHint, { color: colors.mutedForeground }]}>Training for {profile.goal.toLowerCase()}</Text>
      </ScrollView>
    </View>
  );
}

function ProgressRow({ name, rank, detail, progress, color, colors }: { name: string; rank: string; detail: string; progress: number; color: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.progressRow}><View style={styles.progressTitle}><View><Text style={[styles.progressName, { color: colors.foreground }]}>{name}</Text><Text style={[styles.progressDetail, { color: colors.mutedForeground }]}>{detail}</Text></View><Text style={[styles.rankText, { color }]}>{rank}</Text></View><ProgressBar value={progress} height={6} color={color} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 23 },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 7 },
  greeting: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  avatar: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  levelCard: { borderWidth: 1, borderRadius: 22, padding: 19, gap: 18 },
  levelTop: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  level: { fontSize: 31, fontWeight: '800', marginTop: 4 },
  xpCopy: { alignItems: 'flex-end', justifyContent: 'center' },
  xpValue: { fontSize: 18, fontWeight: '800' },
  xpSmall: { fontSize: 12, fontWeight: '600' },
  xpHint: { fontSize: 11, marginTop: 4 },
  statRow: { flexDirection: 'row', gap: 9, marginVertical: 15 },
  statBox: { flex: 1, borderRadius: 17, paddingVertical: 13, paddingHorizontal: 11, minHeight: 86, gap: 5 },
  statValue: { fontSize: 23, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  sectionLink: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  quest: { borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  questIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  questCopy: { flex: 1, gap: 4 },
  questTitle: { fontSize: 14, fontWeight: '800' },
  questSub: { fontSize: 11, lineHeight: 15 },
  questXp: { fontSize: 15, fontWeight: '800' },
  startButton: { height: 55, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 10 },
  startText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1 },
  progressRow: { gap: 8, marginBottom: 17 },
  progressTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressName: { fontSize: 15, fontWeight: '700' },
  progressDetail: { fontSize: 11, marginTop: 3 },
  rankText: { fontSize: 13, fontWeight: '800' },
  mascotNote: { borderWidth: 1, borderRadius: 19, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  noteCopy: { flex: 1, gap: 4 },
  noteTitle: { fontSize: 14, fontWeight: '700' },
  noteSub: { fontSize: 11, lineHeight: 16 },
  goalHint: { fontSize: 11, textAlign: 'center', marginTop: 15 },
});
