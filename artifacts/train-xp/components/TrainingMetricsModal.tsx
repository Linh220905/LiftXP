import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Text, TextInput } from "@/components/AppTypography";
import Colors from "@/constants/colors";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useI18n } from "@/lib/i18n";

interface TrainingMetricsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface MetricItem {
  id: string;
  shortName: string;
  icon: keyof typeof Feather.glyphMap;
}

const METRICS_DATA: MetricItem[] = [
  { id: "rir", shortName: "RIR", icon: "activity" },
  { id: "rpe", shortName: "RPE", icon: "zap" },
  { id: "1rm", shortName: "1RM", icon: "award" },
  { id: "volume", shortName: "Volume", icon: "bar-chart-2" },
  { id: "pr", shortName: "PR", icon: "trending-up" },
  { id: "deload", shortName: "Deload", icon: "shield" },
  { id: "bw_ratio", shortName: "BW", icon: "crosshair" },
];

const palette = Colors.dark;

// Match Vietnamese queries with or without accents, including đ/Đ.
function searchable(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

export function TrainingMetricsModal({
  visible,
  onClose,
}: TrainingMetricsModalProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 500;
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setQuery("");
      setExpanded(null);
    }
  }, [visible]);

  const search = searchable(query.trim());
  const metrics = METRICS_DATA.filter((item) => {
    const itemTrans = t.trainingMetrics.items[item.id];
    if (!itemTrans) return false;
    return searchable(
      [
        item.shortName,
        itemTrans.title,
        itemTrans.badge,
        itemTrans.definition,
        itemTrans.guide,
      ].join(" "),
    ).includes(search);
  });
  const close = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.backdrop, { paddingTop: insets.top + 12 }]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.trainingMetrics.closeGuide}
        />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
          accessibilityViewIsModal
        >
          <View style={[styles.handle, compact && styles.compactHandle]} />
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Feather name="book-open" size={22} color={palette.primary} />
            </View>
            <View style={styles.headerCopy}>
              {!compact && (
                <Text style={styles.eyebrow}>
                  {t.trainingMetrics.trainingLibraryTag}
                </Text>
              )}
              <Text style={styles.sheetTitle} accessibilityRole="header">
                {t.trainingMetrics.trainingGuideTitle}
              </Text>
            </View>
            <Pressable
              onPress={close}
              style={({ pressed }) => [
                styles.closeIconBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t.trainingMetrics.closeGuide}
            >
              <Feather name="x" size={20} color={palette.mutedForeground} />
            </Pressable>
          </View>
          {!compact && (
            <Text style={styles.sheetSubtitle}>
              {t.trainingMetrics.trainingGuideSubtitle}
            </Text>
          )}
          <View style={[styles.searchBox, compact && styles.compactSearch]}>
            <Feather name="search" size={18} color={palette.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              placeholder={t.trainingMetrics.searchPlaceholder}
              placeholderTextColor={palette.mutedForeground}
              accessibilityLabel={t.trainingMetrics.searchA11y}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {!!query && (
              <Pressable
                onPress={() => setQuery("")}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel={t.trainingMetrics.clearSearchA11y}
              >
                <Feather
                  name="x-circle"
                  size={18}
                  color={palette.mutedForeground}
                />
              </Pressable>
            )}
          </View>
          <View
            style={[styles.listHeading, compact && styles.compactListHeading]}
          >
            <Text style={styles.listLabel} accessibilityLiveRegion="polite">
              {search
                ? t.trainingMetrics.searchResultCountFmt.replace(
                    "{count}",
                    String(metrics.length),
                  )
                : t.trainingMetrics.searchResultAllFmt}
            </Text>
            <Text style={styles.listHint}>
              {t.trainingMetrics.tapToExplore}
            </Text>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {metrics.map((item) => {
              const open = expanded === item.id;
              const itemTrans = t.trainingMetrics.items[item.id];
              if (!itemTrans) return null;
              return (
                <View
                  key={item.id}
                  style={[styles.metricCard, open && styles.metricCardOpen]}
                >
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setExpanded(open ? null : item.id);
                      void Haptics.selectionAsync();
                    }}
                    style={({ pressed }) => [
                      styles.cardHeader,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    aria-expanded={open}
                    accessibilityLabel={`${item.shortName}: ${itemTrans.title}`}
                  >
                    <View
                      style={[styles.iconWrap, open && styles.iconWrapOpen]}
                    >
                      <Feather
                        name={item.icon}
                        size={20}
                        color={open ? palette.primary : palette.mutedForeground}
                      />
                    </View>
                    <View style={styles.cardHeading}>
                      <View style={styles.cardTitleRow}>
                        <Text
                          style={[
                            styles.shortName,
                            open && styles.shortNameOpen,
                          ]}
                        >
                          {item.shortName}
                        </Text>
                        <Text style={styles.category}>
                          {itemTrans.badge}
                        </Text>
                      </View>
                      <Text style={styles.cardTitle}>
                        {itemTrans.title}
                      </Text>
                    </View>
                    <Feather
                      name={open ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={palette.mutedForeground}
                    />
                  </Pressable>
                  {open && (
                    <View style={styles.cardBody}>
                      <Text style={styles.definitionText}>
                        {itemTrans.definition}
                      </Text>
                      <View style={styles.guideBox}>
                        <View style={styles.guideHeading}>
                          <Feather
                            name="compass"
                            size={14}
                            color={palette.primary}
                          />
                          <Text style={styles.guideLabel}>
                            {t.trainingMetrics.inPractice}
                          </Text>
                        </View>
                        {itemTrans.guide
                          .split("\n")
                          .map((line, index) => (
                            <View key={index} style={styles.guideLine}>
                              {line.startsWith("•") && (
                                <View style={styles.bullet} />
                              )}
                              <Text style={styles.guideText}>
                                {line.replace(/^•\s*/, "")}
                              </Text>
                            </View>
                          ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
            {!metrics.length && (
              <View style={styles.emptyState}>
                <Feather
                  name="search"
                  size={28}
                  color={palette.mutedForeground}
                />
                <Text style={styles.emptyTitle}>
                  {t.trainingMetrics.noMetricsFound}
                </Text>
                <Text style={styles.emptyText}>
                  {t.trainingMetrics.noMetricsFoundSub}
                </Text>
                <Pressable
                  onPress={() => setQuery("")}
                  style={styles.resetBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.resetText}>
                    {t.trainingMetrics.viewAllMetrics}
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable
              onPress={close}
              style={({ pressed }) => [
                styles.doneBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t.trainingMetrics.gotIt}
            >
              <Text style={styles.doneBtnText}>
                {t.trainingMetrics.gotIt}
              </Text>
              <Feather
                name="check"
                size={18}
                color={palette.primaryForeground}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  sheet: {
    height: "100%",
    flexShrink: 1,
    maxHeight: "100%",
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    backgroundColor: palette.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#334155",
    alignSelf: "center",
    marginBottom: 20,
  },
  compactHandle: { marginBottom: 10 },
  compactSearch: { marginTop: 10 },
  compactListHeading: { paddingVertical: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(56,189,248,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 4 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: palette.primary,
  },
  sheetTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "700",
    color: palette.text,
    letterSpacing: -0.6,
    flexShrink: 1,
  },
  sheetSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: palette.mutedForeground,
    marginTop: 14,
    marginBottom: 18,
  },
  closeIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.card,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingLeft: 14,
    paddingRight: 4,
    borderRadius: 14,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    fontSize: 13,
    color: palette.text,
  },
  clearBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  listHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
    paddingVertical: 16,
  },
  listLabel: { color: palette.text, fontSize: 12, fontWeight: "600" },
  listHint: { color: palette.mutedForeground, fontSize: 12 },
  scroll: { flexShrink: 1 },
  scrollContent: { gap: 10, paddingBottom: 8 },
  metricCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
  },
  metricCardOpen: { borderColor: "#27516A" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    minHeight: 80,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.muted,
    flexShrink: 0,
  },
  iconWrapOpen: { backgroundColor: "rgba(56,189,248,0.10)" },
  cardHeading: { flex: 1, minWidth: 0, gap: 5 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  shortName: { fontSize: 16, fontWeight: "700", color: palette.text },
  shortNameOpen: { color: palette.primary },
  category: { fontSize: 11, color: palette.mutedForeground, flexShrink: 1 },
  cardTitle: { fontSize: 12, lineHeight: 18, color: "#CBD5E1", flexShrink: 1 },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  definitionText: { fontSize: 14, color: "#CBD5E1", lineHeight: 22 },
  guideBox: {
    backgroundColor: palette.muted,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  guideHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 2,
  },
  guideLabel: { fontSize: 12, fontWeight: "600", color: palette.primary },
  guideLine: { flexDirection: "row", gap: 9 },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.mutedForeground,
    marginTop: 8,
    flexShrink: 0,
  },
  guideText: { flex: 1, fontSize: 13, color: "#E2E8F0", lineHeight: 21 },
  footer: {
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  doneBtn: {
    backgroundColor: palette.primary,
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    color: palette.primaryForeground,
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: { opacity: 0.72 },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyText: {
    color: palette.mutedForeground,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  resetBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14 },
  resetText: { color: palette.primary, fontSize: 13, fontWeight: "600" },
});
