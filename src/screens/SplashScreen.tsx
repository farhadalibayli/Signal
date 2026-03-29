// Screen: SplashScreen
// Description: Spectacular animated splash — broadcast rings, letter reveal,
//              floating particles, shimmer bar, inline high-quality radar.
// Navigation: Auto → LoginScreen at ~3600ms

import React, { useEffect, useRef, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const PRIMARY      = '#6C47FF';
const ACCENT       = '#9B7FFF';
const TITLE_CHARS  = ['S', 'I', 'G', 'N', 'A', 'L'] as const;
const RADAR_SIZE   = 210;
const BAR_WIDTH    = 160;
const RING_COUNT   = 5;
const RING_PERIOD  = 2400;
const RING_STAGGER = RING_PERIOD / RING_COUNT;

// ─── BroadcastRing ────────────────────────────────────────────────────────────
function BroadcastRing({
  staggerDelay,
  maxSize,
  color,
  isDark,
}: {
  staggerDelay: number;
  maxSize:      number;
  color:        string;
  isDark:       boolean;
}) {
  const scale   = useSharedValue(0.12);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(() => {
      scale.value = withRepeat(
        withSequence(
          withTiming(0.12, { duration: 0 }),
          withTiming(1,    { duration: RING_PERIOD, easing: Easing.out(Easing.quad) }),
        ),
        -1, false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(isDark ? 0.55 : 0.32, { duration: 160 }),
          withTiming(0, { duration: RING_PERIOD - 160, easing: Easing.out(Easing.quad) }),
        ),
        -1, false,
      );
    }, staggerDelay);
    return () => clearTimeout(t);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }] as any,
    opacity:   opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.broadcastRing,
        { width: maxSize, height: maxSize, borderRadius: maxSize / 2, borderColor: color },
        style,
      ]}
    />
  );
}

// ─── SplashRadar ─────────────────────────────────────────────────────────────
function SplashRadar({ size, isDark }: { size: number; isDark: boolean }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1, false,
    );
    return () => { rotation.value = 0; };
  }, []);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }] as any,
  }));

  const cx     = size / 2;
  const cy     = size / 2;
  const outerR = size / 2 - 2;
  const midR   = size / 2 - size * 0.19;
  const innR   = size / 2 - size * 0.37;

  const endAngle = ((-90 + 42) * Math.PI) / 180;
  const ex = cx + outerR * Math.cos(endAngle);
  const ey = cy + outerR * Math.sin(endAngle);
  const sweepPath = `M ${cx} ${cy} L ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 0 1 ${ex.toFixed(3)} ${ey.toFixed(3)} Z`;

  const c = {
    outer:  isDark ? 'rgba(108,71,255,0.65)' : 'rgba(108,71,255,0.55)',
    mid:    isDark ? 'rgba(155,127,255,0.38)' : 'rgba(108,71,255,0.32)',
    inn:    isDark ? 'rgba(155,127,255,0.28)' : 'rgba(108,71,255,0.22)',
    cross:  isDark ? 'rgba(108,71,255,0.10)' : 'rgba(108,71,255,0.07)',
    fill:   isDark ? 'rgba(108,71,255,0.11)' : 'rgba(108,71,255,0.08)',
    beam:   isDark ? 'rgba(108,71,255,0.95)' : 'rgba(108,71,255,0.85)',
    glow:   isDark ? 'rgba(108,71,255,0.07)' : 'rgba(108,71,255,0.04)',
  };

  const glowSz = size + 32;

  return (
    <View style={{ width: size, height: size }}>
      <View style={{
        position: 'absolute',
        width: glowSz, height: glowSz,
        borderRadius: glowSz / 2,
        backgroundColor: c.glow,
        top: -16, left: -16,
      }} />

      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cy} r={outerR} stroke={c.outer} strokeWidth={1.5} fill="none" />
        <Circle cx={cx} cy={cy} r={midR}   stroke={c.mid}   strokeWidth={1}   fill="none" strokeDasharray="5 7" />
        <Circle cx={cx} cy={cy} r={innR}   stroke={c.inn}   strokeWidth={1}   fill="none" strokeDasharray="3 6" />
        <Line x1={cx} y1={6}      x2={cx}      y2={size-6} stroke={c.cross} strokeWidth={0.5} strokeDasharray="2 10" />
        <Line x1={6}  y1={cy}     x2={size-6}  y2={cy}     stroke={c.cross} strokeWidth={0.5} strokeDasharray="2 10" />
      </Svg>

      <Animated.View
        style={[{ position: 'absolute', top: 0, left: 0, width: size, height: size }, sweepStyle]}
      >
        <Svg width={size} height={size}>
          <Path d={sweepPath} fill={c.fill} />
          <Line
            x1={cx} y1={cy}
            x2={cx} y2={cy - outerR + 2}
            stroke={c.beam}
            strokeWidth={1.8}
          />
        </Svg>
      </Animated.View>

      <View style={{
        position:  'absolute',
        width: 9,  height: 9,
        borderRadius: 4.5,
        backgroundColor: PRIMARY,
        left: cx - 4.5, top: cy - 4.5,
        shadowColor:   PRIMARY,
        shadowOpacity: 1,
        shadowRadius:  10,
        shadowOffset:  { width: 0, height: 0 },
        elevation: 10,
      }} />
    </View>
  );
}

// ─── LetterReveal ─────────────────────────────────────────────────────────────
function LetterReveal({ char, delay, isDark }: { char: string; delay: number; isDark: boolean }) {
  const ty    = useSharedValue(30);
  const op    = useSharedValue(0);
  const sc    = useSharedValue(0.55);

  useEffect(() => {
    const t = setTimeout(() => {
      ty.value = withSpring(0, { damping: 13, stiffness: 210 });
      op.value = withTiming(1, { duration: 260 });
      sc.value = withSpring(1, { damping: 11, stiffness: 190 });
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: ty.value },
      { scale: sc.value },
    ] as any,
    opacity: op.value,
  }));

  return (
    <Animated.Text
      style={[
        styles.letter,
        {
          color:            isDark ? '#FFFFFF' : '#1A1529',
          textShadowColor:  PRIMARY,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: isDark ? 16 : 6,
          fontFamily:       'Poppins_700Bold',
        },
        style,
      ]}
    >
      {char}
    </Animated.Text>
  );
}

// ─── FloatingDot ──────────────────────────────────────────────────────────────
function FloatingDot({
  x, y, size: dotSize, delay, color,
}: {
  x: number; y: number; size: number; delay: number; color: string;
}) {
  const ty = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(() => {
      op.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 500 }),
          withTiming(0.25, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 500 }),
        ),
        -1,
      );
      ty.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming( 8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }] as any,
    opacity:   op.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position:     'absolute',
          left:         x,
          top:          y,
          width:        dotSize,
          height:       dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
          shadowColor:     color,
          shadowOpacity:   0.9,
          shadowRadius:    5,
          shadowOffset:    { width: 0, height: 0 },
          elevation: 5,
        },
        style,
      ]}
    />
  );
}

// ─── ShimmerBar ───────────────────────────────────────────────────────────────
function ShimmerBar({ isDark }: { isDark: boolean }) {
  const fillW = useSharedValue(0);
  const shimX = useSharedValue(-60);

  useEffect(() => {
    fillW.value = withTiming(BAR_WIDTH, {
      duration: 2500,
      easing:   Easing.out(Easing.cubic),
    });
    shimX.value = withRepeat(
      withSequence(
        withTiming(-60,              { duration: 0 }),
        withTiming(BAR_WIDTH + 60,   { duration: 950, easing: Easing.inOut(Easing.ease) }),
        withTiming(BAR_WIDTH + 60,   { duration: 450 }),
      ),
      -1, false,
    );
  }, []);

  const fillStyle  = useAnimatedStyle(() => ({ width: fillW.value }));
  const shimStyle  = useAnimatedStyle(() => ({ transform: [{ translateX: shimX.value }] as any }));

  return (
    <View style={[
      styles.barTrack,
      {
        backgroundColor: isDark
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(108,71,255,0.10)',
        width: BAR_WIDTH,
      },
    ]}>
      <Animated.View style={[styles.barFill, fillStyle]}>
        <LinearGradient
          colors={['#7C5CFF', '#6C47FF', '#9B7FFF']}
          start={{ x: 0, y: 0 }}
          end={{   x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.shimmer, shimStyle]} />
      </Animated.View>
    </View>
  );
}

// ─── SplashScreen ─────────────────────────────────────────────────────────────
export default function SplashScreen() {
  const { isDark } = useAppTheme();
  const { t }      = useTranslation();
  const { user, isLoading } = useAuth();
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { width: W, height: H } = useWindowDimensions();

  const [showTagline, setShowTagline] = useState(false);
  const [showBar,     setShowBar    ] = useState(false);

  const screenOp   = useSharedValue(0);
  const radarScale = useSharedValue(0);
  const textOp     = useSharedValue(0);
  const textY      = useSharedValue(28);

  const [timeouts] = React.useState(() => ({ current: [] as ReturnType<typeof setTimeout>[] }));

  useEffect(() => {
    screenOp.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });

    timeouts.current.push(setTimeout(() => {
      radarScale.value = withSpring(1, { damping: 11, stiffness: 110, mass: 0.85 });
    }, 180));

    timeouts.current.push(setTimeout(() => {
      textOp.value = withTiming(1,  { duration: 380 });
      textY.value  = withSpring(0,  { damping: 18, stiffness: 180 });
    }, 340));

    timeouts.current.push(setTimeout(() => setShowTagline(true), 960));
    timeouts.current.push(setTimeout(() => setShowBar(true), 1060));

    timeouts.current.push(setTimeout(() => {
      screenOp.value = withTiming(0, { duration: 500, easing: Easing.in(Easing.ease) });
    }, 3100));

    timeouts.current.push(setTimeout(() => {
      if (!isLoading) {
        navigation.replace(user ? 'Home' : 'Login');
      } else {
        // Fallback if still loading (very rare)
        setTimeout(() => navigation.replace(user ? 'Home' : 'Login'), 500);
      }
    }, 3600));

    return () => { timeouts.current.forEach(clearTimeout); };
  }, [isLoading, user]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOp.value }));
  const radarStyle  = useAnimatedStyle(() => ({
    transform: [{ scale: radarScale.value }] as any,
    opacity:   radarScale.value > 0 ? 1 : 0,
  }));
  const textStyle   = useAnimatedStyle(() => ({
    opacity:   textOp.value,
    transform: [{ translateY: textY.value }] as any,
  }));

  const bg         = isDark ? '#0D0A1E' : '#F0EBFF';

  const ringMaxSz  = RADAR_SIZE * 3.0;
  const centSz     = RADAR_SIZE * 3.2;
  const radarCX    = centSz / 2;

  const particles = [
    { dx: -95, dy: -65,  s: 5, d: 0   },
    { dx:  85, dy: -80,  s: 4, d: 280 },
    { dx: -75, dy:  72,  s: 6, d: 560 },
    { dx:  92, dy:  52,  s: 4, d: 180 },
    { dx: -45, dy: -105, s: 3, d: 750 },
    { dx:  52, dy:  94,  s: 5, d: 380 },
    { dx:  115, dy: -22, s: 3, d: 650 },
    { dx: -115, dy:  12, s: 4, d: 90  },
  ];

  return (
    <Animated.View style={[styles.container, { backgroundColor: bg }, screenStyle]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={[styles.orb1, {
        backgroundColor: isDark ? 'rgba(108,71,255,0.14)' : 'rgba(108,71,255,0.09)',
      }]} />
      <View style={[styles.orb2, {
        backgroundColor: isDark ? 'rgba(155,127,255,0.08)' : 'rgba(155,127,255,0.06)',
      }]} />
      <View style={[styles.orb3, {
        backgroundColor: isDark ? 'rgba(108,71,255,0.05)' : 'rgba(108,71,255,0.04)',
      }]} />

      {/* ── Central section ── */}
      <View style={[styles.centralSection, { width: centSz, height: centSz }]}>
        <View style={styles.ringsAnchor}>
          {Array.from({ length: RING_COUNT }).map((_, i) => (
            <BroadcastRing
              key={i}
              staggerDelay={i * RING_STAGGER}
              maxSize={ringMaxSz}
              color={i % 2 === 0 ? PRIMARY : ACCENT}
              isDark={isDark}
            />
          ))}
        </View>

        {particles.map((p, i) => (
          <FloatingDot
            key={i}
            x={radarCX + p.dx - p.s / 2}
            y={radarCX + p.dy - p.s / 2}
            size={p.s}
            delay={p.d + 420}
            color={i % 2 === 0 ? PRIMARY : ACCENT}
          />
        ))}

        <Animated.View style={[styles.radarAnchor, radarStyle]}>
          <SplashRadar size={RADAR_SIZE} isDark={isDark} />
        </Animated.View>
      </View>

      {/* ── Text section ── */}
      <Animated.View style={[styles.textSection, textStyle]}>
        <View style={styles.lettersRow}>
          {TITLE_CHARS.map((ch, i) => (
            <LetterReveal
              key={i}
              char={ch}
              delay={i * 72}
              isDark={isDark}
            />
          ))}
        </View>

        <LinearGradient
          colors={[PRIMARY, ACCENT]}
          start={{ x: 0, y: 0 }}
          end={{   x: 1, y: 0 }}
          style={styles.underline}
        />

        {showTagline && (
          <Animated.Text
            entering={FadeInDown.duration(460).springify().damping(18)}
            style={[styles.tagline, { color: isDark ? ACCENT : PRIMARY, fontFamily: 'Poppins_400Regular' }]}
          >
            {t('splash.tagline')}
          </Animated.Text>
        )}

        {/* ── Loading bar: placed right below tagline, not at very bottom ── */}
        <View style={styles.barWrap}>
          {showBar && <ShimmerBar isDark={isDark} />}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
  },

  orb1: {
    position: 'absolute',
    width: 380, height: 380, borderRadius: 190,
    top: -90, left: -110,
  },
  orb2: {
    position: 'absolute',
    width: 280, height: 280, borderRadius: 140,
    bottom: -50, right: -90,
  },
  orb3: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 110,
    top: '38%', right: -70,
  },

  centralSection: {
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   16,
  },
  ringsAnchor: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
  },
  radarAnchor: {},

  textSection: {
    alignItems:      'center',
    paddingHorizontal: 24,
  },
  lettersRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  letter: {
    fontSize:      44,
    fontWeight:    'bold',
    letterSpacing: 6,
    marginHorizontal: 1,
  },
  underline: {
    width:        52,
    height:       2.5,
    borderRadius: 2,
    marginTop:    10,
  },
  tagline: {
    fontSize:      15,
    letterSpacing: 2,
    marginTop:     12,
    fontWeight:    '400',
  },

  // ── Loading bar: marginTop reduced so it sits just below tagline ──
  barWrap: {
    marginTop:      22,   // was 56 — now sits just below the last text
    height:         8,
    alignItems:     'center',
    justifyContent: 'center',
  },
  barTrack: {
    height:       8,
    borderRadius: 4,
    overflow:     'hidden',
  },
  barFill: {
    height:       '100%',
    borderRadius: 4,
    overflow:     'hidden',
  },
  shimmer: {
    position:        'absolute',
    top: 0, bottom: 0,
    width:           55,
    left:           -55,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius:    4,
  },

  broadcastRing: {
    position:    'absolute',
    borderWidth: 1.5,
  },
});