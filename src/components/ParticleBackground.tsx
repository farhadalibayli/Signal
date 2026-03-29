/**
 * ParticleBackground — small glowing dots that float upward and fade.
 * Creates depth and atmosphere; signals being sent into the air.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTICLE_COUNT = 35;
const PARTICLE_SIZE = 2;
const SOFT_PURPLE = '#9B7FFF';
const PRIMARY_PURPLE = '#6C47FF';

// Generate random particle positions and animation params (purple family only)
function useParticles() {
  return useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      size: PARTICLE_SIZE + Math.random() * 1.5,
      opacity: 0.3 + Math.random() * 0.5,
      duration: 3000 + Math.random() * 4000,
      delay: Math.random() * 2000,
      color: i % 10 < 7 ? SOFT_PURPLE : PRIMARY_PURPLE,
    }));
  }, []);
}

function Particle({
  x,
  y,
  size,
  opacity,
  duration,
  delay,
  color,
}: {
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  color: string;
}) {
  const translateY = useSharedValue(0);
  const opacityVal = useSharedValue(1);

  React.useEffect(() => {
    const moveUp = -80 - Math.random() * 120;
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(moveUp, { duration, easing: Easing.linear }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );
    opacityVal.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: duration * 0.6, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 }) // reset to visible for next loop
        ),
        -1,
        false
      )
    );
  }, [duration, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity * opacityVal.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function ParticleBackground() {
  const particles = useParticles();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <Particle
          key={p.id}
          x={p.x}
          y={p.y}
          size={p.size}
          opacity={p.opacity}
          duration={p.duration}
          delay={p.delay}
          color={p.color}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
});
