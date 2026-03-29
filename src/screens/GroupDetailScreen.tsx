import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';
import { BackButton } from '../components/BackButton';
import { ActionModal } from '../components/ActionModal';
import { ConnectionCard } from '../components/ConnectionCard';
import { SuccessToast } from '../components/SuccessToast';
import { SPACING } from '../constants/spacing';
import { supabase } from '../supabase/supabaseClient';

const { width: W } = Dimensions.get('window');

type NavParamList = { GroupDetail: { groupName: string; groupId?: string } };
type RoutePropType = RouteProp<NavParamList, 'GroupDetail'>;

type Tab = 'members' | 'signals';

export default function GroupDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<RoutePropType>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const groupId = route.params?.groupId;
  const initialName = route.params?.groupName ?? 'Group';

  const [group, setGroup] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Options Sheet
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; title: string; subtitle?: string; icon?: string } | null>(null);

  useEffect(() => {
    if (groupId) {
      loadGroupData();
    }
  }, [groupId]);

  const loadGroupData = async () => {
    setLoading(true);
    try {
      const { data: gData } = await supabase
        .from('custom_groups')
        .select('*')
        .eq('id', groupId)
        .single();
      
      if (gData) setGroup(gData);

      const { data: mData } = await supabase
        .from('group_members')
        .select('id, profiles(id, display_name, username, avatar_url, initials)')
        .eq('group_id', groupId);

      if (mData) {
        setMembers(mData.map((m: any) => ({
          id: m.profiles.id,
          name: m.profiles.display_name,
          handle: m.profiles.username,
          avatar: m.profiles.avatar_url,
          initials: m.profiles.initials || m.profiles.display_name?.split(' ').map((w: string) => w[0]).join('') || '?',
          avatarColor: colors.primary,
        })));
      }
      if (groupId) {
        const { data: sData } = await supabase
          .from('signals')
          .select('*, profiles(id, display_name, username, avatar_url, initials)')
          .eq('audience_type', 'inner')
          .eq('group_id', groupId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        
        if (sData) {
          setGroupSignals(sData.map((s: any) => ({
            id: s.id,
            user: {
              name: s.profiles?.display_name || 'User',
              initials: s.profiles?.initials || s.profiles?.display_name?.split(' ').map((w: string) => w[0]).join('') || '?',
            },
            text: s.message,
            type: s.type,
            timeLeft: Math.max(0, Math.round((new Date(s.expires_at).getTime() - Date.now()) / 60000)),
          })));
        }
      }
    } catch (err) {
      console.error('Error loading group:', err);
    } finally {
      setLoading(false);
    }
  };

  const [groupSignals, setGroupSignals] = useState<any[]>([]);

  const handleRemoveMember = useCallback(async (userId: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
      
      setMembers(prev => prev.filter(m => m.id !== userId));
      setToastConfig({
        visible: true,
        title: t('common.remove', 'Removed'),
        subtitle: t('groupDetail.leftMsg', { name: name }).replace('?', ''),
        icon: 'person-remove-outline'
      });
    } catch (err) {
      console.error('Error removing member:', err);
    }
  }, [groupId, t]);

  const handleLeaveGroup = async () => {
    try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
            await handleRemoveMember(authUser.id, 'You');
            setOptionsVisible(false);
            navigation.goBack();
        }
    } catch(e) {}
  };

  const activeIndicatorTranslateX = useSharedValue(activeTab === 'members' ? 0 : (W - SPACING.lg * 2) / 2);
  const activeIndicatorWidth = useSharedValue((W - SPACING.lg * 2) / 2);

  const handleTabPress = (tab: Tab, index: number) => {
    setActiveTab(tab);
    activeIndicatorTranslateX.value = withSpring(index * activeIndicatorWidth.value, {
      damping: 20,
      stiffness: 250,
    });
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activeIndicatorTranslateX.value }],
    width: activeIndicatorWidth.value,
  }));

  const displayName = group?.name || initialName;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {toastConfig && (
        <SuccessToast
          visible={toastConfig.visible}
          title={toastConfig.title}
          subtitle={toastConfig.subtitle}
          icon={toastConfig.icon as any}
          onHide={() => setToastConfig(null)}
        />
      )}

      {/* Header & Tabs Container */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <BlurView intensity={isDark ? 40 : 80} style={StyleSheet.absoluteFill} tint={isDark ? "dark" : "light"} />
        
        {/* Header */}
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={styles.headerTitles}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {members.length} {t('group.members')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.optionsBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOptionsVisible(true); }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabContainer, { borderColor: colors.border, backgroundColor: colors.background + '50' }]}>
          <Animated.View style={[styles.tabIndicator, { backgroundColor: colors.primary }, indicatorStyle]} />
          <Pressable style={styles.tabBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleTabPress('members', 0); }}>
            <Text style={[styles.tabText, { color: activeTab === 'members' ? '#FFF' : colors.textSecondary }]}>
              {t('group.members')}
            </Text>
          </Pressable>
          <Pressable style={styles.tabBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleTabPress('signals', 1); }}>
            <Text style={[styles.tabText, { color: activeTab === 'signals' ? '#FFF' : colors.textSecondary }]}>
              {t('group.signals')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
           <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>
        ) : activeTab === 'members' ? (
          <FlatList
            data={members}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ padding: SPACING.lg, paddingTop: 180, paddingBottom: insets.bottom + 100 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <ConnectionCard
                  connection={item as any}
                  index={index}
                  onRemove={() => handleRemoveMember(item.id as any, item.name)}
                  onAvatarPress={() => navigation.navigate('UserProfile', { userId: item.id })}
                  swipeable={true}
                />
              </Animated.View>
            )}
            ListHeaderComponent={() => (
              <TouchableOpacity style={styles.addMemberBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <View style={[styles.addMemberIconWrap, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="person-add" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.addMemberText, { color: colors.primary }]}>
                  {t('group.addMember')}
                </Text>
              </TouchableOpacity>
            )}
          />
        ) : groupSignals.length > 0 ? (
          <FlatList
            data={groupSignals}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: SPACING.lg, paddingTop: 180 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                 onPress={() => navigation.navigate('SignalDetail', { signal: item })}
                 style={[styles.signalRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.miniAvatarPulse, { backgroundColor: colors.primary }]}>
                   <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Inter_800ExtraBold' }}>{item.user.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={[styles.signalMsg, { color: colors.textPrimary }]} numberOfLines={1}>{item.text}</Text>
                   <Text style={[styles.signalTime, { color: colors.textSecondary }]}>{item.timeLeft}m left</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={[styles.emptyState, { paddingTop: 180 }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="flash-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('group.noSignals')}</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{t('group.noSignalsSub')}</Text>
          </View>
        )}
      </View>

      <ActionModal
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        title={t('group.groupSettings')}
        options={[
          {
            id: 'edit',
            label: t('group.editGroup'),
            icon: 'pencil-outline' as any,
            onPress: () => { setOptionsVisible(false); },
          },
          {
            id: 'leave',
            label: t('group.leaveGroup'),
            icon: 'exit-outline' as any,
            danger: true,
            onPress: handleLeaveGroup,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerTitles: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
  },
  optionsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 22,
  },
  tabBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  content: {
    flex: 1,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  addMemberIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  addMemberText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: SPACING.xs,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  signalRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, borderWidth: 1, marginBottom: 12, gap: 12 },
  miniAvatarPulse: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  signalMsg: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  signalTime: { fontSize: 12, fontFamily: 'Inter_500Medium', opacity: 0.7, marginTop: 2 },
});
