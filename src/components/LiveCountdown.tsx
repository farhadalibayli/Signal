/**
 * LiveCountdown — Real-time countdown with progress bar.
 * Bar color: green >50%, orange 25–50%, red <25% with pulse.
 * Cleans up interval on unmount.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';

type Props = {
  /** Total seconds remaining when component mounts. */
  totalSeconds: number;
  /** Callback when countdown reaches 0 (optional). */
  onExpire?: () => void;
};

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '0m remaining';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

function formatExpiresAt(secondsFromNow: number): string {
  const d = new Date();
  d.setSeconds(d.getSeconds() + secondsFromNow);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `Expires at ${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function LiveCountdown({ totalSeconds: initialSeconds, onExpire }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, Math.floor(initialSeconds)));
  const [totalRef] = React.useState(() => ({ current: Math.max(1, Math.floor(initialSeconds)) }));
  const [intervalRef] = React.useState(() => ({ current: null as (ReturnType<typeof setInterval> | null) }));

  const total = totalRef.current;
  const ratio = total > 0 ? Math.max(0, secondsLeft / total) : 0;
  const isRed = ratio > 0 && ratio < 0.25;
  const progress = useSharedValue(ratio);
  const pulseOpacity = useSharedValue(0.6);
  const isRedShared = useSharedValue(isRed);
  isRedShared.value = isRed;

  useEffect(() => {
    const total = totalRef.current;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [onExpire]);

  // Pulse when in red zone
  React.useEffect(() => {
    if (isRed) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }
    return () => {
      pulseOpacity.value = 0.6;
    };
  }, [isRed]);

  progress.value = withTiming(ratio, { duration: 500 });

  const barColor =
    ratio > 0.5 ? COLORS.SUCCESS : ratio > 0.25 ? COLORS.WARNING : COLORS.ERROR;

  const trackAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    opacity: isRedShared.value ? pulseOpacity.value : 1,
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: barColor },
            trackAnimatedStyle,
          ]}
        />
      </View>
      <View style={styles.row}>
        <Text style={[styles.remaining, { color: barColor }]}>
          {formatRemaining(secondsLeft)}
        </Text>
        <Text style={styles.expiresAt}>{formatExpiresAt(secondsLeft)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  barTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: COLORS.BORDER,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  remaining: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  expiresAt: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
  },
});
