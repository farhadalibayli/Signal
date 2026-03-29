import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  EntryExitTransition,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { BlurView } from 'expo-blur';

interface SuccessToastProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  type?: 'success' | 'error' | 'info';
  onHide: () => void;
  duration?: number;
}

export function SuccessToast({
  visible,
  title,
  subtitle,
  icon,
  type = 'success',
  onHide,
  duration = 2500,
}: SuccessToastProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const themeColor = type === 'error' ? colors.error : type === 'info' ? colors.primary : colors.success;
  const defaultIcon = type === 'error' ? 'alert-circle' : type === 'info' ? 'information-circle' : 'checkmark-circle';
  const finalIcon = icon || defaultIcon;

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onHide();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(15).stiffness(150)}
      exiting={FadeOutUp.duration(300)}
      style={[
        styles.container,
        { top: insets.top + 10 },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.inner, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
        <View style={[styles.iconWrap, { backgroundColor: themeColor + '20' }]}>
          <Ionicons name={finalIcon as any} size={22} color={themeColor} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingRight: 20,
    borderRadius: 24,
    borderWidth: 1,
    minWidth: '70%',
    maxWidth: '100%',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
    opacity: 0.8,
  },
});
