import { Text } from "@/components/AppTypography";
import React, { useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  getTrophyAsset,
  LIFT_TROPHY_CONFIGS,
  TrophyTier,
} from "@/lib/onboardingGamification";
import { formatWeight, weightUnitLabel } from "@/lib/units";
import { UnitSystem } from "@/context/AppState";
import { useI18n } from "@/lib/i18n";

export interface TrophyShowcaseProps {
  benchKg?: number;
  squatKg?: number;
  deadliftKg?: number;
  bodyweightKg: number;
  unit: UnitSystem;
  locale?: "vi" | "en";
}

const TIER_COLORS: Record<
  TrophyTier,
  { bg: string; border: string; text: string }
> = {
  Prismatic: {
    bg: "rgba(236, 72, 153, 0.15)",
    border: "#EC4899",
    text: "#F472B6",
  },
  Ruby: {
    bg: "rgba(239, 68, 68, 0.15)",
    border: "#EF4444",
    text: "#F87171",
  },
  Amethyst: {
    bg: "rgba(168, 85, 247, 0.15)",
    border: "#A855F7",
    text: "#C084FC",
  },
  Diamond: {
    bg: "rgba(56, 189, 248, 0.15)",
    border: "#38BDF8",
    text: "#38BDF8",
  },
  Gold: {
    bg: "rgba(245, 158, 11, 0.15)",
    border: "#F59E0B",
    text: "#FBBF24",
  },
  Silver: {
    bg: "rgba(148, 163, 184, 0.15)",
    border: "#94A3B8",
    text: "#CBD5E1",
  },
  Bronze: {
    bg: "rgba(217, 119, 6, 0.15)",
    border: "#D97706",
    text: "#F59E0B",
  },
  Wood: {
    bg: "rgba(120, 53, 15, 0.2)",
    border: "#78350F",
    text: "#A16207",
  },
};

export function TrophyShowcase({
  benchKg = 0,
  squatKg = 0,
  deadliftKg = 0,
  bodyweightKg,
  unit,
  locale: _locale,
}: TrophyShowcaseProps) {
  const { t } = useI18n();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"bench" | "squat" | "deadlift">("bench");

  const bw = Math.max(bodyweightKg || 68, 30);

  const liftData = useMemo(() => {
    return LIFT_TROPHY_CONFIGS.map((cfg) => {
      let pr = 0;
      if (cfg.key === "bench") pr = benchKg || 0;
      if (cfg.key === "squat") pr = squatKg || 0;
      if (cfg.key === "deadlift") pr = deadliftKg || 0;

      const isUnlocked = pr > 0;
      const ratio = pr / bw;
      const ratioPercent = Math.round(ratio * 100);

      let currentTier: TrophyTier | null = null;
      let nextBenchmark = cfg.benchmarks[0];

      if (isUnlocked) {
        for (const b of cfg.benchmarks) {
          if (ratio >= b.minRatio) {
            currentTier = b.tier;
          }
        }
        const next = cfg.benchmarks.find((b) => ratio < b.minRatio);
        if (next) {
          nextBenchmark = next;
        } else {
          // Reached max tier (Prismatic)
          nextBenchmark = cfg.benchmarks[cfg.benchmarks.length - 1];
        }
      } else {
        // First benchmark to target is Bronze or Wood
        nextBenchmark = cfg.benchmarks[1] || cfg.benchmarks[0];
      }

      return {
        ...cfg,
        pr,
        isUnlocked,
        ratioPercent,
        currentTier,
        nextBenchmark,
      };
    });
  }, [benchKg, squatKg, deadliftKg, bw]);

  const unlockedCount = liftData.filter((l) => l.isUnlocked).length;
  const currentLift = liftData.find((l) => l.key === activeTab) || liftData[0];

  return (
    <View style={styles.container}>
      {/* HEADER ROW */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>
            {t.trophyShowcase.highlightTitle}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {t.trophyShowcase.setsAndTiersSubtitle}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setModalVisible(true);
          }}
          style={styles.badgeCountBtn}
        >
          <Feather name="award" size={13} color="#F59E0B" />
          <Text style={styles.badgeCountText}>{unlockedCount}/3</Text>
          <Feather name="chevron-right" size={12} color="#F59E0B" />
        </Pressable>
      </View>

      {/* 3 LIFT CARDS ROW: ALWAYS SHOWS BENCH, SQUAT, DEADLIFT */}
      <View style={styles.cardsRow}>
        {liftData.map((lift) => {
          const tierStyle = lift.currentTier
            ? TIER_COLORS[lift.currentTier] || TIER_COLORS.Wood
            : null;
          const assetSource = getTrophyAsset(
            lift.exerciseName,
            lift.currentTier || "Wood",
          );

          return (
            <Pressable
              key={lift.key}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(lift.key);
                setModalVisible(true);
              }}
              style={[styles.card, !lift.isUnlocked && styles.cardLocked]}
            >
              {lift.isUnlocked && lift.currentTier && tierStyle ? (
                <>
                  <View style={styles.trophyIconWrap}>
                    <Image
                      source={assetSource}
                      style={styles.trophyImage}
                      resizeMode="contain"
                    />
                  </View>

                  <Text style={styles.trophyName} numberOfLines={1}>
                    {lift.key === "bench"
                      ? "Bench"
                      : lift.key === "squat"
                        ? "Squat"
                        : "Deadlift"}
                  </Text>

                  <View
                    style={[
                      styles.tierPill,
                      {
                        backgroundColor: tierStyle.bg,
                        borderColor: tierStyle.border,
                      },
                    ]}
                  >
                    <Text style={[styles.tierText, { color: tierStyle.text }]}>
                      {lift.currentTier.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.statLine}>
                    {formatWeight(lift.pr, unit, 0)} {weightUnitLabel(unit)}
                  </Text>
                  <Text style={styles.ratioLine}>{lift.ratioPercent}% BW</Text>
                </>
              ) : (
                <>
                  <View style={styles.trophyIconWrap}>
                    <Image
                      source={assetSource}
                      style={[styles.trophyImage, styles.lockedTrophyImage]}
                      resizeMode="contain"
                    />
                    <View style={styles.lockBadgeOverlay}>
                      <Feather name="lock" size={13} color="#CBD5E1" />
                    </View>
                  </View>

                  <Text style={[styles.trophyName, { color: "#94A3B8" }]} numberOfLines={1}>
                    {lift.key === "bench"
                      ? "Bench"
                      : lift.key === "squat"
                        ? "Squat"
                        : "Deadlift"}
                  </Text>

                  <View style={styles.lockedPill}>
                    <Text style={styles.lockedPillText}>
                      {t.trophyShowcase.lockedBadge}
                    </Text>
                  </View>

                  <Text style={styles.statLineLocked}>
                    {t.trophyShowcase.noPrYet}
                  </Text>
                  <Text style={styles.ratioLineLocked}>
                    {t.trophyShowcase.tapToView}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* MODAL: FULL TROPHY CATALOG & TIER INSPECTOR */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* MODAL HEADER */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalTitleBadge}>
                  <Feather name="award" size={14} color="#F59E0B" />
                  <Text style={styles.modalTitleBadgeText}>
                    {t.trophyShowcase.catalogTitle}
                  </Text>
                </View>
                <Text style={styles.modalSub}>
                  {t.trophyShowcase.catalogTiersSub}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseIconBtn}
              >
                <Feather name="x" size={20} color="#94A3B8" />
              </Pressable>
            </View>

            {/* TAB SELECTOR: BENCH / SQUAT / DEADLIFT */}
            <View style={styles.tabRow}>
              {liftData.map((lift) => {
                const isActive = activeTab === lift.key;
                const tabTierColor = lift.currentTier
                  ? TIER_COLORS[lift.currentTier]?.border || "#F59E0B"
                  : null;

                return (
                  <Pressable
                    key={lift.key}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveTab(lift.key);
                    }}
                    style={[
                      styles.tabBtn,
                      isActive && styles.tabBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBtnText,
                        isActive && styles.tabBtnTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {lift.key === "bench"
                        ? "Bench"
                        : lift.key === "squat"
                          ? "Squat"
                          : "Deadlift"}
                    </Text>

                    {lift.isUnlocked && tabTierColor ? (
                      <View
                        style={[
                          styles.tabActiveDot,
                          { backgroundColor: tabTierColor },
                        ]}
                      />
                    ) : (
                      <Feather
                        name="lock"
                        size={10}
                        color={isActive ? "#94A3B8" : "#475569"}
                        style={{ marginLeft: 3 }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* CURRENT PROGRESS OVERVIEW BOX */}
            <View style={styles.overviewBox}>
              <View style={styles.overviewTopRow}>
                <View style={styles.overviewLeft}>
                  <Text style={styles.overviewExerciseName}>
                    {t.trophyShowcase.lifts[currentLift.key] || currentLift.exerciseName}
                  </Text>
                  <Text style={styles.overviewPR}>
                    {currentLift.isUnlocked
                      ? `${formatWeight(currentLift.pr, unit, 0)} ${weightUnitLabel(unit)} (${currentLift.ratioPercent}% BW)`
                      : t.trophyShowcase.noRecordLogged}
                  </Text>
                </View>

                {currentLift.currentTier ? (
                  <View
                    style={[
                      styles.overviewTierBadge,
                      {
                        backgroundColor:
                          TIER_COLORS[currentLift.currentTier]?.bg ||
                          TIER_COLORS.Wood.bg,
                        borderColor:
                          TIER_COLORS[currentLift.currentTier]?.border ||
                          TIER_COLORS.Wood.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.overviewTierText,
                        {
                          color:
                            TIER_COLORS[currentLift.currentTier]?.text ||
                            TIER_COLORS.Wood.text,
                        },
                      ]}
                    >
                      {currentLift.currentTier.toUpperCase()}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.overviewLockedBadge}>
                    <Feather name="lock" size={11} color="#94A3B8" />
                    <Text style={styles.overviewLockedText}>
                      {t.trophyShowcase.unrankedBadge}
                    </Text>
                  </View>
                )}
              </View>

              {/* NEXT TARGET MILESTONE HINT */}
              {(() => {
                const next = currentLift.nextBenchmark;
                const targetKg =
                  next.minRatio === 0 ? 1 : Math.round(next.minRatio * bw);
                const diffKg = Math.max(0, targetKg - currentLift.pr);

                if (currentLift.currentTier === "Prismatic") {
                  return (
                    <Text style={styles.overviewHintText}>
                      {t.trophyShowcase.mythicPrismaticReached}
                    </Text>
                  );
                }

                const targetStr = `${formatWeight(targetKg, unit, 0)} ${weightUnitLabel(unit)}`;
                const diffStr = `${formatWeight(diffKg, unit, 0)} ${weightUnitLabel(unit)}`;

                return (
                  <Text style={styles.overviewHintText}>
                    {t.trophyShowcase.nextGoalFmt
                      .replace("{target}", targetStr)
                      .replace("{diff}", diffStr)
                      .replace("{tier}", next.tier.toUpperCase())}
                  </Text>
                );
              })()}
            </View>

            {/* SCROLLABLE LIST OF ALL 8 TIERS */}
            <ScrollView
              style={styles.tierScroll}
              contentContainerStyle={styles.tierScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {currentLift.benchmarks.map((b) => {
                const targetKg =
                  b.minRatio === 0 ? 1 : Math.round(b.minRatio * bw);
                const isAchieved =
                  currentLift.isUnlocked &&
                  (b.minRatio === 0 || currentLift.pr >= targetKg);
                const isCurrent = currentLift.currentTier === b.tier;
                const tierStyle = TIER_COLORS[b.tier] || TIER_COLORS.Wood;
                const tierAsset = getTrophyAsset(currentLift.exerciseName, b.tier);

                return (
                  <View
                    key={b.tier}
                    style={[
                      styles.tierCard,
                      isCurrent && {
                        borderColor: tierStyle.border,
                        backgroundColor: "rgba(21, 29, 46, 0.95)",
                      },
                      !isAchieved && styles.tierCardLocked,
                    ]}
                  >
                    <View style={styles.tierCardLeft}>
                      <Image
                        source={tierAsset}
                        style={[
                          styles.tierCardImage,
                          !isAchieved && styles.lockedTrophyImage,
                        ]}
                        resizeMode="contain"
                      />
                    </View>

                    <View style={styles.tierCardMiddle}>
                      <View style={styles.tierCardTitleRow}>
                        <Text
                          style={[
                            styles.tierCardTierName,
                            { color: isAchieved ? tierStyle.text : "#94A3B8" },
                          ]}
                        >
                          {b.tier.toUpperCase()}
                        </Text>
                        <Text style={styles.tierCardXp}>+{b.xpAward} XP</Text>
                      </View>

                      <Text style={styles.tierCardReqText}>
                        {b.minRatio === 0
                          ? t.trophyShowcase.baselinePr
                          : `≥ ${b.minRatio}x BW (${formatWeight(targetKg, unit, 0)} ${weightUnitLabel(unit)})`}
                      </Text>
                    </View>

                    <View style={styles.tierCardRight}>
                      {isCurrent ? (
                        <View
                          style={[
                            styles.currentPill,
                            {
                              backgroundColor: tierStyle.bg,
                              borderColor: tierStyle.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.currentPillText,
                              { color: tierStyle.text },
                            ]}
                          >
                            {t.trophyShowcase.currentBadge}
                          </Text>
                        </View>
                      ) : isAchieved ? (
                        <View style={styles.achievedPill}>
                          <Feather name="check" size={11} color="#10B981" />
                          <Text style={styles.achievedPillText}>
                            {t.trophyShowcase.unlockedBadge}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.notAchievedPill}>
                          <Feather name="lock" size={10} color="#64748B" />
                          <Text style={styles.notAchievedPillText}>
                            {formatWeight(targetKg, unit, 0)}{" "}
                            {weightUnitLabel(unit)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* MODAL FOOTER CLOSE BUTTON */}
            <Pressable
              accessibilityRole="button"
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseBtnText}>
                {t.trophyShowcase.close}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#111726",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 20,
    padding: 16,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#38BDF8",
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  badgeCountBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#F59E0B",
  },
  cardsRow: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: "#151D2E",
    borderWidth: 1,
    borderColor: "#223049",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  cardLocked: {
    backgroundColor: "#0F1624",
    borderColor: "#1A2333",
  },
  trophyIconWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    position: "relative",
  },
  trophyImage: {
    width: 52,
    height: 52,
  },
  lockedTrophyImage: {
    opacity: 0.28,
  },
  lockBadgeOverlay: {
    position: "absolute",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    borderRadius: 10,
    padding: 4,
  },
  trophyName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  tierPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  tierText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  lockedPill: {
    backgroundColor: "rgba(100, 116, 139, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.25)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  lockedPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  statLine: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E2E8F0",
  },
  statLineLocked: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  ratioLine: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 1,
  },
  ratioLineLocked: {
    fontSize: 10,
    fontWeight: "600",
    color: "#38BDF8",
    marginTop: 1,
  },

  /* MODAL STYLES */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 390,
    maxHeight: "88%",
    backgroundColor: "#131926",
    borderWidth: 1.5,
    borderColor: "#202A3C",
    borderRadius: 24,
    padding: 18,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalTitleBadgeText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  modalSub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 3,
  },
  modalCloseIconBtn: {
    padding: 4,
    borderRadius: 8,
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#0F1624",
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: "#1E293B",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  tabActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
  overviewBox: {
    backgroundColor: "#182235",
    borderWidth: 1,
    borderColor: "#25334E",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  overviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  overviewLeft: {
    flex: 1,
  },
  overviewExerciseName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  overviewPR: {
    fontSize: 12,
    color: "#38BDF8",
    fontWeight: "700",
    marginTop: 2,
  },
  overviewTierBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  overviewTierText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  overviewLockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(100, 116, 139, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  overviewLockedText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
  },
  overviewHintText: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.1)",
    paddingTop: 6,
    marginTop: 2,
  },
  tierScroll: {
    flexGrow: 0,
    maxHeight: 280,
    marginBottom: 14,
  },
  tierScrollContent: {
    gap: 8,
  },
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151D2E",
    borderWidth: 1,
    borderColor: "#1E2A3E",
    borderRadius: 12,
    padding: 8,
  },
  tierCardLocked: {
    backgroundColor: "#0E1420",
    borderColor: "#18202F",
    opacity: 0.8,
  },
  tierCardLeft: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  tierCardImage: {
    width: 40,
    height: 40,
  },
  tierCardMiddle: {
    flex: 1,
  },
  tierCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tierCardTierName: {
    fontSize: 12,
    fontWeight: "900",
  },
  tierCardXp: {
    fontSize: 10,
    fontWeight: "700",
    color: "#F59E0B",
  },
  tierCardReqText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  tierCardRight: {
    marginLeft: 8,
  },
  currentPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currentPillText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  achievedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  achievedPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#10B981",
  },
  notAchievedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(100, 116, 139, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  notAchievedPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
  },
  modalCloseBtn: {
    width: "100%",
    backgroundColor: "#38BDF8",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#080C14",
  },
});
