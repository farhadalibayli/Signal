// Screen: HelpFAQScreen
// Description: Help and FAQ with premium design
// Navigation: SettingsScreen -> here

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants/spacing';

export default function HelpFAQScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const FAQ_DATA = [
    {
      title: t('help.concept'),
      icon: 'bulb-outline' as const,
      color: '#6C47FF',
      questions: [
        { q: t('help.faq.q1'), a: t('help.faq.a1') },
        { q: t('help.faq.q2'), a: t('help.faq.a2') },
      ]
    },
    {
      title: t('help.signals'),
      icon: 'flash-outline' as const,
      color: '#D946EF',
      questions: [
        { q: t('help.faq.q3'), a: t('help.faq.a3') },
        { q: t('help.faq.q4'), a: t('help.faq.a4') },
      ]
    },
    {
      title: t('help.privacy'),
      icon: 'shield-checkmark-outline' as const,
      color: '#10B981',
      questions: [
        { q: t('help.faq.q5'), a: t('help.faq.a5') },
        { q: t('help.faq.q6'), a: t('help.faq.a6') },
      ]
    }
  ];

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      <View style={[S.headerContainer, { paddingTop: insets.top }]}>
        <BlurView intensity={isDark ? 40 : 80} style={StyleSheet.absoluteFill} tint={isDark ? "dark" : "light"} />
        <View style={S.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[S.title, { color: colors.textPrimary }]}>{t('help.title')}</Text>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[S.scroll, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }]} 
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600).springify()} style={S.heroWrap}>
          <LinearGradient
            colors={['#6C47FF', '#9D4EDD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={S.heroGradient}
          />
          <View style={S.heroContent}>
            <View style={S.heroIconWrap}>
              <Ionicons name="sparkles" size={24} color="#fff" />
            </View>
            <Text style={S.heroTitle}>{t('help.heroTitle')}</Text>
            <Text style={S.heroSub}>{t('help.heroSub')}</Text>
          </View>
        </Animated.View>

        {FAQ_DATA.map((cat, ci) => (
          <View key={cat.title} style={S.category}>
            <View style={S.categoryHead}>
              <Ionicons name={cat.icon} size={18} color={cat.color} />
              <Text style={[S.categoryTitle, { color: colors.textSecondary }]}>{cat.title.toUpperCase()}</Text>
            </View>
            {cat.questions.map((item, i) => (
              <FAQItem key={item.q} item={item} colors={colors} />
            ))}
          </View>
        ))}

        <Animated.View entering={FadeIn.delay(800)} style={S.supportWrap}>
          <LinearGradient colors={isDark ? ['#1A1529', '#0D0A1E'] : ['#F5F3FF', '#FFF']} style={[S.supportCard, { borderColor: colors.border }]}>
            <View style={S.supportInfo}>
              <Text style={[S.supportTitle, { color: colors.textPrimary }]}>{t('help.needHelp')}</Text>
              <Text style={[S.supportSub, { color: colors.textSecondary }]}>{t('help.supportSub')}</Text>
            </View>
            <TouchableOpacity 
              style={[S.contactBtn, { backgroundColor: colors.primary }]}
              onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
            >
              <Text style={S.contactBtnTxt}>{t('help.contact')}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function FAQItem({ item, colors }: any) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(!open);
  };

  return (
    <Animated.View layout={Layout.springify()} style={[S.itemWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.7}>
        <View style={S.itemRow}>
          <Text style={[S.question, { color: colors.textPrimary }]}>{item.q}</Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
        </View>
        {open && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Text style={[S.answer, { color: colors.textSecondary }]}>{item.a}</Text>
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  headerContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 20,
  },
  heroWrap: {
    height: 180,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 32,
    elevation: 8,
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-end',
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Inter_900Black',
    marginBottom: 4,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  category: {
    marginBottom: 24,
  },
  categoryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginLeft: 4,
  },
  categoryTitle: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
  },
  itemWrap: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  question: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    paddingRight: 16,
  },
  answer: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 22,
    opacity: 0.9,
  },
  supportWrap: {
    marginTop: 20,
  },
  supportCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  supportInfo: {
    flex: 1,
    marginRight: 16,
  },
  supportTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  supportSub: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    opacity: 0.8,
  },
  contactBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  contactBtnTxt: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});
