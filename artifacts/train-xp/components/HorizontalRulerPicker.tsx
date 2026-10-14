import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

export interface HorizontalRulerPickerProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  unit: string;
  onValueChange: (val: number) => void;
  headerTitle?: string;
  headerIcon?: keyof typeof Feather.glyphMap;
  presets?: number[];
  fractionDigits?: number;
  needleColor?: string;
}

const ITEM_WIDTH = 14;

export function HorizontalRulerPicker({
  min,
  max,
  step = 1,
  value,
  unit,
  onValueChange,
  headerTitle,
  headerIcon = 'activity',
  presets,
  fractionDigits = 0,
  needleColor = '#38BDF8',
}: HorizontalRulerPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const isScrollingRef = useRef(false);
  const lastEmittedValueRef = useRef(value);

  const totalItems = useMemo(() => {
    return Math.round((max - min) / step) + 1;
  }, [min, max, step]);

  const items = useMemo(() => {
    const list: { val: number; isMajor: boolean; isMid: boolean; label?: string }[] = [];
    for (let i = 0; i < totalItems; i++) {
      const val = Number((min + i * step).toFixed(fractionDigits));
      let isMajor = false;
      let isMid = false;

      if (step >= 1) {
        isMajor = Math.round(val) % 10 === 0;
        isMid = !isMajor && Math.round(val) % 5 === 0;
      } else {
        // e.g. step = 0.5
        const tenths = Math.round(val * 10);
        isMajor = tenths % 50 === 0; // every 5 kg (50, 55, 60...)
        isMid = !isMajor && tenths % 10 === 0; // every 1 kg (51, 52...)
      }

      list.push({
        val,
        isMajor,
        isMid,
        label: isMajor ? String(Math.round(val)) : undefined,
      });
    }
    return list;
  }, [min, totalItems, step, fractionDigits]);

  // Initial scroll to current value on layout ready
  useEffect(() => {
    if (containerWidth > 0 && !isScrollingRef.current) {
      const targetIndex = Math.max(0, Math.min(totalItems - 1, Math.round((value - min) / step)));
      const targetOffset = targetIndex * ITEM_WIDTH;
      scrollRef.current?.scrollTo({ x: targetOffset, animated: false });
      lastEmittedValueRef.current = value;
    }
  }, [containerWidth, min, step, totalItems, value]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isScrollingRef.current = true;
    const offsetX = event.nativeEvent.contentOffset.x;
    const rawIndex = Math.round(offsetX / ITEM_WIDTH);
    const clampedIndex = Math.max(0, Math.min(totalItems - 1, rawIndex));
    const nextVal = Number((min + clampedIndex * step).toFixed(fractionDigits));

    if (nextVal !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = nextVal;
      void Haptics.selectionAsync();
      onValueChange(nextVal);
    }
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isScrollingRef.current = false;
    const offsetX = event.nativeEvent.contentOffset.x;
    const rawIndex = Math.round(offsetX / ITEM_WIDTH);
    const clampedIndex = Math.max(0, Math.min(totalItems - 1, rawIndex));
    const targetOffset = clampedIndex * ITEM_WIDTH;

    // Smoothly snap precisely to the center of the tick
    if (Math.abs(offsetX - targetOffset) > 1) {
      scrollRef.current?.scrollTo({ x: targetOffset, animated: true });
    }
  };

  const adjustBy = (delta: number) => {
    const next = Number(Math.max(min, Math.min(max, value + delta)).toFixed(fractionDigits));
    if (next !== value) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onValueChange(next);
      const targetIndex = Math.round((next - min) / step);
      scrollRef.current?.scrollTo({ x: targetIndex * ITEM_WIDTH, animated: true });
    }
  };

  const selectPreset = (presetVal: number) => {
    void Haptics.selectionAsync();
    onValueChange(presetVal);
    const targetIndex = Math.round((presetVal - min) / step);
    scrollRef.current?.scrollTo({ x: targetIndex * ITEM_WIDTH, animated: true });
  };

  const sidePadding = containerWidth > 0 ? (containerWidth - ITEM_WIDTH) / 2 : 140;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && w !== containerWidth) setContainerWidth(w);
      }}
    >
      {/* Header Tag */}
      {headerTitle ? (
        <View style={styles.headerRow}>
          <Feather name={headerIcon} size={15} color="#38BDF8" />
          <Text style={styles.headerTitle}>{headerTitle.toUpperCase()}</Text>
        </View>
      ) : null}

      {/* Primary Value Display with - and + Buttons */}
      <View style={styles.valueRow}>
        <Pressable
          onPress={() => adjustBy(-step)}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
          hitSlop={8}
        >
          <Feather name="minus" size={18} color="#38BDF8" />
        </Pressable>

        <View style={styles.valueCenter}>
          <Text style={styles.valueNumber}>
            {fractionDigits > 0 ? value.toFixed(fractionDigits) : Math.round(value)}
          </Text>
          <Text style={styles.valueUnit}>{unit}</Text>
        </View>

        <Pressable
          onPress={() => adjustBy(step)}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
          hitSlop={8}
        >
          <Feather name="plus" size={18} color="#38BDF8" />
        </Pressable>
      </View>

      {/* Horizontal Ruler viewport */}
      <View style={styles.rulerViewport}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{
            paddingHorizontal: sidePadding,
            alignItems: 'flex-start',
          }}
          nestedScrollEnabled
        >
          {items.map((item, idx) => (
            <View key={idx} style={[styles.tickColumn, { width: ITEM_WIDTH }]}>
              <View
                style={[
                  styles.tickLine,
                  item.isMajor
                    ? styles.tickMajor
                    : item.isMid
                    ? styles.tickMid
                    : styles.tickMinor,
                ]}
              />
              {item.isMajor && item.label ? (
                <Text style={styles.tickLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              ) : (
                <View style={styles.tickLabelPlaceholder} />
              )}
            </View>
          ))}
        </ScrollView>

        {/* Center Target Needle Indicator */}
        <View pointerEvents="none" style={styles.needleWrapper}>
          <View style={[styles.needleDiamond, { borderBottomColor: needleColor }]} />
          <View style={[styles.needleLine, { backgroundColor: needleColor }]} />
        </View>

        {/* Left & Right Edge Fade Gradients */}
        <LinearGradient
          pointerEvents="none"
          colors={['#131926', 'rgba(19, 25, 38, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fadeLeft}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(19, 25, 38, 0)', '#131926']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fadeRight}
        />
      </View>

      {/* Preset Chips Row */}
      {presets && presets.length > 0 ? (
        <View style={styles.presetsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsContent}>
            {presets.map((p) => {
              const active = Math.abs(value - p) < 0.25;
              return (
                <Pressable
                  key={p}
                  onPress={() => selectPreset(p)}
                  style={[styles.presetChip, active && styles.presetChipActive]}
                >
                  <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#131926',
    borderWidth: 1.5,
    borderColor: '#202A3C',
    borderRadius: 22,
    paddingTop: 18,
    paddingBottom: 14,
    marginVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  headerTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 8,
  },
  valueCenter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  valueNumber: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  valueUnit: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '800',
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1A2332',
    borderWidth: 1,
    borderColor: '#2A364F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPressed: {
    opacity: 0.7,
    backgroundColor: '#233047',
  },
  rulerViewport: {
    width: '100%',
    height: 78,
    position: 'relative',
    marginTop: 4,
    marginBottom: 6,
    justifyContent: 'flex-start',
  },
  tickColumn: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 72,
  },
  tickLine: {
    borderRadius: 1.5,
  },
  tickMajor: {
    width: 2.2,
    height: 34,
    backgroundColor: '#E2E8F0',
  },
  tickMid: {
    width: 1.8,
    height: 22,
    backgroundColor: '#94A3B8',
  },
  tickMinor: {
    width: 1.2,
    height: 14,
    backgroundColor: '#334155',
  },
  tickLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  tickLabelPlaceholder: {
    height: 18,
  },
  needleWrapper: {
    position: 'absolute',
    left: '50%',
    marginLeft: -1.75,
    top: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  needleDiamond: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 5,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 1,
  },
  needleLine: {
    width: 3.5,
    height: 40,
    borderRadius: 2,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 48,
    zIndex: 5,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    zIndex: 5,
  },
  presetsWrapper: {
    width: '100%',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  presetsContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#1A2332',
    borderWidth: 1,
    borderColor: '#263449',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  presetChipActive: {
    backgroundColor: '#1E3A5F',
    borderColor: '#38BDF8',
  },
  presetChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  presetChipTextActive: {
    color: '#38BDF8',
    fontWeight: '900',
  },
});
