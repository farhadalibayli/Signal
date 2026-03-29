/**
 * ThemeToggle — App theme switcher card with custom animated toggle and mini previews.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { DARK_COLORS, LIGHT_COLORS } from '../constants/colors';
import { SPACING } from '../constants/spacing';

const TOGGLE_WIDTH = 56;
const TOGGLE_HEIGHT = 30;
const THUMB_SIZE = 24;
const THUMB_OFF = 3;
const THUMB_ON = TOGGLE_WIDTH - THUMB_SIZE - 3;

type Props = {
  onWhoosh?: () => void;
};

export function ThemeToggle({ onWhoosh }: Props) {
  const { t } = useTranslation();
  const { isDark, toggleTheme, colors } = useTheme();
  const thumbX = useSharedValue(isDark ? THUMB_ON : THUMB_OFF);
  const trackBg = useSharedValue(isDark ? 1 : 0);
  const whooshOpacity = useSharedValue(0);

  useEffect(() => {
    thumbX.value = withSpring(isDark ? THUMB_ON : THUMB_OFF, { stiffness: 200, damping: 15 });
    trackBg.value = withTiming(isDark ? 1 : 0, { duration: 300 });
  }, [isDark]);

  const runWhoosh = () => {
    whooshOpacity.value = withTiming(0.08, { duration: 100 }, () => {
      whooshOpacity.value = withTiming(0, { duration: 200 });
    });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    runWhoosh();
    onWhoosh?.();
    toggleTheme();
  };

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: trackBg.value === 1 ? DARK_COLORS.border : LIGHT_COLORS.border,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
    backgroundColor: trackBg.value === 1 ? DARK_COLORS.primary : LIGHT_COLORS.surface,
    shadowColor: DARK_COLORS.primary,
    shadowOpacity: trackBg.value === 1 ? 0.4 : 0,
    shadowRadius: 6,
  }));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.left}>
          {isDark ? (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
              <Ionicons name="moon" size={22} color={DARK_COLORS.accent} />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
              <Ionicons name="sunny" size={22} color={LIGHT_COLORS.warning} />
            </Animated.View>
          )}
          <View style={styles.labelWrap}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('components.appTheme')}</Text>
            <Text style={[styles.mode, { color: colors.textSecondary }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
        </View>
        <Pressable 
          accessibilityRole="switch"
          accessibilityState={{ checked: isDark }}
          accessibilityLabel={t('components.appTheme')}
          onPress={handlePress} 
          style={styles.toggleHit}
        >
          <Animated.View style={[styles.track, trackStyle]}>
            <Animated.View style={[styles.thumb, thumbStyle]}>
              {isDark ? (
                <Ionicons name="moon" size={10} color="#FFF" />
              ) : (
                <Ionicons name="sunny" size={10} color={LIGHT_COLORS.warning} />
              )}
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>
      <View style={styles.previewRow}>
        <Pressable 
          accessibilityRole="button"
          onPress={() => { if (isDark) handlePress(); }} 
          style={styles.mockupWrap}
        >
          <View
            style={[
              styles.mockup,
              styles.mockupLight,
              !isDark && styles.mockupActive,
            ]}
          >
            <View style={[styles.mockupBar, styles.mockupBarLight]} />
            <View style={[styles.mockupCard, { backgroundColor: LIGHT_COLORS.surface }]} />
          </View>
          <Text style={[styles.mockupLabel, { color: colors.textSecondary }]}>{t('components.light')}</Text>
        </Pressable>
        <Pressable 
          accessibilityRole="button"
          onPress={() => { if (!isDark) handlePress(); }} 
          style={styles.mockupWrap}
        >
          <View
            style={[
              styles.mockup,
              styles.mockupDark,
              isDark && styles.mockupActive,
            ]}
          >
            <View style={[styles.mockupBar, styles.mockupBarDark]} />
            <View style={[styles.mockupCard, { backgroundColor: DARK_COLORS.surface }]} />
          </View>
          <Text style={[styles.mockupLabel, { color: colors.textSecondary }]}>{t('components.dark')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  labelWrap: {},
  label: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  mode: { fontSize: 12, marginTop: 2 },
  toggleHit: { padding: 4 },
  track: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    borderRadius: 15,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    left: 3,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  mockupWrap: { alignItems: 'center' },
  mockup: {
    width: 70,
    height: 110,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
    borderColor: LIGHT_COLORS.border,
  },
  mockupDark: {
    backgroundColor: DARK_COLORS.background,
    borderColor: DARK_COLORS.border,
  },
  mockupLight: {
    backgroundColor: LIGHT_COLORS.background,
  },
  mockupActive: {
    borderColor: DARK_COLORS.primary,
    borderWidth: 2,
  },
  mockupBar: {
    height: 18,
    width: '100%',
  },
  mockupBarDark: { backgroundColor: DARK_COLORS.surface },
  mockupBarLight: { backgroundColor: LIGHT_COLORS.surface },
  mockupCard: {
    flex: 1,
    margin: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DARK_COLORS.primary,
  },
  mockupLabel: {
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'Inter_700Bold',
  },
});
