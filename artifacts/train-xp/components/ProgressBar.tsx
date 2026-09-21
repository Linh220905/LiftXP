import { StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function ProgressBar({ value, height = 8, color }: { value: number; height?: number; color?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.track, { height, backgroundColor: colors.secondary }]}>
      <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: color ?? colors.tint }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
});