/**
 * CharacterCounter — Animated count display with warning/danger states.
 */
import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';

type Props = {
  current: number;
  max: number;
};

export function CharacterCounter({ current, max }: Props) {
  const colorProgress = useSharedValue(0); // 0 = normal, 1 = warning, 2 = danger

  useEffect(() => {
    if (current > 115) colorProgress.value = withTiming(2, { duration: 150 });
    else if (current > 100) colorProgress.value = withTiming(1, { duration: 150 });
    else colorProgress.value = withTiming(0, { duration: 150 });
  }, [current]);

  const textStyle = useAnimatedStyle(() => {
    const c =
      colorProgress.value >= 2
        ? COLORS.ERROR
        : colorProgress.value >= 1
          ? COLORS.WARNING
          : COLORS.TEXT_SECONDARY;
    return { color: c };
  });

  return (
    <Animated.Text style={[styles.counter, textStyle]}>
      {current} / {max}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  counter: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
