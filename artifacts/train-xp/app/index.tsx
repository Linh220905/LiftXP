import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { DualMannequinFocusPicker, type FocusArea } from '@/components/DualMannequinFocusPicker';
import { PaywallModal } from '@/components/PaywallModal';
import { useI18n } from '@/lib/i18n';
import {
  useAppState,
  type BodyType,
  type Experience,
  type Gender,
  type PrimaryGoal,
  type Profile,
  type UnitSystem,
} from '@/context/AppState';
import { useColors } from '@/hooks/useColors';

// Electric Cyan Blue Brand Palette
const BLUE_THEME = {
  primary: '#38BDF8',
  primaryDark: '#0284C7',
  accentGreen: '#22C55E',
  bgDark: '#090D16',
  cardDark: '#131926',
  cardBorder: '#202A3C',
  subText: '#94A3B8',
  white: '#FFFFFF',
  gold: '#F59E0B',
  bronze: '#B45309',
  silver: '#94A3B8',
};

// Motivations List
const MOTIVATION_OPTIONS = [
  { label: 'Health & Wellness', icon: 'smile' },
  { label: 'Weight Management', icon: 'activity' },
  { label: 'Build Discipline', icon: 'clock' },
  { label: 'Become Sexually Attractive', icon: 'heart' },
  { label: 'Stress Relief', icon: 'feather' },
  { label: 'Enjoyment', icon: 'sun' },
  { label: 'Improve Sleep Quality', icon: 'moon' },
  { label: 'Improve Self-Confidence', icon: 'shield' },
];

// Long-term Fitness Goals
const FITNESS_GOALS: { label: PrimaryGoal; icon: string }[] = [
  { label: 'Build Muscle', icon: 'zap' },
  { label: 'Burn Fat', icon: 'flame' },
  { label: 'Increase Endurance', icon: 'trending-up' },
  { label: 'Weight Loss', icon: 'arrow-down' },
  { label: 'Weight Gain', icon: 'arrow-up' },
  { label: 'Optimize Workouts', icon: 'bar-chart-2' },
];

// Sensitive Struggle Areas (Screenshot 6)
const SENSITIVE_AREAS = [
  { id: 'back', label: 'Sensitive back' },
  { id: 'knees', label: 'Sensitive knees' },
  { id: 'shoulders', label: 'Sensitive shoulders' },
  { id: 'wrist', label: 'Sensitive wrist' },
];

// Workout Experience
const EXPERIENCE_OPTIONS: { label: Experience; sub: string }[] = [
  { label: 'Regularly', sub: 'Yes, I work out regularly' },
  { label: 'Less than 1 year ago', sub: 'Yes, less than a year ago' },
  { label: 'More than 1 year ago', sub: 'Yes, more than 1 year ago' },
  { label: 'No experience', sub: "No, I don't have any" },
];

// Dream Body Type
const BODY_TYPES: { type: BodyType; icon: string }[] = [
  { type: 'Athletic', icon: 'award' },
  { type: 'Balanced', icon: 'target' },
  { type: 'Strong', icon: 'shield' },
];

// Equipment list (Screenshots 7 & 8)
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
    items: ['Bench', 'Machines', 'Cable Machine'],
  },
];

// Muscle target icons (Screenshot 9)
const WORKOUT_MUSCLES = [
  { id: 'Chest', label: 'Chest', color: '#22C55E' },
  { id: 'Back', label: 'Back', color: '#38BDF8' },
  { id: 'Legs', label: 'Legs', color: '#FACC15' },
  { id: 'Shoulders', label: 'Shoulders', color: '#C084FC' },
  { id: 'Arms', label: 'Arms', color: '#F59E0B' },
];

// Fingerprint Biometric SVG for Step 27
function FingerprintSvg({ color = '#38BDF8', isHolding = false }: { color?: string; isHolding?: boolean }) {
  return (
    <Svg width="72" height="72" viewBox="0 0 72 72">
      <Defs>
        <LinearGradient id="fpGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={isHolding ? '#38BDF8' : '#64748B'} />
          <Stop offset="100%" stopColor={isHolding ? '#0284C7' : '#334155'} />
        </LinearGradient>
      </Defs>
      {/* Fingerprint Whorls */}
      <Path
        d="M36 12 C24 12 16 20 16 32 C16 44 20 54 24 60"
        fill="none"
        stroke="url(#fpGlow)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <Path
        d="M26 18 C30 15 36 15 42 17 C48 20 52 26 52 34 C52 46 48 56 46 60"
        fill="none"
        stroke="url(#fpGlow)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <Path
        d="M22 30 C22 22 28 18 36 18 C44 18 48 23 48 30 C48 40 44 50 38 58"
        fill="none"
        stroke="url(#fpGlow)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <Path
        d="M30 26 C33 24 38 24 41 26 C43 28 44 32 44 36 C44 44 40 50 34 54"
        fill="none"
        stroke="url(#fpGlow)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <Path
        d="M36 29 C34 29 33 32 33 36 C33 42 36 46 36 50"
        fill="none"
        stroke="url(#fpGlow)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <Path
        d="M30 60 C32 61 36 61 40 59"
        fill="none"
        stroke="url(#fpGlow)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <Path
        d="M12 36 C12 22 22 10 36 10 C50 10 60 21 60 36 C60 48 56 56 52 62"
        fill="none"
        stroke="url(#fpGlow)"
        strokeWidth="2.8"
        strokeLinecap="round"
        opacity={0.6}
      />
    </Svg>
  );
}

// 3D Metallic Trophy SVG for Step 15
function TrophyHeroSvg() {
  return (
    <Svg width="140" height="140" viewBox="0 0 120 120">
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
      {/* Handles */}
      <Path
        d="M32 36 C14 36 12 56 30 64 L34 60 C22 54 22 42 34 42 Z"
        fill="url(#goldHandles)"
      />
      <Path
        d="M88 36 C106 36 108 56 90 64 L86 60 C98 54 98 42 86 42 Z"
        fill="url(#goldHandles)"
      />
      {/* Main Cup */}
      <Path
        d="M32 26 L88 26 C88 52 74 68 60 68 C46 68 32 52 32 26 Z"
        fill="url(#goldCup)"
        stroke="#FEF08A"
        strokeWidth="1.5"
      />
      {/* Cup Rim */}
      <Rect x="30" y="24" width="60" height="6" rx="3" fill="#FEF08A" />
      {/* Stem */}
      <Rect x="54" y="68" width="12" height="16" rx="2" fill="url(#goldCup)" />
      {/* Base Tier 1 */}
      <Path d="M44 84 L76 84 L80 94 L40 94 Z" fill="url(#goldCup)" />
      {/* Pedestal Base */}
      <Rect x="32" y="94" width="56" height="16" rx="4" fill="url(#goldBase)" stroke="#B45309" strokeWidth="1.5" />
      {/* Star Crest on Cup */}
      <Path
        d="M60 38 L62.5 45 L70 45 L64 49.5 L66.5 56.5 L60 52 L53.5 56.5 L56 49.5 L50 45 L57.5 45 Z"
        fill="#FFFFFF"
        opacity={0.9}
      />
      {/* Glowing Star Sparkles */}
      <Circle cx="86" cy="22" r="3" fill="#FEF08A" opacity={0.8} />
      <Circle cx="30" cy="68" r="2.5" fill="#FEF08A" opacity={0.8} />
    </Svg>
  );
}

// Multi-layered Flame SVG for Step 23
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
      {/* Outer Flame */}
      <Path
        d="M50 10 C50 10 30 32 30 54 C30 68 40 82 50 86 C60 82 70 68 70 54 C70 38 60 26 56 20 C54 28 48 34 48 34 C48 34 56 22 50 10 Z"
        fill="url(#flameOuter)"
      />
      {/* Inner Hot Flame */}
      <Path
        d="M50 42 C50 42 40 52 40 64 C40 73 45 78 50 80 C55 78 60 73 60 64 C60 55 54 48 50 42 Z"
        fill="url(#flameInner)"
      />
    </Svg>
  );
}

// Radar Spider Chart Component with 6 Axis Labels
function RadarChartDistribution() {
  const { t } = useI18n();
  const labels: { text: string; x: number; y: number; anchor: 'middle' | 'start' | 'end' }[] = [
    { text: t.onboarding.workoutMuscles['Chest']?.toUpperCase() || 'CHEST', x: 120, y: 16, anchor: 'middle' },
    { text: t.onboarding.workoutMuscles['Shoulders']?.toUpperCase() || 'SHOULDERS', x: 180, y: 58, anchor: 'start' },
    { text: t.onboarding.workoutMuscles['Arms']?.toUpperCase() || 'ARMS', x: 180, y: 122, anchor: 'start' },
    { text: t.onboarding.workoutMuscles['Legs']?.toUpperCase() || 'LEGS', x: 120, y: 164, anchor: 'middle' },
    { text: t.onboarding.workoutMuscles['Back']?.toUpperCase() || 'BACK', x: 60, y: 122, anchor: 'end' },
    { text: 'CORE', x: 60, y: 58, anchor: 'end' },
  ];

  return (
    <View style={styles.radarCard}>
      <Text style={styles.radarTitle}>{t.onboarding.muscleBalanceProfile}</Text>
      <View style={styles.spiderChartBox}>
        <Svg width="260" height="175" viewBox="0 0 240 170">
          <Defs>
            <LinearGradient id="radarFillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.55" />
              <Stop offset="100%" stopColor="#0284C7" stopOpacity="0.15" />
            </LinearGradient>
          </Defs>

          {/* Web grid polygons: 100%, 75%, 50%, 25% */}
          {/* 100% outer rim */}
          <Path
            d="M 120,28 L 172,58 L 172,118 L 120,148 L 68,118 L 68,58 Z"
            fill="none"
            stroke="#263449"
            strokeWidth="1.5"
          />
          {/* 75% rim */}
          <Path
            d="M 120,43 L 159,65.5 L 159,110.5 L 120,133 L 81,110.5 L 81,65.5 Z"
            fill="none"
            stroke="#1E293B"
            strokeWidth="1"
          />
          {/* 50% rim */}
          <Path
            d="M 120,58 L 146,73 L 146,103 L 120,118 L 94,103 L 94,73 Z"
            fill="none"
            stroke="#1E293B"
            strokeWidth="1"
          />
          {/* 25% rim */}
          <Path
            d="M 120,73 L 133,80.5 L 133,95.5 L 120,103 L 107,95.5 L 107,80.5 Z"
            fill="none"
            stroke="#1E293B"
            strokeWidth="1"
          />

          {/* Radial Spokes from center (120, 88) */}
          <Line x1="120" y1="88" x2="120" y2="28" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
          <Line x1="120" y1="88" x2="172" y2="58" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
          <Line x1="120" y1="88" x2="172" y2="118" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
          <Line x1="120" y1="88" x2="120" y2="148" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
          <Line x1="120" y1="88" x2="68" y2="118" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
          <Line x1="120" y1="88" x2="68" y2="58" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />

          {/* User's Muscle Balance Polygon (Tuned values) */}
          <Path
            d="M 120,34 L 165,64 L 156,112 L 120,138 L 82,110 L 80,68 Z"
            fill="url(#radarFillGrad)"
            stroke="#38BDF8"
            strokeWidth="2.2"
          />

          {/* Vertices Dots */}
          <Circle cx="120" cy="34" r="4" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />
          <Circle cx="165" cy="64" r="4" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />
          <Circle cx="156" cy="112" r="4" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />
          <Circle cx="120" cy="138" r="4" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />
          <Circle cx="82" cy="110" r="4" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />
          <Circle cx="80" cy="68" r="4" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />

          {/* Axis Labels */}
          {labels.map((l) => (
            <SvgText
              key={l.text}
              x={l.x}
              y={l.y}
              textAnchor={l.anchor}
              fill="#94A3B8"
              fontSize="9"
              fontWeight="800"
              letterSpacing="0.8"
            >
              {l.text}
            </SvgText>
          ))}
        </Svg>
      </View>
      <View style={styles.radarLegendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#38BDF8' }]} />
          <Text style={styles.legendText}>{t.onboarding.optimalTrainingSplit}</Text>
        </View>
        <Text style={[styles.legendText, { color: '#38BDF8', fontWeight: '800' }]}>{t.onboarding.balancedScore}</Text>
      </View>
    </View>
  );
}

// Prediction Trajectory Graph with Gradient Area
function PredictionTrajectoryGraph() {
  const { t } = useI18n();
  return (
    <View style={styles.trajectoryWrap}>
      <Svg width="310" height="170" viewBox="0 0 310 170">
        <Defs>
          <LinearGradient id="trajGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
            <Stop offset="70%" stopColor="#0284C7" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#090D16" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal reference grid lines */}
        <Line x1="20" y1="40" x2="290" y2="40" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,3" />
        <Line x1="20" y1="85" x2="290" y2="85" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,3" />
        <Line x1="20" y1="130" x2="290" y2="130" stroke="#1E293B" strokeWidth="1" />

        {/* Gradient fill under prediction curve */}
        <Path
          d="M 30,130 C 90,120 150,55 275,35 L 275,130 L 30,130 Z"
          fill="url(#trajGrad)"
        />

        {/* Main Trajectory Curve Line */}
        <Path
          d="M 30,130 C 90,120 150,55 275,35"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Milestone 1: Today */}
        <Line x1="30" y1="130" x2="30" y2="150" stroke="#475569" strokeWidth="1.5" strokeDasharray="2,2" />
        <Circle cx="30" cy="130" r="6" fill="#1E293B" stroke="#94A3B8" strokeWidth="2.5" />

        {/* Milestone 2: Target (Dec 28) */}
        <Line x1="275" y1="35" x2="275" y2="150" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="2,2" />
        <Circle cx="275" cy="35" r="7" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="2.5" />
      </Svg>

      {/* Trajectory Milestone Badges */}
      <View style={styles.graphLabelsRow}>
        <View style={styles.milestoneCol}>
          <Text style={styles.labelMuted}>{t.onboarding.todayLabel}</Text>
          <Text style={styles.milestoneVal}>Bronze III (90kg)</Text>
        </View>
        <View style={[styles.milestoneCol, { alignItems: 'flex-end' }]}>
          <Text style={[styles.labelActive, { color: '#38BDF8' }]}>{t.onboarding.dec28Label}</Text>
          <Text style={[styles.milestoneVal, { color: '#38BDF8', fontWeight: '800' }]}>Silver I (140kg)</Text>
        </View>
      </View>
    </View>
  );
}

// High-fidelity Realistic Equipment SVGs
function EquipmentSvg({ item }: { item: string }) {
  switch (item) {
    case 'Dumbbell':
      return (
        <Svg width="42" height="42" viewBox="0 0 44 44">
          <Defs>
            <LinearGradient id="dbPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#64748B" />
              <Stop offset="100%" stopColor="#1E293B" />
            </LinearGradient>
            <LinearGradient id="dbBarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#E2E8F0" />
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
        <Svg width="42" height="42" viewBox="0 0 44 44">
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
        <Svg width="42" height="42" viewBox="0 0 44 44">
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
        <Svg width="42" height="42" viewBox="0 0 44 44">
          <Circle cx="22" cy="22" r="16" fill="#1E293B" stroke="#475569" strokeWidth="2" />
          <Circle cx="22" cy="22" r="11" fill="none" stroke="#334155" strokeWidth="1.5" />
          <Circle cx="22" cy="22" r="5" fill="#0F172A" stroke="#94A3B8" strokeWidth="2" />
          <Circle cx="22" cy="22" r="2.5" fill="#090D16" />
        </Svg>
      );
    case 'Ez Bar':
      return (
        <Svg width="42" height="42" viewBox="0 0 44 44">
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
        <Svg width="42" height="42" viewBox="0 0 44 44">
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
        <Svg width="42" height="42" viewBox="0 0 44 44">
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

// Full anatomical mannequin contour for cropped regional previews
const MANNEQUIN_SILHOUETTE =
  'M208.5,101.6 Q200.0,102.2 191.5,104.8 Q183.0,107.4 176.2,113.2 Q169.4,119.0 166.8,125.5 Q164.2,132.0 164.5,146.5 Q164.8,161.0 160.5,164.5 Q156.2,168.0 154.6,171.5 Q153.0,175.0 155.2,182.0 Q157.4,189.0 160.7,192.0 Q164.0,194.9 168.9,197.0 Q173.8,199.1 178.4,208.0 Q183.0,217.0 187.7,222.0 Q192.4,227.0 192.4,234.0 Q192.4,241.0 172.2,251.3 Q152.0,261.6 135.5,265.4 Q119.0,269.3 113.5,273.2 Q108.0,277.0 104.7,281.5 Q101.4,286.0 98.2,296.0 Q95.0,306.0 96.3,320.5 Q97.5,335.0 93.3,349.5 Q89.2,364.0 88.5,378.5 Q87.8,393.0 82.5,407.0 Q77.2,421.0 75.4,438.5 Q73.6,456.0 71.2,461.0 Q68.8,465.9 63.9,468.2 Q59.0,470.4 55.1,474.2 Q51.2,478.0 48.0,484.0 Q44.8,490.0 46.9,491.8 Q49.0,493.6 53.0,491.0 Q57.0,488.4 58.0,488.7 Q59.0,489.1 54.2,503.1 Q49.4,517.0 49.8,519.5 Q50.2,521.9 59.1,525.9 Q68.0,529.8 73.4,530.6 Q78.8,531.4 90.8,501.7 Q102.8,472.0 108.2,462.5 Q113.6,453.0 116.7,441.5 Q119.8,430.0 120.6,417.0 Q121.4,404.0 127.2,393.0 Q133.0,382.0 137.5,368.0 Q142.1,354.0 143.4,353.2 Q144.8,352.4 152.4,379.2 Q160.0,406.0 159.9,431.0 Q159.8,456.0 151.5,489.0 Q143.2,522.0 140.6,541.5 Q138.0,561.0 138.0,583.5 Q138.0,606.0 140.8,628.5 Q143.5,651.0 141.2,681.5 Q139.0,712.0 142.5,741.0 Q146.0,770.0 146.0,787.0 Q146.0,804.0 142.5,812.5 Q139.0,821.0 129.7,831.5 Q120.5,842.0 119.6,847.5 Q118.7,853.0 120.8,854.5 Q123.0,856.0 156.5,856.0 Q190.0,856.0 191.9,855.4 Q193.8,854.8 194.7,852.9 Q195.6,851.0 195.2,844.0 Q194.9,837.0 190.5,821.5 Q186.2,806.0 186.1,795.0 Q186.0,784.0 188.2,771.0 Q190.4,758.0 196.6,736.0 Q202.8,714.0 201.4,678.5 Q200.0,643.0 204.5,611.5 Q209.0,580.0 210.0,554.0 Q211.1,528.0 213.0,526.1 Q215.0,524.3 216.5,526.1 Q217.9,528.0 219.5,559.0 Q221.0,590.0 225.0,616.0 Q229.0,642.0 229.0,654.5 Q229.0,667.0 227.0,683.5 Q225.0,700.0 225.5,706.5 Q226.0,713.0 232.3,736.0 Q238.6,759.0 240.8,772.0 Q243.0,785.0 242.9,795.5 Q242.8,806.0 238.5,822.5 Q234.2,839.0 234.3,846.0 Q234.4,853.0 236.7,854.5 Q239.0,856.0 273.0,856.0 Q307.0,855.9 308.8,854.0 Q310.6,852.0 310.0,848.0 Q309.5,844.0 306.7,839.5 Q303.8,835.0 296.8,828.0 Q289.8,821.0 286.7,814.0 Q283.7,807.0 283.2,802.5 Q282.7,798.0 284.3,786.5 Q286.0,775.0 285.2,767.0 Q284.5,759.0 287.3,735.0 Q290.0,711.0 287.6,681.5 Q285.3,652.0 288.1,628.5 Q291.0,605.0 291.0,583.0 Q291.0,561.0 288.4,541.5 Q285.8,522.0 277.5,489.0 Q269.2,456.0 269.1,431.0 Q269.0,406.0 276.6,379.2 Q284.2,352.4 285.7,353.2 Q287.2,354.0 291.3,367.0 Q295.4,380.0 301.5,392.0 Q307.6,404.0 309.5,424.0 Q311.4,444.0 319.0,458.5 Q326.6,473.0 338.4,502.2 Q350.2,531.4 355.6,530.6 Q361.0,529.8 369.9,525.9 Q378.8,521.9 379.2,519.5 Q379.6,517.0 374.8,503.0 Q370.0,489.1 371.0,488.4 Q372.0,487.8 376.5,490.6 Q381.0,493.4 382.6,490.7 Q384.2,488.0 379.0,480.6 Q373.8,473.2 367.0,469.6 Q360.2,465.9 357.8,461.0 Q355.4,456.0 353.6,438.5 Q351.8,421.0 346.5,407.0 Q341.2,393.0 340.5,378.5 Q339.8,364.0 335.5,349.5 Q331.2,335.0 332.6,321.0 Q334.0,307.0 330.8,296.5 Q327.6,286.0 324.3,281.5 Q321.0,277.0 315.5,273.2 Q310.0,269.3 293.5,265.4 Q277.0,261.6 258.0,252.6 Q239.0,243.5 237.6,241.7 Q236.2,240.0 236.4,233.5 Q236.6,227.0 241.3,222.0 Q246.0,217.0 250.2,208.5 Q254.4,200.0 261.2,196.5 Q268.0,193.0 271.9,186.5 Q275.8,180.0 274.7,174.5 Q273.6,169.0 267.4,165.0 Q261.3,161.0 262.1,149.0 Q263.0,137.0 262.1,131.5 Q261.2,126.0 255.6,119.1 Q250.0,112.2 244.0,109.0 Q238.0,105.8 227.5,103.4 Q217.0,101.0 208.5,101.6Z';

// Sensitive Anatomical Graphics with Glowing Red Targets (Screenshot 6)
function SensitiveJointSvg({ id }: { id: string }) {
  let cx = 214;
  let cy = 430;
  let vb = '100 300 230 230';
  let innerAnatomy = null;

  if (id === 'back') {
    vb = '100 300 230 230';
    cx = 214;
    cy = 430;
    innerAnatomy = (
      <>
        <Path d={MANNEQUIN_SILHOUETTE} fill="#141C2A" stroke="#2D3B52" strokeWidth={2.5} />
        <Path d="M166,293 Q144,312 138,348 Q134,386 142,420 Q152,442 165,456 Q178,443 189,428 Q202,392 208,356 Q188,330 166,293 Z" fill="#1C263A" stroke="#2A384E" strokeWidth={1.5} />
        <Path d="M262,293 Q284,312 290,348 Q294,386 286,420 Q276,442 263,456 Q250,443 239,428 Q226,392 220,356 Q240,330 262,293 Z" fill="#1C263A" stroke="#2A384E" strokeWidth={1.5} />
        <Path d="M213,378 Q196,398 186,428 Q174,452 168,485 Q190,498 213,502 Q213,440 213,378 Z" fill="#182132" stroke="#2A384E" strokeWidth={1.5} />
        <Path d="M215,378 Q232,398 242,428 Q254,452 260,485 Q238,498 215,502 Q215,440 215,378 Z" fill="#182132" stroke="#2A384E" strokeWidth={1.5} />
      </>
    );
  } else if (id === 'knees') {
    vb = '110 560 210 210';
    cx = 160;
    cy = 655;
    innerAnatomy = (
      <>
        <Path d={MANNEQUIN_SILHOUETTE} fill="#141C2A" stroke="#2D3B52" strokeWidth={2.5} />
        <Path d="M140.1,604.0 Q143.1,626.5 148.2,656.5 Q150.4,664.0 152.2,665.4 Q154.0,666.8 157.0,664.9 Q159.9,663.0 160.9,660.5 Q161.9,658.0 162.3,655.0 Q162.6,652.0 160.9,644.7 Q159.2,637.5 163.1,642.4 Q167.1,647.3 170.0,646.0 Q173.0,644.7 175.3,641.8 Q177.6,639.0 181.1,627.0 L181.1,660 L145,660 Z" fill="#1C263A" stroke="#2A384E" strokeWidth={1.5} />
        <Path d="M151.5,675.1 Q149.0,674.2 147.5,675.6 Q146.1,677.0 144.6,686.0 Q143.1,695.0 143.0,709.0 Q143.0,723.0 146.0,745.0 L172.6,757.5 L173.0,719.5 Q174.1,711.0 175.2,706.5 Z" fill="#182132" stroke="#2A384E" strokeWidth={1.5} />
      </>
    );
  } else if (id === 'shoulders') {
    vb = '75 185 200 200';
    cx = 120;
    cy = 285;
    innerAnatomy = (
      <>
        <Path d={MANNEQUIN_SILHOUETTE} fill="#141C2A" stroke="#2D3B52" strokeWidth={2.5} />
        <Path d="M169.8,273.0 Q169.8,272.3 165.4,271.2 Q161.0,270.0 154.0,271.0 Q147.0,271.9 145.9,271.0 Q144.8,270.1 146.8,269.3 Q148.8,268.6 148.4,267.7 Q148.0,266.7 142.5,266.9 Q137.0,267.1 129.0,269.7 Q121.0,272.4 116.0,275.7 Q111.0,279.1 106.2,285.5 Q101.4,292.0 99.7,299.5 Q98.0,307.0 98.5,318.5 Q99.1,330.0 100.5,330.7 Q101.9,331.5 111.0,328.1 Q120.0,324.7 123.0,322.8 Q126.0,320.9 129.3,317.5 Q132.7,314.0 142.5,300.0 Q152.3,286.1 155.7,283.1 Q159.0,280.1 164.4,276.9 Q169.8,273.7 169.8,273.0Z" fill="#1C263A" stroke="#2A384E" strokeWidth={1.5} />
        <Path d="M142.6,306.0 Q133.1,321.0 133.6,322.5 Q134.1,323.9 137.0,325.3 Q140.0,326.7 151.0,327.9 Q162.0,329.1 185.5,334.3 Q209.0,339.6 210.5,335.3 Q212.0,331.0 212.0,313.0 Q212.0,295.0 211.1,290.0 Q210.2,285.0 207.6,281.7 Q205.0,278.3 199.0,276.2 Q193.0,274.1 185.5,274.1 Q178.0,274.1 172.5,276.2 Q167.0,278.4 159.5,284.7 Q152.1,291.0 142.6,306.0Z" fill="#182132" stroke="#2A384E" strokeWidth={1.2} />
      </>
    );
  } else {
    // wrist
    vb = '40 370 160 160';
    cx = 78;
    cy = 460;
    innerAnatomy = (
      <>
        <Path d={MANNEQUIN_SILHOUETTE} fill="#141C2A" stroke="#2D3B52" strokeWidth={2.5} />
        <Path d="M93.1,402.1 Q91.0,400.2 87.7,403.6 Q84.4,407.0 81.9,414.5 Q79.3,422.0 78.2,430.5 Q77.1,439.0 77.0,447.0 Q76.9,455.0 75.7,461.0 Q74.4,467.0 75.7,468.8 Q77.0,470.6 79.0,470.3 Q81.0,469.9 82.8,468.0 Q84.7,466.0 87.5,460.1 L115.3,438.0 Q117.0,431.0 117.0,421.0 Z" fill="#1C263A" stroke="#2A384E" strokeWidth={1.5} />
      </>
    );
  }

  return (
    <Svg width="68" height="68" viewBox={vb}>
      {innerAnatomy}
      <Circle cx={cx} cy={cy} r="38" fill="none" stroke="#EF4444" strokeWidth="3" opacity={0.35} />
      <Circle cx={cx} cy={cy} r="24" fill="none" stroke="#EF4444" strokeWidth="4" opacity={0.75} />
      <Circle cx={cx} cy={cy} r="12" fill="#EF4444" />
      <Circle cx={cx} cy={cy} r="4" fill="#FFFFFF" />
    </Svg>
  );
}

// Crop exact mannequin vector paths from DualMannequin reference model with full silhouette context
function MuscleCategorySvg({ muscleId, color = BLUE_THEME.primary }: { muscleId: string; color?: string }) {
  const idleColor = '#192233';
  const idleStroke = '#2A364F';
  const activeStroke = '#FFFFFF';

  if (muscleId === 'Chest') {
    return (
      <Svg width="48" height="48" viewBox="90 190 238 215">
        {/* Full Anatomical Silhouette */}
        <Path d={MANNEQUIN_SILHOUETTE} fill="#131926" stroke="#2D3B52" strokeWidth={2.5} />
        {/* Head & Neck */}
        <Path d="M163,138 C159,124 165,111 180,105 C194,98 214,100 227,103 C246,108 259,119 263,138 L262,149 C245,138 235,134 217,134 L191,134 C179,133 171,138 165,147 Z" fill="#1C263A" />
        <Path d="M188,214 L188,248 Q214,256 240,248 L240,214 Z" fill="#161F2E" stroke="#253246" strokeWidth={1.2} />
        {/* Deltoids in idle context */}
        <Path d="M169.8,273.0 Q169.8,272.3 165.4,271.2 Q161.0,270.0 154.0,271.0 Q147.0,271.9 145.9,271.0 Q144.8,270.1 146.8,269.3 Q148.8,268.6 148.4,267.7 Q148.0,266.7 142.5,266.9 Q137.0,267.1 129.0,269.7 Q121.0,272.4 116.0,275.7 Q111.0,279.1 106.2,285.5 Q101.4,292.0 99.7,299.5 Q98.0,307.0 98.5,318.5 Q99.1,330.0 100.5,330.7 Q101.9,331.5 111.0,328.1 Q120.0,324.7 123.0,322.8 Q126.0,320.9 129.3,317.5 Q132.7,314.0 142.5,300.0 Q152.3,286.1 155.7,283.1 Q159.0,280.1 164.4,276.9 Q169.8,273.7 169.8,273.0Z" fill={idleColor} stroke={idleStroke} strokeWidth={1.2} />
        <Path d="M327.3,299.5 Q324.6,289.0 321.8,285.5 Q319.0,282.0 310.5,276.2 Q302.0,270.3 296.0,268.7 Q290.0,267.1 284.6,267.2 Q279.2,267.4 279.2,268.0 Q279.2,268.6 281.5,269.3 Q283.8,270.1 283.4,271.2 Q283.0,272.3 278.0,271.1 Q273.0,270.0 266.5,270.7 Q260.0,271.3 258.9,272.2 Q257.8,273.0 259.3,274.5 Q260.8,276.0 260.4,276.9 Q260.0,277.8 255.5,276.0 Q251.0,274.1 243.0,274.0 Q255.5,276.0 260.0,277.8 Q264.0,277.3 269.5,281.3 Q275.0,285.3 279.3,291.1 Q283.7,297.0 283.7,300.9 Q284.1,299.8 289.9,305.9 Q295.7,312.0 298.9,316.8 Q302.1,321.7 314.5,326.6 Q326.9,331.5 328.4,327.3 Q329.9,323.0 330.0,316.5 Q330.0,310.0 327.3,299.5Z" fill={idleColor} stroke={idleStroke} strokeWidth={1.2} />
        {/* Active Pectorals */}
        <Path d="M142.6,306.0 Q133.1,321.0 133.6,322.5 Q134.1,323.9 137.0,325.3 Q140.0,326.7 151.0,327.9 Q162.0,329.1 185.5,334.3 Q209.0,339.6 210.5,335.3 Q212.0,331.0 212.0,313.0 Q212.0,295.0 211.1,290.0 Q210.2,285.0 207.6,281.7 Q205.0,278.3 199.0,276.2 Q193.0,274.1 185.5,274.1 Q178.0,274.1 172.5,276.2 Q167.0,278.4 159.5,284.7 Q152.1,291.0 142.6,306.0Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M243.0,274.0 Q235.0,274.0 229.0,276.2 Q223.0,278.4 220.7,280.2 Q218.4,282.0 217.2,286.0 Q216.1,290.0 215.5,306.0 Q215.0,322.0 215.7,329.5 Q216.4,337.0 217.7,338.3 Q219.0,339.6 221.0,339.8 Q223.0,339.9 234.0,336.5 Q245.0,333.1 266.0,329.8 Q287.0,326.6 289.0,324.8 Q290.9,323.0 289.9,320.5 Q288.8,318.0 289.7,316.0 Q290.6,314.0 287.0,308.0 Q283.4,302.0 283.7,300.9 Q279.3,291.1 275.0,285.3 Q269.5,281.3 264.0,277.3 Q260.0,277.8 255.5,276.0 Q251.0,274.1 243.0,274.0Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M138.3,347.0 Q138.9,340.0 137.5,336.2 Q136.2,332.4 137.5,332.7 Q138.9,333.1 141.6,337.0 Q144.2,341.0 149.2,354.0 Q154.1,367.0 157.5,369.6 Q161.0,372.2 166.0,373.6 Q171.0,374.9 180.0,375.4 Q189.0,375.9 195.0,373.8 Q201.0,371.6 203.0,370.1 Q205.0,368.7 208.0,363.8 Q210.9,359.0 210.8,352.0 Q210.6,345.0 204.8,342.5 Q199.0,340.1 186.0,337.1 Q173.0,334.1 169.0,334.0 Q165.0,333.9 153.0,331.5 Q141.0,329.1 138.5,329.6 Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M288.0,329.1 L268.0,332.2 Q248.0,335.3 235.0,338.8 Q222.0,342.3 219.4,344.2 Q216.8,346.0 216.4,351.0 Q216.1,356.0 218.2,361.5 Q220.4,367.0 224.7,369.8 Q229.0,372.6 234.5,374.3 Q240.0,376.0 245.0,376.0 Q250.0,375.9 256.0,374.5 Q262.0,373.0 264.6,373.5 L269.7,374.0 Q267.8,372.9 272.2,367.0 Q276.6,361.0 279.5,351.5 Q282.4,342.0 286.2,337.0 Q290.0,332.1 290.8,332.6 L288.0,329.1 Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
      </Svg>
    );
  }

  if (muscleId === 'Back') {
    return (
      <Svg width="48" height="48" viewBox="85 190 250 310">
        {/* Full Posterior Silhouette */}
        <Path d={MANNEQUIN_SILHOUETTE} fill="#131926" stroke="#2D3B52" strokeWidth={2.5} />
        {/* Head & Hair */}
        <Path d="M165,116 C163,148 163,185 186,215 C200,222 228,222 242,215 C265,185 265,148 263,116 C250,103 178,103 165,116 Z" fill="#1C263A" stroke="#253246" strokeWidth={1.2} />
        <Path d="M188,214 L188,248 Q214,256 240,248 L240,214 Z" fill="#161F2E" stroke="#253246" strokeWidth={1} />
        {/* Shoulders Back idle */}
        <Path d="M150,269 Q134,271 121,277 Q109,285 101,299 Q97,314 99,328 Q111,327 122,321 Q132,313 141,298 Q148,286 150,269 Z" fill={idleColor} stroke={idleStroke} strokeWidth={1.2} />
        <Path d="M278,269 Q294,271 307,277 Q319,285 327,299 Q331,314 329,328 Q317,327 306,321 Q296,313 287,298 Q280,286 278,269 Z" fill={idleColor} stroke={idleStroke} strokeWidth={1.2} />
        {/* Active Traps & Lats */}
        <Path d="M213.5,246 Q194,248 180,252 Q164,258 152,268 Q162,279 170,287 Q188,272 213.5,270 Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M214.5,246 Q234,248 248,252 Q264,258 276,268 Q266,279 258,287 Q240,272 214.5,270 Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M214,272 Q186,274 169,290 Q180,318 200,342 Q210,358 213.5,372 Q214,372 214.5,372 Q218,358 228,342 Q248,318 259,290 Q242,274 214,272 Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M166,293 Q144,312 138,348 Q134,386 142,420 Q152,442 165,456 Q178,443 189,428 Q202,392 208,356 Q188,330 166,293 Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M262,293 Q284,312 290,348 Q294,386 286,420 Q276,442 263,456 Q250,443 239,428 Q226,392 220,356 Q240,330 262,293 Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M213,378 Q196,398 186,428 Q174,452 168,485 Q190,498 213,502 Q213,440 213,378 Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M215,378 Q232,398 242,428 Q254,452 260,485 Q238,498 215,502 Q215,440 215,378 Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
      </Svg>
    );
  }

  if (muscleId === 'Legs') {
    return (
      <Svg width="48" height="48" viewBox="110 470 205 385">
        {/* Lower Body Silhouette */}
        <Path d={MANNEQUIN_SILHOUETTE} fill="#131926" stroke="#2D3B52" strokeWidth={2.5} />
        {/* Active Quads */}
        <Path d="M179.3,484.7 Q177.9,481.5 175.2,485.2 Q172.4,489.0 162.9,507.5 Q153.4,526.0 151.4,531.0 Q149.3,536.0 148.2,541.5 Q147.1,547.0 146.6,563.5 Q146.1,580.0 147.6,591.0 Q149.1,602.0 151.5,610.5 Q153.9,619.0 153.4,620.6 Q152.9,622.2 151.1,619.1 Q149.3,616.0 148.2,611.0 Q147.1,606.0 145.0,588.5 Q143.0,571.0 143.5,563.0 Q143.9,555.0 143.4,554.3 Q142.9,553.5 142.0,554.3 Q141.1,555.0 140.6,579.5 Q140.1,604.0 143.1,626.5 Q146.1,649.0 148.2,656.5 Q150.4,664.0 152.2,665.4 Q154.0,666.8 157.0,664.9 Q159.9,663.0 160.9,660.5 Q161.9,658.0 162.3,655.0 Q162.6,652.0 160.9,644.7 Q159.2,637.5 163.1,642.4 Q167.1,647.3 170.0,646.0 Q173.0,644.7 175.3,641.8 Q177.6,639.0 181.1,627.0 Q184.7,615.0 186.8,604.0 Q188.9,593.0 190.0,582.0 Q191.0,571.0 190.5,555.0 Q189.9,539.0 185.3,513.5 Q180.7,488.0 179.3,484.7Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M251.3,483.1 Q250.0,482.2 248.7,484.1 Q247.3,486.0 243.7,503.5 Q240.1,521.0 238.1,536.0 Q236.1,551.0 236.0,561.5 Q235.9,572.0 235.5,572.6 Q235.0,573.2 234.5,572.6 Q234.1,572.0 233.5,565.9 Q233.0,559.8 230.7,563.9 Q228.3,568.0 226.2,574.5 Q224.1,581.0 224.6,596.5 Q225.1,612.0 229.7,635.0 Q234.4,657.9 236.7,659.3 Q239.0,660.7 242.0,660.6 Q245.0,660.6 246.8,658.3 Q248.7,656.0 249.3,651.5 Q249.9,647.0 244.5,630.0 Q239.1,613.0 237.1,599.0 Q235.1,585.0 235.5,579.4 Q236.0,573.8 238.0,588.9 Q240.1,604.0 244.7,620.5 Q249.3,637.0 251.2,640.5 Q253.1,644.0 255.0,645.5 Q257.0,646.9 259.0,646.8 Q261.0,646.6 264.3,642.9 Q267.6,639.2 266.3,647.6 Q265.1,656.0 266.7,660.0 Q268.4,664.0 270.7,665.4 Q273.0,666.8 275.3,664.9 Q277.6,663.0 278.6,660.0 Q279.7,657.0 283.3,634.5 Q286.9,612.0 287.5,598.0 Q288.0,584.0 287.0,567.0 Q285.9,550.0 285.5,549.4 Q285.0,548.8 284.5,549.4 Q284.1,550.0 284.0,565.5 Q284.0,581.0 282.5,592.5 Q280.9,604.0 278.5,610.6 Q276.0,617.2 275.5,615.6 Q275.1,614.0 277.5,603.5 Q279.9,593.0 280.9,584.5 Q281.9,576.0 281.4,562.0 Q280.9,548.0 277.8,537.5 Q274.6,527.0 263.6,505.5 Q252.6,484.0 251.3,483.1Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M193.3,502.4 Q186.0,491.8 185.5,493.4 Q185.1,495.0 186.5,499.0 Q187.9,503.0 190.4,518.0 Q192.9,533.0 193.5,541.0 Q194.1,549.0 195.5,553.0 Q196.9,557.0 195.5,559.5 Q194.1,562.0 193.0,576.0 Q191.9,590.0 189.9,603.0 Q187.9,616.0 183.0,630.5 Q178.1,645.0 178.2,650.5 Q178.4,656.0 180.2,657.8 Q182.0,659.7 184.5,660.3 Q187.0,661.0 189.3,660.0 Q191.7,658.9 193.2,656.0 Q194.7,653.0 198.8,630.5 Q202.9,608.0 203.5,596.0 Q204.0,584.0 202.7,578.5 Q201.4,573.0 202.2,572.6 Q202.9,572.2 204.0,573.7 Q205.0,575.2 205.5,574.6 Q205.9,574.0 207.0,551.0 Q208.0,528.0 204.3,520.5 Q200.7,513.0 193.3,502.4Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M241.6,493.9 Q241.0,492.8 234.7,501.9 Q228.4,511.0 224.2,519.0 Q220.1,527.0 220.0,543.0 Q220.0,559.0 220.5,564.5 Q221.1,570.0 222.1,571.6 Q223.1,573.2 228.0,561.6 Q232.9,550.0 234.0,538.5 Q235.1,527.0 238.6,511.0 Q242.2,495.0 241.6,493.9Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        {/* Calves */}
        <Path d="M151.5,675.1 Q149.0,674.2 147.5,675.6 Q146.1,677.0 144.6,686.0 Q143.1,695.0 143.0,709.0 Q143.0,723.0 146.0,745.0 Q148.9,767.0 149.5,785.5 Q150.1,804.0 151.5,805.8 Q152.9,807.5 154.9,804.3 Q156.9,801.0 160.9,784.0 Q164.9,767.0 165.5,734.0 Q166.0,701.0 163.3,692.0 Q160.7,683.0 157.3,679.5 Q154.0,676.1 151.5,675.1Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M235.5,677.8 Q233.1,676.5 231.1,681.7 Q229.1,687.0 229.6,702.5 Q230.1,718.0 232.1,727.0 Q234.1,736.0 236.9,743.0 Q239.7,750.0 241.8,758.5 Q243.9,767.0 245.5,785.0 Q247.1,803.0 248.0,803.7 Q248.9,804.5 250.9,798.8 Q252.9,793.0 254.0,786.0 Q255.0,779.0 254.5,747.5 Q253.9,716.0 253.3,711.5 Q252.6,707.0 249.1,698.5 Q245.6,690.1 241.8,684.6 Q237.9,679.1 235.5,677.8Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M279.3,675.1 Q278.0,674.2 276.0,674.8 Q274.1,675.4 271.2,678.2 Q268.4,681.0 265.9,686.5 Q263.3,692.0 262.2,698.0 Q261.0,704.0 262.0,736.0 Q263.1,768.0 266.6,783.5 Q270.1,799.0 272.5,803.3 Q275.0,807.5 276.1,806.7 Q277.3,806.0 278.2,784.5 Q279.1,763.0 280.0,759.5 Q280.9,756.0 282.0,741.5 Q283.1,727.0 284.0,724.5 Q285.0,722.0 285.0,712.0 Q285.0,702.0 284.0,693.0 Q282.9,684.0 281.8,680.0 Q280.6,676.0 279.3,675.1Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
      </Svg>
    );
  }

  if (muscleId === 'Shoulders') {
    return (
      <Svg width="48" height="48" viewBox="85 160 255 190">
        {/* Upper Body Silhouette */}
        <Path d={MANNEQUIN_SILHOUETTE} fill="#131926" stroke="#2D3B52" strokeWidth={2.5} />
        {/* Head & Neck */}
        <Path d="M163,138 C159,124 165,111 180,105 C194,98 214,100 227,103 C246,108 259,119 263,138 L262,149 C245,138 235,134 217,134 L191,134 C179,133 171,138 165,147 Z" fill="#1C263A" />
        <Path d="M188,214 L188,248 Q214,256 240,248 L240,214 Z" fill="#161F2E" stroke="#253246" strokeWidth={1.2} />
        {/* Chest in idle context */}
        <Path d="M142.6,306.0 Q133.1,321.0 133.6,322.5 Q134.1,323.9 137.0,325.3 Q140.0,326.7 151.0,327.9 Q162.0,329.1 185.5,334.3 Q209.0,339.6 210.5,335.3 Q212.0,331.0 212.0,313.0 Q212.0,295.0 211.1,290.0 Q210.2,285.0 207.6,281.7 Q205.0,278.3 199.0,276.2 Q193.0,274.1 185.5,274.1 Q178.0,274.1 172.5,276.2 Q167.0,278.4 159.5,284.7 Q152.1,291.0 142.6,306.0Z" fill={idleColor} stroke={idleStroke} strokeWidth={1.2} />
        <Path d="M243.0,274.0 Q235.0,274.0 229.0,276.2 Q223.0,278.4 220.7,280.2 Q218.4,282.0 217.2,286.0 Q216.1,290.0 215.5,306.0 Q215.0,322.0 215.7,329.5 Q216.4,337.0 217.7,338.3 Q219.0,339.6 221.0,339.8 Q223.0,339.9 234.0,336.5 Q245.0,333.1 266.0,329.8 Q287.0,326.6 289.0,324.8 Q290.9,323.0 289.9,320.5 Q288.8,318.0 289.7,316.0 Q290.6,314.0 287.0,308.0 Q283.4,302.0 283.7,300.9 Q279.3,291.1 275.0,285.3 Q269.5,281.3 264.0,277.3 Q260.0,277.8 255.5,276.0 Q251.0,274.1 243.0,274.0Z" fill={idleColor} stroke={idleStroke} strokeWidth={1.2} />
        {/* Active Shoulders */}
        <Path d="M169.8,273.0 Q169.8,272.3 165.4,271.2 Q161.0,270.0 154.0,271.0 Q147.0,271.9 145.9,271.0 Q144.8,270.1 146.8,269.3 Q148.8,268.6 148.4,267.7 Q148.0,266.7 142.5,266.9 Q137.0,267.1 129.0,269.7 Q121.0,272.4 116.0,275.7 Q111.0,279.1 106.2,285.5 Q101.4,292.0 99.7,299.5 Q98.0,307.0 98.5,318.5 Q99.1,330.0 100.5,330.7 Q101.9,331.5 111.0,328.1 Q120.0,324.7 123.0,322.8 Q126.0,320.9 129.3,317.5 Q132.7,314.0 142.5,300.0 Q152.3,286.1 155.7,283.1 Q159.0,280.1 164.4,276.9 Q169.8,273.7 169.8,273.0Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
        <Path d="M327.3,299.5 Q324.6,289.0 321.8,285.5 Q319.0,282.0 310.5,276.2 Q302.0,270.3 296.0,268.7 Q290.0,267.1 284.6,267.2 Q279.2,267.4 279.2,268.0 Q279.2,268.6 281.5,269.3 Q283.8,270.1 283.4,271.2 Q283.0,272.3 278.0,271.1 Q273.0,270.0 266.5,270.7 Q260.0,271.3 258.9,272.2 Q257.8,273.0 259.3,274.5 Q260.8,276.0 260.4,276.9 Q260.0,277.8 255.5,276.0 Q251.0,274.1 243.0,274.0 Q255.5,276.0 260.0,277.8 Q264.0,277.3 269.5,281.3 Q275.0,285.3 279.3,291.1 Q283.7,297.0 283.7,300.9 Q284.1,299.8 289.9,305.9 Q295.7,312.0 298.9,316.8 Q302.1,321.7 314.5,326.6 Q326.9,331.5 328.4,327.3 Q329.9,323.0 330.0,316.5 Q330.0,310.0 327.3,299.5Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
      </Svg>
    );
  }

  // Arms
  return (
    <Svg width="48" height="48" viewBox="45 250 335 240">
      {/* Full Silhouette */}
      <Path d={MANNEQUIN_SILHOUETTE} fill="#131926" stroke="#2D3B52" strokeWidth={2.5} />
      {/* Torso context idle */}
      <Path d="M142.6,306.0 Q133.1,321.0 133.6,322.5 Q134.1,323.9 137.0,325.3 Q140.0,326.7 151.0,327.9 Q162.0,329.1 185.5,334.3 Q209.0,339.6 210.5,335.3 Q212.0,331.0 212.0,313.0 Q212.0,295.0 211.1,290.0 Q210.2,285.0 207.6,281.7 Q205.0,278.3 199.0,276.2 Q193.0,274.1 185.5,274.1 Q178.0,274.1 172.5,276.2 Q167.0,278.4 159.5,284.7 Q152.1,291.0 142.6,306.0Z" fill={idleColor} stroke={idleStroke} strokeWidth={1.2} />
      <Path d="M243.0,274.0 Q235.0,274.0 229.0,276.2 Q223.0,278.4 220.7,280.2 Q218.4,282.0 217.2,286.0 Q216.1,290.0 215.5,306.0 Q215.0,322.0 215.7,329.5 Q216.4,337.0 217.7,338.3 Q219.0,339.6 221.0,339.8 Q223.0,339.9 234.0,336.5 Q245.0,333.1 266.0,329.8 Q287.0,326.6 289.0,324.8 Q290.9,323.0 289.9,320.5 Q288.8,318.0 289.7,316.0 Q290.6,314.0 287.0,308.0 Q283.4,302.0 283.7,300.9 Q279.3,291.1 275.0,285.3 Q269.5,281.3 264.0,277.3 Q260.0,277.8 255.5,276.0 Q251.0,274.1 243.0,274.0Z" fill={idleColor} stroke={idleStroke} strokeWidth={1.2} />
      {/* Active Arms (Biceps & Forearms) */}
      <Path d="M90.2,383.5 Q90.3,391.0 92.3,395.0 Q94.3,398.9 96.2,400.3 Q98.0,401.6 99.5,401.6 Q100.9,401.6 102.5,400.2 Q104.0,398.8 106.5,401.8 Q109.0,404.8 112.0,404.2 Q115.0,403.6 117.0,401.8 Q118.9,400.0 123.3,392.5 Q127.6,385.0 132.6,369.5 Q137.7,354.0 138.3,347.0 L138.5,329.6 Q136.0,330.2 133.5,328.3 Q131.0,326.5 129.5,327.3 Q128.1,328.0 126.0,331.1 Q124.0,334.2 124.3,331.1 Q124.6,328.1 122.8,327.7 Q121.0,327.3 112.5,331.2 Q104.0,335.1 100.7,339.5 Q97.4,344.0 94.7,352.0 Q92.1,360.0 91.0,368.0 Q90.0,376.0 90.2,383.5Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
      <Path d="M325.9,338.7 Q322.0,334.4 314.5,331.4 Q307.0,328.3 303.5,328.4 Q300.1,328.5 298.5,327.5 Q297.0,326.5 295.0,328.0 Q293.0,329.5 290.5,329.3 Q288.0,329.1 290.8,332.6 Q291.5,333.0 290.0,336.5 Q288.4,340.0 288.7,344.5 Q289.1,349.0 292.7,362.5 Q296.3,376.0 302.4,388.0 Q308.4,400.0 310.7,401.8 Q313.0,403.6 316.5,404.1 Q319.9,404.6 321.1,402.8 Q322.3,401.0 322.6,398.4 Q323.0,395.8 325.0,398.7 Q327.1,401.6 330.0,401.0 Q332.8,400.5 331.5,405.2 Q330.1,410.0 329.9,416.0 Q329.6,422.0 331.4,432.5 Q333.1,443.0 338.7,455.5 Q344.3,468.0 346.2,469.5 Q348.0,470.9 350.3,470.0 Q352.6,469.0 351.3,460.5 Q350.1,452.0 350.0,441.5 Q349.9,431.0 348.3,423.5 Q346.7,416.0 344.1,410.0 Q341.6,404.1 338.0,401.5 Q334.5,398.9 335.7,395.0 Q337.0,391.0 336.5,376.5 Q335.9,362.0 332.8,352.5 Q329.8,343.0 325.9,338.7Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
      <Path d="M93.1,402.1 Q91.0,400.2 87.7,403.6 Q84.4,407.0 81.9,414.5 Q79.3,422.0 78.2,430.5 Q77.1,439.0 77.0,447.0 Q76.9,455.0 75.7,461.0 Q74.4,467.0 75.7,468.8 Q77.0,470.6 79.0,470.3 Q81.0,469.9 82.8,468.0 Q84.7,466.0 87.5,460.1 Q90.4,454.2 91.0,454.2 Q91.6,454.2 91.6,456.1 Q91.6,458.0 88.3,465.0 Q85.1,472.0 85.6,473.5 Q86.1,474.9 87.5,475.4 Q89.0,476.0 91.0,475.3 Q93.0,474.7 96.0,471.8 Q99.0,469.0 102.8,463.5 Q106.6,458.0 107.0,456.0 Q107.4,454.0 110.5,449.5 Q113.7,445.0 115.3,438.0 Q117.0,431.0 117.0,421.0 Q116.9,411.0 115.5,409.7 Q114.1,408.5 111.5,412.7 Q108.9,417.0 105.6,420.5 Q102.3,424.0 100.0,432.0 Q97.6,440.0 96.5,440.4 Q95.4,440.8 96.7,427.9 Q97.9,415.0 96.6,409.5 Q95.2,404.0 93.1,402.1Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
      <Path d="M319.4,417.7 Q312.1,408.5 311.0,412.2 Q310.0,416.0 310.5,424.5 Q311.1,433.0 313.7,441.5 Q316.3,450.0 322.8,460.5 Q329.3,470.9 332.7,473.3 Q336.0,475.7 338.5,475.6 Q340.9,475.6 341.8,473.8 Q342.6,472.0 337.0,458.5 Q331.3,445.0 329.0,436.0 Q326.7,427.0 319.4,417.7Z" fill={color} stroke={activeStroke} strokeWidth={1.8} />
    </Svg>
  );
}

const TOTAL_STEPS = 28;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { hydrated, hasOnboarded, completeOnboarding, setProStatus } = useAppState();
  const { t } = useI18n();

  const [step, setStep] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isHoldingCommit, setIsHoldingCommit] = useState(false);
  const [routinePrepProgress, setRoutinePrepProgress] = useState(15);

  const [profile, setProfile] = useState<Profile>({
    name: '',
    unit: 'Metric',
    weight: 68,
    height: 170,
    thinkAboutFitness: 'Often',
    achieveMotivations: ['Health & Wellness', 'Build Discipline'],
    goal: 'Build Muscle',
    sensitiveJoints: [],
    experience: 'Regularly',
    hasRoutine: false,
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
    prSquat: 85,
    goalWeight: 75,
    goalWeeks: 4,
    streakCommitment: 30,
    notificationsEnabled: true,
    isPro: false,
  });

  useEffect(() => {
    if (hydrated && hasOnboarded) router.replace('/(tabs)');
  }, [hydrated, hasOnboarded]);

  // Loading animation for Step 21 (Preparing your routine)
  useEffect(() => {
    if (step === 21) {
      const interval = setInterval(() => {
        setRoutinePrepProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setStep(22), 600);
            return 100;
          }
          return prev + 17;
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [step]);

  if (!hydrated || hasOnboarded) {
    return <View style={[styles.loading, { backgroundColor: BLUE_THEME.bgDark }]} />;
  }

  const next = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS) {
      setStep((curr) => curr + 1);
    } else {
      setShowPaywall(true);
    }
  };

  const back = () => {
    if (step > 0) {
      void Haptics.selectionAsync();
      setStep((curr) => curr - 1);
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

  const toggleLastMuscle = (m: string) => {
    void Haptics.selectionAsync();
    setProfile((prev) => ({
      ...prev,
      lastMusclesWorked: prev.lastMusclesWorked.includes(m)
        ? prev.lastMusclesWorked.filter((item) => item !== m)
        : [...prev.lastMusclesWorked, m],
    }));
  };

  const toggleMotivation = (m: string) => {
    void Haptics.selectionAsync();
    setProfile((prev) => ({
      ...prev,
      achieveMotivations: prev.achieveMotivations.includes(m)
        ? prev.achieveMotivations.filter((item) => item !== m)
        : [...prev.achieveMotivations, m],
    }));
  };

  const toggleSensitive = (item: string) => {
    void Haptics.selectionAsync();
    setProfile((prev) => ({
      ...prev,
      sensitiveJoints: prev.sensitiveJoints.includes(item)
        ? prev.sensitiveJoints.filter((s) => s !== item)
        : [...prev.sensitiveJoints, item],
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

  const handleFinishOnboarding = (isPro = false) => {
    setProStatus(isPro);
    completeOnboarding({ ...profile, isPro });
    router.replace('/(tabs)/workout');
  };

  const progressRatio = Math.min(Math.max(step / TOTAL_STEPS, 0.04), 1);

  // Determine button label for current step
  const isSkipStep =
    (step === 5 && profile.sensitiveJoints.length === 0) ||
    (step === 9 && profile.lastMusclesWorked.length === 0);

  const buttonText =
    step === TOTAL_STEPS
      ? t.onboarding.claimOffer
      : step === 22
      ? t.onboarding.confirmRoutine
      : step === 25
      ? t.onboarding.enableNotifications
      : isSkipStep
      ? t.onboarding.skip
      : t.onboarding.continue;

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
      {/* Top Header Row with Back Button & Progress Indicator */}
      <View style={styles.navHeader}>
        {step > 0 && step !== 21 && step !== 27 ? (
          <Pressable onPress={back} style={styles.backButton} hitSlop={12}>
            <Feather name="chevron-left" size={24} color={BLUE_THEME.white} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        {step !== 21 && step !== 27 ? (
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
            </View>
            <Text style={styles.stepCounterText}>
              {step + 1}/{TOTAL_STEPS + 1}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {step !== 21 && step !== 27 ? (
          <Pressable
            onPress={() => handleFinishOnboarding(false)}
            style={styles.skipHeaderBtn}
            hitSlop={10}
          >
            <Text style={styles.skipHeaderText}>Bỏ qua</Text>
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
        {/* ================= STEP 0: What is your name? ================= */}
        {step === 0 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.nameTitle}</Text>
            <TextInput
              style={styles.nameInput}
              placeholder={t.onboarding.namePlaceholder}
              placeholderTextColor="#475569"
              value={profile.name}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
              autoFocus
              returnKeyType="done"
            />
          </View>
        ) : /* ================= STEP 1: Unit Preference ================= */
        step === 1 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.unitTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.unitSubtitle}</Text>
            <View style={styles.optionsList}>
              {[
                { id: 'Imperial', label: t.onboarding.imperialLabel },
                { id: 'Metric', label: t.onboarding.metricLabel },
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
                    <Text style={styles.optionLabel}>{u.label}</Text>
                    <View style={[styles.radioCircle, selected && { backgroundColor: BLUE_THEME.primary, borderColor: BLUE_THEME.white }]} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 2: Weight Ruler ================= */
        step === 2 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <Text style={styles.mainTitle}>{t.onboarding.weightTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.weightSubtitle}</Text>

            <View style={styles.rulerValueWrap}>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setProfile((p) => ({ ...p, weight: Math.max(30, Number((p.weight - 0.5).toFixed(1))) }));
                }}
                style={styles.adjustStepBtn}
                hitSlop={10}
              >
                <Feather name="minus" size={20} color={BLUE_THEME.primary} />
              </Pressable>

              <View style={styles.rulerInputBox}>
                <TextInput
                  style={styles.rulerLargeValInput}
                  value={String(profile.weight)}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    const val = parseFloat(cleaned);
                    if (!isNaN(val)) {
                      setProfile((p) => ({ ...p, weight: val }));
                    } else if (cleaned === '') {
                      setProfile((p) => ({ ...p, weight: 0 }));
                    }
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <Text style={styles.rulerUnit}>{profile.unit === 'Metric' ? t.common.kg : t.common.lbs}</Text>
              </View>

              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setProfile((p) => ({ ...p, weight: Math.min(250, Number((p.weight + 0.5).toFixed(1))) }));
                }}
                style={styles.adjustStepBtn}
                hitSlop={10}
              >
                <Feather name="plus" size={20} color={BLUE_THEME.primary} />
              </Pressable>
            </View>

            <View style={styles.rulerPresetsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rulerMarksScroll}>
                {[45, 50, 55, 60, 65, 68, 70, 75, 80, 85, 90, 95, 100].map((w) => (
                  <Pressable
                    key={w}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, weight: w });
                    }}
                    style={[styles.rulerChip, w === profile.weight && styles.rulerChipActive]}
                  >
                    <Text style={[styles.rulerChipText, w === profile.weight && styles.rulerChipTextActive]}>
                      {w}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : /* ================= STEP 3: Height Wheel ================= */
        step === 3 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <Text style={styles.mainTitle}>{t.onboarding.heightTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.heightSubtitle}</Text>

            <View style={styles.heightWheelWrap}>
              <Pressable onPress={() => setProfile({ ...profile, height: profile.height - 1 })}>
                <Text style={styles.wheelMuted}>{profile.height - 1}</Text>
              </Pressable>
              <View style={styles.heightActiveRow}>
                <Text style={styles.wheelActiveVal}>{profile.height}</Text>
                <Text style={styles.wheelActiveUnit}>{profile.unit === 'Metric' ? 'cm' : 'in'}</Text>
              </View>
              <Pressable onPress={() => setProfile({ ...profile, height: profile.height + 1 })}>
                <Text style={styles.wheelMuted}>{profile.height + 1}</Text>
              </Pressable>
            </View>
          </View>
        ) : /* ================= STEP 4: How often think about getting in shape? ================= */
        step === 4 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.thinkFitnessTitle}</Text>
            <View style={styles.optionsList}>
              {[
                { id: 'Never', label: t.onboarding.thinkNever },
                { id: 'Sometimes', label: t.onboarding.thinkSometimes },
                { id: 'Often', label: t.onboarding.thinkOften },
                { id: 'All The Time', label: t.onboarding.thinkAllTheTime },
              ].map((item) => {
                const selected = profile.thinkAboutFitness === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, thinkAboutFitness: item.id });
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
                      <View style={styles.hamburgerBars}>
                        <View style={[styles.hBar, selected && { backgroundColor: BLUE_THEME.primary }]} />
                        <View style={[styles.hBar, selected && { backgroundColor: BLUE_THEME.primary }]} />
                        <View style={[styles.hBar, selected && { backgroundColor: BLUE_THEME.primary }]} />
                      </View>
                      <Text style={styles.optionLabel}>{item.label}</Text>
                    </View>
                    <View style={[styles.radioCircle, selected && { backgroundColor: BLUE_THEME.primary, borderColor: BLUE_THEME.white }]} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 5: Sensitive Struggles Grid (Screenshot 6) ================= */
        step === 5 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.strugglesTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.strugglesSubtitle}</Text>

            <View style={styles.strugglesGrid}>
              {SENSITIVE_AREAS.map((item) => {
                const selected = profile.sensitiveJoints.includes(item.label);
                const displayLabel = t.onboarding.sensitiveAreas[item.label] || item.label;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleSensitive(item.label)}
                    style={[
                      styles.struggleCard,
                      {
                        backgroundColor: selected ? '#172236' : BLUE_THEME.cardDark,
                        borderColor: selected ? BLUE_THEME.primary : BLUE_THEME.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.targetIconWrap}>
                      <SensitiveJointSvg id={item.id} />
                    </View>
                    <Text style={styles.struggleText}>{displayLabel}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 6: Target Focus Areas (Dual Mannequin Stage) ================= */
        step === 6 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.focusAreasTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.focusAreasSubtitle}</Text>

            <DualMannequinFocusPicker
              selectedAreas={profile.targetMuscles}
              onToggleArea={toggleFocusArea}
              accentColor={BLUE_THEME.primary}
            />
          </View>
        ) : /* ================= STEP 7: Workout Routine Exists? ================= */
        step === 7 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.routineTitle}</Text>
            <View style={styles.optionsList}>
              {[
                { val: true, label: t.onboarding.routineYes },
                { val: false, label: t.onboarding.routineNo },
              ].map((r) => {
                const selected = profile.hasRoutine === r.val;
                return (
                  <Pressable
                    key={r.label}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, hasRoutine: r.val });
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: selected ? '#172236' : BLUE_THEME.cardDark,
                        borderColor: selected ? BLUE_THEME.primary : BLUE_THEME.cardBorder,
                      },
                    ]}
                  >
                    <Text style={styles.optionLabel}>{r.label}</Text>
                    <View style={[styles.radioCircle, selected && { backgroundColor: BLUE_THEME.primary, borderColor: BLUE_THEME.white }]} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 8: Equipment Checklist (Screenshots 7 & 8) ================= */
        step === 8 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.equipmentTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.equipmentSubtitle}</Text>

            {EQUIPMENT_CATEGORIES.map((cat) => (
              <View key={cat.category} style={styles.equipmentCatWrap}>
                <Text style={styles.catTitle}>{t.onboarding.equipmentCategories[cat.category] || cat.category}</Text>
                <View style={styles.optionsList}>
                  {cat.items.map((item) => {
                    const checked = profile.equipment.includes(item);
                    const itemLabel = t.onboarding.equipmentItems[item] || item;
                    return (
                      <Pressable
                        key={item}
                        onPress={() => toggleEquipment(item)}
                        style={[
                          styles.optionCard,
                          {
                            backgroundColor: checked ? '#172236' : BLUE_THEME.cardDark,
                            borderColor: checked ? BLUE_THEME.primary : BLUE_THEME.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.optionLeft}>
                          <View style={styles.eqIconTile}>
                            <EquipmentSvg item={item} />
                          </View>
                          <Text style={styles.optionLabel}>{itemLabel}</Text>
                        </View>
                        <View
                          style={[
                            styles.checkSquare,
                            checked && {
                              backgroundColor: BLUE_THEME.accentGreen,
                              borderColor: BLUE_THEME.accentGreen,
                            },
                          ]}
                        >
                          {checked ? <Feather name="check" size={14} color="#000000" strokeWidth={3} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : /* ================= STEP 9: Which muscles did you work out last? (Screenshot 9) ================= */
        step === 9 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.lastMusclesTitle}</Text>
            <View style={styles.optionsList}>
              {WORKOUT_MUSCLES.map((m) => {
                const checked = profile.lastMusclesWorked.includes(m.id);
                const muscleLabel = t.onboarding.workoutMuscles[m.id] || m.label;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => toggleLastMuscle(m.id)}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: checked ? '#172236' : BLUE_THEME.cardDark,
                        borderColor: checked ? BLUE_THEME.primary : BLUE_THEME.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <View style={styles.muscleThumbTile}>
                        <MuscleCategorySvg muscleId={m.id} color={m.color} />
                      </View>
                      <Text style={styles.optionLabel}>{muscleLabel}</Text>
                    </View>
                    <View
                      style={[
                        styles.checkSquare,
                        checked && {
                          backgroundColor: BLUE_THEME.accentGreen,
                          borderColor: BLUE_THEME.accentGreen,
                        },
                      ]}
                    >
                      {checked ? <Feather name="check" size={14} color="#000000" strokeWidth={3} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 10: Workout Duration ================= */
        step === 10 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.durationTitle}</Text>
            <View style={styles.optionsList}>
              {[
                { time: '45 minutes', label: t.onboarding.duration45, sub: t.onboarding.duration45Sub },
                { time: '60 minutes', label: t.onboarding.duration60, sub: t.onboarding.duration60Sub },
                { time: '90+ minutes', label: t.onboarding.duration90, sub: t.onboarding.duration90Sub },
              ].map((item) => {
                const selected = profile.workoutDuration === item.time;
                return (
                  <Pressable
                    key={item.time}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, workoutDuration: item.time });
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: selected ? '#172236' : BLUE_THEME.cardDark,
                        borderColor: selected ? BLUE_THEME.primary : BLUE_THEME.cardBorder,
                      },
                    ]}
                  >
                    <View>
                      <Text style={styles.optionLabel}>{item.label}</Text>
                      <Text style={styles.subCardText}>{item.sub}</Text>
                    </View>
                    <View style={[styles.radioCircle, selected && { backgroundColor: BLUE_THEME.primary, borderColor: BLUE_THEME.white }]} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 11: Frequency Days per week ================= */
        step === 11 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.frequencyTitle}</Text>
            <View style={styles.pillToggleHeader}>
              <View style={[styles.activeTabPill, { backgroundColor: BLUE_THEME.white }]}>
                <Text style={styles.activeTabPillText}>{t.onboarding.daysPerWeekTab}</Text>
              </View>
              <Text style={styles.inactiveTabPillText}>{t.onboarding.specificDaysTab}</Text>
            </View>
            <View style={styles.optionsList}>
              {[
                { days: 2, sub: t.onboarding.freqSolid },
                { days: 3, sub: t.onboarding.freqGood },
                { days: 4, sub: t.onboarding.freqGreat },
                { days: 5, sub: t.onboarding.freqIncredible },
                { days: 6, sub: t.onboarding.freqOutstanding },
                { days: 7, sub: t.onboarding.everyDay },
              ].map((d) => {
                const selected = profile.daysPerWeek === d.days;
                return (
                  <Pressable
                    key={d.days}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, daysPerWeek: d.days });
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: selected ? '#172236' : BLUE_THEME.cardDark,
                        borderColor: selected ? BLUE_THEME.primary : BLUE_THEME.cardBorder,
                      },
                    ]}
                  >
                    <View>
                      <Text style={styles.optionLabel}>
                        {d.days === 7
                          ? t.onboarding.everyDay
                          : t.onboarding.daysPerWeekFmt.replace('{days}', String(d.days))}
                      </Text>
                      <Text style={styles.subCardText}>{d.sub}</Text>
                    </View>
                    <View style={[styles.radioCircle, selected && { backgroundColor: BLUE_THEME.primary, borderColor: BLUE_THEME.white }]} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 12: Psychological Statement ================= */
        step === 12 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <Text style={styles.mainTitle}>{t.onboarding.relateTitle}</Text>

            <View style={styles.quoteCard}>
              <View style={[styles.quoteBubble, { backgroundColor: BLUE_THEME.primary }]}>
                <Feather name="message-square" size={14} color="#090D16" />
              </View>
              <Text style={styles.quoteText}>{t.onboarding.relateQuote}</Text>
            </View>

            <View style={styles.yesNoGrid}>
              <Pressable onPress={next} style={[styles.yesNoBtn, { backgroundColor: BLUE_THEME.cardDark, borderColor: BLUE_THEME.primary }]}>
                <Feather name="check" size={24} color={BLUE_THEME.primary} />
                <Text style={styles.yesNoText}>{t.onboarding.yes}</Text>
              </Pressable>
              <Pressable onPress={next} style={[styles.yesNoBtn, { backgroundColor: BLUE_THEME.cardDark, borderColor: BLUE_THEME.cardBorder }]}>
                <Feather name="x" size={24} color="#64748B" />
                <Text style={styles.yesNoText}>{t.onboarding.no}</Text>
              </Pressable>
            </View>
          </View>
        ) : /* ================= STEP 13: We track your progress ================= */
        step === 13 ? (
          <View style={styles.stepContainer}>
            <RadarChartDistribution />

            <Text style={styles.mainTitle}>{t.onboarding.trackProgressTitle}</Text>
            <View style={styles.benefitListWrap}>
              <View style={styles.pitchBenefitRow}>
                <Feather name="bar-chart" size={18} color={BLUE_THEME.primary} />
                <Text style={styles.pitchBenefitText}>{t.onboarding.trackBenefit1}</Text>
              </View>
              <View style={styles.pitchBenefitRow}>
                <Feather name="trending-up" size={18} color={BLUE_THEME.primary} />
                <Text style={styles.pitchBenefitText}>{t.onboarding.trackBenefit2}</Text>
              </View>
              <View style={styles.pitchBenefitRow}>
                <Feather name="shield" size={18} color={BLUE_THEME.primary} />
                <Text style={styles.pitchBenefitText}>{t.onboarding.trackBenefit3}</Text>
              </View>
            </View>
          </View>
        ) : /* ================= STEP 14: Enter your PR on Barbell Squat ================= */
        step === 14 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <Text style={styles.mainTitle}>{t.onboarding.prSquatTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.prSquatSubtitle}</Text>

            <View style={styles.rulerValueWrap}>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setProfile((p) => ({ ...p, prSquat: Math.max(20, p.prSquat - 2.5) }));
                }}
                style={styles.adjustStepBtn}
                hitSlop={10}
              >
                <Feather name="minus" size={20} color={BLUE_THEME.primary} />
              </Pressable>

              <View style={styles.rulerInputBox}>
                <TextInput
                  style={styles.rulerLargeValInput}
                  value={String(profile.prSquat)}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    const val = parseFloat(cleaned);
                    if (!isNaN(val)) setProfile((p) => ({ ...p, prSquat: val }));
                    else if (cleaned === '') setProfile((p) => ({ ...p, prSquat: 0 }));
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <Text style={styles.rulerUnit}>{t.common.kg}</Text>
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

            <View style={styles.rulerPresetsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rulerMarksScroll}>
                {[40, 50, 60, 70, 75, 80, 85, 90, 95, 100, 110, 120, 140].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, prSquat: s });
                    }}
                    style={[styles.rulerChip, s === profile.prSquat && styles.rulerChipActive]}
                  >
                    <Text style={[styles.rulerChipText, s === profile.prSquat && styles.rulerChipTextActive]}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : /* ================= STEP 15: You unlocked your first trophies! ================= */
        step === 15 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.trophyBadgeTop}>
              <Text style={styles.trophyBadgeText}>{t.onboarding.trophyUnlockedTag}</Text>
            </View>
            <Text style={styles.welcomeTitle}>{t.onboarding.trophyUnlockedTitle}</Text>

            <View style={styles.trophyHeroBox}>
              <TrophyHeroSvg />
            </View>

            <View style={styles.trophyCardDesc}>
              <Feather name="lock" size={16} color={BLUE_THEME.primary} style={{ alignSelf: 'center', marginBottom: 4 }} />
              <Text style={styles.trophyName}>{t.onboarding.trophyBenchName}</Text>
              <Text style={styles.trophySub}>{t.onboarding.trophyBenchDesc}</Text>
            </View>
          </View>
        ) : /* ================= STEP 16: Trophies in Progress ================= */
        step === 16 ? (
          <View style={styles.stepContainer}>
            <View style={[styles.trophyBadgeTop, { alignSelf: 'center' }]}>
              <Text style={styles.trophyBadgeText}>{t.onboarding.trophiesProgressTag}</Text>
            </View>
            <Text style={styles.mainTitle}>{t.onboarding.trophiesProgressTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.trophiesProgressSubtitle}</Text>

            <View style={styles.optionsList}>
              {[
                { name: t.onboarding.trophyBenchName, max: t.onboarding.trophyBenchMax, pct: '72%' },
                { name: 'Deadlift Proficiency', max: t.onboarding.trophyDeadliftMax, pct: '86%' },
                { name: 'Squat Proficiency', max: t.onboarding.trophySquatMax, pct: '85%' },
                { name: 'All-Star', max: t.onboarding.trophyAllStarMax, pct: '85%' },
              ].map((item) => (
                <View key={item.name} style={[styles.optionCard, { borderColor: BLUE_THEME.cardBorder }]}>
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: '#78350F' }]}>
                      <Feather name="award" size={16} color="#F59E0B" />
                    </View>
                    <View>
                      <Text style={styles.optionLabel}>{item.name}</Text>
                      <Text style={styles.subCardText}>{item.max}</Text>
                    </View>
                  </View>
                  <Text style={[styles.trophyPct, { color: BLUE_THEME.primary }]}>{item.pct}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : /* ================= STEP 17: Prediction Silver Deadlift ================= */
        step === 17 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <Text style={styles.mainTitle}>{t.onboarding.predictSilverTitle}</Text>

            <PredictionTrajectoryGraph />

            <Text style={[styles.welcomeTitle, { fontSize: 22, color: BLUE_THEME.primary, marginTop: 18 }]}>
              {t.onboarding.youAreIncredible}
            </Text>
            <Text style={styles.subTitle}>{t.onboarding.incredibleSubtitle}</Text>
          </View>
        ) : /* ================= STEP 18: Goal Weight Goal Setter ================= */
        step === 18 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <Text style={styles.mainTitle}>{t.onboarding.strongerGoalTitle}</Text>

            <View style={styles.rulerValueWrap}>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setProfile((p) => ({ ...p, goalWeight: Math.max(30, Number((p.goalWeight - 0.5).toFixed(1))) }));
                }}
                style={styles.adjustStepBtn}
                hitSlop={10}
              >
                <Feather name="minus" size={20} color={BLUE_THEME.primary} />
              </Pressable>

              <View style={styles.rulerInputBox}>
                <TextInput
                  style={styles.rulerLargeValInput}
                  value={String(profile.goalWeight)}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    const val = parseFloat(cleaned);
                    if (!isNaN(val)) setProfile((p) => ({ ...p, goalWeight: val }));
                    else if (cleaned === '') setProfile((p) => ({ ...p, goalWeight: 0 }));
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <Text style={styles.rulerUnit}>{t.common.kg}</Text>
              </View>

              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setProfile((p) => ({ ...p, goalWeight: Math.min(250, Number((p.goalWeight + 0.5).toFixed(1))) }));
                }}
                style={styles.adjustStepBtn}
                hitSlop={10}
              >
                <Feather name="plus" size={20} color={BLUE_THEME.primary} />
              </Pressable>
            </View>

            <View style={[styles.goalStatBadge, { backgroundColor: '#172236', borderColor: BLUE_THEME.primary }]}>
              <Feather name="trending-up" size={16} color={BLUE_THEME.primary} />
              <Text style={[styles.goalBadgeText, { color: BLUE_THEME.primary }]}>
                {t.onboarding.strongerGoalBadge
                  .replace('{diff}', String(profile.goalWeight - profile.weight))
                  .replace(
                    '{pct}',
                    (
                      ((profile.goalWeight - profile.weight) / profile.weight) *
                      100
                    ).toFixed(1)
                  )}
              </Text>
            </View>

            <View style={styles.rulerPresetsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rulerMarksScroll}>
                {[50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map((w) => (
                  <Pressable
                    key={w}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, goalWeight: w });
                    }}
                    style={[styles.rulerChip, w === profile.goalWeight && styles.rulerChipActive]}
                  >
                    <Text style={[styles.rulerChipText, w === profile.goalWeight && styles.rulerChipTextActive]}>
                      {w}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : /* ================= STEP 19: How fast to reach goal? ================= */
        step === 19 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <Text style={styles.mainTitle}>{t.onboarding.speedGoalTitle}</Text>

            <View style={styles.goalSpeedCard}>
              <Text style={styles.speedDateHeader}>{t.onboarding.speedGoalHeader}</Text>
              <Text style={styles.speedDesc}>{t.onboarding.speedGoalDesc}</Text>

              <View style={styles.speedChipsRow}>
                <View style={[styles.speedChip, { backgroundColor: BLUE_THEME.primary }]}>
                  <Text style={styles.speedChipText}>+{profile.goalWeight - profile.weight} {t.common.kg}</Text>
                </View>
                <View style={[styles.speedChip, { backgroundColor: '#1E293B' }]}>
                  <Text style={[styles.speedChipText, { color: BLUE_THEME.white }]}>
                    {t.onboarding.weeksLabel.replace('{weeks}', String(profile.goalWeeks))}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.weeksSliderWrap}>
              {[2, 4, 8, 16].map((wk) => (
                <Pressable
                  key={wk}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setProfile({ ...profile, goalWeeks: wk });
                  }}
                  style={[styles.weekPill, profile.goalWeeks === wk && { backgroundColor: BLUE_THEME.primary }]}
                >
                  <Text style={[styles.weekPillText, profile.goalWeeks === wk && { color: '#090D16', fontWeight: '800' }]}>
                    {wk}w
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : /* ================= STEP 20: You just leveled up! ================= */
        step === 20 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.trophyBadgeTop}>
              <Text style={styles.trophyBadgeText}>{t.onboarding.levelUpTag}</Text>
            </View>
            <Text style={styles.welcomeTitle}>{t.onboarding.levelUpTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.levelUpSubtitle}</Text>

            <View style={[styles.hexShield, { borderColor: BLUE_THEME.primary, shadowColor: BLUE_THEME.primary }]}>
              <Text style={styles.hexNumber}>14</Text>
            </View>

            <View style={styles.levelProgressCard}>
              <View style={styles.levelHeaderRow}>
                <Text style={styles.levelName}>{t.onboarding.levelProgress}</Text>
                <Text style={[styles.xpGainText, { color: BLUE_THEME.primary }]}>+91,000 XP</Text>
              </View>
              <Text style={styles.lvlPct}>lvl 14 · 0%</Text>
            </View>
          </View>
        ) : /* ================= STEP 21: Preparing your routine.. ================= */
        step === 21 ? (
          <View style={[styles.stepContainer, styles.centerFlex, { paddingVertical: 80 }]}>
            <Svg width="180" height="180" viewBox="0 0 100 100">
              <Path
                d="M 20,50 L 42,76 L 82,24 L 70,24 L 42,60 L 30,48 Z"
                fill={BLUE_THEME.primary}
              />
              <Path d="M 82,24 L 64,28 L 78,42 Z" fill={BLUE_THEME.primary} />
            </Svg>
            <Text style={[styles.welcomeTitle, { marginTop: 32 }]}>{t.onboarding.preparingRoutine}</Text>
            <Text style={[styles.subTitle, { color: BLUE_THEME.primary }]}>
              {t.onboarding.completedPct.replace('{pct}', String(routinePrepProgress))}
            </Text>
          </View>
        ) : /* ================= STEP 22: Routine Overview ================= */
        step === 22 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.routineOverviewTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.routineOverviewDesc}</Text>

            <View style={styles.routineStatsBar}>
              <View style={styles.routineStatBox}>
                <Text style={styles.statBoxLabel}>{t.onboarding.weeklyGoalLabel}</Text>
                <Text style={styles.statBoxVal}>
                  {t.onboarding.workoutsCount.replace('{count}', String(profile.daysPerWeek))}
                </Text>
              </View>
              <View style={styles.routineStatBox}>
                <Text style={styles.statBoxLabel}>{t.onboarding.workoutTimeLabel}</Text>
                <Text style={styles.statBoxVal}>{profile.workoutDuration}</Text>
              </View>
            </View>

            <View style={[styles.routineDesignedCard, { backgroundColor: '#172236', borderColor: BLUE_THEME.primary }]}>
              <Feather name="zap" size={18} color={BLUE_THEME.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.valTitle, { color: BLUE_THEME.primary }]}>{t.onboarding.designedMuscleGrowth}</Text>
                <Text style={styles.valDesc}>{t.onboarding.designedMuscleGrowthDesc}</Text>
              </View>
            </View>

            <Text style={[styles.catTitle, { marginTop: 18 }]}>{t.onboarding.workoutsListTitle}</Text>
            <View style={styles.optionsList}>
              <View style={styles.optionCard}>
                <Text style={styles.optionLabel}>Push</Text>
                <Text style={styles.subCardText}>{t.onboarding.pushWorkoutSub}</Text>
              </View>
              <View style={styles.optionCard}>
                <Text style={styles.optionLabel}>Pull</Text>
                <Text style={styles.subCardText}>{t.onboarding.pullWorkoutSub}</Text>
              </View>
              <View style={styles.optionCard}>
                <Text style={styles.optionLabel}>Legs</Text>
                <Text style={styles.subCardText}>{t.onboarding.legsWorkoutSub}</Text>
              </View>
            </View>
          </View>
        ) : /* ================= STEP 23: Streak Start ================= */
        step === 23 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.flameWrap}>
              <FlameHeroSvg />
            </View>
            <Text style={styles.welcomeTitle}>
              {t.onboarding.streakStartTitle}{' '}
              <Text style={{ color: '#F97316' }}>{t.onboarding.streakStartHighlight}</Text>
            </Text>
            <Text style={styles.subTitle}>{t.onboarding.streakStartSubtitle}</Text>

            <View style={styles.streakWeekBox}>
              <View style={styles.streakDaysRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <View key={idx} style={[styles.streakDayCircle, idx === 1 && { backgroundColor: '#F97316' }]}>
                    <Text style={[styles.streakDayText, idx === 1 && { color: '#FFFFFF', fontWeight: '800' }]}>{day}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.streakHint}>{t.onboarding.streakHint}</Text>
            </View>
          </View>
        ) : /* ================= STEP 24: Commit to working out streak goal ================= */
        step === 24 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.commitWorkoutTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.commitWorkoutSubtitle}</Text>

            <View style={styles.optionsList}>
              {[
                { streak: 7, rank: 'Good', color: '#EAB308' },
                { streak: 14, rank: 'Great', color: '#38BDF8' },
                { streak: 30, rank: 'Incredible', color: '#A855F7' },
                { streak: 50, rank: 'Unstoppable', color: '#EC4899' },
              ].map((s) => {
                const selected = profile.streakCommitment === s.streak;
                return (
                  <Pressable
                    key={s.streak}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, streakCommitment: s.streak });
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
                      <Feather name="zap" size={18} color={s.color} />
                      <Text style={styles.optionLabel}>
                        {t.onboarding.dayStreakFmt.replace('{streak}', String(s.streak))}
                      </Text>
                    </View>
                    <Text style={[styles.rankTag, { color: s.color }]}>{s.rank}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.subTitle, { textAlign: 'center', marginTop: 18 }]}>
              {t.onboarding.moreLikelyGoal}
            </Text>
          </View>
        ) : /* ================= STEP 25: Enable Notifications ================= */
        step === 25 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.enableNotifTitle}</Text>
            <Text style={styles.subTitle}>{t.onboarding.enableNotifSubtitle}</Text>

            <View style={styles.optionsList}>
              <View style={styles.notificationPreviewCard}>
                <Feather name="bell" size={16} color={BLUE_THEME.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{t.onboarding.notifRestTitle}</Text>
                  <Text style={styles.notifBody}>{t.onboarding.notifRestBody}</Text>
                </View>
              </View>
              <View style={styles.notificationPreviewCard}>
                <Feather name="zap" size={16} color="#F97316" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{t.onboarding.notifStreakTitle}</Text>
                  <Text style={styles.notifBody}>{t.onboarding.notifStreakBody}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : /* ================= STEP 26: Social Proof Trusted by 1M+ Users ================= */
        step === 26 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <Text style={styles.welcomeTitle}>
              {t.onboarding.trustedUsersTitle}{'\n'}
              <Text style={{ color: BLUE_THEME.primary }}>{t.onboarding.trustedUsersHighlight}</Text>
            </Text>

            <View style={styles.socialStatsRow}>
              <View style={styles.socialStat}>
                <Text style={styles.socialNumber}>{t.onboarding.ratingsCount}</Text>
                <Text style={styles.socialLabel}>{t.onboarding.ratingsLabel}</Text>
              </View>
              <View style={styles.socialStat}>
                <Text style={styles.socialNumber}>{t.onboarding.workoutsCountStat}</Text>
                <Text style={styles.socialLabel}>{t.onboarding.workoutsLabel}</Text>
              </View>
            </View>

            <View style={styles.testimonialCard}>
              <Text style={styles.starsText}>★★★★★</Text>
              <Text style={styles.quoteTitle}>{t.onboarding.testimonialTitle}</Text>
              <Text style={styles.quoteBody}>{t.onboarding.testimonialBody}</Text>
              <Text style={styles.authorText}>{t.onboarding.testimonialAuthor}</Text>
            </View>
          </View>
        ) : /* ================= STEP 27: Fingerprint Tap & Hold Commitment ================= */
        step === 27 ? (
          <View style={[styles.stepContainer, styles.centerFlex, { paddingVertical: 20 }]}>
            <Text style={styles.welcomeTitle}>
              {t.onboarding.pledgeTitle.replace('{name}', profile.name || 'lifter')}
            </Text>
            <Text style={styles.subTitle}>{t.onboarding.pledgeBody}</Text>

            <Pressable
              onPressIn={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setIsHoldingCommit(true);
              }}
              onPressOut={() => {
                setIsHoldingCommit(false);
              }}
              onLongPress={() => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                next();
              }}
              delayLongPress={1200}
              style={[
                styles.fingerprintCircle,
                {
                  borderColor: isHoldingCommit ? BLUE_THEME.primary : '#1E293B',
                  shadowColor: BLUE_THEME.primary,
                },
              ]}
            >
              <FingerprintSvg color={isHoldingCommit ? BLUE_THEME.primary : '#64748B'} isHolding={isHoldingCommit} />
            </Pressable>

            <Text style={[styles.subTitle, { marginTop: 20, textAlign: 'center' }]}>
              {t.onboarding.tapAndHoldCommit}
            </Text>
          </View>
        ) : /* ================= STEP 28: You Are Ready! ================= */
        step === 28 ? (
          <View style={[styles.stepContainer, styles.centerFlex, { paddingVertical: 80 }]}>
            <Svg width="120" height="120" viewBox="0 0 100 100">
              <Path
                d="M 20,50 L 42,76 L 82,24 L 70,24 L 42,60 L 30,48 Z"
                fill={BLUE_THEME.primary}
              />
            </Svg>
            <Text style={[styles.welcomeTitle, { fontSize: 34, marginTop: 28 }]}>{t.onboarding.youAreReady}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Sticky Action Button - Pinned correctly without layout jumping */}
      {step !== 21 && step !== 27 ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            onPress={next}
            style={({ pressed }) => [
              styles.continueBtn,
              isSkipStep
                ? styles.skipBtnTheme
                : { backgroundColor: BLUE_THEME.accentGreen, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Text
              style={[
                styles.continueBtnText,
                isSkipStep ? { color: BLUE_THEME.white } : { color: '#090D16' },
              ]}
            >
              {buttonText}
            </Text>
          </Pressable>

          {step === 0 ? (
            <Text style={styles.loginHint}>
              {t.onboarding.alreadyHaveAccount}
              <Text style={{ color: BLUE_THEME.primary, fontWeight: '700' }}>{t.onboarding.logIn}</Text>
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Subscription Paywall Modal */}
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
    width: 48,
  },
  skipHeaderBtn: {
    paddingHorizontal: 10,
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
    marginHorizontal: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: BLUE_THEME.primary,
    borderRadius: 2,
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
    letterSpacing: 0,
    color: BLUE_THEME.white,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: BLUE_THEME.subText,
    marginBottom: 16,
  },
  nameInput: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: BLUE_THEME.cardDark,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    paddingHorizontal: 18,
    fontSize: 18,
    fontWeight: '600',
    color: BLUE_THEME.white,
    marginTop: 18,
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
    paddingVertical: 10,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  muscleThumbTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#171E2D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#242F44',
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
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#334155',
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
  rulerValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 24,
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
  heightWheelWrap: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 32,
  },
  wheelMuted: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
  },
  heightActiveRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  wheelActiveVal: {
    fontSize: 44,
    fontWeight: '900',
    color: BLUE_THEME.white,
  },
  wheelActiveUnit: {
    fontSize: 20,
    fontWeight: '700',
    color: BLUE_THEME.primary,
  },
  hamburgerBars: {
    gap: 3,
    width: 16,
  },
  hBar: {
    width: 14,
    height: 2,
    backgroundColor: '#64748B',
    borderRadius: 1,
  },
  strugglesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginTop: 8,
  },
  struggleCard: {
    width: '48%',
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  targetIconWrap: {
    marginBottom: 12,
  },
  struggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: BLUE_THEME.white,
    textAlign: 'center',
  },
  equipmentCatWrap: {
    marginTop: 18,
    width: '100%',
  },
  catTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BLUE_THEME.white,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  pillToggleHeader: {
    flexDirection: 'row',
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 14,
    padding: 4,
    marginVertical: 10,
  },
  activeTabPill: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  activeTabPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#090D16',
  },
  inactiveTabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: BLUE_THEME.subText,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  quoteCard: {
    backgroundColor: BLUE_THEME.cardDark,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    borderRadius: 24,
    padding: 24,
    marginVertical: 24,
    position: 'relative',
    width: '100%',
  },
  quoteBubble: {
    position: 'absolute',
    top: -14,
    left: 20,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: BLUE_THEME.white,
  },
  yesNoGrid: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  yesNoBtn: {
    flex: 1,
    height: 90,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  yesNoText: {
    fontSize: 16,
    fontWeight: '800',
    color: BLUE_THEME.white,
  },
  radarLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: BLUE_THEME.subText,
  },
  milestoneCol: {
    alignItems: 'flex-start',
  },
  milestoneVal: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE_THEME.white,
    marginTop: 2,
  },
  radarCard: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  radarTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BLUE_THEME.white,
    marginBottom: 10,
  },
  spiderChartBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitListWrap: {
    gap: 14,
    marginTop: 10,
  },
  pitchBenefitRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  pitchBenefitText: {
    fontSize: 13,
    lineHeight: 20,
    color: BLUE_THEME.white,
    flex: 1,
  },
  trophyBadgeTop: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  trophyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: BLUE_THEME.white,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: BLUE_THEME.white,
    textAlign: 'center',
    lineHeight: 32,
  },
  trophyHeroBox: {
    marginVertical: 20,
  },
  trophyCardDesc: {
    backgroundColor: BLUE_THEME.cardDark,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    borderRadius: 20,
    padding: 16,
    width: '100%',
  },
  trophyName: {
    fontSize: 15,
    fontWeight: '800',
    color: BLUE_THEME.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  trophySub: {
    fontSize: 12,
    color: BLUE_THEME.subText,
    textAlign: 'center',
    lineHeight: 16,
  },
  trophyPct: {
    fontSize: 15,
    fontWeight: '800',
  },
  trajectoryWrap: {
    alignItems: 'center',
    marginVertical: 18,
  },
  graphLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 260,
    marginTop: 4,
  },
  labelMuted: {
    fontSize: 12,
    color: '#64748B',
  },
  labelActive: {
    fontSize: 12,
    fontWeight: '800',
  },
  goalStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
  },
  goalBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  goalSpeedCard: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  speedDateHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: BLUE_THEME.white,
    marginBottom: 6,
  },
  speedDesc: {
    fontSize: 13,
    color: BLUE_THEME.subText,
    textAlign: 'center',
    marginBottom: 16,
  },
  speedChipsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  speedChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  speedChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#090D16',
  },
  weeksSliderWrap: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  weekPill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: BLUE_THEME.cardDark,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
  },
  weekPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: BLUE_THEME.subText,
  },
  hexShield: {
    width: 110,
    height: 110,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101B2B',
    marginVertical: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  hexNumber: {
    fontSize: 42,
    fontWeight: '900',
    color: BLUE_THEME.white,
  },
  levelProgressCard: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 16,
    width: '100%',
  },
  levelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  levelName: {
    fontSize: 14,
    fontWeight: '800',
    color: BLUE_THEME.white,
  },
  xpGainText: {
    fontSize: 13,
    fontWeight: '800',
  },
  lvlPct: {
    fontSize: 12,
    color: BLUE_THEME.subText,
  },
  routineStatsBar: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  routineStatBox: {
    flex: 1,
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 14,
  },
  statBoxLabel: {
    fontSize: 11,
    color: BLUE_THEME.subText,
    marginBottom: 4,
  },
  statBoxVal: {
    fontSize: 15,
    fontWeight: '800',
    color: BLUE_THEME.white,
  },
  routineDesignedCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginVertical: 10,
    alignItems: 'center',
  },
  valTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BLUE_THEME.white,
    marginBottom: 2,
  },
  valDesc: {
    fontSize: 12,
    color: BLUE_THEME.subText,
    lineHeight: 16,
  },
  flameWrap: {
    marginVertical: 20,
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
  rankTag: {
    fontSize: 13,
    fontWeight: '800',
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
  socialStatsRow: {
    flexDirection: 'row',
    gap: 24,
    marginVertical: 18,
  },
  socialStat: {
    alignItems: 'center',
  },
  socialNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: BLUE_THEME.primary,
  },
  socialLabel: {
    fontSize: 11,
    color: BLUE_THEME.subText,
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
  fingerprintCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101B2B',
    marginVertical: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
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
    shadowColor: BLUE_THEME.accentGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  skipBtnTheme: {
    backgroundColor: '#171B26',
    borderWidth: 1,
    borderColor: '#242D3D',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  loginHint: {
    fontSize: 13,
    color: BLUE_THEME.subText,
  },
});
