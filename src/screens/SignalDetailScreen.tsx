// Screen: SignalDetailScreen
// Description: Detail view of a signal/pulse with chat and responses
// Navigation: Map or Feed -> here

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  FadeInUp,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SPACING } from '../constants/spacing';
import { supabase } from '../supabase/supabaseClient';
import { useSignals } from '../context/SignalsContext';
import type { SignalData } from '../types/signal';
import { ActionModal } from '../components/ActionModal';
import { LocationMapPreview } from '../components/LocationMapPreview';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { SuccessToast } from '../components/SuccessToast';

const { width: W } = Dimensions.get('window');

export default function SignalDetailScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'SignalDetail'>>();
  
  const { signals, toggleJoinSignal, removeSignal } = useSignals();
  const routeSignalId = (route.params?.signal as SignalData)?.id;
  
  const [realStats, setRealStats] = useState({ views: 0, responses: 0 });
  const liveSignal = signals.find(s => s.id === routeSignalId) || route.params?.signal;
  const signalData = liveSignal || ({} as any);

  const [messages, setMessages] = useState<any[]>([]);
  const [chatMsg, setChatMsg] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!signalData.id) return;
    loadSignalDetails();
    loadChat();
    registerView();
  }, [routeSignalId]);

  const loadSignalDetails = async () => {
    try {
      // 1. Fetch response count
      const { count: respCount } = await supabase
        .from('signal_answers')
        .select('*', { count: 'exact', head: true })
        .eq('signal_id', signalData.id);

      // 2. Fetch view count (unique users)
      const { count: viewCount } = await supabase
        .from('signal_views')
        .select('*', { count: 'exact', head: true })
        .eq('signal_id', signalData.id);

      setRealStats({ 
        views: viewCount || 0,
        responses: respCount || 0 
      });
    } catch (err) {
      console.error('Error loading signal stats:', err);
    }
  };

  const registerView = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || authUser.id === signalData.user?.id) return;

      // Check if already viewed
      const { data: existingView } = await supabase
        .from('signal_views')
        .select('id')
        .eq('signal_id', signalData.id)
        .eq('user_id', authUser.id)
        .single();
      
      if (existingView) return;

      // Register a unique view
      await supabase
        .from('signal_views')
        .insert({ signal_id: signalData.id, user_id: authUser.id });
      
      // Refresh details after registering
      loadSignalDetails();
    } catch (err) {
      // Ignore errors
    }
  };

  const loadChat = async () => {
    const sId = signalData.id;
    if (!sId) return;
    try {
      // Get or create chat for this signal
      let { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('signal_id', sId)
        .single();

      if (!existingChat) {
        const { data: newChat } = await supabase
          .from('chats')
          .insert({ signal_id: sId })
          .select()
          .single();
        existingChat = newChat;
      }

      if (!existingChat) return;
      setChatId(existingChat.id);

      // Fetch messages
      const { data: msgs } = await supabase
        .from('messages')
        .select(`
          id, content, created_at, sender_id,
          sender:sender_id (display_name, avatar_url)
        `)
        .eq('chat_id', existingChat.id)
        .order('created_at', { ascending: true });

      const { data: { user: authUser } } = await supabase.auth.getUser();

      setMessages((msgs || []).map((m: any) => ({
        id: m.id,
        user: {
          name: m.sender?.display_name || 'User',
          initials: m.sender?.display_name?.split(' ').map((w: string) => w[0]).join('') || '?',
          avatarColor: '#6C47FF',
          avatar: m.sender?.avatar_url,
        },
        text: m.content,
        timeAgo: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: m.sender_id === authUser?.id,
      })));

      // Subscribe to real-time messages
      const channel = supabase
        .channel(`chat-${existingChat.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${existingChat.id}`,
        }, async (payload) => {
          const { data: { user: u } } = await supabase.auth.getUser();
          const m = payload.new as any;
          setMessages(prev => {
            if (prev.some(x => x.id === m.id)) return prev;
            return [...prev, {
              id: m.id,
              user: { name: 'User', initials: '?', avatarColor: '#6C47FF' },
              text: m.content,
              timeAgo: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isOwn: m.sender_id === u?.id,
            }];
          });
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } catch (err) {
      console.error('Error loading chat:', err);
    }
  };

  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [showSignalOptions, setShowSignalOptions] = useState(false);
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; title: string; subtitle?: string; icon?: string } | null>(null);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulseScale.value = withRepeat(withTiming(1.2, { duration: 2000 }), -1, true);
    pulseOpacity.value = withRepeat(withTiming(0, { duration: 2000 }), -1, true);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handleLongPressMsg = (m: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMsg(m);
  };

  const minAbbr = t('common.minuteAbbr', { defaultValue: 'm' });
  const hrAbbr = t('common.hourAbbr', { defaultValue: 'h' });

  const formatTime = (m: number): string => {
    if (m < 60) return `${m} ${minAbbr}`;
    const h = Math.floor(m / 60), r = m % 60;
    return r > 0 ? `${h} ${hrAbbr} ${r} ${minAbbr}` : `${h} ${hrAbbr}`;
  };

  const scrollY = useSharedValue(0);

  const hasJoined = useMemo(() => liveSignal?.hasJoined || false, [liveSignal]);

  const signal = useMemo(() => {
    const s = signalData;
    return {
      id: s.id || '',
      userName: s.user?.name || s.userName || 'Alex',
      userHandle: s.user?.username || s.userHandle || 'alex_v',
      avatar: s.user?.avatar || s.avatar || null,
      avatarColor: s.user?.avatarColor || s.avatarColor || '#6C47FF',
      initials: s.user?.initials || s.initials || 'A',
      text: s.text || 'Coffee at the terrace?',
      type: s.type || 'Coffee',
      typeColor: s.typeColor || '#A855F7',
      timeLeft: s.minutesLeft || 44,
      views: realStats.views,
      responses: realStats.responses,
      isOwn: s.isOwn || false,
      hasJoined: hasJoined,
    };
  }, [liveSignal, signals, realStats, hasJoined]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [40, 90], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [40, 90], [10, 0], Extrapolation.CLAMP) }],
  }));

  const isCreator = signal.isOwn;
  const isChatUnlocked = isCreator || hasJoined;

  const onJoin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleJoinSignal(signal.id);
  };

  const onEndSignal = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await removeSignal(signal.id);
      navigation.goBack();
    } catch (err) {
      console.error('Error ending signal:', err);
    }
  };

  const sendMessage = async () => {
    if (!chatMsg.trim() || !chatId) return;
    const text = chatMsg.trim();
    setChatMsg('');
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: authUser.id,
        content: text,
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const progressPct = useMemo(() => {
    const total = 120;
    return `${Math.min(100, (signal.timeLeft / total) * 100)}%`;
  }, [signal.timeLeft]);

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      {/* ── Sticky Header ── */}
      <View style={[S.navHeader, { paddingTop: insets.top }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerStyle]}>
          <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        </Animated.View>
        
        <View style={S.headRow}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={[S.headBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
           </TouchableOpacity>
           <Animated.Text style={[S.headTitle, { color: colors.textPrimary }, headerStyle]} numberOfLines={1}>
              {isCreator ? t('signalDetail.yourPulse', { defaultValue: 'Sizin Pulsunuz' }) : t('signalDetail.headerTitle', { name: signal.userName })}
           </Animated.Text>
           <TouchableOpacity onPress={() => setShowSignalOptions(true)} style={[S.headBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textPrimary} />
           </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
      >
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ paddingBottom: 20 }}
          onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
        >
          {/* ── Signal Content ── */}
          <Animated.View entering={FadeInDown.duration(600).springify()} style={[S.signalCard, isCreator && { backgroundColor: signal.typeColor + '10' }]}>
             <View style={S.userRow}>
                <View style={S.avatarWrap}>
                  <Animated.View style={[S.avatarPulse, { borderColor: signal.avatarColor }, pulseStyle]} />
                  <View style={[S.avatar, { backgroundColor: signal.avatarColor }]}>
                     {signal.avatar ? (
                       <Image source={{ uri: signal.avatar }} style={StyleSheet.absoluteFill} />
                     ) : (
                       <Text style={S.avatarTxt}>{signal.initials}</Text>
                     )}
                  </View>
                </View>
                <View style={S.userInfo}>
                   <Text style={[S.userName, { color: colors.textPrimary }]}>{isCreator ? t('common.you') : signal.userName}</Text>
                   <Text style={[S.userHandle, { color: colors.textSecondary }]}>@{signal.userHandle}</Text>
                </View>
             </View>

             <Text style={[S.signalText, { color: colors.textPrimary }]}>{signal.text}</Text>

             <View style={S.badgeRow}>
                <View style={[S.typeBadge, { backgroundColor: signal.typeColor + '15' }]}>
                   <Text style={[S.typeTxt, { color: signal.typeColor }]}>{t(`home.filters.${signal.type.toLowerCase()}`, { defaultValue: signal.type }).toUpperCase()}</Text>
                </View>
                <View style={S.statusBadge}>
                   <View style={S.pulseDot} />
                   <Text style={[S.statusTxt, { color: colors.textSecondary }]}>{t('signalDetail.activeNow')}</Text>
                </View>
             </View>

             <View style={S.progressWrap}>
                <View style={[S.progressBg, { backgroundColor: colors.border }]}>
                   <View style={[S.progressFill, { backgroundColor: colors.primary, width: progressPct as any }]} />
                </View>
                <View style={S.progressLabels}>
                   <Text style={[S.timeRem, { color: colors.primary }]}>{t('signalDetail.timeLeft', { time: formatTime(signal.timeLeft) })}</Text>
                </View>
             </View>
          </Animated.View>

          {/* ── Location Map ── */}
          {liveSignal?.location && (
            <Animated.View entering={FadeInDown.delay(100).duration(600).springify()} style={{ marginHorizontal: 16, marginTop: 12 }}>
              <LocationMapPreview 
                location={liveSignal.location}
                userCoords={null}
                totalMinutes={liveSignal.minutesLeft + 120}
                isOwn={isCreator}
              />
            </Animated.View>
          )}

          {/* ── Stats Row ── */}
          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={S.statsRow}>
             <View style={[S.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="eye-outline" size={18} color={colors.primary} />
                <Text style={[S.statVal, { color: colors.textPrimary }]}>{signal.views}</Text>
                <Text style={[S.statLab, { color: colors.textSecondary }]}>{t('signalDetail.views')}</Text>
             </View>
             <View style={[S.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="chatbubbles-outline" size={18} color={colors.success} />
                <Text style={[S.statVal, { color: colors.textPrimary }]}>{signal.responses}</Text>
                <Text style={[S.statLab, { color: colors.textSecondary }]}>{t('signalDetail.responses')}</Text>
             </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(600).springify()} style={S.chatSection}>
             <View style={S.sectionHead}>
                <Text style={[S.sectionTitle, { color: colors.textPrimary }]}>{t('signalDetail.chatTitle')}</Text>
                {!isChatUnlocked && (
                   <View style={[S.lockedBadge, { backgroundColor: colors.error + '10' }]}>
                      <Ionicons name="lock-closed" size={12} color={colors.error} />
                      <Text style={[S.lockedBadgeTxt, { color: colors.error }]}>{t('signalDetail.locked')}</Text>
                   </View>
                )}
             </View>

             {!isChatUnlocked ? (
                <View style={[S.chatLocked, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                   <Ionicons name="lock-closed-outline" size={40} color={colors.textSecondary} style={{ opacity: 0.3, marginBottom: 12 }} />
                   <Text style={[S.lockedTitle, { color: colors.textPrimary }]}>{t('signalDetail.locked')}</Text>
                   <Text style={[S.lockedSub, { color: colors.textSecondary }]}>{t('signalDetail.lockedSub')}</Text>
                </View>
             ) : (
                <View style={[S.chatBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                   {messages.length === 0 ? (
                      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, opacity: 0.8 }}>
                         <Ionicons name="chatbubbles-outline" size={40} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                         <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' }}>{t('signalDetail.noMessages')}</Text>
                         <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 }}>{isCreator ? t('signalDetail.beFirstOwn', { defaultValue: 'Pulsunuza maraq göstərən istifadəçilərlə söhbətə başlayın!' }) : t('signalDetail.beFirst')}</Text>
                      </View>
                   ) : (
                     messages.map((m) => (
                        <View key={m.id} style={[S.msgRow, m.isOwn && { flexDirection: 'row-reverse' }]}>
                           <View style={[S.msgAvatar, { backgroundColor: m.user.avatarColor }]}>
                              <Text style={S.msgAvatarTxt}>{m.user.initials}</Text>
                           </View>
                           <TouchableOpacity 
                              onLongPress={() => handleLongPressMsg(m)}
                              activeOpacity={0.8}
                              style={[S.msgBubble, m.isOwn ? { backgroundColor: colors.primary, marginRight: 8 } : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', marginLeft: 8 }]}
                           >
                              <Text style={[S.msgText, { color: m.isOwn ? '#fff' : colors.textPrimary }]}>{m.text}</Text>
                           </TouchableOpacity>
                        </View>
                     ))
                   )}
                </View>
             )}
          </Animated.View>
        </ScrollView>

        {/* ── Bottom Active Area ── */}
        <Animated.View entering={FadeInUp.springify()} style={[S.bottomActive, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border, backgroundColor: colors.background }]}>
           {isChatUnlocked ? (
              <View style={S.inputArea}>
                <View style={[S.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                   <TextInput 
                     style={[S.input, { color: colors.textPrimary }]}
                     placeholder={t('signalDetail.saySomething')}
                     placeholderTextColor={colors.textSecondary}
                     value={chatMsg}
                     onChangeText={setChatMsg}
                   />
                   <TouchableOpacity onPress={sendMessage} style={[S.sendBtn, { backgroundColor: colors.primary }]}>
                      <Ionicons name="send" size={18} color="#fff" />
                   </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                   {isCreator ? (
                      <TouchableOpacity onPress={onEndSignal} style={[S.endPill, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                        <Text style={[S.endPillTxt, { color: colors.textPrimary }]}>{t('signalDetail.endSignal')}</Text>
                      </TouchableOpacity>
                   ) : (
                      <TouchableOpacity onPress={onJoin} style={[S.endPill, { flex: 1, backgroundColor: colors.error + '10', borderColor: colors.error + '20', borderWidth: 1 }]}>
                        <Text style={[S.endPillTxt, { color: colors.error }]}>{t('signalDetail.leave')}</Text>
                      </TouchableOpacity>
                   )}
                </View>
              </View>
           ) : (
                <TouchableOpacity onPress={onJoin} style={[S.joinBtn, { backgroundColor: colors.primary }]}>
                  <LinearGradient colors={['rgba(255,255,255,0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
                  <Ionicons name="flash" size={20} color="#fff" />
                  <Text style={[S.joinBtnTxt, { color: "#fff" }]}>{t('signalDetail.imIn')}</Text>
                </TouchableOpacity>
           )}
        </Animated.View>
      </KeyboardAvoidingView>

      {toastConfig && (
        <SuccessToast
          visible={toastConfig.visible}
          title={toastConfig.title}
          subtitle={toastConfig.subtitle}
          icon={toastConfig.icon as any}
          onHide={() => setToastConfig(null)}
        />
      )}

      {/* ── Signal Options Menu ── */}
      <ActionModal
        visible={showSignalOptions}
        onClose={() => setShowSignalOptions(false)}
        title={t('signalDetail.signalTitle')}
        options={[
          {
            id: 'share', label: t('common.share'), icon: 'share-outline' as any,
            onPress: () => { setShowSignalOptions(false); setTimeout(() => setToastConfig({ visible: true, title: t('common.copied'), icon: 'share' }), 400); }
          },
          ...(isCreator ? [
            { id: 'delete', label: t('common.delete'), icon: 'trash-outline' as any, danger: true, onPress: onEndSignal }
          ] : [
            { id: 'mute', label: t('common.mute'), icon: 'volume-mute-outline' as any, onPress: () => { setShowSignalOptions(false); navigation.goBack(); } },
            { id: 'report', label: t('common.report'), icon: 'warning-outline' as any, danger: true, onPress: () => { setShowSignalOptions(false); setTimeout(() => setToastConfig({ visible: true, title: t('common.reported'), icon: 'shield-checkmark' }), 400); } }
          ])
        ]}
      />

      <ActionModal
        visible={selectedMsg !== null}
        onClose={() => setSelectedMsg(null)}
        title={t('chat.message')}
        options={[
          {
            id: 'copy',
            label: t('common.copy'),
            icon: 'copy-outline' as any,
            onPress: async () => {
              if (selectedMsg?.text) {
                await Clipboard.setStringAsync(selectedMsg.text);
                setToastConfig({ visible: true, title: t('common.copied'), icon: 'copy' });
              }
              setSelectedMsg(null);
            }
          },
          ...(selectedMsg?.isOwn ? [
            {
              id: 'delete',
              label: t('common.delete'),
              icon: 'trash-outline' as any,
              danger: true,
              onPress: () => {
                setMessages(p => p.filter(m => m.id !== selectedMsg.id));
                setSelectedMsg(null);
              }
            }
          ] : [])
        ]}
      />
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  navHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  signalCard: {
    marginTop: 100,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 28,
    backgroundColor: 'rgba(108,71,255,0.05)',
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarWrap: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  avatarPulse: { position: 'absolute', width: 44, height: 44, borderRadius: 15, borderWidth: 2 },
  avatar: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { color: '#fff', fontSize: 18, fontFamily: 'Inter_800ExtraBold' },
  userInfo: { marginLeft: 12 },
  userName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  userHandle: { fontSize: 13, fontFamily: 'Inter_500Medium', opacity: 0.6 },
  signalText: { fontSize: 18, fontFamily: 'Inter_600SemiBold', lineHeight: 26, marginBottom: 20 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeTxt: { fontSize: 11, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFD700' },
  statusTxt: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  progressWrap: { gap: 8 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  timeRem: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  timeAgo: { fontSize: 12, fontFamily: 'Inter_500Medium', opacity: 0.6 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginTop: 24 },
  statCard: { flex: 1, padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 18, fontFamily: 'Inter_800ExtraBold' },
  statLab: { fontSize: 12, fontFamily: 'Inter_600SemiBold', opacity: 0.6 },
  chatSection: { marginTop: 32, paddingHorizontal: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  lockedBadgeTxt: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  chatLocked: { height: 200, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  lockedTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  lockedSub: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center', opacity: 0.6, lineHeight: 18 },
  chatBox: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 16 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgAvatar: { width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  msgAvatarTxt: { color: '#fff', fontSize: 10, fontFamily: 'Inter_800ExtraBold' },
  msgBubble: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, maxWidth: '80%' },
  msgText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  bottomActive: { paddingHorizontal: 16, borderTopWidth: 1, paddingTop: 12 },
  inputArea: { gap: 10 },
  endPill: { paddingVertical: 8, alignItems: 'center', borderRadius: 12 },
  endPillTxt: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  joinBtn: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' },
  joinBtnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  inputWrap: { height: 56, borderRadius: 28, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  input: { flex: 1, height: '100%', paddingHorizontal: 16, fontSize: 15, fontFamily: 'Inter_500Medium' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.1)', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 24, textAlign: 'center' },
  modalOpt: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  modalOptTxt: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  modalCancel: { marginTop: 20, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  modalCancelTxt: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});