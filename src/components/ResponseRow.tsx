/**
 * ResponseRow — Single row in "Who's in" list: avatar, name, response type badge.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { ResponseData } from '../types/signal';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/spacing';

type Props = {
  response: ResponseData;
  index: number;
};

export function ResponseRow({ response, index }: Props) {
  const isIn = response.type === 'in';

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 60)}
      style={styles.row}
    >
      <View style={[styles.avatar, { backgroundColor: response.user.avatarColor }]}>
        <Text style={styles.initials}>{response.user.initials}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={styles.name}>{response.user.name}</Text>
        <Text style={styles.username}>@{response.user.username}</Text>
      </View>
      <View style={styles.right}>
        <View
          style={[
            styles.badge,
            isIn
              ? { backgroundColor: `${COLORS.SUCCESS}26`, borderColor: COLORS.SUCCESS }
              : { backgroundColor: `${COLORS.WARNING}26`, borderColor: COLORS.WARNING },
          ]}
        >
          {isIn ? (
            <Ionicons name="checkmark" size={12} color={COLORS.SUCCESS} style={styles.badgeIcon} />
          ) : (
            <Ionicons name="eye-outline" size={12} color={COLORS.WARNING} style={styles.badgeIcon} />
          )}
          <Text style={[styles.badgeText, { color: isIn ? COLORS.SUCCESS : COLORS.WARNING }]}>
            {isIn ? 'In' : 'Maybe'}
          </Text>
        </View>
        <Text style={styles.timeAgo}>{response.timeAgo}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  initials: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  middle: {
    flex: 1,
  },
  name: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  username: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  timeAgo: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 10,
    marginTop: 4,
  },
});
