// Screen: FindFriendsScreen
// Description: Slide 2 of onboarding - find friends premium design
// Navigation: PhotoScreen -> here -> TutorialScreen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BackButton }           from '../components/BackButton';
import { PrimaryButton }        from '../components/PrimaryButton';
import { useTheme }             from '../context/ThemeContext';
import { SPACING }              from '../constants/spacing';
import { supabase } from '../supabase/supabaseClient';
import { SkeletonLoader }       from '../components/SkeletonLoader';
import { ProgressDots }         from '../components/ProgressDots';

const { width: W } = Dimensions.get('window');
const PRIMARY     = '#6C47FF';
const ACCENT      = '#9B7FFF';
const AVATAR_BG   = ['#6C47FF', '#8B5CF6', '#7C3AED', '#9B7FFF', '#5B21B6'];

export default function FindFriendsScreen() {
  const { t } = useTranslation();
  const insets      = useSafeAreaInsets();
  const navigation  = useNavigation<any>();
  const route       = useRoute<any>();
  const { name, username, photoUri } = route.params || { name: 'User', username: 'user' };
  const { isDark, colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      // Get IDs already connected or pending
      const { data: existingConns } = await supabase
        .from('connections')
        .select('friend_id')
        .eq('user_id', authUser.id);

      const excludeIds = [authUser.id, ...(existingConns || []).map((c: any) => c.friend_id)];

      // Fetch suggested users (everyone else)
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(20);

      if (usersError) throw usersError;

      setContacts((users || []).map((u: any) => ({
        id: u.id,
        name: u.display_name,
        username: u.username,
        initials: u.display_name?.split(' ').map((w: string) => w[0]).join('') || '?',
        mutuals: 0,
        avatar_url: u.avatar_url,
      })));
      setLoading(false);
    } catch (e) {
      setError(t('error.message'));
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const toggleRequest = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      if (requestedIds.includes(id)) {
        await supabase
          .from('connections')
          .delete()
          .eq('user_id', authUser.id)
          .eq('friend_id', id);
        setRequestedIds(prev => prev.filter(x => x !== id));
      } else {
        await supabase.from('connections').insert({
          user_id: authUser.id,
          friend_id: id,
          status: 'pending',
        });
        setRequestedIds(prev => [...prev, id]);
      }
    } catch (err) {
      console.error('Error toggling request:', err);
    }
  };

  const goNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.replace('Tutorial', { name, username, photoUri });
  };

  const requestCount = requestedIds.length;
  const textPrimary   = colors.textPrimary;
  const textSecondary = colors.textSecondary;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Background decoration */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.bgBlob, { backgroundColor: colors.primary + '10', top: -100, left: -50 }]} />
        <View style={[styles.bgBlob, { backgroundColor: colors.accent + '10', bottom: -50, right: -50 }]} />
      </View>

      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header Navigation */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.navBar}>
          <BackButton onPress={() => navigation.goBack()} />
          <ProgressDots total={4} current={2} />
          <View style={{ width: 44 }} />
        </Animated.View>

        {/* Headline */}
        <Animated.View entering={FadeInDown.duration(350).delay(80)} style={styles.headingWrap}>
          <Text style={[styles.headline, { color: textPrimary }]}>{t('findFriends.title')}</Text>
          <Text style={[styles.subtext, { color: textSecondary }]}>{t('findFriends.subtitle')}</Text>
        </Animated.View>

        {/* Request sent counter */}
        {requestCount > 0 && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.counterPill, {
              backgroundColor: colors.primary + '20',
              borderColor:     colors.primary + '40',
            }]}
          >
            <Ionicons name="people-outline" size={14} color={colors.primary} />
            <Text style={[styles.counterText, { color: colors.primary }]}>
               {t('findFriends.requestsSent', { count: requestCount })}
            </Text>
          </Animated.View>
        )}

        {/* Contact list */}
        {loading ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {[1, 2, 3, 4, 5].map((key) => (
              <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
                <SkeletonLoader width={50} height={50} borderRadius={25} style={{ marginRight: SPACING.md }} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SkeletonLoader width="60%" height={16} />
                  <SkeletonLoader width="40%" height={12} />
                </View>
                <SkeletonLoader width={70} height={32} borderRadius={16} />
              </View>
            ))}
          </ScrollView>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 16 }} />
            <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error}</Text>
            <TouchableOpacity onPress={fetchData} style={[styles.retryBtn, { backgroundColor: colors.primary + '15' }]}>
               <Text style={[styles.retryText, { color: colors.primary }]}>{t('error.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {contacts.map((c, i) => (
              <ContactRow 
                key={c.id} 
                contact={c} 
                index={i} 
                isDark={isDark} 
                avatarColor={AVATAR_BG[i % AVATAR_BG.length]}
                isRequested={requestedIds.includes(c.id)}
                onRequest={() => toggleRequest(c.id)}
                colors={colors}
                t={t}
              />
            ))}
          </ScrollView>
        )}

        {/* Bottom */}
        <Animated.View entering={FadeInUp.duration(600).springify()} style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
          <PrimaryButton
            label={requestCount > 0 ? t('findFriends.continueWithCount', { count: requestCount }) : t('findFriends.continue')}
            onPress={goNext}
            progress={0.75}
          />
          <Pressable onPress={goNext} style={styles.skipWrap}>
            <Text style={[styles.skipText, { color: textSecondary }]}>{t('findFriends.skip')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── ContactRow ──────────────────────────────────────────────────────────────
function ContactRow({
  contact, index, isDark, avatarColor, isRequested, onRequest, colors, t
}: {
  contact:     any;
  index:       number;
  isDark:      boolean;
  avatarColor: string;
  isRequested: boolean;
  onRequest:   () => void;
  colors:      any;
  t:           any;
}) {
  const textPrimary   = colors.textPrimary;
  const textSecondary = colors.textSecondary;

  return (
    <Animated.View 
      entering={FadeInDown.delay(100 + index * 50).springify()}
      style={[styles.row, { 
        backgroundColor: colors.surface,
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'
      }]}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{contact.initials}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: textPrimary }]}>{contact.name}</Text>
        <View style={styles.usernameRow}>
          <Text style={[styles.username, { color: colors.primary }]}>@{contact.username}</Text>
          {contact.mutuals > 0 && (
            <Text style={[styles.mutuals, { color: textSecondary }]}>
              · {t('findFriends.mutuals', { count: contact.mutuals })}
            </Text>
          )}
        </View>
      </View>

      {/* Request button */}
      <RequestButton
        isRequested={isRequested}
        onPress={onRequest}
        colors={colors}
        t={t}
      />
    </Animated.View>
  );
}

// ─── RequestButton ────────────────────────────────────────────────────────────
function RequestButton({
  isRequested, onPress, colors, t
}: {
  isRequested: boolean;
  onPress:     () => void;
  colors:      any;
  t:           any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.requestBtn,
        isRequested
          ? { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }
          : { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
      ]}
    >
      {isRequested ? (
        <Ionicons name="checkmark" size={14} color={colors.success} />
      ) : (
        <Ionicons name="person-add" size={14} color={colors.primary} />
      )}
      <Text style={[styles.requestBtnText, { color: isRequested ? colors.success : colors.primary }]}>
        {isRequested ? t('findFriends.sent') : t('findFriends.request')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1 },
  bgBlob:    { position: 'absolute', width: 300, height: 300, borderRadius: 150, zIndex: -1 },
  container: { flex: 1 },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 44,
  },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dot:     { width: 30, height: 4, borderRadius: 2 },

  headingWrap: {
    paddingHorizontal: 30,
    marginTop: 20,
    marginBottom: 16,
  },
  headline: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    lineHeight: 22,
    opacity: 0.8,
  },

  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginLeft: 30,
    marginBottom: 20,
  },
  counterText: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  errorText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', textAlign: 'center', paddingHorizontal: 40, marginBottom: 20 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { fontSize: 14, fontFamily: 'Inter_800ExtraBold' },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatar: {
    width: 48, height: 48,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_800ExtraBold' },

  info: { flex: 1, marginLeft: 14 },
  name: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  usernameRow: { flexDirection: 'row', alignItems: 'center' },
  username:    { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  mutuals:     { fontSize: 12, fontFamily: 'Inter_500Medium', marginLeft: 4, opacity: 0.6 },

  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  requestBtnText: { fontSize: 13, fontFamily: 'Inter_800ExtraBold' },

  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  skipWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  skipText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});