// Screen: LoginScreen
// Description: Premium phone/email entry with atmospheric background,
//              radar hero, glassmorphism card, and scrollable layout.
// Navigation: Splash → here → OTPScreen (contact param)

import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeOut, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { RadarAnimation } from '../components/RadarAnimation';
import { AtmosphereBackground } from '../components/AtmosphereBackground';
import { SignalInput } from '../components/SignalInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { SuccessToast } from '../components/SuccessToast';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase/supabaseClient';


type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const containsLetter = (s: string) => /[a-zA-Z]/.test(s);
const isEmailMode = (s: string) => containsLetter(s) || s.includes('@');

// ─── Email validation (RFC-simplified) ───────────────────────────────────────
function validateEmail(email: string, t: any): string | null {
  const trimmed = email.trim();
  if (!trimmed.includes('@')) return t('login.validations.missingAt');
  const [local, ...domainParts] = trimmed.split('@');
  const domain = domainParts.join('@');
  if (!local) return t('login.validations.nothingBeforeAt');
  if (local.startsWith('.')) return t('login.validations.dotStart');
  if (local.endsWith('.')) return t('login.validations.dotEnd');
  if (local.includes('..')) return t('login.validations.consecutiveDots');
  if (!domain) return t('login.validations.missingDomain');
  if (!domain.includes('.')) return t('login.validations.domainDot');
  if (domain.startsWith('.')) return t('login.validations.domainStartDot');
  if (domain.endsWith('.')) return t('login.validations.domainEndDot');
  if (domainParts.length > 1) return t('login.validations.oneAt');
  if (!/^[a-zA-Z0-9._%+\-]+$/.test(local)) return t('login.validations.invalidEmail');
  return null;
}

function validatePhone(phone: string, t: any): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return t('login.validations.phoneShort');
  if (digits.length > 15) return t('login.validations.phoneLong');
  return null;
}

function TrustCard({ isDark, colors }: { isDark: boolean; colors: any }) {
  const { t } = useTranslation();
  const cardBg = isDark ? 'rgba(26,21,41,0.85)' : 'rgba(255,255,255,0.90)';
  const cardBdr = colors.border;
  const label = colors.textPrimary;
  const sub = colors.textSecondary;
  const divider = colors.border;

  const items = [
    { icon: 'lock-closed-outline' as const, title: t('login.trust.private'), desc: t('login.trust.privateDesc') },
    { icon: 'flash-outline' as const, title: t('login.trust.instant'), desc: t('login.trust.instantDesc') },
    { icon: 'timer-outline' as const, title: t('login.trust.ephemeral'), desc: t('login.trust.ephemeralDesc') },
  ];

  return (
    <View style={[styles.trustCard, {
      backgroundColor: cardBg,
      borderColor: cardBdr,
      ...(isDark ? {} : {
        shadowColor: 'rgba(108,71,255,0.18)',
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        elevation: 4,
      }),
    }]}>
      <View style={styles.trustRow}>
        {items.map((item, idx) => (
          <React.Fragment key={item.title}>
            {idx > 0 && <View style={[styles.trustDivider, { backgroundColor: divider }]} />}
            <View style={styles.trustItem}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
              <Text style={[styles.trustLabel, { color: label }]}>{item.title}</Text>
              <Text style={[styles.trustSub, { color: sub }]}>{item.desc}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function TermsText({ isDark, colors, onPress }: { isDark: boolean; colors: any; onPress: () => void }) {
  const { t } = useTranslation();
  const muted = isDark ? 'rgba(155,127,255,0.65)' : 'rgba(107,114,128,0.65)';
  const termsSuffix = t('login.termsSuffix');
  return (
    <Text style={[styles.termsText, { color: muted }]}>
      {t('login.termsText')}
      <Text onPress={onPress} style={[styles.termsLink, { color: colors.primary }]}>{t('login.termsLink')}</Text>
      {t('login.and')}
      <Text onPress={onPress} style={[styles.termsLink, { color: colors.primary }]}>{t('login.privacyLink')}</Text>
      {termsSuffix ? termsSuffix : null}
    </Text>
  );
}

// ─── TopProgressBar ──────────────────────────────────────────────────────────
function TopProgressBar({ progress, colors }: { progress: number; colors: any }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(progress, { duration: 600 }); }, [progress]);
  const s = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));
  return (
    <View style={[styles.topProg, { backgroundColor: colors.border }]}>
      <Animated.View style={[styles.topFill, s, { backgroundColor: colors.primary }]} />
    </View>
  );
}

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { isDark, colors } = useTheme();
  const { t } = useTranslation();

  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; title: string; subtitle?: string; type?: 'error' | 'success' | 'info' } | null>(null);

  const boldFont = 'Poppins_700Bold';
  const regularFont = 'Poppins_400Regular';
  const textPrimary = isDark ? '#FFFFFF' : '#1A1529';

  const emailMode = isEmailMode(value);

  useEffect(() => {
    const digits = value.replace(/\D/g, '').length;
    setShowHint(digits >= 2 && !emailMode);
    if (inputError) setInputError(null);
  }, [value]);

  const handleContinue = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setInputError(t('login.emptyError'));
      setToastConfig({ visible: true, title: t('toasts.missingContact'), subtitle: t('login.emptyError'), type: 'error' });
      return;
    }

    const error = emailMode ? validateEmail(trimmed, t) : validatePhone(trimmed, t);
    if (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setInputError(error);
      setToastConfig({ visible: true, title: t('toasts.validationError'), subtitle: error, type: 'error' });
      return;
    }

    if (!emailMode) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const unavailableMsg = t('login.validations.phoneUnavailable');
      setInputError(unavailableMsg);
      setToastConfig({ visible: true, title: t('common.sorry'), subtitle: unavailableMsg, type: 'error' });
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setInputError(null);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        [emailMode ? 'email' : 'phone']: trimmed,
      });

      if (otpError) {
        throw otpError;
      }

      setLoading(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      (navigation as any).navigate('OTP', { contact: trimmed });
    } catch (error: any) {
      setLoading(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = error.message || t('toasts.verifyFailed');
      setInputError(msg);
      setToastConfig({ visible: true, title: t('toasts.validationError'), subtitle: msg, type: 'error' });
    }
  };

  const leftIcon = (
    <View style={styles.iconWrap}>
      <Ionicons name={emailMode ? 'mail-outline' : 'call-outline'} size={18} color={colors.primary} />
    </View>
  );

  const modeLabel = emailMode ? t('login.emailDetected') : t('login.phoneDetected');
  const canContinue = value.trim().length > 0 && !loading;

  return (
    <View style={styles.root}>
      {isDark ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      ) : (
        <LinearGradient colors={['#EDE8FF', '#F5F3FF', '#F0EBFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}

      <View style={StyleSheet.absoluteFill} pointerEvents="none"><AtmosphereBackground isDark={isDark} /></View>

      <SafeAreaView style={[styles.safe, { backgroundColor: isDark ? colors.background : 'transparent' }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Onboarding Top Progress */}
        <TopProgressBar progress={0.05} colors={colors} />

        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.section1}>
              <RadarAnimation size={160} isDark={isDark} />
              <Text style={[styles.appName, { color: textPrimary, fontFamily: boldFont }]}>{t('login.brand')}</Text>
              <View style={[styles.underline, { backgroundColor: colors.primary }]} />
              <Text style={[styles.headline, { color: textPrimary, fontFamily: boldFont }]}>{t('login.headline')}</Text>
              <Text style={[styles.tagline, { color: isDark ? colors.accent : colors.primary, fontFamily: regularFont }]}>{t('login.tagline')}</Text>
            </View>

            <View style={styles.section2}>
              {value.length > 0 && (
                <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(180)}
                  style={[styles.modeBadge, {
                    backgroundColor: emailMode ? (isDark ? 'rgba(108,71,255,0.15)' : 'rgba(108,71,255,0.08)') : (isDark ? 'rgba(22,163,74,0.12)' : 'rgba(22,163,74,0.08)'),
                    borderColor: emailMode ? 'rgba(108,71,255,0.35)' : 'rgba(22,163,74,0.35)',
                  }]}
                >
                  <Ionicons name={emailMode ? 'mail-outline' : 'call-outline'} size={12} color={emailMode ? colors.primary : colors.success} />
                  <Text style={[styles.modeBadgeText, { color: emailMode ? colors.primary : colors.success, fontFamily: regularFont }]}>{modeLabel}</Text>
                </Animated.View>
              )}

              <SignalInput placeholder={t('login.inputPlaceholder')} value={value} onChangeText={setValue} leftIcon={leftIcon} keyboardType="default" autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={handleContinue} />

              {inputError && (
                <Animated.View entering={FadeInDown.duration(240)} style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                  <Text style={[styles.errorText, { fontFamily: regularFont }]}>{inputError}</Text>
                </Animated.View>
              )}

              {showHint && !inputError && !!t('login.phoneHint') && (
                <Animated.Text entering={FadeInDown.duration(280)} exiting={FadeOut.duration(200)} style={[styles.phoneHint, { color: colors.accent, fontFamily: regularFont }]}>{t('login.phoneHint')}</Animated.Text>
              )}

              <PrimaryButton label={t('common.continue')} onPress={handleContinue} disabled={!canContinue} loading={loading} style={styles.button} progress={canContinue ? 0.05 : 0} />
            </View>

            <View style={styles.section3}><TrustCard isDark={isDark} colors={colors} /></View>
            <View style={styles.section4}><TermsText isDark={isDark} colors={colors} onPress={() => { }} /></View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {toastConfig && (
        <SuccessToast visible={toastConfig.visible} title={toastConfig.title} subtitle={toastConfig.subtitle} type={toastConfig.type} onHide={() => setToastConfig(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  topProg: { height: 3, width: '100%', overflow: 'hidden' },
  topFill: { height: '100%' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  section1: { alignItems: 'center', paddingTop: 16 },
  appName: { fontSize: 38, fontWeight: 'bold', letterSpacing: 10, marginTop: 16 },
  underline: { width: 40, height: 2, borderRadius: 1, marginTop: 8 },
  headline: { fontSize: 22, fontWeight: 'bold', marginTop: 14, textAlign: 'center', lineHeight: 30 },
  tagline: { fontSize: 14, marginTop: 8, textAlign: 'center', letterSpacing: 0.4 },
  section2: { marginTop: 32 },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginBottom: 8 },
  modeBadgeText: { fontSize: 12, fontWeight: '500' },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(108,71,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, marginLeft: 2 },
  errorText: { color: '#DC2626', fontSize: 12 },
  phoneHint: { fontSize: 11, marginTop: 8, marginLeft: 4 },
  button: { marginTop: 14 },
  section3: { marginTop: 28 },
  trustCard: { borderWidth: 1, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 10 },
  trustRow: { flexDirection: 'row', alignItems: 'center' },
  trustItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  trustLabel: { fontSize: 13, fontWeight: 'bold', marginTop: 6, textAlign: 'center' },
  trustSub: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  trustDivider: { width: 1, height: 44 },
  section4: { marginTop: 20, marginBottom: 8, alignItems: 'center', paddingHorizontal: 8 },
  termsText: { fontSize: 11, textAlign: 'center', lineHeight: 17 },
  termsLink: { textDecorationLine: 'underline', fontWeight: '600' },
});