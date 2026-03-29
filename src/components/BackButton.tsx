/**
 * BackButton — Animated back arrow for navigation. Theme-aware.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

type Props = {
  onPress: () => void;
};

export function BackButton({ onPress }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.9); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[styles.button, { backgroundColor: colors.surface }]}
      >
        <View style={[styles.arrow, { borderColor: colors.textPrimary }]} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '-45deg' }, { translateX: 2 }, { translateY: -2 }],
  },
});
