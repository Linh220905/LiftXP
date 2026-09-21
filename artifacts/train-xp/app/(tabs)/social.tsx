import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const people = [
  { name: 'Minh', detail: 'reached Gold on Squat', xp: '1,840 XP', initials: 'M', colorKey: 'cobalt' as const, icon: 'award' as const },
  { name: 'Linh', detail: 'hit a new Bench Press PR', xp: '1,620 XP', initials: 'L', colorKey: 'tint' as const, icon: 'zap' as const },
  { name: 'Nam', detail: 'completed a 30-day streak', xp: '1,430 XP', initials: 'N', colorKey: 'coral' as const, icon: 'activity' as const },
];

export default function SocialScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'Friends' | 'Global'>('Friends');
  return <View style={[styles.screen, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 100 }]}><View style={styles.head}><View><Text style={[styles.kicker, { color: colors.tint }]}>THE LIFTING CLUB</Text><Text style={[styles.title, { color: colors.foreground }]}>Social</Text></View><View style={[styles.iconButton, { backgroundColor: colors.secondary }]}><Feather name="bell" size={18} color={colors.foreground} /></View></View><View style={[styles.segment, { backgroundColor: colors.secondary }]}>{(['Friends', 'Global'] as const).map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.segmentItem, filter === item && { backgroundColor: colors.card }]}><Text style={[styles.segmentText, { color: filter === item ? colors.foreground : colors.mutedForeground }]}>{item}</Text></Pressable>)}</View><View style={styles.leaderHead}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>This week</Text><Text style={[styles.sectionLink, { color: colors.tint }]}>BY XP</Text></View>{people.map((person, index) => <View key={person.name} style={[styles.personRow, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.position, { color: index === 0 ? colors.gold : colors.mutedForeground }]}>{String(index + 1).padStart(2, '0')}</Text><View style={[styles.personAvatar, { backgroundColor: colors[person.colorKey] }]}><Text style={[styles.initials, { color: person.colorKey === 'tint' ? colors.primaryForeground : colors.foreground }]}>{person.initials}</Text></View><View style={styles.personCopy}><Text style={[styles.personName, { color: colors.foreground }]}>{person.name}</Text><Text style={[styles.personDetail, { color: colors.mutedForeground }]}>{person.detail}</Text></View><Text style={[styles.personXp, { color: colors.tint }]}>{person.xp}</Text></View>)}<Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 27 }]}>Activity</Text>{people.map((person) => <ActivityRow key={`activity-${person.name}`} person={person} colors={colors} />)}</ScrollView></View>;
}

function ActivityRow({ person, colors }: { person: typeof people[number]; colors: ReturnType<typeof useColors> }) {
  const [reacted, setReacted] = useState(false);
  return <View style={[styles.activity, { borderBottomColor: colors.border }]}><View style={[styles.activityIcon, { backgroundColor: colors.secondary }]}><Feather name={person.icon} size={17} color={colors[person.colorKey]} /></View><View style={styles.activityCopy}><Text style={[styles.activityText, { color: colors.foreground }]}><Text style={{ fontWeight: '800' }}>{person.name}</Text> {person.detail}</Text><Text style={[styles.activityTime, { color: colors.mutedForeground }]}>Today · 2h ago</Text></View><Pressable onPress={() => setReacted(!reacted)} style={[styles.reaction, { backgroundColor: reacted ? colors.tint : colors.secondary }]}><Feather name="thumbs-up" size={15} color={reacted ? colors.primaryForeground : colors.mutedForeground} /></Pressable></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 21 },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1.2, marginTop: 6 },
  iconButton: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  segment: { padding: 4, borderRadius: 14, flexDirection: 'row', marginBottom: 26 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 11 },
  segmentText: { fontSize: 12, fontWeight: '700' },
  leaderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  sectionLink: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  personRow: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  position: { width: 20, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  personAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 15, fontWeight: '800' },
  personCopy: { flex: 1, gap: 4 },
  personName: { fontSize: 14, fontWeight: '800' },
  personDetail: { fontSize: 11 },
  personXp: { fontSize: 12, fontWeight: '800' },
  activity: { minHeight: 72, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  activityIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1, gap: 4 },
  activityText: { fontSize: 13, lineHeight: 18 },
  activityTime: { fontSize: 10 },
  reaction: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});