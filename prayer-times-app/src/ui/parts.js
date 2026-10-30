import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Path, Circle, Line, G, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useT, Serif, Body, Label, Press, IconBtn, Arabic, F } from './kit';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/* ------------------------------ Arch ------------------------------ */
export function archGeometry(W, H, s = 3) {
  const x0 = s;
  const x1 = W - s;
  const top = s;
  const bottom = H - s;
  const r = (x1 - x0) / 2;
  const cx = W / 2;
  const d = `M${cx} ${bottom} L${x0} ${bottom} L${x0} ${top + r} A${r} ${r} 0 0 1 ${x1} ${top + r} L${x1} ${bottom} Z`;
  const length = (x1 - x0) + 2 * (bottom - top - r) + Math.PI * r;
  return { d, length };
}

// The mihrab arch with a thin timer line that runs clockwise from the bottom
// middle and completes exactly at the next prayer.
export function Arch({ width, height, progress, cycleKey, children, onPress }) {
  const th = useTheme();
  const { d, length } = useMemo(() => archGeometry(width, height), [width, height]);
  const p = useRef(new Animated.Value(progress)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const lastKey = useRef(cycleKey);
  useEffect(() => {
    if (lastKey.current !== cycleKey) {
      // a prayer time just arrived: finish the line, flash, start again
      lastKey.current = cycleKey;
      Animated.sequence([
        Animated.timing(p, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(flash, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.timing(flash, { toValue: 0, duration: 420, useNativeDriver: false }),
      ]).start(() => {
        p.setValue(0);
        Animated.timing(p, { toValue: progress, duration: 600, useNativeDriver: false }).start();
      });
      return;
    }
    Animated.timing(p, { toValue: progress, duration: 1000, easing: Easing.linear, useNativeDriver: false, isInteraction: false }).start();
  }, [progress, cycleKey]);
  const offset = p.interpolate({ inputRange: [0, 1], outputRange: [length, 0] });
  const content = (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Path d={d} fill={th.card} />
        <Path d={d} fill="none" stroke={th.isLight ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)'} strokeWidth={2.5} />
        <AnimatedPath d={d} fill="none" stroke={th.isLight || th.prohibited ? (th.isLight ? '#FFE9C9' : th.accent) : th.accent} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={`${length} ${length}`} strokeDashoffset={offset} />
        <AnimatedPath d={d} fill="none" stroke="#FFFFFF" strokeWidth={6} opacity={flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] })} />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: width * 0.2, bottom: 0, alignItems: 'center' }}>{children}</View>
    </View>
  );
  return onPress ? <Press onPress={onPress} scaleTo={0.985}>{content}</Press> : content;
}

/* ---------------------------- Crescent ---------------------------- */
// Crescent path built from two circles (outer minus inner), no masks needed.
export function crescentPath(cx, cy, r, dx = 0.42, dy = -0.22, k = 0.82) {
  const x2 = cx + r * dx;
  const y2 = cy + r * dy;
  const r2 = r * k;
  const dd = Math.hypot(x2 - cx, y2 - cy);
  const a = (r * r - r2 * r2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(r * r - a * a);
  const ux = (x2 - cx) / dd;
  const uy = (y2 - cy) / dd;
  const px = cx + a * ux;
  const py = cy + a * uy;
  const p1 = [px + h * uy, py - h * ux];
  const p2 = [px - h * uy, py + h * ux];
  return `M${p1[0]} ${p1[1]} A${r} ${r} 0 1 0 ${p2[0]} ${p2[1]} A${r2} ${r2} 0 1 1 ${p1[0]} ${p1[1]} Z`;
}
export const STAR8 = 'M50 6 L61 24 L82 18 L76 39 L94 50 L76 61 L82 82 L61 76 L50 94 L39 76 L18 82 L24 61 L6 50 L24 39 L18 18 L39 24 Z';
export function MoonMark({ size = 96, color, bg }) {
  const th = useTheme();
  const c = color || th.accent;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {bg ? <Path d="M0 0H120V120H0Z" fill={bg} /> : null}
      <Path d={crescentPath(54, 62, 34)} fill={c} />
      <G transform={`translate(${76 - 50 * 0.14},${50 - 50 * 0.14}) scale(0.14)`}>
        <Path d={STAR8} fill={c} />
      </G>
    </Svg>
  );
}

/* ----------------------------- Tab bar ----------------------------- */
export const TABS = [
  { id: 'Prayers', icon: 'clock' },
  { id: 'Qibla', icon: 'compass' },
  { id: 'Hijri', icon: 'calendar' },
  { id: 'Ibadah', icon: 'book-open' },
  { id: 'Settings', icon: 'settings' },
];
export function TabBar({ active, onChange }) {
  const th = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const idx = TABS.findIndex((x) => x.id === active);
  const x = useRef(new Animated.Value(idx)).current;
  const [w, setW] = React.useState(0);
  useEffect(() => {
    Animated.spring(x, { toValue: idx, useNativeDriver: Platform.OS !== 'web', speed: 20, bounciness: 5 }).start();
  }, [idx]);
  const seg = w / TABS.length;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 10, alignItems: 'center' }}>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={{
          width: '92%', maxWidth: 460, height: 62, borderRadius: 31, flexDirection: 'row', alignItems: 'center',
          backgroundColor: th.isLight ? 'rgba(255,255,255,0.88)' : th.sheet, borderWidth: 1, borderColor: th.line,
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
        }}
      >
        {w > 0 && (
          <Animated.View
            style={{
              position: 'absolute', left: seg / 2 - 22, width: 44, height: 44, top: 8, borderRadius: 22, backgroundColor: th.accentSoft,
              transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, seg] }) }],
            }}
          />
        )}
        {TABS.map((tab) => {
          const on = tab.id === active;
          return (
            <Press key={tab.id} onPress={() => onChange(tab.id)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 62 }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t(tab.id)} scaleTo={0.9}>
              <Feather name={tab.icon} size={19} color={on ? th.accent : th.faint} />
              <Body size={9.5} weight={on ? 'semi' : 'med'} color={on ? th.accent : th.faint} style={{ marginTop: 3, lineHeight: 12 }} numberOfLines={1}>{t(tab.id)}</Body>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------- Screen header ------------------------- */
export function ScreenTitle({ title, arabic, sub, onBack, right }) {
  const th = useTheme();
  return (
    <View style={{ marginBottom: 6 }}>
      {onBack ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <IconBtn name="chevron-left" onPress={onBack} label="Back" />
          {right || null}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', flexShrink: 1 }}>
          <Serif size={30}>{title}</Serif>
          {arabic ? <Arabic size={20} color={th.accent} style={{ marginLeft: 8, lineHeight: 34 }}>{arabic}</Arabic> : null}
        </View>
        {!onBack && right ? right : null}
      </View>
      {sub ? <Body size={12.5} color={th.muted} style={{ marginTop: 2 }}>{sub}</Body> : null}
    </View>
  );
}

/* ---------------------- Sun-path band arc ---------------------- */
// A sun (day) or moon (night) travelling along an arc between two times.
export function SunArc({ progress, night, width = 300, height = 52, strong, muted }) {
  const th = useTheme();
  const p = Math.max(0, Math.min(1, progress));
  const x0 = 8;
  const x1 = width - 8;
  const y0 = height - 6;
  const cy = -height * 0.75;
  // Quadratic bezier point at t
  const qx = (t) => (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * (width / 2) + t * t * x1;
  const qy = (t) => (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y0;
  const steps = 30;
  let done = `M${x0} ${y0}`;
  for (let i = 1; i <= steps; i++) {
    const tt = (p * i) / steps;
    done += ` L${qx(tt).toFixed(1)} ${qy(tt).toFixed(1)}`;
  }
  const sx = qx(p);
  const sy = qy(p);
  const dotColor = muted ? th.faint : night ? th.ink : th.sun;
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={`M${x0} ${y0} Q${width / 2} ${cy} ${x1} ${y0}`} fill="none" stroke={th.line} strokeWidth={2} strokeDasharray="3 5" />
      <Path d={done} fill="none" stroke={muted ? th.faint : th.accent} strokeWidth={muted ? 1.5 : strong ? 3.5 : 2.5} strokeLinecap="round" />
      <Circle cx={sx} cy={sy} r={strong ? 14 : 10} fill={dotColor} opacity={0.22} />
      {night ? (
        <Path d={crescentPath(sx, sy, strong ? 8 : 6)} fill={dotColor} />
      ) : (
        <Circle cx={sx} cy={sy} r={strong ? 8 : 6} fill={dotColor} />
      )}
    </Svg>
  );
}

/* --------------------------- Moon phase --------------------------- */
// The moon as it looks on the night of Hijri day `hDay` (1 = thin crescent,
// 14–15 = full). `fill` colours the lit part.
export function moonPhasePath(hDay, size) {
  const f = (hDay - 0.5) / 29.53;
  const r = size / 2 - 3;
  const cx = size / 2;
  const cy = size / 2;
  const rx = Math.abs(r * Math.cos(2 * Math.PI * f));
  if (f < 0.5) return `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} A${rx} ${r} 0 0 ${f < 0.25 ? 0 : 1} ${cx} ${cy - r}Z`;
  return `M${cx} ${cy - r} A${r} ${r} 0 0 0 ${cx} ${cy + r} A${rx} ${r} 0 0 ${f > 0.75 ? 1 : 0} ${cx} ${cy - r}Z`;
}
export function MoonPhase({ hDay, size = 38, fill, ring, selected }) {
  const th = useTheme();
  const r = size / 2 - 3;
  return (
    <Svg width={size} height={size}>
      {selected ? <Circle cx={size / 2} cy={size / 2} r={r + 2.2} fill="none" stroke={th.ink} strokeWidth={2} /> : null}
      <Circle cx={size / 2} cy={size / 2} r={r} fill={th.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.45)'} stroke={ring && !selected ? ring : th.line} strokeWidth={ring && !selected ? 2 : 1} />
      <Path d={moonPhasePath(hDay, size)} fill={fill || th.muted} />
    </Svg>
  );
}

/* --------------------------- Qibla dial --------------------------- */
const pol = (cx, cy, r, ang) => {
  const a = (ang * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
};
function arcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = pol(cx, cy, r, a0);
  const [x1, y1] = pol(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 >= a0 ? 1 : 0;
  return `M${x0} ${y0} A${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
}
export function QiblaDial({ size, heading, qibla, state }) {
  // state: 'turn' | 'close' | 'aligned' | 'calibrate'
  const th = useTheme();
  const cx = size / 2;
  const cy = size / 2 + 12;
  const r = size / 2 - 34;
  let rel = qibla - heading;
  rel = ((rel + 540) % 360) - 180;
  const green = th.ok;
  const aligned = state === 'aligned';
  const dim = state === 'calibrate';
  const acc = aligned ? green : state === 'close' ? '#9BD8A8' : Math.abs(rel) > 30 ? th.amber : th.accent;
  const ticks = [];
  for (let d = 0; d < 360; d += 5) {
    const a = d - heading;
    const lg = d % 30 === 0;
    const [x0, y0] = pol(cx, cy, r, a);
    const [x1, y1] = pol(cx, cy, r - (lg ? 10 : 5), a);
    ticks.push(<Line key={d} x1={x0} y1={y0} x2={x1} y2={y1} stroke={th.faint} strokeWidth={lg ? 1.5 : 0.8} />);
  }
  const letters = [['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([L, d]) => {
    const [x, y] = pol(cx, cy, r - 24, d - heading);
    return (
      <SvgText key={L} x={x} y={y + 4.5} textAnchor="middle" fontFamily={F.sansBold} fontWeight="700" fontSize={13} fill={L === 'N' ? '#E26A5C' : th.ink} opacity={dim ? 0.45 : 1}>
        {L}
      </SvgText>
    );
  });
  const [kx, ky] = pol(cx, cy, r + 11, rel);
  return (
    <Svg width={size} height={size + 20}>
      {aligned ? <Circle cx={cx} cy={cy} r={r - 18} fill={green} opacity={0.12} /> : null}
      {ticks}
      {letters}
      {!dim && aligned ? <Circle cx={cx} cy={cy} r={r + 11} fill="none" stroke={green} strokeWidth={2} opacity={0.6} /> : null}
      {!dim && !aligned && Math.abs(rel) > 0.6 ? <Path d={arcPath(cx, cy, r + 11, 0, rel)} fill="none" stroke={acc} strokeWidth={5} strokeLinecap="round" /> : null}
      <Path d={`M${cx} ${cy - r - 24} l-8 -13 h16 z`} fill={aligned ? green : th.ink} opacity={dim ? 0.45 : 1} />
      <G opacity={dim ? 0.35 : 1}>
        <Circle cx={kx} cy={ky} r={15} fill={acc} />
        <Path d={`M${kx - 7} ${ky - 7} h14 v14 h-14 z`} fill="#111" />
        <Path d={`M${kx - 7} ${ky - 3.5} h14 v2.4 h-14 z`} fill="#E9C46A" />
      </G>
    </Svg>
  );
}

/* --------------------- Moon glow for onboarding --------------------- */
export function GlowMoon({ size = 160, color }) {
  const th = useTheme();
  const c = color || th.accent;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <RadialGradient id="g" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={c} stopOpacity="0.35" />
          <Stop offset="1" stopColor={c} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="60" cy="60" r="58" fill="url(#g)" />
      <Path d={crescentPath(56, 62, 32)} fill={c} />
      <G transform={`translate(${76 - 7},${48 - 7}) scale(0.14)`}>
        <Path d={STAR8} fill={c} />
      </G>
    </Svg>
  );
}

export function Stepper({ value, onMinus, onPlus, minusIcon = 'minus', plusIcon = 'plus' }) {
  const th = useTheme();
  const t = useT();
  const btn = (icon, onPress, label) => (
    <Press onPress={onPress} hitSlop={6} accessibilityLabel={label} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: th.line, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={icon} size={15} color={th.ink} />
    </Press>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {btn(minusIcon, onMinus, t('Less'))}
      <Serif bold size={16} style={{ minWidth: 22, textAlign: 'center' }}>{t.num(value)}</Serif>
      {btn(plusIcon, onPlus, t('More'))}
    </View>
  );
}

export { Label };
