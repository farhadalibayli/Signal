/**
 * LanguageModal — Bottom sheet to choose app language. Theme-aware.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants/spacing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type LanguageOption = {
  id: string;
  name: string;
  nativeName: string;
  flag: React.ReactNode;
};

const LANGUAGES: LanguageOption[] = [
  {
    id: 'az',
    name: 'Azerbaijani',
    nativeName: 'Azərbaycan dili',
    flag: <FlagAZ />,
  },
  {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    flag: <FlagEN />,
  },
  {
    id: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: <FlagRU />,
  },
];

function FlagAZ() {
  return (
    <View style={flagStyles.container}>
      <View style={[flagStyles.stripe, { backgroundColor: '#0092bc' }]} />
      <View style={[flagStyles.stripe, { backgroundColor: '#e4002b' }]} />
      <View style={[flagStyles.stripe, { backgroundColor: '#00af4d' }]} />
      <View style={flagStyles.centerIcon}>
         <View style={flagStyles.azMoon} />
      </View>
    </View>
  );
}

function FlagEN() {
  return (
    <View style={flagStyles.container}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#00247D' }]} />
      {/* Symmetrical white diagonals */}
      <View style={[flagStyles.enCross, { backgroundColor: '#FFF', width: 60, height: 6, transform: [{ rotate: '32deg' }], top: 11, left: -8 }]} />
      <View style={[flagStyles.enCross, { backgroundColor: '#FFF', width: 60, height: 6, transform: [{ rotate: '-32deg' }], top: 11, left: -8 }]} />
      
      {/* Red diagonals (Simplified pinwheels) */}
      <View style={[flagStyles.enCross, { backgroundColor: '#CF142B', width: 60, height: 2, transform: [{ rotate: '32deg' }], top: 13, left: -8 }]} />
      <View style={[flagStyles.enCross, { backgroundColor: '#CF142B', width: 60, height: 2, transform: [{ rotate: '-32deg' }], top: 13, left: -8 }]} />

      {/* Broad White Cross */}
      <View style={[flagStyles.enCross, { backgroundColor: '#FFF', width: 44, height: 12, top: 8 }]} />
      <View style={[flagStyles.enCross, { backgroundColor: '#FFF', width: 12, height: 28, left: 16 }]} />
      
      {/* Narrow Red Cross */}
      <View style={[flagStyles.enCross, { backgroundColor: '#CF142B', width: 44, height: 6, top: 11 }]} />
      <View style={[flagStyles.enCross, { backgroundColor: '#CF142B', width: 6, height: 28, left: 19 }]} />
    </View>
  );
}

function FlagRU() {
  return (
    <View style={flagStyles.container}>
      <View style={[flagStyles.stripe, { backgroundColor: '#FFFFFF' }]} />
      <View style={[flagStyles.stripe, { backgroundColor: '#0039A6' }]} />
      <View style={[flagStyles.stripe, { backgroundColor: '#D52B1E' }]} />
    </View>
  );
}

const flagStyles = StyleSheet.create({
  container: { width: 44, height: 28, borderRadius: 4, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.1)' },
  stripe: { flex: 1 },
  centerIcon: { position: 'absolute', top: 9, left: 16, width: 10, height: 10, justifyContent: 'center', alignItems: 'center' },
  azMoon: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  enCross: { position: 'absolute' },
});

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedLanguageId: string;
  onSelect: (languageId: string) => void;
  onLanguageUpdated?: () => void;
};

export function LanguageModal({
  visible,
  onClose,
  selectedLanguageId,
  onSelect,
  onLanguageUpdated,
}: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const handleSelect = async (id: string) => {
    await i18n.changeLanguage(id);
    await AsyncStorage.setItem('app_language', id);
    onSelect(id);
    onLanguageUpdated?.();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + SPACING.md,
              maxHeight: SCREEN_HEIGHT * 0.5,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('settings.language')}</Text>
          {LANGUAGES.map((opt) => {
            const isSelected = selectedLanguageId === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleSelect(opt.id)}
                style={[
                  styles.row,
                  {
                    backgroundColor: isSelected ? colors.primary + '14' : 'transparent',
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.flagWrap}>{opt.flag}</View>
                  <View>
                    <Text style={[styles.langName, { color: colors.textPrimary }]}>{opt.name}</Text>
                    <Text style={[styles.langNative, { color: colors.textSecondary }]}>
                      {opt.nativeName}
                    </Text>
                  </View>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </Pressable>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flagWrap: {},
  langName: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  langNative: { fontSize: 12, marginTop: 2 },
});
