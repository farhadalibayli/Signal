import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import Animated, { FadeInDown, FadeInUp, Layout, useAnimatedStyle, useSharedValue, interpolate, Extrapolation } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase/supabaseClient';
import { BackButton } from '../components/BackButton';
import { ActionModal } from '../components/ActionModal';
import { SuccessToast } from '../components/SuccessToast';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  const userId = route.params?.userId;
  const signalId = (route.params as any)?.signalId;
  
  const [partner, setPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; title: string; subtitle?: string; icon?: string } | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const scrollRef = useRef<FlatList>(null);
  const scrollY = useSharedValue(0);

  useEffect(() => {
    if (userId) {
      loadPartnerProfile();
      loadChat();
    }
  }, [userId, signalId]);

  const loadPartnerProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setPartner(data);
  };

  const loadChat = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      let targetChatId = null;

      if (signalId) {
        // Chat associated with a pulse
        const { data: pulseChat } = await supabase.from('chats').select('id').eq('signal_id', signalId).single();
        if (pulseChat) targetChatId = pulseChat.id;
      } else {
        // Direct DM identification: finding a chat record involving both users.
        const { data: dmCheck } = await supabase
            .from('messages')
            .select('chat_id')
            .or(`sender_id.eq.${authUser.id},sender_id.eq.${userId}`)
            .limit(50);
        
        if (dmCheck && dmCheck.length > 0) {
            const chatIds = [...new Set(dmCheck.map(m => m.chat_id))];
            const { data: directChats } = await supabase.from('chats').select('id').in('id', chatIds).is('signal_id', null);
            if (directChats && directChats.length > 0) targetChatId = directChats[0].id;
        }
      }

      if (!targetChatId) {
          // Fallback or create a new chat record?
          // For now, if no chat, we'll wait for first message to create?
          // Actually, let's just use the messages pool as a shared ID for now if possible
          // In a real app, you'd have a conversations table.
      } else {
        setChatId(targetChatId);
        fetchMessages(targetChatId, authUser.id);
        subscribeToChat(targetChatId, authUser.id);
      }
    } catch (err) {
      console.error('Error loading chat:', err);
    }
  };

  const fetchMessages = async (cId: string, authId: string) => {
    const { data: msgs } = await supabase
      .from('messages')
      .select(`id, content, created_at, sender_id`)
      .eq('chat_id', cId)
      .order('created_at', { ascending: true });

    if (msgs) {
      setMessages(msgs.map(m => ({
        id: m.id,
        text: m.content,
        isOwn: m.sender_id === authId,
        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })));
    }
  };

  const subscribeToChat = (cId: string, authId: string) => {
    const channel = supabase
      .channel(`chat-${cId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${cId}`,
      }, (payload) => {
        const m = payload.new as any;
        setMessages(prev => {
          if (prev.some(x => x.id === m.id)) return prev;
          return [...prev, {
            id: m.id,
            text: m.content,
            isOwn: m.sender_id === authId,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }];
        });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      let activeId = chatId;
      if (!activeId) {
          // Create chat on demand if missing
          const { data: newChat } = await supabase.from('chats').insert({ type: 'direct' }).select().single();
          if (newChat) {
              activeId = newChat.id;
              setChatId(activeId);
              subscribeToChat(activeId, authUser.id);
          }
      }

      if (activeId) {
        await supabase.from('messages').insert({
          chat_id: activeId,
          sender_id: authUser.id,
          content: text,
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleLongPressMsg = (m: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMsg(m);
  };

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [10, 50], [0, 1], Extrapolation.CLAMP),
  }));

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    return (
      <View>
        <Animated.View
          layout={Layout.springify().damping(20).stiffness(150)}
          entering={FadeInUp.delay(index * 20).springify()}
          style={[
            styles.messageWrapper,
            item.isOwn ? styles.messageOwn : styles.messageOther,
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onLongPress={() => handleLongPressMsg(item)}
            style={[
              styles.bubble,
              item.isOwn 
                ? { backgroundColor: colors.primary } 
                : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              item.isOwn ? styles.bubbleOwn : styles.bubbleOther,
            ]}
          >
            {item.isOwn && (
              <LinearGradient 
                colors={[colors.primary, colors.accent]} 
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} 
                style={StyleSheet.absoluteFill} 
              />
            )}
            <Text style={[styles.messageText, { color: item.isOwn ? '#FFFFFF' : colors.textPrimary }]}>
              {item.text}
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {item.time}
            </Text>
            {item.isOwn && <Ionicons name="checkmark-done" size={14} color={colors.primary} />}
          </View>
        </Animated.View>
      </View>
    );
  };

  const partnerName = partner?.display_name || '...';
  const partnerInitials = partner?.initials || (partnerName !== '...' ? partnerName.split(' ').map((n: string) => n[0]).join('') : '?');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[`${partner?.avatarColor || colors.primary}08`, 'transparent']} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerStyle]}>
          <BlurView intensity={isDark ? 40 : 80} style={StyleSheet.absoluteFill} tint={isDark ? "dark" : "light"} />
        </Animated.View>
        
        <View style={styles.headerRow}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={styles.headerProfile}>
            <View style={[styles.avatarMicro, { backgroundColor: colors.primary, overflow: 'hidden' }]}>
               {partner?.avatar_url ? (
                 <Image source={{ uri: partner.avatar_url }} style={StyleSheet.absoluteFill} />
               ) : (
                 <Text style={styles.avatarMicroTxt}>{partnerInitials}</Text>
               )}
            </View>
            <View>
              <Text style={[styles.headerName, { color: colors.textPrimary }]}>{partnerName}</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={[styles.statusText, { color: colors.success }]}>{t('chat.onlineNow')}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} onPress={() => navigation.navigate('UserProfile', { userId })}>
            <Ionicons name="person-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
      >
        <FlatList
          ref={scrollRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 80, flexGrow: 1 }]}
          onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <View style={[styles.avatarMicro, { width: 80, height: 80, borderRadius: 24, marginBottom: 16, backgroundColor: `${colors.primary}15` }]}>
                 <Ionicons name="chatbubbles-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.headerName, { color: colors.textPrimary, marginBottom: 8, textAlign: 'center' }]}>{t('chat.sayHi', { name: partnerName })}</Text>
              <Text style={[styles.statusText, { color: colors.textSecondary, textAlign: 'center', maxWidth: 220, lineHeight: 20 }]}>{t('chat.emptySub')}</Text>
            </View>
          }
        />

        <Animated.View entering={FadeInDown.delay(100)} style={[styles.inputContainer, { paddingBottom: insets.bottom + 10, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={styles.inputInner}>
            <TouchableOpacity style={styles.attachBtn}>
              <Ionicons name="add" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              placeholder={t('chat.typeMessage')}
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.primary : colors.surface }]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Ionicons name="send" size={16} color={inputText.trim() ? '#FFF' : colors.textSecondary} />
            </TouchableOpacity>
          </View>
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

      {/* ── Message Options Menu ── */}
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
              onPress: async () => {
                try {
                    await supabase.from('messages').delete().eq('id', selectedMsg.id);
                    setMessages(p => p.filter(m => m.id !== selectedMsg.id));
                } catch(e) {}
                setSelectedMsg(null);
              }
            }
          ] : [])
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  avatarMicro: {
    width: 36, height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarMicroTxt: { color: '#FFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
  headerName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 },
  statusText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  iconButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  messageOwn: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleOwn: { borderBottomRightRadius: 4, overflow: 'hidden' },
  bubbleOther: { borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, fontFamily: 'Inter_500Medium', lineHeight: 22 },
  timeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', opacity: 0.6 },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dateLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  sendBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
