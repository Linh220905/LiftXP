import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const BLUE_ACCENT = '#38BDF8';
const DARK_BG = '#070B14';
const CARD_BG = '#0E1726';
const CARD_SELECTED_BG = '#11233E';
const BORDER_COLOR = '#1E293B';
const TEXT_MUTED = '#94A3B8';

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

  // Soft delay for close button (1.5 seconds)
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setCanClose(true), 1500);
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

  const handleContinue = async (plan: 'annual' | 'monthly' | 'weekly' = selectedPlan) => {
    if (loading) return;
    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const pkg = offerings ? offerings[plan] : null;
      if (!pkg?.rcPackage) {
        Alert.alert(t.paywall.purchaseError, t.paywall.purchaseErrorDefault);
        return;
      }
      const isSuccess = await purchaseSubscription(pkg);

      if (isSuccess) {
        setProStatus(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (onSuccess) onSuccess();
        else onSubscribe?.(plan);
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
              else onSubscribe?.(selectedPlan);
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

  const isTrialSelected = Boolean(offerings?.[selectedPlan]?.hasTrial);

  const proFeatures = [
    { icon: 'trending-up', title: t.paywall.feature2 },
    { icon: 'activity', title: t.paywall.feature3 },
    { icon: 'award', title: t.paywall.feature1 },
    { icon: 'layers', title: t.paywall.feature4 },
  ] as const;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 6,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* 1. Top Controls Bar */}
          <View style={styles.topBar}>
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
                <Feather name="x" size={18} color="#94A3B8" />
              </Pressable>
            ) : (
              <View style={styles.closePlaceholder} />
            )}
          </View>

          {/* 2. Bold Headline / Branding */}
          <View style={styles.headlineSection}>
            <View style={styles.proPillBadge}>
              <Feather name="zap" size={12} color="#070B14" />
              <Text style={styles.proPillText}>TRAINXP PRO</Text>
            </View>
            <Text style={styles.heroTitle}>{t.paywall.heroTitle}</Text>
            <Text style={styles.heroSubtitle}>{t.paywall.heroSubtitle}</Text>
          </View>

          {/* 3. Comprehensive Feature Highlights (4 Key Pillars) */}
          <View style={styles.featureBox}>
            {proFeatures.map((feat, idx) => (
              <View key={idx} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Feather name={feat.icon} size={13} color={BLUE_ACCENT} />
                </View>
                <Text style={styles.featureText} numberOfLines={2}>
                  {feat.title}
                </Text>
              </View>
            ))}
          </View>

          {/* 4. Enlarged & Prominent Pricing Cards (Annual, Monthly, Weekly) */}
          <View style={styles.pricingSection}>
            {/* Annual (Best Value) */}
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
                  {annualPkg?.priceString || '—'} {t.paywall.perYear}
                </Text>
              </View>
            </Pressable>

            {/* Monthly (Flexible) */}
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
                  {monthlyPkg?.priceString || '—'}
                </Text>
                <Text style={styles.subPrice}>{t.paywall.perMonth}</Text>
              </View>
            </Pressable>

            {/* Weekly (Short Term) */}
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
                  {weeklyPkg?.priceString || '—'}
                </Text>
                <Text style={styles.subPrice}>{t.paywall.perWeek}</Text>
              </View>
            </Pressable>
          </View>

          {/* 5. Bottom Actions & Disclosures */}
          <View style={styles.ctaSection}>
            <Pressable
              onPress={() => void handleContinue()}
              disabled={loading || !offerings?.[selectedPlan]?.rcPackage}
              style={({ pressed }) => [
                styles.ctaButton,
                { opacity: pressed || loading ? 0.9 : !offerings?.[selectedPlan]?.rcPackage ? 0.5 : 1 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#070B14" />
              ) : (
                <View style={styles.ctaRow}>
                  <Text style={styles.ctaText}>
                    {isTrialSelected ? t.paywall.startTrialCta : t.paywall.startCta}
                  </Text>
                  <Feather name="arrow-right" size={17} color="#070B14" />
                </View>
              )}
            </Pressable>

            <View style={styles.guaranteeRow}>
              <Feather name="shield" size={12} color={TEXT_MUTED} />
              <Text style={styles.guaranteeText}>{t.paywall.noCommitment}</Text>
            </View>

            {/* Apple Mandatory Disclosures */}
            <View style={styles.legalSection}>
              <Text style={styles.subscriptionDisclaimer} numberOfLines={2}>
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
                <Feather name="gift" size={26} color={BLUE_ACCENT} />
              </View>

              <Text style={styles.downsellTitle}>{t.paywall.downsellTitle}</Text>
              <Text style={styles.downsellDesc}>{t.paywall.downsellDesc}</Text>

              <View style={styles.downsellOfferBox}>
                <Text style={styles.downsellOfferBadge}>{t.paywall.bestValueBadge}</Text>
                <Text style={styles.downsellOfferPrice}>
                  {annualPkg?.priceString || '—'} {t.paywall.perYear}
                </Text>
                <Text style={styles.downsellOfferSub}>{t.paywall.annualPerMonth}</Text>
              </View>

              <Pressable
                onPress={() => {
                  setShowDownsellModal(false);
                  setSelectedPlan('annual');
                  void handleContinue('annual');
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
    backgroundColor: DARK_BG,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  restoreBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#121927',
  },
  restoreText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121927',
  },
  closePlaceholder: {
    width: 32,
    height: 32,
  },
  headlineSection: {
    alignItems: 'center',
    marginVertical: 4,
  },
  proPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BLUE_ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 14,
    marginBottom: 8,
  },
  proPillText: {
    color: '#070B14',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 29,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 17,
  },
  featureBox: {
    backgroundColor: '#0C1322',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 8,
    marginVertical: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 12.5,
    color: '#E2E8F0',
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  pricingSection: {
    gap: 10,
    marginVertical: 4,
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
    borderWidth: 2,
    shadowColor: BLUE_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  badgeTag: {
    position: 'absolute',
    top: -9,
    right: 14,
    backgroundColor: BLUE_ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  badgeTagText: {
    color: '#070B14',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
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
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: BLUE_ACCENT,
    borderWidth: 2,
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
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  planSub: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  planPrice: {
    alignItems: 'flex-end',
  },
  mainPrice: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  perUnitText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  subPrice: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1.5,
    fontWeight: '500',
  },
  ctaSection: {
    gap: 7,
    marginTop: 4,
  },
  ctaButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: BLUE_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BLUE_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#070B14',
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
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  legalSection: {
    alignItems: 'center',
    gap: 3,
  },
  subscriptionDisclaimer: {
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 13,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLinkText: {
    fontSize: 10.5,
    color: '#94A3B8',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  legalBullet: {
    fontSize: 10,
    color: '#475569',
  },
  /* Downsell Modal Styles */
  downsellBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  downsellCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  downsellIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  downsellTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  downsellDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  downsellOfferBox: {
    width: '100%',
    backgroundColor: '#162238',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BLUE_ACCENT,
    marginBottom: 16,
    position: 'relative',
  },
  downsellOfferBadge: {
    position: 'absolute',
    top: -9,
    backgroundColor: BLUE_ACCENT,
    color: '#070B14',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  downsellOfferPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  downsellOfferSub: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '700',
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
    color: '#070B14',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  downsellDismissBtn: {
    paddingVertical: 8,
  },
  downsellDismissText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
});
