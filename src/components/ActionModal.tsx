import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants/spacing';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';

export type ActionOption = {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  onPress: () => void;
};

interface ActionModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: ActionOption[];
}

export function ActionModal({ visible, onClose, title, options }: ActionModalProps) {
  const { themeObject: T, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          entering={FadeInDown.springify().damping(20).stiffness(200)}
          style={[
            styles.sheet,
            { backgroundColor: isDark ? 'rgba(30, 26, 48, 1)' : '#FFFFFF' },
          ]}
        >
          <BlurView 
            intensity={isDark ? 50 : 0} 
            tint={isDark ? "dark" : "light"} 
            style={[StyleSheet.absoluteFill, { borderRadius: 32, overflow: 'hidden' }]} 
          />
          <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%', paddingBottom: insets.bottom + SPACING.lg }}>
            <View style={[styles.handleBar, { backgroundColor: T.border }]} />
            
            {title && (
              <Text style={[styles.title, { color: T.textPrimary }]}>{title}</Text>
            )}

            <View style={styles.optionsWrap}>
              {options.map((opt, i) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.optionBtn,
                    i !== options.length - 1 && { borderBottomWidth: 1, borderBottomColor: T.border }
                  ]}
                  onPress={opt.onPress}
                >
                  <View style={[styles.iconBox, { backgroundColor: opt.danger ? T.error + '10' : T.primary + '10' }]}>
                    {opt.icon && (
                      <Ionicons
                        name={opt.icon}
                        size={20}
                        color={opt.danger ? T.error : T.primary}
                      />
                    )}
                  </View>
                  <Text style={[styles.optionLabel, { color: opt.danger ? T.error : T.textPrimary }]}>
                    {opt.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={T.textTertiary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: T.textPrimary }]}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
    opacity: 0.3,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  optionsWrap: {
    marginBottom: SPACING.md,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  optionLabel: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  cancelBtn: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
  },
});
