/**
 * SignalInput — Styled text input with focus border and glow animation.
 * Uses useColorScheme() directly to stay in sync with system theme
 * immediately on render, avoiding ThemeContext AsyncStorage delay.
 */
import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { SPACING } from '../constants/spacing';
import { useTheme } from '../context/ThemeContext';


// ─── types ────────────────────────────────────────────────────────────────────
type Props = {
  placeholder?:   string;
  value:          string;
  onChangeText:   (text: string) => void;
  leftIcon?:      React.ReactNode;
  keyboardType?:  TextInputProps['keyboardType'];
  autoFocus?:     boolean;
  maxLength?:     number;
  prefix?:        string;
  style?:         ViewStyle;
  inputStyle?:    ViewStyle;
  multiline?:     boolean;
  numberOfLines?: number;
  onFocus?:       () => void;
  onBlur?:        () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?:    boolean;
  returnKeyType?:  TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  blurOnSubmit?:   boolean;
};

// ─── component ───────────────────────────────────────────────────────────────
export function SignalInput({
  placeholder,
  value,
  onChangeText,
  leftIcon,
  keyboardType = 'default',
  autoFocus,
  maxLength,
  prefix,
  style,
  inputStyle,
  multiline    = false,
  numberOfLines = 3,
  onFocus:     onFocusProp,
  onBlur:      onBlurProp,
  autoCapitalize,
  autoCorrect,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
}: Props) {
  const { isDark, colors } = useTheme();

  const [focused, setFocused] = useState(false);

  const focusAnim  = useSharedValue(0);
  const glowAnim   = useSharedValue(0);

  const handleFocus = () => {
    setFocused(true);
    focusAnim.value = withTiming(1, { duration: 200 });
    glowAnim.value  = withTiming(1, { duration: 200 });
    onFocusProp?.();
  };

  const handleBlur = () => {
    setFocused(false);
    focusAnim.value = withTiming(0, { duration: 200 });
    glowAnim.value  = withTiming(0, { duration: 200 });
    onBlurProp?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      [colors.border, colors.primary],
    ),
    shadowColor:   colors.primary,
    shadowOpacity: glowAnim.value * (isDark ? 0.35 : 0.22),
    shadowRadius:  glowAnim.value * 10,
    elevation:     glowAnim.value * 5,
  }));

  return (
    <Animated.View
      style={[
        styles.wrapper,
        multiline && styles.wrapperMultiline,
        {
          backgroundColor: colors.surface,
          // Light mode: add a subtle shadow for depth even when unfocused
          ...(isDark ? {} : {
            shadowColor:   colors.primary,
            shadowOpacity: focused ? 0 : 0.12,   // replaced by focus glow when active
            shadowRadius:  8,
            shadowOffset:  { width: 0, height: 2 },
          }),
        },
        animatedStyle,
        style,
      ]}
    >
      {/* Left icon */}
      {leftIcon ? (
        <View style={styles.leftIcon}>{leftIcon}</View>
      ) : null}

      {/* Prefix (e.g. "@") */}
      {prefix ? (
        <View style={styles.prefix}>
          <Animated.Text style={[styles.prefixText, { color: colors.primary }]}>
            {prefix}
          </Animated.Text>
        </View>
      ) : null}

      {/* Text input */}
      <TextInput
        style={[
          styles.input,
          { color: colors.textPrimary },
          (leftIcon || prefix) && styles.inputWithLeft,
          multiline && styles.inputMultiline,
          inputStyle,
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={numberOfLines}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={blurOnSubmit}
      />
    </Animated.View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    height:           56,
    borderRadius:     14,
    borderWidth:      1.5,
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: SPACING.md,
    shadowOffset:     { width: 0, height: 0 },
  },
  wrapperMultiline: {
    height:        undefined,
    minHeight:     56,
    alignItems:    'flex-start',
    paddingVertical: SPACING.sm,
  },
  leftIcon: {
    marginRight: SPACING.sm,
  },
  prefix: {
    marginRight: SPACING.xs,
  },
  prefixText: {
    fontSize:   15,
    fontWeight: '600',
  },
  input: {
    flex:           1,
    fontSize:       15,
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight:        80,
    textAlignVertical: 'top',
    paddingVertical:   0,
  },
  inputWithLeft: {
    paddingLeft: 0,
  },
});