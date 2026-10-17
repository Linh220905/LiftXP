import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from "react-native-svg";
import { Text } from "@/components/AppTypography";
import { useI18n } from "@/lib/i18n";
import { type TranslationDictionary } from "@/lib/i18n/types";

type WelcomeCopy = TranslationDictionary["welcome"];

function WorkoutPreview({ c }: { c: WelcomeCopy }) {
  return (
    <>
      <View style={[s.productCard, s.workoutCard]}>
        <View style={s.between}>
          <Text style={s.micro}>{c.today}</Text>
          <View style={s.smallIcon}>
            <Feather name="activity" size={13} color="#63D8FA" />
          </View>
        </View>
        <Text style={s.cardTitle}>{c.upper}</Text>
        <View style={s.exerciseRow}>
          <LinearGradient
            colors={["#153C57", "#102638"]}
            style={s.exerciseIcon}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              style={s.exerciseImage}
            />
          </LinearGradient>
          <View style={s.flex}>
            <Text style={s.exerciseName}>{c.exercise}</Text>
            <Text style={s.mutedSmall}>{c.sets}</Text>
          </View>
          <View style={s.check}>
            <Feather name="check" size={12} color="#6EE7B7" />
          </View>
        </View>
        <View style={s.chart}>
          <Text style={s.chartCaption}>{c.progress}</Text>
          <Svg
            width="100%"
            height="72"
            viewBox="0 0 230 72"
            preserveAspectRatio="none"
          >
            <Defs>
              <SvgGradient id="welcomeChart" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#38BDF8" stopOpacity="0.3" />
                <Stop offset="1" stopColor="#38BDF8" stopOpacity="0" />
              </SvgGradient>
            </Defs>
            <Path
              d="M0 65H230 M0 39H230 M0 13H230"
              stroke="#263849"
              strokeDasharray="3 5"
              strokeWidth="0.8"
            />
            <Path
              d="M0 61C18 61 18 49 37 49S62 55 77 41S101 48 119 30S146 39 163 23S194 29 227 5V72H0Z"
              fill="url(#welcomeChart)"
            />
            <Path
              d="M0 61C18 61 18 49 37 49S62 55 77 41S101 48 119 30S146 39 163 23S194 29 227 5"
              fill="none"
              stroke="#5EDBFF"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <Circle cx="227" cy="5" r="4" fill="#B1F1FF" />
          </Svg>
        </View>
      </View>
      <View style={[s.floatingCard, s.recordCard]}>
        <View style={s.recordIcon}>
          <Feather name="trending-up" size={18} color="#6EE7B7" />
        </View>
        <View>
          <Text style={s.tinyLabel}>{c.record}</Text>
          <Text style={s.recordValue}>
            60 <Text style={s.recordUnit}>kg</Text>{" "}
            <Text style={s.recordChange}>↑ 5 kg</Text>
          </Text>
        </View>
      </View>
      <LinearGradient
        colors={["#163E57", "#102B40"]}
        style={[s.floatingCard, s.earnedCard]}
      >
        <View style={s.xpIcon}>
          <Feather name="zap" size={24} color="#70E4FF" />
        </View>
        <View style={s.flex}>
          <Text style={s.earnedTitle}>{c.complete}</Text>
          <Text style={s.mutedSmall}>{c.earned}</Text>
        </View>
        <Text style={s.earnedXp}>
          +120 <Text style={s.xpSuffix}>XP</Text>
        </Text>
      </LinearGradient>
    </>
  );
}

function CommunityPreview({ c }: { c: WelcomeCopy }) {
  return (
    <>
      <View style={[s.productCard, s.communityCard]}>
        <Text style={s.micro}>{c.team}</Text>
        <Text style={s.cardTitle}>{c.together}</Text>
        <View style={s.avatars}>
          {[
            { letter: "M", color: "#A5B4FC", bg: "#30314E" },
            { letter: "A", color: "#80E4FC", bg: "#17465E" },
            { letter: "L", color: "#FCD196", bg: "#4C382A" },
          ].map((person, index) => (
            <View
              key={person.letter}
              style={[
                s.avatar,
                {
                  backgroundColor: person.bg,
                  marginTop: index === 1 ? -12 : 8,
                },
              ]}
            >
              <Text style={[s.avatarLetter, { color: person.color }]}>
                {person.letter}
              </Text>
              <View style={s.onlineDot} />
            </View>
          ))}
        </View>
        <View style={s.activePill}>
          <View style={s.activeDot} />
          <Text style={s.activeText}>{c.active}</Text>
        </View>
        <View style={s.communityDivider} />
        <Text style={s.communityCaption}>{c.encouragement}</Text>
      </View>
      <View style={[s.floatingCard, s.friendCard]}>
        <View style={s.friendAvatar}>
          <Text style={s.friendInitial}>M</Text>
        </View>
        <View style={s.flex}>
          <Text style={s.earnedTitle}>
            Minh <Text style={s.friendAction}>{c.friendRecord}</Text>
          </Text>
          <Text style={s.mutedSmall}>Deadlift · 100 kg</Text>
        </View>
        <Feather name="award" size={23} color="#F5CB7C" />
      </View>
      <View style={[s.floatingCard, s.cheerCard]}>
        <Feather name="heart" size={17} color="#FDA4AF" />
        <Text style={s.cheerText}>+1 high five</Text>
      </View>
    </>
  );
}

function RewardsPreview({ c }: { c: WelcomeCopy }) {
  return (
    <>
      <View style={[s.productCard, s.rewardsCard]}>
        <View style={s.between}>
          <Text style={s.micro}>{c.streak}</Text>
          <Feather name="zap" size={17} color="#F5CB7C" />
        </View>
        <Text style={s.streakNumber}>
          {c.days}
          <Text style={s.streakDots}> •••</Text>
        </Text>
        <View style={s.week}>
          {c.week.map((day, i) => (
            <View key={i} style={s.weekDay}>
              <View style={[s.dayCheck, i === 6 && s.currentDay]}>
                <Feather
                  name={i === 6 ? "zap" : "check"}
                  size={12}
                  color={i === 6 ? "#082130" : "#70D8F8"}
                />
              </View>
              <Text style={s.dayText}>{day}</Text>
            </View>
          ))}
        </View>
        <View style={s.trophyHalo} />
        <Image
          source={require("@/assets/arrow/src_assets_trophies_normal_benchbwpercent_diamond.png")}
          style={s.trophy}
          resizeMode="contain"
        />
        <Text style={s.rewardCaption}>{c.reward}</Text>
      </View>
      <View style={[s.floatingCard, s.unlockCard]}>
        <View style={s.awardIcon}>
          <Feather name="award" size={24} color="#F5CB7C" />
        </View>
        <View style={s.flex}>
          <Text style={[s.tinyLabel, s.goldText]}>{c.unlocked}</Text>
          <Text style={s.achievementName}>{c.firstStep}</Text>
        </View>
        <Feather name="check-circle" size={17} color="#6EE7B7" />
      </View>
    </>
  );
}

export function WelcomeScreen({
  index,
  onIndexChange,
  onContinue,
  onSkip,
  onLogin,
  loading,
}: {
  index: number;
  onIndexChange: (index: number) => void;
  onContinue: () => void;
  onSkip: () => void;
  onLogin: () => void;
  loading: boolean;
}) {
  const { locale, setLocale, t } = useI18n();
  const c = t.welcome;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const pageWidth = Math.min(width, 480);
  const compact = height - insets.top - insets.bottom < 720;
  const tight = height - insets.top - insets.bottom < 620;
  const artScale = Math.min(
    (pageWidth - 36) / 350,
    tight ? 0.43 : compact ? 0.63 : 1,
  );
  const pager = useRef<ScrollView>(null);
  const scrollIndex = useRef(index);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(scrollEndTimer.current), []);

  useEffect(() => {
    pager.current?.scrollTo({
      x: index * pageWidth,
      animated: scrollIndex.current !== index,
    });
    scrollIndex.current = index;
  }, [index, pageWidth]);

  const selectPage = (nextIndex: number) => {
    if (nextIndex === index) return;
    void Haptics.selectionAsync().catch(() => undefined);
    onIndexChange(nextIndex);
  };

  const finishScroll = (offset: number) => {
    const nextIndex = Math.max(0, Math.min(2, Math.round(offset / pageWidth)));
    scrollIndex.current = nextIndex;
    selectPage(nextIndex);
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#0D2133", "#090D16", "#090D16"]}
        locations={[0, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[s.shell, { width: pageWidth }]}>
        <View style={[s.header, tight && s.tightHeader]}>
          <View style={s.brand}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={s.brandIcon}
            />
            <Text style={s.brandName}>
              Train<Text style={s.brandAccent}>XP</Text>
            </Text>
          </View>
          <View style={s.headerRight}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.welcome.switchLanguageA11y}
              disabled={loading}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                void setLocale(locale === "vi" ? "en" : "vi");
              }}
              style={({ pressed }) => [s.langSwitchBtn, pressed && s.pressed]}
            >
              <Text style={s.langSwitchText}>{t.welcome.languageBadge}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.skip}
              disabled={loading}
              onPress={onSkip}
              style={({ pressed }) => [s.skip, pressed && s.pressed]}
            >
              <Text style={s.skipText}>{c.skip}</Text>
              <Feather name="arrow-right" size={14} color="#94A3B8" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          style={s.pager}
          scrollEventThrottle={32}
          onMomentumScrollEnd={(event) =>
            finishScroll(event.nativeEvent.contentOffset.x)
          }
          // React Native Web exposes scroll events but does not emit momentum-end.
          onScroll={
            Platform.OS === "web"
              ? (event) => {
                  const offset = event.nativeEvent.contentOffset.x;
                  clearTimeout(scrollEndTimer.current);
                  scrollEndTimer.current = setTimeout(
                    () => finishScroll(offset),
                    120,
                  );
                }
              : undefined
          }
        >
          {c.slides.map((slide, i) => (
            <ScrollView
              key={i}
              accessibilityElementsHidden={index !== i}
              importantForAccessibility={
                index === i ? "auto" : "no-hide-descendants"
              }
              style={{ width: pageWidth }}
              contentContainerStyle={s.slide}
              showsVerticalScrollIndicator={false}
            >
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[
                  s.artwork,
                  { height: 324 * artScale + (compact ? 0 : 16) },
                ]}
              >
                <View
                  style={[s.artboard, { transform: [{ scale: artScale }] }]}
                >
                  <View style={s.orbitOuter} />
                  <View style={s.orbitInner} />
                  <View style={s.sparkOne} />
                  <View style={s.sparkTwo} />
                  <View style={s.sparkThree} />
                  {i === 0 ? (
                    <WorkoutPreview c={c} />
                  ) : i === 1 ? (
                    <CommunityPreview c={c} />
                  ) : (
                    <RewardsPreview c={c} />
                  )}
                </View>
              </View>
              <View style={[s.copy, compact && s.compactCopy]}>
                <Text style={[s.eyebrow, tight && s.tightEyebrow]}>
                  {slide.eyebrow}
                </Text>
                <Text
                  accessibilityRole="header"
                  style={[
                    s.headline,
                    pageWidth < 370 && s.smallHeadline,
                    tight && s.tightHeadline,
                  ]}
                >
                  {slide.title}
                  {"\n"}
                  <Text style={s.highlight}>{slide.highlight}</Text>
                </Text>
              </View>
            </ScrollView>
          ))}
        </ScrollView>

        <View
          style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View style={[s.pagination, tight && s.tightPagination]}>
            <View style={s.dots}>
              {c.slides.map((_, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.viewPage} ${i + 1}`}
                  accessibilityState={{ selected: index === i }}
                  hitSlop={6}
                  onPress={() => selectPage(i)}
                  style={s.dotTouch}
                >
                  <View style={[s.dot, index === i && s.selectedDot]} />
                </Pressable>
              ))}
            </View>
            <Text style={s.pageNumber}>
              {String(index + 1).padStart(2, "0")}{" "}
              <Text style={s.pageTotal}>/ 03</Text>
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={index === 2 ? c.start : c.next}
            disabled={loading}
            onPress={onContinue}
            style={({ pressed }) => [
              s.button,
              pressed && s.pressed,
              loading && s.disabled,
            ]}
          >
            <LinearGradient
              colors={["#6BDEFF", "#38BDF8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.buttonFill, tight && s.tightButton]}
            >
              <Text style={s.buttonText}>{index === 2 ? c.start : c.next}</Text>
              <Feather name="arrow-right" size={21} color="#062034" />
            </LinearGradient>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={onLogin}
            style={[s.login, tight && s.tightLogin]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#63D8FA" />
            ) : (
              <Text style={s.loginText}>
                {c.account} <Text style={s.loginLink}>{c.login}</Text>
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#090D16", alignItems: "center" },
  shell: { flex: 1 },
  tightHeader: { height: 56 },
  tightHeadline: { fontSize: 28, lineHeight: 36 },
  tightEyebrow: { fontSize: 8, lineHeight: 14, marginBottom: 8 },
  tightPagination: { marginBottom: 8 },
  tightButton: { minHeight: 50, paddingVertical: 12 },
  tightLogin: { minHeight: 42 },
  flex: { flex: 1 },
  header: {
    height: 72,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandIcon: { width: 33, height: 33, borderRadius: 10 },
  brandName: {
    color: "#F5F8FC",
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  brandAccent: { color: "#6BDEFF" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  langSwitchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.28)",
  },
  langSwitchText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38BDF8",
  },
  skip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingLeft: 14,
  },
  skipText: { color: "#A2B1C2", fontSize: 13, fontWeight: "500" },
  pager: { flex: 1 },
  slide: { flexGrow: 1, justifyContent: "center", paddingBottom: 16 },
  artwork: { alignItems: "center", justifyContent: "center" },
  artboard: {
    width: 350,
    height: 324,
    alignItems: "center",
    justifyContent: "center",
  },
  orbitOuter: {
    position: "absolute",
    width: 328,
    height: 328,
    borderWidth: 1,
    borderColor: "#153047",
    borderRadius: 164,
    transform: [{ scaleY: 0.89 }, { rotate: "-24deg" }],
  },
  orbitInner: {
    position: "absolute",
    width: 264,
    height: 264,
    borderWidth: 1,
    borderColor: "#153047",
    borderRadius: 132,
  },
  sparkOne: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#6BDEFF",
    top: 28,
    left: 50,
  },
  sparkTwo: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3B7799",
    bottom: 35,
    left: 25,
  },
  sparkThree: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6BDEFF",
    top: 134,
    right: 8,
  },
  productCard: {
    position: "absolute",
    width: 274,
    backgroundColor: "#101E2C",
    borderWidth: 1,
    borderColor: "#294154",
    borderRadius: 23,
    padding: 19,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 6,
  },
  workoutCard: { top: 39, left: 25, transform: [{ rotate: "-6deg" }] },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  micro: {
    fontSize: 9,
    fontWeight: "700",
    color: "#8DA8BB",
    letterSpacing: 1.2,
  },
  smallIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor: "#193449",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#F4F9FF",
    fontSize: 23,
    fontWeight: "700",
    letterSpacing: -0.8,
    marginTop: 4,
    marginBottom: 17,
  },
  exerciseRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  exerciseIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  exerciseImage: { width: 39, height: 39 },
  exerciseName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E0EAF5",
    marginBottom: 5,
  },
  mutedSmall: { fontSize: 9, color: "#8DA8BB", lineHeight: 14 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#163D39",
    alignItems: "center",
    justifyContent: "center",
  },
  chart: { marginTop: 20 },
  chartCaption: {
    fontSize: 7,
    fontWeight: "600",
    letterSpacing: 1,
    color: "#8DA8BB",
    marginBottom: 12,
  },
  floatingCard: {
    position: "absolute",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#335268",
    backgroundColor: "#132838",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  recordCard: {
    right: 0,
    top: 17,
    padding: 12,
    transform: [{ rotate: "5deg" }],
  },
  recordIcon: {
    width: 33,
    height: 33,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1B403E",
  },
  tinyLabel: {
    fontSize: 7,
    fontWeight: "700",
    color: "#91ADBE",
    letterSpacing: 0.8,
  },
  recordValue: {
    color: "#F0FAFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 3,
  },
  recordUnit: { fontSize: 12, color: "#A8BBCB" },
  recordChange: { fontSize: 9, color: "#6EE7B7" },
  earnedCard: {
    bottom: -3,
    right: 3,
    width: 285,
    paddingHorizontal: 14,
    paddingVertical: 15,
    transform: [{ rotate: "3deg" }],
  },
  xpIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#204B63",
    alignItems: "center",
    justifyContent: "center",
  },
  earnedTitle: {
    color: "#F0F8FF",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginBottom: 3,
  },
  earnedXp: {
    color: "#7AE3FF",
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  xpSuffix: { fontSize: 10 },
  communityCard: {
    top: 30,
    left: 32,
    paddingTop: 23,
    transform: [{ rotate: "-4deg" }],
  },
  avatars: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingTop: 12,
    paddingBottom: 10,
  },
  avatar: {
    height: 59,
    width: 59,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#375468",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 25, fontWeight: "700" },
  onlineDot: {
    position: "absolute",
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#6EE7B7",
    borderWidth: 2,
    borderColor: "#101E2C",
    bottom: -3,
    right: 2,
  },
  activePill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#6EE7B7",
  },
  activeText: { color: "#A6DCCD", fontSize: 9 },
  communityDivider: {
    height: 1,
    backgroundColor: "#263A4A",
    marginVertical: 16,
  },
  communityCaption: {
    textAlign: "center",
    color: "#92ADBF",
    fontSize: 9,
    lineHeight: 15,
  },
  friendCard: {
    bottom: 15,
    right: 0,
    width: 305,
    padding: 14,
    transform: [{ rotate: "3deg" }],
  },
  friendAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#30314E",
  },
  friendInitial: { fontSize: 16, fontWeight: "700", color: "#A5B4FC" },
  friendAction: { color: "#A0B6C7", fontWeight: "400", fontSize: 10 },
  cheerCard: {
    top: 1,
    right: 2,
    paddingHorizontal: 13,
    paddingVertical: 12,
    transform: [{ rotate: "7deg" }],
  },
  cheerText: { fontSize: 10, fontWeight: "600", color: "#F7CBD3" },
  rewardsCard: { top: 20, left: 37, transform: [{ rotate: "-4deg" }] },
  streakNumber: {
    fontSize: 29,
    fontWeight: "700",
    color: "#F9D79B",
    marginTop: 10,
    marginBottom: 14,
    letterSpacing: -1,
  },
  streakDots: { fontSize: 17, color: "#5B4736", letterSpacing: 3 },
  week: { flexDirection: "row", justifyContent: "space-between" },
  weekDay: { alignItems: "center", gap: 6 },
  dayCheck: {
    width: 24,
    height: 24,
    borderRadius: 9,
    backgroundColor: "#193C50",
    alignItems: "center",
    justifyContent: "center",
  },
  currentDay: { backgroundColor: "#72DCFA" },
  dayText: { color: "#8DA8BB", fontSize: 7 },
  trophyHalo: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#18384B",
    bottom: 27,
    alignSelf: "center",
  },
  trophy: { width: 108, height: 97, alignSelf: "center", marginTop: 9 },
  rewardCaption: {
    fontSize: 8,
    color: "#8DA8BB",
    textAlign: "center",
    marginTop: 7,
  },
  unlockCard: {
    bottom: 2,
    right: 0,
    width: 298,
    padding: 15,
    transform: [{ rotate: "3deg" }],
  },
  awardIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: "#3B362D",
    alignItems: "center",
    justifyContent: "center",
  },
  goldText: { color: "#E0C493", fontSize: 6.7 },
  achievementName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F2F7FC",
    marginTop: 5,
  },
  copy: { paddingHorizontal: 26, paddingTop: 26 },
  compactCopy: { paddingTop: 14 },
  eyebrow: {
    color: "#87A4B9",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.6,
    lineHeight: 16,
    marginBottom: 11,
  },
  headline: {
    fontSize: 36,
    lineHeight: 46,
    fontWeight: "700",
    letterSpacing: -1.7,
    color: "#F3F7FD",
  },
  smallHeadline: { fontSize: 31, lineHeight: 41 },
  highlight: { color: "#69D9FA" },
  footer: { paddingHorizontal: 24, paddingTop: 4 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  dots: { flexDirection: "row", gap: 3, alignItems: "center" },
  dotTouch: {
    minWidth: 24,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "#344657" },
  selectedDot: { width: 27, backgroundColor: "#6BDEFF" },
  pageNumber: {
    color: "#C1D5E3",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
  },
  pageTotal: { color: "#52677A" },
  button: { borderRadius: 19, overflow: "hidden" },
  buttonFill: {
    minHeight: 58,
    paddingVertical: 15,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  buttonText: { flex: 1, color: "#062034", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.6 },
  login: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 7,
  },
  loginText: {
    color: "#8298AB",
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
  },
  loginLink: { color: "#C2EFFF", fontWeight: "600" },
});
