// Shared pieces of the 1.9 look for the tabs: a soft tinted background
// instead of the pattern, and the big ring used on Hijri, Ibadah, Quran,
// Essentials, Qibla and Tasbih. The ring draws itself in when it appears
// and the active part glows gently.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Circle, Line, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from './kit';

const AnimatedCircle = Circle;
const ND = Platform.OS !== 'web';

// segs: [[fraction, colour, glow?, pulse?], ...]
export function BigRing({ size, segs, children, w = 9, ticks = 0, round = true, style }) {
  const th = useTheme();
  const r = size / 2 - 8;
  const C = 2 * Math.PI * r;
  const c = size / 2;
  const draw = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const sig = segs.map((s) => s[0].toFixed(3)).join(',');
  const [k, setK] = useState(0);
  useEffect(() => {
    draw.setValue(0);
    const id = draw.addListener(({ value }) => setK(value));
    Animated.timing(draw, { toValue: 1, duration: 1000, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => setK(1));
    return () => draw.removeListener(id);
  }, [sig]);
  useEffect(() => {
    if (!th.fx || !segs.some((s) => s[3])) return undefined;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: ND }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: ND }),
    ]));
    a.start();
    return () => a.stop();
  }, [th.fx, sig]);
  let off = 0;
  const arcs = segs.map(([f, col, glow, pul], i) => {
    const len = Math.max(0, C * f - (segs.length > 1 ? 4 : 0));
    const start = off;
    off += C * f;
    const dash = len * k;
    if (dash < 0.5) return null;
    return (
      <G0 key={i} pulse={pul ? pulse : null}>
        {glow ? <AnimatedCircle cx={c} cy={c} r={r} fill="none" stroke={col} strokeOpacity={0.25} strokeWidth={w + 6} strokeLinecap={round ? 'round' : 'butt'} strokeDasharray={`${dash} ${C * 2}`} strokeDashoffset={-start} transform={`rotate(-90 ${c} ${c})`} /> : null}
        <AnimatedCircle cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth={w} strokeLinecap={round ? 'round' : 'butt'} strokeDasharray={`${dash} ${C * 2}`} strokeDashoffset={-start} transform={`rotate(-90 ${c} ${c})`} />
      </G0>
    );
  });
  const tickEls = ticks ? Array.from({ length: ticks }, (_, k) => {
    const a = (k / ticks) * Math.PI * 2 - Math.PI / 2;
    return <Line key={k} x1={c + (r - w) * Math.cos(a)} y1={c + (r - w) * Math.sin(a)} x2={c + (r - w - 4) * Math.cos(a)} y2={c + (r - w - 4) * Math.sin(a)} stroke={th.faint} strokeOpacity={0.6} />;
  }) : null;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} style={{ position: 'absolute', overflow: 'visible' }}>
        <Circle cx={c} cy={c} r={r} fill="none" stroke={th.line} strokeWidth={w} />
        {arcs}
        {tickEls}
        <Circle cx={c} cy={c} r={Math.max(1, r - w - 6)} fill="none" stroke={th.line} strokeOpacity={0.5} />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}
// a pulsing wrapper for one part of the ring (react-native-svg G has no opacity animation on web)
function G0({ pulse, children }) {
  if (!pulse) return children;
  const AG = AnimatedG;
  return <AG opacity={pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] })}>{children}</AG>;
}
import { G } from 'react-native-svg';
const AnimatedG = Animated.createAnimatedComponent(G);

// Behind each tab's title: the accent fading into the page, and a few
// slow lights drifting up. No sky, no sun: that stays on Home.
export function TabTint({ height = 320, width = 600, style }) {
  const th = useTheme();
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, height }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="tabTint" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={th.accent} stopOpacity={th.isLight ? 0.2 : 0.14} />
            <Stop offset="1" stopColor={th.accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#tabTint)" />
      </Svg>
      {th.fx ? Array.from({ length: 6 }, (_, i) => <Mote key={i} x={((i * 67) % 100) / 100 * width} h={height} delay={i * 1700} color={th.accent} />) : null}
    </View>
  );
}
function Mote({ x, h, delay, color }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 11000, delay, easing: Easing.linear, useNativeDriver: ND }));
    a.start();
    return () => a.stop();
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', left: x, top: h - 20, width: 3, height: 3, borderRadius: 2, backgroundColor: color,
      opacity: v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.6, 0.3, 0] }),
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.9] }) }] }} />
  );
}
