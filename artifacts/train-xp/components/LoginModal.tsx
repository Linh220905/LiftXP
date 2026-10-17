import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Text, TextInput } from "@/components/AppTypography";
import { GoogleLogo } from "@/components/GoogleLogo";
import { useAppState } from "@/context/AppState";
import { useI18n } from "@/lib/i18n";

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ visible, onClose, onSuccess }: LoginModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { loginGoogle, loginApple, loginPassword } = useAppState();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authType, setAuthType] = useState<
    "password" | "google" | "apple" | null
  >(null);

  const resetState = () => {
    setIdentifier("");
    setPassword("");
    setShowPassword(false);
    setLoading(false);
    setAuthType(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const handlePasswordLogin = async () => {
    const trimmedId = identifier.trim();
    const trimmedPass = password.trim();

    if (!trimmedId || !trimmedPass) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        t.onboarding.missingFieldsTitle,
        t.onboarding.missingFieldsMsg,
      );
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setAuthType("password");

    try {
      const ok = await loginPassword(trimmedId, trimmedPass);
      if (ok) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        resetState();
        onClose();
        onSuccess?.();
      } else {
        throw new Error(t.onboarding.incorrectCredentialsMsg);
      }
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t.onboarding.signInFailedTitle,
        err?.message || t.onboarding.signInFailedMsg,
      );
    } finally {
      setLoading(false);
      setAuthType(null);
    }
  };

  const handleGoogleLogin = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setAuthType("google");
    try {
      const ok = await loginGoogle();
      if (ok) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        resetState();
        onClose();
        onSuccess?.();
      }
    } catch (err: any) {
      Alert.alert(
        "Google Sign In",
        err?.message || t.onboarding.googleSignInError,
      );
    } finally {
      setLoading(false);
      setAuthType(null);
    }
  };

  const handleAppleLogin = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setAuthType("apple");
    try {
      const ok = await loginApple();
      if (ok) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        resetState();
        onClose();
        onSuccess?.();
      }
    } catch (err: any) {
      Alert.alert(
        "Apple Sign In",
        err?.message || t.onboarding.appleSignInError,
      );
    } finally {
      setLoading(false);
      setAuthType(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={handleClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardWrap}
        >
          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            {/* Header Handle */}
            <View style={styles.sheetHandle} />

            {/* Top Bar with Close */}
            <View style={[styles.headerRow, { justifyContent: "flex-end" }]}>
              <Pressable
                onPress={handleClose}
                hitSlop={12}
                disabled={loading}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={20} color="#94A3B8" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollBody}
            >
              <Text style={styles.titleText}>
                {t.onboarding.signInTitle}
              </Text>
              <Text style={styles.subtitleText}>
                {t.onboarding.signInSubtitle}
              </Text>

              {/* Input 1: Username or Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {t.onboarding.usernameOrEmail}
                </Text>
                <View style={styles.inputContainer}>
                  <Feather
                    name="user"
                    size={17}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputField}
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Input 2: Password */}
              <View style={[styles.fieldGroup, { marginTop: 14 }]}>
                <Text style={styles.fieldLabel}>
                  {t.onboarding.passwordLabel}
                </Text>
                <View style={styles.inputContainer}>
                  <Feather
                    name="lock"
                    size={17}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputField}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handlePasswordLogin}
                    editable={!loading}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={10}
                    style={styles.eyeBtn}
                  >
                    <Feather
                      name={showPassword ? "eye" : "eye-off"}
                      size={18}
                      color="#64748B"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Primary Submit Button */}
              <Pressable
                onPress={handlePasswordLogin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.btnPressed,
                  loading && styles.btnDisabled,
                ]}
              >
                <LinearGradient
                  colors={["#38BDF8", "#0284C7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitBtnGradient}
                >
                  {loading && authType === "password" ? (
                    <ActivityIndicator size="small" color="#04121F" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>
                        {t.onboarding.signInBtn}
                      </Text>
                      <Feather name="arrow-right" size={18} color="#04121F" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Divider: OR */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>
                  {t.onboarding.orContinueWith}
                </Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login 1: Google (100% Authentic Official 4-color Logo) */}
              <Pressable
                onPress={handleGoogleLogin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.socialBtn,
                  styles.googleBtn,
                  pressed && styles.btnPressed,
                  loading && styles.btnDisabled,
                ]}
              >
                {loading && authType === "google" ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <View style={styles.googleIconBox}>
                      <GoogleLogo size={20} />
                    </View>
                    <Text style={styles.googleBtnText}>
                      {t.onboarding.continueWithGoogle}
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Social Login 2: Apple (iOS only) */}
              {Platform.OS === "ios" && (
                <Pressable
                  onPress={handleAppleLogin}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.socialBtn,
                    styles.appleBtn,
                    pressed && styles.btnPressed,
                    loading && styles.btnDisabled,
                  ]}
                >
                  {loading && authType === "apple" ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <FontAwesome
                        name="apple"
                        size={20}
                        color="#FFFFFF"
                        style={{ marginRight: 10 }}
                      />
                      <Text style={styles.appleBtnText}>
                        {t.onboarding.continueWithApple}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.75)",
    justifyContent: "flex-end",
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFill,
  },
  keyboardWrap: {
    width: "100%",
  },
  sheetContainer: {
    backgroundColor: "#0B101D",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#1E293B",
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "92%",
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#334155",
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#38BDF8",
  },
  brandBadgeText: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#161F32",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    paddingBottom: 16,
  },
  titleText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 19,
  },
  fieldGroup: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#CBD5E1",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 14,
    paddingVertical: 12,
  },
  eyeBtn: {
    padding: 6,
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
    borderRadius: 10,
    padding: 10,
    marginTop: 16,
    marginBottom: 18,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 16,
  },
  submitBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  submitBtnText: {
    color: "#04121F",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1E293B",
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  googleBtn: {
    backgroundColor: "#151D2D",
    borderWidth: 1,
    borderColor: "#26354D",
    marginBottom: 12,
  },
  googleIconBox: {
    marginRight: 12,
  },
  googleBtnText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  appleBtn: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#27272A",
  },
  appleBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
