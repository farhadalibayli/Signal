/**
 * ActivityItem — Past signal card with type badge, text, responses, time.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { ActivityData } from '../types/signal';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants/spacing';
import { translateTimeAgo, formatRelativeTime } from '../utils/dateUtils';

const AVATAR_COLORS = ['#6C47FF', '#7C3AED', '#5B21B6'];

type Props = {
  activity: ActivityData;
  index: number;
  onPress: () => void;
};

export function ActivityItem({ activity, index, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const responseCount = activity.responses;
  const showAvatars = responseCount > 0;

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 70)}>
      <Pressable
        onPress={() => {
          scale.value = withSpring(0.98, { damping: 15 }, () => {
            scale.value = withSpring(1);
          });
          onPress();
        }}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Animated.View style={animatedStyle}>
          <View style={styles.topRow}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: `${activity.typeColor}1F`,
                  borderColor: activity.typeColor,
                },
              ]}
            >
              <Text style={[styles.typeBadgeText, { color: activity.typeColor }]}>
                {t(`home.filters.${activity.signalType.toLowerCase()}`, { defaultValue: activity.signalType })}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Ionicons 
                name={activity.status === 'active' ? "flash" : "time-outline"} 
                size={12} 
                color={activity.status === 'active' ? colors.primary : colors.border} 
              />
              <Text 
                style={[
                  styles.statusText, 
                  { color: activity.status === 'active' ? colors.primary : colors.border }
                ]}
              >
                {activity.status === 'active' ? t('signalDetail.activeNow').toUpperCase() : t('components.expired').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.signalText, { color: colors.textPrimary }]} numberOfLines={1}>{activity.text}</Text>
          <View style={styles.bottomRow}>
            <View style={styles.responseRow}>
              {showAvatars && (
                <View style={styles.avatarStack}>
                  {[0, 1, 2].slice(0, Math.min(3, responseCount)).map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.miniAvatar,
                        { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length], marginLeft: i === 0 ? 0 : -6 },
                      ]}
                    />
                  ))}
                </View>
              )}
              <Text
                style={[
                  styles.responseText,
                  showAvatars ? { color: colors.success } : { color: colors.border },
                ]}
              >
                {responseCount > 0 ? t('components.responded', { count: responseCount }) : t('components.noResponses')}
              </Text>
            </View>
            <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>{formatRelativeTime(activity.timeAgo, t)}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  signalText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  responseText: {
    fontSize: 12,
  },
  timeAgo: {
    fontSize: 11,
  },
});
