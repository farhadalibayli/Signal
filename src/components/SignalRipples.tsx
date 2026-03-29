/**
 * SignalRipples — 3–4 concentric circles expanding outward like sonar/wifi pulse.
 * Brand color #6C47FF with decreasing opacity; staggered loop for live broadcast feel.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const CENTER_X = W / 2;
const CENTER_Y = H / 2;
const RIPPLE_COUNT = 4;
const RIPPLE_COLOR = '#6C47FF';
const RIPPLE_GLOW_COLOR = '#9B7FFF';
const MAX_SCALE = 2.5;
const DURATION = 2400;
const STAGGER = 500;

function RippleRing({ index }: { index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * STAGGER,
      withRepeat(
        withTiming(1, { duration: DURATION, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [0.15, MAX_SCALE]);
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.6, 0.3, 0]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.ring,
        styles.ringShadow,
        {
          borderColor: RIPPLE_COLOR,
          left: CENTER_X - 60,
          top: CENTER_Y - 60,
        },
        animatedStyle,
      ]}
    />
  );
}

export function SignalRipples() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: RIPPLE_COUNT }).map((_, i) => (
        <RippleRing key={i} index={i} />
      ))}
    </View>
  );
}

/** Mini version for detail screen "Your signal is live" (e.g. 60px). */
function MiniRippleRing({ index, size }: { index: number; size: number }) {
  const progress = useSharedValue(0);
  const center = size / 2;
  const ringSize = size * 0.8;

  useEffect(() => {
    progress.value = withDelay(
      index * 300,
      withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [0.2, 1.8]);
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.5, 0.25, 0]);
    return {
      transform: [{ scale }],
      opacity,
      width: ringSize,
      height: ringSize,
      borderRadius: ringSize / 2,
      left: center - ringSize / 2,
      top: center - ringSize / 2,
    };
  });

  return (
    <Animated.View
      style={[styles.ring, { borderColor: RIPPLE_COLOR }, animatedStyle]}
      pointerEvents="none"
    />
  );
}

export function MiniSignalRipples({ size = 60 }: { size?: number }) {
  return (
    <View style={[styles.miniWrap, { width: size, height: size }]} pointerEvents="none">
      {Array.from({ length: 3 }).map((_, i) => (
        <MiniRippleRing key={i} index={i} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  ringShadow: {
    shadowColor: RIPPLE_GLOW_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.4,
    elevation: 4,
  },
  miniWrap: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

