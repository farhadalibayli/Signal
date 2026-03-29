/**
 * ProgressDots — Step indicator with animated active pill.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';

type Props = {
  total: number;
  current: number;
};

export function ProgressDots({ total, current }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <Dot key={i} active={i === current} />
      ))}
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const width = useSharedValue(8);

  useEffect(() => {
    width.value = withSpring(active ? 24 : 8, { damping: 20, stiffness: 300 });
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: active ? COLORS.PRIMARY : COLORS.BORDER,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
