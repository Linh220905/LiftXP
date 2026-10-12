import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '@/context/AppState';
import { useI18n } from '@/lib/i18n';
import {
  fetchOfferings,
  type PackageDisplay,
  PRIVACY_POLICY_URL,
  purchaseSubscription,
  restoreSubscription,
  TERMS_OF_USE_URL,
} from '@/lib/purchases';

const { width } = Dimensions.get('window');

const BLUE_ACCENT = '#38BDF8';
const DARK_BG = '#090D16';
const CARD_BG = '#121A28';
const CARD_SELECTED_BG = '#13223A';
const BORDER_COLOR = '#1E293B';
const TEXT_MUTED = '#94A3B8';

// Fallback / Hero image
const PAYWALL_HERO_IMG = require('../assets/images/paywall_hero.png');

interface PaywallModalProps {
  visible?: boolean;
  onClose: () => void;
  onSubscribe?: (plan: 'annual' | 'monthly' | 'weekly') => void;
  onSuccess?: () => void;
}

export function PaywallModal({
  visible = true,
  onClose,
  onSubscribe,
  onSuccess,
}: PaywallModalProps) {
  const insets = useSafeAreaInsets();
  const { setProStatus } = useAppState();
  const { t } = useI18n();

  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly' | 'weekly'>('annual');
  const [canClose, setCanClose] = useState(false);
  const [hasShownDownsell, setHasShownDownsell] = useState(false);
  const [showDownsellModal, setShowDownsellModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState<{
    annual: PackageDisplay;
    monthly: PackageDisplay;
    weekly: PackageDisplay;
  } | null>(null);

  // Soft delay for close button (2 seconds to maximize read time)
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setCanClose(true), 2000);
    return () => clearTimeout(timer);
  }, [visible]);

  // Load packages from RevenueCat
  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    fetchOfferings().then((data) => {
      if (isMounted) setOfferings(data);
    });
    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleSelectPlan = (plan: 'annual' | 'monthly' | 'weekly') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
  };

  const handleCloseAttempt = () => {
    if (!hasShownDownsell) {
      setHasShownDownsell(true);
      setShowDownsellModal(true);
      return;
    }
    onClose();
  };

  const handleContinue = async () => {
    if (loading) return;
    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const pkg = offerings ? offerings[selectedPlan] : null;
      const isSuccess = pkg ? await purchaseSubscription(pkg) : true;

      if (isSuccess) {
        setProStatus(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (onSubscribe) onSubscribe(selectedPlan);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t.paywall.purchaseError, err?.message || t.paywall.purchaseErrorDefault);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (loading) return;
    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const restored = await restoreSubscription();
      if (restored) {
        setProStatus(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t.paywall.restoreSuccess, t.paywall.restoreSuccessDesc, [
          {
            text: 'OK',
            onPress: () => {
              if (onSuccess) onSuccess();
              onClose();
            },
          },
        ]);
      } else {
        Alert.alert(t.paywall.noSubFound, t.paywall.noSubFoundDesc);
      }
    } catch (err: any) {
      Alert.alert(t.paywall.restoreFailed, err?.message || t.paywall.restoreFailedDesc);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = (url: string) => {
    void Haptics.selectionAsync();
    void Linking.openURL(url);
  };

  const annualPkg = offerings?.annual;
  const monthlyPkg = offerings?.monthly;
  const weeklyPkg = offerings?.weekly;

  const isTrialSelected = selectedPlan === 'annual';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[styles.container, { backgroundColor: DARK_BG }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 36 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Hero Section with Ambient Fade */}
          <View style={styles.heroContainer}>
            <Image
              source={PAYWALL_HERO_IMG}
              style={styles.heroImage}
              resizeMode="cover"
            />
            {/* Soft gradient from mid downwards */}
            <LinearGradient
              colors={[
                'rgba(9, 13, 22, 0.1)',
                'rgba(9, 13, 22, 0.3)',
                'rgba(9, 13, 22, 0.75)',
                DARK_BG,
              ]}
              locations={[0, 0.4, 0.75, 1]}
              style={styles.heroGradient}
            />

            {/* Top Bar Floating Controls */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
              <Pressable
                onPress={handleRestore}
                hitSlop={12}
                disabled={loading}
                style={styles.restoreBtn}
              >
                <Text style={styles.restoreText}>{t.paywall.restorePurchases}</Text>
              </Pressable>

              {canClose ? (
                <Pressable
                  onPress={handleCloseAttempt}
                  hitSlop={14}
                  style={styles.closeButton}
                >
                  <Feather name="x" size={18} color="#FFFFFF" />
                </Pressable>
              ) : (
                <View style={styles.closePlaceholder} />
              )}
            </View>
          </View>

          {/* Main Body Content */}
          <View style={styles.contentWrap}>
            {/* Headline Text */}
            <View style={styles.headlineSection}>
              <View style={styles.proPillBadge}>
                <Feather name="zap" size={12} color="#090D16" />
                <Text style={styles.proPillText}>TRAINXP PRO</Text>
              </View>
              <Text style={styles.heroTitle}>{t.paywall.heroTitle}</Text>
              <Text style={styles.heroSubtitle}>{t.paywall.heroSubtitle}</Text>
            </View>

            {/* Feature Perks Checklist */}
            <View style={styles.featureBox}>
              <Text style={styles.featureSectionTitle}>{t.paywall.featureTitle}</Text>
              {[
                t.paywall.feature1,
                t.paywall.feature2,
                t.paywall.feature3,
                t.paywall.feature4,
              ].map((feat, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <View style={styles.checkIconWrap}>
                    <Feather name="check" size={14} color={BLUE_ACCENT} />
                  </View>
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}
            </View>

            {/* 3 Pricing Cards */}
            <View style={styles.pricingSection}>
              {/* 1. Annual (Best Value) */}
              <Pressable
                onPress={() => handleSelectPlan('annual')}
                style={[
                  styles.planCard,
                  selectedPlan === 'annual' && styles.planCardSelected,
                ]}
              >
                <View style={styles.badgeTag}>
                  <Text style={styles.badgeTagText}>{t.paywall.bestValueBadge}</Text>
                </View>

                <View style={styles.planLeft}>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedPlan === 'annual' && styles.radioCircleActive,
                    ]}
                  >
                    {selectedPlan === 'annual' && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planTitle}>{t.paywall.annualTitle}</Text>
                    <Text style={styles.planSub}>{t.paywall.annualSub}</Text>
                  </View>
                </View>

                <View style={styles.planPrice}>
                  <Text style={styles.mainPrice}>
                    {annualPkg?.perMonthPrice || '41.500 ₫'}
                    <Text style={styles.perUnitText}>{t.paywall.perMonth}</Text>
                  </Text>
                  <Text style={styles.subPrice}>
                    {annualPkg?.priceString || '499.000 ₫'} {t.paywall.perYear}
                  </Text>
                </View>
              </Pressable>

              {/* 2. Monthly (Flexible) */}
              <Pressable
                onPress={() => handleSelectPlan('monthly')}
                style={[
                  styles.planCard,
                  selectedPlan === 'monthly' && styles.planCardSelected,
                ]}
              >
                <View style={styles.planLeft}>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedPlan === 'monthly' && styles.radioCircleActive,
                    ]}
                  >
                    {selectedPlan === 'monthly' && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planTitle}>{t.paywall.monthlyTitle}</Text>
                    <Text style={styles.planSub}>{t.paywall.monthlySub}</Text>
                  </View>
                </View>

                <View style={styles.planPrice}>
                  <Text style={styles.mainPrice}>
                    {monthlyPkg?.priceString || '129.000 ₫'}
                  </Text>
                  <Text style={styles.subPrice}>{t.paywall.perMonth}</Text>
                </View>
              </Pressable>

              {/* 3. Weekly (Short Term) */}
              <Pressable
                onPress={() => handleSelectPlan('weekly')}
                style={[
                  styles.planCard,
                  selectedPlan === 'weekly' && styles.planCardSelected,
                ]}
              >
                <View style={styles.planLeft}>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedPlan === 'weekly' && styles.radioCircleActive,
                    ]}
                  >
                    {selectedPlan === 'weekly' && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planTitle}>{t.paywall.weeklyTitle}</Text>
                    <Text style={styles.planSub}>{t.paywall.weeklySub}</Text>
                  </View>
                </View>

                <View style={styles.planPrice}>
                  <Text style={styles.mainPrice}>
                    {weeklyPkg?.priceString || '49.000 ₫'}
                  </Text>
                  <Text style={styles.subPrice}>{t.paywall.perWeek}</Text>
                </View>
              </Pressable>
            </View>

            {/* Bottom Actions & Guarantee */}
            <View style={styles.ctaSection}>
              <Pressable
                onPress={handleContinue}
                disabled={loading}
                style={({ pressed }) => [
                  styles.ctaButton,
                  { backgroundColor: BLUE_ACCENT, opacity: pressed || loading ? 0.88 : 1 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#090D16" />
                ) : (
                  <View style={styles.ctaRow}>
                    <Text style={styles.ctaText}>
                      {isTrialSelected ? t.paywall.startTrialCta : t.paywall.startCta}
                    </Text>
                    <Feather name="arrow-right" size={18} color="#090D16" />
                  </View>
                )}
              </Pressable>

              <View style={styles.guaranteeRow}>
                <Feather name="shield" size={13} color={TEXT_MUTED} />
                <Text style={styles.guaranteeText}>{t.paywall.noCommitment}</Text>
              </View>

              {/* Apple Mandatory Subscription Disclosures & Legal Links */}
              <View style={styles.legalSection}>
                <Text style={styles.subscriptionDisclaimer}>
                  {t.paywall.autoRenewDisclosure}
                </Text>

                <View style={styles.legalLinksRow}>
                  <Pressable onPress={() => handleOpenLink(TERMS_OF_USE_URL)} hitSlop={8}>
                    <Text style={styles.legalLinkText}>{t.paywall.termsOfUse}</Text>
                  </Pressable>
                  <Text style={styles.legalBullet}>•</Text>
                  <Pressable onPress={() => handleOpenLink(PRIVACY_POLICY_URL)} hitSlop={8}>
                    <Text style={styles.legalLinkText}>{t.paywall.privacyPolicy}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Exit Intent / Downsell Modal */}
        <Modal
          visible={showDownsellModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowDownsellModal(false);
            onClose();
          }}
        >
          <View style={styles.downsellBackdrop}>
            <View style={styles.downsellCard}>
              <View style={styles.downsellIconCircle}>
                <Feather name="gift" size={28} color={BLUE_ACCENT} />
              </View>

              <Text style={styles.downsellTitle}>{t.paywall.downsellTitle}</Text>
              <Text style={styles.downsellDesc}>{t.paywall.downsellDesc}</Text>

              <View style={styles.downsellOfferBox}>
                <Text style={styles.downsellOfferBadge}>{t.paywall.bestValueBadge}</Text>
                <Text style={styles.downsellOfferPrice}>
                  {annualPkg?.priceString || '499.000 ₫'} {t.paywall.perYear}
                </Text>
                <Text style={styles.downsellOfferSub}>{t.paywall.annualPerMonth}</Text>
              </View>

              <Pressable
                onPress={() => {
                  setShowDownsellModal(false);
                  setSelectedPlan('annual');
                  void handleContinue();
                }}
                style={styles.downsellCtaBtn}
              >
                <Text style={styles.downsellCtaText}>{t.paywall.downsellCta}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowDownsellModal(false);
                  onClose();
                }}
                style={styles.downsellDismissBtn}
              >
                <Text style={styles.downsellDismissText}>{t.paywall.downsellDismiss}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    zIndex: 10,
  },
  restoreBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(9, 13, 22, 0.6)',
  },
  restoreText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 13, 22, 0.65)',
  },
  closePlaceholder: {
    width: 32,
    height: 32,
  },
  contentWrap: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  headlineSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  proPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BLUE_ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  proPillText: {
    color: '#090D16',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  featureBox: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 16,
    gap: 10,
  },
  featureSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: BLUE_ACCENT,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '600',
    flex: 1,
  },
  pricingSection: {
    gap: 10,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: BLUE_ACCENT,
    backgroundColor: CARD_SELECTED_BG,
    shadowColor: BLUE_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  badgeTag: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: BLUE_ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeTagText: {
    color: '#090D16',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: BLUE_ACCENT,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLUE_ACCENT,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  planSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  planPrice: {
    alignItems: 'flex-end',
  },
  mainPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  perUnitText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  subPrice: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  ctaSection: {
    gap: 12,
  },
  ctaButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BLUE_ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#090D16',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  guaranteeText: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  legalSection: {
    marginTop: 10,
    alignItems: 'center',
    gap: 8,
  },
  subscriptionDisclaimer: {
    fontSize: 10.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLinkText: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  legalBullet: {
    fontSize: 11,
    color: '#475569',
  },
  /* Downsell Modal Styles */
  downsellBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  downsellCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  downsellIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  downsellTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  downsellDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  downsellOfferBox: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BLUE_ACCENT,
  },
  downsellOfferBadge: {
    color: BLUE_ACCENT,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  downsellOfferPrice: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  downsellOfferSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  downsellCtaBtn: {
    width: '100%',
    height: 48,
    backgroundColor: BLUE_ACCENT,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  downsellCtaText: {
    color: '#090D16',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  downsellDismissBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  downsellDismissText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
});
