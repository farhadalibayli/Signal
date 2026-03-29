// Screen: OTPScreen
// Description: Premium 6-digit OTP entry with atmospheric background,
//              animated boxes, countdown ring, and security card.
// Navigation: LoginScreen → here → UsernameScreen

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { BackButton }           from '../components/BackButton';
import { AtmosphereBackground } from '../components/AtmosphereBackground';
import { SuccessToast }         from '../components/SuccessToast';
import { useTheme }             from '../context/ThemeContext';
import { supabase }             from '../supabase/supabaseClient';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
type Nav   = NativeStackNavigationProp<RootStackParamList, 'OTP'>;
type Route = RouteProp<RootStackParamList, 'OTP'>;

const PRIMARY     = '#6C47FF';
const ACCENT_DARK = '#9B7FFF';
const OTP_LENGTH  = 6;

function OtpBox({
  digit, isActive, isFilled, isSuccess, isDark,
  titleFont, textPrimary, onPress, colors
}: { digit: string; isActive: boolean; isFilled: boolean; isSuccess: boolean; isDark: boolean; titleFont: string | undefined; textPrimary: string; onPress: () => void; colors: any }) {
  const scale = useSharedValue(1);
  useEffect(() => { scale.value = withTiming(isActive ? 1.05 : 1, { duration: 150 }); }, [isActive]);
  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  let bg = isDark ? colors.surface : '#FFFFFF';
  let borderColor = colors.border;
  let textColor = textPrimary;
  if (isFilled)  { bg = isDark ? '#1E1640' : '#EDE8FF'; borderColor = 'rgba(108,71,255,0.6)'; }
  if (isActive)  { bg = isDark ? '#241D3D' : '#F0EBFF'; borderColor = colors.primary; }
  if (isSuccess) { bg = 'rgba(22,163,74,0.1)'; borderColor = colors.success; textColor = colors.success; }
  return (
    <Pressable onPress={onPress} style={styles.otpBoxPressable}>
      <Animated.View style={[styles.otpBox, boxStyle, { backgroundColor: bg, borderColor, borderWidth: 2, shadowColor: isActive ? PRIMARY : 'transparent', shadowOpacity: isActive ? 0.35 : 0, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: isActive ? 6 : 0 }]}>
        <Text style={[styles.otpDigit, { color: textColor, fontFamily: titleFont }]}>{digit}</Text>
      </Animated.View>
    </Pressable>
  );
}

function ProgressDot({ filled }: { filled: boolean }) {
  const sv = useSharedValue(filled ? 1 : 0);
  useEffect(() => { sv.value = withTiming(filled ? 1 : 0, { duration: 200, easing: Easing.out(Easing.ease) }); }, [filled]);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.7 + 0.3 * sv.value }] }));
  return <Animated.View style={[styles.otpProgressDot, { backgroundColor: filled ? PRIMARY : '#2D2450' }, dotStyle]} />;
}

function TopProgressBar({ progress, colors }: { progress: number; colors: any }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(progress, { duration: 600 }); }, [progress]);
  const s = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));
  return <View style={[styles.topProg, { backgroundColor: colors.border }]}><Animated.View style={[styles.topFill, s, { backgroundColor: colors.primary }]} /></View>;
}

export default function OTPScreen() {
  const insets      = useSafeAreaInsets();
  const navigation  = useNavigation<Nav>();
  const route       = useRoute<Route>();
  const { isDark, colors } = useTheme();
  const { t }       = useTranslation();
  const contact = route.params?.contact ?? '';
  const [code, setCode] = useState('');
  const [resendCountdown, setResendCountdown] = useState(30);
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; title: string; subtitle?: string; type?: 'error' | 'success' | 'info' } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputRef] = React.useState(() => ({ current: null as TextInput | null }));
  const titleFont = 'Poppins_700Bold';
  const bodyFont  = 'Poppins_400Regular';
  const textPrimary = colors.textPrimary;
  const textSecondary = colors.textSecondary;
  const openKeyboard = useCallback(() => { setTimeout(() => { inputRef.current?.focus(); }, 50); }, [inputRef]);
  const bottomDecorOpacity = useSharedValue(1);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => { bottomDecorOpacity.value = withTiming(0, { duration: 200 }); });
    const hide = Keyboard.addListener('keyboardDidHide', () => { bottomDecorOpacity.value = withTiming(1, { duration: 220 }); });
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 350); return () => clearTimeout(t); }, []);
  useEffect(() => { const int = setInterval(() => { setResendCountdown((c) => (c > 0 ? c - 1 : 0)); }, 1000); return () => clearInterval(int); }, []);
  const radius = 20; const circumference = 2 * Math.PI * radius; const countdownProgress = useSharedValue(1);
  useEffect(() => { countdownProgress.value = withTiming(0, { duration: 30_000, easing: Easing.linear }); }, []);
  const animatedCircleProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - countdownProgress.value) }));
  const handleChange = (text: string) => {
    const numeric = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(numeric);
    if (numeric.length === OTP_LENGTH) Keyboard.dismiss();
  };
  const isComplete = code.length === OTP_LENGTH;
  const isEmailContact = /@/.test(contact);

  const handleComplete = useCallback(async () => {
    Keyboard.dismiss();
    if (!isComplete || loading) return;

    setLoading(true);
    try {
      const verifyParams = isEmailContact
        ? { email: contact, token: code, type: 'email' as const }
        : { phone: contact, token: code, type: 'sms' as const };

      const { data, error: vErr } = await supabase.auth.verifyOtp(verifyParams);
      if (vErr) throw vErr;
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsSuccess(true);
      setTimeout(() => { 
        if (data.user?.user_metadata?.username) {
          // Handled by AuthProvider
        } else {
          navigation.replace('Username'); 
        }
      }, 500);
    } catch (e: any) {
      setLoading(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      let errorMsg = e.message;
      if (e.message.toLowerCase().includes('token has expired or is invalid')) {
        errorMsg = t('otp.invalidToken');
      }
      
      setToastConfig({ visible: true, title: t('toasts.verifyFailed'), subtitle: errorMsg, type: 'error' });
      setCode('');
    }
  }, [navigation, code, isComplete, loading, contact, isEmailContact, t]);

  const handleResend = useCallback(async () => {
    if (resendCountdown > 0) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setResendCountdown(30);
    countdownProgress.value = 1;
    countdownProgress.value = withTiming(0, { duration: 30_000, easing: Easing.linear });
    
    try {
      const signInParams = isEmailContact
        ? { email: contact }
        : { phone: contact };

      const { error } = await supabase.auth.signInWithOtp(signInParams);
      if (error) throw error;
      setToastConfig({ visible: true, title: t('otp.codeSent'), subtitle: t('toasts.codeSentSub'), type: 'info' });
    } catch (e: any) {
      setToastConfig({ visible: true, title: t('common.error'), subtitle: e.message, type: 'error' });
    }
    openKeyboard();
  }, [resendCountdown, openKeyboard, contact, isEmailContact, t]);

  const bottomDecorStyle = useAnimatedStyle(() => ({ opacity: bottomDecorOpacity.value }));
  const headlineSecondLine = isEmailContact ? t('otp.email') : t('otp.messages');
  const focusIndex = code.length < OTP_LENGTH ? code.length : OTP_LENGTH - 1;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AtmosphereBackground isDark={isDark} />
      <TopProgressBar progress={0.15} colors={colors} />
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}><BackButton onPress={() => navigation.goBack()} /></Animated.View>
      <View style={styles.topSection}>
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.iconWrap}><View style={[styles.iconCircle, { borderColor: 'rgba(108,71,255,0.4)', backgroundColor: 'rgba(108,71,255,0.15)' }]}><Ionicons name={isEmailContact ? 'mail-outline' : 'call-outline'} size={28} color={PRIMARY} /></View></Animated.View>
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.headlineWrap}><Text style={[styles.headline, { color: textPrimary, fontFamily: titleFont }]}>{t('otp.check')}</Text><Text style={[styles.headline, { color: textPrimary, fontFamily: titleFont }]}>{headlineSecondLine}</Text></Animated.View>
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.subtitleWrap}><Text style={[styles.subtitle, { color: textSecondary, fontFamily: bodyFont }]}>{t('otp.sentTo')}</Text><View style={[styles.contactPill, { borderColor: 'rgba(108,71,255,0.3)', backgroundColor: 'rgba(108,71,255,0.12)' }]}><Text style={[styles.contactText, { color: PRIMARY, fontFamily: titleFont }]} numberOfLines={1}>{contact}</Text></View></Animated.View>
      </View>
      <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.middleSection}>
        <View style={styles.otpRow}>{Array.from({ length: OTP_LENGTH }).map((_, i) => (<OtpBox key={i} digit={code[i] ?? ''} isActive={i === focusIndex && !isComplete} isFilled={i < code.length} isSuccess={isSuccess} isDark={isDark} titleFont={titleFont} textPrimary={textPrimary} onPress={openKeyboard} colors={colors} />))}<TextInput ref={inputRef} style={styles.hiddenInput} keyboardType="number-pad" value={code} onChangeText={handleChange} maxLength={OTP_LENGTH} returnKeyType="done" blurOnSubmit={false} onSubmitEditing={handleComplete} caretHidden={true} /></View>
        {isComplete && !isSuccess && (<Animated.Text entering={FadeInDown.duration(280)} style={[styles.tapToEditHint, { color: textSecondary, fontFamily: bodyFont }]}>{t('otp.tapToEdit')}</Animated.Text>)}
        <View style={styles.otpProgressRow}>{Array.from({ length: OTP_LENGTH }).map((_, i) => (<ProgressDot key={i} filled={i < code.length} />))}</View>
        <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.resendSection}>{resendCountdown > 0 ? (<View style={styles.countdownWrap}><Svg width={48} height={48}><Circle cx={24} cy={24} r={radius} stroke="rgba(108,71,255,0.2)" strokeWidth={3} fill="none" /><AnimatedCircle cx={24} cy={24} r={radius} stroke={PRIMARY} strokeWidth={3} strokeDasharray={`${circumference} ${circumference}`} strokeLinecap="round" fill="none" animatedProps={animatedCircleProps} /></Svg><Text style={[styles.countdownNumber, { color: textPrimary, fontFamily: titleFont }]}>{resendCountdown}</Text><Text style={[styles.resendInfo, { color: textSecondary, fontFamily: bodyFont }]}>{t('otp.resendIn', { count: resendCountdown })}</Text></View>) : (<Animated.Text entering={FadeInDown.duration(300)} onPress={handleResend} style={[styles.resendLink, { color: PRIMARY, fontFamily: titleFont }]}>{t('otp.resendLink')}</Animated.Text>)}</Animated.View>
        <Animated.View entering={FadeInDown.duration(400).delay(550)} style={styles.verifyButtonWrap}>
          <TouchableOpacity onPress={handleComplete} activeOpacity={isComplete ? 0.85 : 1} style={styles.verifyButton} disabled={loading}>
            <LinearGradient colors={isComplete ? ['#7C5CFF', '#6C47FF', '#5A35FF'] : [isDark ? '#2D2450' : '#E5E0FF', isDark ? '#2D2450' : '#E5E0FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.verifyGradient}>
              <Text style={[styles.verifyText, { fontFamily: titleFont, color: isComplete ? '#FFFFFF' : isDark ? 'rgba(155,127,255,0.5)' : '#6B7280' }]}>
                {loading ? t('common.loading') : isSuccess ? t('otp.verified') : t('otp.verify')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
      <Animated.View entering={FadeInUp.duration(400).delay(600)} style={styles.bottomSection}>
        <Animated.View style={[styles.bottomCardWrap, bottomDecorStyle]}>
          <View style={styles.securityCardOuter}><BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /><View style={[styles.securityCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(26,21,41,0.6)' : 'rgba(255,255,255,0.6)' }]}><Ionicons name="time-outline" size={18} color={ACCENT_DARK} /><Text style={[styles.securityText, { color: ACCENT_DARK, fontFamily: bodyFont }]}>{t('otp.validFor')}</Text></View></View>
          <View style={styles.securityHintWrap}><Ionicons name="lock-closed-outline" size={14} color={ACCENT_DARK} /><Text style={[styles.securityHint, { color: ACCENT_DARK, fontFamily: bodyFont }]}>{t('otp.secured')}</Text></View>
          <View style={styles.ripplesWrap}>{[48, 34, 20].map((s, i) => (<View key={i} style={[styles.ripple, { width: s, height: s, borderRadius: s / 2, opacity: [0.4, 0.25, 0.12][i] }]} />))}</View>
        </Animated.View>
      </Animated.View>
      {toastConfig && (<SuccessToast visible={toastConfig.visible} title={toastConfig.title} subtitle={toastConfig.subtitle} type={toastConfig.type} onHide={() => setToastConfig(null)} />)}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topProg: { height: 3, width: '100%', overflow: 'hidden' },
  topFill: { height: '100%' },
  header:    { paddingHorizontal: 24, marginBottom: 12 },
  topSection: { alignItems: 'center' },
  iconWrap: { marginTop: 8 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  headlineWrap: { marginTop: 20, alignItems: 'center' },
  headline:     { fontSize: 28, lineHeight: 36, textAlign: 'center' },
  subtitleWrap: { marginTop: 10, alignItems: 'center', paddingHorizontal: 24 },
  subtitle:     { fontSize: 14, textAlign: 'center' },
  contactPill: { marginTop: 6, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1 },
  contactText: { fontSize: 14 },
  middleSection: { marginTop: 36, paddingHorizontal: 24 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  otpBoxPressable: { flex: 1, marginHorizontal: 3 },
  otpBox: { aspectRatio: 0.85, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  otpDigit: { fontSize: 22, fontWeight: 'bold' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  tapToEditHint: { fontSize: 11, textAlign: 'center', marginTop: 6 },
  otpProgressRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  otpProgressDot: { width: 6, height: 6, borderRadius: 3 },
  resendSection: { marginTop: 28, alignItems: 'center' },
  countdownWrap: { alignItems: 'center' },
  countdownNumber: { position: 'absolute', top: 14, fontSize: 14, textAlign: 'center', width: 48 },
  resendInfo: { marginTop: 4, fontSize: 12 },
  resendLink: { fontSize: 14, textDecorationLine: 'underline' },
  verifyButtonWrap: { marginTop: 32 },
  verifyButton: { borderRadius: 16, overflow: 'hidden' },
  verifyGradient: { height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  verifyText: { fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  bottomSection: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24 },
  bottomCardWrap: { width: '100%', alignItems: 'center' },
  securityCardOuter: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  securityCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1, gap: 8 },
  securityText: { fontSize: 13 },
  securityHintWrap: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  securityHint: { fontSize: 11 },
  ripplesWrap: { marginTop: 24, alignItems: 'center', justifyContent: 'center', height: 52 },
  ripple: { position: 'absolute', borderWidth: 1, borderColor: PRIMARY },
});
