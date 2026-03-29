/**
 * PrimaryButton — Full-width CTA with gradient, glow, and press animation.
 * Now includes an optional 'progress' prop for onboarding fill effects.
 */
import React, { useEffect } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  View,
  StyleProp,
  DimensionValue,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  label:     string;
  onPress:   () => void;
  disabled?: boolean;
  loading?:  boolean;
  progress?: number; // 0 to 1
  style?:    StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading  = false,
  progress,
  style,
}: Props) {
  const { isDark, colors } = useTheme();

  const scale = useSharedValue(1);
  const progressValue = useSharedValue(0);

  useEffect(() => {
    if (progress !== undefined) {
      progressValue.value = withSpring(progress, { damping: 20, stiffness: 80 });
    }
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%` as DimensionValue,
    backgroundColor: 'rgba(255,255,255,0.15)',
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  // ── disabled colors ──
  const disabledBg   = colors.disabled;
  const disabledText = isDark ? 'rgba(155,127,255,0.5)' : '#9B7FFF';

  // ── gradient colors (active) ──
  const gradientColors: [string, string, string] = ['#7C5CFF', '#6C47FF', '#5A35FF'];

  return (
    <AnimatedPressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[styles.wrapper, animatedStyle, style]}
    >
      <View style={[styles.inner, disabled && { backgroundColor: disabledBg }]}>
        {!disabled && (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              StyleSheet.absoluteFill,
              {
                shadowColor:   '#6C47FF',
                shadowOpacity: 0.45,
                shadowRadius:  14,
                shadowOffset:  { width: 0, height: 6 },
                elevation:     10,
              },
            ]}
          />
        )}
        
        {/* Progress Fill Layer */}
        {progress !== undefined && !disabled && (
          <Animated.View style={[StyleSheet.absoluteFill, progressStyle]} />
        )}

        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={[styles.label, { color: disabled ? disabledText : '#FFFFFF' }]}>
            {label}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width:        '100%',
    borderRadius: 16,
    overflow:     'hidden',
  },
  inner: {
    height:          58,
    borderRadius:    16,
    justifyContent:  'center',
    alignItems:      'center',
    overflow:        'hidden',
  },
  label: {
    fontSize:    16,
    fontWeight:  'bold',
    letterSpacing: 0.4,
    zIndex: 1,
  },
});