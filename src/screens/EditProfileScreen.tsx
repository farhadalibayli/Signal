// Screen: EditProfileScreen
// Description: Edit display name, username, bio; change avatar photo (Premium Design)
// Navigation: ProfileScreen → here (push)

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withRepeat,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';

import { BackButton } from '../components/BackButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { supabase } from '../supabase/supabaseClient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SPACING } from '../constants/spacing';

const MAX_USERNAME = 20;
const MAX_BIO = 60;
const VALID_USERNAME = /^[a-zA-Z0-9_]+$/;

// Custom Premium Input Component specifically for this screen
function PremiumInput({
  label, value, onChangeText, placeholder, icon, prefix, maxLength, multiline, status, loading, isDark, colors
}: any) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const focusAnim = useSharedValue(0);
  
  useEffect(() => {
    focusAnim.value = withTiming(focused ? 1 : 0, { duration: 250 });
  }, [focused]);
  
  const containerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focusAnim.value, [0, 1], [colors.border, colors.primary]),
    shadowColor: colors.primary,
    shadowOpacity: focusAnim.value * 0.2,
    shadowRadius: focusAnim.value * 10,
    elevation: focusAnim.value * 4,
  }));
  
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(focusAnim.value, [0, 1], [colors.textSecondary, colors.primary]),
  }));

  return (
    <View style={styles.inputWrap}>
      <Animated.Text style={[styles.inputLabel, labelStyle]}>{label}</Animated.Text>
      <Animated.View style={[styles.inputContainer, { backgroundColor: isDark ? colors.surface : '#FFFFFF' }, containerStyle, multiline && { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
        <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
        {prefix && <Text style={[styles.inputPrefix, { color: colors.primary }]}>{prefix}</Text>}
        <TextInput
          style={[styles.textInput, { color: colors.textPrimary }, multiline && { height: 80, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={maxLength}
          multiline={multiline}
          autoCapitalize={prefix ? 'none' : 'words'}
          autoCorrect={!prefix}
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 10 }} />}
        {status === 'available' && !loading && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
        {status === 'short' && !loading && <Ionicons name="close-circle" size={20} color={colors.error} />}
        {status === 'invalid' && !loading && <Ionicons name="close-circle" size={20} color={colors.error} />}
      </Animated.View>
      <View style={styles.inputMeta}>
        {status === 'short' && <Animated.Text entering={FadeInDown} style={{ color: colors.error, fontSize: 12 }}>{t('editProfile.tooShort')}</Animated.Text>}
        {status === 'invalid' && <Animated.Text entering={FadeInDown} style={{ color: colors.error, fontSize: 12 }}>{t('editProfile.invalid')}</Animated.Text>}
        {status === 'available' && <Animated.Text entering={FadeInDown} style={{ color: colors.success, fontSize: 12 }}>{t('editProfile.available')}</Animated.Text>}
        {(!status || status === 'idle') && <Text />}
        <Text style={[styles.counter, { color: colors.textSecondary }]}>{value.length}/{maxLength}</Text>
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { user, updateUser } = useAuth();
 
  const currentUser = user || { name: '', username: '', bio: '', initials: '?', avatarColor: '#6C47FF', avatar: null };

const [name, setName] = useState(currentUser.name || '');
const [username, setUsername] = useState(currentUser.username || '');
const [bio, setBio] = useState(currentUser.bio || '');
const [avatarUri, setAvatarUri] = useState<string | null>(currentUser.avatar || null);

// Load latest profile from Supabase on mount
useEffect(() => {
  const loadProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username, bio, avatar_url')
        .eq('id', authUser.id)
        .single();
      if (data) {
        setName(data.display_name || '');
        setUsername(data.username || '');
        setBio(data.bio || '');
        if (data.avatar_url) setAvatarUri(data.avatar_url);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };
  loadProfile();
}, []);
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'available' | 'short' | 'invalid'>('idle');
  
  const [timerRef] = React.useState(() => ({ current: null as (ReturnType<typeof setTimeout> | null) }));
  const scrollY = useSharedValue(0);

  const runCheck = useCallback(() => {
    setChecking(true);
    setTimeout(() => {
      const len = username.length;
      if (len < 3) setStatus('short');
      else if (!VALID_USERNAME.test(username)) setStatus('invalid');
      else setStatus('available');
      setChecking(false);
    }, 500);
  }, [username]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!username || username === currentUser.username) {
      setStatus('idle');
      setChecking(false);
      return;
    }
    setChecking(true);
    setStatus('idle');
    timerRef.current = setTimeout(runCheck, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [username, runCheck]);

  const isValidUsername = status === 'available' || username === currentUser.username;
  const isValid = name.trim().length > 0 && isValidUsername;

  const pickImage = async () => {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') {
      Alert.alert(t('editProfile.permission'), t('editProfile.permissionSub'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

      let avatar_url = avatarUri;

      // Upload new avatar to Supabase Storage if changed
      if (avatarUri && !avatarUri.startsWith('http')) {
        const ext = avatarUri.split('.').pop();
        const filePath = `${authUser.id}/avatar.${ext}`;
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          avatar_url = urlData.publicUrl;
        }
      }

      await supabase.from('profiles').update({
        display_name: name,
        username,
        bio,
        avatar_url,
      }).eq('id', authUser.id);

      // Also update local auth context
      await updateUser({ name, username, bio, initials, avatar: avatar_url });

      setSaving(false);
      setToast(t('editProfile.success'));
      setTimeout(() => navigation.goBack(), 600);
    } catch (err) {
      console.error('Error saving profile:', err);
      setSaving(false);
    }
  };

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerBlurStyle = useAnimatedStyle(() => {
    return { opacity: interpolate(scrollY.value, [0, 50], [0, 1], Extrapolation.CLAMP) };
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      {/* Background Ambience */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={isDark ? ['#6C47FF15', '#0D0A1E'] : ['#6C47FF10', '#F9FAFB']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.glowBlob, { backgroundColor: colors.primary, top: -50, left: -50 }]} />
        <View style={[styles.glowBlob, { backgroundColor: colors.accent, top: 200, right: -100 }]} />
      </View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.avatarSection}>
          <Pressable onPress={pickImage} style={({ pressed }) => [styles.avatarPressable, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
            <View style={[styles.avatarBox, { borderColor: colors.primary, shadowColor: colors.primary }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: currentUser.avatarColor || '#6C47FF' }]}>
                  <Text style={styles.avatarInitials}>{currentUser.initials}</Text>
                </View>
              )}
              {/* Edit Icon Overlay */}
              <View style={[styles.editIconWrap, { backgroundColor: colors.surface }]}>
                <LinearGradient colors={['#6C47FF', '#9D4EDD']} style={styles.editIconGradient}>
                  <Ionicons name="camera" size={16} color="#FFF" />
                </LinearGradient>
              </View>
            </View>
          </Pressable>
          <Text style={[styles.changePhotoText, { color: colors.textSecondary }]}>{t('editProfile.tapToUpdate')}</Text>
        </Animated.View>

        <View style={styles.formContainer}>
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <PremiumInput
              label={t('editProfile.displayName')}
              value={name}
              onChangeText={setName}
              placeholder={t('editProfile.displayNamePlaceholder')}
              icon="person-outline"
              maxLength={30}
              isDark={isDark}
              colors={colors}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <PremiumInput
              label={t('editProfile.username')}
              value={username}
              onChangeText={setUsername}
              placeholder={t('editProfile.usernamePlaceholder')}
              icon="at-circle-outline"
              prefix="@"
              maxLength={MAX_USERNAME}
              status={username === currentUser.username ? 'idle' : status}
              loading={checking}
              isDark={isDark}
              colors={colors}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <PremiumInput
              label={t('editProfile.bio')}
              value={bio}
              onChangeText={setBio}
              placeholder={t('editProfile.bioPlaceholder')}
              icon="information-circle-outline"
              maxLength={MAX_BIO}
              multiline
              isDark={isDark}
              colors={colors}
            />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.saveWrap}>
          <PrimaryButton
            label={saving ? t('editProfile.saving') : t('editProfile.save')}
            onPress={handleSave}
            disabled={!isValid || saving}
            loading={saving}
          />
        </Animated.View>
      </Animated.ScrollView>

      {/* Sexy Floating Header */}
      <Animated.View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
          <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('editProfile.title')}</Text>
          <View style={styles.placeholder} />
        </View>
      </Animated.View>

      {toast && (
        <Animated.View entering={FadeInDown.springify()} style={[styles.toast, { backgroundColor: colors.textPrimary }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.background} style={{ marginRight: 8 }} />
          <Text style={[styles.toastText, { color: colors.background }]}>{toast}</Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glowBlob: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.15,
    filter: [{ blur: 50 }] as any,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  placeholder: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg },
  avatarSection: { alignItems: 'center', marginBottom: SPACING.xxl },
  avatarPressable: {
    marginBottom: 12,
  },
  avatarBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    padding: 2,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 55 },
  avatarInitials: { fontSize: 36, fontFamily: 'Inter_700Bold', color: '#FFF' },
  editIconWrap: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 36,
    height: 36,
    borderRadius: 18,
    padding: 3,
  },
  editIconGradient: {
    flex: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', opacity: 0.7 },
  formContainer: {
    gap: 20,
  },
  inputWrap: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputPrefix: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  inputMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 6,
  },
  counter: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    opacity: 0.8,
  },
  saveWrap: {
    marginTop: 40,
  },
  toast: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  toastText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
