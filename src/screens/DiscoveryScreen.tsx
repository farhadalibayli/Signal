/**
 * DiscoveryScreen — Premium "Signal Circle" Expansion.
 * Search for pulses and handle/nearby people with dynamic animations.
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Pressable, TextInput,
  Dimensions, ActivityIndicator, Image,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withRepeat, withSequence,
  FadeIn, FadeInDown, FadeInRight, FadeOut,
  Layout, Easing, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { BackButton } from '../components/BackButton';
import { SuccessToast } from '../components/SuccessToast';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useUserLocation } from '../hooks/useUserLocation';

const { width: W } = Dimensions.get('window');

const TRENDING_SEARCHES = ['Cafe', 'Film', 'Football', 'Study', 'Baku'];
const CATEGORIES = [
  { id: 'all', label: 'common.all', icon: 'apps-outline' },
  { id: 'people', label: 'circle.people', icon: 'person-outline' },
];

export default function DiscoveryScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user: authUser } = useAuth();
  const { coords } = useUserLocation();

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [results, setResults] = useState<any[]>([]);
  const [connections, setConnections] = useState<Record<string, string>>({}); 
  const [refreshing, setRefreshing] = useState(false);
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; title: string; subtitle?: string; icon?: string } | null>(null);

  const mapPulse = useSharedValue(0);
  useEffect(() => {
    mapPulse.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    fetchResults('');
  }, []);

  const fetchResults = async (query: string) => {
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      let profilesQuery = supabase
        .from('profiles')
        .select(`
          id, display_name, username, avatar_url, initials, visibility,
          connections:connections!friend_id(status)
        `)
        .neq('id', currentUser.id);

      if (query.trim()) {
        profilesQuery = profilesQuery.or(`display_name.ilike.%${query}%,username.ilike.%${query}%`);
      } else {
        profilesQuery = profilesQuery.limit(10);
      }

      const { data: profiles, error } = await profilesQuery;
      
      if (profiles) {
        // Enforce privacy settings
        const filtered = profiles.filter((p: any) => {
          if (p.visibility === 'No one') return false;
          if (p.visibility === 'Connections only') {
            return p.connections && p.connections.some((c: any) => c.status === 'accepted');
          }
          return true;
        });

        setResults(filtered.map((p: any) => ({
          id: p.id,
          name: p.display_name || '...',
          handle: p.username || '...',
          avatar: p.avatar_url,
          initials: p.initials || '?',
          avatarColor: colors.primary,
          mutuals: 0, 
        })));

        const connMap: Record<string, string> = {};
        profiles.forEach((p: any) => {
          if (p.connections && p.connections.length > 0) {
            connMap[p.id] = p.connections[0].status;
          }
        });
        setConnections(prev => ({ ...prev, ...connMap }));
      }
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    // Debounce or just search on change if small
    fetchResults(val);
  }, []);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchResults(search);
  }, [search]);

  const toggleRequest = async (targetId: string, name: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const currentStatus = connections[targetId];

      if (currentStatus === 'pending' || currentStatus === 'accepted') {
        // Remove or Cancel
        await supabase
          .from('connections')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('friend_id', targetId);
        
        setConnections(prev => {
          const next = { ...prev };
          delete next[targetId];
          return next;
        });
      } else {
        // Add
        await supabase
          .from('connections')
          .insert({ user_id: currentUser.id, friend_id: targetId, status: 'pending' });

        setConnections(prev => ({ ...prev, [targetId]: 'pending' }));
        setToastConfig({ visible: true, title: t('toasts.requestSent'), subtitle: t('findFriends.requestSentTo', { name: name }), icon: 'paper-plane' });
      }
    } catch (err) {
      console.error('Error toggling connection:', err);
    }
  };

  const bgPulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(mapPulse.value, [0, 1], [0.1, 0.25]),
    transform: [{ scale: interpolate(mapPulse.value, [0, 1], [1, 1.2]) }],
  }));

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      {/* Decor */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[StyleSheet.absoluteFill, bgPulseStyle]}>
          <LinearGradient
            colors={isDark ? ['#6C47FF20', 'transparent'] : ['#E8E3FF', 'transparent']}
            style={{ height: 400 }}
          />
        </Animated.View>
        <LinearGradient
          colors={['transparent', colors.background]}
          style={{ height: 400, position: 'absolute', top: 0, left: 0, right: 0 }}
        />
      </View>

      {/* Header */}
      <View style={[S.header, { paddingTop: insets.top + 10 }]}>
        <View style={S.headerRow}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[S.title, { color: colors.textPrimary }]}>{t('circle.exploration')}</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={[S.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder={t('circle.searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[S.searchInput, { color: colors.textPrimary }]}
            value={search}
            onChangeText={handleSearch}
          />
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.categoryScroll}>
           {CATEGORIES.map(c => {
             const sel = activeTab === c.id;
             return (
               <TouchableOpacity 
                 key={c.id} 
                 onPress={() => { setActiveTab(c.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                 style={[S.catPill, sel && { backgroundColor: colors.primary, borderColor: colors.primary }]}
               >
                 <Ionicons name={c.icon as any} size={14} color={sel ? '#fff' : colors.textSecondary} />
                 <Text style={[S.catPillTxt, { color: sel ? '#fff' : colors.textSecondary }]}>{t(c.label)}</Text>
               </TouchableOpacity>
             );
           })}
        </ScrollView>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {!search.trim() && (
          <Animated.View entering={FadeInDown}>
            <Text style={[S.sectionTitle, { color: colors.textSecondary }]}>{t('circle.trending')}</Text>
            <View style={S.trendingWrap}>
              {TRENDING_SEARCHES.map((tag) => (
                <TouchableOpacity 
                   key={tag} 
                   style={[S.trendTag, { backgroundColor: colors.surface, borderColor: colors.border }]}
                   onPress={() => handleSearch(tag)}
                >
                  <Text style={[S.trendTagTxt, { color: colors.primary }]}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        <View style={{ marginTop: 24 }}>
          <Text style={[S.sectionTitle, { color: colors.textSecondary }]}>
            {search.trim() ? t('circle.searchResults') : t('circle.nearby')}
          </Text>
          
          <View style={S.listGap}>
            {loading && results.length === 0 ? (
              [1,2,3,4].map(k => <DiscoverySkeleton key={k} colors={colors} />)
            ) : (
              results.map((item, i) => (
                <PersonRow 
                  key={item.id} 
                  item={item} 
                  index={i}
                  colors={colors}
                  status={connections[item.id]}
                  onToggle={() => toggleRequest(item.id, item.name)}
                  onPress={() => navigation.navigate('UserProfile', { userId: item.id, avatar: item.avatar })}
                  t={t}
                />
              ))
            )}
          </View>
          
          {results.length === 0 && !loading && (
            <Animated.View entering={FadeIn} style={S.empty}>
               <Ionicons name="search-outline" size={60} color={colors.textSecondary} opacity={0.3} />
               <Text style={[S.emptyText, { color: colors.textSecondary }]}>{t('circle.noResults', { query: search })}</Text>
            </Animated.View>
          )}
        </View>
      </ScrollView>

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

function PersonRow({ item, index, colors, status, onToggle, onPress, t }: { item: any; index: number; colors: any; status: string; onToggle: () => void; onPress: () => void; t: any }) {
  const isPending = status === 'pending';
  const isAccepted = status === 'accepted';
  const label = isAccepted ? t('circle.dm') : (isPending ? t('findFriends.sent') : t('findFriends.request'));
  const iconName = isAccepted ? "chatbubble-outline" : (isPending ? "checkmark" : "person-add");

  return (
    <Animated.View 
       layout={Layout.springify()} 
       entering={FadeInRight.delay(index * 50).springify()}
       style={[S.personCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
       <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 }} onPress={onPress}>
         <View style={[S.avatar, { backgroundColor: item.avatarColor || colors.primary, overflow: 'hidden' }]}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={StyleSheet.absoluteFill} />
            ) : (
              <Text style={S.avatarTxt}>{item.initials}</Text>
            )}
         </View>
         <View style={{ flex: 1, gap: 2 }}>
            <Text style={[S.name, { color: colors.textPrimary }]}>{item.name}</Text>
            <Text style={[S.handle, { color: colors.primary }]}>@{item.handle}</Text>
            {item.mutuals > 0 && <Text style={[S.mutuals, { color: colors.textSecondary }]}>· {t('findFriends.mutuals', { count: item.mutuals })}</Text>}
         </View>
       </TouchableOpacity>
       <TouchableOpacity 
         onPress={onToggle}
         style={[S.addBtn, { backgroundColor: isAccepted ? colors.primary + '10' : (isPending ? colors.success + '10' : colors.primary + '10'), borderColor: colors.border }]}
       >
          <Ionicons name={iconName as any} size={16} color={isAccepted || isPending ? colors.success : colors.primary} />
          <Text style={[S.addBtnTxt, { color: isAccepted || isPending ? colors.success : colors.primary }]}>
             {label}
          </Text>
       </TouchableOpacity>
    </Animated.View>
  );
}

function DiscoverySkeleton({ colors }: { colors: any }) {
  return (
    <View style={[S.personCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <SkeletonLoader width={56} height={56} borderRadius={20} style={{ marginRight: 14 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonLoader width={120} height={14} />
        <SkeletonLoader width={80} height={12} />
        <SkeletonLoader width={60} height={10} />
      </View>
      <SkeletonLoader width={80} height={36} borderRadius={16} />
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 15, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 24, fontFamily: 'Inter_900Black', letterSpacing: -0.5 },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 54, borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, gap: 12 },
  searchInput: { flex: 1, fontSize: 16, fontFamily: 'Inter_500Medium' },
  
  categoryScroll: { gap: 8, paddingVertical: 4 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', backgroundColor: 'rgba(255,255,255,0.05)' },
  catPillTxt: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  sectionTitle: { fontSize: 11, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1.5, marginBottom: 16, opacity: 0.6 },
  trendingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trendTag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  trendTagTxt: { fontSize: 14, fontFamily: 'Inter_700Bold' },

  listGap: { gap: 12 },
  personCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 24, borderWidth: 1, gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 18, fontFamily: 'Inter_800ExtraBold' },
  name: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  handle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  mutuals: { fontSize: 11, fontFamily: 'Inter_500Medium', opacity: 0.7 },
  
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
  addBtnTxt: { fontSize: 13, fontFamily: 'Inter_800ExtraBold' },

  empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 16 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
