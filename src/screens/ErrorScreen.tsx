// Screen: ErrorScreen
// Description: Generic error handle screen with premium animations
// Navigation: Any screen when error occurs

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeInUp, withRepeat, withTiming, useSharedValue, useAnimatedStyle, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { RadarAnimation } from '../components/RadarAnimation';

const { width } = Dimensions.get('window');

export default function ErrorScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'Error'>>();
  const insets = useSafeAreaInsets();

  const title = route.params?.title || t('error.title');
  const message = route.params?.message || t('error.message');

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      {/* Search Radar Effect */}
      <View style={S.radarBg}>
        <RadarAnimation size={width * 1.5} isDark={isDark} />
      </View>

      <View style={[S.content, { marginTop: insets.top + 100 }]}>
        <Animated.View entering={FadeInDown.duration(800).springify()}>
          <LinearGradient colors={['#FF6B6B', '#FF4757']} style={S.iconBox}>
             <Ionicons name="alert-circle" size={48} color="#fff" />
          </LinearGradient>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(200)} style={[S.title, { color: colors.textPrimary }]}>
          {title}
        </Animated.Text>
        
        <Animated.Text entering={FadeInDown.delay(400)} style={[S.message, { color: colors.textSecondary }]}>
          {message}
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(600)} style={S.actionWrap}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.goBack();
            }}
            style={[S.button, { backgroundColor: colors.primary }]}
          >
            <Text style={S.buttonTxt}>{t('error.retry')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 32 },
  radarBg: {
    position: 'absolute',
    top: '10%',
    left: -width / 2,
    width: width * 2,
    height: width * 2,
    opacity: 0.15,
    zIndex: -1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 90,
    height: 90,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    opacity: 0.8,
  },
  actionWrap: {
    width: '100%',
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonTxt: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});
