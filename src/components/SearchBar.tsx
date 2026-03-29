/**
 * SearchBar — Reusable search input with icon, placeholder, clear button.
 * Used in CircleScreen and AddConnectionModal.
 */
import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/spacing';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Optional container style (e.g. for border when focused). */
  containerStyle?: object;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  autoFocus,
  onFocus,
  onBlur,
  containerStyle,
}: Props) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Ionicons name="search" size={18} color={COLORS.TEXT_SECONDARY} style={styles.searchIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.TEXT_SECONDARY}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} style={styles.clearBtn} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={COLORS.TEXT_SECONDARY} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
});
