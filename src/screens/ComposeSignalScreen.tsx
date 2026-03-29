/**
 * ComposeSignalScreen
 * Light-first design with full dark-mode support.
 * Horizontal scroll rows (emoji, TypeSelector) are direct children of the
 * main ScrollView — never nested inside a borderRadius view — to avoid
 * Android compositor clipping.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TextInput, KeyboardAvoidingView, Platform,
  Pressable, Dimensions, TouchableOpacity, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  FadeInDown, FadeIn, FadeInUp,
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withSequence, withRepeat, Easing,
  runOnJS, interpolate, Extrapolation, withDelay
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COMPOSE_TYPES } from '../data/composeTypes';
import { TypeSelector } from '../components/TypeSelector';
import { DurationPicker } from '../components/DurationPicker';
import { LocationPicker } from '../components/LocationPicker';
import { LocationMapPreview } from '../components/LocationMapPreview';
import { useUserLocation } from '../hooks/useUserLocation';
import { supabase } from '../supabase/supabaseClient';
import type { SignalData, LocationData, GroupData, ConnectionData } from '../types/signal';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Theme } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const MAX_LEN = 120;
const EMOJIS = ['🍿', '☕', '🏃', '🍕', '♟️', '📚', '🎵', '🚶', '🎮', '🎬'];
const PX = 16;

type AudienceId = 'everyone' | 'inner' | 'custom';

// ─── Sub-components ───────────────────────────────────────────────────────────

function BroadcastRipple({ color }: { color: string }) {
  const r1 = useSharedValue(0);
  const r2 = useSharedValue(0);
  const r3 = useSharedValue(0);

  useEffect(() => {
    // Correct way to staggered infinite repetitions in Reanimated:
    // withDelay inside withRepeat behaves inconsistently; use withDelay wrapping withRepeat.
    r1.value = withRepeat(withTiming(1, { duration: 2500 }), -1, false);
    r2.value = withDelay(800, withRepeat(withTiming(1, { duration: 2500 }), -1, false));
    r3.value = withDelay(1600, withRepeat(withTiming(1, { duration: 2500 }), -1, false));
  }, []);

  const s1 = useAnimatedStyle(() => ({
    width: interpolate(r1.value, [0, 1], [100, W * 2.5]),
    height: interpolate(r1.value, [0, 1], [100, W * 2.5]),
    borderRadius: W * 1.5,
    backgroundColor: color,
    opacity: interpolate(r1.value, [0, 0.5, 1], [0, 0.3, 0]),
    position: 'absolute',
  }));

  const s2 = useAnimatedStyle(() => ({
    width: interpolate(r2.value, [0, 1], [100, W * 2.5]),
    height: interpolate(r2.value, [0, 1], [100, W * 2.5]),
    borderRadius: W * 1.5,
    backgroundColor: color,
    opacity: interpolate(r2.value, [0, 0.5, 1], [0, 0.3, 0]),
    position: 'absolute',
  }));

  const s3 = useAnimatedStyle(() => ({
    width: interpolate(r3.value, [0, 1], [100, W * 2.5]),
    height: interpolate(r3.value, [0, 1], [100, W * 2.5]),
    borderRadius: W * 1.5,
    backgroundColor: color,
    opacity: interpolate(r3.value, [0, 0.5, 1], [0, 0.3, 0]),
    position: 'absolute',
  }));
  return (
    <View style={styles.rippleOverlay} pointerEvents="none">
      <Animated.View style={s1} />
      <Animated.View style={s2} />
      <Animated.View style={s3} />
    </View>
  );
}

function StepBadge({ n, active, done, T }: { n: number; active: boolean; done: boolean; T: Theme }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (active || done)
      scale.value = withSequence(withSpring(1.25, { damping: 10 }), withSpring(1, { damping: 14 }));
  }, [active, done]);
  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));
  return (
    <Animated.View style={animatedBadgeStyle}>
      {done ? (
        <LinearGradient colors={[T.success, '#059669']} style={styles.badge}>
          <Ionicons name="checkmark" size={11} color="#fff" />
        </LinearGradient>
      ) : active ? (
        <LinearGradient colors={[T.primary, T.accent]} style={styles.badge}>
          <Text style={styles.badgeTxt}>{n}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.badge, {
          backgroundColor: T.mode === 'light' ? '#EDE8FF' : 'rgba(255,255,255,0.07)',
          borderWidth: 1.5,
          borderColor: T.mode === 'light' ? '#D8D0FF' : 'rgba(255,255,255,0.1)',
        }]}>
          <Text style={[styles.badgeTxt, { color: T.mode === 'light' ? '#BDB5E0' : 'rgba(255,255,255,0.2)' }]}>{n}</Text>
        </View>
      )}
    </Animated.View>
  );
}

function SectionTop({ step, title, icon, active, done, delay, T, children }: {
  step: number; title: string; icon: string;
  active: boolean; done: boolean; delay: number;
  T: Theme; children?: React.ReactNode;
}) {
  const borderColor = active
    ? `${T.primary}55`
    : done
      ? `${T.success}40`
      : T.border;

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(380).springify().damping(18)}
      style={[styles.cardTop, {
        backgroundColor: T.surface,
        borderColor,
        ...T.cardShadow,
      }]}
    >
      {active && (
        <LinearGradient
          colors={[T.primary, T.accent, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.cardAccentBar}
          pointerEvents="none"
        />
      )}
      <View style={styles.cardHeaderRow}>
        <StepBadge n={step} active={active} done={done} T={T} />
        <Text style={[styles.cardTitle, { color: T.textPrimary }]}>{title}</Text>
        <View style={[styles.cardIconWrap, {
          backgroundColor: active
            ? T.primarySoft : done
              ? T.successSoft : T.mode === 'light' ? '#EDE8FF' : 'rgba(255,255,255,0.07)',
        }]}>
          <Ionicons name={icon as any} size={14}
            color={active ? T.primary : done ? T.success : T.textTertiary} />
        </View>
      </View>
      {children && <View style={styles.cardBody}>{children}</View>}
    </Animated.View>
  );
}

function SectionStrip({ delay, T, children, style }: {
  delay: number; T: Theme; children: React.ReactNode; style?: any;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay + 30).duration(380).springify().damping(18)}
      style={[styles.cardStrip, {
        backgroundColor: T.surface,
        borderColor: T.border,
        ...T.cardShadow,
      }, style]}
    >
      {children}
    </Animated.View>
  );
}

function SectionFull({ step, title, icon, active, done, delay, T, children }: {
  step: number; title: string; icon: string;
  active: boolean; done: boolean; delay: number;
  T: Theme; children: React.ReactNode;
}) {
  const borderColor = active ? `${T.primary}55` : done ? `${T.success}40` : T.border;
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(380).springify().damping(18)}
      style={[styles.cardFull, { backgroundColor: T.surface, borderColor, ...T.cardShadow }]}
    >
      {active && (
        <LinearGradient
          colors={[T.primary, T.accent, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.cardAccentBar, { borderTopLeftRadius: 18, borderTopRightRadius: 18 }]}
          pointerEvents="none"
        />
      )}
      <View style={styles.cardHeaderRow}>
        <StepBadge n={step} active={active} done={done} T={T} />
        <Text style={[styles.cardTitle, { color: T.textPrimary }]}>{title}</Text>
        <View style={[styles.cardIconWrap, {
          backgroundColor: active ? T.primarySoft : done ? T.successSoft : T.mode === 'light' ? '#EDE8FF' : 'rgba(255,255,255,0.07)',
        }]}>
          <Ionicons name={icon as any} size={14}
            color={active ? T.primary : done ? T.success : T.textTertiary} />
        </View>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </Animated.View>
  );
}

function AudienceRow({ icon, title, sub, selected, onPress, T }: {
  icon: string; title: string; sub: string; selected: boolean; onPress: () => void; T: Theme;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (selected) scale.value = withSequence(withSpring(0.97, { damping: 14 }), withSpring(1, { damping: 16 }));
  }, [selected]);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={s}>
      <Pressable
        onPress={onPress}
        style={[styles.audienceRow, {
          borderColor: selected ? `${T.primary}55` : T.border,
          backgroundColor: selected ? T.primarySoft : 'transparent',
        }]}
      >
        <View style={[styles.audienceIcon, {
          backgroundColor: selected ? T.primarySoft : T.mode === 'light' ? '#EDE8FF' : 'rgba(255,255,255,0.07)',
        }]}>
          <Ionicons name={icon as any} size={16} color={selected ? T.primary : T.textTertiary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.audienceTitle, { color: T.textPrimary }]}>{title}</Text>
          <Text style={[styles.audienceSub, { color: T.textTertiary }]}>{sub}</Text>
        </View>
        <View style={[styles.radio, {
          borderColor: selected ? T.primary : T.mode === 'light' ? '#D0C8F0' : 'rgba(255,255,255,0.2)',
          backgroundColor: selected ? T.primary : 'transparent',
        }]}>
          {selected && <View style={styles.radioDot} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function PreviewCard({ text, type, typeColor, mins, T, t, user }: {
  text: string; type: string; typeColor: string; mins: number; T: Theme; t: any; user: any;
}) {
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  const timeVal = mins < 60 
    ? `${mins} ${t('common.minuteAbbr')}` 
    : (r > 0 ? `${h} ${t('common.hourAbbr')} ${r} ${t('common.minuteAbbr')}` : `${h} ${t('common.hourAbbr')}`);
  
  const timeStr = t('signalDetail.timeLeft', { time: timeVal });
  return (
    <Animated.View
      entering={FadeInUp.duration(340).springify().damping(16)}
      style={[styles.previewCard, {
        backgroundColor: T.surface,
        borderColor: `${typeColor}40`,
        overflow: 'hidden',
        ...T.cardShadow,
      }]}
    >
      <LinearGradient
        colors={[`${typeColor}14`, 'transparent']}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill} pointerEvents="none"
      />
      <LinearGradient
        colors={[typeColor, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.previewTopBar}
      />
      <View style={styles.previewHeaderRow}>
        <View style={[styles.previewPulse, { backgroundColor: typeColor }]} />
        <Text style={[styles.previewHeaderTxt, { color: T.textTertiary }]}>{t('signalDetail.livePreview')}</Text>
        <View style={[styles.previewTypePill, { backgroundColor: `${typeColor}15`, borderColor: `${typeColor}40` }]}>
          <Text style={[styles.previewTypeTxt, { color: typeColor }]}>
            {t(`home.filters.${type.toLowerCase()}`, { defaultValue: type })}
          </Text>
        </View>
      </View>
      <View style={styles.previewSender}>
        <LinearGradient colors={[T.primary, T.accent]} style={styles.previewAvatar}>
          <Text style={styles.previewAvatarTxt}>{user?.initials || 'FA'}</Text>
        </LinearGradient>
        <View>
          <Text style={[styles.previewName, { color: T.textPrimary }]}>{user?.name || t('signalDetail.you')}</Text>
          <Text style={[styles.previewHandle, { color: T.textTertiary }]}>@{user?.username || 'me'}</Text>
        </View>
      </View>
      <Text style={[styles.previewText, { color: T.textPrimary }]} numberOfLines={2}>{text}</Text>
      <View style={styles.previewFooter}>
        <Ionicons name="time-outline" size={11} color={T.textTertiary} />
        <Text style={[styles.previewFooterTxt, { color: T.textTertiary }]}>{timeStr}</Text>
      </View>
    </Animated.View>
  );
}

function SendButton({ onPress, isValid, sending, success, T, t }: {
  onPress: () => void; isValid: boolean; sending: boolean; success: boolean; T: Theme; t: any;
}) {
  const glow = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    if (isValid && !sending) {
      glow.value = withRepeat(withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ), -1);
    } else { glow.value = withTiming(0); }
  }, [isValid, sending]);
  const gs = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.4], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.15], Extrapolation.CLAMP) }],
  }));
  const bs = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.sendWrap}>
      {isValid && !sending && <Animated.View pointerEvents="none" style={[styles.sendGlow, { backgroundColor: T.primary }, gs]} />}
      <Animated.View style={[{ width: '100%' }, bs]}>
        <Pressable
          onPress={() => {
            scale.value = withSequence(withSpring(0.96, { damping: 12 }), withSpring(1, { damping: 16 }));
            // Removed redundant Haptics here since handleSend also calls it
            onPress();
          }}
          disabled={!isValid || sending}
          style={{ borderRadius: 16, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={isValid
              ? (success ? [T.success, '#10B981'] : [T.primary, T.accent])
              : T.mode === 'light' ? ['#E8E3FF', '#DDD8F5'] : ['#1E1A38', '#181530']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.sendGrad}
          >
            {sending ? (
              <><Ionicons name="radio-outline" size={20} color={isValid ? '#fff' : T.textTertiary} style={{ marginRight: 8 }} /><Text style={[styles.sendTxt, !isValid && { color: T.textTertiary }]}>{t('compose.broadcasting')}</Text></>
            ) : success ? (
              <><Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.sendTxt}>{t('compose.sent')}</Text></>
            ) : (
              <><Ionicons name="flash" size={20} color={isValid ? '#fff' : T.textTertiary} style={{ marginRight: 8 }} /><Text style={[styles.sendTxt, !isValid && { color: T.textTertiary }]}>{t('home.sendSignal')}</Text></>
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ProgressBar({ value, T }: { value: number; T: Theme }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(value, { duration: 450 }); }, [value]);

  // Use useAnimatedStyle instead of reading .value in the style prop
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${w.value * 100}%`,
  }));

  return (
    <View style={[styles.progTrack, { backgroundColor: T.mode === 'light' ? '#E8E3FF' : 'rgba(108,71,255,0.15)' }]}>
      <Animated.View style={[styles.progFill, animatedStyle]}>
        <LinearGradient colors={[T.primary, T.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ComposeSignalScreen() {
  const { themeObject: T, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { coords } = useUserLocation();


  const [text, setText] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [mins, setMins] = useState(60);
  const [customM, setCustomM] = useState(90);
  const [audience, setAudience] = useState<AudienceId>('everyone');
  const [loc, setLoc] = useState<LocationData | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [textErr, setTextErr] = useState(false);
  const [typeErr, setTypeErr] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch groups and connections from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        // Fetch groups
        const { data: groupsData } = await supabase
          .from('custom_groups')
          .select('*, group_members(count)')
          .eq('owner_id', authUser.id);

        if (groupsData) {
          setGroups(groupsData.map((g: any) => ({
            id: g.id,
            name: g.name,
            label: g.name,
            memberCount: g.group_members?.[0]?.count || 0,
            color: '#6C47FF',
            members: [],
          })));
        }

        // Fetch connections
        const { data: connectionsData } = await supabase
          .from('connections')
          .select(`
          id,
          friend:friend_id (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
          .eq('user_id', authUser.id)
          .eq('status', 'accepted');

        if (connectionsData) {
          setConnections(connectionsData.map((c: any) => ({
            id: c.friend.id,
            name: c.friend.display_name,
            username: c.friend.username,
            initials: c.friend.display_name?.split(' ').map((w: string) => w[0]).join('') || '?',
            avatarColor: '#6C47FF',
            isActive: false,
            lastSignal: '',
            mutualCount: 0,
          })));
        }
      } catch (err) {
        console.error('Error loading compose data:', err);
      }
    };

    loadData();
  }, []);

  const shake = useSharedValue(0);
  const prog = useSharedValue(0);

  const effMins = mins === -1 ? customM : mins;
  const typeOption = COMPOSE_TYPES.find(t => t.value === type);
  const typeColor = typeOption?.color ?? T.primary;
  const isValid = text.trim().length > 0 && type !== null;
  const steps = [text.trim().length > 0, !!type, true, true].filter(Boolean).length;
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  // ── This function must be declared BEFORE handleSend so runOnJS can reference it ──
  // runOnJS requires a named function reference — NOT an inline arrow function
  const onSendAnimationComplete = useCallback((signalId: string) => {
    console.log('[Compose] Animation finished, navigating...');
    setSuccess(true);
    setSending(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    const simplifiedSignal: SignalData = {
      id: signalId,
      user: {
        name: user?.name || t('signalDetail.you'),
        username: user?.username || 'me',
        initials: user?.initials || 'FA',
        avatarColor: user?.avatarColor || T.primary,
      },
      type: type!,
      typeColor,
      text: text.trim(),
      minutesLeft: effMins,
      respondedIn: 0,
      status: 'active',
      isOwn: true,
      location: loc ? { ...loc } : undefined,
      createdAt: Date.now(),
    };

    setTimeout(() => {
      navigation.navigate('Home', { newSignal: simplifiedSignal });
    }, 600);
  }, [user, t, type, typeColor, text, effMins, loc, navigation, T]);

  const handleSend = useCallback(async () => {
    console.log('[Compose] Starting handleSend...');
    if (!text.trim()) {
      setTextErr(true);
      shake.value = withSequence(
        withTiming(-8, { duration: 45 }), withTiming(8, { duration: 45 }),
        withTiming(-6, { duration: 45 }), withTiming(6, { duration: 45 }),
        withTiming(0, { duration: 45 }),
      );
      return;
    }
    if (!type) {
      setTypeErr(true);
      return;
    }

    setSending(true);
    // Use notification feedback only once
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    try {
      console.log('[Compose] Fetching auth user...');
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      // Build location point if provided
      const locationValue = loc?.latitude && loc?.longitude
        ? `POINT(${loc.longitude} ${loc.latitude})`
        : null;

      // ── Enforce one-active-at-a-time: expire any still-active previous signals ──
      console.log('[Compose] Expiring previous active signals...');
      await supabase
        .from('signals')
        .update({ expires_at: new Date().toISOString() })
        .eq('user_id', authUser.id)
        .gt('expires_at', new Date().toISOString());
      // ─────────────────────────────────────────────────────────────────────────

      console.log('[Compose] Inserting signal to Supabase...');
      // Insert signal into Supabase
      const { data: newSignalData, error } = await supabase
        .from('signals')
        .insert({
          user_id: authUser.id,
          type,
          message: text.trim(),
          location: locationValue,
          location_name: loc?.label || null,
          location_privacy: loc?.privacy || 'none',
          audience_type: audience,
          group_id: (audience === 'inner' && selectedGroupIds.length > 0) ? selectedGroupIds[0] : null,
          expires_at: new Date(Date.now() + effMins * 60000).toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('[Compose] Supabase insert error:', error);
        setSending(false);
        Alert.alert(
          'Send Failed',
          `Could not send your signal: ${error.message || 'Database error'}. Please try again.`,
          [{ text: 'OK' }]
        );
        return;
      }

      if (!newSignalData) {
        console.error('[Compose] No signal data returned from insert');
        throw new Error('Insert failed');
      }

      console.log('[Compose] Insert successful:', newSignalData.id);

      // If audience is custom, insert permitted users
      if (audience === 'custom' && selectedUserIds.length > 0) {
        try {
          await supabase.from('discovery_auditee').insert(
            selectedUserIds.map(uid => ({
              signal_id: newSignalData.id,
              permitted_user_id: uid,
            }))
          );
        } catch (auditeeErr) {
          console.error('[Compose] Custom audience insert error:', auditeeErr);
        }
      }

      // Start the progress animation
      // IMPORTANT: runOnJS must receive a named function reference — never an inline arrow.
      // The signal ID (a plain string) is the only value passed across the worklet boundary.
      const signalId = newSignalData.id;
      console.log('[Compose] Starting progress animation...');
      prog.value = withTiming(1, { duration: 1500 }, (done) => {
        'worklet';
        if (done) {
          runOnJS(onSendAnimationComplete)(signalId);
        }
      });
    } catch (err) {
      console.error('[Compose] Fatal handleSend error:', err);
      setSending(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [text, type, audience, selectedUserIds, shake, prog, onSendAnimationComplete]);

  const progStyle = useAnimatedStyle(() => ({ width: `${prog.value * 100}%` as any }));

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      {/* Background blobs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.bgBlob1, { backgroundColor: T.primary + '10' }]} />
        <View style={[styles.bgBlob2, { backgroundColor: T.accent + '08' }]} />
      </View>

      {/* Broadcast Ripple Overlay */}
      {sending && <BroadcastRipple color={typeColor} />}

      {/* Send progress bar */}
      {sending && (
        <View style={styles.sendBarWrap} pointerEvents="none">
          <Animated.View style={[styles.sendBar, progStyle]}>
            <LinearGradient colors={[T.primary, T.accent, T.success]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: T.border }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={[styles.cancelTxt, { color: T.textSecondary }]}>{t('compose.cancel')}</Text>
          </Pressable>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[styles.headerTitle, { color: T.textPrimary }]}>{t('compose.newSignal')}</Text>
            <Text style={[styles.headerSub, { color: T.textTertiary }]}>{steps}/4 {t('compose.steps')}</Text>
          </View>
          <View style={{ minWidth: 60, alignItems: 'flex-end' }}>
            <ProgressBar value={steps / 4} T={T} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Message */}
          <SectionTop
            step={1} title={t('compose.whatAreYouUpFor')} icon="chatbubble-ellipses-outline"
            active={text.length > 0 && !textErr} done={text.trim().length > 0}
            delay={60} T={T}
          >
            <Animated.View style={shakeStyle}>
              <View style={[styles.inputBox, {
                backgroundColor: T.mode === 'light' ? T.surfaceAlt : 'rgba(255,255,255,0.04)',
                borderColor: textErr ? T.error : T.border,
              }]}>
                <TextInput
                  style={[styles.input, { color: T.textPrimary }]}
                  placeholder={t('compose.placeholder')}
                  placeholderTextColor={T.textTertiary}
                  value={text}
                  onChangeText={(v) => { setText(v); setTextErr(false); }}
                  multiline maxLength={MAX_LEN} autoFocus
                />
                <Text style={[styles.charCount, { color: textErr ? T.error : T.textTertiary }]}>
                  {textErr ? t('compose.tellUsWhatYoureUpFor') : `${text.length} / ${MAX_LEN}`}
                </Text>
              </View>
            </Animated.View>
          </SectionTop>

          <SectionStrip delay={70} T={T}>
            <FlatList
              data={EMOJIS}
              keyExtractor={(_, i) => String(i)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.emojiList, { paddingHorizontal: PX }]}
              ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { if (text.length < MAX_LEN) { setText(p => p + item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                  style={[styles.emojiBubble, {
                    backgroundColor: T.mode === 'light' ? '#EDE8FF' : 'rgba(108,71,255,0.12)',
                    borderColor: T.mode === 'light' ? '#D8D0FF' : 'rgba(108,71,255,0.22)',
                  }]}
                >
                  <Text style={{ fontSize: 24 }}>{item}</Text>
                </Pressable>
              )}
            />
          </SectionStrip>

          <View style={{ height: 16 }} />

          {/* Section 2: Signal type */}
          <SectionTop
            step={2} title={t('compose.whatTypeOfSignal')} icon="grid-outline"
            active={!!type} done={!!type} delay={120} T={T}
          >
            {typeErr && !type && (
              <Animated.View entering={FadeIn.duration(200)}>
                <Text style={[styles.fieldErr, { color: T.error }]}>
                  {t('compose.pickATypeToContinue')} ↓
                </Text>
              </Animated.View>
            )}
          </SectionTop>
          <SectionStrip delay={130} T={T} style={{ paddingBottom: 8 }}>
            <TypeSelector
              selectedValue={type}
              onSelect={(v) => { setType(v); setTypeErr(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              errorVisible={false}
            />
          </SectionStrip>

          <View style={{ height: 16 }} />

          {/* Section 3: Duration */}
          <SectionFull
            step={3} title={t('compose.howLongIsItLive')} icon="timer-outline"
            active={true} done={true} delay={180} T={T}
          >
            <DurationPicker
              selectedMinutes={mins}
              onSelect={(m) => { setMins(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              customMinutes={customM}
              onCustomChange={setCustomM}
            />
          </SectionFull>

          <View style={{ height: 16 }} />

          {/* Section 4: Audience */}
          <SectionFull
            step={4} title={t('compose.whoSeesThis')} icon="people-outline"
            active={true} done={true} delay={220} T={T}
          >
            <View style={{ gap: 8 }}>
              <AudienceRow T={T} icon="globe-outline" title={t('compose.allConnections')} sub={t('compose.everyoneInYourCircleCanSeeThis')} selected={audience === 'everyone'} onPress={() => { setAudience('everyone'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />

              <AudienceRow T={T} icon="people-circle-outline" title={t('compose.innerCircle')} sub={t('compose.selectASpecificGroup')} selected={audience === 'inner'} onPress={() => { setAudience('inner'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
              {audience === 'inner' && (
                <Animated.View entering={FadeIn.duration(400)} style={styles.audienceSelection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setCreateGroupOpen(true)}
                      style={[styles.groupChip, { borderStyle: 'dashed', borderColor: T.primary, backgroundColor: T.primarySoft, paddingHorizontal: 16 }]}
                    >
                      <Ionicons name="add-circle" size={16} color={T.primary} />
                      <Text style={[styles.groupChipTitle, { color: T.primary, fontWeight: '700' }]}>{t('common.create')}</Text>
                    </TouchableOpacity>
                    {groups.map(g => {
                      const sel = selectedGroupIds.includes(g.id);
                      return (
                        <TouchableOpacity
                          key={g.id}
                          onPress={() => {
                            setSelectedGroupIds(prev => prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id]);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={[styles.groupChip, { backgroundColor: sel ? T.primary : T.surfaceAlt, borderColor: sel ? T.primary : T.border }]}
                        >
                          <Text style={[styles.groupChipTitle, { color: sel ? '#FFF' : T.textPrimary }]}>{g.name}</Text>
                          {sel && <Ionicons name="checkmark-circle" size={12} color="#FFF" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {selectedGroupIds.length === 0 && <Text style={[styles.selHint, { color: T.error }]}>{t('compose.selectAtLeastOneGroup')}</Text>}
                </Animated.View>
              )}

              <AudienceRow T={T} icon="person-outline" title={t('compose.custom')} sub={t('compose.handPickSpecificPeople')} selected={audience === 'custom'} onPress={() => { setAudience('custom'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
              {audience === 'custom' && (
                <Animated.View entering={FadeIn.duration(400)} style={styles.audienceSelection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {connections.map(c => {
                      const sel = selectedUserIds.includes(c.id);
                      return (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() => {
                            setSelectedUserIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={[styles.userChip, { backgroundColor: sel ? T.primary : T.surfaceAlt, borderColor: sel ? T.primary : T.border }]}
                        >
                          <View style={[styles.miniAvatar, { backgroundColor: c.avatarColor }]}>
                            <Text style={styles.miniAvatarTxt}>{c.initials}</Text>
                          </View>
                          <Text style={[styles.userChipName, { color: sel ? '#FFF' : T.textPrimary }]}>{c.name.split(' ')[0]}</Text>
                          {sel && <Ionicons name="checkmark-circle" size={12} color="#FFF" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {selectedUserIds.length === 0 && <Text style={[styles.selHint, { color: T.error }]}>{t('compose.selectAtLeastOnePerson')}</Text>}
                </Animated.View>
              )}
            </View>
          </SectionFull>

          <View style={{ height: 16 }} />

          {/* Location */}
          <Animated.View
            entering={FadeInDown.delay(260).duration(360).springify()}
            style={[styles.cardFull, { backgroundColor: T.surface, borderColor: loc ? `${T.primary}45` : T.border, ...T.cardShadow }]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.optTag, { backgroundColor: T.primarySoft, borderColor: `${T.primary}30` }]}>
                <Text style={[styles.optTagTxt, { color: T.primary }]}>{t('compose.optional')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: T.textPrimary }]}>{t('compose.where')}</Text>
                <Text style={[styles.locHint, { color: T.textTertiary }]}>{t('compose.aHintHelpsFriendsDecideFaster')}</Text>
              </View>
              <View style={[styles.cardIconWrap, { backgroundColor: loc ? T.primarySoft : T.primary + '08' }]}>
                <Ionicons name="location-outline" size={14} color={loc ? T.primary : T.textTertiary} />
              </View>
            </View>
            <View style={styles.cardBody}>
              {!loc ? (
                <TouchableOpacity
                  onPress={() => setLocOpen(true)}
                  activeOpacity={0.7}
                  style={[styles.locPlaceholder, { backgroundColor: T.surfaceAlt, borderColor: T.border }]}
                >
                  <View style={[styles.locPlaceholderMap, { backgroundColor: T.mode === 'light' ? '#E8E3FF' : '#1A1529' }]}>
                    <Ionicons name="map-outline" size={40} color={T.primary} opacity={0.15} />
                    <View style={styles.locPlaceholderPulse}>
                      <BroadcastRipple color={T.primary} />
                      <View style={[styles.locPlaceholderDot, { backgroundColor: T.primary }]} />
                    </View>
                  </View>
                  <View style={styles.locPlaceholderInfo}>
                    <Text style={[styles.locPlaceholderTitle, { color: T.textPrimary }]}>{t('compose.addALocation')}</Text>
                    <Text style={[styles.locPlaceholderSub, { color: T.textTertiary }]}>{t('compose.specificPlaceAreaOrKeepItPrivate')}</Text>
                  </View>
                  <View style={[styles.locAddCircle, { backgroundColor: T.primary }]}>
                    <Ionicons name="add" size={20} color="#FFF" />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.locActiveBox}>
                  <TouchableOpacity
                    onPress={() => setLocOpen(true)}
                    activeOpacity={0.9}
                    style={[styles.locActiveCard, { backgroundColor: T.mode === 'light' ? T.surface : T.surfaceAlt, borderColor: `${T.primary}30` }]}
                  >
                    <View style={styles.locActiveHdr}>
                      <View style={[styles.locActiveIconBox, { backgroundColor: T.primary + '15' }]}>
                        <Ionicons name={loc.privacy === 'specific' ? 'location' : 'map'} size={18} color={T.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.locActiveLabel, { color: T.textPrimary }]} numberOfLines={1}>{loc.label}</Text>
                        <Text style={[styles.locActivePrivacy, { color: T.textTertiary }]}>
                          {loc.privacy === 'specific' ? t('compose.specificPlace') : t('compose.generalArea')}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setLoc(null)} hitSlop={12} style={styles.locRemoveBtn}>
                        <Ionicons name="close" size={16} color={T.textTertiary} />
                      </TouchableOpacity>
                    </View>

                    {loc.privacy === 'specific' && loc.latitude && (
                      <View style={styles.locMapFrame}>
                        <LocationMapPreview location={loc} userCoords={coords} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Preview & Send */}
          {isValid && (
            <View style={{ marginTop: 24 }}>
              <PreviewCard text={text.trim()} type={type} typeColor={typeColor} mins={effMins} T={T} t={t} user={user} />
              <View style={{ height: 20 }} />
              <SendButton onPress={handleSend} isValid={isValid} sending={sending} success={success} T={T} t={t} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <LocationPicker
        visible={locOpen}
        onClose={() => setLocOpen(false)}
        onSelect={(l) => { setLoc(l); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
        initialLocation={loc ?? undefined}
      />

      {/* Create Group Modal */}
      <Modal visible={createGroupOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCreateGroupOpen(false)} />
          <Animated.View entering={FadeInDown} style={[styles.modalCard, { backgroundColor: T.surface }]}>
            <Text style={[styles.modalTitle, { color: T.textPrimary }]}>{t('circle.createGroup', { defaultValue: 'Create Group' })}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: T.surfaceAlt, borderColor: T.border, color: T.textPrimary }]}
              placeholder={t('circle.groupName', { defaultValue: 'Group Name' })}
              placeholderTextColor={T.textTertiary}
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCreateGroupOpen(false)} style={styles.modalBtnSec}>
                <Text style={{ color: T.textSecondary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!newGroupName.trim()) return;
                  const newG: GroupData = {
                    id: Math.random().toString(),
                    name: newGroupName,
                    label: newGroupName,
                    memberCount: 0,
                    color: T.primary,
                    members: []
                  };
                  setGroups(prev => [...prev, newG]);
                  setSelectedGroupIds(prev => [...prev, newG.id]);
                  setNewGroupName('');
                  setCreateGroupOpen(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                style={[styles.modalBtn, { backgroundColor: T.primary }]}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{t('common.create')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgBlob1: { position: 'absolute', width: 320, height: 320, borderRadius: 160, top: -90, right: -70 },
  bgBlob2: { position: 'absolute', width: 250, height: 250, borderRadius: 125, bottom: 100, left: -70 },

  rippleOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 100 },

  sendBarWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, zIndex: 999 },
  sendBar: { height: '100%' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PX, paddingBottom: 12, borderBottomWidth: 1 },
  cancelTxt: { fontSize: 15, fontFamily: 'Inter_600SemiBold', minWidth: 60 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_900Black', letterSpacing: -0.2 },
  headerSub: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 1 },

  progTrack: { width: 54, height: 5, borderRadius: 3, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 3 },

  scroll: { paddingHorizontal: PX, paddingTop: 14 },

  badge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  badgeTxt: { color: '#fff', fontSize: 11, fontFamily: 'Inter_800ExtraBold' },

  cardTop: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderWidth: 1.5, borderBottomWidth: 0 },
  cardAccentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingVertical: 13, gap: 10 },
  cardTitle: { fontSize: 14, fontFamily: 'Inter_800ExtraBold', flex: 1 },
  cardIconWrap: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14 },

  cardStrip: { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderWidth: 1.5, borderTopWidth: 0 },
  cardFull: { borderRadius: 18, borderWidth: 1.5, overflow: 'hidden' },

  fieldErr: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 4 },

  inputBox: { borderRadius: 12, borderWidth: 1.5, padding: 12, minHeight: 88 },
  input: { fontSize: 16, fontFamily: 'Inter_500Medium', lineHeight: 24, minHeight: 54, textAlignVertical: 'top' },
  charCount: { fontSize: 11, fontFamily: 'Inter_700Bold', textAlign: 'right', marginTop: 6 },

  emojiList: { paddingVertical: 10 },
  emojiBubble: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },

  audienceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 12, borderWidth: 1.5 },
  audienceIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  audienceTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  audienceSub: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  optTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  optTagTxt: { fontSize: 9, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.6, textTransform: 'uppercase' },
  locHint: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 1 },
  locPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 12,
  },
  locPlaceholderMap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  locPlaceholderPulse: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locPlaceholderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  locPlaceholderInfo: { flex: 1, gap: 2 },
  locPlaceholderTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  locPlaceholderSub: { fontSize: 11, fontFamily: 'Inter_500Medium', opacity: 0.6 },
  locAddCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locActiveBox: { width: '100%' },
  locActiveCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
  },
  locActiveHdr: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locActiveIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  locActiveLabel: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  locActivePrivacy: { fontSize: 12, fontFamily: 'Inter_500Medium', opacity: 0.7 },
  locRemoveBtn: { padding: 4 },
  locMapFrame: { marginTop: 12, borderRadius: 12, overflow: 'hidden' },

  previewCard: { borderRadius: 16, borderWidth: 1.5, padding: 14 },
  previewTopBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  previewHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 4 },
  previewPulse: { width: 7, height: 7, borderRadius: 4 },
  previewHeaderTxt: { fontSize: 10, fontFamily: 'Inter_800ExtraBold', textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
  previewTypePill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  previewTypeTxt: { fontSize: 10, fontFamily: 'Inter_800ExtraBold', textTransform: 'uppercase', letterSpacing: 0.8 },
  previewSender: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  previewAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  previewAvatarTxt: { color: '#fff', fontSize: 11, fontFamily: 'Inter_800ExtraBold' },
  previewName: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  previewHandle: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 1 },
  previewText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', lineHeight: 22 },
  previewFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  previewFooterTxt: { fontSize: 11, fontFamily: 'Inter_500Medium' },

  sendWrap: { position: 'relative' },
  sendGlow: { position: 'absolute', left: 0, right: 0, height: 56, borderRadius: 16 },
  sendGrad: { height: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  sendTxt: { color: '#fff', fontSize: 17, fontFamily: 'Inter_900Black', letterSpacing: 0.2 },

  // Audience selection
  audienceSelection: {
    marginTop: 4,
    marginBottom: 8,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  groupChipTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  userChipName: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarTxt: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: 'Inter_800ExtraBold',
  },
  selHint: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 6,
    marginLeft: 4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
  },
  modalInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnSec: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
});