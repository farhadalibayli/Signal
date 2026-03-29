/**
 * StatCard — Single stat with count-up animation and label.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

type Props = {
  value: number;
  label: string;
  color: string;
  index: number;
  suffix?: string;
  onPress?: () => void;
};

export function StatCard(props: Props) {
  const { value, label, color, index, suffix = '', onPress } = props;
  const { colors } = useTheme();
  const [displayValue, setDisplayValue] = useState(0);
  const [intervalRef] = React.useState(() => ({ current: null as (ReturnType<typeof setInterval> | null) }));
  const scale = useSharedValue(1);

  useEffect(() => {
    const steps = 20;
    const inc = value / steps;
    let cur = 0;
    intervalRef.current = setInterval(() => {
      cur += inc;
      setDisplayValue(cur >= value ? value : Math.floor(cur));
      if (cur >= value && intervalRef.current) clearInterval(intervalRef.current);
    }, 30);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [value]);

  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 60)} style={{ flex: 1 }}>
      <Animated.View style={[s, { flex: 1 }]}>

      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(1.05); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={[styles.value, { color }]}>{displayValue}{suffix}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 11, marginTop: 4 },
});
