import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  TouchableOpacity, Dimensions, Image,
} from 'react-native';
import Animated, {
  FadeInDown, FadeIn,
  useSharedValue, 
  useAnimatedStyle,
  withSpring, 
  withTiming, 
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { SignalData } from '../types/signal';
import { useTheme } from '../context/ThemeContext';
import { useSignals } from '../context/SignalsContext';
import * as Haptics from 'expo-haptics';
import { LocationMapPreview } from './LocationMapPreview';

const { width: SW } = Dimensions.get('window');

type Props = {
  signal: SignalData;
  index: number;
  isDark: boolean;
  onClose?: () => void;
  onPress?: () => void;
  onPressDots?: () => void;
};

function SignalCardComponent({ signal, index, isDark, onClose, onPress, onPressDots }: Props) {
  const { t } = useTranslation();
  
  const minAbbr = t('common.minuteAbbr', { defaultValue: 'm' });
  const hrAbbr = t('common.hourAbbr', { defaultValue: 'h' });

  const formatTime = (m: number): string => {
    if (m < 60) return `${m} ${minAbbr}`;
    const h = Math.floor(m / 60), r = m % 60;
    return r > 0 ? `${h} ${hrAbbr} ${r} ${minAbbr}` : `${h} ${hrAbbr}`;
  };
  const { colors } = useTheme();
  const { toggleJoinSignal, removeSignal } = useSignals();
  
  const joined = signal.hasJoined || false;
  const localResponded = signal.respondedIn;

  const scale = useSharedValue(1);
  const op = useSharedValue(1);

  // Broadcasting animation shared value
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.4, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const isExpiring = signal.minutesLeft < 30;

  const handleJoin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleJoinSignal(signal.id);
  };

  const handleEnd = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    removeSignal(signal.id);
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: op.value,
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify().damping(20)}
    >
      <Animated.View style={[S.cardBox, cardStyle]}>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('signalDetail.join')}
        onPress={onPress}
        onPressIn={() => scale.value = withTiming(0.98)}
        onPressOut={() => scale.value = withTiming(1)}
        style={[S.card, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}
      >
        <View style={S.hdr}>
          <View style={S.user}>
            <View style={[S.avatar, { backgroundColor: signal.user.avatarColor }]}>
               {signal.user.avatar ? (
                 <Image source={{ uri: signal.user.avatar }} style={StyleSheet.absoluteFill} />
               ) : (
                 <Text style={S.initials}>{signal.user.initials}</Text>
               )}
               <View style={[S.status, { backgroundColor: colors.success, borderColor: colors.surface }]} />
            </View>
            <View>
              <Text style={[S.name, { color: colors.textPrimary }]}>{signal.isOwn ? t('common.you') : signal.user.name}</Text>
              <Text style={[S.userSub, { color: colors.textSecondary }]}>@{signal.user.username}</Text>
            </View>
          </View>
          
          <View style={S.typeWrapper}>
            {/* Pulse behind the type badge */}
            <Animated.View style={[S.pulse, pulseStyle, { backgroundColor: signal.typeColor }]} />
            <View style={[S.type, { backgroundColor: signal.typeColor + '10', borderColor: signal.typeColor + '25' }]}>
               <Ionicons name="flash" size={10} color={signal.typeColor} />
               <Text style={[S.typeTxt, { color: signal.typeColor }]}>{t(`home.filters.${signal.type.toLowerCase()}`, { defaultValue: signal.type })}</Text>
            </View>
          </View>
        </View>

        <Text style={[S.txt, { color: colors.textPrimary }]} numberOfLines={3}>
           {signal.text}
        </Text>

        {signal.location && (
          <LocationMapPreview
            location={signal.location}
            userCoords={null} // Optionally pass user coords if available
            isOwn={signal.isOwn}
          />
        )}

        <View style={[S.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
           <View style={S.stats}>
              <View style={[S.pill, { backgroundColor: isExpiring ? colors.error + '10' : colors.primary + '10' }]}>
                 <Ionicons name="time-outline" size={12} color={isExpiring ? colors.error : colors.primary} />
                 <Text style={[S.pillTxt, { color: isExpiring ? colors.error : colors.primary }]}>
                    {isExpiring ? t('signalDetail.timeLeft', { time: formatTime(signal.minutesLeft) }) : formatTime(signal.minutesLeft)}
                 </Text>
              </View>
              {localResponded > 0 && (
                <View style={S.resps}>
                   <View style={[S.resDot, { backgroundColor: colors.success }]} />
                   <Text style={[S.resTxt, { color: colors.textSecondary }]}>{t('signalDetail.responsesCount', { count: localResponded })}</Text>
                </View>
              )}
           </View>

           <View style={S.btns}>
              <TouchableOpacity 
                activeOpacity={0.8}
                accessibilityRole="button"
                onPress={signal.isOwn ? handleEnd : handleJoin} 
                style={[S.join, { backgroundColor: signal.isOwn ? colors.error + '15' : (joined ? colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')), borderColor: signal.isOwn ? colors.error + '30' : 'transparent', borderWidth: signal.isOwn ? 1 : 0 }]}
              >
                 <Text style={[S.joinTxt, { color: signal.isOwn ? colors.error : (joined ? '#fff' : colors.textPrimary) }]}>
                    {signal.isOwn ? t('signalDetail.endSignal', { defaultValue: 'END' }) : (joined ? t('signalDetail.requested') : t('signalDetail.join'))}
                 </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                accessibilityRole="button"
                accessibilityLabel="Options"
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                onPress={() => onPressDots && onPressDots()}
                style={[S.more, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
              >
                 <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
           </View>
        </View>
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const S = StyleSheet.create({
  cardBox: { marginBottom: 4 },
  card: { borderRadius: 24, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  initials: { color: '#fff', fontSize: 13, fontFamily: 'Inter_800ExtraBold' },
  status: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  name: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  userSub: { fontSize: 12, fontFamily: 'Inter_500Medium', opacity: 0.6 },
  typeWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  pulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  type: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, zIndex: 1 },
  typeTxt: { fontSize: 10, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.5 },
  txt: { fontSize: 16, fontFamily: 'Inter_500Medium', lineHeight: 24, marginBottom: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 1 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pillTxt: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  resps: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resDot: { width: 6, height: 6, borderRadius: 3 },
  resTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  btns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  join: { height: 38, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  joinTxt: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  more: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

export const SignalCard = React.memo(SignalCardComponent, (prev, next) => {
  return (
    prev.signal.id === next.signal.id &&
    prev.signal.hasJoined === next.signal.hasJoined &&
    prev.signal.minutesLeft === next.signal.minutesLeft &&
    prev.signal.respondedIn === next.signal.respondedIn &&
    prev.isDark === next.isDark &&
    prev.index === next.index
  );
});