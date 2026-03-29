// Screen: UsernameScreen
// Description: Choose username with live availability check, atmospheric background.
// Navigation: OTPScreen → PhotoScreen

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BackButton }           from '../components/BackButton';
import { PrimaryButton }        from '../components/PrimaryButton';
import { SignalInput }          from '../components/SignalInput';
import { ProgressDots }         from '../components/ProgressDots';
import { AtmosphereBackground } from '../components/AtmosphereBackground';
import { useTheme }             from '../context/ThemeContext';
import { supabase }             from '../supabase/supabaseClient';

const PRIMARY    = '#6C47FF';
const SUCCESS    = '#16A34A';
const ERROR      = '#DC2626';
const MAX_LEN    = 20;
const VALID_REGEX = /^[a-zA-Z0-9_]+$/;

export default function UsernameScreen() {
  const insets      = useSafeAreaInsets();
  const navigation  = useNavigation<any>();
  const { isDark, colors } = useTheme();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [status,   setStatus  ] = useState<'idle' | 'available' | 'short' | 'invalid'>('idle');
  const [timerRef] = React.useState(() => ({ current: null as (ReturnType<typeof setTimeout> | null) }));

  const textPrimary   = colors.textPrimary;
  const textSecondary = colors.textSecondary;

  // ── availability check ──
  const runCheck = useCallback(async () => {
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3) {
      setStatus('short');
      setChecking(false);
      return;
    }
    if (!VALID_REGEX.test(trimmed)) {
      setStatus('invalid');
      setChecking(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', trimmed)
        .maybeSingle();

      if (data) {
        setStatus('invalid'); // Taken
      } else {
        setStatus('available');
      }
    } catch (err) {
      console.error('Username check error:', err);
      setStatus('idle');
    } finally {
      setChecking(false);
    }
  }, [username]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!username) { setStatus('idle'); setChecking(false); return; }
    setChecking(true);
    setStatus('idle');
    timerRef.current = setTimeout(runCheck, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [username, runCheck]);

  const isValid = status === 'available' && name.trim().length >= 2;

  // ── button scale ──
  const buttonScale = useSharedValue(0.97);
  useEffect(() => {
    buttonScale.value = withSpring(isValid ? 1 : 0.97, { damping: 15, stiffness: 300 });
  }, [isValid]);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));

  // ── @ prefix pulse when idle ──
  const atPulse = useSharedValue(0.5);
  useEffect(() => {
    atPulse.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ), -1,
    );
  }, []);
  const atStyle = useAnimatedStyle(() => ({ opacity: username.length > 0 ? 1 : atPulse.value }));

  // ── input glow on focus ──
  const inputGlow = useSharedValue(0);
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: inputGlow.value * 0.3,
    shadowRadius:  inputGlow.value * 12,
  }));

  const handleContinue = async () => {
    if (!isValid) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.replace('Photo', { name: name.trim(), username: username.trim() });
  };

  // ── Done keyboard button — dismiss keyboard but keep input focusable ──
  const handleDone = () => {
    Keyboard.dismiss();
  };

  // ── status icon ──
  const statusIcon = checking ? null
    : status === 'available' ? 'checkmark-circle'
    : (status === 'short' || status === 'invalid') ? 'close-circle'
    : null;
  const statusColor = status === 'available' ? SUCCESS : ERROR;

  return (
    <View style={styles.root}>
      {/* Background */}
      {isDark ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      ) : (
        <LinearGradient
          colors={['#EDE8FF', '#F5F3FF', '#F0EBFF']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <AtmosphereBackground isDark={isDark} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── Scrollable body ── */}
        <View style={[styles.body, { paddingTop: insets.top, paddingHorizontal: 24 }]}>

          {/* Header */}
          <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} />
            <ProgressDots total={4} current={0} />
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Icon + headline */}
          <Animated.View entering={FadeInDown.duration(350).delay(80)} style={styles.heroSection}>
            <View style={styles.iconRingWrap}>
              <View style={[styles.iconRing, { borderColor: isDark ? 'rgba(108,71,255,0.3)' : 'rgba(108,71,255,0.2)' }]}>
                <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(108,71,255,0.15)' : 'rgba(108,71,255,0.1)' }]}>
                  <Animated.Text style={[styles.atSymbol, atStyle, { color: colors.primary }]}>@</Animated.Text>
                </View>
              </View>
            </View>

            <Text style={[styles.headline, { color: colors.textPrimary }]}>{t('username.headline')}</Text>
            <Text style={[styles.subtext, { color: colors.textSecondary }]}>
              {t('username.subtext')}
            </Text>
          </Animated.View>

          {/* Input section */}
          <Animated.View
            entering={FadeInDown.duration(350).delay(160)}
            style={[styles.inputSection, glowStyle, {
              shadowColor: PRIMARY,
              shadowOffset: { width: 0, height: 4 },
            }]}
          >
            <View style={{ gap: 16 }}>
              <SignalInput
                placeholder={t('editProfile.displayNamePlaceholder')}
                value={name}
                onChangeText={setName}
                leftIcon={<Ionicons name="person-outline" size={20} color={colors.primary} />}
                maxLength={30}
                onFocus={() => { inputGlow.value = withTiming(1, { duration: 200 }); }}
                onBlur={()  => { inputGlow.value = withTiming(0, { duration: 200 }); }}
              />

              <SignalInput
                placeholder={t('username.placeholder')}
                value={username}
                onChangeText={setUsername}
                prefix="@"
                maxLength={MAX_LEN}
                returnKeyType="done"
                onSubmitEditing={handleDone}
                blurOnSubmit={true}
                onFocus={() => { inputGlow.value = withTiming(1, { duration: 200 }); }}
                onBlur={()  => { inputGlow.value = withTiming(0, { duration: 200 }); }}
              />
            </View>

            {/* Counter + rules row */}
            <View style={styles.metaRow}>
              <Text style={[styles.rules, { color: textSecondary }]}>
                {t('username.rules')}
              </Text>
              <Text style={[
                styles.counter,
                { color: username.length >= MAX_LEN - 3 ? ERROR : textSecondary },
              ]}>
                {username.length}/{MAX_LEN}
              </Text>
            </View>

            {/* Status pill */}
            <View style={styles.statusWrap}>
              {checking && (
                <View style={styles.statusPill}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.statusText, { color: colors.textSecondary }]}>{t('username.checking')}</Text>
                </View>
              )}
              {!checking && statusIcon && (
                <Animated.View entering={FadeIn.duration(250)} style={[
                  styles.statusPill,
                  { backgroundColor: status === 'available'
                      ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)' },
                ]}>
                  <Ionicons name={statusIcon as any} size={15} color={statusColor} />
                   <Text style={[styles.statusText, { color: statusColor }]}>
                     {status === 'available'
                       ? t('username.available', { name: username })
                       : status === 'short'
                       ? t('username.tooShort')
                       : t('username.invalid')}
                   </Text>
                </Animated.View>
              )}
            </View>
          </Animated.View>

          {/* Tip card */}
          <Animated.View entering={FadeInDown.duration(350).delay(240)} style={[
            styles.tipCard,
            {
              backgroundColor: isDark ? 'rgba(26,21,41,0.7)' : 'rgba(255,255,255,0.7)',
              borderColor:     colors.border,
            },
          ]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              {t('username.tip')}
            </Text>
          </Animated.View>

        </View>

        {/* ── Fixed footer: Continue button — always visible above keyboard ── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(300)}
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) + 8, paddingHorizontal: 24 },
          ]}
        >
          <Animated.View style={btnStyle}>
            <PrimaryButton
              label={t('common.continue')}
              onPress={handleContinue}
              disabled={!isValid}
              progress={0.25}
            />
          </Animated.View>
        </Animated.View>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // KAV fills full height; footer is pinned at the bottom of KAV
  kav: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // Scrollable body — takes all remaining space above footer
  body: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconRingWrap: { marginBottom: 16 },
  iconRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
  },
  atSymbol: { fontSize: 30, fontWeight: 'bold' },
  headline: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', letterSpacing: 0.3 },
  subtext:  { fontSize: 14, marginTop: 6, textAlign: 'center' },

  inputSection: {
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  rules:   { fontSize: 11, flex: 1 },
  counter: { fontSize: 11, marginLeft: 8 },

  statusWrap: { minHeight: 36, marginTop: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 13, fontWeight: '500' },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  tipText: { fontSize: 12, flex: 1, lineHeight: 17 },

  // ── Footer is NOT inside the scrollable body ──
  // It stays pinned just above the keyboard (KAV handles the lift)
  footer: {
    paddingTop: 12,
  },
});