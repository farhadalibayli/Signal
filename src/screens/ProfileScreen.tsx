// Screen: ProfileScreen
// Description: User profile, stats, quick settings, sign out (Premium Design)
// Navigation: BottomTabBar (index 3) → EditProfileScreen, SettingsScreen

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity, Pressable, Dimensions,
  Image, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  cancelAnimation,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { supabase } from '../supabase/supabaseClient';
import type { SignalData, ActivityData } from '../types/signal';
import { StatCard } from '../components/StatCard';
import { ActivityItem } from '../components/ActivityItem';
import { BottomTabBar } from '../components/BottomTabBar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertsContext';
import { COMPOSE_TYPES } from '../data/composeTypes';
import { SPACING } from '../constants/spacing';

const { width, height: H } = Dimensions.get('window');

// Signal type colors mapping for the chart synchronized with SIGNAL_TYPES
const TYPE_COLORS: Record<string, string> = {
  'FILM': '#6C47FF',
  'CAFE': '#D97706',
  'RUN': '#16A34A',
  'FOOD': '#DC2626',
  'GAMES': '#2563EB',
  'STUDY': '#F59E0B',
  'MUSIC': '#8B5CF6',
  'WALK': '#06B6D4',
  'CUSTOM': '#7C3AED',
};

// ─── Profile Completeness ───────────────────────────────────────────────────
function CompletenessBar({ colors, isDark }: { colors: any; isDark: boolean }) {
  const { t } = useTranslation();
  const widthSv = useSharedValue(0);
  useEffect(() => { widthSv.value = withDelay(800, withSpring(85, { damping: 15 })); }, []);
  const barStyle = useAnimatedStyle(() => ({ width: `${widthSv.value}%` }));

  return (
    <Animated.View entering={FadeIn.delay(500)} style={[styles.compBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.compRow}>
        <View style={styles.compLeft}>
          <Text style={[styles.compTitle, { color: colors.textPrimary }]}>{t('profile.completeness', { defaultValue: 'Profil 85% Tamamlanıb' })}</Text>
          <Text style={[styles.compSub, { color: colors.textSecondary }]}>{t('profile.addBio', { defaultValue: '100% üçün bio əlavə edin' })}</Text>
        </View>
        <Ionicons name="sparkles" size={20} color={colors.primary} />
      </View>
      <View style={[styles.compTrack, { backgroundColor: isDark ? '#FFFFFF10' : '#00000008' }]}>
        <Animated.View style={[styles.compFill, barStyle, { backgroundColor: colors.primary }]}>
          <LinearGradient colors={[colors.primary, colors.accent]} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { user: authUser } = useAuth();
const { alertsUnreadCount } = useAlerts();
const { t } = useTranslation();

const [stats, setStats] = useState({ signalsSent: 0, responseRate: 0, connections: 0 });
const [activity, setActivity] = useState<any[]>([]);
const [breakdown, setBreakdown] = useState<any[]>([]);
const [joinedDate, setJoinedDate] = useState('');

const currentUser = authUser || { name: '', username: '', avatarColor: '#6C47FF', initials: '?' };

useEffect(() => {
  const loadProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // ── Enforce one-active-at-a-time rule ────────────────────────────────────
      // Find the newest signal for this user
      const { data: newestSignal } = await supabase
        .from('signals')
        .select('id, created_at')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (newestSignal) {
        // Expire all other signals that are still marked as active (expires_at in future)
        // but are NOT the newest one — enforces the one-active-at-a-time rule in the DB
        await supabase
          .from('signals')
          .update({ expires_at: new Date().toISOString() })
          .eq('user_id', authUser.id)
          .neq('id', newestSignal.id)
          .gt('expires_at', new Date().toISOString());
      }
      // ─────────────────────────────────────────────────────────────────────────

      // Fetch signal count
      const { count: signalCount } = await supabase
        .from('signals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id);

      // Fetch connections count
      const { count: connCount } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('status', 'accepted');

      // Fetch signal answers for response rate
      const { data: mySignals } = await supabase
        .from('signals')
        .select('id')
        .eq('user_id', authUser.id);

      let responseRate = 0;
      if (mySignals && mySignals.length > 0) {
        const { count: answerCount } = await supabase
          .from('signal_answers')
          .select('*', { count: 'exact', head: true })
          .in('signal_id', mySignals.map(s => s.id));
        responseRate = Math.min(100, Math.round(((answerCount || 0) / mySignals.length) * 100));
      }

      // Fetch recent activity (past signals) with answer counts and location
      const { data: recentSignals } = await supabase
        .from('signals')
        .select('id, type, message, created_at, expires_at, location, location_name, location_privacy, signal_answers:signal_answers(count)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(3);

      setStats({
        signalsSent: signalCount || 0,
        responseRate,
        connections: connCount || 0,
      });

      const now = new Date();
      setActivity((recentSignals || []).map((s, index) => {
        // Handle PostGIS location object/string
        let latitude, longitude;
        if (s.location) {
          if (typeof s.location === 'object' && (s.location as any).coordinates) {
            longitude = (s.location as any).coordinates[0];
            latitude = (s.location as any).coordinates[1];
          } else if (typeof s.location === 'string' && (s.location as string).includes('POINT')) {
            const match = (s.location as string).match(/POINT\((.+) (.+)\)/);
            if (match) {
              longitude = parseFloat(match[1]);
              latitude = parseFloat(match[2]);
            }
          }
        }

        // ── KEY FIX: Only the MOST RECENT signal (index 0) can ever be "active".
        // All older signals in the activity feed are history regardless of expires_at.
        // This prevents old signals from showing "ACTIVE" after a new one is sent.
        const isActive = index === 0 && new Date(s.expires_at) > now;

        return {
          id: s.id,
          signalType: s.type,
          typeColor: TYPE_COLORS[s.type] || '#6C47FF',
          text: s.message,
          responses: (s as any).signal_answers?.[0]?.count || 0,
          timeLabel: new Date(s.created_at).toLocaleDateString(),
          timeAgo: s.created_at,
          status: isActive ? 'active' : 'expired',
          createdAt: new Date(s.created_at).getTime(),
          location: s.location ? {
            privacy: s.location_privacy || 'specific',
            label: s.location_name || '',
            latitude,
            longitude,
          } : undefined,
        };
      }));

      // Fetch all user signals for breakdown calculation
      const { data: allSignals } = await supabase
        .from('signals')
        .select('type')
        .eq('user_id', authUser.id);

      if (allSignals && allSignals.length > 0) {
        const counts: Record<string, number> = {};
        allSignals.forEach((s: any) => {
          counts[s.type] = (counts[s.type] || 0) + 1;
        });

        const sortedBreakdown = Object.entries(counts)
          .map(([type, count]) => ({
            label: type,
            count,
            pct: Math.round((count / allSignals.length) * 100),
            color: TYPE_COLORS[type] || '#6C47FF',
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setBreakdown(sortedBreakdown);
      } else {
        setBreakdown([]);
      }

      setJoinedDate(new Date(authUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  loadProfile();
}, []);
  
  const [toast, setToast] = useState<string | null>(null);
  const [scrollRef] = React.useState(() => ({ current: null as any }));
  const scrollY = useSharedValue(0);

  const gearRotation = useSharedValue(0);
  const editScale = useSharedValue(1);
  const settingsScale = useSharedValue(1);

  useEffect(() => {
    gearRotation.value = withRepeat(withTiming(360, { duration: 12000 }), -1, false);
    return () => cancelAnimation(gearRotation);
  }, []);

  const gearStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${gearRotation.value}deg` }] }));
  const scrollHandler = useAnimatedScrollHandler((event) => { scrollY.value = event.contentOffset.y; });

  const headerBlurStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 80], [0, 1], Extrapolation.CLAMP);
    return { opacity };
  });

  const heroStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [-100, 0, 100], [-50, 0, 20], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, 150], [1, 0], Extrapolation.CLAMP);
    return { transform: [{ translateY }], opacity };
  });

  const openEdit = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('EditProfile'); };
  const openSettings = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Settings'); };

  const handleActivityPress = (activity: ActivityData) => {
    Haptics.selectionAsync();
    const signal: SignalData = {
      id: activity.id,
      user: {
        name: authUser?.name || 'You',
        username: authUser?.username || 'you',
        initials: authUser?.initials || 'Y',
        avatarColor: authUser?.avatarColor || colors.primary,
        avatar: authUser?.avatar,
      },
      type: activity.signalType,
      typeColor: activity.typeColor,
      text: activity.text,
      minutesLeft: 0,
      respondedIn: activity.responses,
      status: activity.status === 'active' ? 'active' : 'expiring',
      isOwn: true,
      location: activity.location,
      createdAt: activity.createdAt,
    };
    navigation.navigate('SignalDetail', { signal });
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => { navigation.replace('Home'); return true; };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  const titleFont = 'Inter_900Black';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.ambientGlowWrap}>
        <LinearGradient colors={isDark ? ['#6C47FF25', 'transparent'] : ['#6C47FF10', 'transparent']} style={styles.ambientGlow} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <Animated.View style={[styles.hero, heroStyle]}>
          <View style={styles.avatarSection}>
            <View style={[styles.glowCircle, { backgroundColor: colors.primary, transform: [{ scale: 1.4 }, { translateX: -30 }] }]} />
            <AvatarWithRing user={currentUser} />
            <Animated.View entering={FadeIn.delay(300).springify()}>
              <Pressable onPress={openEdit} style={({ pressed }) => [styles.editPhotoBtn, { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.9 : 1 }] }]}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </Pressable>
            </Animated.View>
          </View>
          
          <Animated.Text entering={FadeInDown.delay(100).springify()} style={[styles.name, { color: colors.textPrimary, fontFamily: titleFont }]}>{currentUser.name}</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(150).springify()} style={[styles.username, { color: colors.textSecondary }]}>@{currentUser.username}</Animated.Text>
          
          <CompletenessBar colors={colors} isDark={isDark} />

          <Animated.View entering={FadeInDown.delay(250).springify()} style={[styles.joinedPill, { backgroundColor: isDark ? '#FFFFFF10' : '#F5F3FF' }]}>
            <Ionicons name="calendar-outline" size={12} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.joinedText, { color: colors.textSecondary }]}>{t('profile.memberSince', { date: joinedDate })}</Text>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).springify()} style={[styles.statsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statsRow}>
            <StatCard value={stats.signalsSent} label={t('profile.signals')} color={colors.primary} index={0} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); scrollRef.current?.scrollTo({ y: 550, animated: true }); }} />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <StatCard value={stats.responseRate} label={t('profile.response')} color={colors.success} index={1} suffix="%" />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <StatCard value={stats.connections} label={t('profile.circle')} color={colors.accent} index={2} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Circle'); }} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: titleFont }]}>{t('profile.activity')}</Text>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('ActivityHistory'); }}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{t('common.seeAll')}</Text>
            </Pressable>
          </View>
          <View style={[styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {activity.slice(0, 3).map((item, i) => (
      <ActivityItem key={item.id} activity={item} index={i} onPress={() => handleActivityPress(item)} />
))}
          </View>

          <Text style={[styles.chartTitle, { color: colors.textPrimary, fontFamily: titleFont }]}>{t('profile.breakdown')}</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {breakdown.length > 0 ? (
              <BarChart data={breakdown} colors={colors} />
            ) : (
              <Text style={[styles.noActivity, { color: colors.textSecondary }]}>{t('components.privateActivity')}</Text>
            )}
          </View>
        </Animated.View>
      </Animated.ScrollView>

      <Animated.View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
          <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <View style={styles.header}>
          <Animated.Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: titleFont }]}>{t('profile.title')}</Animated.Text>
          <View style={styles.headerButtons}>
            <Pressable onPress={openEdit} style={({pressed}) => [styles.iconButton, { backgroundColor: isDark ? '#FFFFFF20' : '#F5F3FF', transform: [{ scale: pressed ? 0.9 : 1 }] }]}>
              <Ionicons name="pencil" size={18} color={colors.textPrimary} />
            </Pressable>
            <Animated.View style={gearStyle}>
              <Pressable onPress={openSettings} style={({pressed}) => [styles.iconButton, { backgroundColor: isDark ? '#FFFFFF20' : '#F5F3FF', transform: [{ scale: pressed ? 0.9 : 1 }] }]}>
                <Ionicons name="settings" size={18} color={colors.textPrimary} />
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      <BottomTabBar activeTab="Me" isDark={isDark} onTabPress={(tab) => {
        if (tab === 'Feed')   navigation.replace('Home');
        if (tab === 'Circle') navigation.replace('Circle');
        if (tab === 'Alerts') navigation.replace('Alerts');
      }} alertsCount={alertsUnreadCount} />
    </View>
  );
}

function AvatarWithRing({ user }: { user: any }) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);
  const { colors } = useTheme();
  useEffect(() => {
    pulseScale.value = withRepeat(withTiming(1.2, { duration: 2000 }), -1, true);
    pulseOpacity.value = withRepeat(withTiming(0, { duration: 2000 }), -1, true);
    return () => { cancelAnimation(pulseScale); cancelAnimation(pulseOpacity); };
  }, []);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }], opacity: pulseOpacity.value, borderColor: colors.primary }));
  return (
    <View style={styles.avatarWrap}>
      <Animated.View style={[styles.avatarRing, ringStyle]} />
      <View style={[styles.avatarSubRing, { borderColor: colors.primary + '40' }]} />
      <View style={[styles.avatar, { backgroundColor: user.avatarColor || '#6C47FF' }]}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={StyleSheet.absoluteFill} />
        ) : (
          <Text style={styles.avatarInitials}>{user.initials}</Text>
        )}
      </View>
    </View>
  );
}

function BarChart({ data, colors }: { data: any[]; colors: any }) {
  return <View style={styles.chart}>{data.map((row, i) => (<BarRow key={row.label} label={row.label} count={row.count} pct={row.pct} color={row.color} index={i} colors={colors} />))}</View>;
}

function BarRow({ label, pct, count, color, index, colors }: { label: string; pct: number; count: number; color: string; index: number; colors: any }) {
  const { t } = useTranslation();
  const width = useSharedValue(0);
  useEffect(() => { width.value = withDelay(400 + index * 100, withSpring(pct, { damping: 15 })); }, [pct]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{t(`home.filters.${label.toLowerCase()}`, { defaultValue: label })}</Text>
      <View style={[styles.barTrack, { backgroundColor: isFinite(index) ? (colors.border || '#ccc') : '#eee' }]}>
        <Animated.View style={[styles.barFill, fillStyle]}>
          <LinearGradient colors={[color + '90', color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
        </Animated.View>
      </View>
      <Text style={[styles.barCount, { color: colors.textPrimary }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  ambientGlowWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 400, opacity: 0.6 },
  ambientGlow: { flex: 1 },
  scroll: { flex: 1 },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitle: { fontSize: 24 },
  headerButtons: { flexDirection: 'row', gap: 10 },
  iconButton: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  hero: { alignItems: 'center', paddingVertical: 20 },
  avatarSection: { position: 'relative', marginBottom: 12 },
  glowCircle: { position: 'absolute', width: 80, height: 80, borderRadius: 40, opacity: 0.25, filter: [{ blur: 30 }] as any },
  avatarWrap: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
  avatarRing: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2 },
  avatarSubRing: { position: 'absolute', width: 105, height: 105, borderRadius: 52, borderWidth: 1, borderStyle: 'dashed' },
  avatar: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5, overflow: 'hidden' },
  avatarInitials: { color: '#FFFFFF', fontSize: 34, fontFamily: 'Inter_700Bold' },
  editPhotoBtn: { position: 'absolute', right: 0, bottom: 5, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  name: { fontSize: 30, marginTop: 4, textAlign: 'center' },
  username: { fontSize: 16, marginTop: 2, textAlign: 'center', fontFamily: 'Inter_500Medium', opacity: 0.6 },
  compBox: { marginTop: 20, marginHorizontal: 20, padding: 16, borderRadius: 24, borderWidth: 1, width: width - 40 },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  compLeft: { flex: 1 },
  compTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  compSub: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2, opacity: 0.7 },
  compTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  compFill: { height: '100%', borderRadius: 3 },
  joinedPill: { marginTop: 16, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  joinedText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  statsContainer: { marginHorizontal: 20, marginTop: 30, borderRadius: 24, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statDivider: { width: 1, height: 40, opacity: 0.3 },
  section: { marginTop: 32, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20 },
  seeAll: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  activityCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  chartTitle: { fontSize: 20, marginTop: 32, marginBottom: 16 },
  chartCard: { borderRadius: 24, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  chart: { gap: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barLabel: { fontSize: 12, width: 45, fontFamily: 'Inter_600SemiBold' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barCount: { fontSize: 13, fontFamily: 'Inter_700Bold', minWidth: 20, textAlign: 'right' },
  noActivity: { fontSize: 13, textAlign: 'center', paddingVertical: 20, fontFamily: 'Inter_500Medium', opacity: 0.6 },
});
