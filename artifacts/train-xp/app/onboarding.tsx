import { Feather, FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { BiometricFingerprintConfirm } from '@/components/BiometricFingerprintConfirm';
import { DobWheelPicker } from '@/components/DobWheelPicker';
import { DualMannequinFocusPicker, type FocusArea } from '@/components/DualMannequinFocusPicker';
import { HorizontalRulerPicker } from '@/components/HorizontalRulerPicker';
import { PaywallModal } from '@/components/PaywallModal';
import {
  useAppState,
  type BodyType,
  type Experience,
  type Gender,
  type PrimaryGoal,
  type Profile,
  type UnitSystem,
} from '@/context/AppState';
import { useI18n } from '@/lib/i18n';
import {
  calculateInitialGamification,
  STREAK_COMMITMENT_OPTIONS,
  type GamificationResult,
} from '@/lib/onboardingGamification';
import { generatePersonalizedPlan } from '@/lib/planGenerator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Electric Cyan Blue Brand Palette
const BLUE_THEME = {
  primary: '#38BDF8',
  primaryDark: '#0284C7',
  bgDark: '#090D16',
  cardDark: '#131926',
  cardBorder: '#202A3C',
  subText: '#94A3B8',
  white: '#FFFFFF',
  gold: '#F59E0B',
  bronze: '#B45309',
  silver: '#94A3B8',
  green: '#22C55E',
  flame: '#F97316',
};

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

// Equipment list for TrainXP
const EQUIPMENT_CATEGORIES = [
  {
    category: 'Small weights',
    items: ['Dumbbell', 'Kettlebell'],
  },
  {
    category: 'Bars & Plates',
    items: ['Barbell', 'Plate', 'Ez Bar'],
  },
  {
    category: 'Equipment',
    items: ['Bench', 'Cable Machine', 'Machines'],
  },
];

// Equipment SVGs
function EquipmentSvg({ name }: { name: string }) {
  switch (name) {
    case 'Dumbbell':
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Defs>
            <LinearGradient id="dbBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#94A3B8" />
              <Stop offset="50%" stopColor="#CBD5E1" />
              <Stop offset="100%" stopColor="#94A3B8" />
            </LinearGradient>
            <LinearGradient id="dbPlateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#64748B" />
              <Stop offset="50%" stopColor="#94A3B8" />
              <Stop offset="100%" stopColor="#475569" />
            </LinearGradient>
          </Defs>
          <Rect x="14" y="20" width="16" height="4" rx="2" fill="url(#dbBarGrad)" />
          <Rect x="8" y="14" width="6" height="16" rx="2.5" fill="url(#dbPlateGrad)" stroke="#475569" strokeWidth="1" />
          <Rect x="4" y="16" width="4" height="12" rx="2" fill="url(#dbPlateGrad)" stroke="#334155" strokeWidth="0.8" />
          <Rect x="30" y="14" width="6" height="16" rx="2.5" fill="url(#dbPlateGrad)" stroke="#475569" strokeWidth="1" />
          <Rect x="36" y="16" width="4" height="12" rx="2" fill="url(#dbPlateGrad)" stroke="#334155" strokeWidth="0.8" />
        </Svg>
      );
    case 'Kettlebell':
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Defs>
            <LinearGradient id="kbBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#475569" />
              <Stop offset="100%" stopColor="#0F172A" />
            </LinearGradient>
          </Defs>
          <Path d="M16,14 C16,9 28,9 28,14 L28,18 L16,18 Z" fill="none" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
          <Circle cx="22" cy="27" r="12" fill="url(#kbBodyGrad)" stroke="#64748B" strokeWidth="1" />
          <Circle cx="19" cy="23" r="3" fill="#94A3B8" opacity={0.3} />
        </Svg>
      );
    case 'Barbell':
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Line x1="6" y1="38" x2="38" y2="6" stroke="#E2E8F0" strokeWidth="3.5" strokeLinecap="round" />
          <G transform="rotate(-45 22 22)">
            <Rect x="12" y="15" width="4" height="14" rx="1.5" fill="#475569" stroke="#334155" strokeWidth="0.8" />
            <Rect x="8" y="13" width="4" height="18" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1" />
            <Rect x="28" y="15" width="4" height="14" rx="1.5" fill="#475569" stroke="#334155" strokeWidth="0.8" />
            <Rect x="32" y="13" width="4" height="18" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1" />
          </G>
        </Svg>
      );
    case 'Plate':
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Circle cx="22" cy="22" r="16" fill="#1E293B" stroke="#475569" strokeWidth="2" />
          <Circle cx="22" cy="22" r="11" fill="none" stroke="#334155" strokeWidth="1.5" />
          <Circle cx="22" cy="22" r="5" fill="#0F172A" stroke="#94A3B8" strokeWidth="2" />
          <Circle cx="22" cy="22" r="2.5" fill="#090D16" />
        </Svg>
      );
    case 'Ez Bar':
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Path
            d="M6,36 L14,28 L20,32 L26,26 L32,30 L38,24"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Rect x="9" y="27" width="3" height="10" rx="1" fill="#475569" transform="rotate(-30 9 27)" />
          <Rect x="33" y="19" width="3" height="10" rx="1" fill="#475569" transform="rotate(-30 33 19)" />
        </Svg>
      );
    case 'Bench':
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Rect x="6" y="18" width="32" height="6" rx="2" fill="#1E293B" stroke="#64748B" strokeWidth="1.2" />
          <Line x1="12" y1="24" x2="12" y2="34" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
          <Line x1="32" y1="24" x2="32" y2="34" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
          <Line x1="8" y1="34" x2="16" y2="34" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
          <Line x1="28" y1="34" x2="36" y2="34" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
        </Svg>
      );
    case 'Machines':
    case 'Cable Machine':
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Rect x="10" y="8" width="4" height="28" fill="#475569" />
          <Rect x="30" y="8" width="4" height="28" fill="#475569" />
          <Line x1="8" y1="8" x2="36" y2="8" stroke="#94A3B8" strokeWidth="3" />
          <Line x1="8" y1="36" x2="36" y2="36" stroke="#94A3B8" strokeWidth="3" />
          <Rect x="16" y="14" width="12" height="16" rx="2" fill="#1E293B" stroke="#334155" strokeWidth="1" />
          <Line x1="22" y1="8" x2="22" y2="14" stroke="#E2E8F0" strokeWidth="1.5" />
          <Circle cx="22" cy="20" r="2.5" fill="#EF4444" />
        </Svg>
      );
    default:
      return <Feather name="disc" size={24} color={BLUE_THEME.primary} />;
  }
}

// 3D Metallic Gold Trophy SVG
function TrophyHeroSvg({ size = 130 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="goldCup" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FDE047" />
          <Stop offset="40%" stopColor="#EAB308" />
          <Stop offset="100%" stopColor="#A16207" />
        </LinearGradient>
        <LinearGradient id="goldBase" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#713F12" />
          <Stop offset="50%" stopColor="#451A03" />
          <Stop offset="100%" stopColor="#1E293B" />
        </LinearGradient>
        <LinearGradient id="goldHandles" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FEF08A" />
          <Stop offset="100%" stopColor="#CA8A04" />
        </LinearGradient>
      </Defs>
      <Path d="M32 36 C14 36 12 56 30 64 L34 60 C22 54 22 42 34 42 Z" fill="url(#goldHandles)" />
      <Path d="M88 36 C106 36 108 56 90 64 L86 60 C98 54 98 42 86 42 Z" fill="url(#goldHandles)" />
      <Path d="M32 26 L88 26 C88 52 74 68 60 68 C46 68 32 52 32 26 Z" fill="url(#goldCup)" stroke="#FEF08A" strokeWidth="1.5" />
      <Rect x="30" y="24" width="60" height="6" rx="3" fill="#FEF08A" />
      <Rect x="54" y="68" width="12" height="16" rx="2" fill="url(#goldCup)" />
      <Path d="M44 84 L76 84 L80 94 L40 94 Z" fill="url(#goldCup)" />
      <Rect x="32" y="94" width="56" height="16" rx="4" fill="url(#goldBase)" stroke="#B45309" strokeWidth="1.5" />
      <Path d="M60 38 L62.5 45 L70 45 L64 49.5 L66.5 56.5 L60 52 L53.5 56.5 L56 49.5 L50 45 L57.5 45 Z" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="86" cy="22" r="3" fill="#FEF08A" opacity={0.8} />
      <Circle cx="30" cy="68" r="2.5" fill="#FEF08A" opacity={0.8} />
    </Svg>
  );
}

// Multi-layered Flame SVG for Streak
function FlameHeroSvg() {
  return (
    <Svg width="110" height="110" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="flameOuter" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor="#EA580C" />
          <Stop offset="50%" stopColor="#F97316" />
          <Stop offset="100%" stopColor="#FBBF24" />
        </LinearGradient>
        <LinearGradient id="flameInner" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor="#F59E0B" />
          <Stop offset="100%" stopColor="#FEF08A" />
        </LinearGradient>
      </Defs>
      <Path
        d="M50 10 C50 10 30 32 30 54 C30 68 40 82 50 86 C60 82 70 68 70 54 C70 38 60 26 56 20 C54 28 48 34 48 34 C48 34 56 22 50 10 Z"
        fill="url(#flameOuter)"
      />
      <Path
        d="M50 42 C50 42 40 52 40 64 C40 73 45 78 50 80 C55 78 60 73 60 64 C60 55 54 48 50 42 Z"
        fill="url(#flameInner)"
      />
    </Svg>
  );
}

// Total number of onboarding steps (0 to 24 = 25 steps total)
const TOTAL_STEPS = 24;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { hydrated, hasOnboarded, completeOnboarding, setProStatus, loginGoogle, loginApple } = useAppState();
  const { t, locale } = useI18n();

  // Navigation state
  const [step, setStep] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [routinePrepProgress, setRoutinePrepProgress] = useState(15);
  const [selectedRating, setSelectedRating] = useState(5);

  // Profile responses
  const [profile, setProfile] = useState<Profile>({
    name: 'Lifter',
    username: 'lifter_xp',
    unit: 'Metric',
    weight: 68,
    height: 170,
    thinkAboutFitness: 'Often',
    achieveMotivations: ['Health & Wellness', 'Build Discipline'],
    goal: 'Build Muscle',
    sensitiveJoints: [],
    experience: 'Regularly',
    hasRoutine: true,
    equipment: ['Dumbbell', 'Barbell', 'Bench', 'Plate', 'Cable Machine'],
    lastMusclesWorked: ['Chest', 'Arms'],
    workoutDuration: '60 minutes',
    daysPerWeek: 3,
    targetMuscles: ['Full chest', 'Big arms', 'Broad shoulders'],
    bodyType: 'Athletic',
    gender: 'Male',
    birthYear: 2000,
    birthMonth: 'Dec',
    birthDay: 10,
    benchPressPR: 60,
    prSquat: 85,
    deadliftPR: 100,
    goalWeight: 75,
    goalWeeks: 4,
    streakCommitment: 30,
    notificationsEnabled: true,
    referralSource: 'tiktok',
    rating: 5,
    isPro: false,
  });

  // Gamification calculations for PR assessment & Level Roadmap
  const gamification: GamificationResult = useMemo(() => {
    return calculateInitialGamification({
      benchKg: profile.benchPressPR,
      squatKg: profile.prSquat,
      deadliftKg: profile.deadliftPR,
      bodyweightKg: profile.weight,
      unit: profile.unit,
    });
  }, [profile.benchPressPR, profile.prSquat, profile.deadliftPR, profile.weight, profile.unit]);

  const hasAnyPR = useMemo(() => {
    return (
      (profile.benchPressPR && profile.benchPressPR > 0) ||
      (profile.prSquat && profile.prSquat > 0) ||
      (profile.deadliftPR && profile.deadliftPR > 0)
    );
  }, [profile.benchPressPR, profile.prSquat, profile.deadliftPR]);

  useEffect(() => {
    if (hydrated && hasOnboarded) {
      router.replace('/(tabs)');
    }
  }, [hydrated, hasOnboarded]);

  // Loading animation for Step 20 (Preparing routine)
  useEffect(() => {
    if (step !== 20) return;
    let completionTimeout: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setRoutinePrepProgress((prev) => {
        const nextProgress = Math.min(100, prev + 20);
        if (nextProgress === 100 && !completionTimeout) {
          clearInterval(interval);
          completionTimeout = setTimeout(() => {
            setStep(21);
          }, 600);
        }
        return nextProgress;
      });
    }, 280);
    return () => {
      clearInterval(interval);
      if (completionTimeout) clearTimeout(completionTimeout);
    };
  }, [step]);

  if (!hydrated || hasOnboarded) {
    return <View style={[styles.loading, { backgroundColor: BLUE_THEME.bgDark }]} />;
  }

  // Next Step Transition with Arrow Dynamic Branching
  const next = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Step 0: ValueProp Carousel (advance slide first if < 2)
    if (step === 0 && carouselIndex < 2) {
      setCarouselIndex((curr) => curr + 1);
      return;
    }

    // Validation checks
    if (step === 3) {
      const currentYear = new Date().getFullYear();
      const calculatedAge = currentYear - profile.birthYear;
      if (calculatedAge < 13) {
        Alert.alert(
          locale === 'vi' ? 'Tuổi không hợp lệ' : 'Invalid Date of Birth',
          locale === 'vi'
            ? 'Bạn phải từ 13 tuổi trở lên để tham gia tập luyện.'
            : 'You must be at least 13 years old to use TrainXP.'
        );
        return;
      }
    }
    if (step === 5 && (!Number.isFinite(profile.weight) || profile.weight < 15 || profile.weight > 300)) {
      Alert.alert(t.onboarding.invalidWeightTitle, t.onboarding.invalidWeightMsg);
      return;
    }
    if (step === 6 && (!Number.isFinite(profile.height) || profile.height < 80 || profile.height > 250)) {
      Alert.alert(t.onboarding.invalidHeightTitle, t.onboarding.invalidHeightMsg);
      return;
    }

    // Dynamic branching on Deadlift PR (Step 10):
    // If no PRs were entered, skip TrophyUnlock (Step 11) directly to LevelJourney (Step 12)
    if (step === 10) {
      if (!hasAnyPR) {
        setStep(12);
        return;
      }
    }

    if (step < TOTAL_STEPS) {
      setStep((curr) => curr + 1);
    } else {
      setShowPaywall(true);
    }
  };

  // Back Step Transition
  const back = () => {
    void Haptics.selectionAsync();

    // Step 0 Carousel back
    if (step === 0 && carouselIndex > 0) {
      setCarouselIndex((curr) => curr - 1);
      return;
    }

    // If at LevelJourney (Step 12) and user had 0 PRs, jumping back bypasses TrophyUnlock (Step 11) to Deadlift (Step 10)
    if (step === 12 && !hasAnyPR) {
      setStep(10);
      return;
    }

    if (step > 0) {
      setStep((curr) => curr - 1);
    }
  };

  const handleFinishOnboarding = (isPro = false) => {
    setProStatus(isPro);
    completeOnboarding({ ...profile, isPro });
    router.replace('/(tabs)');
  };

  const handleExistingAccountLogin = async () => {
    try {
      const signedIn = Platform.OS === 'ios' ? await loginApple() : await loginGoogle();
      if (!signedIn) return;
    } catch (error) {
      Alert.alert(
        t.onboarding.signInFailedTitle,
        error instanceof Error ? error.message : t.onboarding.signInFailedMsg,
      );
    }
  };

  const toggleEquipment = (eq: string) => {
    void Haptics.selectionAsync();
    setProfile((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(eq)
        ? prev.equipment.filter((item) => item !== eq)
        : [...prev.equipment, eq],
    }));
  };

  const toggleFocusArea = (area: FocusArea) => {
    setProfile((prev) => ({
      ...prev,
      targetMuscles: prev.targetMuscles.includes(area)
        ? prev.targetMuscles.filter((a) => a !== area)
        : [...prev.targetMuscles, area],
    }));
  };

  const routinePreview = useMemo(() => generatePersonalizedPlan(profile).routines, [profile]);
  const progressRatio = Math.min(Math.max((step + 1) / (TOTAL_STEPS + 1), 0.05), 1);

  // Determine button title
  const buttonText =
    step === 0 && carouselIndex < 2
      ? t.onboarding.continue
      : step === TOTAL_STEPS
      ? t.onboarding.claimOffer
      : step === 21
      ? t.onboarding.confirmRoutine
      : t.onboarding.continue;

  // STEP 22: True edge-to-edge full screen biometric commitment confirmation
  if (step === 22) {
    return (
      <View style={[styles.screen, { backgroundColor: BLUE_THEME.bgDark }]}>
        <BiometricFingerprintConfirm
          userName={profile.name || t.onboarding.defaultWarriorName}
          onConfirmed={next}
          onBack={back}
          streakGoalDays={profile.streakCommitment || 30}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.screen,
        {
          backgroundColor: BLUE_THEME.bgDark,
          paddingTop: insets.top + 6,
        },
      ]}
    >
      {/* Top Navigation Header with Back Arrow & Pill Progress Indicator */}
      <View style={styles.navHeader}>
        {step > 0 && step !== 20 ? (
          <Pressable onPress={back} style={styles.backButton} hitSlop={12} accessibilityRole="button">
            <Feather name="chevron-left" size={24} color={BLUE_THEME.white} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        {step !== 20 ? (
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
            </View>
            <Text style={styles.stepCounterText}>
              {step + 1}/{TOTAL_STEPS + 1}
            </Text>
          </View>
        ) : null}

        {step !== 20 ? (
          <Pressable onPress={() => handleFinishOnboarding(false)} style={styles.skipHeaderBtn} hitSlop={10}>
            <Text style={styles.skipHeaderText}>{t.onboarding.skip}</Text>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>

      {/* Main Flow Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ================= STEP 0: valueProp (3-Card Carousel) ================= */}
        {step === 0 ? (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeaderBadge}>
              <Feather name="zap" size={13} color={BLUE_THEME.primary} />
              <Text style={styles.stepBadgeText}>TRAINXP ONBOARDING</Text>
            </View>

            {/* Carousel Slide 0: Get more out of every workout */}
            {carouselIndex === 0 ? (
              <View style={[styles.centerFlex, { paddingVertical: 18 }]}>
                <View style={styles.carouselArtworkWrap}>
                  <View style={styles.trophyGlowAura} />
                  <EquipmentSvg name="Dumbbell" />
                  <View style={[styles.stepHeaderBadge, { marginTop: 16, backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
                    <Feather name="activity" size={14} color={BLUE_THEME.primary} />
                    <Text style={styles.stepBadgeText}>LEVEL 1 ROOKIE · +500 EXP</Text>
                  </View>
                </View>
                <Text style={[styles.mainTitle, { textAlign: 'center', marginTop: 18 }]}>
                  {t.onboarding.valueProp1Title}
                </Text>
                <Text style={[styles.subTitle, { textAlign: 'center' }]}>
                  {t.onboarding.valueProp1Sub}
                </Text>
              </View>
            ) : null}

            {/* Carousel Slide 1: Fitness is better together */}
            {carouselIndex === 1 ? (
              <View style={[styles.centerFlex, { paddingVertical: 18 }]}>
                <View style={styles.carouselArtworkWrap}>
                  <View style={[styles.trophyGlowAura, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]} />
                  <View style={styles.socialPeersBox}>
                    <View style={[styles.peerAvatar, { borderColor: BLUE_THEME.primary }]}>
                      <Feather name="user" size={24} color={BLUE_THEME.primary} />
                    </View>
                    <View style={[styles.peerAvatar, { borderColor: '#22C55E', marginLeft: -14 }]}>
                      <Feather name="zap" size={24} color="#22C55E" />
                    </View>
                    <View style={[styles.peerAvatar, { borderColor: '#F59E0B', marginLeft: -14 }]}>
                      <Feather name="award" size={24} color="#F59E0B" />
                    </View>
                  </View>
                  <View style={[styles.stepHeaderBadge, { marginTop: 16, backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                    <Feather name="users" size={14} color="#22C55E" />
                    <Text style={[styles.stepBadgeText, { color: '#22C55E' }]}>COMMUNITY ACTIVITY FEED</Text>
                  </View>
                </View>
                <Text style={[styles.mainTitle, { textAlign: 'center', marginTop: 18 }]}>
                  {t.onboarding.valueProp2Title}
                </Text>
                <Text style={[styles.subTitle, { textAlign: 'center' }]}>
                  {t.onboarding.valueProp2Sub}
                </Text>
              </View>
            ) : null}

            {/* Carousel Slide 2: Build habits and earn rewards */}
            {carouselIndex === 2 ? (
              <View style={[styles.centerFlex, { paddingVertical: 18 }]}>
                <View style={styles.carouselArtworkWrap}>
                  <View style={styles.trophyGlowAura} />
                  <TrophyHeroSvg size={120} />
                  <View style={[styles.stepHeaderBadge, { marginTop: 16, backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                    <Feather name="award" size={14} color="#F59E0B" />
                    <Text style={[styles.stepBadgeText, { color: '#F59E0B' }]}>62 EXCLUSIVE TROPHIES</Text>
                  </View>
                </View>
                <Text style={[styles.mainTitle, { textAlign: 'center', marginTop: 18 }]}>
                  {t.onboarding.valueProp3Title}
                </Text>
                <Text style={[styles.subTitle, { textAlign: 'center' }]}>
                  {t.onboarding.valueProp3Sub}
                </Text>
              </View>
            ) : null}

            {/* Animated Dot Indicators */}
            <View style={styles.carouselDotsRow}>
              {[0, 1, 2].map((idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setCarouselIndex(idx);
                  }}
                  style={[
                    styles.carouselDot,
                    carouselIndex === idx ? styles.carouselDotActive : styles.carouselDotInactive,
                  ]}
                />
              ))}
            </View>
          </View>
        ) : /* ================= STEP 1: goal (Primary Fitness Objective) ================= */
        step === 1 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.goals['Build Muscle'] ? 'What is your goal?' : 'Mục tiêu của bạn?'}</Text>
            <Text style={styles.subTitle}>This can be changed later in your settings</Text>

            <View style={styles.optionsList}>
              {[
                { id: 'Build Muscle', label: t.onboarding.goals['Build Muscle'] || 'Gain Muscle', icon: 'zap' },
                { id: 'Burn Fat', label: t.onboarding.goals['Burn Fat'] || 'Lose Weight', icon: 'flame' },
                { id: 'Increase Endurance', label: t.onboarding.goals['Increase Endurance'] || 'Build Strength', icon: 'shield' },
                { id: 'Weight Loss', label: 'Get Toned', icon: 'award' },
                { id: 'Optimize Workouts', label: 'Stay Consistent', icon: 'clock' },
              ].map((g) => {
                const selected = profile.goal === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, goal: g.id as PrimaryGoal });
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: selected ? '#172236' : BLUE_THEME.cardDark,
                        borderColor: selected ? BLUE_THEME.primary : BLUE_THEME.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.iconCircle,
                          {
                            backgroundColor: selected ? 'rgba(56, 189, 248, 0.18)' : '#192334',
                          },
                        ]}
                      >
                        <Feather name={g.icon as any} size={20} color={selected ? BLUE_THEME.primary : '#94A3B8'} />
                      </View>
                      <Text style={styles.optionLabel}>{g.label}</Text>
                    </View>
                    <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 2: gender (Biological Identity) ================= */
        step === 2 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.genderTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.genderSubtitle}</Text>

            <View style={styles.optionsList}>
              {[
                { id: 'Male', label: t.onboarding.genderMale, icon: 'user' },
                { id: 'Female', label: t.onboarding.genderFemale, icon: 'user-check' },
              ].map((item) => {
                const selected = profile.gender === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, gender: item.id as Gender });
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: selected ? '#172236' : BLUE_THEME.cardDark,
                        borderColor: selected ? BLUE_THEME.primary : BLUE_THEME.cardBorder,
                        paddingVertical: 18,
                      },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.iconCircle,
                          {
                            backgroundColor: selected ? 'rgba(56, 189, 248, 0.18)' : '#192334',
                          },
                        ]}
                      >
                        <Feather name={item.icon as any} size={22} color={selected ? BLUE_THEME.primary : '#94A3B8'} />
                      </View>
                      <Text style={[styles.optionLabel, { fontSize: 18 }]}>{item.label}</Text>
                    </View>
                    <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 3: dateOfBirth (3-Column Picker) ================= */
        step === 3 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.dobTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.dobSubtitle}</Text>

            <DobWheelPicker
              day={profile.birthDay}
              month={profile.birthMonth}
              year={profile.birthYear}
              onDateChange={({ day, month, year }) => {
                setProfile({
                  ...profile,
                  birthDay: day,
                  birthMonth: month,
                  birthYear: year,
                });
              }}
              dayLabel={t.onboarding.dayLabel}
              monthLabel={t.onboarding.monthLabel}
              yearLabel={t.onboarding.yearLabel}
              locale={locale}
            />
          </View>
        ) : /* ================= STEP 4: units (System of Measurement) ================= */
        step === 4 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.unitTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.unitSubtitle}</Text>

            <View style={styles.optionsList}>
              {[
                { id: 'Metric', label: t.onboarding.metricLabel, hint: 'kg, cm, km' },
                { id: 'Imperial', label: t.onboarding.imperialLabel, hint: 'lbs, in, mi' },
              ].map((u) => {
                const selected = profile.unit === u.id;
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, unit: u.id as UnitSystem });
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: selected ? '#172236' : BLUE_THEME.cardDark,
                        borderColor: selected ? BLUE_THEME.primary : BLUE_THEME.cardBorder,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionLabel}>{u.label}</Text>
                      <Text style={styles.subCardText}>{u.hint}</Text>
                    </View>
                    <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 5: weight (Horizontal Ruler Picker) ================= */
        step === 5 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <Text style={styles.mainTitle}>{t.onboarding.weightTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.weightSubtitle}</Text>

            <HorizontalRulerPicker
              min={profile.unit === 'Metric' ? 35 : 77}
              max={profile.unit === 'Metric' ? 200 : 440}
              step={profile.unit === 'Metric' ? 0.5 : 1}
              fractionDigits={profile.unit === 'Metric' ? 1 : 0}
              value={profile.weight ? (profile.unit === 'Metric' ? profile.weight : profile.weight / KG_PER_LB) : (profile.unit === 'Metric' ? 68 : 150)}
              unit={profile.unit === 'Metric' ? t.common.kg : t.common.lbs}
              headerTitle={profile.unit === 'Metric' ? 'Cân nặng hiện tại' : 'Current Weight'}
              headerIcon="disc"
              presets={profile.unit === 'Metric' ? [50, 55, 60, 65, 68, 70, 75, 80, 85, 90] : [110, 120, 130, 140, 150, 160, 170, 180, 190, 200]}
              onValueChange={(w) => setProfile((p) => ({ ...p, weight: profile.unit === 'Metric' ? w : w * KG_PER_LB }))}
            />
          </View>
        ) : /* ================= STEP 6: height (Horizontal Ruler Picker) ================= */
        step === 6 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <Text style={styles.mainTitle}>{t.onboarding.heightTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.heightSubtitle}</Text>

            <HorizontalRulerPicker
              min={profile.unit === 'Metric' ? 100 : 39}
              max={profile.unit === 'Metric' ? 230 : 90}
              step={1}
              fractionDigits={0}
              value={profile.height ? (profile.unit === 'Metric' ? profile.height : profile.height / CM_PER_IN) : (profile.unit === 'Metric' ? 170 : 67)}
              unit={profile.unit === 'Metric' ? 'cm' : 'in'}
              headerTitle={profile.unit === 'Metric' ? 'Chiều cao hiện tại' : 'Current Height'}
              headerIcon="activity"
              presets={profile.unit === 'Metric' ? [155, 160, 165, 170, 175, 180, 185, 190] : [61, 63, 65, 67, 69, 71, 73, 75]}
              onValueChange={(h) => setProfile((p) => ({ ...p, height: profile.unit === 'Metric' ? h : h * CM_PER_IN }))}
            />
          </View>
        ) : /* ================= STEP 7: fitnessLevel (PR Assessment Intro) ================= */
        step === 7 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="award" size={13} color="#F59E0B" />
              <Text style={[styles.motivationalBadgeText, { color: '#FBBF24' }]}>PR CALIBRATION</Text>
            </View>

            <Text style={[styles.mainTitle, { textAlign: 'center' }]}>{t.onboarding.fitnessLevelTitle}</Text>
            <Text style={[styles.subTitle, { textAlign: 'center', maxWidth: 320 }]}>{t.onboarding.fitnessLevelSubtitle}</Text>

            <View style={styles.prIntroCard}>
              <View style={styles.trophyHeroBox}>
                <View style={styles.trophyGlowAura} />
                <TrophyHeroSvg size={110} />
              </View>

              <View style={styles.prBenchmarkList}>
                <View style={styles.prBenchmarkRow}>
                  <View style={[styles.prBenchmarkIcon, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                    <Feather name="zap" size={16} color={BLUE_THEME.primary} />
                  </View>
                  <Text style={styles.prBenchmarkText}>Bench Press (Upper Body Push)</Text>
                </View>
                <View style={styles.prBenchmarkRow}>
                  <View style={[styles.prBenchmarkIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                    <Feather name="trending-up" size={16} color="#22C55E" />
                  </View>
                  <Text style={styles.prBenchmarkText}>Barbell Squat (Lower Body Power)</Text>
                </View>
                <View style={styles.prBenchmarkRow}>
                  <View style={[styles.prBenchmarkIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Feather name="shield" size={16} color="#F59E0B" />
                  </View>
                  <Text style={styles.prBenchmarkText}>Deadlift (Full Body Strength)</Text>
                </View>
              </View>

              <Text style={[styles.subTitle, { textAlign: 'center', fontSize: 12, marginTop: 12, marginBottom: 0 }]}>
                {t.onboarding.prHelpText}
              </Text>
            </View>
          </View>
        ) : /* ================= STEP 8: benchPressPR ================= */
        step === 8 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="activity" size={13} color={BLUE_THEME.primary} />
              <Text style={styles.motivationalBadgeText}>BIG 3 BENCHMARK (1/3)</Text>
            </View>

            <Text style={[styles.mainTitle, { textAlign: 'center' }]}>{t.onboarding.benchPrTitle}</Text>
            <Text style={[styles.subTitle, { textAlign: 'center' }]}>{t.onboarding.benchPrSubtitle}</Text>

            <View style={styles.rulerValueWrap}>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setProfile((p) => ({ ...p, benchPressPR: Math.max(0, (p.benchPressPR || 60) - 2.5) }));
                }}
                style={styles.adjustStepBtn}
                hitSlop={10}
              >
                <Feather name="minus" size={20} color={BLUE_THEME.primary} />
              </Pressable>

              <View style={styles.rulerInputBox}>
                <TextInput
                  style={styles.rulerLargeValInput}
                  value={String(profile.benchPressPR || 0)}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    const val = parseFloat(cleaned);
                    if (!isNaN(val)) setProfile((p) => ({ ...p, benchPressPR: val }));
                    else if (cleaned === '') setProfile((p) => ({ ...p, benchPressPR: 0 }));
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <Text style={styles.rulerUnit}>{profile.unit === 'Metric' ? t.common.kg : t.common.lbs}</Text>
              </View>

              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setProfile((p) => ({ ...p, benchPressPR: Math.min(250, (p.benchPressPR || 0) + 2.5) }));
                }}
                style={styles.adjustStepBtn}
                hitSlop={10}
              >
                <Feather name="plus" size={20} color={BLUE_THEME.primary} />
              </Pressable>
            </View>

            {/* Quick Preset Chips */}
            <View style={styles.rulerPresetsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rulerMarksScroll}>
                {[40, 50, 60, 70, 80, 90, 100, 110, 120].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, benchPressPR: s });
                    }}
                    style={[styles.rulerChip, s === profile.benchPressPR && styles.rulerChipActive]}
                  >
                    <Text style={[styles.rulerChipText, s === profile.benchPressPR && styles.rulerChipTextActive]}>
                      {s} {profile.unit === 'Metric' ? 'kg' : 'lbs'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : /* ================= STEP 9: squatPR ================= */
        step === 9 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="activity" size={13} color={BLUE_THEME.primary} />
              <Text style={styles.motivationalBadgeText}>BIG 3 BENCHMARK (2/3)</Text>
            </View>

            <Text style={[styles.mainTitle, { textAlign: 'center' }]}>{t.onboarding.prSquatTitle}</Text>
            <Text style={[styles.subTitle, { textAlign: 'center' }]}>{t.onboarding.prSquatSubtitle}</Text>

            <View style={styles.rulerValueWrap}>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setProfile((p) => ({ ...p, prSquat: Math.max(0, p.prSquat - 2.5) }));
                }}
                style={styles.adjustStepBtn}
                hitSlop={10}
              >
                <Feather name="minus" size={20} color={BLUE_THEME.primary} />
              </Pressable>

              <View style={styles.rulerInputBox}>
                <TextInput
                  style={styles.rulerLargeValInput}
                  value={String(profile.prSquat || 0)}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    const val = parseFloat(cleaned);
                    if (!isNaN(val)) setProfile((p) => ({ ...p, prSquat: val }));
                    else if (cleaned === '') setProfile((p) => ({ ...p, prSquat: 0 }));
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <Text style={styles.rulerUnit}>{profile.unit === 'Metric' ? t.common.kg : t.common.lbs}</Text>
              </View>

              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setProfile((p) => ({ ...p, prSquat: Math.min(300, p.prSquat + 2.5) }));
                }}
                style={styles.adjustStepBtn}
                hitSlop={10}
              >
                <Feather name="plus" size={20} color={BLUE_THEME.primary} />
              </Pressable>
            </View>

            {/* Quick Preset Chips */}
            <View style={styles.rulerPresetsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rulerMarksScroll}>
                {[50, 60, 70, 80, 85, 90, 100, 110, 120, 140].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, prSquat: s });
                    }}
                    style={[styles.rulerChip, s === profile.prSquat && styles.rulerChipActive]}
                  >
                    <Text style={[styles.rulerChipText, s === profile.prSquat && styles.rulerChipTextActive]}>
                      {s} {profile.unit === 'Metric' ? 'kg' : 'lbs'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : /* ================= STEP 10: deadliftPR ================= */
        step === 10 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="activity" size={13} color={BLUE_THEME.primary} />
              <Text style={styles.motivationalBadgeText}>BIG 3 BENCHMARK (3/3)</Text>
            </View>

            <Text style={[styles.mainTitle, { textAlign: 'center' }]}>{t.onboarding.deadliftPrTitle}</Text>
            <Text style={[styles.subTitle, { textAlign: 'center' }]}>{t.onboarding.deadliftPrSubtitle}</Text>

            <View style={styles.rulerValueWrap}>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setProfile((p) => ({ ...p, deadliftPR: Math.max(0, (p.deadliftPR || 100) - 2.5) }));
                }}
                style={styles.adjustStepBtn}
                hitSlop={10}
              >
                <Feather name="minus" size={20} color={BLUE_THEME.primary} />
              </Pressable>

              <View style={styles.rulerInputBox}>
                <TextInput
                  style={styles.rulerLargeValInput}
                  value={String(profile.deadliftPR || 0)}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    const val = parseFloat(cleaned);
                    if (!isNaN(val)) setProfile((p) => ({ ...p, deadliftPR: val }));
                    else if (cleaned === '') setProfile((p) => ({ ...p, deadliftPR: 0 }));
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <Text style={styles.rulerUnit}>{profile.unit === 'Metric' ? t.common.kg : t.common.lbs}</Text>
              </View>

              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setProfile((p) => ({ ...p, deadliftPR: Math.min(350, (p.deadliftPR || 0) + 2.5) }));
                }}
                style={styles.adjustStepBtn}
                hitSlop={10}
              >
                <Feather name="plus" size={20} color={BLUE_THEME.primary} />
              </Pressable>
            </View>

            {/* Quick Preset Chips */}
            <View style={styles.rulerPresetsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rulerMarksScroll}>
                {[60, 80, 100, 110, 120, 130, 140, 160, 180].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, deadliftPR: s });
                    }}
                    style={[styles.rulerChip, s === profile.deadliftPR && styles.rulerChipActive]}
                  >
                    <Text style={[styles.rulerChipText, s === profile.deadliftPR && styles.rulerChipTextActive]}>
                      {s} {profile.unit === 'Metric' ? 'kg' : 'lbs'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : /* ================= STEP 11: trophyUnlock (DYNAMIC CELEBRATION) ================= */
        step === 11 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="award" size={13} color="#F59E0B" />
              <Text style={[styles.motivationalBadgeText, { color: '#FBBF24' }]}>
                {t.onboarding.trophyUnlockedTag}
              </Text>
            </View>

            <Text style={[styles.welcomeTitle, { textAlign: 'center' }]}>{t.onboarding.trophyUnlockedTitle}</Text>
            <Text style={[styles.subTitle, { textAlign: 'center' }]}>{t.onboarding.trophyUnlockedSub}</Text>

            <View style={styles.trophyHeroBox}>
              <View style={styles.trophyGlowAura} />
              <TrophyHeroSvg size={140} />
            </View>

            <View style={styles.trophyTierBadgesRow}>
              <View style={styles.trophyTierBadge}>
                <Feather name="shield" size={13} color="#F59E0B" />
                <Text style={styles.trophyTierBadgeText}>
                  {gamification.unlockedTrophies[0]?.tier.toUpperCase() || 'BRONZE'} TIER MILESTONE
                </Text>
              </View>
              <View style={[styles.trophyTierBadge, { backgroundColor: '#0C2038', borderColor: '#1E3A5F' }]}>
                <Feather name="zap" size={13} color="#38BDF8" />
                <Text style={[styles.trophyTierBadgeText, { color: '#38BDF8' }]}>
                  +{gamification.totalExp} EXP EARNED
                </Text>
              </View>
            </View>

            <View style={styles.trophyCardDesc}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="award" size={18} color={BLUE_THEME.gold} />
                  <Text style={styles.trophyName}>
                    {gamification.unlockedTrophies[0]?.name || 'Power Bench Milestone'}
                  </Text>
                </View>
                <View style={styles.activatedTag}>
                  <Text style={styles.activatedTagText}>{t.onboarding.trophyActivatedBadge}</Text>
                </View>
              </View>
              <Text style={styles.trophySub}>
                {gamification.unlockedTrophies[0]?.description ||
                  `Hit ${profile.benchPressPR || 60}kg Bench Press benchmark.`}
              </Text>
            </View>
          </View>
        ) : /* ================= STEP 12: levelJourney (RPG Level Progression) ================= */
        step === 12 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="zap" size={13} color={BLUE_THEME.primary} />
              <Text style={styles.motivationalBadgeText}>LEVEL UP</Text>
            </View>

            <Text style={[styles.mainTitle, { textAlign: 'center' }]}>{t.onboarding.levelJourneyTitle}</Text>
            <Text style={[styles.subTitle, { textAlign: 'center' }]}>{t.onboarding.levelJourneySubtitle}</Text>

            <View style={styles.levelRoadmapCard}>
              <View style={styles.levelJumpBadgeRow}>
                <View style={styles.levelJumpPill}>
                  <Text style={styles.levelJumpPillText}>LEVEL 1</Text>
                </View>
                <Feather name="arrow-right" size={20} color={BLUE_THEME.primary} />
                <View style={[styles.levelJumpPill, { backgroundColor: BLUE_THEME.primary }]}>
                  <Text style={[styles.levelJumpPillText, { color: '#090D16' }]}>
                    LEVEL {gamification.endLevel}
                  </Text>
                </View>
              </View>

              <View style={styles.levelExpReadout}>
                <Text style={styles.levelExpVal}>{gamification.totalExp} EXP</Text>
                <Text style={styles.levelExpSub}>Total accumulated starting experience</Text>
              </View>

              <View style={styles.levelProgressTrack}>
                <View
                  style={[
                    styles.levelProgressFill,
                    {
                      width: `${Math.min(
                        100,
                        (gamification.xpProgressInLevel / gamification.xpNeededForNext) * 100,
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.levelNextThreshold}>
                {gamification.xpProgressInLevel} / {gamification.xpNeededForNext} EXP to Level {gamification.endLevel + 1}
              </Text>

              {/* Milestones Road */}
              <View style={styles.roadmapMilestonesList}>
                <View style={styles.milestoneItem}>
                  <View style={[styles.milestoneDot, { backgroundColor: BLUE_THEME.primary }]} />
                  <Text style={[styles.milestoneText, { color: BLUE_THEME.white }]}>Level 1: Novice Lifter</Text>
                </View>
                <View style={styles.milestoneItem}>
                  <View
                    style={[
                      styles.milestoneDot,
                      { backgroundColor: gamification.endLevel >= 2 ? BLUE_THEME.primary : '#334155' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.milestoneText,
                      gamification.endLevel >= 2 && { color: BLUE_THEME.white, fontWeight: '800' },
                    ]}
                  >
                    Level 2: Disciplined Athlete (+1,000 XP)
                  </Text>
                </View>
                <View style={styles.milestoneItem}>
                  <View style={[styles.milestoneDot, { backgroundColor: '#334155' }]} />
                  <Text style={styles.milestoneText}>Level 5: Iron Warrior (+5,000 XP)</Text>
                </View>
              </View>
            </View>
          </View>
        ) : /* ================= STEP 13: targetMuscles (Dual Mannequin Stage) ================= */
        step === 13 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.focusAreasTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.focusAreasSubtitle}</Text>

            <DualMannequinFocusPicker
              selectedAreas={profile.targetMuscles}
              onToggleArea={toggleFocusArea}
              accentColor={BLUE_THEME.primary}
            />
          </View>
        ) : /* ================= STEP 14: equipment (Equipment Checklist with SVGs) ================= */
        step === 14 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.equipmentTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.equipmentSubtitle}</Text>

            {EQUIPMENT_CATEGORIES.map((cat) => (
              <View key={cat.category} style={styles.equipmentCatWrap}>
                <Text style={styles.catTitle}>{cat.category.toUpperCase()}</Text>
                <View style={styles.optionsList}>
                  {cat.items.map((eq) => {
                    const selected = profile.equipment.includes(eq);
                    return (
                      <Pressable
                        key={eq}
                        onPress={() => toggleEquipment(eq)}
                        style={[
                          styles.optionCard,
                          {
                            backgroundColor: selected ? '#172236' : BLUE_THEME.cardDark,
                            borderColor: selected ? BLUE_THEME.primary : BLUE_THEME.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.optionLeft}>
                          <View style={styles.eqIconTile}>
                            <EquipmentSvg name={eq} />
                          </View>
                          <Text style={styles.optionLabel}>{t.onboarding.equipmentItems[eq] || eq}</Text>
                        </View>
                        <View style={[styles.checkSquare, selected && { backgroundColor: BLUE_THEME.primary, borderColor: BLUE_THEME.primary }]}>
                          {selected && <Feather name="check" size={14} color="#090D16" />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : /* ================= STEP 15: streak (Streak Concept & Flame) ================= */
        step === 15 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="zap" size={13} color="#F97316" />
              <Text style={[styles.motivationalBadgeText, { color: '#F97316' }]}>
                {t.onboarding.disciplineStreakBadge}
              </Text>
            </View>

            <View style={styles.flameHeroBox}>
              <View style={styles.flameGlowAura} />
              <FlameHeroSvg />
            </View>

            <Text style={styles.welcomeTitle}>
              {t.onboarding.streakStartTitle}{' '}
              <Text style={{ color: '#F97316' }}>{t.onboarding.streakStartHighlight}</Text>
            </Text>
            <Text style={styles.subTitle}>{t.onboarding.streakStartSubtitle}</Text>

            <View style={styles.xpBonusCard}>
              <Feather name="zap" size={18} color="#F59E0B" />
              <Text style={styles.xpBonusCardText}>{t.onboarding.streakXpBonusText}</Text>
            </View>

            <View style={styles.streakWeekBox}>
              <View style={styles.streakDaysRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <View key={idx} style={[styles.streakDayCircle, idx === 1 && { backgroundColor: '#F97316' }]}>
                    <Text style={[styles.streakDayText, idx === 1 && { color: '#FFFFFF', fontWeight: '800' }]}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.streakHint}>{t.onboarding.streakHint}</Text>
            </View>
          </View>
        ) : /* ================= STEP 16: streakCommitment (4-Tier Retention Multipliers) ================= */
        step === 16 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.commitWorkoutTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.commitWorkoutSubtitle}</Text>

            <View style={styles.optionsList}>
              {STREAK_COMMITMENT_OPTIONS.map((item) => {
                const selected = profile.streakCommitment === item.days;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, streakCommitment: item.days });
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: selected ? '#172236' : BLUE_THEME.cardDark,
                        borderColor: selected ? BLUE_THEME.primary : BLUE_THEME.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <Feather name="zap" size={18} color={selected ? BLUE_THEME.primary : '#94A3B8'} />
                      <View>
                        <Text style={styles.optionLabel}>{item.label}</Text>
                        <Text style={styles.subCardText}>{item.secondaryText}</Text>
                      </View>
                    </View>
                    <View style={[styles.multiplierBadge, selected && { backgroundColor: BLUE_THEME.primary }]}>
                      <Text
                        style={[
                          styles.multiplierBadgeText,
                          selected ? { color: '#090D16' } : { color: BLUE_THEME.primary },
                        ]}
                      >
                        {item.multiplier}x
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Dynamic Retention Multiplier Readout */}
            <View style={styles.multiplierCalloutCard}>
              <Feather name="trending-up" size={18} color="#22C55E" />
              <Text style={styles.multiplierCalloutText}>
                {t.onboarding.multiplierReadout.replace(
                  '{multiplier}',
                  String(
                    STREAK_COMMITMENT_OPTIONS.find((o) => o.days === profile.streakCommitment)?.multiplier || 8,
                  ),
                )}
              </Text>
            </View>
          </View>
        ) : /* ================= STEP 17: notificationPermission ================= */
        step === 17 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.notifGraphicBox}>
              <View style={styles.trophyGlowAura} />
              <Feather name="bell" size={56} color={BLUE_THEME.primary} />
            </View>

            <Text style={[styles.mainTitle, { textAlign: 'center', marginTop: 18 }]}>
              {t.onboarding.notifPermissionTitle}
            </Text>
            <Text style={[styles.subTitle, { textAlign: 'center' }]}>
              {t.onboarding.notifPermissionSub}
            </Text>

            <View style={styles.notificationPreviewCard}>
              <Feather name="clock" size={20} color={BLUE_THEME.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>{t.onboarding.notifStreakTitle}</Text>
                <Text style={styles.notifBody}>{t.onboarding.notifStreakBody}</Text>
              </View>
            </View>
          </View>
        ) : /* ================= STEP 18: referralSource (Acquisition Channel) ================= */
        step === 18 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.referralTitle}</Text>
            <View style={styles.optionsList}>
              {Object.entries(t.onboarding.referralOptions).map(([key, label]) => {
                const selected = profile.referralSource === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, referralSource: key });
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: selected ? '#172236' : BLUE_THEME.cardDark,
                        borderColor: selected ? BLUE_THEME.primary : BLUE_THEME.cardBorder,
                      },
                    ]}
                  >
                    <Text style={styles.optionLabel}>{label}</Text>
                    <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 19: rating (5-Star Satisfaction) ================= */
        step === 19 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="star" size={13} color="#F59E0B" />
              <Text style={[styles.motivationalBadgeText, { color: '#FBBF24' }]}>YOUR FEEDBACK</Text>
            </View>

            <Text style={[styles.mainTitle, { textAlign: 'center' }]}>{t.onboarding.ratingTitle}</Text>
            <Text style={[styles.subTitle, { textAlign: 'center' }]}>{t.onboarding.ratingSub}</Text>

            {/* Interactive Stars */}
            <View style={styles.starsInteractiveRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSelectedRating(star);
                    setProfile({ ...profile, rating: star });
                  }}
                  style={styles.starPressable}
                >
                  <Feather
                    name="star"
                    size={38}
                    color={star <= selectedRating ? '#F59E0B' : '#334155'}
                  />
                </Pressable>
              ))}
            </View>

            <View style={styles.testimonialCard}>
              <Text style={styles.starsText}>★★★★★</Text>
              <Text style={styles.quoteTitle}>{t.onboarding.testimonialTitle}</Text>
              <Text style={styles.quoteBody}>{t.onboarding.testimonialBody}</Text>
              <Text style={styles.authorText}>{t.onboarding.testimonialAuthor}</Text>
            </View>
          </View>
        ) : /* ================= STEP 20: routinePrep (Animated Routine Generator) ================= */
        step === 20 ? (
          <View style={[styles.stepContainer, styles.centerFlex, { paddingVertical: 40 }]}>
            <View style={styles.loadingAuraBox}>
              <View style={styles.loadingRingOuter}>
                <Svg width="150" height="150" viewBox="0 0 100 100">
                  <Circle cx="50" cy="50" r="42" fill="none" stroke="#1E293B" strokeWidth="8" />
                  <Circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={BLUE_THEME.primary}
                    strokeWidth="8"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * routinePrepProgress) / 100}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </Svg>
                <View style={styles.loadingInsideText}>
                  <Text style={styles.loadingProgressNumber}>{routinePrepProgress}%</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.welcomeTitle, { fontSize: 26, marginTop: 24, textAlign: 'center' }]}>
              {t.onboarding.preparingRoutine}
            </Text>
            <View style={styles.loadingStatusTag}>
              <Feather name="cpu" size={14} color="#38BDF8" />
              <Text style={styles.loadingStatusText}>
                {routinePrepProgress < 40
                  ? t.onboarding.analyzingMuscles
                  : routinePrepProgress < 85
                  ? t.onboarding.calculatingOverload
                  : t.onboarding.finalizingPlan}
              </Text>
            </View>
          </View>
        ) : /* ================= STEP 21: routineReview (Generated Routine Review) ================= */
        step === 21 ? (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeaderBadge}>
              <Feather name="check-circle" size={13} color={BLUE_THEME.primary} />
              <Text style={styles.stepBadgeText}>ROUTINE READY</Text>
            </View>

            <Text style={styles.mainTitle}>{t.onboarding.routineOverviewTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.routineOverviewDesc}</Text>

            <View style={styles.optionsList}>
              {routinePreview.map((routine, index) => (
                <View key={routine.id} style={styles.optionCard}>
                  <View style={styles.routineDayIcon}>
                    <Feather name="activity" size={18} color={BLUE_THEME.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel}>{routine.name}</Text>
                    <Text style={styles.subCardText}>
                      {t.onboarding.exercisesCount.replace('{count}', String(routine.exercises.length))}
                    </Text>
                  </View>
                  <View style={styles.routineDayTag}>
                    <Text style={styles.routineDayTagText}>
                      {t.onboarding.dayLetterFmt.replace('{letter}', String.fromCharCode(65 + index))}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : /* ================= STEP 23: signupMethodSelection & Profile Names ================= */
        step === 23 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.saveProgressTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.saveProgressSub}</Text>

            {/* Name Input */}
            <Text style={styles.fieldLabel}>{t.onboarding.nameTitle}</Text>
            <TextInput
              style={styles.inputField}
              value={profile.name}
              placeholder="e.g. Linh"
              placeholderTextColor="#64748B"
              onChangeText={(text) => setProfile({ ...profile, name: text })}
              returnKeyType="next"
            />

            {/* Username Input */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{t.onboarding.usernameTitle}</Text>
            <View style={styles.usernameInputWrap}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                style={styles.usernameInput}
                value={profile.username}
                placeholder={t.onboarding.usernamePlaceholder}
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                onChangeText={(text) => setProfile({ ...profile, username: text.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              />
            </View>
            <Text style={[styles.subCardText, { marginTop: 6 }]}>{t.onboarding.usernameSubtitle}</Text>

            {/* Auth Buttons */}
            <View style={{ marginTop: 24, gap: 10 }}>
              {Platform.OS === 'ios' && (
                <Pressable onPress={() => void handleExistingAccountLogin()} style={styles.socialAuthBtn}>
                  <FontAwesome name="apple" size={18} color="#FFFFFF" />
                  <Text style={styles.socialAuthText}>{t.onboarding.signInApple}</Text>
                </Pressable>
              )}
              <Pressable onPress={() => void handleExistingAccountLogin()} style={[styles.socialAuthBtn, { backgroundColor: '#1A2333' }]}>
                <Feather name="mail" size={18} color="#38BDF8" />
                <Text style={[styles.socialAuthText, { color: '#FFFFFF' }]}>{t.onboarding.signInGoogle}</Text>
              </Pressable>
            </View>
          </View>
        ) : /* ================= STEP 24: youAreReady (Celebration & Soft Paywall CTA) ================= */
        step === 24 ? (
          <View style={[styles.stepContainer, styles.centerFlex, { paddingVertical: 30 }]}>
            <View style={styles.celebrationIconBox}>
              <Svg width="100" height="100" viewBox="0 0 100 100">
                <Defs>
                  <LinearGradient id="readyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#38BDF8" />
                    <Stop offset="100%" stopColor="#22C55E" />
                  </LinearGradient>
                </Defs>
                <Circle cx="50" cy="50" r="44" fill="none" stroke="url(#readyGrad)" strokeWidth="4" />
                <Path
                  d="M 30,52 L 44,66 L 72,36"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>

            <Text style={[styles.welcomeTitle, { fontSize: 30, marginTop: 20 }]}>{t.onboarding.youAreReady}</Text>
            <Text style={[styles.subTitle, { textAlign: 'center', maxWidth: 300 }]}>
              {t.onboarding.youAreReadySub}
            </Text>

            <View style={styles.readySummaryCard}>
              <View style={styles.readySummaryItem}>
                <View style={[styles.readyDot, { backgroundColor: '#38BDF8' }]} />
                <Text style={styles.readySummaryText}>{t.onboarding.readyRoutineGenerated}</Text>
              </View>
              <View style={styles.readySummaryItem}>
                <View style={[styles.readyDot, { backgroundColor: '#F97316' }]} />
                <Text style={styles.readySummaryText}>
                  {t.onboarding.readyStreakPledged.replace('{days}', String(profile.streakCommitment || 30))}
                </Text>
              </View>
              <View style={styles.readySummaryItem}>
                <View style={[styles.readyDot, { backgroundColor: '#A855F7' }]} />
                <Text style={styles.readySummaryText}>{t.onboarding.readyRanksArmed}</Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      {step !== 20 ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            onPress={next}
            style={({ pressed }) => [
              styles.continueBtn,
              { backgroundColor: BLUE_THEME.primary, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Text style={styles.continueBtnText}>{buttonText}</Text>
          </Pressable>

          {step === 0 ? (
            <Pressable onPress={() => void handleExistingAccountLogin()} accessibilityRole="button">
              <Text style={styles.loginHint}>
                {t.onboarding.alreadyHaveAccount}
                <Text style={{ color: BLUE_THEME.primary, fontWeight: '700' }}> {t.onboarding.logIn}</Text>
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Paywall Modal */}
      {showPaywall ? (
        <PaywallModal
          onClose={() => handleFinishOnboarding(false)}
          onSubscribe={(_plan) => handleFinishOnboarding(true)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loading: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171F30',
  },
  backPlaceholder: {
    width: 36,
  },
  skipHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#162032',
  },
  skipHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  progressBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: BLUE_THEME.primary,
    borderRadius: 3,
  },
  stepCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: BLUE_THEME.primary,
    minWidth: 38,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  stepContainer: {
    width: '100%',
  },
  centerFlex: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    color: BLUE_THEME.white,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '900',
    color: BLUE_THEME.white,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: BLUE_THEME.subText,
    marginBottom: 16,
  },
  optionsList: {
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  optionCard: {
    width: '100%',
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: BLUE_THEME.white,
    flex: 1,
  },
  subCardText: {
    fontSize: 12,
    color: BLUE_THEME.subText,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#334155',
  },
  radioCircleActive: {
    borderColor: BLUE_THEME.primary,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLUE_THEME.primary,
  },
  checkSquare: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#182030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: 'center',
    gap: 8,
    backgroundColor: BLUE_THEME.bgDark,
  },
  continueBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BLUE_THEME.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#070B14',
    letterSpacing: 0.4,
  },
  loginHint: {
    fontSize: 13,
    color: BLUE_THEME.subText,
  },
  stepHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  stepBadgeText: {
    color: BLUE_THEME.primary,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  motivationalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  motivationalBadgeText: {
    color: BLUE_THEME.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  carouselArtworkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  carouselDot: {
    height: 8,
    borderRadius: 4,
  },
  carouselDotActive: {
    width: 28,
    backgroundColor: BLUE_THEME.primary,
  },
  carouselDotInactive: {
    width: 8,
    backgroundColor: '#202A3C',
  },
  socialPeersBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#172236',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prIntroCard: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  prBenchmarkList: {
    width: '100%',
    gap: 12,
    marginTop: 14,
  },
  prBenchmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prBenchmarkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prBenchmarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: BLUE_THEME.white,
  },
  rulerValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 20,
  },
  adjustStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#162032',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulerInputBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#131B2A',
    borderWidth: 1.5,
    borderColor: '#223049',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
    gap: 6,
  },
  rulerLargeValInput: {
    fontSize: 44,
    fontWeight: '900',
    color: BLUE_THEME.white,
    minWidth: 80,
    textAlign: 'center',
    padding: 0,
  },
  rulerUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: BLUE_THEME.subText,
  },
  rulerPresetsWrap: {
    width: '100%',
    marginVertical: 12,
  },
  rulerMarksScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rulerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#141D2E',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  rulerChipActive: {
    backgroundColor: '#172B45',
    borderColor: BLUE_THEME.primary,
  },
  rulerChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  rulerChipTextActive: {
    color: BLUE_THEME.white,
    fontWeight: '800',
  },
  trophyHeroBox: {
    marginVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  trophyGlowAura: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  trophyTierBadgesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  trophyTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#261C08',
    borderColor: '#78350F',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  trophyTierBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
  trophyCardDesc: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 18,
    width: '100%',
  },
  trophyName: {
    fontSize: 16,
    fontWeight: '800',
    color: BLUE_THEME.white,
  },
  activatedTag: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  activatedTagText: {
    color: '#22C55E',
    fontSize: 10.5,
    fontWeight: '800',
  },
  trophySub: {
    fontSize: 13,
    color: BLUE_THEME.subText,
    lineHeight: 18,
  },
  levelRoadmapCard: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  levelJumpBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  levelJumpPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  levelJumpPillText: {
    fontSize: 14,
    fontWeight: '900',
    color: BLUE_THEME.white,
  },
  levelExpReadout: {
    alignItems: 'center',
    marginBottom: 16,
  },
  levelExpVal: {
    fontSize: 32,
    fontWeight: '900',
    color: BLUE_THEME.primary,
  },
  levelExpSub: {
    fontSize: 12,
    color: BLUE_THEME.subText,
    marginTop: 2,
  },
  levelProgressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: BLUE_THEME.primary,
    borderRadius: 4,
  },
  levelNextThreshold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 6,
  },
  roadmapMilestonesList: {
    width: '100%',
    gap: 12,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#202A3C',
    paddingTop: 16,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  milestoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  milestoneText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  equipmentCatWrap: {
    marginTop: 18,
    width: '100%',
  },
  catTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BLUE_THEME.white,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  eqIconTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#171E2D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#242F44',
  },
  flameHeroBox: {
    marginVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  flameGlowAura: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
  },
  xpBonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#261C08',
    borderColor: '#78350F',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginVertical: 10,
  },
  xpBonusCardText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FBBF24',
  },
  streakWeekBox: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 18,
    width: '100%',
    alignItems: 'center',
    marginVertical: 16,
  },
  streakDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  streakDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1A2333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakDayText: {
    fontSize: 13,
    color: BLUE_THEME.subText,
  },
  streakHint: {
    fontSize: 12,
    color: BLUE_THEME.subText,
    textAlign: 'center',
  },
  multiplierBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  multiplierBadgeText: {
    fontSize: 14,
    fontWeight: '900',
  },
  multiplierCalloutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    padding: 16,
    marginTop: 20,
  },
  multiplierCalloutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#22C55E',
    flex: 1,
  },
  notifGraphicBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#172236',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  notificationPreviewCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 16,
    alignItems: 'center',
    marginTop: 18,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BLUE_THEME.white,
  },
  notifBody: {
    fontSize: 12,
    color: BLUE_THEME.subText,
    marginTop: 2,
  },
  starsInteractiveRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 24,
  },
  starPressable: {
    padding: 4,
  },
  testimonialCard: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 20,
    width: '100%',
    marginTop: 10,
  },
  starsText: {
    fontSize: 16,
    color: '#F59E0B',
    marginBottom: 6,
  },
  quoteTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BLUE_THEME.white,
    marginBottom: 4,
  },
  quoteBody: {
    fontSize: 13,
    color: BLUE_THEME.subText,
    lineHeight: 18,
  },
  authorText: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE_THEME.primary,
    marginTop: 8,
  },
  loadingAuraBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  loadingRingOuter: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  loadingInsideText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingProgressNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: BLUE_THEME.white,
  },
  loadingStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
  },
  loadingStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  routineDayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#162338',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  routineDayTag: {
    backgroundColor: '#1E2C44',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  routineDayTagText: {
    fontSize: 11,
    color: BLUE_THEME.primary,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: BLUE_THEME.white,
    marginBottom: 8,
  },
  inputField: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: BLUE_THEME.cardDark,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: BLUE_THEME.white,
  },
  usernameInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: BLUE_THEME.cardDark,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    paddingHorizontal: 16,
  },
  usernamePrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: BLUE_THEME.primary,
    marginRight: 6,
  },
  usernameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: BLUE_THEME.white,
    padding: 0,
  },
  socialAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#202A3C',
  },
  socialAuthText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  celebrationIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  readySummaryCard: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 18,
    width: '100%',
    gap: 14,
    marginTop: 20,
  },
  readySummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  readyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  readySummaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: BLUE_THEME.white,
    flex: 1,
  },
});
