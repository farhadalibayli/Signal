import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { supabase } from '../supabase/supabaseClient';
import { ActivityItem } from '../components/ActivityItem';
import { BackButton } from '../components/BackButton';
import { SPACING } from '../constants/spacing';
import { COMPOSE_TYPES } from '../data/composeTypes';
import type { ActivityData, SignalData } from '../types/signal';
import { useAuth } from '../context/AuthContext';

export default function ActivityHistoryScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('signals')
        .select('id, type, message, created_at, expires_at, location, location_name, location_privacy, signal_answers:signal_answers(count)')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const parsed: ActivityData[] = data.map(s => {
          const typeOption = COMPOSE_TYPES.find(t => t.value === s.type);
          
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

          return {
            id: s.id,
            type: 'signal_sent',
            signalType: s.type,
            typeColor: typeOption?.color || '#6C47FF',
            text: s.message,
            responses: (s as any).signal_answers?.[0]?.count || 0,
            timeAgo: s.created_at,
            status: new Date(s.expires_at) > new Date() ? 'active' : 'expired',
            createdAt: new Date(s.created_at).getTime(),
            location: s.location ? {
              privacy: s.location_privacy || 'specific',
              label: s.location_name || '',
              latitude,
              longitude,
            } : undefined,
          };
        });
        setActivities(parsed);
      }
    } catch (err) {
      console.error('Error fetching activity history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchHistory();
  }, []);

  const handleActivityPress = (activity: ActivityData) => {
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={StyleSheet.absoluteFill}>
          <BlurView intensity={isDark ? 40 : 80} style={StyleSheet.absoluteFill} tint={isDark ? "dark" : "light"} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)' }]} />
        </View>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('profile.activityHistory', { defaultValue: 'Full Activity' })}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: insets.top + 70, paddingBottom: insets.bottom + 40, paddingHorizontal: SPACING.md }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Ionicons name="newspaper-outline" size={48} color={colors.textSecondary} opacity={0.3} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('components.noResults')}</Text>
          </View>
        ) : null}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               <ActivityItem
                 activity={item}
                 index={index}
                 onPress={() => handleActivityPress(item)}
               />
            </View>
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  card: {
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    opacity: 0.6,
  },
});
