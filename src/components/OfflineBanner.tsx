import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';

export function OfflineBanner() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  if (isConnected !== false) return null;

  return (
    <Animated.View 
      entering={FadeInUp.springify().damping(20)} 
      exiting={FadeOutUp}
      style={[
        styles.container, 
        { top: insets.top > 0 ? insets.top + 10 : 20, backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)' }
      ]}
    >
      <BlurView intensity={isDark ? 20 : 40} style={StyleSheet.absoluteFill} tint={isDark ? "dark" : "light"} />
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={16} color={colors.error} />
        <Text style={[styles.text, { color: colors.error }]}>
          {t('common.offline', 'No Internet Connection')}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  content: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  }
});
