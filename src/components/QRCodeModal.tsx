/**
 * QRCodeModal — Full-screen modal: QR/card, share link, scan code.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from './PrimaryButton';
import { OutlineButton } from './OutlineButton';
import { MiniSignalRipples } from './SignalRipples';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/spacing';

type Props = {
  visible: boolean;
  onClose: () => void;
  onShareLink?: () => void;
  onScanCode?: () => void;
  /** Toast callback for "Copied!" / "Camera scanning coming soon" */
  showToast?: (message: string) => void;
};

const CARD_SIZE = 200;

export function QRCodeModal({
  visible,
  onClose,
  onShareLink,
  onScanCode,
  showToast,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleShare = () => {
    showToast?.('Copied!');
    onShareLink?.();
  };

  const handleScan = () => {
    showToast?.('Camera scanning coming soon');
    onScanCode?.();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + SPACING.lg }]}>
        <Pressable onPress={onClose} style={[styles.closeBtn, { top: insets.top + SPACING.sm }]}>
          <Ionicons name="close" size={28} color={COLORS.TEXT_PRIMARY} />
        </Pressable>

        <Text style={styles.title}>{t('components.qrTitle')}</Text>
        <Text style={styles.subtitle}>{t('components.qrSub')}</Text>

        <View style={styles.cardWrap}>
          <View style={styles.rippleBg}>
            <MiniSignalRipples size={120} />
          </View>
          <View style={styles.card}>
            <Text style={styles.initials}>FA</Text>
            <Text style={styles.username}>@farhad</Text>
          </View>
        </View>

        <Text style={styles.displayName}>@farhad</Text>
        <Text style={styles.displaySub}>Signal · Farhad Alibayli</Text>

        <View style={styles.buttons}>
          <PrimaryButton label="Share my link" onPress={handleShare} style={styles.primaryBtn} />
          <OutlineButton label="Scan a code" onPress={handleScan} style={styles.outlineBtn} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  closeBtn: {
    position: 'absolute',
    right: SPACING.md,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginTop: SPACING.xl,
  },
  subtitle: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
    marginTop: SPACING.xs,
  },
  cardWrap: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    marginTop: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rippleBg: {
    position: 'absolute',
    width: CARD_SIZE,
    height: CARD_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 42,
    fontFamily: 'Inter_700Bold',
  },
  username: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 16,
    marginTop: SPACING.xs,
  },
  displayName: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginTop: SPACING.lg,
  },
  displaySub: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 4,
  },
  buttons: {
    width: '100%',
    marginTop: SPACING.xxl,
    gap: SPACING.md,
  },
  primaryBtn: {
    width: '100%',
  },
  outlineBtn: {
    width: '100%',
  },
});
