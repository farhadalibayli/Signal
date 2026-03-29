import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle, useSharedValue,
  withSpring, withTiming, FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons }       from '@expo/vector-icons';
import { BlurView }       from 'expo-blur';
import { AlertBadge }     from './AlertBadge';
import * as Haptics       from 'expo-haptics';

export type TabId = 'Feed' | 'Circle' | 'Alerts' | 'Me';

type Props = {
  activeTab:   TabId;
  isDark:      boolean;
  onTabPress:  (tab: TabId) => void;
  alertsCount?: number;
};

const PRIMARY = '#6C47FF';

const TABS: { id: TabId; labelKey: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'Feed',   labelKey: 'nav.feed',   icon: 'pulse-outline',         activeIcon: 'pulse'          },
  { id: 'Circle', labelKey: 'nav.circle', icon: 'people-outline',        activeIcon: 'people'         },
  { id: 'Alerts', labelKey: 'nav.alerts', icon: 'notifications-outline', activeIcon: 'notifications'  },
  { id: 'Me',     labelKey: 'nav.me',     icon: 'person-outline',        activeIcon: 'person'         },
];

export function BottomTabBar({ activeTab, isDark, onTabPress, alertsCount = 0 }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const bg = isDark ? 'rgba(13,10,30,0.6)' : 'rgba(255,255,255,0.7)';
  const border = isDark ? 'rgba(108,71,255,0.2)' : 'rgba(108,71,255,0.15)';
  const shadowColor = isDark ? '#000' : '#6C47FF';

  return (
    <View style={[styles.floatingContainer, { bottom: Math.max(insets.bottom, 20) }]}>
      <View style={[
        styles.wrapper, 
        { borderColor: border, backgroundColor: bg, shadowColor }
      ]}>
        {/* Blur background */}
        <BlurView
          intensity={isDark ? 60 : 80}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.row}>
          {TABS.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              isDark={isDark}
              onPress={() => onTabPress(tab.id)}
              alertsCount={tab.id === 'Alerts' ? alertsCount : 0}
              label={t(tab.labelKey)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function TabItem({
  tab, isActive, isDark, onPress, alertsCount, label,
}: {
  tab:         typeof TABS[0];
  isActive:    boolean;
  isDark:      boolean;
  onPress:     () => void;
  alertsCount: number;
  label:       string;
}) {
  const scale      = useSharedValue(isActive ? 1 : 1);
  const pillWidth  = useSharedValue(isActive ? 50 : 0);
  const pillOpac   = useSharedValue(isActive ? 1 : 0);

  React.useEffect(() => {
    scale.value     = withSpring(isActive ? 1.08 : 1, { damping: 14, stiffness: 280 });
    pillWidth.value = withSpring(isActive ? 50 : 0,   { damping: 16, stiffness: 260 });
    pillOpac.value  = withTiming(isActive ? 1 : 0,    { duration: 200 });
  }, [isActive]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const indicatorStyle = useAnimatedStyle(() => ({
    width:   pillWidth.value,
    opacity: pillOpac.value,
  }));

  const iconColor  = isActive ? PRIMARY : isDark ? '#8A85A3' : '#8E8EA8';
  const labelColor = isActive ? PRIMARY : isDark ? '#8A85A3' : '#8E8EA8';

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={styles.tab}
    >
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel={label}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() =>  { scale.value = withSpring(0.9); }}
        onPressOut={() => { scale.value = withSpring(isActive ? 1.08 : 1); }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={styles.iconArea}>
          {/* Icon */}
          <Animated.View style={[styles.iconWrap, iconStyle]}>
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={24}
              color={iconColor}
            />
            {/* Alert badge */}
            {tab.id === 'Alerts' && alertsCount > 0 && (
              <View style={styles.badgeWrap}>
                <AlertBadge count={alertsCount} visible variant="tab" />
              </View>
            )}
          </Animated.View>
        </View>
  
        <Text style={[styles.label, { color: labelColor, fontFamily: isActive ? 'Inter_700Bold' : 'Inter_600SemiBold' }]}>
          {label}
        </Text>
  
        {/* Floating active dot/line under the text */}
        <Animated.View style={[styles.activeIndicator, indicatorStyle]}>
          <LinearGradient
            colors={['#6C47FF', '#9D4EDD']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  wrapper: {
    flexDirection: 'row',
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    paddingHorizontal: 10,
    width: '100%',
    maxWidth: 400,
  },
  row: {
    flex: 1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 4,
    height: '100%',
  },
  iconArea: {
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 3,
    height: 3,
    borderRadius: 3,
    overflow: 'hidden',
  },
  iconWrap: {
    alignItems:     'center',
    justifyContent: 'center',
    width:          30,
    height:         30,
  },
  badgeWrap: { position: 'absolute', top: -4, right: -6 },
  label: { fontSize: 11, marginTop: 2 },
});