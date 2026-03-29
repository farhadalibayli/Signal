// Screen: TutorialScreen
// Description: Slide 3 of onboarding - tutorial slides with premium design
// Navigation: FindFriendsScreen -> here -> Home

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Pressable,
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
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme }             from '../context/ThemeContext';
import { SPACING }              from '../constants/spacing';
import { ProgressDots }         from '../components/ProgressDots';
import { BackButton }           from '../components/BackButton';
import { supabase }             from '../supabase/supabaseClient';

const { width: W, height: H } = Dimensions.get('window');

export default function TutorialScreen() {
  const { t } = useTranslation();
  const insets      = useSafeAreaInsets();
  const navigation  = useNavigation<any>();
  const route       = useRoute<any>();
  const { name, username, photoUri } = route.params || { name: 'User', username: 'user' };
  const { isDark, colors } = useTheme();

  const [activeIdx, setActiveIdx] = useState(0);
  const [scrollRef] = React.useState(() => ({ current: null as ScrollView | null }));

  const SLIDES = [
    {
      id: '1',
      title: t('tutorial.s1.title'),
      body: t('tutorial.s1.body'),
      icon: 'flash-outline' as const,
      color: '#6C47FF',
      pills: [t('tutorial.pill1.s1'), t('tutorial.pill1.s2'), t('tutorial.pill1.s3')],
    },
    {
      id: '2',
      title: t('tutorial.s2.title'),
      body: t('tutorial.s2.body'),
      icon: 'shield-checkmark-outline' as const,
      color: '#D946EF',
      pills: [t('tutorial.pill2.s1'), t('tutorial.pill2.s2'), t('tutorial.pill2.s3')],
    },
    {
      id: '3',
      title: t('tutorial.s3.title'),
      body: t('tutorial.s3.body'),
      icon: 'chatbubbles-outline' as const,
      color: '#3B82F6',
      pills: [t('tutorial.pill3.s1'), t('tutorial.pill3.s2'), t('tutorial.pill3.s3')],
    },
  ];

  const onScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / W);
    if (idx !== activeIdx) {
      setActiveIdx(idx);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleFinish = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('No authenticated Supabase user found');

      const trimmedName = (name ?? '').trim();
      const trimmedUsername = (username ?? '').trim();
      const initials = trimmedName
        ? trimmedName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : '';

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: userData.user.id,
          name: trimmedName,
          display_name: trimmedName,
          username: trimmedUsername,
          avatar_url: photoUri ?? null,
          avatar_color: colors.primary,
          initials,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (profileError) {
        console.error('Failed to upsert profile:', profileError);
        // Continue to home even if profile update fails — don't block the user
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          name: trimmedName,
          username: trimmedUsername,
          avatar_url: photoUri ?? null,
          initials,
          avatarColor: colors.primary,
        },
      });
      if (metadataError) {
        console.error('Failed to update auth metadata', metadataError);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('Home');
    } catch (e) {
      console.error('Failed to complete onboarding profile setup', e);
    }
  };

  const goNext = () => {
    if (activeIdx < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIdx + 1) * W, animated: true });
    } else {
      handleFinish();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Background Ambience */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.bgBlob, { backgroundColor: SLIDES[activeIdx].color + '15', top: -100, left: -50 }]} />
      </View>

      <View style={[styles.navBar, { top: insets.top }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <ProgressDots total={4} current={3} />
        <TouchableOpacity 
          onPress={handleFinish} 
          style={styles.skipBtn}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>{t('tutorial.skip')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s, i) => (
          <View key={s.id} style={styles.slide}>
            <View style={styles.iconContainer}>
               <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.iconBox, { backgroundColor: s.color + '15' }]}>
                  <Ionicons name={s.icon} size={64} color={s.color} />
               </Animated.View>
               <View style={styles.pillsRow}>
                  {s.pills.map((p, pi) => (
                    <Animated.View key={pi} entering={FadeInDown.delay(300 + pi * 100).springify()} style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                       <Text style={[styles.pillText, { color: colors.textPrimary }]}>{p}</Text>
                    </Animated.View>
                  ))}
               </View>
            </View>

            <View style={styles.textContainer}>
               <Animated.View entering={FadeInDown.delay(600).springify()}>
                 <Text style={[styles.title, { color: colors.textPrimary }]}>
                   {s.title}
                 </Text>
               </Animated.View>
               <Animated.View entering={FadeInDown.delay(700).springify()}>
                 <Text style={[styles.body, { color: colors.textSecondary }]}>
                   {s.body}
                 </Text>
               </Animated.View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.dotsRow}>
           {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i === activeIdx ? SLIDES[activeIdx].color : colors.border, width: i === activeIdx ? 24 : 8 }]} />
           ))}
        </View>

        <TouchableOpacity onPress={goNext} style={styles.nextBtn}>
           <LinearGradient colors={[SLIDES[activeIdx].color, SLIDES[activeIdx].color + 'CC']} style={StyleSheet.absoluteFill} />
           <Text style={styles.nextBtnTxt}>
              {activeIdx === SLIDES.length - 1 ? t('tutorial.letsGo') : t('tutorial.next')}
           </Text>
           <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  bgBlob: { position: 'absolute', width: 400, height: 400, borderRadius: 200 },
  skipText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  skipBtn: { padding: 10 },
  navBar: {
    position: 'absolute',
    left: 0, right: 0,
    zIndex: 10,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  slide: { width: W, paddingHorizontal: 40, justifyContent: 'center' },
  iconContainer: { alignItems: 'center', marginBottom: 40 },
  iconBox: {
    width: 160, height: 160,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pillsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  textContainer: { alignItems: 'center' },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: {
    width: '100%',
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  nextBtnTxt: { color: '#fff', fontSize: 17, fontFamily: 'Inter_800ExtraBold' },
});