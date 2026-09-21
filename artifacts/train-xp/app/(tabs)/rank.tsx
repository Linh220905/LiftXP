import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressBar } from '@/components/ProgressBar';
import { useAppState } from '@/context/AppState';
import { useColors } from '@/hooks/useColors';

export default function RankScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { stats } = useAppState();
  return <View style={[styles.screen, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 100 }]}><Text style={[styles.kicker, { color: colors.tint }]}>YOUR PROGRESSION</Text><Text style={[styles.title, { color: colors.foreground }]}>Ranks</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Small wins add up to a stronger character.</Text><View style={[styles.heroRank, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.rankOrb, { backgroundColor: colors.cobalt }]}><Feather name="award" size={34} color={colors.foreground} /></View><View style={styles.heroCopy}><Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>CURRENT GLOBAL LEVEL</Text><Text style={[styles.heroValue, { color: colors.foreground }]}>LEVEL {stats.level}</Text><Text style={[styles.heroSub, { color: colors.tint }]}>Silver division</Text></View></View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Exercise ranks</Text><RankRow name="Bench Press" rank="Silver III" next="70 kg × 6" progress={0.72} color={colors.cobalt} colors={colors} /><RankRow name="Back Squat" rank="Bronze II" next="90 kg × 5" progress={0.48} color={colors.coral} colors={colors} /><RankRow name="Deadlift" rank="Silver I" next="120 kg × 3" progress={0.61} color={colors.gold} colors={colors} /><RankRow name="Shoulder Press" rank="Bronze I" next="32 kg × 6" progress={0.31} color={colors.tint} colors={colors} /><View style={[styles.note, { backgroundColor: colors.secondary }]}><Feather name="info" size={17} color={colors.tint} /><Text style={[styles.noteText, { color: colors.mutedForeground }]}>Ranks are a game progression system based on your performance, not a scientific standard.</Text></View></ScrollView></View>;
}

function RankRow({ name, rank, next, progress, color, colors }: { name: string; rank: string; next: string; progress: number; color: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.rankRow, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.rowTop}><View><Text style={[styles.rankName, { color: colors.foreground }]}>{name}</Text><Text style={[styles.rankNext, { color: colors.mutedForeground }]}>Next · {next}</Text></View><Text style={[styles.rankValue, { color }]}>{rank}</Text></View><ProgressBar value={progress} height={7} color={color} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1.2, marginTop: 6 },
  subtitle: { fontSize: 14, marginTop: 8, marginBottom: 24 },
  heroRank: { borderWidth: 1, borderRadius: 21, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 25 },
  rankOrb: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { gap: 3 },
  heroLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  heroValue: { fontSize: 26, fontWeight: '800' },
  heroSub: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  rankRow: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 13, marginBottom: 10 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rankName: { fontSize: 15, fontWeight: '700' },
  rankNext: { fontSize: 11, marginTop: 4 },
  rankValue: { fontSize: 14, fontWeight: '800' },
  note: { borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10, marginTop: 9 },
  noteText: { flex: 1, fontSize: 11, lineHeight: 16 },
});