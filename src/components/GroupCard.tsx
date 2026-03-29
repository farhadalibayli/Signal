/**
 * GroupCard — Single inner circle / group card with color, name, members.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { GroupData } from '../types/signal';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/spacing';

const AVATAR_COLORS = ['#6C47FF', '#7C3AED', '#5B21B6', '#4C1D95'];

type Props = {
  group: GroupData;
  index: number;
  onPress: () => void;
  onEditPress?: () => void;
};

export function GroupCard({ group, index, onPress, onEditPress }: Props) {
  const displayMembers = group.members.slice(0, 4);
  const extraCount = group.memberCount > 4 ? group.memberCount - 4 : 0;

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 80)}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.topRow}>
          <View style={styles.left}>
            <View style={[styles.colorCircle, { backgroundColor: group.color }]}>
              <Text style={styles.label}>{group.label}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{group.name}</Text>
              <Text style={styles.memberCount}>{group.memberCount} members</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_SECONDARY} />
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onEditPress?.();
              }}
              style={styles.editBtn}
            >
              <Ionicons name="pencil" size={16} color={COLORS.TEXT_SECONDARY} />
            </Pressable>
          </View>
        </View>
        <View style={styles.avatarStack}>
          {displayMembers.map((initials, i) => (
            <View
              key={String(i)}
              style={[
                styles.miniAvatar,
                { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length], marginLeft: i === 0 ? 0 : -8 },
              ]}
            >
              <Text style={styles.miniAvatarText}>{initials}</Text>
            </View>
          ))}
          {extraCount > 0 && (
            <View style={[styles.miniAvatar, styles.extraAvatar]}>
              <Text style={styles.miniAvatarText}>+{extraCount}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: 10,
  },
  cardPressed: { opacity: 0.9 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  label: { color: COLORS.TEXT_PRIMARY, fontSize: 12, fontFamily: 'Inter_700Bold' },
  info: { flex: 1 },
  name: { color: COLORS.TEXT_PRIMARY, fontSize: 15, fontFamily: 'Inter_700Bold' },
  memberCount: { color: COLORS.TEXT_SECONDARY, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  miniAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraAvatar: { backgroundColor: COLORS.BORDER },
  miniAvatarText: { color: COLORS.TEXT_PRIMARY, fontSize: 10, fontFamily: 'Inter_700Bold' },
});
