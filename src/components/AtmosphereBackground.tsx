import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  isDark: boolean;
};

const DOT_COUNT = 20;

export function AtmosphereBackground({ isDark }: Props) {
  const { width, height } = useWindowDimensions();

  const dots = useMemo(
    () =>
      Array.from({ length: DOT_COUNT }).map((_, i) => ({
        id: i,
        top: Math.random() * height,
        left: Math.random() * width,
      })),
    [width, height]
  );

  const float = useSharedValue(0);

  React.useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }] as any,
  }));

  const topGradientColors = isDark
    ? ['rgba(108,71,255,0.18)', 'rgba(108,71,255,0)']
    : ['rgba(108,71,255,0.10)', 'rgba(108,71,255,0)'];

  const bottomGlowColor = isDark
    ? 'rgba(155,127,255,0.08)'
    : 'rgba(155,127,255,0.05)';

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[styles.topGlowWrap]}>
        <LinearGradient
          colors={topGradientColors as [string, string]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.topGlow}
        />
      </View>

      <View
        style={[
          styles.bottomGlow,
          {
            backgroundColor: bottomGlowColor,
          },
        ]}
      />

      <Animated.View style={floatStyle} pointerEvents="none">
        {dots.map((d) => (
          <View
            key={d.id}
            style={[
              styles.dot,
              {
                top: d.top,
                left: d.left,
                opacity: isDark ? 0.06 : 0.04,
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  topGlowWrap: {
    position: 'absolute',
    top: -80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  topGlow: {
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  bottomGlow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    bottom: -100,
    right: -60,
  },
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#6C47FF',
  },
});

