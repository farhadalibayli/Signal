// Screen: PhotoScreen
// Description: Step 2 of onboarding - add profile photo with premium design
// Navigation: UsernameScreen -> here -> FindFriendsScreen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
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
import { ProgressDots }         from '../components/ProgressDots';
import { useRoute }             from '@react-navigation/native';

const { width: W } = Dimensions.get('window');

export default function PhotoScreen() {
  const { t } = useTranslation();
  const insets      = useSafeAreaInsets();
  const navigation  = useNavigation<any>();
  const { isDark, colors } = useTheme();

  const route = useRoute<any>();
  const { name, username } = route.params || { name: 'User', username: 'user' };

  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = useCamera 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(t('photo.permission'), t('photo.permissionSub'));
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.6 });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const goNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.replace('FindFriends', { name, username, photoUri });
  };

  const textPrimary   = colors.textPrimary;
  const textSecondary = colors.textSecondary;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Background Decor */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.bgBlob, { backgroundColor: colors.primary + '10', top: -100, left: -50 }]} />
        <View style={[styles.bgBlob, { backgroundColor: colors.accent + '10', bottom: -50, right: -50 }]} />
      </View>

      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.navBar}>
          <BackButton onPress={() => navigation.goBack()} />
          <ProgressDots total={4} current={1} />
          <View style={{ width: 44 }} />
        </Animated.View>

        <View style={styles.headingWrap}>
           <Animated.Text entering={FadeInDown.duration(600).springify()} style={[styles.headline, { color: colors.textPrimary }]}>
              {t('photo.title')}
           </Animated.Text>
           <Animated.Text entering={FadeInDown.delay(100).duration(600)} style={[styles.subtext, { color: colors.textSecondary }]}>
              {photoUri ? t('photo.selected') : t('photo.subtitle')}
           </Animated.Text>
        </View>

        {/* Photo circle */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.avatarWrap}>
          <View style={[styles.avatarBox, { borderColor: colors.primary, shadowColor: colors.primary }]}>
             {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.image} />
             ) : (
                <View style={[styles.placeholder, { backgroundColor: colors.surface }]}>
                   <Ionicons name="camera-outline" size={48} color={colors.primary} />
                   <Text style={[styles.tapText, { color: colors.primary }]}>{t('photo.tapToAdd')}</Text>
                </View>
             )}
          </View>
        </Animated.View>

        {/* Gallery / Camera buttons */}
        <Animated.View entering={FadeInDown.duration(350).delay(220)} style={styles.optionRow}>
           <TouchableOpacity onPress={() => pickImage(false)} style={[styles.optionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="images" size={20} color={colors.primary} />
              <Text style={[styles.optionTxt, { color: colors.textPrimary }]}>{t('photo.gallery')}</Text>
           </TouchableOpacity>
           <TouchableOpacity onPress={() => pickImage(true)} style={[styles.optionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="camera" size={20} color={colors.primary} />
              <Text style={[styles.optionTxt, { color: colors.textPrimary }]}>{t('photo.camera')}</Text>
           </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).springify()} style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
           <PrimaryButton 
             label={photoUri ? t('photo.continue') : t('photo.continueNoPhoto')} 
             onPress={goNext} 
             progress={0.5}
           />
           <TouchableOpacity onPress={goNext} style={styles.skipWrap}>
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>{t('photo.skip')}</Text>
           </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
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
    marginBottom: 40,
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
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 60,
  },
  avatarBox: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    padding: 4,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  image: { width: '100%', height: '100%', borderRadius: 96 },
  placeholder: {
    width: '100%', height: '100%',
    borderRadius: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapText: { fontSize: 13, fontFamily: 'Inter_700Bold', marginTop: 12 },
  optionRow: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    gap: 12,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionTxt: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  skipWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  skipText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});