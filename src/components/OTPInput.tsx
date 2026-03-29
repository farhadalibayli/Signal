/**
 * OTPInput — 6-box OTP entry with auto-advance and onComplete callback.
 */
import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';

const BOX_WIDTH = 48;
const BOX_HEIGHT = 58;
const LENGTH = 6;

type Props = {
  length?: number;
  onComplete: (code: string) => void;
  onCodeChange?: (code: string) => void;
};

export function OTPInput({ length = 6, onComplete, onCodeChange }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const [inputRefs] = React.useState(() => ({ current: [] as (TextInput | null)[] }));

  const updateDigit = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const num = value.replace(/\D/g, '');
    const next = [...digits];
    next[index] = num;
    setDigits(next);
    const code = next.join('');
    onCodeChange?.(code);
    if (num && index < length - 1) {
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 50);
    }
    if (code.length === length) onComplete(code);
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const isComplete = digits.every((d) => d !== '');
  const activeIndex = digits.findIndex((d) => d === '');
  const currentFocus = activeIndex === -1 ? length - 1 : activeIndex;

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, i) => (
        <OTPBox
          key={i}
          value={digits[i]}
          isActive={currentFocus === i}
          isFilled={!!digits[i]}
          isSuccess={isComplete}
          onFocus={() => inputRefs.current[i]?.focus()}
        >
          <TextInput
            ref={(r) => { inputRefs.current[i] = r; }}
            style={styles.hiddenInput}
            value={digits[i]}
            onChangeText={(v) => updateDigit(i, v)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            autoFocus={i === 0}
          />
        </OTPBox>
      ))}
    </View>
  );
}

function OTPBox({
  children,
  value,
  isActive,
  isFilled,
  isSuccess,
  onFocus,
}: {
  children: React.ReactNode;
  value: string;
  isActive: boolean;
  isFilled: boolean;
  isSuccess: boolean;
  onFocus: () => void;
}) {
  const borderProgress = useSharedValue(isActive ? 1 : 0);
  const bgLift = useSharedValue(isFilled ? 1 : 0);
  const successProgress = useSharedValue(isSuccess ? 1 : 0);

  React.useEffect(() => {
    borderProgress.value = withSpring(isActive ? 1 : 0, { damping: 20, stiffness: 300 });
    bgLift.value = withSpring(isFilled ? 1 : 0);
    successProgress.value = withSpring(isSuccess ? 1 : 0);
  }, [isActive, isFilled, isSuccess]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: successProgress.value === 1 ? COLORS.SUCCESS : (borderProgress.value > 0.5 ? COLORS.PRIMARY : COLORS.BORDER),
    backgroundColor: bgLift.value > 0.5 ? '#241D3D' : COLORS.SURFACE,
    shadowColor: successProgress.value === 1 ? COLORS.SUCCESS : COLORS.PRIMARY,
    shadowOpacity: (successProgress.value === 1 ? 0.3 : borderProgress.value * 0.3) as number,
    shadowRadius: successProgress.value === 1 ? 8 : borderProgress.value * 8,
  }));

  return (
    <Pressable onPress={onFocus}>
      <Animated.View style={[styles.box, animatedStyle]}>
        <Animated.Text style={styles.digit}>{value}</Animated.Text>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  box: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digit: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    position: 'absolute',
  },
  hiddenInput: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
  },
});
