import { Text } from "@/components/AppTypography";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/lib/i18n";

interface BiometricFingerprintConfirmProps {
  userName?: string;
  onConfirmed: () => void;
  onBack?: () => void;
  streakGoalDays?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Authentic High-Fidelity Biometric Fingerprint Vector
 * Features fine papillary ridge loops, central whorls, and delta arches.
 */
function AuthenticFingerprintSvg({
  color = "#38BDF8",
  glowProgress = 0,
}: {
  color?: string;
  glowProgress?: number;
}) {
  const isGlowing = glowProgress > 0.05;

  return (
    <Svg width="96" height="114" viewBox="0 0 92 110">
      <Defs>
        <LinearGradient id="fpRidgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={isGlowing ? "#BAE6FD" : "#64748B"} />
          <Stop offset="45%" stopColor={isGlowing ? "#38BDF8" : "#475569"} />
          <Stop offset="100%" stopColor={isGlowing ? "#0284C7" : "#334155"} />
        </LinearGradient>
        <RadialGradient id="fpCoreGlow" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop
            offset="0%"
            stopColor="#38BDF8"
            stopOpacity={isGlowing ? 0.7 : 0}
          />
          <Stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Core Glow Background */}
      {isGlowing && <Circle cx="46" cy="55" r="44" fill="url(#fpCoreGlow)" />}

      {/* Papillary Ridges - Anatomical Biometric Vector Pattern */}
      {/* 1. Innermost Central Loop */}
      <Path
        d="M 46,50 C 44,50 42,53 42,58 C 42,63 44,67 46,67 C 48,67 50,63 50,58 C 50,53 48,50 46,50 Z"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 2. Inner Whorl Arch 1 */}
      <Path
        d="M 41,56 C 41,47 43,44 46,44 C 49,44 51,47 51,56 C 51,66 49,73 46,73 C 43,73 41,66 41,56"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 3. Inner Whorl Arch 2 */}
      <Path
        d="M 37,54 C 37,42 41,38 46,38 C 51,38 55,42 55,54 C 55,68 52,79 46,79 C 41,79 37,68 37,54"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 4. Medial Loop 1 */}
      <Path
        d="M 33,56 C 33,36 39,32 46,32 C 53,32 59,36 59,56 C 59,71 56,84 46,85 C 41,85 36,75 33,64"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 5. Medial Loop 2 */}
      <Path
        d="M 29,60 C 29,32 37,26 46,26 C 55,26 63,32 63,60 C 63,75 60,89 48,91 C 41,91 33,80 30,68"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 6. Outer Arch 1 */}
      <Path
        d="M 25,66 C 25,28 35,20 46,20 C 57,20 67,28 67,66 C 67,80 64,95 52,97 C 46,98 37,89 32,77"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 7. Outer Arch 2 */}
      <Path
        d="M 21,72 C 21,24 33,14 46,14 C 59,14 71,24 71,72 C 71,84 68,100 55,102"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 8. Outermost Perimeter Ridge */}
      <Path
        d="M 17,78 C 17,20 31,8 46,8 C 61,8 75,20 75,78 C 75,88 71,104 59,106"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 9. Left Shoulder Lateral Ridges */}
      <Path
        d="M 13,84 C 13,32 23,16 38,10"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <Path
        d="M 11,90 C 10,65 15,36 30,22"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 10. Right Shoulder Lateral Ridges */}
      <Path
        d="M 79,84 C 79,32 69,16 54,10"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <Path
        d="M 81,90 C 82,65 77,36 62,22"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 11. Left Delta & Basal Ridges */}
      <Path
        d="M 15,96 C 20,86 28,78 28,68 C 28,58 24,52 24,42"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <Path
        d="M 20,102 C 26,96 33,93 38,94"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 12. Right Delta & Basal Ridges */}
      <Path
        d="M 77,96 C 72,86 64,78 64,68 C 64,58 68,52 68,42"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <Path
        d="M 72,102 C 66,96 59,93 54,94"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 13. Bottom Core Converging Ridge */}
      <Path
        d="M 36,99 C 42,104 50,104 56,99"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <Path
        d="M 40,105 C 44,107 48,107 52,105"
        fill="none"
        stroke="url(#fpRidgeGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BiometricFingerprintConfirm({
  userName,
  onConfirmed,
  onBack,
  streakGoalDays = 30,
}: BiometricFingerprintConfirmProps) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const displayName = userName || t.onboarding.defaultWarriorName;
  const [isHolding, setIsHolding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shockwaveScale = useRef(new Animated.Value(1)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;
  const ripple2Scale = useRef(new Animated.Value(1)).current;
  const ripple2Opacity = useRef(new Animated.Value(0)).current;
  const ripple3Scale = useRef(new Animated.Value(1)).current;
  const ripple3Opacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const podPulse = useRef(new Animated.Value(1)).current;
  const laserAnim = useRef(new Animated.Value(0)).current;

  const mountedRef = useRef(true);
  const confirmedRef = useRef(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<Animated.CompositeAnimation | null>(null);
  const confirmOnce = () => {
    if (!mountedRef.current || confirmedRef.current) return;
    confirmedRef.current = true;
    onConfirmed();
  };
  const hapticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const laserLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (hapticTimerRef.current) clearInterval(hapticTimerRef.current);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      animRef.current?.stop();
      laserLoopRef.current?.stop();
      flashRef.current?.stop();
    };
  }, []);

  // Idle gentle breathing pulse on scanner pod
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(podPulse, {
          toValue: 1.05,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(podPulse, {
          toValue: 1.0,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [podPulse]);

  // Laser scanner vertical oscillation while holding
  useEffect(() => {
    if (isHolding) {
      laserLoopRef.current = Animated.loop(
        (flashRef.current = Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 650,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 650,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])),
      );
      laserLoopRef.current.start();
    } else {
      laserLoopRef.current?.stop();
      laserAnim.setValue(0);
    }
    return () => laserLoopRef.current?.stop();
  }, [isHolding, laserAnim]);

  // Listener to track progress percentage
  useEffect(() => {
    let lastP = -1;
    const listenerId = progressAnim.addListener(({ value }) => {
      const p = Math.min(100, Math.round(value * 100));
      if (p !== lastP) {
        lastP = p;
        setProgressPercent(p);
      }
    });
    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim]);

  const handlePressIn = () => {
    if (isSuccess) return;
    if (hapticTimerRef.current) clearInterval(hapticTimerRef.current);
    setIsHolding(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Dynamic haptic heartbeat accelerating as wave expands
    let stepCount = 0;
    hapticTimerRef.current = setInterval(() => {
      stepCount++;
      if (stepCount < 4) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (stepCount < 8) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }, 130);

    // Reset initial shockwave states
    shockwaveScale.setValue(1);
    shockwaveOpacity.setValue(0.75);
    ripple2Scale.setValue(1);
    ripple2Opacity.setValue(0.55);
    ripple3Scale.setValue(1);
    ripple3Opacity.setValue(0.4);

    // Parallel expansion: scales up to 45x radiating out from fingerprint center across entire screen
    animRef.current = Animated.parallel([
      // Primary shockwave ring (expands completely over full screen)
      Animated.timing(shockwaveScale, {
        toValue: 45,
        duration: 1250,
        easing: Easing.bezier(0.16, 0.8, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(shockwaveOpacity, {
        toValue: 0.95,
        duration: 1250,
        useNativeDriver: true,
      }),

      // Secondary shockwave ripple
      Animated.timing(ripple2Scale, {
        toValue: 36,
        duration: 1250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ripple2Opacity, {
        toValue: 0.8,
        duration: 1250,
        useNativeDriver: true,
      }),

      // Tertiary core shockwave wave
      Animated.timing(ripple3Scale, {
        toValue: 28,
        duration: 1250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(ripple3Opacity, {
        toValue: 0.65,
        duration: 1250,
        useNativeDriver: true,
      }),

      // Linear progress 0 -> 1
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1250,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]);

    animRef.current.start(({ finished }) => {
      if (finished && mountedRef.current) {
        if (hapticTimerRef.current) clearInterval(hapticTimerRef.current);
        setIsSuccess(true);
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );

        // Screen-wide triumph flash veil
        flashRef.current = Animated.sequence([
          Animated.timing(flashOpacity, {
            toValue: 0.95,
            duration: 140,
            useNativeDriver: true,
          }),
          Animated.timing(flashOpacity, {
            toValue: 0,
            duration: 380,
            useNativeDriver: true,
          }),
        ]);
        flashRef.current.start(({ finished }) => {
          if (!finished || !mountedRef.current) return;
          confirmTimerRef.current = setTimeout(confirmOnce, 220);
        });
      }
    });
  };

  const handlePressOut = () => {
    if (isSuccess) return;
    if (hapticTimerRef.current) {
      clearInterval(hapticTimerRef.current);
      hapticTimerRef.current = null;
    }
    if (animRef.current) {
      animRef.current.stop();
    }
    setIsHolding(false);
    setProgressPercent(0);

    // Smooth elastic snapback to resting state
    Animated.parallel([
      Animated.timing(shockwaveScale, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(shockwaveOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(ripple2Scale, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(ripple2Opacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(ripple3Scale, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(ripple3Opacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-35, 35],
  });

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom, 16) + 12,
        },
      ]}
    >
      {/* Floating Back Button */}
      {onBack && (
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            onBack();
          }}
          style={[styles.floatingBackButton, { top: insets.top + 6 }]}
          hitSlop={14}
        >
          <Feather name="chevron-left" size={24} color="#FFFFFF" />
        </Pressable>
      )}

      {/* FULLSCREEN AMBIENT CYAN AURA WASH (Fills the entire screen as user holds) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fullscreenWash,
          {
            opacity: progressAnim.interpolate({
              inputRange: [0, 0.4, 1],
              outputRange: [0, 0.25, 0.7],
            }),
          },
        ]}
      />

      {/* FULLSCREEN SUCCESS FLASH VEIL */}
      <Animated.View
        pointerEvents="none"
        style={[styles.fullscreenFlash, { opacity: flashOpacity }]}
      />

      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={[
          styles.contentWrap,
          {
            flexGrow: 1,
            flex: undefined,
            alignSelf: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER TITLE & MOTIVATIONAL KICKER */}
        <View style={styles.topSection}>
          <View style={styles.badgeRow}>
            <Feather name="shield" size={13} color="#38BDF8" />
            <Text style={styles.badgeText}>
              {t.onboarding.commitmentPledgeBadge}
            </Text>
          </View>
          <Text style={styles.mainTitle}>
            {t.onboarding.pledgeTitleFmt.split("{name}")[0]}
            <Text style={styles.nameHighlight}>{displayName}</Text>
            {t.onboarding.pledgeTitleFmt.split("{name}")[1] || ""}
          </Text>
        </View>

        {/* PLEDGE HONOR CARD */}
        <View style={styles.pledgeCard}>
          <View style={styles.pledgeRow}>
            <View style={styles.pledgeIconCircle}>
              <Feather name="check" size={13} color="#38BDF8" />
            </View>
            <Text style={styles.pledgeItemText}>
              {t.onboarding.pledgeItemStreak.replace(
                "{days}",
                String(streakGoalDays),
              )}
            </Text>
          </View>

          <View style={styles.pledgeRow}>
            <View style={styles.pledgeIconCircle}>
              <Feather name="check" size={13} color="#38BDF8" />
            </View>
            <Text style={styles.pledgeItemText}>
              {t.onboarding.pledgeItemOverload}
            </Text>
          </View>
          <View style={styles.pledgeRow}>
            <View style={styles.pledgeIconCircle}>
              <Feather name="check" size={13} color="#38BDF8" />
            </View>
            <Text style={styles.pledgeItemText}>
              {t.onboarding.pledgeItemHonor}
            </Text>
          </View>
        </View>

        {/* BIOMETRIC SCANNER INTERACTIVE POD */}
        <View style={styles.scannerWrapper}>
          {/* SHOCKWAVE EXPANSION RIPPLES - Originating from EXACT center of fingerprint */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shockwaveCirclePrimary,
              {
                transform: [{ scale: shockwaveScale }],
                opacity: shockwaveOpacity,
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shockwaveCircleSecondary,
              {
                transform: [{ scale: ripple2Scale }],
                opacity: ripple2Opacity,
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shockwaveCircleTertiary,
              {
                transform: [{ scale: ripple3Scale }],
                opacity: ripple3Opacity,
              },
            ]}
          />

          {/* Outer Scanner Target Ring */}
          <Animated.View
            style={[
              styles.scannerOuterRing,
              {
                transform: [{ scale: isHolding ? 1.08 : podPulse }],
                borderColor: isHolding ? "#38BDF8" : "#22304A",
              },
            ]}
          >
            {/* Futuristic Scanner Border Marks */}
            <View style={[styles.cornerTick, styles.cornerTL]} />
            <View style={[styles.cornerTR, styles.cornerTick]} />
            <View style={[styles.cornerTick, styles.cornerBL]} />
            <View style={[styles.cornerBR, styles.cornerTick]} />

            {/* Animated Glow Border */}
            <View
              style={[
                styles.scannerInnerRing,
                isHolding && styles.scannerInnerRingActive,
              ]}
            >
              {/* Pressable Fingerprint Trigger */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.onboarding.tapAndHoldCommit}
                accessibilityActions={[{ name: "activate" }]}
                onAccessibilityAction={confirmOnce}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={({ pressed }) => [
                  styles.fingerprintButton,
                  pressed && styles.fingerprintButtonPressed,
                ]}
                hitSlop={20}
              >
                <AuthenticFingerprintSvg
                  color={isHolding ? "#38BDF8" : "#64748B"}
                  glowProgress={isHolding ? 1 : 0}
                />

                {/* Animated Laser Scan Beam */}
                {isHolding && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.laserBeam,
                      { transform: [{ translateY: laserTranslateY }] },
                    ]}
                  />
                )}
              </Pressable>
            </View>
          </Animated.View>

          {/* Real-time Status / Percentage */}
          <View style={styles.statusBox}>
            {!isSuccess && (
              <>
                <Text
                  style={[
                    styles.statusText,
                    isHolding && styles.statusTextActive,
                  ]}
                >
                  {isHolding
                    ? t.onboarding.scanningCommitStatus.replace(
                        "{percent}",
                        String(progressPercent),
                      )
                    : t.onboarding.touchAndHoldCommit}
                </Text>
                <Text style={styles.statusSub}>
                  {t.onboarding.holdWaveExpandsSub}
                </Text>
              </>
            )}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={confirmOnce}
          style={{ minHeight: 48, justifyContent: "center", padding: 12 }}
        >
          <Text style={{ color: "#94A3B8", textAlign: "center" }}>
            {t.onboarding.continue}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#090D16',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  floatingBackButton: {
    position: 'absolute',
    left: 16,
    zIndex: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  fullscreenWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 132, 199, 0.45)',
    zIndex: 1,
  },
  fullscreenFlash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#38BDF8',
    zIndex: 99,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 14,
    zIndex: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#101B2E',
    borderWidth: 1.2,
    borderColor: '#1E3A5F',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  nameHighlight: {
    color: '#38BDF8',
  },
  pledgeCard: {
    width: '100%',
    backgroundColor: '#111726',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 18,
    padding: 14,
    gap: 10,
    marginBottom: 18,
    zIndex: 10,
  },
  pledgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pledgeIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#162842',
    borderWidth: 1,
    borderColor: '#234975',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pledgeItemText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 17,
  },
  scannerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
    overflow: 'visible',
    zIndex: 10,
  },
  shockwaveCirclePrimary: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(56, 189, 248, 0.42)',
    borderWidth: 3,
    borderColor: '#38BDF8',
    zIndex: 2,
  },
  shockwaveCircleSecondary: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(14, 165, 233, 0.28)',
    borderWidth: 2,
    borderColor: '#7DD3FC',
    zIndex: 1,
  },
  shockwaveCircleTertiary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderWidth: 1.5,
    borderColor: '#0284C7',
    zIndex: 0,
  },
  scannerOuterRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A111E',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
    position: 'relative',
    zIndex: 10,
  },
  cornerTick: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderColor: '#38BDF8',
  },
  cornerTL: {
    top: 14,
    left: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    top: 14,
    right: 14,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  scannerInnerRing: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 1.5,
    borderColor: '#1E2D44',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101828',
    overflow: 'hidden',
    position: 'relative',
  },
  scannerInnerRingActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#12233D',
  },
  fingerprintButton: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fingerprintButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  laserBeam: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 3,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    borderRadius: 2,
  },
  statusBox: {
    marginTop: 20,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  statusText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statusTextActive: {
    color: '#38BDF8',
  },
  statusSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
