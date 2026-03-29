import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  Pressable, NativeSyntheticEvent, NativeScrollEvent,
  Dimensions, TouchableOpacity, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import Animated, {
  FadeInDown, FadeIn, FadeInUp,
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withRepeat, withSequence,
  Easing, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SIGNAL_TYPES } from '../data/mockSignals';
import { useUserLocation } from '../hooks/useUserLocation';
import {
  FilterTabs, SignalCard, BottomTabBar,
  SuccessToast, ActionModal
} from '../components';
import { useAlerts } from '../context/AlertsContext';
import { useSignals } from '../context/SignalsContext';
import { useTranslation } from 'react-i18next';
import type { SignalData } from '../types/signal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SkeletonLoader } from '../components/SkeletonLoader';

const { width: W } = Dimensions.get('window');

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { coords } = useUserLocation();
  const { alertsUnreadCount } = useAlerts();
  const { signals, setSignals, addSignal, removeSignal, fetchNearbySignals, myActiveSignal } = useSignals();
  const { t } = useTranslation();

  const [activeFilter, setActiveFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; title: string; subtitle?: string; icon?: string } | null>(null);
  const [optionsSignal, setOptionsSignal] = useState<SignalData | null>(null);

  const scrollY = useSharedValue(0);
  const fabVisible = useSharedValue(1);
  const lastScrollY = useSharedValue(0);

  // Fallback to 'User' or username if name isn't set yet
  const currentUserName = user?.name || user?.username || 'User';
  const displayName = currentUserName.split(' ')[0];

  const route = useRoute<RouteProp<RootStackParamList, 'Home'>>();
  const params = route.params as { newSignal?: SignalData; removedSignalId?: string } | undefined;

  const welcomeMsg = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return t('home.goodMorning');
    if (hr < 18) return t('home.goodAfternoon');
    return t('home.goodEvening');
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => false;
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      if (coords && coords.lat && coords.lng) {
        fetchNearbySignals(
          coords.lat,
          coords.lng,
          5000
        );
      }

      if (params?.newSignal) {
        addSignal(params.newSignal);
        setToastConfig({ visible: true, title: t('toasts.signalLive', { defaultValue: 'Signal is Live' }), subtitle: t('toasts.signalLiveSub', { defaultValue: 'Others can now see your pulse.' }), icon: 'radio' });
        navigation.setParams({ newSignal: undefined } as any);
      }
      if (params?.removedSignalId) {
        removeSignal(params.removedSignalId);
        setToastConfig({ visible: true, title: t('toasts.signalRemoved', { defaultValue: 'Signal Removed' }), subtitle: t('toasts.signalRemovedSub', { defaultValue: 'Your pulse is no longer visible.' }), icon: 'trash' });
        navigation.setParams({ removedSignalId: undefined } as any);
      }

      return () => subscription.remove();
    }, [params?.newSignal, params?.removedSignalId, navigation, addSignal, removeSignal, t]),
  );

  const filteredSignals = activeFilter === 'ALL'
    ? signals
    : signals.filter(s => s.type === activeFilter);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    if (coords && coords.lat && coords.lng) {
      await fetchNearbySignals(
        coords.lat,
        coords.lng,
        (user as any)?.discovery_radius || 5000
      );
    }
    setRefreshing(false);
  }, [coords, user]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollY.value = y;
    const diff = y - lastScrollY.value;
    if (y < 50) fabVisible.value = withTiming(1);
    else if (diff > 10) fabVisible.value = withTiming(0);
    else if (diff < -10) fabVisible.value = withTiming(1);
    lastScrollY.value = y;
  };

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 50], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, 50], [-10, 0], Extrapolation.CLAMP) }]
  }));

  const fabStyle = useAnimatedStyle(() => ({
    opacity: fabVisible.value,
    transform: [
      { scale: withSpring(fabVisible.value) },
      { translateY: interpolate(fabVisible.value, [0, 1], [40, 0]) }
    ] as any
  }));

  const renderItem = useCallback(({ item, index }: { item: SignalData; index: number }) => (
    <SignalCard
      signal={item}
      index={index}
      isDark={isDark}
      onClose={item.isOwn ? () => {
        removeSignal(item.id);
        setToastConfig({ visible: true, title: t('toasts.signalRemoved'), subtitle: t('toasts.signalRemovedSub'), icon: 'trash-outline' });
      } : undefined}
      onPress={() => navigation.navigate('SignalDetail', { signal: item })}
      onPressDots={() => setOptionsSignal(item)}
    />
  ), [isDark, navigation, t, removeSignal]);

  const TAB_H = 75;

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={isDark ? ['#1A1529', '#0F0C1D'] : ['#F8F7FF', '#F0EFFF']} style={StyleSheet.absoluteFill} />
        <Animated.View entering={FadeIn.duration(1000)} style={[S.glow, { top: -100, right: -100, backgroundColor: colors.primary + '15' }]} />
        <Animated.View entering={FadeIn.delay(200).duration(1000)} style={[S.glow, { bottom: 100, left: -100, backgroundColor: colors.accent + '10' }]} />
      </View>

      <View style={[S.headFixed, { paddingTop: insets.top }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerStyle]}>
          <BlurView intensity={isDark ? 40 : 80} style={StyleSheet.absoluteFill} tint={isDark ? "dark" : "light"} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]} />
        </Animated.View>

        <View style={S.headHdr}>
          <View>
            <Text style={[S.welcome, { color: colors.textSecondary }]}>{welcomeMsg}</Text>
            <Text style={[S.brand, { color: colors.textPrimary }]}>{displayName}<Text style={{ color: colors.primary }}>.</Text></Text>
          </View>

          <View style={S.headRight}>
            <HeaderAction icon="notifications-outline" badge={alertsUnreadCount} onPress={() => navigation.navigate('Alerts')} colors={colors} />
            <TouchableOpacity style={S.avatarBtn} onPress={() => navigation.navigate('Profile')}>
              <View style={[S.avatarPlaceholder, { backgroundColor: colors.primary + '15' }]}>
                {user?.avatar ? (
                  <Animated.Image source={{ uri: user.avatar }} style={StyleSheet.absoluteFill} />
                ) : (
                  <Text style={[S.avatarTxt, { color: colors.primary }]}>{displayName[0]}</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <FilterTabs types={SIGNAL_TYPES} activeType={activeFilter} onTypeChange={setActiveFilter} isDark={isDark} />
      </View>

      <FlatList
        data={filteredSignals}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[S.list, { paddingTop: insets.top + 130, paddingBottom: TAB_H + insets.bottom + 80 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={isLoading ? (
          <View style={{ gap: 16 }}>
            {[1, 2, 3].map(k => (
              <View key={k} style={{ padding: 20, borderRadius: 24, backgroundColor: colors.surface }}>
                <SkeletonLoader width="100%" height={200} borderRadius={16} />
              </View>
            ))}
          </View>
        ) : (
          <EmptyState colors={colors} isDark={isDark} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      />

      <Animated.View style={[S.fabBox, { bottom: TAB_H + insets.bottom + 20 }, fabStyle]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (myActiveSignal) {
              navigation.navigate('SignalDetail', { signal: myActiveSignal });
            } else {
              navigation.navigate('ComposeSignal');
            }
          }}
          style={S.fab}
        >
          <LinearGradient colors={[colors.primary, colors.accent]} style={S.fabGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={S.fabIconCircle}><Ionicons name={myActiveSignal ? "eye" : "flash"} size={18} color="#fff" /></View>
            <Text style={S.fabTxt}>{myActiveSignal ? t('signalDetail.yourPulse', { defaultValue: 'Your Pulse' }) : t('home.sendSignal')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <BottomTabBar activeTab="Feed" isDark={isDark} onTabPress={t => {
        if (t === 'Circle') navigation.replace('Circle');
        if (t === 'Alerts') navigation.replace('Alerts');
        if (t === 'Me') navigation.replace('Profile');
      }} alertsCount={alertsUnreadCount} />

      {toastConfig && (<SuccessToast visible={toastConfig.visible} title={toastConfig.title} subtitle={toastConfig.subtitle} icon={toastConfig.icon as any} onHide={() => setToastConfig(null)} />)}

      <ActionModal
        visible={optionsSignal !== null}
        onClose={() => setOptionsSignal(null)}
        title={t('common.options')}
        options={[
          {
            id: 'report', label: t('common.report'), icon: 'warning-outline' as any, danger: true,
            onPress: () => {
              setOptionsSignal(null);
              setTimeout(() => setToastConfig({ visible: true, title: t('common.reported'), subtitle: t('common.reportedSub'), icon: 'shield-checkmark' }), 400);
            }
          },
          {
            id: 'mute', label: t('common.mute'), icon: 'volume-mute-outline' as any,
            onPress: () => {
              setSignals(p => p.filter(s => s.user.username !== optionsSignal?.user.username));
              setOptionsSignal(null);
              setTimeout(() => setToastConfig({ visible: true, title: t('common.muted'), subtitle: t('common.mutedSub'), icon: 'volume-mute' }), 400);
            }
          }
        ]}
      />
    </View>
  );
}

function HeaderAction({ icon, badge, onPress, colors }: any) {
  return (
    <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }} style={[S.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={20} color={colors.textPrimary} />
      {!!badge && badge > 0 && (
        <View style={[S.badge, { backgroundColor: colors.error }]}><Text style={S.badgeTxt}>{badge > 9 ? '9+' : badge}</Text></View>
      )}
    </TouchableOpacity>
  );
}

function EmptyState({ colors, isDark }: any) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeIn.duration(600)} style={S.empty}>
      <View style={[S.emptyIcon, { backgroundColor: colors.primary + '10' }]}><Ionicons name="radio-outline" size={48} color={colors.primary} /></View>
      <Text style={[S.emptyTitle, { color: colors.textPrimary }]}>{t('home.emptyTitle')}</Text>
      <Text style={[S.emptySub, { color: colors.textSecondary }]}>{t('home.emptyStateSub')}</Text>
    </Animated.View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  headFixed: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  welcome: { fontSize: 13, fontFamily: 'Inter_700Bold', opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 },
  brand: { fontSize: 32, fontFamily: 'Inter_900Black', letterSpacing: -1.5 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionBtn: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeTxt: { color: '#fff', fontSize: 9, fontFamily: 'Inter_800ExtraBold' },
  avatarBtn: { width: 44, height: 44, borderRadius: 16, overflow: 'hidden' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 16, fontFamily: 'Inter_800ExtraBold' },
  list: { paddingHorizontal: 16 },
  fabBox: { position: 'absolute', right: 20, zIndex: 20 },
  fab: { borderRadius: 28, shadowColor: '#6C47FF', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  fabGrad: { flexDirection: 'row', alignItems: 'center', height: 60, paddingLeft: 10, paddingRight: 28, borderRadius: 30, gap: 12 },
  fabIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  fabTxt: { color: '#fff', fontSize: 17, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 40 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontFamily: 'Inter_900Black', marginBottom: 12, textAlign: 'center' },
  emptySub: { fontSize: 15, fontFamily: 'Inter_500Medium', textAlign: 'center', lineHeight: 24, opacity: 0.6 },
});