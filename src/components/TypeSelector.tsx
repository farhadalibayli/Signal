/**
 * TypeSelector — horizontal scroll of signal type cards.
 * Fully theme-aware: works on both light and dark backgrounds.
 * Uses FlatList (not ScrollView) for reliable rendering on Android.
 * Must be rendered as a direct child of the page ScrollView —
 * never nested inside a borderRadius parent.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COMPOSE_TYPES } from '../data/composeTypes';
import type { ComposeTypeOption } from '../data/composeTypes';
import { LIGHT, DARK, Theme } from '../constants/theme';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const CARD_W = 92;
const CARD_H = 96;
const GAP = 10;

type Props = {
  selectedValue: string | null;
  onSelect: (value: string) => void;
  errorVisible: boolean;
};

export function TypeSelector({ selectedValue, onSelect, errorVisible }: Props) {
  const { themeObject: T } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View>
      {errorVisible && (
        <Text style={[styles.errorText, { color: T.error }]}>
          {t('compose.pickATypeToContinue')}
        </Text>
      )}
      <FlatList
        data={COMPOSE_TYPES}
        keyExtractor={(item) => item.value}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        renderItem={({ item, index }) => (
          <TypeCard
            option={item}
            index={index}
            isSelected={selectedValue === item.value}
            onPress={() => onSelect(item.value)}
            T={T}
          />
        )}
      />
    </View>
  );
}

function TypeCard({ option, index, isSelected, onPress, T }: {
  option: ComposeTypeOption;
  index: number;
  isSelected: boolean;
  onPress: () => void;
  T: Theme;
}) {
  const scale = useSharedValue(1);
  const lit = useSharedValue(0);
  const { t } = useTranslation();

  React.useEffect(() => {
    scale.value = withSpring(isSelected ? 1.06 : 1, { damping: 14, stiffness: 260 });
    lit.value = withTiming(isSelected ? 1 : 0, { duration: 220 });
  }, [isSelected]);

  const wrapAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: lit.value * (T.mode === 'light' ? 0.2 : 0.5),
    shadowRadius: lit.value * 14,
  }));

  // Light mode: unselected = white card with visible border
  // Dark mode:  unselected = semi-transparent white tint
  const unselBg = T.mode === 'light' ? '#FFFFFF' : 'rgba(255,255,255,0.05)';
  const unselBorder = T.mode === 'light' ? T.border : 'rgba(255,255,255,0.1)';
  const unselIcon = T.mode === 'light' ? T.textTertiary : 'rgba(255,255,255,0.4)';
  const unselLabel = T.mode === 'light' ? T.textTertiary : 'rgba(255,255,255,0.45)';

  return (
    <Animated.View
      entering={FadeIn.delay(index * 35).duration(280)}
    >
      <Animated.View
        style={[
          styles.cardOuter,
          { shadowColor: isSelected ? option.color : T.shadowColor },
          wrapAnim,
        ]}
      >
        <Pressable
          onPress={onPress}
          onPressIn={() => { scale.value = withSpring(0.93, { damping: 12 }); }}
          onPressOut={() => { scale.value = withSpring(isSelected ? 1.06 : 1, { damping: 14 }); }}
          style={styles.pressable}
        >
          <View style={[
            styles.card,
            isSelected
              ? {
                backgroundColor: `${option.color}18`,
                borderColor: option.color,
                borderWidth: 2,
              }
              : {
                backgroundColor: unselBg,
                borderColor: unselBorder,
                borderWidth: 1.5,
              },
          ]}>
            {/* Selected gradient fill */}
            {isSelected && (
              <LinearGradient
                colors={[`${option.color}35`, `${option.color}0A`]}
                start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                pointerEvents="none"
              />
            )}

            {/* Top colour bar */}
            <View
              style={[
                styles.topBar,
                {
                  backgroundColor: isSelected ? option.color : 'transparent',
                  opacity: isSelected ? 1 : 0,
                },
              ]}
              pointerEvents="none"
            />

            {/* Icon */}
            <View style={[
              styles.iconPill,
              {
                backgroundColor: isSelected
                  ? `${option.color}28`
                  : T.mode === 'light' ? '#EDE8FF' : 'rgba(255,255,255,0.08)',
              },
            ]}>
              <Ionicons
                name={option.icon as any}
                size={24}
                color={isSelected ? option.color : unselIcon}
              />
            </View>

            {/* Label */}
            <Text
              numberOfLines={1}
              style={[
                styles.cardLabel,
                { color: isSelected ? option.color : unselLabel },
              ]}
            >
              {t(`home.filters.${option.value.toLowerCase()}`, { defaultValue: option.label })}
            </Text>

            {/* Selected indicator dot */}
            {isSelected && (
              <Animated.View
                entering={FadeIn.duration(150)}
                style={[styles.selDot, { backgroundColor: option.color }]}
              />
            )}
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingVertical: 10 },
  errorText: { fontSize: 12, fontWeight: '700', paddingHorizontal: 16, marginBottom: 4 },

  cardOuter: {
    width: CARD_W, height: CARD_H,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  pressable: { width: '100%', height: '100%' },
  card: {
    width: '100%', height: '100%',
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    gap: 7, overflow: 'hidden',
  },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  iconPill: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },
  selDot: { position: 'absolute', bottom: 8, width: 5, height: 5, borderRadius: 3 },
});