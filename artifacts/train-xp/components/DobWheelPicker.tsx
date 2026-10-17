import { Text } from "@/components/AppTypography";
import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ageOn } from "@/lib/input";
import { useI18n } from "@/lib/i18n";

export interface DobWheelPickerProps {
  day: number;
  month: string;
  year: number;
  onDateChange: (date: { day: number; month: string; year: number }) => void;
  dayLabel?: string;
  monthLabel?: string;
  yearLabel?: string;
  locale?: "vi" | "en";
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 220
const PADDING_VERTICAL = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2; // 88

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function getDaysInMonth(year: number, monthStr: string): number {
  const mIndex = MONTH_NAMES.indexOf(monthStr as any);
  if (mIndex === -1) return 31;
  return new Date(year, mIndex + 1, 0).getDate();
}

interface WheelColumnProps<T> {
  items: readonly T[];
  value: T;
  onSelect: (val: T) => void;
  formatLabel?: (val: T) => string;
}

const WheelColumn = memo(function WheelColumn<T extends string | number>({
  items,
  value,
  onSelect,
  formatLabel,
}: WheelColumnProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const lastEmittedValueRef = useRef<T>(value);
  const hasInitializedRef = useRef(false);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOffsetRef = useRef(0);

  const clearSettleTimeout = () => {
    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearSettleTimeout();
    };
  }, []);

  // Sync changes from the parent, such as clamping 31 to 30 when the month changes.
  useEffect(() => {
    if (value !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = value;
      const idx = items.indexOf(value);
      if (idx >= 0) {
        lastOffsetRef.current = idx * ITEM_HEIGHT;
        scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
      }
    }
  }, [value, items]);

  const snapToNearest = useCallback(
    (offsetY: number) => {
      const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, rawIndex));
      const targetOffset = clampedIndex * ITEM_HEIGHT;

      const nextVal = items[clampedIndex];
      lastOffsetRef.current = targetOffset;
      if (nextVal !== undefined && nextVal !== lastEmittedValueRef.current) {
        lastEmittedValueRef.current = nextVal;
        void Haptics.selectionAsync();
        onSelect(nextVal);
      }
    },
    [items, onSelect],
  );

  const scheduleSettle = () => {
    clearSettleTimeout();
    settleTimeoutRef.current = setTimeout(
      () => snapToNearest(lastOffsetRef.current),
      250,
    );
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    lastOffsetRef.current = e.nativeEvent.contentOffset.y;
    if (settleTimeoutRef.current) scheduleSettle();
  };

  const handleScrollBeginDrag = () => {
    clearSettleTimeout();
  };

  const handleMomentumScrollBegin = () => {
    scheduleSettle();
  };

  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    lastOffsetRef.current = e.nativeEvent.contentOffset.y;
    // Settle after the last scroll event even if momentum-end is omitted.
    scheduleSettle();
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    clearSettleTimeout();
    snapToNearest(e.nativeEvent.contentOffset.y);
  };

  const handleContentSizeChange = () => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const idx = items.indexOf(value);
      if (idx >= 0) {
        lastOffsetRef.current = idx * ITEM_HEIGHT;
        scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
      }
    }
  };

  const handleItemPress = (item: T, idx: number) => {
    clearSettleTimeout();
    lastEmittedValueRef.current = item;
    lastOffsetRef.current = idx * ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
    void Haptics.selectionAsync();
    onSelect(item);
  };

  return (
    <View style={styles.columnContainer}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        overScrollMode="never"
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollBegin={handleMomentumScrollBegin}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onContentSizeChange={handleContentSizeChange}
        contentContainerStyle={styles.columnScrollContent}
      >
        {items.map((item, idx) => {
          const isSelected = item === value;
          const label = formatLabel ? formatLabel(item) : String(item);
          return (
            <Pressable
              key={idx}
              onPress={() => handleItemPress(item, idx)}
              style={styles.itemWrapper}
              hitSlop={4}
            >
              <Text
                style={[styles.itemText, isSelected && styles.itemTextSelected]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}) as <T extends string | number>(props: WheelColumnProps<T>) => React.ReactElement;

export function DobWheelPicker({
  day,
  month,
  year,
  onDateChange,
  dayLabel = "DAY",
  monthLabel = "MONTH",
  yearLabel = "YEAR",
  locale: _locale,
}: DobWheelPickerProps) {
  const { t } = useI18n();

  // Max days calculation according to selected year & month
  const maxDays = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const daysList = useMemo(() => {
    return Array.from({ length: maxDays }, (_, i) => i + 1);
  }, [maxDays]);

  const monthsList = useMemo(() => [...MONTH_NAMES], []);

  // Years from 2013 down to 1940 (age 13+)
  const yearsList = useMemo(() => {
    const latest = new Date().getFullYear() - 13;
    return Array.from({ length: 88 }, (_, i) => latest - i);
  }, []);

  // Keep a stable ref to current values for callbacks
  const dateRef = useRef({ day, month, year });
  dateRef.current = { day, month, year };

  const handleDaySelect = useCallback(
    (val: number) => {
      onDateChange({
        day: val,
        month: dateRef.current.month,
        year: dateRef.current.year,
      });
    },
    [onDateChange],
  );

  const handleMonthSelect = useCallback(
    (val: string) => {
      onDateChange({
        day: dateRef.current.day,
        month: val,
        year: dateRef.current.year,
      });
    },
    [onDateChange],
  );

  const handleYearSelect = useCallback(
    (val: number) => {
      onDateChange({
        day: dateRef.current.day,
        month: dateRef.current.month,
        year: val,
      });
    },
    [onDateChange],
  );

  const formatMonthLabel = useCallback(
    (m: string) => t.onboarding.months[m] || m,
    [t.onboarding.months],
  );

  // Auto-clamp day if current day exceeds days in month (e.g. Feb 31 -> Feb 28/29)
  useEffect(() => {
    if (day > maxDays) {
      onDateChange({ day: maxDays, month, year });
    }
  }, [day, maxDays, month, year, onDateChange]);

  const calculatedAge = ageOn(year, month, day) ?? 0;
  const isUnderAge = calculatedAge < 13;

  const formattedMonth = t.onboarding.months[month] || month;
  const formattedDateStr = t.onboarding.dateOfBirthFmt
    .replace("{day}", String(day))
    .replace("{month}", formattedMonth)
    .replace("{year}", String(year));

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
        {/* Horizontal Selection Focus Frame spanning all 3 columns - placed behind columns */}
        <View pointerEvents="none" style={styles.selectionFocusLens}>
          <View style={styles.lensPointerLeft} />
          <View style={styles.lensPointerRight} />
        </View>

        {/* 3 Wheel Columns */}
        <View style={styles.wheelsRow}>
          <WheelColumn
            items={daysList}
            value={day > maxDays ? maxDays : day}
            onSelect={handleDaySelect}
          />
          <WheelColumn
            items={monthsList}
            value={month}
            onSelect={handleMonthSelect}
            formatLabel={formatMonthLabel}
          />
          <WheelColumn
            items={yearsList}
            value={year}
            onSelect={handleYearSelect}
          />
        </View>

        {/* Top Fade Gradient */}
        <LinearGradient
          pointerEvents="none"
          colors={["#131926", "rgba(19, 25, 38, 0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.fadeTop}
        />

        {/* Bottom Fade Gradient */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(19, 25, 38, 0)", "#131926"]}
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
          <Text
            style={[
              styles.ageBadgeText,
              isUnderAge && styles.ageBadgeTextWarning,
            ]}
          >
            {isUnderAge
              ? t.onboarding.minAgeWarning
              : t.onboarding.yearsOldFmt.replace("{age}", String(calculatedAge))}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#131926",
    borderWidth: 1.5,
    borderColor: "#202A3C",
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginVertical: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  headersRow: {
    flexDirection: "row",
    width: "100%",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  headerCol: {
    flex: 1,
    alignItems: "center",
  },
  headerColText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
  },
  wheelViewport: {
    width: "100%",
    height: CONTAINER_HEIGHT,
    position: "relative",
    justifyContent: "center",
    overflow: "hidden",
  },
  selectionFocusLens: {
    position: "absolute",
    left: 4,
    right: 4,
    top: PADDING_VERTICAL,
    height: ITEM_HEIGHT,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: "#38BDF8",
    borderRadius: 12,
    zIndex: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  lensPointerLeft: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#38BDF8",
  },
  lensPointerRight: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#38BDF8",
  },
  wheelsRow: {
    flexDirection: "row",
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  columnContainer: {
    flex: 1,
    height: "100%",
  },
  columnScrollContent: {
    paddingVertical: PADDING_VERTICAL,
    alignItems: "center",
  },
  itemWrapper: {
    height: ITEM_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#94A3B8",
  },
  itemTextSelected: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  fadeTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 65,
    zIndex: 2,
    pointerEvents: "none",
  },
  fadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 65,
    zIndex: 2,
    pointerEvents: "none",
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  previewBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#38BDF8",
  },
  ageBadge: {
    backgroundColor: "#1E2C44",
    borderWidth: 1,
    borderColor: "#2D3E5E",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ageBadgeWarning: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  ageBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
  },
  ageBadgeTextWarning: {
    color: "#EF4444",
  },
});
