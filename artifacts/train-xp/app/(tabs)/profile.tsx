import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';
import { DualMannequinFocusPicker } from '@/components/DualMannequinFocusPicker';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { PaywallModal } from '@/components/PaywallModal';
import { ProgressBar } from '@/components/ProgressBar';
import { useAppState } from '@/context/AppState';
import { useColors } from '@/hooks/useColors';
import { MUSCLE_NAMES, type MuscleSlug } from '@/lib/muscles';
import { useI18n } from '@/lib/i18n';
import { isAppleAuthAvailable } from '@/lib/auth';
import { TERMS_OF_USE_URL, PRIVACY_POLICY_URL } from '@/lib/purchases';

import { type WorkoutHistoryItem } from '@/lib/effort';

// Theme tokens for Cyberpunk Dark RPG
const THEME = {
  bg: '#080C14',
  card: '#111724',
  cardBorder: '#1A2333',
  cardSubtle: '#141D2E',
  accentGreen: '#22C55E',
  accentBlue: '#38BDF8',
  accentOrange: '#F97316',
  accentPurple: '#C084FC',
  accentDiamond: '#818CF8',
  textMain: '#FFFFFF',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
};

// 6-Axis Muscle Balance Radar Component
function MuscleBalanceRadar({ muscleCounts = {} }: { muscleCounts?: Partial<Record<MuscleSlug, number>> }) {
  const { locale } = useI18n();
  const isVi = locale === 'vi';
  const categories = [
    { label: isVi ? 'NGỰC' : 'CHEST', count: muscleCounts.chest || 0 },
    { label: isVi ? 'LƯNG' : 'BACK', count: (muscleCounts['upper-back'] || 0) + (muscleCounts['trapezius'] || 0) },
    { label: isVi ? 'TAY' : 'ARMS', count: (muscleCounts.biceps || 0) + (muscleCounts.triceps || 0) },
    { label: isVi ? 'CHÂN' : 'LEGS', count: (muscleCounts.quadriceps || 0) + (muscleCounts.hamstring || 0) + (muscleCounts.gluteal || 0) },
    { label: isVi ? 'VAI' : 'SHOULDERS', count: muscleCounts.deltoids || 0 },
    { label: isVi ? 'BỤNG' : 'CORE', count: (muscleCounts.abs || 0) + (muscleCounts.obliques || 0) },
  ];

  const hasAnyData = categories.some((c) => c.count > 0);
  const maxVal = Math.max(...categories.map((c) => c.count), 1);
  const cx = 110;
  const cy = 90;
  const r = 60;

  // Calculate polygon points
  const points = categories.map((cat, idx) => {
    const angle = (idx * 60 - 90) * (Math.PI / 180);
    const dist = hasAnyData && cat.count > 0 ? (cat.count / maxVal) * r : 4;
    const x = cx + dist * Math.cos(angle);
    const y = cy + dist * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={styles.radarCard}>
      <Text style={styles.radarHeader}>ANATOMICAL BALANCE RADAR</Text>
      <View style={styles.radarSvgWrap}>
        <Svg width="220" height="180" viewBox="0 0 220 180">
          {/* Concentric Web Rings */}
          <Polygon points="110,30 162,60 162,120 110,150 58,120 58,60" fill="none" stroke="#1E293B" strokeWidth="1" />
          <Polygon points="110,50 145,70 145,110 110,130 75,110 75,70" fill="none" stroke="#1E293B" strokeWidth="1" />
          <Polygon points="110,70 128,80 128,100 110,110 92,100 92,80" fill="none" stroke="#1E293B" strokeWidth="1" />

          {/* Spokes */}
          <Line x1="110" y1="90" x2="110" y2="30" stroke="#1E293B" strokeWidth="1" />
          <Line x1="110" y1="90" x2="162" y2="60" stroke="#1E293B" strokeWidth="1" />
          <Line x1="110" y1="90" x2="162" y2="120" stroke="#1E293B" strokeWidth="1" />
          <Line x1="110" y1="90" x2="110" y2="150" stroke="#1E293B" strokeWidth="1" />
          <Line x1="110" y1="90" x2="58" y2="120" stroke="#1E293B" strokeWidth="1" />
          <Line x1="110" y1="90" x2="58" y2="60" stroke="#1E293B" strokeWidth="1" />

          {/* Active Player Shape */}
          <Polygon points={points} fill="rgba(56, 189, 248, 0.35)" stroke="#38BDF8" strokeWidth={2} />
        </Svg>
      </View>
      <View style={styles.radarLabelsRow}>
        {categories.map((c) => (
          <View key={c.label} style={styles.radarBadge}>
            <Text style={styles.radarBadgeText}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    stats,
    profile,
    workoutsHistory,
    resetOnboarding,
    loginApple,
    loginGoogle,
    logoutAuth,
    deleteAccountData,
  } = useAppState();
  const { locale, setLocale, t } = useI18n();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showChallenges, setShowChallenges] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAvailable);
  }, []);

  const isVi = locale === 'vi';

  const recoveryPercent = useMemo(() => {
    const targets = profile.targetMuscles || [];
    if (targets.length === 0) return 0;
    const trained = Object.keys(stats.muscleTrainedCount || {}).length;
    return Math.min(100, Math.round((trained / Math.max(targets.length * 2, 4)) * 100));
  }, [profile.targetMuscles, stats.muscleTrainedCount]);

  const handleAppleSignIn = async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const success = await loginApple();
      if (success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(isVi ? 'Thành công' : 'Success', isVi ? 'Đã kết nối tài khoản Apple ID!' : 'Connected Apple ID successfully!');
      }
    } catch (err: any) {
      Alert.alert('Sign In', err?.message || 'Could not complete Apple Sign In');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await loginGoogle();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(isVi ? 'Thành công' : 'Success', isVi ? 'Đã kết nối tài khoản Google!' : 'Connected Google account successfully!');
    } catch (err: any) {
      Alert.alert('Sign In', err?.message || 'Could not complete Google Sign In');
    }
  };

  const handleDeleteAccount = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      isVi ? 'Xóa tài khoản vĩnh viễn?' : 'Delete Account Permanently?',
      isVi
        ? 'Hành động này sẽ xóa toàn bộ lịch sử tập luyện, dữ liệu đám mây và tiến trình RPG của bạn. Dữ liệu không thể khôi phục.'
        : 'This will permanently remove your workout history, cloud backup, and RPG progress. This action cannot be undone.',
      [
        { text: isVi ? 'Hủy' : 'Cancel', style: 'cancel' },
        {
          text: isVi ? 'Xóa tài khoản' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setShowSettingsModal(false);
            await deleteAccountData();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const CHALLENGES = [
    { id: '1', label: isVi ? 'Giữ chuỗi tập ≥ 5 ngày' : 'Maintain a 5+ mission streak', done: stats.streak >= 5 },
    { id: '2', label: isVi ? 'Đạt 2 kỷ lục PR mới' : 'Unlock 2 new Personal Records', done: stats.prs >= 2 },
    { id: '3', label: isVi ? 'Tập ngực tăng tiến Linear' : 'Overload chest with Linear progression', done: true },
    { id: '4', label: isVi ? 'Tập ≥ 80% các nhóm cơ' : 'Train 80% of major muscle groups', done: false },
    { id: '5', label: isVi ? 'Đạt tổng volume 10,000kg' : 'Complete 10,000kg total tonnage', done: stats.totalVolume >= 10000 },
  ];

  const TOTAL_BARS = 22;
  const xpNeeded = stats.xpToNext || 500;
  const progressRatio = Math.min(1, Math.max(0, stats.xp / xpNeeded));
  const filledBars = Math.max(1, Math.round(progressRatio * TOTAL_BARS));

  const formattedVolume = useMemo(() => {
    const vol = stats.totalVolume || 0;
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M kg`;
    if (vol >= 10000) return `${Math.round(vol / 1000)}k kg`;
    return `${vol} kg`;
  }, [stats.totalVolume]);

  return (
    <View style={[styles.screen, { backgroundColor: THEME.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 90,
          },
        ]}
      >
        {/* TOP BAR: STREAK & SETTINGS */}
        <View style={styles.topBar}>
          <View style={styles.streakBadge}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakCount}>{stats.streak || 1} {t.common.days}</Text>
          </View>

          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSettingsModal(true);
            }}
            style={styles.settingsBtn}
          >
            <Feather name="settings" size={18} color={THEME.textMain} />
          </Pressable>
        </View>

        {/* HERO PROFILE RPG HEADER */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCenter}>
              <Text style={styles.avatarLetter}>
                {(profile.name || 'L').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>LVL {stats.level}</Text>
            </View>
          </View>

          <Text style={styles.username}>@{profile.name ? profile.name.toLowerCase().replace(/\s+/g, '') : 'lifter_cyber'}</Text>
          <Text style={styles.userRole}>Cybernetic Athlete • {profile.goal}</Text>

          {/* COMBAT METRICS ROW */}
          <View style={styles.tripleStatsRow}>
            <View style={styles.statCol}>
              <Feather name="zap" size={16} color={THEME.accentBlue} />
              <Text style={styles.statNumber} numberOfLines={1}>
                {stats.streak} {isVi ? 'Ngày' : 'Days'}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {isVi ? 'CHUỖI' : 'STREAK'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Feather name="anchor" size={16} color={THEME.accentOrange} />
              <Text style={styles.statNumber} numberOfLines={1}>
                {formattedVolume}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                VOLUME
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Feather name="activity" size={16} color={THEME.accentGreen} />
              <Text style={styles.statNumber} numberOfLines={1}>
                {stats.workouts}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {isVi ? 'BUỔI TẬP' : 'MISSIONS'}
              </Text>
            </View>
          </View>
        </View>

        {/* 1. ANNUAL WORKOUT ACTIVITY MATRIX (GITHUB STYLE) */}
        <ActivityHeatmap workoutsHistory={workoutsHistory} weeks={16} />

        {/* 2. MUSCLE BALANCE RADAR CHART */}
        <MuscleBalanceRadar muscleCounts={stats.muscleTrainedCount} />

        {/* 3. DUAL MANNEQUIN RECOVERY HEATMAP */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <View style={styles.musclesWorkedHeader}>
              <Text style={styles.workedPercentage}>{recoveryPercent}%</Text>
              <Text style={styles.workedTitle}>{isVi ? 'Bản đồ mục tiêu cơ bắp' : 'Target Muscles Focus'}</Text>
            </View>
            <Feather name="shield" size={16} color={THEME.accentGreen} />
          </View>

          <DualMannequinFocusPicker
            selectedAreas={profile.targetMuscles && profile.targetMuscles.length > 0 ? profile.targetMuscles : ['Full chest', 'Big arms']}
            onToggleArea={() => undefined}
            accentColor={THEME.accentGreen}
          />
        </View>

        {/* ACCOUNT & CLOUD SYNC CARD */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.sectionHeaderTitle}>
                {isVi ? 'Tài khoản & Đồng bộ Đám mây' : 'Account & Cloud Backup'}
              </Text>
              <Text style={styles.timeRemainingSub}>
                {profile.authEmail
                  ? (isVi ? `Đã liên kết: ${profile.authEmail}` : `Linked: ${profile.authEmail}`)
                  : (isVi ? 'Đồng bộ tiến độ và sao lưu khi đổi thiết bị' : 'Sync progress & recover on new devices')}
              </Text>
            </View>
            <Feather
              name={profile.authEmail ? 'check-circle' : 'cloud'}
              size={18}
              color={profile.authEmail ? THEME.accentGreen : THEME.accentBlue}
            />
          </View>

          {profile.authEmail ? (
            <View style={styles.authConnectedRow}>
              <View style={styles.authInfoCol}>
                <Text style={styles.authEmailText}>{profile.authEmail}</Text>
                <Text style={styles.authProviderBadge}>
                  {profile.authProvider === 'apple' ? ' Apple ID' : 'Google'}
                </Text>
              </View>
              <Pressable onPress={() => logoutAuth()} style={styles.signOutBtn}>
                <Text style={styles.signOutText}>{isVi ? 'Đăng xuất' : 'Sign Out'}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.authButtonsStack}>
              {appleAvailable && (
                <Pressable onPress={handleAppleSignIn} style={styles.appleSignInBtn}>
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.appleSignInText}>
                    {isVi ? 'Đăng nhập bằng Apple' : 'Sign in with Apple'}
                  </Text>
                </Pressable>
              )}
              <Pressable onPress={handleGoogleSignIn} style={styles.googleSignInBtn}>
                <Feather name="globe" size={16} color="#FFFFFF" />
                <Text style={styles.googleSignInText}>
                  {isVi ? 'Đăng nhập bằng Google' : 'Sign in with Google'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 4. DIAMOND / PRO MEMBERSHIP CARD */}
        <Pressable
          onPress={() => setShowPaywall(true)}
          style={styles.proUpgradeCard}
        >
          <View style={styles.proHeaderRow}>
            <View style={styles.proTitleWrapper}>
              <Text style={styles.proTitleBrand}>TrainXP</Text>
              <View style={styles.diamondBadge}>
                <Text style={styles.diamondText}>DIAMOND</Text>
              </View>
            </View>
            <View style={styles.viewDiamondBtn}>
              <Text style={styles.viewDiamondText}>{isVi ? 'Nâng cấp' : 'Upgrade'}</Text>
            </View>
          </View>

          <Text style={styles.proSubtext}>
            {isVi ? 'Mở khóa AI Progression, 3D Anatomy & Cloud Sync' : 'Unlock AI Progression, 3D Anatomy & Serverless Backup'}
          </Text>

          <View style={styles.proFeatureList}>
            <View style={styles.proFeatureItem}>
              <Feather name="check" size={14} color={THEME.accentGreen} />
              <Text style={styles.proFeatureLabel}>
                {isVi ? 'Tự động tăng tiến Overload theo chu kỳ' : 'Automated Progressive Overload Prescriptions'}
              </Text>
            </View>
            <View style={styles.proFeatureItem}>
              <Feather name="check" size={14} color={THEME.accentGreen} />
              <Text style={styles.proFeatureLabel}>
                {isVi ? 'Kho 1,324 video bài tập & cơ bắp chi tiết' : 'Full 1,324 Exercise Video / GIF Database'}
              </Text>
            </View>
            <View style={styles.proFeatureItem}>
              <Feather name="check" size={14} color={THEME.accentGreen} />
              <Text style={styles.proFeatureLabel}>
                {isVi ? 'Đồng bộ đám mây Supabase Cloud Sync' : 'Zero-VPS Supabase Cloud Backup & Sync'}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* 5. 22-SEGMENT EQUALIZER LEVEL PROGRESS */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionHeaderTitle}>{isVi ? 'Tiến độ cấp độ' : 'Level Progression'}</Text>
            <Text style={styles.xpText}>{stats.xp} / {stats.xpToNext} XP</Text>
          </View>

          <View style={styles.barsTrack}>
            {Array.from({ length: TOTAL_BARS }).map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.segmentBar,
                  idx < filledBars
                    ? { backgroundColor: THEME.accentGreen }
                    : { backgroundColor: '#1C2638' },
                ]}
              />
            ))}
          </View>
        </View>

        {/* 6. WEEKLY RPG QUESTS */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.sectionHeaderTitle}>{isVi ? 'Nhiệm vụ tuần' : 'Weekly Directives'}</Text>
              <Text style={styles.timeRemainingSub}>{isVi ? 'Còn 5 ngày trước chu kỳ mới' : '5 days until cycle reset'}</Text>
            </View>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowChallenges(!showChallenges);
              }}
              style={styles.viewChallengesLink}
            >
              <Text style={styles.viewChallengesText}>
                {showChallenges ? (isVi ? 'Thu gọn' : 'Collapse') : (isVi ? 'Mở rộng' : 'Expand')}
              </Text>
              <Feather
                name={showChallenges ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={THEME.textMuted}
              />
            </Pressable>
          </View>

          {showChallenges && (
            <View style={styles.challengesList}>
              {CHALLENGES.map((item) => (
                <View key={item.id} style={styles.challengeRow}>
                  <Text style={styles.challengeLabel}>{item.label}</Text>
                  <View
                    style={[
                      styles.circleCheck,
                      item.done && { borderColor: THEME.accentGreen, backgroundColor: 'rgba(34, 197, 94, 0.15)' },
                    ]}
                  >
                    {item.done && <Feather name="check" size={12} color={THEME.accentGreen} />}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* PRO PAYWALL MODAL */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribe={() => setShowPaywall(false)}
        onSuccess={() => setShowPaywall(false)}
      />

      {/* SETTINGS & LANGUAGE MODAL */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDim} onPress={() => setShowSettingsModal(false)} />
          <View style={[styles.settingsSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.settingsSheetTitle}>{t.profile.settings}</Text>

            {/* Language Selector */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingGroupLabel}>{t.profile.language}</Text>
              <View style={styles.langSwitchRow}>
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    void setLocale('vi');
                  }}
                  style={[styles.langOptionBtn, locale === 'vi' && styles.langOptionBtnActive]}
                >
                  <Text style={[styles.langOptionText, locale === 'vi' && styles.langOptionTextActive]}>
                    🇻🇳 Tiếng Việt
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    void setLocale('en');
                  }}
                  style={[styles.langOptionBtn, locale === 'en' && styles.langOptionBtnActive]}
                >
                  <Text style={[styles.langOptionText, locale === 'en' && styles.langOptionTextActive]}>
                    🇺🇸 English
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Legal Links */}
            <View style={styles.legalSectionModal}>
              <Pressable
                onPress={() => void Linking.openURL(TERMS_OF_USE_URL)}
                style={styles.legalLinkRow}
              >
                <Feather name="file-text" size={15} color={THEME.textMuted} />
                <Text style={styles.legalLinkModalText}>Terms of Use (EULA)</Text>
              </Pressable>

              <Pressable
                onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
                style={styles.legalLinkRow}
              >
                <Feather name="shield" size={15} color={THEME.textMuted} />
                <Text style={styles.legalLinkModalText}>Privacy Policy</Text>
              </Pressable>
            </View>

            {/* Reset Onboarding Option */}
            <Pressable
              onPress={async () => {
                setShowSettingsModal(false);
                await resetOnboarding();
              }}
              style={styles.resetBtnRow}
            >
              <Feather name="refresh-cw" size={16} color="#E2E8F0" />
              <Text style={styles.resetBtnText}>{t.profile.resetOnboarding}</Text>
            </Pressable>

            {/* Apple Guideline 5.1.1(v): Permanent Account Deletion */}
            <Pressable
              onPress={handleDeleteAccount}
              style={styles.deleteAccountBtnRow}
            >
              <Feather name="trash-2" size={16} color="#EF4444" />
              <Text style={styles.deleteAccountBtnText}>
                {isVi ? 'Xóa vĩnh viễn tài khoản & dữ liệu' : 'Delete Account & Data'}
              </Text>
            </Pressable>

            {/* Close Button */}
            <Pressable
              onPress={() => setShowSettingsModal(false)}
              style={styles.closeSettingsBtn}
            >
              <Text style={styles.closeSettingsText}>{t.common.done}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#161D2B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222E42',
  },
  streakFire: { fontSize: 14 },
  streakCount: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#161D2B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222E42',
  },
  heroSection: { alignItems: 'center', marginVertical: 8 },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarCenter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#131A29',
    borderWidth: 2,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#FFF', fontSize: 28, fontWeight: '900' },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#080C14',
  },
  levelText: { color: '#080C14', fontSize: 10, fontWeight: '900' },
  username: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 2 },
  userRole: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 14 },
  tripleStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1A2333',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 12,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 3 },
  statNumber: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  statLabel: { color: '#64748B', fontSize: 9, fontWeight: '800' },
  statDivider: { width: 1, height: 24, backgroundColor: '#1E293B' },

  /* Radar Card */
  radarCard: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1A2333',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  radarHeader: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 1, alignSelf: 'flex-start', marginBottom: 6 },
  radarSvgWrap: { alignItems: 'center', justifyContent: 'center' },
  radarLabelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 },
  radarBadge: {
    backgroundColor: '#162030',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#233248',
  },
  radarBadgeText: { color: '#38BDF8', fontSize: 10, fontWeight: '700' },

  /* Card General */
  cardContainer: {
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: '#1A2333',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  musclesWorkedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  workedPercentage: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  workedTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  /* Diamond Pro Card */
  proUpgradeCard: {
    backgroundColor: '#111724',
    borderWidth: 1.5,
    borderColor: '#818CF8',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  proHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proTitleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proTitleBrand: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  diamondBadge: {
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
    borderWidth: 1,
    borderColor: '#818CF8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diamondText: { color: '#818CF8', fontSize: 9, fontWeight: '800' },
  viewDiamondBtn: {
    backgroundColor: '#818CF8',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewDiamondText: { color: '#090D16', fontSize: 11, fontWeight: '800' },
  proSubtext: { color: '#94A3B8', fontSize: 12, marginTop: 4, marginBottom: 10 },
  proFeatureList: { gap: 6 },
  proFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proFeatureLabel: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },

  /* Level Progression */
  sectionHeaderTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  xpText: { color: '#22C55E', fontSize: 12, fontWeight: '800' },
  barsTrack: { flexDirection: 'row', justifyContent: 'space-between', gap: 3, marginTop: 8 },
  segmentBar: { flex: 1, height: 18, borderRadius: 2 },

  /* Challenges */
  timeRemainingSub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  viewChallengesLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewChallengesText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  challengesList: { gap: 8, marginTop: 8 },
  challengeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengeLabel: { color: '#CBD5E1', fontSize: 12, flex: 1 },
  circleCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Settings Modal */
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  modalDim: { flex: 1 },
  settingsSheet: {
    backgroundColor: '#111724',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 16,
  },
  settingsSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
  },
  settingGroup: {
    marginBottom: 20,
  },
  settingGroupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 10,
  },
  langSwitchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langOptionBtn: {
    flex: 1,
    backgroundColor: '#162032',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  langOptionBtnActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#13233A',
  },
  langOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  langOptionTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  /* Auth & Account Card */
  authConnectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F1626',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  authInfoCol: {
    flex: 1,
    gap: 4,
  },
  authEmailText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  authProviderBadge: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  signOutText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  authButtonsStack: {
    gap: 10,
    marginTop: 12,
  },
  appleSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 48,
    gap: 8,
  },
  appleIcon: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '700',
    marginTop: -2,
  },
  appleSignInText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  googleSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  googleSignInText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Legal & Delete Account in Modal */
  legalSectionModal: {
    gap: 10,
    marginBottom: 16,
    paddingVertical: 6,
  },
  legalLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  legalLinkModalText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  deleteAccountBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 18,
  },
  deleteAccountBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },

  resetBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#162032',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  closeSettingsBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeSettingsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#080C14',
  },
});
