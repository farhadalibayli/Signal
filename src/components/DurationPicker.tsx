/**
 * DurationPicker — pill row + expandable custom time picker.
 * Fully theme-aware: readable on both light and dark backgrounds.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withSequence,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LIGHT, DARK, Theme } from '../constants/theme';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const OPTIONS = [
  { value: 30, icon: 'time-outline' },
  { value: 60, icon: 'timer-outline' },
  { value: 120, icon: 'hourglass-outline' },
  { value: -1, icon: 'options-outline' },
] as const;

const MIN = 15, MAX = 360, STEP = 15;

type Props = {
  selectedMinutes: number;
  onSelect: (v: number) => void;
  customMinutes: number;
  onCustomChange: (v: number) => void;
};

export function DurationPicker({
  selectedMinutes, onSelect, customMinutes, onCustomChange,
}: Props) {
  const { themeObject: T } = useAppTheme();
  const { t } = useTranslation();

  const isCustom = selectedMinutes === -1;
  const displayMins = isCustom ? customMinutes : selectedMinutes;

  const minAbbr = t('common.minuteAbbr', { defaultValue: 'm' });
  const hrAbbr = t('common.hourAbbr', { defaultValue: 'h' });

  const formatTime = (m: number): string => {
    if (m === -1) return t('compose.custom');
    if (m < 60) return `${m} ${minAbbr}`;
    const h = Math.floor(m / 60), r = m % 60;
    return r > 0 ? `${h} ${hrAbbr} ${r} ${minAbbr}` : `${h} ${hrAbbr}`;
  };

  return (
    <View style={styles.wrap}>
      {/* Pill row */}
      <View style={styles.pillRow}>
        {OPTIONS.map((opt) => {
          const sel = opt.value === -1 ? isCustom : selectedMinutes === opt.value;
          return (
            <Pill
              key={opt.value}
              label={formatTime(opt.value)}
              icon={opt.icon}
              selected={sel}
              onPress={() => onSelect(opt.value)}
              T={T}
            />
          );
        })}
      </View>

      {/* Custom Scroller */}
      {isCustom && (
        <Animated.View
          entering={FadeInDown.duration(400).springify().damping(20)}
          style={[
            styles.customCompact,
            {
              backgroundColor: T.mode === 'light' ? `${T.primary}08` : 'rgba(255,255,255,0.03)',
              borderColor: T.mode === 'light' ? `${T.primary}25` : 'rgba(255,255,255,0.08)',
            },
          ]}
        >
          <View style={styles.compactHeader}>
            <Text style={[styles.compactTitle, { color: T.textTertiary }]}>{t('compose.customDuration')}</Text>
            <View style={[styles.compactDisplay, { backgroundColor: T.primary }]}>
               <Text style={styles.compactTimeTxt}>{formatTime(displayMins).toUpperCase()}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rulerScroll}
            snapToInterval={20}
            decelerationRate="fast"
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              // Each mark is 20px wide and represents 5 minutes.
              const snapped = Math.round(x / 20) * 5 + MIN;
              const constrained = Math.max(MIN, Math.min(MAX, snapped));
              if (constrained !== displayMins) onCustomChange(constrained);
            }}
            scrollEventThrottle={16}
          >
            {Array.from({ length: (MAX - MIN) / 5 + 1 }).map((_, i) => {
              const val = MIN + i * 5;
              const isMajor = val % 30 === 0;
              return (
                <View key={i} style={styles.rulerMarkWrap}>
                   <View style={[
                     styles.rulerMark,
                     {
                       height: isMajor ? 24 : 12,
                       backgroundColor: isMajor ? T.primary : T.border,
                       width: isMajor ? 2 : 1.5,
                     }
                   ]} />
                   {isMajor && <Text style={[styles.rulerVal, { color: T.textTertiary }]}>{val}</Text>}
                </View>
              );
            })}
          </ScrollView>
          <View style={[styles.indicator, { backgroundColor: T.primary }]} pointerEvents="none" />
        </Animated.View>
      )}
    </View>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────
function Pill({ label, icon, selected, onPress, T }: {
  label: string; icon: string; selected: boolean; onPress: () => void; T: Theme;
}) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withSpring(selected ? 1.04 : 1, { damping: 14, stiffness: 280 });
    glow.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected]);

  const wrapAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value * (T.mode === 'light' ? 0.18 : 0.4),
    shadowRadius: glow.value * 10,
  }));

  // Unselected style differs by mode
  const unselBg = T.mode === 'light' ? '#FFFFFF' : 'rgba(255,255,255,0.06)';
  const unselBorder = T.mode === 'light' ? T.border : 'rgba(255,255,255,0.1)';
  const unselColor = T.mode === 'light' ? T.textSecondary : 'rgba(255,255,255,0.5)';

  return (
    <Animated.View style={[styles.pillOuter, { shadowColor: T.primary }, wrapAnim]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.95, { damping: 12 }); }}
        onPressOut={() => { scale.value = withSpring(selected ? 1.04 : 1, { damping: 14 }); }}
      >
        {selected ? (
          <LinearGradient
            colors={[T.primary, T.accent]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.pill}
          >
            <Ionicons name={icon as any} size={13} color="#fff" />
            <Text style={[styles.pillTxt, { color: '#fff' }]}>{label}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.pill, { backgroundColor: unselBg, borderWidth: 1.5, borderColor: unselBorder }]}>
            <Ionicons name={icon as any} size={13} color={unselColor} />
            <Text style={[styles.pillTxt, { color: unselColor }]}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  wrap: { width: '100%' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  pillOuter: { shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  pill: {
    height: 42, paddingHorizontal: 16, borderRadius: 21,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  pillTxt: { fontSize: 13, fontWeight: '700' },

  // Custom compact card
  customCompact: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  compactDisplay: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compactTimeTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
  
  // Ruler
  rulerScroll: {
    paddingHorizontal: '48%', // Center the first mark
    height: 60,
    alignItems: 'flex-end',
  },
  rulerMarkWrap: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rulerMark: {
    borderRadius: 1,
  },
  rulerVal: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
  indicator: {
    position: 'absolute',
    bottom: 25,
    width: 4,
    height: 35,
    borderRadius: 2,
    alignSelf: 'center',
  },
});