// A thin band of a traditional pattern under the arch on normal days (1.8),
// from the culture picked in Settings › Home look (or worked out from the
// language and time zone). It drifts slowly; it stays still when motion is off.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { useTheme } from './kit';

// motif, main colour, second colour, ground
export const CULTURE_BANDS = {
  bd: ['kantha', '#B3263A', '#F4E6D0', '#5A1020'], // nakshi kantha running stitch
  pak: ['truck', '#E8A020', '#2A9A8A', '#3A1A40'], // truck-art borders
  in: ['paisley', '#C8502A', '#F2C060', '#3A1610'],
  tr: ['iznik', '#2A6AB8', '#F4F0E6', '#183A6A'], // Iznik tiles
  eg: ['lotus', '#C9A04E', '#2A7A8A', '#1A2A30'],
  ma: ['zellige', '#2A8A5A', '#F2E6CC', '#123A2A'], // zellige stars
  gulf: ['sadu', '#B3302A', '#F2E6CC', '#2A1A14'], // Al Sadu weaving
  lev: ['tatreez', '#B3263A', '#F2E6CC', '#2A1418'], // tatreez cross-stitch
  id: ['batik', '#8A5A2A', '#F2D8A8', '#3A2414'],
};

function Motif({ kind, a, b, x }) {
  const s = 40;
  switch (kind) {
    case 'kantha':
    case 'sadu':
      return <G x={x}><Path d={`M0 9L10 2L20 9L10 16Z M20 9L30 2L40 9L30 16Z`} fill={a} /><Path d="M4 9h32" stroke={b} strokeWidth={1} strokeDasharray="2 2" /><Path d="M10 6v6M30 6v6" stroke={b} strokeWidth={1} /></G>;
    case 'tatreez':
      return <G x={x}>{[4, 12, 20, 28, 36].map((cx, i) => <Path key={i} d={`M${cx - 3} ${i % 2 ? 6 : 9}l6 6m0 -6l-6 6`} stroke={i % 2 ? b : a} strokeWidth={1.6} />)}</G>;
    case 'iznik':
      return <G x={x}><Circle cx={10} cy={9} r={5} fill={a} /><Circle cx={10} cy={9} r={2} fill={b} /><Path d="M20 9q5-7 10 0q-5 7-10 0z" fill={b} opacity={0.9} /><Circle cx={35} cy={9} r={1.6} fill={a} /></G>;
    case 'zellige':
      return <G x={x}><Path d="M10 2l2.5 4.5 5 .5-3.5 3.5 1 5-5-2.5-5 2.5 1-5L2.5 7l5-.5z" fill={a} /><Path d="M30 4l5 5-5 5-5-5z" fill={b} /></G>;
    case 'lotus':
      return <G x={x}><Path d="M10 15q-6-6 0-12q6 6 0 12z M10 15q-9-2-8-9q6 1 8 9z M10 15q9-2 8-9q-6 1-8 9z" fill={a} /><Rect x={24} y={7} width={12} height={4} rx={2} fill={b} /></G>;
    case 'truck':
      return <G x={x}><Path d="M0 15L10 3L20 15Z" fill={a} /><Path d="M20 3L30 15L40 3Z" fill={b} /><Circle cx={10} cy={11} r={1.6} fill="#fff" /><Circle cx={30} cy={7} r={1.6} fill="#fff" /></G>;
    case 'paisley':
      return <G x={x}><Path d="M8 14q-6-2-3-8q4-4 8 0q3 4-1 6q-2 1-2 3z" fill={a} /><Circle cx={9} cy={8} r={1.5} fill={b} /><Circle cx={28} cy={9} r={3} fill={b} /><Circle cx={28} cy={9} r={1.2} fill={a} /></G>;
    case 'batik':
      return <G x={x}><Circle cx={8} cy={9} r={5} fill="none" stroke={a} strokeWidth={1.4} /><Circle cx={8} cy={9} r={1.6} fill={a} />{[20, 26, 32].map((cx) => <Circle key={cx} cx={cx} cy={9} r={1.3} fill={b} />)}</G>;
    default:
      return null;
  }
}

export function CultureBand({ culture, width }) {
  const th = useTheme();
  const v = useRef(new Animated.Value(0)).current;
  const band = CULTURE_BANDS[culture];
  useEffect(() => {
    if (!band || !th.fx) return undefined;
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }));
    a.start();
    return () => a.stop();
  }, [culture, th.fx]);
  if (!band) return null;
  const [kind, a, b, ground] = band;
  const n = Math.ceil(width / 40) + 2;
  return (
    <View pointerEvents="none" style={{ width, height: 18, overflow: 'hidden', opacity: th.isLight ? 0.85 : 0.8 }}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }] }}>
        <Svg width={n * 40} height={18}>
          <Rect x={0} y={0} width={n * 40} height={18} fill={ground} opacity={0.85} />
          {Array.from({ length: n }, (_, i) => <Motif key={i} kind={kind} a={a} b={b} x={i * 40} />)}
          <Rect x={0} y={0} width={n * 40} height={1} fill={b} opacity={0.5} />
          <Rect x={0} y={17} width={n * 40} height={1} fill={b} opacity={0.5} />
        </Svg>
      </Animated.View>
    </View>
  );
}
