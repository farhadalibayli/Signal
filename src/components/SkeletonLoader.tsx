import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
  isCircle?: boolean;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
  isCircle = false,
}: SkeletonLoaderProps) {
  const { isDark } = useTheme();
  
  // Animation value goes 0 -> 1 -> 0
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // Pulse softly based on the theme
    const darkColors = ['#2D2D3A', '#3C3C4C'];
    const lightColors = ['#EAEAEA', '#F5F5F5'];

    const colorsToUse = isDark ? darkColors : lightColors;

    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      colorsToUse as any
    ) as string;

    return { backgroundColor };
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius: isCircle ? (typeof width === 'number' ? width / 2 : 50) : borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
});
