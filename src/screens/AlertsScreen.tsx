import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  TouchableOpacity, Dimensions, ActivityIndicator,
  Modal, Alert as RNAlert, ScrollView, BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withRepeat, withDelay,
  FadeIn, FadeInDown, FadeOut, SlideInUp, SlideOutDown,
  Layout, runOnJS,
  useAnimatedScrollHandler, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { useAlerts } from '../context/AlertsContext';
import { SuccessToast } from '../components/SuccessToast';
import { supabase } from '../supabase/supabaseClient';
import { SkeletonLoader } from '../components/SkeletonLoader';
import * as Haptics from 'expo-haptics';
import { RefreshControl } from 'react-native';
import { translateTimeAgo } from '../utils/dateUtils';

const { width: W, height: H } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
type AlertType =
  | 'signal'
  | 'response_in'
  | 'response_maybe'
  | 'chat'
  | 'connect_request'
  | 'expiring'
  | 'expired';

type AlertItem = {
  id: string;
  type: AlertType;
  read: boolean;
  timeLabel: string;
  group: 'today' | 'yesterday' | 'earlier';
  senderName?: string;
  senderInitials?: string;
  senderColor?: string;
  senderAvatar?: string;
  signalType?: string;
  signalTypeColor?: string;
  signalText?: string;
  chatPreview?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  targetId?: string; // ID of the related signal or user
};



type FilterKey = 'all' | 'signals' | 'responses' | 'chats';
const FILTERS: { key: FilterKey; labelKey: string; icon: string }[] = [
  { key: 'all', labelKey: 'alerts.filters.all', icon: 'apps-outline' },
  { key: 'signals', labelKey: 'alerts.filters.signals', icon: 'flash-outline' },
  { key: 'responses', labelKey: 'alerts.filters.responses', icon: 'checkmark-circle-outline' },
  { key: 'chats', labelKey: 'alerts.filters.chats', icon: 'chatbubble-outline' },
];

const GROUP_LABEL_KEYS: Record<string, string> = {
  today: 'alerts.today', yesterday: 'alerts.yesterday', earlier: 'alerts.earlier',
};

// ─── Alert icon + colour logic ────────────────────────────────────────────────
function alertConfig(a: AlertItem, colors: any, t: any): {
  icon: string; iconColor: string; iconBg: string; body: string;
} {
  switch (a.type) {
    case 'signal':
      return {
        icon: 'flash', iconColor: '#fff',
        iconBg: a.senderColor ?? colors.primary,
        body: t('alerts.body.signal', { text: a.signalText ?? '' }),
      };
    case 'response_in':
      return {
        icon: 'checkmark-circle', iconColor: '#fff',
        iconBg: colors.success,
        body: t('alerts.body.isIn'),
      };
    case 'response_maybe':
      return {
        icon: 'help-circle', iconColor: '#fff',
        iconBg: colors.warning,
        body: t('alerts.body.saidMaybe'),
      };
    case 'chat':
      return {
        icon: 'chatbubble', iconColor: '#fff',
        iconBg: a.senderColor ?? colors.primary,
        body: t('alerts.body.chat', { text: a.chatPreview ?? '' }),
      };
    case 'connect_request':
      return {
        icon: 'person-add', iconColor: '#fff',
        iconBg: colors.primary,
        body: t('alerts.body.wantsConnect'),
      };
    case 'expiring':
      return {
        icon: 'timer', iconColor: '#fff',
        iconBg: colors.warning,
        body: t('alerts.body.expiring'),
      };
    case 'expired':
      return {
        icon: 'close-circle', iconColor: '#fff',
        iconBg: colors.textSecondary,
        body: t('alerts.body.expired'),
      };
  }
}

// ─── Empty State Component ────────────────────────────────────────────────────
function EmptyAlerts({ colors, isDark }: { colors: any; isDark: boolean }) {
  const { t } = useTranslation();
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);

  useEffect(() => {
    ring1.value = withRepeat(withTiming(1, { duration: 3000 }), -1, false);
    ring2.value = withRepeat(withDelay(1500, withTiming(1, { duration: 3000 })), -1, false);
  }, []);

  const ringStyle = (sv: any) => useAnimatedStyle(() => ({
    width: interpolate(sv.value, [0, 1], [80, 200]),
    height: interpolate(sv.value, [0, 1], [80, 200]),
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.primary,
    opacity: interpolate(sv.value, [0, 0.5, 1], [0, 0.3, 0]),
    position: 'absolute',
    transform: [{ scale: 1 }],
  }));


  return (
    <View style={S.emptyContainer}>
      <View style={S.emptyIconWrap}>
        <Animated.View style={ringStyle(ring1)} />
        <Animated.View style={ringStyle(ring2)} />
        <View style={[S.emptyIconCircle, { backgroundColor: isDark ? colors.primary + '20' : '#F5F3FF' }]}>
          <Ionicons name="notifications-outline" size={40} color={colors.primary} />
        </View>
      </View>
      <Text style={[S.emptyTitle, { color: colors.textPrimary }]}>{t('alerts.noAlerts')}</Text>
      <Text style={[S.emptySub, { color: colors.textSecondary }]}>{t('alerts.noAlertsSub')}</Text>
    </View>
  );
}

// ─── Alert Detail Modal ─────────────────────────────────────────────────────
function AlertDetailModal({ alert, visible, onClose, colors, isDark, onAccept, onReject }: {
  alert: AlertItem | null; visible: boolean; onClose: () => void; colors: any; isDark: boolean;
  onAccept: (id: string) => void; onReject: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (!alert) return null;
  const cfg = alertConfig(alert, colors, t);
  const navigation = useNavigation<any>();

  const isRequest = alert.type === 'connect_request';
  const hasStatus = alert.status && alert.status !== 'pending';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={S.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={isDark ? 20 : 60} style={StyleSheet.absoluteFill} tint="dark" />
        </Pressable>

        <Animated.View
          entering={SlideInUp.springify().damping(24).mass(0.8).stiffness(120)}
          exiting={SlideOutDown.duration(200)}
          style={[S.modalCard, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
        >
          <View style={[S.modalBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />

          <View style={S.modalHeader}>
            <View style={[S.modalIconBox, { backgroundColor: cfg.iconBg + '15' }]}>
              <LinearGradient colors={[cfg.iconBg, cfg.iconBg + 'CC']} style={S.modalIconGrad}>
                <Ionicons name={cfg.icon as any} size={24} color="#fff" />
              </LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[S.modalTitle, { color: colors.textPrimary }]}>{alert.senderName || t('alerts.modal.system')}</Text>
              <Text style={[S.modalSub, { color: colors.textSecondary }]}>{translateTimeAgo(alert.timeLabel, t)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={S.modalClose}>
              <View style={[S.closeCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={S.modalBody}>
            <Text style={[S.modalBodyTxt, { color: colors.textPrimary }]}>
              {alert.senderName ? <Text style={{ fontFamily: 'Inter_800ExtraBold' }}>{alert.senderName.split(' ')[0]} </Text> : ''}
              {cfg.body}
            </Text>

            {alert.type === 'signal' && (
              <View style={[S.visualBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }]}>
                <View style={S.visualRow}>
                  <Ionicons name="location" size={16} color={alert.signalTypeColor ?? colors.primary} />
                  <Text style={[S.visualTxt, { color: colors.textSecondary }]}>{t('alerts.modal.nearBaku')}</Text>
                </View>
                <View style={[S.mapPlaceholder, { backgroundColor: (alert.signalTypeColor ?? colors.primary) + '10' }]}>
                  <Ionicons name="navigate" size={32} color={alert.signalTypeColor ?? colors.primary} opacity={0.4} />
                  <Text style={[S.mapLabel, { color: alert.signalTypeColor ?? colors.primary }]}>{t('alerts.modal.liveMap')}</Text>
                </View>
              </View>
            )}

            {alert.type === 'chat' && alert.chatPreview && (
              <View style={[S.chatBubble, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[S.chatBubbleTxt, { color: colors.textPrimary }]}>"{alert.chatPreview}"</Text>
              </View>
            )}
          </View>

          <View style={S.modalActions}>
            {hasStatus ? (
              <View style={[S.statusPill, { backgroundColor: alert.status === 'accepted' ? colors.success + '15' : colors.error + '15' }]}>
                <Ionicons name={alert.status === 'accepted' ? 'checkmark-circle' : 'close-circle'} size={20} color={alert.status === 'accepted' ? colors.success : colors.error} />
                <Text style={[S.statusText, { color: alert.status === 'accepted' ? colors.success : colors.error }]}>
                  {alert.status === 'accepted' ? t('common.accepted') : t('common.rejected')}
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[S.modalMainBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    if (isRequest) {
                      onAccept(alert.id);
                    } else {
                      onClose();
                      if (alert.type === 'chat') {
                        navigation.navigate('Chat', { userId: alert.targetId || alert.id });
                      } else if (alert.targetId) {
                        navigation.navigate('SignalDetail', { signal: { id: alert.targetId } });
                      }
                    }
                  }}
                >
                  <LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <Text style={S.modalMainBtnTxt}>{isRequest ? t('alerts.modal.accept') : t('alerts.modal.respond')}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ position: 'absolute', right: 20 }} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => isRequest ? onReject(alert.id) : onClose()} style={[S.modalSecBtn, { borderColor: colors.border }]}>
                  <Text style={[S.modalSecBtnTxt, { color: colors.textSecondary }]}>{t('alerts.modal.dismiss')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────
function FilterBar({ active, onChange, colors, isDark }: {
  active: FilterKey; onChange: (k: FilterKey) => void; colors: any; isDark: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterScroll}>
      {FILTERS.map((f, i) => {
        const sel = f.key === active;
        return (
          <Animated.View key={f.key} entering={FadeInDown.delay(100 + i * 40).springify()}>
            <Pressable onPress={() => { onChange(f.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              {sel ? (
                <View style={S.filterPillSel}>
                  <LinearGradient colors={['#6C47FF', '#9D4EDD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                  <Ionicons name={f.icon as any} size={13} color="#fff" />
                  <Text style={S.filterLabelSel}>{t(f.labelKey)}</Text>
                </View>
              ) : (
                <View style={[S.filterPill, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                  <Ionicons name={f.icon as any} size={13} color={colors.textSecondary} />
                  <Text style={[S.filterLabel, { color: colors.textSecondary }]}>{t(f.labelKey)}</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        );
      })}
    </Animated.ScrollView>
  );
}

// ─── Alert row ────────────────────────────────────────────────────────────────
function AlertRow({ alert, colors, isDark, onPress, onDismiss }: {
  alert: AlertItem; colors: any; isDark: boolean;
  onPress: () => void;
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  const cfg = alertConfig(alert, colors, t);
  const scale = useSharedValue(1);
  const op = useSharedValue(1);
  const tx = useSharedValue(0);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: tx.value }],
    opacity: op.value,
  } as any));

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    op.value = withTiming(0, { duration: 180 });
    tx.value = withTiming(30, { duration: 180 });
    setTimeout(() => runOnJS(onDismiss)(alert.id), 190);
  };

  return (
    <Animated.View layout={Layout.springify().damping(20)} style={[rowStyle, { marginBottom: 8 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.98, { duration: 100 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 100 }); }}
        style={[S.alertRow, { backgroundColor: colors.surface, borderColor: alert.read ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : `${colors.primary}35`, borderWidth: 1 }]}
      >
        {!alert.read && <View style={[S.unreadBar, { backgroundColor: colors.primary }]} />}
        <View style={[S.alertIconBox, { backgroundColor: cfg.iconBg + '12' }]}>
          {alert.senderAvatar ? (
            <Animated.Image source={{ uri: alert.senderAvatar }} style={S.alertIconGrad} />
          ) : (
            <LinearGradient colors={[cfg.iconBg, cfg.iconBg + 'CC']} style={S.alertIconGrad}>
              <Ionicons name={cfg.icon as any} size={15} color="#fff" />
            </LinearGradient>
          )}
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={[S.alertBody, { color: colors.textPrimary }]} numberOfLines={1}>
            {alert.senderName && <Text style={S.alertSender}>{alert.senderName} </Text>}
            <Text style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}>{cfg.body.split('·')[1] || cfg.body}</Text>
          </Text>
          <View style={S.metaRow}>
            {alert.status && alert.status !== 'pending' ? (
              <View style={[S.signalBadge, { backgroundColor: alert.status === 'accepted' ? colors.success + '12' : colors.error + '12', borderColor: alert.status === 'accepted' ? colors.success + '20' : colors.error + '20' }]}>
                <Text style={[S.signalBadgeTxt, { color: alert.status === 'accepted' ? colors.success : colors.error }]}>{t(`common.${alert.status}`)}</Text>
              </View>
            ) : alert.signalType ? (
              <View style={[S.signalBadge, { backgroundColor: `${alert.signalTypeColor}12`, borderColor: `${alert.signalTypeColor}20` }]}>
                <Text style={[S.signalBadgeTxt, { color: alert.signalTypeColor }]}>{alert.signalType}</Text>
              </View>
            ) : alert.type === 'connect_request' ? (
              <View style={[S.signalBadge, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '20' }]}>
                <Text style={[S.signalBadgeTxt, { color: colors.primary }]}>{t('common.pending')}</Text>
              </View>
            ) : null}
            <Text style={[S.alertTime, { color: colors.textSecondary, opacity: 0.5 }]}>{translateTimeAgo(alert.timeLabel, t)}</Text>
          </View>
        </View>
        <View style={S.alertRight}>
          {!alert.read ? <View style={[S.miniDot, { backgroundColor: colors.primary }]} /> : <View style={{ height: 6 }} />}
          <TouchableOpacity onPress={handleDismiss} style={S.dismissBtn} hitSlop={10}>
            <Ionicons name="close" size={14} color={colors.textSecondary} opacity={0.3} />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function mapNotificationType(type: string): AlertType {
  const map: Record<string, AlertType> = {
    signal_interest: 'response_in',
    friend_request: 'connect_request',
    signal_active: 'signal',
    chat_message: 'chat',
  };
  return map[type] || 'signal';
}

function formatTimeAgo(timestamp: string): string {
  return timestamp; // Let translateTimeAgo handle it at render time
}

function getGroup(timestamp: string): 'today' | 'yesterday' | 'earlier' {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = diff / 3600000;
  if (hours < 24) return 'today';
  if (hours < 48) return 'yesterday';
  return 'earlier';
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AlertsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { alertsUnreadCount, setAlertsUnreadCount } = useAlerts();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; title: string; subtitle?: string; icon?: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);

  const unreadCount = alerts.filter(a => !a.read).length;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          is_read,
          created_at,
          target_id,
          sender:sender_id (
            id,
            display_name,
            username,
            avatar_url,
            avatar_color
          )
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: AlertItem[] = (data || []).map((n: any) => ({
        id: n.id,
        type: mapNotificationType(n.type),
        read: n.is_read,
        senderInitials: n.sender?.display_name?.split(' ').map((w: string) => w[0]).join('') || '?',
        senderColor: n.sender?.avatar_color || '#6C47FF',
        senderAvatar: n.sender?.avatar_url || undefined,
        timeLabel: n.created_at, // Use raw string for translateTimeAgo
        group: getGroup(n.created_at),
        targetId: n.target_id,
      }));

      setAlerts(mapped);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setAlertsUnreadCount(unreadCount); }, [unreadCount, setAlertsUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => { navigation.replace('Home'); return true; };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case 'signals': return alerts.filter(a => a.type === 'signal' || a.type === 'expiring' || a.type === 'expired');
      case 'responses': return alerts.filter(a => a.type === 'response_in' || a.type === 'response_maybe');
      case 'chats': return alerts.filter(a => a.type === 'chat');
      default: return alerts;
    }
  }, [filter, alerts]);

  const grouped = useMemo(() => {
    const groups: Record<string, AlertItem[]> = {};
    const ORDER = ['today', 'yesterday', 'earlier'];
    for (const a of filtered) {
      if (!groups[a.group]) groups[a.group] = [];
      groups[a.group].push(a);
    }
    return ORDER.filter(g => !!groups[g]).map(g => ({ key: g, items: groups[g] }));
  }, [filtered]);

  const onDismiss = (id: string) => setAlerts(p => p.filter(a => a.id !== id));
  const onMarkRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setAlerts(p => p.map(a => a.id === id ? { ...a, read: true } : a));
    } catch (err) {}
  };

  const onMarkAllRead = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      setAlerts(p => p.map(a => ({ ...a, read: true })));
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const onAccept = async (id: string) => {
    const alert = alerts.find(a => a.id === id);
    try {
      if (alert?.targetId) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;
        
        await supabase
          .from('connections')
          .update({ status: 'accepted' })
          .eq('user_id', alert.targetId)
          .eq('friend_id', currentUser.id);
      }
      await onMarkRead(id);
      setAlerts(p => p.map(a => a.id === id ? { ...a, status: 'accepted', read: true } : a));
      setSelectedAlert(null);
      setTimeout(() => {
        setToastConfig({ visible: true, title: t('toasts.connectionAccepted'), subtitle: t('toasts.connectedWith', { name: alert?.senderName || 'user' }), icon: 'checkmark-circle' });
      }, 300);
    } catch (err) {
      console.error('Error accepting connection:', err);
    }
  };

  const onReject = async (id: string) => {
    const alert = alerts.find(a => a.id === id);
    try {
      if (alert?.targetId) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        await supabase
          .from('connections')
          .update({ status: 'blocked' })
          .eq('user_id', alert.targetId)
          .eq('friend_id', currentUser.id);
      }
      await onMarkRead(id);
      setAlerts(p => p.map(a => a.id === id ? { ...a, status: 'rejected', read: true } : a));
      setTimeout(() => setSelectedAlert(null), 800);
    } catch (err) {
      console.error('Error rejecting connection:', err);
    }
  };

  const handlePressAlert = async (a: AlertItem) => {
    onMarkRead(a.id);
    if (a.type === 'chat') {
      navigation.navigate('Chat', { userId: a.targetId });
    } else if (a.type === 'connect_request') {
      setSelectedAlert(a);
    } else if (a.targetId) {
        // Fetch signal detail and navigate
        navigation.navigate('SignalDetail', { signal: { id: a.targetId } });
    } else {
        setSelectedAlert(a);
    }
  };

  const scrollHandler = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, 40], [-10, 0], Extrapolation.CLAMP) }]
  }));

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      <AlertDetailModal alert={selectedAlert} visible={!!selectedAlert} onClose={() => setSelectedAlert(null)} colors={colors} isDark={isDark} onAccept={onAccept} onReject={onReject} />
      {toastConfig && (<SuccessToast visible={toastConfig.visible} title={toastConfig.title} subtitle={toastConfig.subtitle} icon={toastConfig.icon as any} onHide={() => setToastConfig(null)} />)}

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={isDark ? ['#6C47FF15', 'transparent'] : ['#E8E3FF', 'transparent']} style={{ height: 400 }} />
      </View>

      {isLoading ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 130 }}>
          {[1, 2, 3, 4, 5].map(k => (
            <View key={k} style={[S.alertRow, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 10, opacity: 0.6 }]}>
              <SkeletonLoader width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonLoader width="70%" height={14} />
                <SkeletonLoader width="40%" height={10} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : filtered.length === 0 ? (
        <EmptyAlerts colors={colors} isDark={isDark} />
      ) : (
        <Animated.ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 130, paddingBottom: 110, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        >
          {grouped.map(({ key, items }, gIdx) => (
            <View key={key} style={{ marginBottom: 20 }}>
              <Animated.Text entering={FadeInDown.delay(gIdx * 100).springify()} style={[S.groupLabel, { color: colors.textSecondary }]}>{t(GROUP_LABEL_KEYS[key])}</Animated.Text>
              {items.map((alert, i) => (
                <Animated.View key={alert.id} entering={FadeInDown.delay(100 + i * 50).springify()}>
                  <AlertRow alert={alert} colors={colors} isDark={isDark} onPress={() => handlePressAlert(alert)} onDismiss={onDismiss} />
                </Animated.View>
              ))}
            </View>
          ))}
        </Animated.ScrollView>
      )}

      {/* ── Header ── */}
      <View style={[S.headFixed, { paddingTop: insets.top }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerStyle]}>
          <BlurView intensity={isDark ? 40 : 80} style={StyleSheet.absoluteFill} tint={isDark ? "dark" : "light"} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
        </Animated.View>
        <View style={S.headTop}>
          <View>
            <Text style={[S.headTitle, { color: colors.textPrimary }]}>{t('alerts.title')}</Text>
            {unreadCount > 0 && <Text style={[S.headSub, { color: colors.primary }]}>{t('alerts.unreadPulses', { count: unreadCount })}</Text>}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={onMarkAllRead} style={[S.allReadBtn, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="checkmark-done" size={12} color={colors.primary} />
              <Text style={[S.allReadTxt, { color: colors.primary }]}>{t('alerts.readAll')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <FilterBar active={filter} onChange={setFilter} colors={colors} isDark={isDark} />
      </View>

      <BottomTabBar activeTab="Alerts" isDark={isDark} onTabPress={t => {
        if (t === 'Feed') navigation.replace('Home');
        if (t === 'Circle') navigation.replace('Circle');
        if (t === 'Me') navigation.replace('Profile');
      }} alertsCount={alertsUnreadCount} />
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  headFixed: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  headTitle: { fontSize: 32, fontFamily: 'Inter_900Black', letterSpacing: -1 },
  headSub: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: -2 },
  allReadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  allReadTxt: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  filterScroll: { paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterPillSel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: 'hidden' },
  filterLabel: { fontSize: 13.5, fontFamily: 'Inter_600SemiBold' },
  filterLabelSel: { fontSize: 13.5, fontFamily: 'Inter_700Bold', color: '#fff' },
  groupLabel: { fontSize: 11, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1.2, marginLeft: 6, marginBottom: 12, opacity: 0.6 },
  alertRow: { flexDirection: 'row', padding: 12, borderRadius: 24, gap: 12, alignItems: 'center', position: 'relative', overflow: 'hidden', height: 74 },
  unreadBar: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 4, borderRadius: 2 },
  alertIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  alertIconGrad: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  alertBody: { fontSize: 14.5, fontFamily: 'Inter_500Medium' },
  alertSender: { fontFamily: 'Inter_700Bold' },
  alertTime: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  signalBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6, borderWidth: 1 },
  signalBadgeTxt: { fontSize: 8.5, fontFamily: 'Inter_800ExtraBold', textTransform: 'uppercase' },
  alertRight: { alignItems: 'center', justifyContent: 'space-between', height: '100%', paddingLeft: 4 },
  miniDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 8 },
  dismissBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, paddingBottom: 100 },
  emptyIconWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  emptyTitle: { fontSize: 24, fontFamily: 'Inter_900Black', marginBottom: 12, textAlign: 'center' },
  emptySub: { fontSize: 15, fontFamily: 'Inter_500Medium', textAlign: 'center', lineHeight: 22, opacity: 0.7 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { width: W, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, borderWidth: 1 },
  modalBar: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  modalIconBox: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalIconGrad: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 22, fontFamily: 'Inter_800ExtraBold' },
  modalSub: { fontSize: 14, fontFamily: 'Inter_500Medium', marginTop: 2 },
  modalClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalBody: { marginBottom: 32 },
  modalBodyTxt: { fontSize: 18, lineHeight: 28, fontFamily: 'Inter_500Medium' },
  visualBox: { borderRadius: 24, padding: 16, marginTop: 20, gap: 12 },
  visualRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  visualTxt: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  mapPlaceholder: { height: 120, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  mapLabel: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  chatBubble: { padding: 16, borderRadius: 20, borderTopLeftRadius: 4, marginTop: 12 },
  chatBubbleTxt: { fontSize: 15, fontFamily: 'Inter_500Medium', fontStyle: 'italic' },
  modalActions: { gap: 12 },
  modalMainBtn: { height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  modalMainBtnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  modalSecBtn: { height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  modalSecBtnTxt: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  statusPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 20, width: '100%' },
  statusText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});