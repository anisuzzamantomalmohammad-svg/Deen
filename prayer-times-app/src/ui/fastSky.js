// The sky behind the Fasting page (1.8): night blue on the Seheri side, a
// sunset glow on the Iftar side, twinkling stars, small lights drifting up.
// It fades into the page further down, so cards stay easy to read.
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';
import { useTheme } from './kit';

const ND = Platform.OS !== 'web';

function Mote({ x, delay, dur, color, h }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: dur, delay, easing: Easing.linear, useNativeDriver: ND }));
    a.start();
    return () => a.stop();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, top: h - 10, width: 4, height: 4, borderRadius: 2, backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.75, 0.4, 0] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.9] }) }],
      }}
    />
  );
}

export function FastingSky({ width, height }) {
  const th = useTheme();
  const L = th.isLight;
  const tw = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!th.fx) return undefined;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(tw, { toValue: 1, duration: 2400, useNativeDriver: ND }),
      Animated.timing(tw, { toValue: 0, duration: 2400, useNativeDriver: ND }),
    ]));
    a.start();
    return () => a.stop();
  }, [th.fx]);
  const night = L ? '#C9D2EE' : '#1A2050';
  const dusk = L ? '#F6B98A' : '#E88A4A';
  const stars = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ x: ((i * 53) % 100) / 100 * width * 0.55, y: ((i * 97) % 330) + 6, r: i % 5 ? 0.8 : 1.4, o: 1 - (((i * 53) % 100) / 100) })), [width]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="fsH" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={night} stopOpacity={L ? 0.7 : 0.8} />
            <Stop offset="0.52" stopColor={night} stopOpacity="0" />
            <Stop offset="1" stopColor={dusk} stopOpacity={L ? 0.6 : 0.47} />
          </LinearGradient>
          <LinearGradient id="fsV" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={th.bg} stopOpacity="0" />
            <Stop offset="0.5" stopColor={th.bg} stopOpacity="0" />
            <Stop offset="0.95" stopColor={th.bg} stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id="fsSun" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={dusk} stopOpacity={L ? 0.55 : 0.42} />
            <Stop offset="1" stopColor={dusk} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#fsH)" />
        <Circle cx={width + 10} cy={250} r={150} fill="url(#fsSun)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#fsV)" />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity: th.fx ? tw.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) : 0.8 }}>
        <Svg width={width * 0.6} height={340}>
          {stars.map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={L ? '#A8741A' : '#FFFFFF'} opacity={s.o * (i % 2 ? 0.9 : 0.5)} />)}
        </Svg>
      </Animated.View>
      {th.fx ? Array.from({ length: 10 }, (_, i) => <Mote key={i} x={(i * 37) % width} delay={i * 900} dur={9000 + (i % 5) * 2000} color={th.accent} h={height * 0.8} />) : null}
    </View>
  );
}
