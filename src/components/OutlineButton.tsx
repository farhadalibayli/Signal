/**
 * OutlineButton — Secondary action with border and press flash. Theme-aware.
 */
import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function OutlineButton({ label, onPress, style }: Props) {
  const { colors } = useTheme();
  const flash = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: flash.value === 1 ? `${colors.primary}1A` : 'transparent',
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { flash.value = withTiming(1, { duration: 100 }); }}
      onPressOut={() => { flash.value = withTiming(0, { duration: 150 }); }}
      style={[styles.button, { borderColor: colors.primary }, animatedStyle, style]}
    >
      <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
});
