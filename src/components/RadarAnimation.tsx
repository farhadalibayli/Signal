import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

type Props = {
  size: number;
  isDark: boolean;
};

export function RadarAnimation({ size, isDark }: Props) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 3000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => {
      rotation.value = 0;
    };
  }, []);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }] as any,
  }));

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const middleR = size / 2 - size * 0.18;
  const innerR = size / 2 - size * 0.36;

  /*
   * SVG PIE SLICE — 40 degrees wide, nearly transparent.
   *
   * The slice starts at 12 o'clock (straight up).
   * In SVG coordinates:
   *   12 o'clock = angle -90° from positive X axis
   *   Start point: (cx, cy - outerR)
   *   End point (40° clockwise): angle = -90 + 40 = -50°
   *     x = cx + outerR * cos(-50°) = cx + outerR * 0.6428
   *     y = cy + outerR * sin(-50°) = cy - outerR * 0.7660
   *
   * Path: Move to center → Line to 12 o'clock edge →
   *       Arc 40° clockwise → Close back to center
   */
  const endAngleDeg = -50;
  const endAngleRad = (endAngleDeg * Math.PI) / 180;
  const x2 = cx + outerR * Math.cos(endAngleRad);
  const y2 = cy + outerR * Math.sin(endAngleRad);

  // d attribute for the 40-degree pie slice
  const sweepPath = [
    `M ${cx} ${cy}`,
    `L ${cx} ${cy - outerR}`,
    `A ${outerR} ${outerR} 0 0 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`,
    `Z`,
  ].join(' ');

  // Theme-aware colors
  const outerStroke    = isDark ? 'rgba(108,71,255,0.55)' : 'rgba(108,71,255,0.45)';
  const middleStroke   = isDark ? 'rgba(155,127,255,0.35)' : 'rgba(108,71,255,0.30)';
  const innerStroke    = isDark ? 'rgba(155,127,255,0.28)' : 'rgba(108,71,255,0.22)';
  const crosshair      = isDark ? 'rgba(108,71,255,0.12)' : 'rgba(108,71,255,0.08)';
  // Sweep wedge: very transparent — only 0.13 / 0.10 opacity
  const sweepFill      = isDark ? 'rgba(108,71,255,0.13)' : 'rgba(108,71,255,0.10)';
  // Leading edge line: bright and clear
  const leadingEdge    = isDark ? 'rgba(108,71,255,0.92)' : 'rgba(108,71,255,0.78)';
  // Outer ambient glow
  const glowBg         = isDark ? 'rgba(108,71,255,0.07)' : 'rgba(108,71,255,0.04)';

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>

      {/* Ambient glow behind the whole radar */}
      <View
        style={{
          position: 'absolute',
          width:  size + 40,
          height: size + 40,
          borderRadius: (size + 40) / 2,
          backgroundColor: glowBg,
          top:  -20,
          left: -20,
        }}
      />

      {/* ── STATIC LAYER ── rings + crosshairs (never rotate) */}
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
      >
        {/* Outer solid ring */}
        <Circle
          cx={cx} cy={cy}
          r={outerR}
          stroke={outerStroke}
          strokeWidth={1.5}
          fill="none"
        />

        {/* Middle dashed ring */}
        <Circle
          cx={cx} cy={cy}
          r={middleR}
          stroke={middleStroke}
          strokeWidth={1}
          strokeDasharray="5 7"
          fill="none"
        />

        {/* Inner dashed ring */}
        <Circle
          cx={cx} cy={cy}
          r={innerR}
          stroke={innerStroke}
          strokeWidth={1}
          strokeDasharray="3 6"
          fill="none"
        />

        {/* Vertical crosshair */}
        <Line
          x1={cx} y1={6}
          x2={cx} y2={size - 6}
          stroke={crosshair}
          strokeWidth={0.5}
          strokeDasharray="2 10"
        />

        {/* Horizontal crosshair */}
        <Line
          x1={6}        y1={cy}
          x2={size - 6} y2={cy}
          stroke={crosshair}
          strokeWidth={0.5}
          strokeDasharray="2 10"
        />
      </Svg>

      {/* ── ROTATING LAYER ── sweep wedge + leading-edge line */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
          },
          sweepStyle,
        ]}
      >
        <Svg width={size} height={size}>
          {/*
           * Thin 40-degree pie slice.
           * fill is very low opacity so it reads as a ghost trail,
           * NOT a solid triangle.
           */}
          <Path
            d={sweepPath}
            fill={sweepFill}
          />

          {/*
           * Leading-edge bright line.
           * This is the "needle" of the radar —
           * a straight line from center to the 12 o'clock edge.
           * It rotates together with the wedge.
           */}
          <Line
            x1={cx}        y1={cy}
            x2={cx}        y2={cy - outerR + 2}
            stroke={leadingEdge}
            strokeWidth={1.5}
          />
        </Svg>
      </Animated.View>

      {/* ── CENTER DOT ── always on top */}
      <View
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#6C47FF',
          left: cx - 4,
          top:  cy - 4,
          shadowColor:   '#6C47FF',
          shadowOpacity: 1,
          shadowRadius:  8,
          shadowOffset:  { width: 0, height: 0 },
          elevation: 8,
        }}
      />

    </View>
  );
}