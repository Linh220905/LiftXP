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

export interface DobWheelPickerProps {
  day: number;
  month: string;
  year: number;
  onDateChange: (date: { day: number; month: string; year: number }) => void;
  dayLabel?: string;
  monthLabel?: string;
  yearLabel?: string;
  locale?: 'vi' | 'en';
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 220
const PADDING_VERTICAL = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2; // 88

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const VI_MONTH_MAP: Record<string, string> = {
  Jan: 'Thg 1',
  Feb: 'Thg 2',
  Mar: 'Thg 3',
  Apr: 'Thg 4',
  May: 'Thg 5',
  Jun: 'Thg 6',
  Jul: 'Thg 7',
  Aug: 'Thg 8',
  Sep: 'Thg 9',
  Oct: 'Thg 10',
  Nov: 'Thg 11',
  Dec: 'Thg 12',
};

function getDaysInMonth(year: number, monthStr: string): number {
  const mIndex = MONTH_NAMES.indexOf(monthStr as any);
  if (mIndex === -1) return 31;
  return new Date(year, mIndex + 1, 0).getDate();
}

interface WheelColumnProps<T> {
  items: T[];
  value: T;
  onSelect: (val: T) => void;
  formatLabel?: (val: T) => string;
}

function WheelColumn<T extends string | number>({
  items,
  value,
  onSelect,
  formatLabel,
}: WheelColumnProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const isInteractingRef = useRef(false);
  const lastEmittedValueRef = useRef(value);
  const [isReady, setIsReady] = useState(false);

  // Synchronize scroll position when value or items change from outside
  useEffect(() => {
    if (isReady && !isInteractingRef.current) {
      const idx = items.indexOf(value);
      if (idx >= 0) {
        lastEmittedValueRef.current = value;
        scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
      }
    }
  }, [value, items, isReady]);

  const handleLayout = () => {
    if (!isReady) {
      setIsReady(true);
      const idx = items.indexOf(value);
      if (idx >= 0) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
        }, 20);
      }
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isInteractingRef.current) return;
    const offsetY = e.nativeEvent.contentOffset.y;
    const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, rawIndex));
    const nextVal = items[clampedIndex];

    if (nextVal !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = nextVal;
      void Haptics.selectionAsync();
      onSelect(nextVal);
    }
  };

  const handleScrollEnd = (e?: NativeSyntheticEvent<NativeScrollEvent>) => {
    isInteractingRef.current = false;
    if (!e) return;
    const offsetY = e.nativeEvent.contentOffset.y;
    const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, rawIndex));
    const targetOffset = clampedIndex * ITEM_HEIGHT;

    if (Math.abs(offsetY - targetOffset) > 0.5) {
      scrollRef.current?.scrollTo({ y: targetOffset, animated: true });
    }

    const nextVal = items[clampedIndex];
    if (nextVal !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = nextVal;
      void Haptics.selectionAsync();
      onSelect(nextVal);
    }
  };

  const handleItemPress = (idx: number) => {
    isInteractingRef.current = false;
    const targetOffset = idx * ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y: targetOffset, animated: true });
    const nextVal = items[idx];
    if (nextVal !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = nextVal;
      void Haptics.selectionAsync();
      onSelect(nextVal);
    }
  };

  return (
    <View style={styles.columnContainer}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="center"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          isInteractingRef.current = true;
        }}
        onMomentumScrollBegin={() => {
          isInteractingRef.current = true;
        }}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        onLayout={handleLayout}
        contentContainerStyle={styles.columnScrollContent}
        nestedScrollEnabled
      >
        {items.map((item, idx) => {
          const isSelected = item === value;
          const label = formatLabel ? formatLabel(item) : String(item);
          return (
            <Pressable
              key={idx}
              onPress={() => handleItemPress(idx)}
              style={styles.itemWrapper}
              hitSlop={4}
            >
              <Text
                style={[
                  styles.itemText,
                  isSelected && styles.itemTextSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function DobWheelPicker({
  day,
  month,
  year,
  onDateChange,
  dayLabel = 'DAY',
  monthLabel = 'MONTH',
  yearLabel = 'YEAR',
  locale = 'vi',
}: DobWheelPickerProps) {
  // Max days calculation according to selected year & month
  const maxDays = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const daysList = useMemo(() => {
    return Array.from({ length: maxDays }, (_, i) => i + 1);
  }, [maxDays]);

  const monthsList = useMemo(() => [...MONTH_NAMES], []);

  // Years from 2013 down to 1940 (age 13+)
  const yearsList = useMemo(() => {
    return Array.from({ length: 74 }, (_, i) => 2013 - i);
  }, []);

  // Auto-clamp day if current day exceeds days in month (e.g. Feb 31 -> Feb 28/29)
  useEffect(() => {
    if (day > maxDays) {
      onDateChange({ day: maxDays, month, year });
    }
  }, [day, maxDays, month, year, onDateChange]);

  const currentYear = new Date().getFullYear();
  const calculatedAge = currentYear - year;
  const isUnderAge = calculatedAge < 13;

  const formattedMonth = locale === 'vi' ? VI_MONTH_MAP[month] || month : month;
  const formattedDateStr =
    locale === 'vi'
      ? `Ngày ${day} ${formattedMonth}, ${year}`
      : `${month} ${day}, ${year}`;

  return (
    <View style={styles.container}>
      {/* Column Headers */}
      <View style={styles.headersRow}>
        <View style={styles.headerCol}>
          <Text style={styles.headerColText}>{dayLabel.toUpperCase()}</Text>
        </View>
        <View style={styles.headerCol}>
          <Text style={styles.headerColText}>{monthLabel.toUpperCase()}</Text>
        </View>
        <View style={styles.headerCol}>
          <Text style={styles.headerColText}>{yearLabel.toUpperCase()}</Text>
        </View>
      </View>

      {/* Main Wheel Viewport */}
      <View style={styles.wheelViewport}>
        {/* Horizontal Selection Focus Frame spanning all 3 columns */}
        <View pointerEvents="none" style={styles.selectionFocusLens}>
          <View style={styles.lensPointerLeft} />
          <View style={styles.lensPointerRight} />
        </View>

        {/* 3 Wheel Columns */}
        <View style={styles.wheelsRow}>
          <WheelColumn
            items={daysList}
            value={day > maxDays ? maxDays : day}
            onSelect={(val) => onDateChange({ day: val, month, year })}
          />
          <WheelColumn
            items={monthsList}
            value={month}
            onSelect={(val) => onDateChange({ day, month: val, year })}
            formatLabel={(m) => (locale === 'vi' ? VI_MONTH_MAP[m] || m : m)}
          />
          <WheelColumn
            items={yearsList}
            value={year}
            onSelect={(val) => onDateChange({ day, month, year: val })}
          />
        </View>

        {/* Top Fade Gradient */}
        <LinearGradient
          pointerEvents="none"
          colors={['#131926', 'rgba(19, 25, 38, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.fadeTop}
        />

        {/* Bottom Fade Gradient */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(19, 25, 38, 0)', '#131926']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.fadeBottom}
        />
      </View>

      {/* Live Selected Date & Age Confirmation Badge */}
      <View style={styles.previewCard}>
        <View style={styles.previewBadge}>
          <Feather name="calendar" size={14} color="#38BDF8" />
          <Text style={styles.previewBadgeText}>{formattedDateStr}</Text>
        </View>
        <View style={[styles.ageBadge, isUnderAge && styles.ageBadgeWarning]}>
          <Text style={[styles.ageBadgeText, isUnderAge && styles.ageBadgeTextWarning]}>
            {isUnderAge
              ? locale === 'vi'
                ? 'Tối thiểu 13 tuổi'
                : 'Min 13 years old'
              : `${calculatedAge} ${locale === 'vi' ? 'tuổi' : 'years old'}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#131926',
    borderWidth: 1.5,
    borderColor: '#202A3C',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  headersRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  headerCol: {
    flex: 1,
    alignItems: 'center',
  },
  headerColText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  wheelViewport: {
    width: '100%',
    height: CONTAINER_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selectionFocusLens: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: PADDING_VERTICAL,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#38BDF8',
    borderRadius: 12,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  lensPointerLeft: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
  },
  lensPointerRight: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
  },
  wheelsRow: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  columnContainer: {
    flex: 1,
    height: '100%',
  },
  columnScrollContent: {
    paddingVertical: PADDING_VERTICAL,
    alignItems: 'center',
  },
  itemWrapper: {
    height: ITEM_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  itemTextSelected: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  fadeTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 65,
    zIndex: 5,
  },
  fadeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 65,
    zIndex: 5,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  previewBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
  },
  ageBadge: {
    backgroundColor: '#1E2C44',
    borderWidth: 1,
    borderColor: '#2D3E5E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ageBadgeWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  ageBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  ageBadgeTextWarning: {
    color: '#EF4444',
  },
});
