import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { type WorkoutHistoryItem } from '@/lib/effort';
import { useI18n } from '@/lib/i18n';
import { localDateKey } from '@/lib/units';

interface ActivityHeatmapProps {
  workoutsHistory?: WorkoutHistoryItem[];
  weeks?: number;
  title?: string;
}

export function ActivityHeatmap({
  workoutsHistory = [],
  weeks = 18,
  title,
}: ActivityHeatmapProps) {
  const { locale } = useI18n();
  const daysPerWeek = 7;

  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    workoutsHistory.forEach((w) => {
      const date = new Date(w.date);
      const dateStr = localDateKey(date);
      const count =
        w.entries?.reduce(
          (acc, e) => acc + (e.sets?.filter((s) => s.done).length || 0),
          0,
        ) || 0;
      map.set(dateStr, (map.get(dateStr) || 0) + count);
    });
    return map;
  }, [workoutsHistory]);

  const grid = useMemo(() => {
    const today = new Date();
    const cols: number[][] = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const col: number[] = [];
      for (let d = 0; d < daysPerWeek; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + (6 - d)));
        const dateStr = localDateKey(date);
        const count = activityMap.get(dateStr) || 0;

        if (count >= 10) col.push(3);
        else if (count >= 5) col.push(2);
        else if (count > 0) col.push(1);
        else col.push(0);
      }
      cols.push(col);
    }
    return cols;
  }, [activityMap, weeks]);

  const getColor = (lvl: number) => {
    switch (lvl) {
      case 3:
        return '#38BDF8';
      case 2:
        return '#0284C7';
      case 1:
        return '#0369A1';
      default:
        return '#131C2D';
    }
  };

  const defaultTitle =
    locale === 'vi' ? 'NHẬT KÝ HOẠT ĐỘNG TẬP LUYỆN' : 'WORKOUT ACTIVITY MATRIX';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title || defaultTitle}</Text>
        <View style={styles.legendRow}>
          <Text style={styles.legendText}>
            {locale === 'vi' ? 'Ít' : 'Less'}
          </Text>
          <View style={[styles.miniDot, { backgroundColor: '#131C2D' }]} />
          <View style={[styles.miniDot, { backgroundColor: '#0369A1' }]} />
          <View style={[styles.miniDot, { backgroundColor: '#0284C7' }]} />
          <View style={[styles.miniDot, { backgroundColor: '#38BDF8' }]} />
          <Text style={styles.legendText}>
            {locale === 'vi' ? 'Nhiều' : 'More'}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.grid}>
          {grid.map((col, wIdx) => (
            <View key={wIdx} style={styles.col}>
              {col.map((val, dIdx) => (
                <View
                  key={dIdx}
                  style={[styles.cell, { backgroundColor: getColor(val) }]}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: 4,
  },
  col: {
    flexDirection: 'column',
    gap: 4,
  },
  cell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
export default ActivityHeatmap;
