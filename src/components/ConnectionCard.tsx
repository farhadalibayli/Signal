/**
 * ConnectionCard — Single connection row with avatar, info, menu; optional swipe-to-remove.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  runOnJS, 
  withRepeat 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SuccessToast } from './SuccessToast';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/spacing';
import type { ConnectionData } from '../types/signal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function Pulse({ color, size = 10 }: { color: string; size?: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  React.useEffect(() => {
    scale.value = withRepeat(withTiming(2, { duration: 1500 }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 1500 }), -1, false);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', backgroundColor: color, borderRadius: size }, ringStyle, { width: size, height: size }]} />
      <View style={[{ backgroundColor: color, borderRadius: size / 2 }, { width: size, height: size }]} />
    </View>
  );
}

type Props = {
  connection: ConnectionData;
  index: number;
  onRemove: () => void;
  onAvatarPress?: () => void;
  /** If false, wrap in plain View (no swipe). */
  swipeable?: boolean;
};

function ConnectionCardContent({
  connection,
  onMenuPress,
  onAvatarPress,
  colors,
}: {
  connection: ConnectionData;
  onMenuPress: () => void;
  onAvatarPress?: () => void;
  colors: any;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAvatarPress?.(); }} style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: connection.avatarColor }]}>
          {connection.avatar ? (
            <Animated.Image source={{ uri: connection.avatar }} style={StyleSheet.absoluteFill} />
          ) : (
            <Text style={styles.initials}>{connection.initials}</Text>
          )}
          {connection.isActive && <View style={styles.activeDot}><Pulse color={colors.success} size={8} /></View>}
        </View>
      </Pressable>
      <View style={styles.middle}>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{connection.name}</Text>
        <Text style={[styles.username, { color: colors.primary }]}>@{connection.username}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="flash-outline" size={10} color={colors.textSecondary} />
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{t('signalDetail.lastSignal', 'Last signal')}: {connection.lastSignal}</Text>
        </View>
        <View style={styles.mutualRow}>
          <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.mutualText, { color: colors.textSecondary }]}>{t('findFriends.mutuals', { count: connection.mutualCount })}</Text>
        </View>
      </View>
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onMenuPress(); }} style={[styles.menuBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

function renderRightActions(
  progress: RNAnimated.AnimatedInterpolation<number>,
  dragX: RNAnimated.AnimatedInterpolation<number>,
  onRemove: () => void,
  t: any
) {
  const translateX = dragX.interpolate({
    inputRange: [-80, 0],
    outputRange: [0, 80],
  });
  return (
    <RNAnimated.View style={[styles.rightAction, { transform: [{ translateX }] }]}>
      <Pressable onPress={onRemove} style={styles.removeBtn}>
        <Text style={styles.removeText}>{t('common.remove')}</Text>
      </Pressable>
    </RNAnimated.View>
  );
}

export function ConnectionCard({
  connection,
  index,
  onRemove,
  onAvatarPress,
  swipeable = true,
}: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; title: string; subtitle?: string; icon?: string } | null>(null);
  const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const handleRemovePress = () => {
    setMenuVisible(false);
    setRemoveConfirmVisible(true);
  };

  const handleConfirmRemove = () => {
    setRemoveConfirmVisible(false);
    translateX.value = withTiming(SCREEN_WIDTH, { duration: 300 }, (finished) => {
      if (finished) runOnJS(onRemove)();
    });
    opacity.value = withTiming(0, { duration: 300 });
  };

  const exitStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const content = (
    <ConnectionCardContent
      connection={connection}
      onMenuPress={() => setMenuVisible(true)}
      onAvatarPress={onAvatarPress}
      colors={colors}
    />
  );

  const cardBody = swipeable ? (
    <Swipeable
      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, () => setRemoveConfirmVisible(true), t)}
      rightThreshold={40}
      friction={2}
    >
      {content}
    </Swipeable>
  ) : (
    content
  );

  return (
    <>
      <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
        <Animated.View style={exitStyle}>
          {cardBody}
        </Animated.View>
      </Animated.View>

      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
            <Pressable onPress={() => { setMenuVisible(false); onAvatarPress?.(); }} style={styles.sheetOption}>
              <Text style={[styles.sheetOptionText, { color: colors.textPrimary }]}>{t('components.viewProfile')}</Text>
            </Pressable>
            <Pressable onPress={handleRemovePress} style={styles.sheetOption}>
              <Text style={styles.sheetOptionDanger}>{t('components.removeConn')}</Text>
            </Pressable>
            <Pressable onPress={() => { setMenuVisible(false); setToastConfig({ visible: true, title: t('common.muted'), icon: 'volume-mute' }); }} style={styles.sheetOption}>
              <Text style={[styles.sheetOptionText, { color: colors.textPrimary }]}>{t('components.muteSignals')}</Text>
            </Pressable>
            <Pressable onPress={() => { setMenuVisible(false); setToastConfig({ visible: true, title: t('common.blocked'), icon: 'shield-checkmark' }); }} style={styles.sheetOption}>
              <Text style={styles.sheetOptionDanger}>{t('components.block')}</Text>
            </Pressable>
            <Pressable onPress={() => setMenuVisible(false)} style={styles.sheetCancel}>
              <Text style={[styles.sheetCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={removeConfirmVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRemoveConfirmVisible(false)}
        >
          <View style={[styles.confirmSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>{t('common.remove')} {connection.name}?</Text>
            <Text style={[styles.confirmSub, { color: colors.textSecondary }]}>{t('components.notNotified')}</Text>
            <View style={styles.confirmRow}>
              <Pressable onPress={() => setRemoveConfirmVisible(false)} style={[styles.confirmCancel, { borderColor: colors.border }]}>
                <Text style={[styles.confirmCancelText, { color: colors.textPrimary }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={handleConfirmRemove} style={[styles.confirmRemove, { backgroundColor: colors.error }]}>
                <Text style={styles.confirmRemoveText}>{t('common.remove')}</Text>
              </Pressable>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {toastConfig && (
        <SuccessToast
          visible={toastConfig.visible}
          title={toastConfig.title}
          subtitle={toastConfig.subtitle}
          icon={toastConfig.icon as any}
          onHide={() => setToastConfig(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: 0,
  },
  avatarWrap: {},
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  initials: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    padding: 2,
    borderRadius: 10,
  },
  middle: { flex: 1 },
  name: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  username: { fontSize: 12, marginTop: 2 },
  meta: { fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  mutualRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  mutualText: { fontSize: 11 },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtn: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  removeText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SPACING.md,
    paddingBottom: 40,
  },
  sheetOption: { paddingVertical: SPACING.md },
  sheetOptionText: { fontSize: 16 },
  sheetOptionDanger: { fontSize: 16, color: '#FF4747', fontFamily: 'Inter_600SemiBold' },
  sheetCancel: { paddingVertical: SPACING.md, marginTop: SPACING.sm, alignItems: 'center' },
  sheetCancelText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  handleBar: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12, opacity: 0.5 },
  confirmSheet: {
    marginHorizontal: SPACING.lg,
    borderRadius: 24,
    padding: SPACING.lg,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 340,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width:0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  confirmSub: { fontSize: 14, marginBottom: SPACING.lg, textAlign: 'center', opacity: 0.7, lineHeight: 20 },
  confirmRow: { flexDirection: 'row', gap: SPACING.sm },
  confirmCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmCancelText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  confirmRemove: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmRemoveText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },
});
