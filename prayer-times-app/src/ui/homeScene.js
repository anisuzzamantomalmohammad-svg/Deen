// The animated scene behind the top of Home (1.8). It replaces the flat
// pattern: a sky for the time of day, the sun or tonight's real moon,
// drifting clouds, twinkling stars, a landmark from the user's culture with
// its own small animation (kites, lanterns, petals, sand), and a special
// look for Ramadan, Eid and the White Days. Calm when motion is off.
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle, Path, G, Ellipse } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import { useTheme } from './kit';
import { SkyBody } from './parts';
import { LANDMARKS, windowsOf } from '../data/landmarks';

const ND = Platform.OS !== 'web';
const loop = (v, dur, delay = 0, ease = Easing.linear) => Animated.loop(Animated.timing(v, { toValue: 1, duration: dur, delay, easing: ease, useNativeDriver: ND }));
const swing = (v, dur) => Animated.loop(Animated.sequence([
  Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
  Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
]));
function useAnim(make, deps, on) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return undefined;
    const a = make(v);
    a.start();
    return () => a.stop();
  }, [...deps, on]);
  return v;
}

// Sky colours: [top, middle, bottom]
const SKIES = {
  day: ['#1D5B6A', '#16484A', '#123F3C'],
  sunset: ['#2B2A55', '#6A3A5A', '#3A2430'],
  night: ['#070C1E', '#0F1A38', '#0E1628'],
  ramadan: ['#0A1230', '#1A1E4A', '#20183A'],
  eid: ['#1A1440', '#3A1E5A', '#2A1438'],
  fullmoon: ['#0E1830', '#18254A', '#0E1628'],
  friday: ['#1E5A4E', '#2A5A44', '#173F36'],
  qadr: ['#060A24', '#141A48', '#1A1440'],
  dhulhijjah: ['#3A2A1A', '#6A4A2A', '#3A2A1E'],
  arafah: ['#5A3A2A', '#A0603A', '#4A2A1E'],
  ashura: ['#0A1E3A', '#123A5A', '#0E2A40'],
  newyear: ['#08102A', '#1A2050', '#141638'],
  moon: ['#1A2048', '#4A3A5A', '#2A2030'],
  travel: ['#2A4A5A', '#5A6A5A', '#3A3A2A'],
  chandraat: ['#0A0A2A', '#2A1A4A', '#1A1030'],
  shabebarat: ['#0A0C24', '#1A1838', '#120E24'],
};
const LIGHT_SKIES = {
  day: ['#CDE8EE', '#E6F1EE', '#F4EEE2'],
  sunset: ['#E8C8D8', '#F6D2B8', '#F6EADC'],
  night: ['#C9D2EE', '#DCE2F2', '#EEF0F4'],
  ramadan: ['#D4D8F0', '#E6E2F2', '#F2EEE6'],
  eid: ['#E2D4F2', '#F2DCE8', '#F6EEE6'],
  fullmoon: ['#D4DCF0', '#E4E8F4', '#F0F0F2'],
  friday: ['#D2EADF', '#E8F1E6', '#F4EEE2'],
  qadr: ['#CCD0EE', '#DCDCF2', '#EEEAF2'],
  dhulhijjah: ['#F0DCC0', '#F4E6D0', '#F6EEE2'],
  arafah: ['#F4D2B8', '#F6E0CC', '#F6EEE2'],
  ashura: ['#CCE0EE', '#DEEAF2', '#EEF2F2'],
  newyear: ['#D0D6F0', '#E0E2F4', '#F0EEF2'],
  moon: ['#D8D6EE', '#EAD8E2', '#F4ECE6'],
  travel: ['#D2E4EA', '#E6ECE4', '#F2EEE2'],
  chandraat: ['#D6D2EE', '#E8DCF0', '#F4EEF2'],
  shabebarat: ['#D2D4EC', '#E2E0F0', '#F0EEF2'],
};

function Cloud({ y, w, dur, delay, op, color, width }) {
  const v = useAnim((x) => Animated.loop(Animated.timing(x, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: ND })), [dur], true);
  // start part-way across so the sky isn't empty at first
  const start = (delay % dur) / dur;
  const h = w * 0.46;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: y, left: 0, opacity: op, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-w + (width + w) * start, width + 20 + (width + w) * start] }) }] }}>
      <Animated.View style={{ transform: [{ translateX: 0 }] }}>
        <Svg width={w} height={h}>
          <Defs>
            <RadialGradient id={`cg${w}`} cx="0.5" cy="0.6" r="0.6"><Stop offset="0" stopColor={color} stopOpacity="1" /><Stop offset="0.8" stopColor={color} stopOpacity="0.85" /><Stop offset="1" stopColor={color} stopOpacity="0" /></RadialGradient>
          </Defs>
          <Ellipse cx={w * 0.28} cy={h * 0.62} rx={w * 0.24} ry={h * 0.28} fill={`url(#cg${w})`} />
          <Ellipse cx={w * 0.46} cy={h * 0.42} rx={w * 0.22} ry={h * 0.36} fill={`url(#cg${w})`} />
          <Ellipse cx={w * 0.68} cy={h * 0.58} rx={w * 0.26} ry={h * 0.3} fill={`url(#cg${w})`} />
          <Ellipse cx={w * 0.5} cy={h * 0.74} rx={w * 0.44} ry={h * 0.2} fill={`url(#cg${w})`} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
// Soft round lights drifting slowly, like the blurred lights in the design.
function Bokeh({ x, y, r, color, dur, delay, on }) {
  const v = useAnim((a) => swing(a, dur), [], on);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x - r, top: y - r, opacity: on ? v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }) : 0.6, transform: [{ translateY: on ? v.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) : 0 }, { translateX: on ? v.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) : 0 }] }}>
      <Svg width={r * 2} height={r * 2}>
        <Defs><RadialGradient id={`bk${Math.round(r)}${Math.round(x)}`}><Stop offset="0" stopColor={color} stopOpacity="0.8" /><Stop offset="0.55" stopColor={color} stopOpacity="0.3" /><Stop offset="1" stopColor={color} stopOpacity="0" /></RadialGradient></Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#bk${Math.round(r)}${Math.round(x)})`} />
      </Svg>
    </Animated.View>
  );
}

function Stars({ width, height, on, light }) {
  const tw = useAnim((x) => swing(x, 2200), [], on);
  const pts = useMemo(() => Array.from({ length: 46 }, (_, i) => ({ x: ((i * 61) % 100) / 100 * width, y: ((i * 37) % 100) / 100 * height * 0.62, r: i % 7 === 0 ? 1.5 : i % 3 ? 0.8 : 1.1, g: i % 2 })), [width, height]);
  const col = light ? '#A8741A' : '#FFFFFF';
  const half = (g) => (
    <Svg width={width} height={height} style={{ position: 'absolute' }}>
      {pts.filter((p) => p.g === g).map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={col} opacity={0.85} />)}
    </Svg>
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      <Animated.View style={{ position: 'absolute', opacity: on ? tw.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) : 0.7 }}>{half(0)}</Animated.View>
      <Animated.View style={{ position: 'absolute', opacity: on ? tw.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) : 0.7 }}>{half(1)}</Animated.View>
    </View>
  );
}

// Small culture animations.
function Kite({ x, y, size, color, tail, dur, on, height }) {
  const v = useAnim((a) => swing(a, dur), [], on);
  const sh = Math.max(40, (height || 300) - y);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }, { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }] }}>
      {/* the long string down towards the ground */}
      <Svg width={size * 3} height={sh} style={{ position: 'absolute', left: size / 2 - 1, top: size * 1.2 }}>
        <Path d={`M1 0 Q${size * 1.6} ${sh * 0.45} ${size * 0.6} ${sh}`} stroke="rgba(255,255,255,0.35)" strokeWidth={0.8} fill="none" />
      </Svg>
      <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-9deg', '9deg'] }) }] }}>
        <Svg width={size} height={size * 2.4} viewBox="0 0 20 48">
          <Path d="M10 0L19 11L10 24L1 11Z" fill={color} />
          <Path d="M10 0L19 11L10 11Z" fill="#FFFFFF" opacity={0.18} />
          <Path d="M10 0V24M1 11H19" stroke="rgba(255,255,255,0.55)" strokeWidth={0.6} />
          <Path d="M10 24Q6 30 10 36T10 48" stroke="rgba(255,255,255,0.6)" strokeWidth={0.7} fill="none" />
          <Path d="M8 30l4 2-4 2z M8 39l4 2-4 2z" fill={tail} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
function Riser({ x, from, to, size, dur, delay, on, kind, color }) {
  const v = useAnim((a) => loop(a, dur, delay), [], on);
  if (!on) return null;
  const shape = kind === 'lantern' ? (
    <Svg width={size} height={size * 1.5} viewBox="0 0 20 30">
      <Circle cx={10} cy={16} r={10} fill={color} opacity={0.25} />
      <Path d="M5 6h10l3 5v10l-3 5H5l-3-5V11z" fill={color} opacity={0.85} />
      <Ellipse cx={10} cy={16} rx={2.5} ry={4} fill="#FFF3C0" />
    </Svg>
  ) : kind === 'petal' ? (
    <Svg width={size} height={size}><Path d={`M${size / 2} 0Q${size} ${size / 2} ${size / 2} ${size}Q0 ${size / 2} ${size / 2} 0Z`} fill={color} /></Svg>
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
  );
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x, top: from,
        opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.6, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, to - from] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, kind === 'dust' ? 30 : 8, kind === 'dust' ? 60 : 0] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', kind === 'petal' ? '200deg' : '0deg'] }) },
        ],
      }}
    >
      {shape}
    </Animated.View>
  );
}
function Firework({ x, y, r, color, delay, on }) {
  const v = useAnim((a) => loop(a, 2600, delay, Easing.out(Easing.quad)), [], on);
  if (!on) return null;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x - r, top: y - r, opacity: v.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.5, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>
      <Svg width={r * 2} height={r * 2}>
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return <Circle key={i} cx={r + Math.cos(a) * r * 0.85} cy={r + Math.sin(a) * r * 0.85} r={1.8} fill={color} />;
        })}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + 0.3;
          return <Circle key={`b${i}`} cx={r + Math.cos(a) * r * 0.5} cy={r + Math.sin(a) * r * 0.5} r={1.2} fill="#FFF3C0" />;
        })}
      </Svg>
    </Animated.View>
  );
}
function HangingLantern({ x, len, color, dur, on }) {
  const v = useAnim((a) => swing(a, dur), [], on);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x - 12, top: 0, transform: [{ translateY: -len / 2 }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) }, { translateY: len / 2 }] }}>
      <Svg width={24} height={len + 34}>
        <Path d={`M12 0V${len}`} stroke={color} strokeWidth={0.8} />
        <Path d={`M7 ${len}h10l-2 -4h-6z`} fill={color} />
        <Circle cx={12} cy={len + 15} r={13} fill={color} opacity={0.18} />
        <Path d={`M5 ${len}h14l3 6v10l-3 6H5l-3-6V${len + 6}z`} fill={color} opacity={0.8} />
        <Ellipse cx={12} cy={len + 14} rx={3} ry={5} fill="#FFF3C0" />
        <Path d={`M8 ${len + 22}l4 6 4-6z`} fill={color} />
      </Svg>
    </Animated.View>
  );
}


function Waves({ width, height, on, light }) {
  const v = useAnim((a) => loop(a, 5000), [], on);
  const w = width + 80;
  const d = (y, amp) => {
    let s = `M0 ${y}`;
    for (let x = 0; x <= w; x += 40) s += ` q10 ${-amp} 20 0 t20 0`;
    return `${s} V${height} H0Z`;
  };
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: height * 0.62, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }] }}>
      <Svg width={w} height={height * 0.4}>
        <Path d={d(height * 0.05, 5)} fill="#4A8AC8" opacity={light ? 0.3 : 0.25} />
        <Path d={d(height * 0.11, 4)} fill="#3A70B0" opacity={light ? 0.35 : 0.3} />
        <Path d={d(height * 0.17, 3)} fill="#2A5A98" opacity={light ? 0.4 : 0.35} />
      </Svg>
    </Animated.View>
  );
}
function Dunes({ width, height, light, color }) {
  const c = color || (light ? '#E2C89A' : '#3A2A1A');
  return (
    <Svg width={width} height={height} style={{ position: 'absolute' }} pointerEvents="none">
      <Path d={`M0 ${height * 0.72} Q${width * 0.25} ${height * 0.62} ${width * 0.5} ${height * 0.7} T${width} ${height * 0.66} V${height} H0Z`} fill={c} opacity={0.5} />
      <Path d={`M0 ${height * 0.8} Q${width * 0.4} ${height * 0.7} ${width * 0.7} ${height * 0.79} T${width} ${height * 0.76} V${height} H0Z`} fill={c} opacity={0.7} />
    </Svg>
  );
}
function Mount({ width, height, light }) {
  return (
    <Svg width={width} height={height} style={{ position: 'absolute' }} pointerEvents="none">
      <Path d={`M0 ${height * 0.82} L${width * 0.28} ${height * 0.55} L${width * 0.36} ${height * 0.6} L${width * 0.46} ${height * 0.5} L${width * 0.72} ${height * 0.78} L${width} ${height * 0.84} V${height} H0Z`} fill={light ? '#B89A7A' : '#2A2018'} opacity={0.7} />
      <Path d={`M${width * 0.455} ${height * 0.5} v${-height * 0.06}`} stroke={light ? '#8A6A4A' : '#F3EEDC'} strokeWidth={3} />
    </Svg>
  );
}
function ShootingStar({ width, height, delay, on }) {
  const v = useAnim((a) => loop(a, 5200, delay, Easing.out(Easing.quad)), [], on);
  if (!on) return null;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: width * 0.6, top: height * 0.08,
      opacity: v.interpolate({ inputRange: [0, 0.05, 0.18, 0.25, 1], outputRange: [0, 1, 1, 0, 0] }),
      transform: [{ translateX: v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, -width * 0.4, -width * 0.4] }) }, { translateY: v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, height * 0.2, height * 0.2] }) }, { rotate: '-27deg' }] }}>
      <Svg width={70} height={4}><Rect x={0} y={1} width={70} height={2} rx={1} fill="#FFFFFF" opacity={0.85} /></Svg>
    </Animated.View>
  );
}
function BigCrescent({ x, y, r, glow }) {
  return (
    <Svg width={r * 4} height={r * 4} style={{ position: 'absolute', left: x - r * 2, top: y - r * 2 }} pointerEvents="none">
      <Defs><RadialGradient id="bcG"><Stop offset="0" stopColor="#FFF1C8" stopOpacity={glow} /><Stop offset="1" stopColor="#FFF1C8" stopOpacity="0" /></RadialGradient></Defs>
      <Circle cx={r * 2} cy={r * 2} r={r * 2} fill="url(#bcG)" />
      <Path d={`M${r * 2.3} ${r * 1.05} A${r} ${r} 0 1 0 ${r * 2.3} ${r * 2.95} A${r * 0.82} ${r * 0.82} 0 1 1 ${r * 2.3} ${r * 1.05} Z`} fill="#FFF1C8" />
    </Svg>
  );
}
function Diyas({ width, height, on }) {
  const v = useAnim((a) => swing(a, 700), [], on);
  const n = 7;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: height * 0.84, width, height: 30, flexDirection: 'row', justifyContent: 'space-around' }}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ alignItems: 'center' }}>
          <Animated.View style={{ width: 6, height: 10, borderRadius: 5, backgroundColor: '#FFD27A', opacity: on ? v.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? [0.7, 1] : [1, 0.7] }) : 1, shadowColor: '#FFB04A', shadowOpacity: 0.9, shadowRadius: 8 }} />
          <View style={{ width: 16, height: 6, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: '#B5623A' }} />
        </View>
      ))}
    </View>
  );
}
function FairyLights({ width, height, on }) {
  const v = useAnim((a) => swing(a, 900), [], on);
  const cols = ['#FF7BA8', '#7BE0FF', '#9BFF8A', '#FFB36B', '#FFD86B'];
  const pts = Array.from({ length: 16 }, (_, i) => { const x = (i / 15) * width; return [x, height * 0.06 + Math.sin((i / 15) * Math.PI) * 18]; });
  const half = (g) => (
    <Svg width={width} height={60} style={{ position: 'absolute' }}>
      {pts.filter((_, i) => i % 2 === g).map(([x, y], i) => <Circle key={i} cx={x} cy={y + 3} r={2.6} fill={cols[(i * 2 + g) % cols.length]} />)}
    </Svg>
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      <Svg width={width} height={60} style={{ position: 'absolute' }}><Path d={pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')} stroke="rgba(255,255,255,0.3)" strokeWidth={0.8} fill="none" /></Svg>
      <Animated.View style={{ opacity: on ? v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) : 1 }}>{half(0)}</Animated.View>
      <Animated.View style={{ position: 'absolute', opacity: on ? v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) : 1 }}>{half(1)}</Animated.View>
    </View>
  );
}

// Lit windows that glow and dim (the landmark's gold shapes, drawn on top).
function Windows({ xml, width, height, on }) {
  const v = useAnim((a) => swing(a, 1600), [], on);
  return (
    <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity: on ? v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) : 0.6 }}>
      <SvgXml xml={`<svg viewBox="0 280 300 240">${xml}</svg>`} width={width} height={height} />
    </Animated.View>
  );
}

const CULT_FX = {
  bd: { kind: 'kite', colors: ['#3FB27F', '#3A9AE8', '#F2C230', '#E85A9A', '#F2C230'] },
  pak: { kind: 'kite', colors: ['#2A9A5A', '#F2C230', '#E8483A'] },
  in: { kind: 'petal', colors: ['#F6F2E8', '#F2D24A'] },
  tr: { kind: 'petal', colors: ['#E8483A', '#E85A9A'] },
  eg: { kind: 'lantern', colors: ['#E8A020', '#E8483A'] },
  ma: { kind: 'dust', colors: ['rgba(240,200,140,0.7)'] },
  gulf: { kind: 'dust', colors: ['rgba(240,210,160,0.7)'] },
  lev: { kind: 'petal', colors: ['#F6F2E8', '#B3E0A0'] },
  id: { kind: 'petal', colors: ['#8AC85A', '#F2D24A'] },
  ir: { kind: 'ember', colors: ['#FF9A4A', '#FFD27A'] },
  uz: { kind: 'leaf', colors: ['#C8A040', '#8AB04A', '#D8783A'] },
  wa: { kind: 'dust', colors: ['rgba(240,200,140,0.75)'] },
  ps: { kind: 'petal', colors: ['#FFFFFF', '#F6F2E8'] },
};

// kind: 'day' | 'sunset' | 'night'; occasion: null | 'ramadan' | 'eid' | 'fullmoon'
export function HomeScene({ width, height, kind, occasion, sky, culture, arch }) {
  const th = useTheme();
  const on = !!th.fx;
  const L = th.isLight;
  const key = occasion || kind;
  const c = (L ? LIGHT_SKIES : SKIES)[key] || SKIES.day;
  const nightish = kind === 'night' || ['ramadan', 'eid', 'fullmoon', 'qadr', 'newyear', 'chandraat', 'shabebarat'].includes(occasion);
  const cloudC = L ? '#FFFFFF' : kind === 'sunset' ? '#F2C8C0' : nightish ? '#8A96C0' : '#E6F0F0';
  const fx = culture && CULT_FX[culture];
  const land = culture && LANDMARKS[culture];
  const landH = width * (240 / 300);
  const sun = sky || null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden' }}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="hsSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c[0]} />
            <Stop offset="0.55" stopColor={c[1]} />
            <Stop offset="0.85" stopColor={c[2]} />
            <Stop offset="1" stopColor={th.bg} />
          </LinearGradient>
          <RadialGradient id="hsGlow" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={kind === 'sunset' ? '#FFB46A' : nightish ? '#E8ECF8' : '#FFF4D0'} stopOpacity={L ? 0.6 : 0.6} />
            <Stop offset="0.35" stopColor={kind === 'sunset' ? '#FFB46A' : nightish ? '#E8ECF8' : '#FFF4D0'} stopOpacity={L ? 0.25 : 0.22} />
            <Stop offset="1" stopColor={kind === 'sunset' ? '#FFB46A' : '#FFF4D0'} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#hsSky)" />
        {/* sun or moon, top right */}
        <Circle cx={width * 0.8} cy={kind === 'sunset' ? height * 0.42 : height * 0.2} r={occasion === 'fullmoon' ? 100 : sun && sun.kind === 'sun' ? 95 : 70} fill="url(#hsGlow)" />
        {sun && sun.kind === 'sun' ? <Circle cx={width * 0.8} cy={kind === 'sunset' ? height * 0.42 : height * 0.2} r={40} fill="url(#hsGlow)" /> : null}
        {sun ? <SkyBody cx={width * 0.8} cy={kind === 'sunset' ? height * 0.42 : height * 0.2} r={occasion === 'fullmoon' ? 26 : sun.kind === 'sun' ? 26 : 18} sky={sun} color={sun.kind === 'sun' ? (kind === 'sunset' ? '#FFC27A' : '#FFF1C8') : '#F3EEDC'} /> : null}
      </Svg>
      {nightish ? <Stars width={width} height={height} on={on} light={L} /> : null}
      {!nightish || kind === 'night' ? (
        <>
          <Cloud y={height * 0.1} w={150} dur={60000} delay={8000} op={L ? 0.75 : 0.42} color={cloudC} width={width} />
          <Cloud y={height * 0.24} w={110} dur={80000} delay={45000} op={L ? 0.65 : 0.32} color={cloudC} width={width} />
          <Cloud y={height * 0.04} w={90} dur={95000} delay={70000} op={L ? 0.55 : 0.26} color={cloudC} width={width} />
          <Cloud y={height * 0.38} w={130} dur={110000} delay={20000} op={L ? 0.5 : 0.22} color={cloudC} width={width} />
        </>
      ) : null}
      {[[0.15, 0.3, 46], [0.55, 0.12, 34], [0.9, 0.52, 40], [0.35, 0.58, 30], [0.7, 0.4, 26], [0.08, 0.6, 22]].map(([x, y, r], i) => (
        <Bokeh key={i} x={width * x} y={height * y} r={r} color={nightish ? '#C8D2FF' : kind === 'sunset' ? '#FFC89A' : '#FFF4D0'} dur={3400 + i * 700} on={on} />
      ))}
      {/* the culture's landmark, low behind the arch */}
      {land && (!occasion || occasion === 'friday') ? (
        <View style={{ position: 'absolute', left: 0, top: height - 120 - landH, opacity: L ? 0.13 : 0.32 }}>
          <SvgXml xml={`<svg viewBox="0 280 300 240">${land}</svg>`} width={width} height={landH} />
          {windowsOf(land) ? <Windows xml={windowsOf(land)} width={width} height={landH} on={on} /> : null}
        </View>
      ) : null}
      {/* culture animation */}
      {fx && !occasion && fx.kind === 'kite' ? (
        <>
          <Kite x={width * 0.06} y={height * 0.2} size={22} color={fx.colors[0]} tail={fx.colors[2]} dur={2600} on={on} height={height} />
          <Kite x={width * 0.24} y={height * 0.3} size={18} color={fx.colors[1]} tail={fx.colors[0]} dur={3100} on={on} height={height} />
          <Kite x={width * 0.47} y={height * 0.24} size={19} color={fx.colors[2]} tail={fx.colors[1]} dur={2800} on={on} height={height} />
          <Kite x={width * 0.66} y={height * 0.12} size={21} color={fx.colors[3] || fx.colors[0]} tail={fx.colors[2]} dur={3300} on={on} height={height} />
          <Kite x={width * 0.84} y={height * 0.36} size={17} color={fx.colors[4] || fx.colors[1]} tail={fx.colors[0]} dur={2400} on={on} height={height} />
        </>
      ) : null}
      {fx && !occasion && fx.kind !== 'kite' ? Array.from({ length: fx.kind === 'ember' ? 12 : 8 }, (_, i) => (
        <Riser key={i} on={on} kind={fx.kind === 'leaf' ? 'petal' : fx.kind === 'ember' ? 'dot' : fx.kind} color={fx.colors[i % fx.colors.length]}
          x={(i * 47) % (width - 20)} size={fx.kind === 'lantern' ? 12 : fx.kind === 'dust' ? 3 : fx.kind === 'ember' ? 3.5 : 7}
          from={fx.kind === 'lantern' || fx.kind === 'ember' ? height * 0.9 : fx.kind === 'dust' ? height * (0.3 + (i % 4) * 0.12) : -10}
          to={fx.kind === 'lantern' || fx.kind === 'ember' ? height * 0.1 : fx.kind === 'dust' ? height * (0.3 + (i % 4) * 0.12) : height * 0.9}
          dur={fx.kind === 'dust' ? 9000 : 12000 + (i % 3) * 3000} delay={i * 1500} />
      )) : null}
      {/* Other occasions */}
      {occasion === 'friday' ? Array.from({ length: 9 }, (_, i) => <Riser key={`f${i}`} on={on} kind="dot" color={L ? '#C9902E' : '#F3D27A'} x={(i * 43 + 10) % (width - 10)} size={3} from={height * 0.92} to={height * 0.1} dur={11000 + (i % 3) * 2000} delay={i * 1300} />) : null}
      {occasion === 'qadr' ? (
        <>
          <ShootingStar width={width} height={height} delay={800} on={on} />
          <ShootingStar width={width * 0.7} height={height} delay={3400} on={on} />
          {Array.from({ length: 8 }, (_, i) => <Riser key={`q${i}`} on={on} kind="dot" color="#FFF1C8" x={(i * 53 + 15) % (width - 10)} size={4} from={height * 0.95} to={height * 0.05} dur={13000 + (i % 3) * 2500} delay={i * 1600} />)}
        </>
      ) : null}
      {occasion === 'dhulhijjah' ? <Dunes width={width} height={height} light={L} /> : null}
      {occasion === 'arafah' ? <Mount width={width} height={height} light={L} /> : null}
      {occasion === 'ashura' ? <Waves width={width} height={height} on={on} light={L} /> : null}
      {occasion === 'newyear' ? (
        <>
          <BigCrescent x={width * 0.2} y={height * 0.26} r={20} glow={0.4} />
          <ShootingStar width={width} height={height} delay={1500} on={on} />
        </>
      ) : null}
      {occasion === 'moon' ? <BigCrescent x={width * 0.18} y={height * 0.55} r={12} glow={0.6} /> : null}
      {occasion === 'travel' ? <Dunes width={width} height={height} light={L} color={L ? '#B8C8A8' : '#2A3A2A'} /> : null}
      {occasion === 'chandraat' ? (
        <>
          <FairyLights width={width} height={height} on={on} />
          <BigCrescent x={width * 0.18} y={height * 0.3} r={14} glow={0.6} />
          {[[0.75, 0.2, 26, '#FF7BA8', 400], [0.55, 0.36, 22, '#7BE0FF', 1500]].map(([x, y, r, col, d], i) => <Firework key={i} x={width * x} y={height * y} r={r} color={col} delay={d} on={on} />)}
        </>
      ) : null}
      {occasion === 'shabebarat' ? <Diyas width={width} height={height} on={on} /> : null}
      {/* Ramadan: two lanterns hanging from the top and a few rising */}
      {occasion === 'ramadan' ? (
        <>
          <HangingLantern x={width * 0.12} len={height * 0.18} color="#E8A020" dur={2600} on={on} />
          <HangingLantern x={width * 0.9} len={height * 0.1} color="#C9A04E" dur={3000} on={on} />
          {Array.from({ length: 5 }, (_, i) => <Riser key={i} on={on} kind="lantern" color={['#E8A020', '#E8483A', '#C9A04E'][i % 3]} x={(i * 71 + 20) % (width - 20)} size={10} from={height * 0.95} to={height * 0.15} dur={14000 + i * 1800} delay={i * 2600} />)}
        </>
      ) : null}
      {/* Eid: fireworks and falling confetti */}
      {occasion === 'eid' ? (
        <>
          {[[0.18, 0.18, 34, '#F2C230', 0], [0.78, 0.12, 40, '#E85A9A', 900], [0.55, 0.3, 28, '#7BE0FF', 1700], [0.12, 0.42, 26, '#9BFF8A', 2300]].map(([x, y, r, col, d], i) => (
            <Firework key={i} x={width * x} y={height * y} r={r} color={col} delay={d} on={on} />
          ))}
          {Array.from({ length: 10 }, (_, i) => <Riser key={`c${i}`} on={on} kind="petal" color={['#F2C230', '#E85A9A', '#7BE0FF', '#9BFF8A'][i % 4]} x={(i * 37) % (width - 10)} size={6} from={-10} to={height * 0.95} dur={8000 + (i % 4) * 1500} delay={i * 700} />)}
        </>
      ) : null}
    </View>
  );
}
