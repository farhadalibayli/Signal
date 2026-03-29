/**
 * ChatMessage — Single message bubble (left for others, right for own).
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import type { ChatMessageData } from '../types/signal';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUBBLE_MAX_WIDTH = SCREEN_WIDTH * 0.75;

type Props = {
  message: ChatMessageData;
  index: number;
  showAvatar: boolean;
};

export function ChatMessage({ message, index, showAvatar }: Props) {
  const isOwn = message.isOwn;

  if (isOwn) {
    return (
      <Animated.View
        entering={FadeInRight.duration(300).delay(index * 80)}
        style={styles.ownWrap}
      >
        <View style={styles.ownBubble}>
          <Text style={styles.text}>{message.text}</Text>
        </View>
        <Text style={[styles.timeAgo, styles.ownTimeAgo]}>{message.timeAgo}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInLeft.duration(300).delay(index * 80)}
      style={styles.otherWrap}
    >
      {showAvatar ? (
        <View style={[styles.avatar, { backgroundColor: message.user.avatarColor }]}>
          <Text style={styles.avatarInitials}>{message.user.initials}</Text>
        </View>
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
      <View style={styles.otherContent}>
        <View
          style={[
            styles.otherBubble,
            showAvatar ? styles.otherBubbleWithAvatar : styles.otherBubbleNoAvatar,
          ]}
        >
          <Text style={styles.text}>{message.text}</Text>
        </View>
        <Text style={styles.timeAgo}>{message.timeAgo}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ownWrap: {
    alignSelf: 'flex-end',
    maxWidth: BUBBLE_MAX_WIDTH,
    marginBottom: SPACING.sm,
  },
  ownBubble: {
    backgroundColor: `${COLORS.PRIMARY}33`,
    borderWidth: 1,
    borderColor: `${COLORS.PRIMARY}66`,
    borderTopRightRadius: 0,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  text: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 14,
    lineHeight: 20,
  },
  timeAgo: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 10,
    marginTop: 4,
  },
  ownTimeAgo: {
    textAlign: 'right',
  },
  otherWrap: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarInitials: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  avatarPlaceholder: {
    width: 32,
    marginRight: SPACING.sm,
  },
  otherContent: {
    flex: 1,
    maxWidth: BUBBLE_MAX_WIDTH,
  },
  otherBubble: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  otherBubbleWithAvatar: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  otherBubbleNoAvatar: {
    borderRadius: 14,
  },
});
