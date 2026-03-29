/**
 * CircleScreen — Overhauled with Premium "Spectrum" Design
 * Dynamic Glassmorphism, Fluid Transitions, and High-Fidelity UI.
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Pressable, TextInput,
  Dimensions, Alert, Modal, RefreshControl, BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withRepeat,
  FadeIn, FadeInDown, FadeInRight, FadeInUp,
  interpolate, Extrapolation, Layout,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { BottomTabBar } from '../components/BottomTabBar';
import { useAlerts } from '../context/AlertsContext';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { SuccessToast } from '../components/SuccessToast';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { supabase } from '../supabase/supabaseClient';
import { SIGNAL_TYPES } from '../constants/signalTypes';

const { width: W } = Dimensions.get('window');

type TabKey = 'connections' | 'requests';

// ─── Shared Components ────────────────────────────────────────────────────────
function Pulse({ color, size = 10 }: { color: string; size?: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(withTiming(2, { duration: 1500 }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 1500 }), -1, false);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={S.pulseRoot}>
      <Animated.View style={[S.pulseRing, ringStyle, { backgroundColor: color, width: size, height: size }]} />
      <View style={[S.pulseDot, { backgroundColor: color, width: size, height: size }]} />
    </View>
  );
}

function TabBar({ active, onChange, colors }: { active: TabKey; onChange: (k: TabKey) => void; colors: any }) {
  const { t } = useTranslation();
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'connections', label: t('circle.connections') },
    { key: 'requests', label: t('circle.requests') },
  ];
  return (
    <View style={S.tabContainer}>
      {tabs.map(t => {
        const sel = active === t.key;
        return (
          <TouchableOpacity key={t.key} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(t.key); }} style={[S.tab, sel && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
            <Text style={[S.tabTxt, { color: sel ? colors.textPrimary : colors.textSecondary, fontFamily: sel ? 'Inter_800ExtraBold' : 'Inter_600SemiBold', opacity: sel ? 1 : 0.6 }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Row Components ───────────────────────────────────────────────────────────
function ConnectionRow({ item, colors, onPress, onPulse }: { item: any; colors: any; onPress: () => void; onPulse: () => void }) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInRight.springify()} style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable 
        onPress={onPress} 
        onPressIn={() => { scale.value = withTiming(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
      >
        <Animated.View style={[S.cardInner, animatedStyle]}>
          <View style={[S.avatar, { backgroundColor: item.avatarColor }]}>
            <Text style={S.avatarTxt}>{item.initials}</Text>
            {item.isActive && <View style={S.activeWrap}><Pulse color="#10B981" /></View>}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[S.name, { color: colors.textPrimary }]}>{item.name}</Text>
            {item.isActive && (
              <View style={S.metaRow}>
                <View style={[S.badge, { backgroundColor: `${item.lastSignalColor}15` }]}>
                  <Text style={[S.badgeTxt, { color: item.lastSignalColor }]}>{t(`home.filters.${item.lastSignalType?.toLowerCase()}`, { defaultValue: item.lastSignalType })}</Text>
                </View>
                <Text style={[S.time, { color: colors.textSecondary, opacity: 0.6 }]}>{t('signalDetail.ago', { time: `${item.lastSignalMins}${t('common.minuteAbbr')}` })}</Text>
              </View>
            )}
            {!item.isActive && (
              <Text style={[S.handle, { color: colors.textSecondary, opacity: 0.5 }]}>@{item.handle}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={S.flashBtn}
            activeOpacity={0.6}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPulse(); }}
          >
            <LinearGradient colors={['#6C47FF', '#9D4EDD']} style={S.flashGrad}>
              <Ionicons name="flash" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function RequestRow({ item, colors, onAccept, onReject }: { item: any; colors: any; onAccept: () => void; onReject: () => void }) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeInRight.springify()} style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={S.cardInner}>
        <View style={[S.avatar, { backgroundColor: item.avatarColor }]}>
          <Text style={S.avatarTxt}>{item.initials}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[S.name, { color: colors.textPrimary }]}>{item.name}</Text>
          <View style={S.metaRow}>
             {item.mutualCount > 0 && <Text style={[S.handle, { color: colors.textSecondary }]}>{t('findFriends.mutuals', { count: item.mutualCount })}</Text>}
          </View>
        </View>
        <View style={S.reqActions}>
           <TouchableOpacity onPress={onAccept} style={[S.reqBtnSmall, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={20} color="#fff" />
           </TouchableOpacity>
           <TouchableOpacity onPress={onReject} style={[S.reqBtnSmall, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
           </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CircleScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialTab = route.params?.openTab !== undefined 
    ? (route.params.openTab === 1 ? 'requests' : 'connections')
    : 'connections';

  const [tab, setTab] = useState<TabKey>(initialTab as TabKey);
  const [searchQuery, setSearchQuery] = useState('');
  const [connections, setConnections] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [activePulseUser, setActivePulseUser] = useState<any>(null);
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; title: string; subtitle?: string; icon?: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getTypeColor = useCallback((type: string) => {
    return SIGNAL_TYPES.find(s => s.value === type)?.color || '#6C47FF';
  }, []);

  const loadCircleData = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Fetch connections where user is either requester or friend
      const { data: conns } = await supabase
        .from('connections')
        .select(`
          id, status, user_id, friend_id,
          requester:user_id (id, display_name, username, avatar_url, initials),
          friend:friend_id (id, display_name, username, avatar_url, initials)
        `)
        .or(`user_id.eq.${authUser.id},friend_id.eq.${authUser.id}`);

      const accepted = (conns || []).filter(c => c.status === 'accepted');
      const pendingRequests = (conns || []).filter(c => c.status === 'pending' && c.friend_id === authUser.id);

      const processedConns = accepted.map(c => {
        const requester = Array.isArray(c.requester) ? c.requester[0] : c.requester;
        const friend = Array.isArray(c.friend) ? c.friend[0] : c.friend;
        const other = c.user_id === authUser.id ? friend : requester;
        
        return {
          id: other?.id,
          name: other?.display_name,
          handle: other?.username,
          initials: other?.initials || other?.display_name?.split(' ').map((w: string) => w[0]).join('') || '?',
          avatarColor: '#6C47FF',
          avatar_url: other?.avatar_url,
        };
      }).filter(c => !!c.id);

      const friendIds = processedConns.map(c => c.id);
      
      // Fetch active signals for these friends
      let activeSignalsMap: Record<string, any> = {};
      if (friendIds.length > 0) {
        const { data: pulses } = await supabase
          .from('signals')
          .select('user_id, type, expires_at, created_at')
          .in('user_id', friendIds)
          .gt('expires_at', new Date().toISOString());
        
        pulses?.forEach(p => {
          activeSignalsMap[p.user_id] = p;
        });
      }

      setConnections(processedConns.map(c => {
        const signal = activeSignalsMap[c.id];
        const minsAgo = signal ? Math.max(0, Math.round((Date.now() - new Date(signal.created_at).getTime()) / 60000)) : 0;

        return {
          ...c,
          isActive: !!signal,
          lastSignalMins: signal ? minsAgo : 0,
          lastSignalType: signal?.type || null,
          lastSignalColor: signal ? getTypeColor(signal.type) : null,
          mutualCount: 0,
        };
      }));

      setRequests(pendingRequests.map((r: any) => {
        const reqUser = Array.isArray(r.requester) ? r.requester[0] : r.requester;
        return {
          id: r.id,
          userId: reqUser?.id,
          name: reqUser?.display_name,
          handle: `@${reqUser?.username}`,
          initials: reqUser?.initials || reqUser?.display_name?.split(' ').map((w: string) => w[0]).join('') || '?',
          avatarColor: '#6C47FF',
          mutualCount: 0,
        };
      }).filter(r => !!r.userId));
    } catch (err) {
      console.error('Error loading circle:', err);
    }
  }, [getTypeColor]);

  useEffect(() => { loadCircleData(); }, [loadCircleData]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await loadCircleData();
    setRefreshing(false);
  }, [loadCircleData]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => { navigation.replace('Home'); return true; };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  const { alertsUnreadCount } = useAlerts();

  const filtered = useMemo(() => {
    if (tab === 'requests') return requests;
    return connections.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [tab, searchQuery, requests, connections]);

  const handleDiscovery = () => navigation.navigate('Discovery');

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={isDark ? ['#6C47FF10', 'transparent'] : ['#E8E3FF', 'transparent']} style={{ height: 300, position: 'absolute', top: 0, left: 0, right: 0 }} />
      
      {/* Header */}
      <View style={[S.header, { paddingTop: insets.top + 10 }]}>
        <View style={S.headerTop}>
          <Text style={[S.headerTitle, { color: colors.textPrimary }]}>{t('circle.title')}</Text>
          <TouchableOpacity onPress={handleDiscovery} style={[S.plusBtn, { backgroundColor: colors.primary }]}>
             <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={[S.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} opacity={0.6} />
          <TextInput
            placeholder={t('circle.searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[S.searchInput, { color: colors.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TabBar active={tab} onChange={setTab} colors={colors} />
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <View style={S.listGap}>
            {[1,2,3,4].map(k => (
              <View key={k} style={[S.card, { backgroundColor: colors.surface, opacity: 0.5 }]}>
                <View style={S.cardInner}>
                  <SkeletonLoader width={56} height={56} borderRadius={20} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <SkeletonLoader width="60%" height={16} />
                    <SkeletonLoader width="40%" height={12} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : filtered.length > 0 ? (
          <View style={S.listGap}>
            {filtered.map(item => (
              tab === 'connections' ? (
                <ConnectionRow key={item.id} item={item} colors={colors} onPress={() => setSelectedUser(item)} onPulse={() => setActivePulseUser(item)} />
              ) : (
                <RequestRow key={item.id} item={item} colors={colors} 
                onAccept={async () => {
                  try {
                    await supabase
                      .from('connections')
                      .update({ status: 'accepted' })
                      .eq('id', item.id);
                    setRequests(p => p.filter(x => x.id !== item.id));
                    setConnections(p => [...p, {
                      ...item,
                      isActive: false,
                      lastSignalMins: 0,
                      lastSignalType: 'Signal',
                      lastSignalColor: '#6C47FF',
                    }]);
                    setToastConfig({ visible: true, title: t('circle.acceptedAlert'), subtitle: t('circle.acceptedSub', { name: item.name }), icon: 'checkmark-circle' });
                  } catch (err) {
                    console.error('Error accepting request:', err);
                  }
                }}
                onReject={async () => {
                  try {
                    await supabase
                      .from('connections')
                      .update({ status: 'blocked' })
                      .eq('id', item.id);
                    setRequests(p => p.filter(x => x.id !== item.id));
                  } catch (err) {
                    console.error('Error rejecting request:', err);
                  }
                }}
                />
              )
            ))}
          </View>
        ) : (
          <View style={S.center}>
             <Ionicons name={tab === 'connections' ? 'people-outline' : 'person-add-outline'} size={64} color={colors.textSecondary} opacity={0.2} />
             <Text style={[S.emptyText, { color: colors.textSecondary }]}>{tab === 'connections' ? t('circle.noConnections') : t('circle.noRequests')}</Text>
             <TouchableOpacity style={[S.actionBtn, { backgroundColor: colors.primary + '15' }]} onPress={handleDiscovery}>
                <Text style={[S.actionBtnTxt, { color: colors.primary }]}>{t('circle.findPeople')}</Text>
             </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BottomTabBar activeTab="Circle" isDark={isDark} onTabPress={t => {
        if (t === 'Feed')   navigation.replace('Home');
        if (t === 'Alerts') navigation.replace('Alerts');
        if (t === 'Me')     navigation.replace('Profile');
      }} alertsCount={alertsUnreadCount} />

      {/* Pulse Modal */}
      <Modal visible={!!activePulseUser} transparent animationType="slide">
        <View style={S.modalOverlay}>
           <Pressable style={StyleSheet.absoluteFill} onPress={() => setActivePulseUser(null)}>
              <BlurView intensity={isDark ? 20 : 60} style={StyleSheet.absoluteFill} tint="dark" />
           </Pressable>
           <Animated.View entering={FadeInUp.springify().damping(22)} style={[S.modalCard, { backgroundColor: colors.surface }]}>
              <View style={[S.modalBar, { backgroundColor: colors.border }]} />
              <View style={S.modalHeader}>
                 <View style={[S.modalIconWrap, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="flash" size={32} color={colors.primary} />
                 </View>
                 <Text style={[S.modalTitle, { color: colors.textPrimary }]}>{t('circle.sendPulseTitle')}</Text>
                 <Text style={[S.modalSub, { color: colors.textSecondary }]}>{t('circle.sendPulseSub', { name: activePulseUser?.name })}</Text>
              </View>
              <View style={S.modalActions}>
                  <TouchableOpacity 
                    style={[S.modalBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                       setToastConfig({ visible: true, title: t('toasts.buzzSent'), subtitle: t('toasts.buzzSentSub', { name: activePulseUser?.name }), icon: 'flash' });
                       setActivePulseUser(null);
                    }}
                  >
                    <Text style={S.modalBtnTxtWhite}>{t('circle.buzz')}</Text>
                    <Ionicons name="notifications" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[S.modalBtnSec, { borderColor: colors.border }]}
                    onPress={() => {
                        navigation.navigate('Chat', { userId: activePulseUser?.id });
                        setActivePulseUser(null);
                    }}
                  >
                    <Text style={[S.modalBtnTxt, { color: colors.textPrimary }]}>{t('circle.dm')}</Text>
                    <Ionicons name="chatbubble" size={18} color={colors.primary} />
                  </TouchableOpacity>
              </View>
           </Animated.View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal visible={!!selectedUser && !activePulseUser} transparent animationType="slide">
          <View style={S.modalOverlay}>
             <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedUser(null)}>
                <BlurView intensity={isDark ? 20 : 60} style={StyleSheet.absoluteFill} tint="dark" />
             </Pressable>
             <Animated.View entering={FadeInUp.springify()} style={[S.modalCard, { backgroundColor: colors.surface }]}>
                <View style={[S.modalBar, { backgroundColor: colors.border }]} />
                <View style={S.modalHeader}>
                   <View style={[S.modalAvatar, { backgroundColor: selectedUser?.avatarColor }]}>
                      <Text style={S.modalAvatarTxt}>{selectedUser?.initials}</Text>
                   </View>
                   <Text style={[S.modalTitle, { color: colors.textPrimary }]}>{selectedUser?.name}</Text>
                   <Text style={[S.modalSub, { color: colors.textSecondary }]}>{selectedUser?.handle}</Text>
                </View>
                <View style={S.modalActions}>
                   <TouchableOpacity style={[S.modalBtnSec, { borderColor: colors.border }]} onPress={() => { navigation.navigate('UserProfile', { userId: selectedUser?.id }); setSelectedUser(null); }}>
                      <Text style={[S.modalBtnTxt, { color: colors.textPrimary }]}>{t('circle.viewProfile')}</Text>
                      <Ionicons name="person" size={18} color={colors.primary} />
                   </TouchableOpacity>
                   <TouchableOpacity style={[S.modalBtnSec, { borderColor: colors.border }]} onPress={() => setActivePulseUser(selectedUser)}>
                      <Text style={[S.modalBtnTxt, { color: colors.textPrimary }]}>{t('circle.sendPulseTitle')}</Text>
                      <Ionicons name="flash" size={18} color={colors.primary} />
                   </TouchableOpacity>
                   <TouchableOpacity 
                     style={[S.modalBtnSec, { borderColor: colors.error + '30' }]} 
                     onPress={async () => {
                      try {
                        const { data: { user: authUser } } = await supabase.auth.getUser();
                        if (!authUser) return;
                        await supabase
                          .from('connections')
                          .delete()
                          .eq('user_id', authUser.id)
                          .eq('friend_id', selectedUser?.id);
                        const name = selectedUser?.name;
                        setConnections(p => p.filter(u => u.id !== selectedUser?.id));
                        setSelectedUser(null);
                        setToastConfig({ visible: true, title: t('circle.removedAlert', { defaultValue: 'User Removed' }), subtitle: t('circle.removedSub', { name, defaultValue: `${name} has been removed from your circle` }), icon: 'trash-outline' });
                      } catch (err) {
                        console.error('Error removing connection:', err);
                      }
                   }}
                   >
                      <Text style={[S.modalBtnTxt, { color: colors.error }]}>{t('circle.remove')}</Text>
                      <Ionicons name="trash" size={18} color={colors.error} />
                   </TouchableOpacity>
                </View>
             </Animated.View>
          </View>
      </Modal>

      {toastConfig && (<SuccessToast visible={toastConfig.visible} title={toastConfig.title} subtitle={toastConfig.subtitle} icon={toastConfig.icon as any} onHide={() => setToastConfig(null)} />)}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 10, gap: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 34, fontFamily: 'Inter_900Black', letterSpacing: -1.5 },
  plusBtn: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, gap: 12 },
  searchInput: { flex: 1, fontSize: 16, fontFamily: 'Inter_500Medium' },
  tabContainer: { flexDirection: 'row', gap: 24, marginTop: 4 },
  tab: { paddingTop: 10, paddingBottom: 14 },
  tabTxt: { fontSize: 17 },
  listGap: { gap: 12 },
  card: { borderRadius: 24, borderBottomWidth: 2, borderRightWidth: 1, overflow: 'hidden' },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  avatar: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 22, fontFamily: 'Inter_800ExtraBold' },
  activeWrap: { position: 'absolute', bottom: -4, right: -4 },
  pulseRoot: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', borderRadius: 100 },
  pulseDot: { borderRadius: 100, borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  handle: { fontSize: 13, opacity: 0.6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 8 },
  badgeTxt: { fontSize: 10, fontFamily: 'Inter_800ExtraBold', textTransform: 'uppercase' },
  time: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  flashBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
  flashGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reqActions: { flexDirection: 'row', gap: 10 },
  reqBtnSmall: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 16 },
  emptyText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', opacity: 0.8 },
  actionBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  actionBtnTxt: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, paddingBottom: 50 },
  modalBar: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 24, opacity: 0.2 },
  modalHeader: { alignItems: 'center', marginBottom: 30, gap: 10 },
  modalIconWrap: { width: 70, height: 70, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  modalAvatar: { width: 80, height: 80, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  modalAvatarTxt: { fontSize: 28, fontFamily: 'Inter_800ExtraBold', color: '#fff' },
  modalTitle: { fontSize: 24, fontFamily: 'Inter_900Black', textAlign: 'center' },
  modalSub: { fontSize: 15, fontFamily: 'Inter_500Medium', textAlign: 'center', opacity: 0.6 },
  modalActions: { gap: 12 },
  modalBtn: { height: 60, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  modalBtnWhite: { backgroundColor: '#fff' },
  modalBtnTxtWhite: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  modalBtnSec: { height: 60, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1 },
  modalBtnTxt: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});

function getTypeColor(type: string): string {
  const t = SIGNAL_TYPES.find(x => x.value === type);
  return t?.color || '#6C47FF';
}