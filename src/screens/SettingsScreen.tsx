// Screen: SettingsScreen
// Description: Full app settings with theme switcher, notifications, privacy, account
// Navigation: ProfileScreen → here (stack push)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { BackButton } from '../components/BackButton';
import { ThemeToggle } from '../components/ThemeToggle';
import { SettingsSection } from '../components/SettingsSection';
import { SettingsRow } from '../components/SettingsRow';
import { LanguageModal } from '../components/LanguageModal';
import { PrimaryButton } from '../components/PrimaryButton';
import { OutlineButton } from '../components/OutlineButton';
import { useTheme } from '../context/ThemeContext';
import { SuccessToast } from '../components/SuccessToast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase/supabaseClient';
import { DARK_COLORS } from '../constants/colors';
import { SPACING } from '../constants/spacing';

const { height: SCREEN_HEIGHT, width } = Dimensions.get('window');

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  const { t } = useTranslation();
  return (
    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
      {t(`settings.${label.toLowerCase()}`)}
    </Text>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { logout } = useAuth();
  const { t, i18n } = useTranslation();  const [notifSignals, setNotifSignals] = useState(true);
  const [notifResponses, setNotifResponses] = useState(true);
  const [notifChats, setNotifChats] = useState(true);
  const [notifConnections, setNotifConnections] = useState(true);
  const [isDND, setIsDND] = useState(false);
  const [realPhone, setRealPhone] = useState('+???');
  const [realEmail, setRealEmail] = useState('???@???.???');

  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [dndFrom, setDndFrom] = useState('22:00');
  const [dndTo, setDndTo] = useState('08:00');
  const [language, setLanguage] = useState('English');
  const [languageId, setLanguageId] = useState('en');
  const [whoFindsMe, setWhoFindsMe] = useState('Connections only');
  const [showActivity, setShowActivity] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [defaultDuration, setDefaultDuration] = useState('1 hour');
  const [defaultDurationMins, setDefaultDurationMins] = useState(60);

  const [thankYouVisible, setThankYouVisible] = useState(false);

  const [whoSheetVisible, setWhoSheetVisible] = useState(false);
  const [blockedSheetVisible, setBlockedSheetVisible] = useState(false);
  const [phoneSheetVisible, setPhoneSheetVisible] = useState(false);
  const [emailSheetVisible, setEmailSheetVisible] = useState(false);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [durationSheetVisible, setDurationSheetVisible] = useState(false);
  const [feedbackSheetVisible, setFeedbackSheetVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [rateSheetVisible, setRateSheetVisible] = useState(false);
  const [ratedStars, setRatedStars] = useState(0);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [signOutSheetVisible, setSignOutSheetVisible] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  const [updateType, setUpdateType] = useState<'phone' | 'email' | null>(null);
  const [updateStep, setUpdateStep] = useState(1);
  const [updateValue, setUpdateValue] = useState('');
  const [updateCode, setUpdateCode] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; title: string; sub?: string; icon?: string } | null>(null);

  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        
        setRealEmail(authUser.email || 'No email');
        setRealPhone(authUser.phone || 'No phone');

        const { data } = await supabase
          .from('profiles')
          .select('is_dnd, discovery_radius, visibility, show_activity, read_receipts')
          .eq('id', authUser.id)
          .single();
        if (data) {
          setIsDND(data.is_dnd || false);
          setDefaultDurationMins(data.discovery_radius || 60);
          setWhoFindsMe(data.visibility || 'Connections only');
          setShowActivity(data.show_activity ?? true);
          setReadReceipts(data.read_receipts ?? true);
        }

        const { data: blocks } = await supabase
          .from('connections')
          .select(`
            id, friend:friend_id (id, display_name, initials)
          `)
          .eq('user_id', authUser.id)
          .eq('status', 'blocked');
        
        if (blocks) {
          setBlockedUsers((blocks || []).map((b: any) => {
            const f = Array.isArray(b.friend) ? b.friend[0] : b.friend;
            return {
              id: b.id,
              name: f?.display_name || 'User',
              initials: f?.initials || '?'
            };
          }));
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    loadSettings();
  }, []);
  
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Global Error Screen States
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const whooshVal = useSharedValue(0);
  const whooshStyle = useAnimatedStyle(() => ({ opacity: whooshVal.value }));

  const handleWhoosh = () => {
    whooshVal.value = withTiming(0.08, { duration: 100 }, () => {
      whooshVal.value = withTiming(0, { duration: 200 });
    });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const languageDisplay = language;
  const languageIdForModal = languageId;

  const handleHapticToggle = (v: boolean) => {
    setHaptics(v);
    if (v) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
  };

  const startUpdate = (type: 'phone' | 'email') => {
    setUpdateType(type);
    setUpdateStep(1);
    setUpdateValue('');
    setUpdateCode('');
    if (type === 'phone') setPhoneSheetVisible(true);
    else setEmailSheetVisible(true);
  };

  const nextUpdateStep = async () => {
    // Simulated Error Demo
    if (updateCode === '000000' || updateValue.toLowerCase() === 'fail') {
      setUpdateLoading(true);
      await new Promise(r => setTimeout(r, 800));
      setUpdateLoading(false);
      setErrorTitle('Update Failed');
      setErrorMessage('The verification code is incorrect or the service is temporarily unavailable. Please try again.');
      setErrorVisible(true);
      return;
    }

    setUpdateLoading(true);
    await new Promise(r => setTimeout(r, 1200)); // Simulated API
    setUpdateLoading(false);
    
    if (updateStep === 1) {
      setUpdateStep(2);
      setUpdateCode('');
    } else if (updateStep === 2) {
      setUpdateStep(3);
    } else {
      setToast(`${updateType === 'phone' ? 'Phone' : 'Email'} updated!`);
      if (updateType === 'phone') setPhoneSheetVisible(false);
      else setEmailSheetVisible(false);
    }
  };

  const handleSignOutConfirm = async () => {
    setSignOutLoading(true);
    await logout();
    setSignOutLoading(false);
    setSignOutSheetVisible(false);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Animated.View entering={FadeInDown.duration(300).delay(0)} style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: 'Inter_900Black' }]}>{t('settings.title')}</Text>
        <View style={styles.placeholder} />
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* APPEARANCE */}
        <SectionLabel label="APPEARANCE" colors={colors} />
        <Animated.View entering={FadeInDown.duration(300).delay(80)}>
          <ThemeToggle onWhoosh={handleWhoosh} />
        </Animated.View>

        {/* NOTIFICATIONS */}
        <SectionLabel label="NOTIFICATIONS" colors={colors} />
        <Animated.View entering={FadeInDown.duration(300).delay(120)}>
          <SettingsSection>
            <SettingsRow
              icon="flash-outline"
              label={t('settings.signals')}
              subvalue={t('settings.signalsSub')}
              type="toggle"
              toggleValue={notifSignals}
              onToggleValueChange={setNotifSignals}
              isFirst
            />
            <SettingsRow
              icon="chatbubble-outline"
              label={t('settings.responses')}
              subvalue={t('settings.responsesSub')}
              type="toggle"
              toggleValue={notifResponses}
              onToggleValueChange={setNotifResponses}
            />
            <SettingsRow
              icon="chatbubbles-outline"
              label={t('settings.chats')}
              subvalue={t('settings.chatsSub')}
              type="toggle"
              toggleValue={notifChats}
              onToggleValueChange={setNotifChats}
              isFirst={false}
              isLast={false}
            />
            <SettingsRow
              icon="person-add-outline"
              label={t('settings.connections')}
              subvalue={t('settings.connectionsSub')}
              type="toggle"
              toggleValue={notifConnections}
              onToggleValueChange={setNotifConnections}
              isFirst={false}
              isLast
            />
          </SettingsSection>
          <View style={styles.dndCard}>
            <SettingsSection>
              <SettingsRow
                icon="moon-outline"
                label={t('settings.dnd')}
                type="toggle"
                toggleValue={isDND}
                onToggleValueChange={async (val) => {
                  setIsDND(val);
                  try {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    if (!authUser) return;
                    await supabase.from('profiles').update({ is_dnd: val }).eq('id', authUser.id);
                  } catch (err) {
                    console.error('Error saving DND:', err);
                  }
                }}
                isFirst
                isLast
              />
            </SettingsSection>
          </View>
        </Animated.View>

        {/* PRIVACY */}
        <SectionLabel label="PRIVACY" colors={colors} />
        <Animated.View entering={FadeInDown.duration(300).delay(240)}>
          <SettingsSection>
            <SettingsRow
              icon="people-outline"
              label={t('settings.whoFindsMe')}
              value={whoFindsMe}
              type="value"
              onPress={() => setWhoSheetVisible(true)}
              isFirst
              isLast={false}
            />
            <SettingsRow
              icon="pulse-outline"
              label={t('settings.activity')}
              subvalue={t('settings.activitySub')}
              type="toggle"
              toggleValue={showActivity}
              onToggleValueChange={async (val) => {
                setShowActivity(val);
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) await supabase.from('profiles').update({ show_activity: val }).eq('id', user.id);
                } catch(e) {}
              }}
              isFirst={false}
              isLast={false}
            />
            <SettingsRow
              icon="eye-outline"
              label={t('settings.readReceipts')}
              subvalue={t('settings.readReceiptsSub')}
              type="toggle"
              toggleValue={readReceipts}
              onToggleValueChange={async (val) => {
                setReadReceipts(val);
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) await supabase.from('profiles').update({ read_receipts: val }).eq('id', user.id);
                } catch(e) {}
              }}
              isFirst={false}
              isLast={false}
            />
            <SettingsRow
              icon="shield-outline"
              label={t('settings.blockedUsers')}
              value={`${blockedUsers.length} ${t('settings.blocked')}`}
              type="value"
              onPress={() => setBlockedSheetVisible(true)}
              isFirst={false}
              isLast
            />
          </SettingsSection>
        </Animated.View>

        {/* PREFERENCES */}
        <SectionLabel label="PREFERENCES" colors={colors} />
        <Animated.View entering={FadeInDown.duration(300).delay(320)}>
          <SettingsSection>
            <SettingsRow
              icon="globe-outline"
              label={t('settings.language')}
              value={languageDisplay}
              type="value"
              onPress={() => setLanguageModalVisible(true)}
              isFirst
              isLast={false}
            />
            <SettingsRow
              icon="phone-portrait-outline"
              label={t('settings.haptics')}
              subvalue={t('settings.hapticsSub')}
              type="toggle"
              toggleValue={haptics}
              onToggleValueChange={handleHapticToggle}
              isFirst={false}
              isLast
            />
          </SettingsSection>
        </Animated.View>

        {/* ACCOUNT */}
        <SectionLabel label="ACCOUNT" colors={colors} />
        <Animated.View entering={FadeInDown.duration(300).delay(400)}>
          <SettingsSection>
            <SettingsRow
              icon="person-outline"
              label={t('settings.editProfile')}
              type="arrow"
              onPress={() => navigation.navigate('EditProfile')}
              isFirst
              isLast={false}
            />
            <SettingsRow
              icon="call-outline"
              label={t('settings.phone')}
              value={realPhone}
              type="value"
              onPress={() => startUpdate('phone')}
              isFirst={false}
              isLast={false}
            />
            <SettingsRow
              icon="mail-outline"
              label={t('settings.email')}
              value={realEmail}
              type="value"
              onPress={() => startUpdate('email')}
              isFirst={false}
              isLast={false}
            />
            <SettingsRow
              icon="trash-outline"
              label={t('settings.deleteAccount')}
              type="arrow"
              onPress={() => setDeleteSheetVisible(true)}
              isFirst={false}
              isLast
              iconColor={colors.error}
              labelColor={colors.error}
            />
          </SettingsSection>
        </Animated.View>

        {/* ABOUT */}
        <SectionLabel label="SUPPORT" colors={colors} />
        <Animated.View entering={FadeInDown.duration(300).delay(480)}>
          <SettingsSection>
            <SettingsRow
              icon="help-circle-outline"
              label={t('settings.help')}
              type="arrow"
              onPress={() => navigation.navigate('HelpFAQ')}
              isFirst
              isLast={false}
            />
            <SettingsRow
              icon="chatbubble-outline"
              label={t('settings.feedback')}
              type="arrow"
              onPress={() => setFeedbackSheetVisible(true)}
              isFirst={false}
              isLast={false}
            />
            <SettingsRow
              icon="star-outline"
              label={t('settings.rate')}
              type="arrow"
              onPress={() => setRateSheetVisible(true)}
              isFirst={false}
              isLast={false}
            />
            <SettingsRow
              icon="information-circle-outline"
              label={t('settings.about')}
              type="arrow"
              onPress={() => setAboutVisible(true)}
              isFirst={false}
              isLast
            />
          </SettingsSection>
        </Animated.View>

        {/* SIGN OUT (at bottom) */}
        <Animated.View entering={FadeInDown.duration(300).delay(640)} style={styles.signOutWrapper}>
          <Pressable
            onPress={() => setSignOutSheetVisible(true)}
            style={({ pressed }) => [
              styles.signOutButton,
              { 
                backgroundColor: colors.error + '10',
                borderColor: colors.error + '25',
                opacity: pressed ? 0.7 : 1
              }
            ]}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={[styles.signOutText, { color: colors.error }]}>{t('settings.logout')}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Whoosh overlay */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF' }, whooshStyle]}
      />

      {/* Who can find me sheet */}
      <Modal visible={whoSheetVisible} transparent animationType="slide">
        <Pressable style={styles.sheetOverlay} onPress={() => setWhoSheetVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + SPACING.md }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{t('components.visibilityTitle')}</Text>
            <Text style={[styles.sheetSubtext, { color: colors.textSecondary, marginBottom: 24 }]}>{t('components.visibilityDesc')}</Text>
            {[
              { label: t('settings.visEveryone'), rawLabel: 'Everyone', desc: t('settings.visEveryoneDesc'), icon: 'globe-outline' },
              { label: t('settings.visConnections'), rawLabel: 'Connections only', desc: t('settings.visConnectionsDesc'), icon: 'people-outline' },
              { label: t('settings.visNoOne'), rawLabel: 'No one', desc: t('settings.visNoOneDesc'), icon: 'eye-off-outline' }
            ].map((opt) => (
              <Pressable
                key={opt.rawLabel}
                onPress={async () => {
                  setWhoFindsMe(opt.rawLabel);
                  setWhoSheetVisible(false);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) await supabase.from('profiles').update({ visibility: opt.label }).eq('id', user.id);
                  } catch(e) {}
                  setTimeout(() => {
                    setToastConfig({
      visible: true,
      title: t('toasts.settingsUpdated'),
      sub: t('toasts.visibilitySaved'),
      icon: 'eye'
    });
                  }, 300);
                }}
                style={[styles.premiumSheetRow, { backgroundColor: whoFindsMe === opt.rawLabel ? colors.primary + '10' : 'transparent', borderColor: whoFindsMe === opt.rawLabel ? colors.primary : colors.border }]}
              >
                <View style={[styles.optIconBox, { backgroundColor: whoFindsMe === opt.rawLabel ? colors.primary : colors.border + '50' }]}>
                  <Ionicons name={opt.icon as any} size={20} color={whoFindsMe === opt.rawLabel ? '#FFF' : colors.textSecondary} />
                </View>
                <View style={styles.optContent}>
                  <Text style={[styles.optTitle, { color: colors.textPrimary }]}>{opt.label}</Text>
                  <Text style={[styles.optDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
                </View>
                {whoFindsMe === opt.rawLabel && (
                  <View style={[styles.optCheck, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  </View>
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Blocked users sheet */}
      <Modal visible={blockedSheetVisible} transparent animationType="slide">
        <Pressable style={styles.sheetOverlay} onPress={() => setBlockedSheetVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + SPACING.md }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
            {blockedUsers.length > 0 ? (
              <View style={{ width: '100%' }}>
                <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.textPrimary, marginBottom: 16, textAlign: 'center' }}>{t('components.blockedUsers')}</Text>
                {blockedUsers.map(user => (
                   <View key={user.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                       <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                         <Text style={{ color: colors.textPrimary, fontFamily: 'Inter_700Bold' }}>{user.initials}</Text>
                       </View>
                       <Text style={{ color: colors.textPrimary, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>{user.name}</Text>
                     </View>
                      <Pressable style={{ backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border }} onPress={async () => {
                        try {
                           await supabase.from('connections').delete().eq('id', user.id);
                           setBlockedUsers(p => p.filter(u => u.id !== user.id));
                        } catch(e) {}
                       setToastConfig({ visible: true, title: t('toasts.userUnblocked'), sub: t('toasts.userUnblockedSub', { name: user.name }), icon: 'shield-checkmark' });
                     }}>
                       <Text style={{ color: colors.textPrimary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>{t('common.remove', 'Unblock')}</Text>
                     </Pressable>
                   </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="shield-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>{t('components.noBlocked')}</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Phone sheet */}
      <Modal visible={phoneSheetVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.sheetOverlay} onPress={() => setPhoneSheetVisible(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + SPACING.lg }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
              <UpdateFlowContent 
                type="phone" 
                step={updateStep} 
                val={updateValue} 
                code={updateCode} 
                loading={updateLoading}
                onValChange={setUpdateValue}
                onCodeChange={setUpdateCode}
                onNext={nextUpdateStep}
                colors={colors}
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Email sheet */}
      <Modal visible={emailSheetVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.sheetOverlay} onPress={() => setEmailSheetVisible(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + SPACING.lg }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
              <UpdateFlowContent 
                type="email" 
                step={updateStep} 
                val={updateValue} 
                code={updateCode} 
                loading={updateLoading}
                onValChange={setUpdateValue}
                onCodeChange={setUpdateCode}
                onNext={nextUpdateStep}
                colors={colors}
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={deleteSheetVisible} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1, justifyContent: 'flex-end' }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <Pressable style={styles.sheetOverlay} onPress={() => setDeleteSheetVisible(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + SPACING.xl }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
              <View style={styles.deleteIconWrap}>
                <Ionicons name="trash-outline" size={32} color={colors.error} />
              </View>
              <Text style={[styles.deleteTitle, { color: colors.error }]}>{t('components.cannotBeUndone')}</Text>
              <Text style={[styles.deleteBody, { color: colors.textSecondary }]}>
                {t('settings.deleteBody')}
              </Text>
              <Text style={[styles.deleteHint, { color: colors.textSecondary }]}>{t('components.typeDelete')}</Text>
              <TextInput
                style={[styles.deleteInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="DELETE"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
              />
              <View style={styles.sheetButtons}>
                <OutlineButton label={t('settings.keepAccount')} onPress={() => setDeleteSheetVisible(false)} style={styles.sheetCancel} />
                <PrimaryButton
                  label={deleteLoading ? '' : t('settings.deleteAccount')}
                  onPress={async () => {
                    setDeleteLoading(true);
                    await new Promise((r) => setTimeout(r, 1500));
                    setDeleteLoading(false);
                    setDeleteSheetVisible(false);
                    setDeleteConfirmText('');
                    
                    setToastConfig({
                  visible: true,
                  title: t('toasts.farewell'),
                  sub: t('toasts.farewellSub'),
                  icon: 'heart-outline'
                });
                    
                    setTimeout(() => {
                      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                    }, 2500);
                  }}
                  loading={deleteLoading}
                  disabled={deleteConfirmText !== 'DELETE'}
                  style={[styles.sheetButton, deleteConfirmText === 'DELETE' ? { backgroundColor: colors.error } : undefined]}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>


      {/* Feedback sheet */}
      <Modal visible={feedbackSheetVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetOverlay}>
          <Pressable style={styles.sheetOverlay} onPress={() => setFeedbackSheetVisible(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + SPACING.md }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{t('settings.feedback')}</Text>
              <TextInput
                style={[styles.feedbackInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder={t('settings.feedbackPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={feedbackText}
                onChangeText={(t) => setFeedbackText(t.slice(0, 500))}
                multiline
                maxLength={500}
              />
              <PrimaryButton 
                label={t('common.send')} 
                onPress={() => { 
                  setFeedbackSheetVisible(false); 
                  setFeedbackText(''); 
                  setToastConfig({
                  visible: true,
                  title: t('toasts.feedbackSent'),
                  sub: t('toasts.feedbackSentSub'),
                  icon: 'paper-plane'
                });  setTimeout(() => setThankYouVisible(true), 500);
                }} 
                style={styles.sheetButton} 
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Thank You Modal */}
      <Modal visible={thankYouVisible} transparent animationType="fade">
        <Pressable style={styles.aboutOverlay} onPress={() => setThankYouVisible(false)}>
          <Animated.View entering={FadeIn.duration(300)} style={[styles.thankYouBox, { backgroundColor: colors.surface }]}>
            <View style={[styles.successIconWrap, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Text style={[styles.thankYouTitle, { color: colors.textPrimary }]}>{t('components.thankYou')}</Text>
            <Text style={[styles.thankYouBody, { color: colors.textSecondary }]}>
              {t('settings.thankYouBody')}
            </Text>
            <PrimaryButton 
              label={t('common.close')} 
              onPress={() => setThankYouVisible(false)} 
              style={styles.thankYouClose} 
            />
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Rate sheet */}
      <Modal visible={rateSheetVisible} transparent animationType="slide">
        <Pressable style={styles.sheetOverlay} onPress={() => setRateSheetVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + SPACING.md }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{t('settings.rate')}</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Pressable key={i} onPress={() => { setRatedStars(i); setTimeout(() => { setRateSheetVisible(false); setToast("Thanks! Glad you're loving Signal"); }, 400); }}>
                  <Ionicons
                    name={i <= ratedStars ? 'star' : 'star-outline'}
                    size={36}
                    color="#F59E0B"
                  />
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* About modal */}
      <Modal visible={aboutVisible} transparent animationType="fade">
        <Pressable style={styles.aboutOverlay} onPress={() => setAboutVisible(false)}>
          <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <Animated.View entering={FadeIn.duration(400)}>
            <Pressable style={[styles.aboutBoxMinimal, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <Pressable 
                style={styles.aboutCloseIcon} 
                onPress={() => setAboutVisible(false)}
                hitSlop={15}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>

              <View style={[styles.aboutLogoSmall, { backgroundColor: colors.primary }]}>
                <Ionicons name="flash" size={32} color="#FFF" />
              </View>

              <Text style={[styles.aboutTitleMinimal, { color: colors.textPrimary }]}>Signal</Text>
              <Text style={[styles.aboutVersionSnippet, { color: colors.textSecondary }]}>{t('components.version')} 1.0.0</Text>

              <View style={[styles.aboutDivider, { backgroundColor: colors.border }]} />

              <Text style={[styles.aboutDescriptionMinimal, { color: colors.textSecondary }]}>
                {t('settings.aboutDescription')}
              </Text>

              <Text style={[styles.aboutFooterText, { color: colors.textSecondary, opacity: 0.6 }]}>
                {t('components.createdBy')} <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold' }}>Farhad Alibayli</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Sign Out Sheet */}
      <Modal visible={signOutSheetVisible} transparent animationType="fade">
        <Pressable style={styles.sheetOverlay} onPress={() => setSignOutSheetVisible(false)}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View entering={FadeInDown.springify().damping(20).stiffness(200)}>
            <Pressable 
              style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + SPACING.xl }]}
              onPress={(e: any) => e.stopPropagation()}
            >
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
            <View style={[styles.sheetIconWrap, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="log-out" size={32} color={colors.error} />
            </View>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{t('components.signOutTitle')}</Text>
            <Text style={[styles.sheetSubtext, { color: colors.textSecondary }]}>{t('components.signOutDesc')}</Text>
            <View style={styles.sheetActionButtons}>
              <OutlineButton label={t('common.cancel')} onPress={() => setSignOutSheetVisible(false)} style={{ flex: 1 }} />
              <PrimaryButton
                label={signOutLoading ? '' : t('settings.logout')}
                onPress={handleSignOutConfirm}
                loading={signOutLoading}
                style={{ flex: 1, backgroundColor: colors.error }}
              />
            </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      <LanguageModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        selectedLanguageId={languageIdForModal}
        onSelect={(id) => {
          setLanguageId(id);
          setLanguage(id === 'az' ? 'Azerbaijani' : id === 'ru' ? 'Russian' : 'English');
        }}
        onLanguageUpdated={() => setToast('Language updated')}
      />

      {toast && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.toastText, { color: colors.textPrimary }]}>{toast}</Text>
        </Animated.View>
      )}

      {/* Global Error Modal */}
      <Modal visible={errorVisible} transparent animationType="fade">
        <View style={styles.errorOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View entering={FadeInDown.springify()} style={[styles.errorBox, { backgroundColor: colors.surface }]}>
            <View style={[styles.errorIconWrap, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="alert-circle" size={40} color={colors.error} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>{errorTitle || 'Something went wrong'}</Text>
            <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
              {errorMessage || 'An unexpected error occurred. Please try again later.'}
            </Text>
            <Pressable 
              onPress={() => setErrorVisible(false)}
              style={({ pressed }) => [
                styles.errorActionBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }
              ]}
            >
              <Text style={styles.errorActionText}>{t('components.goBack')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function UpdateFlowContent({ type, step, val, code, loading, onValChange, onCodeChange, onNext, colors }: any) {
  const { t } = useTranslation();
  const isPhone = type === 'phone';
  
  if (step === 1) {
    return (
      <View style={styles.updateFlow}>
        <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{t('components.securityVerif')}</Text>
        <Text style={[styles.sheetSubtext, { color: colors.textSecondary }]}>
          {t('settings.enterCodeSentTo', { contact: isPhone ? t('settings.yourPhone') : t('settings.yourEmail') })}
        </Text>
        <TextInput
          key={`step1-${type}`}
          style={[styles.deleteInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary, textAlign: 'center', letterSpacing: 8 }]}
          placeholder="000 000"
          value={code}
          onChangeText={onCodeChange}
          keyboardType="numeric"
          maxLength={6}
        />
        <PrimaryButton label={t('otp.verify')} onPress={onNext} loading={loading} disabled={code.length < 6} />
      </View>
    );
  }

  if (step === 2) {
    return (
      <View style={styles.updateFlow}>
        <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{t('settings.newContactTitle', { contact: isPhone ? t('settings.number') : t('settings.emailWord') })}</Text>
        <Text style={[styles.sheetSubtext, { color: colors.textSecondary }]}>
          {t('settings.enterNewContact', { contact: isPhone ? t('settings.phoneNumber') : t('settings.emailAddress') })}
        </Text>
        <TextInput
          key={`step2-${type}`}
          style={[styles.deleteInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder={isPhone ? '+994 XX XXX XX XX' : 'name@example.com'}
          value={val}
          onChangeText={onValChange}
          keyboardType={isPhone ? "default" : "email-address"}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        <PrimaryButton label={t('settings.sendCode')} onPress={onNext} loading={loading} disabled={val.length < 5} />
      </View>
    );
  }

  return (
    <View style={styles.updateFlow}>
      <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{t('settings.verifyNewTitle', { contact: isPhone ? t('settings.number') : t('settings.emailWord') })}</Text>
      <Text style={[styles.sheetSubtext, { color: colors.textSecondary }]}>
        {t('settings.oneLastStep', { val })}
      </Text>
      <TextInput
        key={`step3-${type}`}
        style={[styles.deleteInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary, textAlign: 'center', letterSpacing: 8 }]}
        placeholder="000 000"
        value={code}
        onChangeText={onCodeChange}
        keyboardType="numeric"
        maxLength={6}
      />
      <PrimaryButton label={t('settings.confirmFinish')} onPress={onNext} loading={loading} disabled={code.length < 6} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  placeholder: { width: 40 },
  scroll: { flex: 1 },
  content: { paddingTop: 24 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 10,
    opacity: 0.6,
  },
  dndCard: { marginTop: 10 },
  dndExpand: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  dndTimeRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  dndTimeBlock: {},
  dndTimeLabel: { fontSize: 12 },
  dndTimeValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  dndInfo: { fontSize: 12 },
  footer: { alignItems: 'center', marginTop: 32, marginBottom: 32 },
  footerTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 3 },
  footerVersion: { fontSize: 11, marginTop: 4 },
  footerLove: { fontSize: 11, marginTop: 2 },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 12, textAlign: 'center' },
  sheetSubtext: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  sheetBody: { fontSize: 13, marginBottom: 20, textAlign: 'center' },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sheetRowText: { fontSize: 16 },
  sheetButton: { marginTop: 8 },
  sheetButtons: { gap: 10, marginTop: 16 },
  sheetCancel: {},
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 14, marginTop: 12 },
  deleteIconWrap: { alignItems: 'center', marginBottom: 12 },
  deleteTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 8 },
  deleteBody: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  deleteHint: { fontSize: 12, marginBottom: 8 },
  deleteInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  feedbackInput: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16 },
  aboutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  aboutBoxMinimal: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    alignItems: 'center',
    width: width * 0.85,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  aboutCloseIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutLogoSmall: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  aboutTitleMinimal: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 8,
  },
  aboutVersionSnippet: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 20,
    opacity: 0.7,
  },
  aboutDescriptionMinimal: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  aboutDivider: {
    width: 60,
    height: 1,
    marginVertical: 20,
    opacity: 0.5,
  },
  aboutFooterText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  updateFlow: { paddingHorizontal: 4, width: '100%' },
  signOutWrapper: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  signOutButton: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  sheetIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sheetActionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 16,
  },
  premiumSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  optIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optContent: { flex: 1 },
  optTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  optDesc: { fontSize: 12, marginTop: 2 },
  optCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thankYouBox: {
    padding: SPACING.xl,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  thankYouTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  thankYouBody: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  thankYouClose: { width: '100%' },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  toastText: { fontSize: 14 },
  errorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorBox: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorActionBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorActionText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});
