/**
 * AlertItem — Single notification row with avatar, type icon, title, preview, actions.
 * Memoized for FlatList; supports tap (mark read + navigate), long-press menu, swipe to delete.
 */
import React, { memo, useState } from 'react';
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
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { AlertData } from '../types/signal';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/spacing';
import { useTranslation } from 'react-i18next';
import { translateTimeAgo } from '../utils/dateUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  alert: AlertData;
  index: number;
  onPress: (alert: AlertData) => void;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAcceptRequest?: (id: string) => void;
  onDeclineRequest?: (id: string) => void;
};

function getTitle(alert: AlertData, t: any): { namePart: string; rest: string } {
  const name = alert.user?.name ?? '';
  switch (alert.type) {
    case 'new_signal':
      return { namePart: name, rest: t('alerts.body.sentSignal') };
    case 'responded_in':
      return { namePart: name, rest: t('alerts.body.isIn') };
    case 'responded_maybe':
      return { namePart: name, rest: t('alerts.body.saidMaybe') };
    case 'chat_message':
      return { namePart: name, rest: t('alerts.body.inChat') };
    case 'connection_request':
      return { namePart: name, rest: t('alerts.body.wantsConnect') };
    case 'new_connection':
      return { namePart: name, rest: t('alerts.body.joinedCircle') };
    case 'signal_expiring':
      return { namePart: '', rest: t('alerts.body.expiring') };
    case 'signal_expired':
      return { namePart: '', rest: t('alerts.body.expired') };
    default:
      return { namePart: name, rest: '' };
  }
}

function TypeIcon({ alert }: { alert: AlertData }) {
  const size = 18;
  const color = COLORS.TEXT_PRIMARY;
  switch (alert.type) {
    case 'new_signal':
      return <Ionicons name="flash" size={size} color={color} />;
    case 'responded_in':
      return <Ionicons name="checkmark" size={size} color={color} />;
    case 'responded_maybe':
      return <Ionicons name="eye" size={size} color={color} />;
    case 'chat_message':
      return <Ionicons name="chatbubble" size={size} color={color} />;
    case 'connection_request':
      return <Ionicons name="person-add" size={size} color={color} />;
    case 'new_connection':
      return <Ionicons name="people" size={size} color={color} />;
    default:
      return null;
  }
}

function typeBadgeBg(alert: AlertData): string {
  switch (alert.type) {
    case 'new_signal':
      return alert.signalTypeColor ?? COLORS.PRIMARY;
    case 'responded_in':
      return COLORS.SUCCESS;
    case 'responded_maybe':
      return COLORS.WARNING;
    case 'chat_message':
      return COLORS.PRIMARY;
    case 'connection_request':
      return COLORS.TEXT_SECONDARY;
    case 'new_connection':
      return COLORS.SUCCESS;
    default:
      return COLORS.BORDER;
  }
}

function renderRightActions(onDelete: () => void, t: any) {
  return (
    <View style={styles.rightAction}>
      <Pressable onPress={onDelete} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>{t('components.delNotif')}</Text>
      </Pressable>
    </View>
  );
}

const AlertItemInner = memo(function AlertItemInner({
  alert,
  index,
  onPress,
  onRead,
  onDelete,
  onAcceptRequest,
  onDeclineRequest,
}: Props) {
  const { t } = useTranslation();
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [removing, setRemoving] = useState(false);
  const accentWidth = useSharedValue(alert.isRead ? 0 : 3);
  const unreadOpacity = useSharedValue(alert.isRead ? 0 : 1);
  const bgTint = useSharedValue(alert.isRead ? 0 : 1);
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    if (alert.isRead) {
      accentWidth.value = withTiming(0, { duration: 300 });
      unreadOpacity.value = withTiming(0, { duration: 300 });
      bgTint.value = withTiming(0, { duration: 300 });
    }
  }, [alert.isRead]);

  const { namePart, rest } = getTitle(alert, t);
  const isConnectionRequest = alert.type === 'connection_request';

  const markRead = () => {
    if (alert.isRead) return;
    accentWidth.value = withTiming(0, { duration: 300 });
    unreadOpacity.value = withTiming(0, { duration: 300 });
    bgTint.value = withTiming(0, { duration: 300 });
    onRead(alert.id);
  };

  const handlePress = () => {
    if (isConnectionRequest) return; // use Accept/Decline instead
    markRead();
    onPress(alert);
  };

  const handleDelete = () => {
    setContextMenuVisible(false);
    setRemoving(true);
    translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 }, (finished) => {
      if (finished) runOnJS(onDelete)(alert.id);
    });
  };

  const handleAccept = () => {
    onAcceptRequest?.(alert.id);
  };

  const handleDecline = () => {
    setRemoving(true);
    translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 }, (finished) => {
      if (finished) runOnJS(onDeclineRequest)(alert.id);
    });
  };

  const accentStyle = useAnimatedStyle(() => ({
    width: accentWidth.value,
  }));

  const unreadDotStyle = useAnimatedStyle(() => ({
    opacity: unreadOpacity.value,
  }));

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: bgTint.value === 1 ? 'rgba(108,71,255,0.06)' : 'transparent',
    transform: [{ translateX: translateX.value }],
  }));

  const content = (
    <Animated.View style={[styles.row, rowStyle]}>
      <Animated.View style={[styles.accentBar, accentStyle]} />
      <View style={styles.avatarSection}>
        {alert.user ? (
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: alert.user.avatarColor }]}>
              <Text style={styles.avatarText}>{alert.user.initials}</Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: typeBadgeBg(alert) }]}>
              <TypeIcon alert={alert} />
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.systemIconWrap,
              alert.type === 'signal_expiring'
                ? { backgroundColor: `${COLORS.WARNING}33`, borderColor: COLORS.WARNING }
                : { backgroundColor: `${COLORS.ERROR}33`, borderColor: COLORS.ERROR },
            ]}
          >
            <Ionicons
              name={alert.type === 'signal_expiring' ? 'time' : 'close'}
              size={24}
              color={alert.type === 'signal_expiring' ? COLORS.WARNING : COLORS.ERROR}
            />
          </View>
        )}
      </View>
      <Pressable
        onPress={handlePress}
        onLongPress={() => setContextMenuVisible(true)}
        style={styles.middle}
        delayLongPress={400}
      >
        <Text style={[styles.title, alert.isRead && styles.titleRead]}>
          {namePart ? <Text style={styles.titleName}>{namePart}</Text> : null}
          <Text style={styles.titleRest}>{rest}</Text>
        </Text>
        <View style={styles.previewRow}>
          {alert.type === 'new_signal' && alert.signalType && (
            <View style={[styles.signalPill, { backgroundColor: `${alert.signalTypeColor}26`, borderColor: alert.signalTypeColor }]}>
              <Text style={[styles.signalPillText, { color: alert.signalTypeColor }]}>{alert.signalType}</Text>
            </View>
          )}
          <Text style={[styles.preview, alert.isRead && styles.previewRead]} numberOfLines={1}>
            {alert.preview}
          </Text>
        </View>
        <Text style={[styles.timeAgo, alert.isRead && styles.timeAgoRead]}>{translateTimeAgo(alert.timeAgo, t)}</Text>
      </Pressable>
      <View style={styles.right}>
        {isConnectionRequest ? (
          <View style={styles.requestActions}>
            <Pressable onPress={handleAccept} style={styles.acceptCircle}>
              <Ionicons name="checkmark" size={18} color={COLORS.TEXT_PRIMARY} />
            </Pressable>
            <Pressable onPress={handleDecline} style={styles.declineCircle}>
              <Ionicons name="close" size={18} color={COLORS.TEXT_PRIMARY} />
            </Pressable>
          </View>
        ) : (
          <Animated.View style={[styles.unreadDot, unreadDotStyle]} />
        )}
      </View>
    </Animated.View>
  );

  return (
    <>
      <Animated.View
        entering={FadeInDown.duration(300).delay(index * 50)}
        exiting={FadeOut.duration(200)}
      >
        <Swipeable
          renderRightActions={() => renderRightActions(handleDelete, t)}
          rightThreshold={40}
          friction={2}
        >
          {content}
        </Swipeable>
      </Animated.View>

      <Modal visible={contextMenuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setContextMenuVisible(false)}
        >
          <View style={styles.contextSheet}>
            {!alert.isRead && (
              <Pressable
                onPress={() => { markRead(); setContextMenuVisible(false); }}
                style={styles.contextOption}
              >
                <Text style={styles.contextOptionText}>{t('components.markRead')}</Text>
              </Pressable>
            )}
            {alert.isRead && (
              <Pressable onPress={() => setContextMenuVisible(false)} style={styles.contextOption}>
                <Text style={styles.contextOptionText}>{t('components.markUnread')}</Text>
              </Pressable>
            )}
            <Pressable onPress={handleDelete} style={styles.contextOption}>
              <Text style={styles.contextOptionDanger}>{t('components.delNotif')}</Text>
            </Pressable>
            <Pressable onPress={() => setContextMenuVisible(false)} style={styles.contextCancel}>
              <Text style={styles.contextCancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

export const AlertItem = AlertItemInner;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: SPACING.sm,
    paddingLeft: 0,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.PRIMARY,
  },
  avatarSection: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  systemIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  middle: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: COLORS.TEXT_PRIMARY,
  },
  titleRead: {
    color: COLORS.TEXT_SECONDARY,
  },
  titleName: {
    color: COLORS.TEXT_PRIMARY,
  },
  titleRest: {
    color: COLORS.TEXT_PRIMARY,
    opacity: 0.9,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  signalPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  signalPillText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  preview: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.TEXT_SECONDARY,
  },
  previewRead: {
    color: COLORS.BORDER,
  },
  timeAgo: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  timeAgoRead: {
    color: COLORS.BORDER,
  },
  right: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.SUCCESS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.ERROR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightAction: {
    width: 80,
    backgroundColor: COLORS.ERROR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    paddingHorizontal: SPACING.sm,
  },
  deleteText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  contextSheet: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SPACING.md,
    paddingBottom: 40,
  },
  contextOption: {
    paddingVertical: SPACING.md,
  },
  contextOptionText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
  },
  contextOptionDanger: {
    color: COLORS.ERROR,
    fontSize: 16,
  },
  contextCancel: {
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  contextCancelText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 16,
  },
});
