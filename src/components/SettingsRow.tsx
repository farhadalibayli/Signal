/**
 * SettingsRow — Reusable settings row with icon, label, value/toggle/arrow. Theme-aware.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolateColor } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants/spacing';
import * as Haptics from 'expo-haptics';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  subvalue?: string;
  onPress?: () => void;
  type: 'arrow' | 'toggle' | 'value';
  toggleValue?: boolean;
  onToggleValueChange?: (v: boolean) => void;
  isFirst?: boolean;
  isLast?: boolean;
  iconColor?: string;
  labelColor?: string;
};

// ─── Custom Switch ────────────────────────────────────────────────────────────
function CustomSwitch({ value, onValueChange, colors }: { value: boolean; onValueChange: (v: boolean) => void; colors: any }) {
  const sv = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    sv.value = withSpring(value ? 1 : 0, { damping: 20, stiffness: 200 });
  }, [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sv.value, [0, 1], [colors.border, colors.primary]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sv.value * 20 }],
  }));

  return (
    <Pressable 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onValueChange(!value);
      }}
    >
      <Animated.View style={[styles.switchTrack, trackStyle]}>
        <Animated.View style={[styles.switchThumb, thumbStyle, { backgroundColor: '#FFF' }]} />
      </Animated.View>
    </Pressable>
  );
}

export function SettingsRow({
  icon,
  label,
  value,
  subvalue,
  onPress = () => {},
  type,
  toggleValue = false,
  onToggleValueChange = () => {},
  isFirst = true,
  isLast = true,
  iconColor,
  labelColor,
}: Props) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);
  const flash = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: colors.surface,
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (type !== 'toggle') {
      scale.value = withTiming(0.98, { duration: 100 });
      flash.value = withTiming(1, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
    flash.value = withTiming(0, { duration: 200 });
  };

  const primary = iconColor ?? colors.primary;
  const labelClr = labelColor ?? colors.textPrimary;

  const bStyles = {
    borderTopLeftRadius: isFirst ? 24 : 0,
    borderTopRightRadius: isFirst ? 24 : 0,
    borderBottomLeftRadius: isLast ? 24 : 0,
    borderBottomRightRadius: isLast ? 24 : 0,
    marginTop: isFirst ? 0 : 0,
    borderBottomWidth: isLast ? 0 : 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  };

  return (
    <Animated.View style={[styles.outer, containerStyle, bStyles]}>
      <Pressable
        onPress={type === 'toggle' ? () => onToggleValueChange(!toggleValue) : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.row, { paddingVertical: subvalue ? 16 : 14 }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: primary + '15' }]}>
          <Ionicons name={icon} size={20} color={primary} />
        </View>
        <View style={styles.middle}>
          <Text style={[styles.label, { color: labelClr }]}>{label}</Text>
          {subvalue ? (
            <Text style={[styles.subvalue, { color: colors.textSecondary }]}>{subvalue}</Text>
          ) : (type === 'value' || type === 'arrow') && value !== undefined ? (
            <Text style={[styles.valueText, { color: colors.textSecondary }]}>{value}</Text>
          ) : null}
        </View>
        
        {type === 'toggle' ? (
          <CustomSwitch value={toggleValue} onValueChange={onToggleValueChange} colors={colors} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  middle: { flex: 1, marginLeft: 16 },
  label: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  valueText: { fontSize: 13, marginTop: 2, fontFamily: 'Inter_500Medium' },
  subvalue: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_500Medium', letterSpacing: -0.1 },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
});
