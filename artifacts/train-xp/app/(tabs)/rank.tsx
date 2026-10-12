import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { ProgressBar } from '@/components/ProgressBar';
import { useAppState } from '@/context/AppState';
import { useColors } from '@/hooks/useColors';
import { calculate1RM } from '@/lib/progression';

interface Benchmark {
  name: string;
  category: string;
  currentKg: number;
  reps: number;
  target1RM: number;
  rank: string;
  rankTier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Master';
  color: string;
}

const BENCHMARKS: Benchmark[] = [
  {
    name: 'Barbell Bench Press',
    category: 'Chest & Triceps',
    currentKg: 75,
    reps: 8,
    target1RM: 110,
    rank: 'Silver III',
    rankTier: 'Silver',
    color: '#38BDF8',
  },
  {
    name: 'Barbell Back Squat',
    category: 'Quads & Glutes',
    currentKg: 105,
    reps: 5,
    target1RM: 140,
    rank: 'Gold I',
    rankTier: 'Gold',
    color: '#22C55E',
  },
  {
    name: 'Conventional Deadlift',
    category: 'Back & Hamstrings',
    currentKg: 130,
    reps: 4,
    target1RM: 170,
    rank: 'Gold II',
    rankTier: 'Gold',
    color: '#F59E0B',
  },
  {
    name: 'Overhead Shoulder Press',
    category: 'Deltoids & Traps',
    currentKg: 45,
    reps: 6,
    target1RM: 65,
    rank: 'Silver I',
    rankTier: 'Silver',
    color: '#C084FC',
  },
];

// Visual 1RM Strength Curve Indicator
function StrengthCurveCard({ benchmark }: { benchmark: Benchmark }) {
  const est1RM = calculate1RM(benchmark.currentKg, benchmark.reps);
  const masteryRatio = Math.min(1, Math.max(0.1, est1RM / benchmark.target1RM));

  return (
    <View style={styles.benchmarkCard}>
      <View style={styles.benchHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.benchName} numberOfLines={1}>{benchmark.name}</Text>
          <Text style={styles.benchSub} numberOfLines={1}>{benchmark.category}</Text>
        </View>
        <View style={[styles.rankTag, { borderColor: benchmark.color }]}>
          <Text style={[styles.rankTagText, { color: benchmark.color }]}>{benchmark.rank}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCol}>
          <Text style={styles.metricVal}>{benchmark.currentKg} kg × {benchmark.reps}</Text>
          <Text style={styles.metricLabel}>LAST LOG</Text>
        </View>
        <View style={styles.metricColRight}>
          <Text style={[styles.metricVal, { color: benchmark.color }]}>~{est1RM} kg</Text>
          <Text style={styles.metricLabel}>ESTIMATED 1RM</Text>
        </View>
      </View>

      {/* Strength Mastery Progress */}
      <View style={styles.progressWrap}>
        <ProgressBar value={masteryRatio} height={6} color={benchmark.color} />
        <View style={styles.progressSubRow}>
          <Text style={styles.progressSubText} numberOfLines={1}>{Math.round(masteryRatio * 100)}% to {benchmark.rankTier} Peak</Text>
          <Text style={styles.progressSubText} numberOfLines={1}>Milestone: {benchmark.target1RM}kg</Text>
        </View>
      </View>
    </View>
  );
}

export default function RankScreen() {
  const insets = useSafeAreaInsets();
  const { stats, profile } = useAppState();

  return (
    <View style={[styles.screen, { backgroundColor: '#080C14' }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 95 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.kicker}>RPG RANK PROGRESSION</Text>
          <Text style={styles.title}>Strength Mastery</Text>
          <Text style={styles.subTitle}>
            Automated 1RM analytics based on progressive overload combat logs.
          </Text>
        </View>

        {/* HERO RANK BADGE */}
        <View style={styles.heroRankCard}>
          <View style={styles.rankOrb}>
            <Feather name="award" size={32} color="#22C55E" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>GLOBAL POWER DIVISION</Text>
            <Text style={styles.heroTitle}>LEVEL {stats.level} CYBER ATHLETE</Text>
            <Text style={styles.heroSub}>Gold Tier III • Top 12% Lifters</Text>
          </View>
        </View>

        {/* 1RM COMPOUND BENCHMARKS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Compound Lifts Mastery</Text>
          <Text style={styles.sectionKicker}>EPLEY / BRZYCKI 1RM</Text>
        </View>

        {BENCHMARKS.map((b) => (
          <StrengthCurveCard key={b.name} benchmark={b} />
        ))}

        {/* RPG PROGRESSION NOTICE */}
        <View style={styles.noticeCard}>
          <Feather name="shield" size={16} color="#38BDF8" />
          <Text style={styles.noticeText}>
            Progressive overload calculations dynamically adjust your target load based on AMRAP and RIR metrics.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: { marginBottom: 16 },
  kicker: { color: '#38BDF8', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  title: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  subTitle: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  heroRankCard: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  rankOrb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#162032',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: 2 },
  heroLabel: { color: '#64748B', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  heroSub: { color: '#22C55E', fontSize: 12, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  sectionKicker: { color: '#64748B', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  benchmarkCard: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  benchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  benchName: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  benchSub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  rankTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#162030',
  },
  rankTagText: { fontSize: 10, fontWeight: '800' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricCol: { gap: 2 },
  metricColRight: { alignItems: 'flex-end', gap: 2 },
  metricVal: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  metricLabel: { color: '#64748B', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  progressWrap: { gap: 6 },
  progressSubRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressSubText: { color: '#64748B', fontSize: 10, fontWeight: '600' },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
  },
  noticeText: { color: '#94A3B8', fontSize: 11, flex: 1, lineHeight: 16 },
});
