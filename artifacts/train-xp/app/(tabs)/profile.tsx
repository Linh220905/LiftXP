import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '@/context/AppState';
import { useColors } from '@/hooks/useColors';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { stats, profile } = useAppState();
  return <View style={[styles.screen, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 100 }]}><View style={styles.profileHead}><View style={[styles.avatar, { backgroundColor: colors.cobalt }]}><Text style={[styles.avatarText, { color: colors.foreground }]}>L</Text></View><Text style={[styles.name, { color: colors.foreground }]}>LINH</Text><Text style={[styles.handle, { color: colors.mutedForeground }]}>@linhtrains</Text><View style={[styles.levelPill, { backgroundColor: colors.tint }]}><Text style={[styles.levelPillText, { color: colors.primaryForeground }]}>LEVEL {stats.level}</Text></View></View><View style={styles.profileStats}><Stat label="WORKOUTS" value={String(stats.workouts)} colors={colors} /><Stat label="PRS" value={String(stats.prs)} colors={colors} /><Stat label="STREAK" value={`${stats.streak}d`} colors={colors} /></View><View style={[styles.featured, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.featuredTop}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Achievements</Text><Text style={[styles.sectionLink, { color: colors.tint }]}>12 TOTAL</Text></View><View style={styles.achievementRow}><Achievement icon="award" label="FIRST PR" colors={colors} /><Achievement icon="zap" label="7 DAY STREAK" colors={colors} /><Achievement icon="target" label="FIRST WORKOUT" colors={colors} /></View></View><Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 26, marginBottom: 12 }]}>Top ranks</Text><RankLine name="Bench Press" value="Silver III" color={colors.cobalt} colors={colors} /><RankLine name="Back Squat" value="Bronze II" color={colors.coral} colors={colors} /><RankLine name="Deadlift" value="Silver I" color={colors.gold} colors={colors} /><View style={[styles.preference, { backgroundColor: colors.secondary }]}><View style={[styles.prefIcon, { backgroundColor: colors.card }]}><Feather name="target" size={18} color={colors.tint} /></View><View style={styles.prefCopy}><Text style={[styles.prefTitle, { color: colors.foreground }]}>Training for {profile.goal}</Text><Text style={[styles.prefSub, { color: colors.mutedForeground }]}>Your plan adapts as you train.</Text></View><Feather name="chevron-right" size={17} color={colors.mutedForeground} /></View></ScrollView></View>;
}

function Stat({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.stat}><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text></View>;
}
function Achievement({ icon, label, colors }: { icon: 'award' | 'zap' | 'target'; label: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.achievement}><View style={[styles.achievementIcon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={18} color={colors.gold} /></View><Text style={[styles.achievementLabel, { color: colors.mutedForeground }]}>{label}</Text></View>;
}
function RankLine({ name, value, color, colors }: { name: string; value: string; color: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.rankLine, { borderBottomColor: colors.border }]}><View style={[styles.rankDot, { backgroundColor: color }]} /><Text style={[styles.rankName, { color: colors.foreground }]}>{name}</Text><Text style={[styles.rankValue, { color }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  profileHead: { alignItems: 'center', paddingVertical: 8 },
  avatar: { width: 76, height: 76, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 30, fontWeight: '800' },
  name: { fontSize: 25, fontWeight: '800', letterSpacing: 1.2 },
  handle: { fontSize: 12, marginTop: 4 },
  levelPill: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginTop: 12 },
  levelPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  profileStats: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 25 },
  stat: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 23, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  featured: { borderWidth: 1, borderRadius: 20, padding: 16 },
  featuredTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  sectionLink: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  achievementRow: { flexDirection: 'row', justifyContent: 'space-between' },
  achievement: { alignItems: 'center', gap: 8, width: '31%' },
  achievementIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  achievementLabel: { fontSize: 8, fontWeight: '800', textAlign: 'center', letterSpacing: 0.2 },
  rankLine: { borderBottomWidth: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankDot: { width: 9, height: 9, borderRadius: 99 },
  rankName: { flex: 1, fontSize: 14, fontWeight: '700' },
  rankValue: { fontSize: 13, fontWeight: '800' },
  preference: { borderRadius: 17, minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, marginTop: 23 },
  prefIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  prefCopy: { flex: 1, gap: 4 },
  prefTitle: { fontSize: 13, fontWeight: '800' },
  prefSub: { fontSize: 11 },
});