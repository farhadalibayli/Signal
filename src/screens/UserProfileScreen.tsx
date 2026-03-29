import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import Animated, { 
  FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, 
  interpolate, Extrapolation, withTiming, withRepeat, cancelAnimation, withSpring
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase/supabaseClient';
import { BackButton } from '../components/BackButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { SuccessToast } from '../components/SuccessToast';
import * as Haptics from 'expo-haptics';
import { SignalCard } from '../components/SignalCard';
import { formatRelativeTime } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

function RadarAnimation({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.4, { duration: 2500 }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 2500 }), -1, false);
    return () => { cancelAnimation(scale); cancelAnimation(opacity); };
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    borderColor: color,
  }));

  return (
    <View style={styles.radarContainer}>
      <Animated.View style={[styles.radarRing, ringStyle]} />
      <Animated.View style={[styles.radarRing, ringStyle, { width: 100, height: 100, borderRadius: 50 }]} />
    </View>
  );
}

export default function UserProfileScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'UserProfile'>>();
  const { t } = useTranslation();

  const userId = route.params?.userId || 'unknown';
  const [profile, setProfile] = useState<any>(null);
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; title: string; subtitle?: string; icon?: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({ signals: 0, connections: 0 });
  const [activeSignals, setActiveSignals] = useState<any[]>([]);

  const name = profile?.display_name || '...';
  const handle = profile?.username || '...';
  const avatarColor = profile?.avatar_color || '#6C47FF';
  const initials = profile?.initials || (name !== '...' ? name.split(' ').map((n: string) => n[0]).join('') : '?');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, username, bio, avatar_url, initials, avatar_color')
          .eq('id', userId)
          .single();
        if (data) setProfile(data);

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        // Stats
        const { count: sCount } = await supabase.from('signals').select('*', { count: 'exact', head: true }).eq('user_id', userId);
        const { count: cCount } = await supabase.from('connections').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'accepted');
        setStats({ signals: sCount || 0, connections: cCount || 0 });

        // Check connection
        const { data: conn } = await supabase
          .from('connections')
          .select('id, status')
          .eq('user_id', authUser.id)
          .eq('friend_id', userId)
          .single();
        setIsConnected(conn?.status === 'accepted');

        // Fetch active signals
        const { data: activeS } = await supabase
          .from('signals')
          .select('*')
          .eq('user_id', userId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        
        setActiveSignals(activeS || []);
      } catch (err) {
        console.error('Error loading user profile:', err);
      }
    };
    loadProfile();
  }, [userId]);

  const scrollY = useSharedValue(0);

  const headerBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 80], [0, 1], Extrapolation.CLAMP),
  }));

  const heroStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [-100, 0], [1.2, 1], Extrapolation.CLAMP);
    return { transform: [{ scale }] };
  });

  const handleConnect = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      await supabase.from('connections').insert({
        user_id: authUser.id,
        friend_id: userId,
        status: 'pending',
      });
      setIsConnected(true);
      setToastConfig({ visible: true, title: t('common.done'), subtitle: t('toasts.connectedWith', { name }), icon: 'checkmark-circle' });
    } catch (err) {
      console.error('Error connecting:', err);
    }
  };

  const handleRemove = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      await supabase
        .from('connections')
        .delete()
        .eq('user_id', authUser.id)
        .eq('friend_id', userId);
      setIsConnected(false);
      setToastConfig({ visible: true, title: t('toasts.settingsUpdated'), subtitle: t('toasts.connectionRemoved'), icon: 'person-remove' });
    } catch (err) {
      console.error('Error removing connection:', err);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={isDark ? ['#6C47FF15', 'transparent'] : ['#E8E3FF', 'transparent']} style={{ height: 400 }} />
      </View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + 50, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        <Animated.View style={[styles.hero, heroStyle]}>
          <View style={styles.avatarSection}>
             <RadarAnimation color={avatarColor} />
             <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={StyleSheet.absoluteFill} />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
             </View>
          </View>
          
          <Animated.Text entering={FadeInDown.delay(100).springify()} style={[styles.name, { color: colors.textPrimary }]}>{name}</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(150).springify()} style={[styles.username, { color: colors.textSecondary }]}>@{handle}</Animated.Text>
          
          <Animated.Text entering={FadeInDown.delay(200).springify()} style={[styles.bio, { color: colors.textSecondary }]}>
          {profile?.bio || ''}
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(250).springify()} style={[styles.metaRow, { gap: 12 }]}>
            <View style={[styles.metaPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               <Ionicons name="flash" size={14} color={avatarColor} />
               <Text style={[styles.metaTxt, { color: colors.textSecondary }]}>{stats.signals} {t('profile.signals')}</Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               <Ionicons name="people" size={14} color={avatarColor} />
               <Text style={[styles.metaTxt, { color: colors.textSecondary }]}>{stats.connections} {t('profile.circle')}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.actionRow}>
            {isConnected ? (
               <>
                 <PrimaryButton 
                   label={t('circle.dm')}
                   onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Chat', { userId }); }}
                   style={{ flex: 1, height: 56, borderRadius: 20 }}
                 />
                 <TouchableOpacity style={[styles.circleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleRemove}>
                   <Ionicons name="person-remove" size={22} color={colors.error} />
                 </TouchableOpacity>
               </>
            ) : (
               <PrimaryButton 
                 label={t('userProfile.connect')}
                 onPress={handleConnect}
                 style={{ width: '100%', height: 56, borderRadius: 20, backgroundColor: colors.primary }}
               />
            )}
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
             <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('components.recentSignals')}</Text>
             {activeSignals.length > 0 ? (
               <Ionicons name="flash" size={14} color={colors.primary} />
             ) : (
               <Ionicons name="lock-closed" size={14} color={colors.textSecondary} opacity={0.5} />
             )}
          </View>
          
          {activeSignals.length > 0 ? (
            <View style={{ gap: 16 }}>
              {activeSignals.map((s, idx) => (
                <View key={s.id} style={{ opacity: 0.9 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8, fontFamily: 'Inter_600SemiBold' }}>
                    {formatRelativeTime(s.created_at, t)}
                  </Text>
                  <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 16, fontFamily: 'Inter_500Medium' }}>{s.message}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.privateBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <LinearGradient colors={['#6C47FF08', 'transparent']} style={StyleSheet.absoluteFill} />
              <Ionicons name="eye-off-outline" size={32} color={colors.textSecondary} opacity={0.3} />
              <Text style={[styles.privateTitle, { color: colors.textPrimary }]}>{t('components.noResults')}</Text>
              <Text style={[styles.privateSub, { color: colors.textSecondary }]}>{t('components.visibilityDesc')}</Text>
            </View>
          )}
        </Animated.View>

      </Animated.ScrollView>

      {/* Header */}
      <Animated.View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
          <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
        </Animated.View>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.error + '10' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setToastConfig({ visible: true, title: t('common.block'), subtitle: t('common.reported'), icon: 'ban' }); }}>
            <Ionicons name="ban" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {toastConfig && (
        <SuccessToast
          visible={toastConfig.visible}
          title={toastConfig.title}
          subtitle={toastConfig.subtitle}
          icon={toastConfig.icon as any}
          onHide={() => setToastConfig(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  iconButton: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  hero: { alignItems: 'center', paddingHorizontal: 20 },
  avatarSection: { position: 'relative', width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  radarContainer: { position: 'absolute', width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  radarRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5 },
  avatar: { width: 90, height: 90, borderRadius: 34, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 10, overflow: 'hidden' },
  avatarInitials: { color: '#FFFFFF', fontSize: 36, fontFamily: 'Inter_900Black' },
  name: { fontSize: 28, fontFamily: 'Inter_900Black', textAlign: 'center', letterSpacing: -0.5 },
  username: { fontSize: 16, marginTop: 4, fontFamily: 'Inter_600SemiBold', opacity: 0.5 },
  bio: { fontSize: 15, marginTop: 16, textAlign: 'center', paddingHorizontal: 24, lineHeight: 22, fontFamily: 'Inter_500Medium' },
  metaRow: { flexDirection: 'row', marginTop: 24 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  metaTxt: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 32, width: '100%', paddingHorizontal: 10 },
  circleBtn: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  section: { marginTop: 48, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontFamily: 'Inter_800ExtraBold' },
  privateBox: { padding: 40, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, gap: 12, overflow: 'hidden' },
  privateTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  privateSub: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'center', opacity: 0.6, lineHeight: 20 },
});
