/**
 * AlertBadge — Unread count pill for Alerts tab and header.
 * FadeIn + scale on appear, FadeOut + scale on disappear; pop when count changes.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';

type Props = {
  count: number;
  visible: boolean;
  /** For header: "4 new"; for tab: just number. */
  variant?: 'header' | 'tab';
};

export function AlertBadge({ count, visible, variant = 'tab' }: Props) {
  const scale = useSharedValue(visible ? 1 : 0);
  const [prevCount] = React.useState(() => ({ current: count }));

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12 });
      if (count !== prevCount.current) {
        prevCount.current = count;
        scale.value = withSpring(1.3, { damping: 10 }, () => {
          scale.value = withSpring(1);
        });
      }
    } else {
      scale.value = withSpring(0, { damping: 15 });
    }
  }, [visible, count]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!visible && count === 0) return null;

  const label = variant === 'header' ? `${count} new` : count > 9 ? '9+' : String(count);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.badge, variant === 'header' && styles.badgeHeader, animatedStyle]}
    >
      <Text style={[styles.text, variant === 'header' && styles.textHeader]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: COLORS.ERROR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeHeader: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    height: undefined,
    minHeight: 22,
  },
  text: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  textHeader: {
    fontSize: 11,
  },
});
