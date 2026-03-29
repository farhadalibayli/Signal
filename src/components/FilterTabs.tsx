import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue,
  withTiming, withSpring, FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { SignalType } from '../types/signal';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  types: SignalType[];
  activeType: string;
  onTypeChange: (value: string) => void;
  isDark: boolean;
};

export function FilterTabs({ types, activeType, onTypeChange, isDark }: Props) {
  const { colors } = useTheme();

  return (
    <View style={S.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.scrollContent}
      >
        {types.map((t, i) => (
          <FilterTab
            key={t.value}
            type={t}
            isActive={activeType === t.value}
            onPress={() => onTypeChange(t.value)}
            delay={i * 40}
            colors={colors}
            isDark={isDark}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FilterTab({
  type, isActive, onPress, delay, colors, isDark
}: {
  type: SignalType;
  isActive: boolean;
  onPress: () => void;
  delay: number;
  colors: any;
  isDark: boolean;
}) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const selStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isActive ? 1 : 0),
    transform: [{ scale: withSpring(isActive ? 1 : 0.8) }]
  }));

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay + 200).springify()}
      style={animatedScaleStyle}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={t(`home.filters.${type.value.toLowerCase()}`)}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() => scale.value = withTiming(0.92)}
        onPressOut={() => scale.value = withTiming(1)}
        style={[S.tab, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, selStyle]}>
           <LinearGradient colors={[colors.primary, colors.accent]} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
        </Animated.View>
        
        <Text style={[S.tabText, { 
          color: isActive ? '#fff' : colors.textSecondary,
          fontFamily: isActive ? 'Inter_700Bold' : 'Inter_600SemiBold'
        }]}>
          {t(`home.filters.${type.value.toLowerCase()}`)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const S = StyleSheet.create({
  container: { marginBottom: 10 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  tabText: { fontSize: 13, letterSpacing: -0.2 },
});