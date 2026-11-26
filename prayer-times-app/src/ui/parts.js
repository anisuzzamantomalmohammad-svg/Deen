import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Path, Circle, Line, G, Rect, Ellipse, ClipPath, LinearGradient, Text as SvgText, Defs, RadialGradient, Stop, SvgXml } from 'react-native-svg';
import { LANDMARKS as LANDMARKS_A } from '../data/landmarks';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useT, Serif, Body, Label, Press, IconBtn, Arabic, F, ThemeCtx } from './kit';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/* ------------------------------ Arch ------------------------------ */
// A pointed mihrab arch. `d` is the closed shape, `line` the open outline
// (bottom left, over the top, bottom right) that the timer line follows.
const cub = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
};
export function archGeometry(W, H, s = 4) {
  const x0 = s;
  const x1 = W - s;
  const top = s;
  const bottom = H;
  const span = x1 - x0;
  const cx = W / 2;
  const sh = top + span * 0.558; // where the straight sides end
  const c1y = top + span * 0.297;
  const c2x = span * 0.225;
  const c2y = top + span * 0.152;
  const line = `M${x0} ${bottom} L${x0} ${sh} C${x0} ${c1y} ${x0 + c2x} ${c2y} ${cx} ${top} C${x1 - c2x} ${c2y} ${x1} ${c1y} ${x1} ${sh} L${x1} ${bottom}`;
  let curve = 0;
  let px = x0;
  let py = sh;
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    const x = cub(x0, x0, x0 + c2x, cx, t);
    const y = cub(sh, c1y, c2y, top, t);
    curve += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return { d: `${line} Z`, line, length: 2 * (bottom - sh) + 2 * curve, cx, top, sh, x0, x1 };
}

// Where the sun or moon sits inside the dome: `pos` 0..1 across its path.
function skyPoint(W, pos) {
  const x = W * (0.2 + 0.6 * pos);
  const y = W * (0.44 - 0.2 * Math.sin(Math.PI * pos));
  return [x, y];
}

// The sun (rays on a fasting day) or the moon in tonight's real shape, with
// a star on special nights. Drawn in white on dark palettes.
export function SkyBody({ cx, cy, r, sky, color, glow }) {
  if (!sky) return null;
  if (sky.kind === 'sun') {
    return (
      <G>
        {glow ? <Circle cx={cx} cy={cy} r={r * 3.6} fill="url(#skyGlow)" /> : null}
        <Circle cx={cx} cy={cy} r={r} fill={color} />
        {sky.rays ? Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          const r1 = r * 1.4;
          const r2 = r * (i % 2 ? 1.85 : 2.15);
          return <Line key={i} x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)} x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)} stroke={color} strokeOpacity={i % 2 ? 0.5 : 0.85} strokeWidth={Math.max(1, r * 0.13)} strokeLinecap="round" />;
        }) : null}
      </G>
    );
  }
  const size = r * 2 + 6;
  // moonPhasePath draws the northern-hemisphere view; flip it south of the equator
  const flip = sky.south ? `translate(${cx + size / 2} ${cy - size / 2}) scale(-1 1)` : `translate(${cx - size / 2} ${cy - size / 2})`;
  const litLeft = sky.south ? sky.hDay < 15 : sky.hDay >= 15;
  const sx = cx + (litLeft ? 1 : -1) * r * 1.75;
  const sy = cy - r * 1.05;
  const sr = r * (sky.star === 2 ? 0.34 : 0.27);
  return (
    <G>
      {glow ? <Circle cx={cx} cy={cy} r={r * 2.6} fill="url(#skyGlow)" /> : null}
      <Circle cx={cx} cy={cy} r={r} fill={color} opacity={0.14} />
      <G transform={flip}><Path d={moonPhasePath(sky.hDay, size)} fill={color} /></G>
      {sky.star ? (
        <G>
          {sky.star === 2 ? <Circle cx={sx} cy={sy} r={sr * 2.6} fill={color} opacity={0.18} /> : null}
          <Path d={`M${sx - sr} ${sy - sr} h${sr * 2} v${sr * 2} h${-sr * 2} Z`} fill={color} />
          <Path d={`M${sx} ${sy - sr * 1.414} L${sx + sr * 1.414} ${sy} L${sx} ${sy + sr * 1.414} L${sx - sr * 1.414} ${sy} Z`} fill={color} />
        </G>
      ) : null}
    </G>
  );
}

// The mihrab arch: a cream arch (1.6 look) with a timer that runs along its
// edge and completes at the next prayer. `timer`: 'inner' (a soft light along
// the inside edge) or 'line' (thin line). `inside`: 'niche' (a dashed mihrab
// line), 'lattice', 'glow' or 'plain'. Text inside gets the arch's own ink.
export function Arch({ width, height, progress, cycleKey, children, onPress, sky, timer = 'inner', inside = 'niche', scene = 'day', occasion = null, culture = null }) {
  const th = useTheme();
  const geo = useMemo(() => archGeometry(width, height), [width, height]);
  const inner = useMemo(() => archGeometry(width - 16, height - 8), [width, height]);
  const { d, line, length } = geo;
  const pts = useMemo(() => archPoints(geo, 240), [geo]);
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
  const lineColor = th.prohibited ? th.red : th.accent;
  const fill = th.card;
  const ink = th.cardInk;
  const fr = Math.max(3, width * 0.018);
  // the arch's own colours for the text inside it
  const archTheme = useMemo(() => ({
    ...th, ink, muted: rgbaHex(ink, 0.62), faint: rgbaHex(ink, 0.42), line: rgbaHex(ink, 0.14),
    accent: th.isLight ? th.arcAr : (th.prohibited ? th.red : darken(th.accent, 0.78)), glass: rgbaHex(ink, 0.06), glassLine: rgbaHex(ink, 0.15),
    amber: th.isLight ? '#FFD27A' : '#A86F12', red: th.isLight ? '#FFD9CF' : '#B3261E', redSoft: rgbaHex(th.isLight ? '#FFD9CF' : '#B3261E', 0.25), ok: th.isLight ? '#CFF2DD' : '#23774F',
    onArch: true,
  }), [th]);
  const content = (
    <View style={{ width, height }}>
      <Svg width={width} height={height + 2} style={{ position: 'absolute', overflow: 'visible' }}>
        <Defs>
          <ClipPath id="archClip"><Path d={d} /></ClipPath>
          <LinearGradient id="archFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fill} stopOpacity="1" />
            <Stop offset="1" stopColor={fill} stopOpacity={th.isLight ? 0.92 : 0.94} />
          </LinearGradient>
          <RadialGradient id="archGlow" cx="0.5" cy="0.35" r="0.6">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={th.isLight ? 0.18 : 0.35} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {th.fx && !th.nightRed ? <Path d={d} fill="none" stroke={th.accent} strokeOpacity={0.16} strokeWidth={14} /> : null}
        <Path d={d} fill="url(#archFill)" />
        <G clipPath="url(#archClip)">
          {inside === 'glow' || inside === 'niche' ? <Rect x="0" y="0" width={width} height={height} fill="url(#archGlow)" /> : null}
          {inside === 'niche' ? <Path d={inner.line} transform="translate(8 8)" fill="none" stroke={archTheme.accent} strokeOpacity={0.55} strokeWidth={1} strokeDasharray="3 4" /> : null}
          {inside === 'lattice' ? <Lattice w={width} h={height} color={ink} /> : null}
          {inside === 'scene' ? <InsideScene w={width} h={height} kind={scene} accent={archTheme.accent} ink={ink} fx={th.fx} /> : null}
        </G>
        <Path d={line} fill="none" stroke={rgbaHex(ink, 0.12)} strokeWidth={2.5} />
        {timer === 'beads' ? <Beads pts={pts} n={33} p={progress} color={lineColor} idle={rgbaHex(ink, 0.18)} r={Math.max(2.2, width * 0.011)} /> : null}
        {timer === 'crown' ? <Crown pts={pts} n={12} p={progress} color={lineColor} idle={rgbaHex(ink, 0.14)} w={Math.max(3.5, width * 0.02)} /> : null}
        {timer === 'inner' ? (
          <G clipPath="url(#archClip)">
            <AnimatedPath d={line} fill="none" stroke={lineColor} strokeOpacity={0.28} strokeWidth={16} strokeLinecap="round" strokeDasharray={`${length} ${length}`} strokeDashoffset={offset} />
          </G>
        ) : null}
        {timer === 'beads' || timer === 'crown' ? null : <AnimatedPath d={line} fill="none" stroke={lineColor} strokeWidth={timer === 'inner' ? 3 : 2.5} strokeLinecap="round" strokeDasharray={`${length} ${length}`} strokeDashoffset={offset} />}
        <AnimatedPath d={line} fill="none" stroke="#FFFFFF" strokeWidth={6} opacity={flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] })} />
        <Path d={`M${geo.cx - fr} ${geo.top - fr} h${fr * 2} v${fr * 2} h${-fr * 2} Z`} fill={lineColor} />
        <Path d={`M${geo.cx} ${geo.top - fr * 1.414} L${geo.cx + fr * 1.414} ${geo.top} L${geo.cx} ${geo.top + fr * 1.414} L${geo.cx - fr * 1.414} ${geo.top} Z`} fill={lineColor} />
      </Svg>
      {inside !== 'plain' ? <ArchLife w={width} h={height} top={geo.sh} kind={scene} occasion={occasion} culture={culture} accent={archTheme.accent} ink={ink} fx={th.fx} /> : null}
      {(timer === 'inner' || timer === 'line') && th.fx ? <TipPulse pts={pts} p={progress} color={lineColor} /> : null}
      <ThemeCtx.Provider value={archTheme}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: width * 0.3, bottom: 0, alignItems: 'center' }}>{children}</View>
      </ThemeCtx.Provider>
    </View>
  );
  return onPress ? <Press onPress={onPress} scaleTo={0.985}>{content}</Press> : content;
}


// Evenly spaced points along the arch outline (bottom left → top → bottom right).
function archPoints(geo, n) {
  const { x0, x1, cx, top, sh } = geo;
  const span = x1 - x0;
  const c1y = top + span * 0.297;
  const c2x = span * 0.225;
  const c2y = top + span * 0.152;
  const bottom = geo.d.match(/M[\d.]+ ([\d.]+)/) ? parseFloat(geo.d.match(/M[\d.]+ ([\d.]+)/)[1]) : sh + 100;
  const raw = [];
  for (let i = 0; i <= 20; i++) raw.push([x0, bottom - ((bottom - sh) * i) / 20]);
  for (let i = 1; i <= 40; i++) { const s = i / 40; raw.push([cub(x0, x0, x0 + c2x, cx, s), cub(sh, c1y, c2y, top, s)]); }
  for (let i = 1; i <= 40; i++) { const s = i / 40; raw.push([cub(cx, x1 - c2x, x1, x1, s), cub(top, c2y, c1y, sh, s)]); }
  for (let i = 1; i <= 20; i++) raw.push([x1, sh + ((bottom - sh) * i) / 20]);
  const acc = [0];
  for (let i = 1; i < raw.length; i++) acc.push(acc[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const L = acc[acc.length - 1];
  const out = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const target = (L * k) / n;
    while (j < acc.length - 2 && acc[j + 1] < target) j++;
    const f = (target - acc[j]) / Math.max(0.0001, acc[j + 1] - acc[j]);
    out.push([raw[j][0] + (raw[j + 1][0] - raw[j][0]) * f, raw[j][1] + (raw[j + 1][1] - raw[j][1]) * f]);
  }
  return out;
}
const at = (pts, f) => pts[Math.max(0, Math.min(pts.length - 1, Math.round(f * (pts.length - 1))))];
function Beads({ pts, n, p, color, idle, r }) {
  const lit = Math.floor(p * n + 0.0001);
  return (
    <G>
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = at(pts, (i + 0.5) / n);
        const on = i < lit;
        const tip = i === lit;
        return (
          <G key={i}>
            {tip ? <Circle cx={x} cy={y} r={r * 2.4} fill={color} opacity={0.25} /> : null}
            <Circle cx={x} cy={y} r={tip ? r * 1.25 : r} fill={on || tip ? color : idle} />
          </G>
        );
      })}
    </G>
  );
}
function Crown({ pts, n, p, color, idle, w }) {
  return (
    <G>
      {Array.from({ length: n }, (_, i) => {
        const a = i / n + 0.012;
        const b = (i + 1) / n - 0.012;
        const seg = [];
        for (let k = 0; k <= 8; k++) seg.push(at(pts, a + ((b - a) * k) / 8));
        const d = seg.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ');
        const fill = Math.min(1, Math.max(0, (p - i / n) * n));
        return (
          <G key={i}>
            <Path d={d} stroke={idle} strokeWidth={w} strokeLinecap="round" fill="none" />
            {fill > 0 ? <Path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" opacity={0.35 + 0.65 * fill} /> : null}
          </G>
        );
      })}
    </G>
  );
}
// A small scene of the day, low inside the arch: rays and palms by day,
// dunes at sunset, stars and a shooting star at night.
function InsideScene({ w, h, kind, accent, ink, fx }) {
  const base = h - 6;
  const palm = (x, s) => (
    <G transform={`translate(${x} ${base}) scale(${s})`}>
      <Path d="M0 0 Q2 -26 0 -46" stroke={accent} strokeOpacity={0.55} strokeWidth={3} fill="none" />
      {[[-14, -6], [14, -6], [-12, 4], [12, 4], [-4, -12], [5, -12]].map(([dx, dy], i) => (
        <Path key={i} d={`M0 -46 q${dx} ${dy} ${dx * 2} ${dy * 1.6}`} stroke={accent} strokeOpacity={0.5} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      ))}
    </G>
  );
  if (kind === 'night') {
    return (
      <G>
        {Array.from({ length: 18 }, (_, i) => <Circle key={i} cx={w * 0.12 + ((i * 53) % 76) / 100 * w} cy={h * 0.62 + ((i * 29) % 30) / 100 * h * 0.32} r={i % 4 ? 0.9 : 1.5} fill={accent} opacity={0.55} />)}
        <Path d={`M${w * 0.62} ${h * 0.66} l${w * 0.12} ${-h * 0.03}`} stroke={accent} strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round" />
        <Path d={`M${w * 0.35} ${base} a${w * 0.15} ${w * 0.17} 0 0 1 ${w * 0.3} 0z`} fill={ink} opacity={0.08} />
      </G>
    );
  }
  if (kind === 'sunset') {
    return (
      <G>
        <Path d={`M0 ${base - h * 0.06} Q${w * 0.3} ${base - h * 0.12} ${w * 0.55} ${base - h * 0.05} T${w} ${base - h * 0.08} V${h} H0Z`} fill={accent} opacity={0.18} />
        <Path d={`M0 ${base - h * 0.02} Q${w * 0.4} ${base - h * 0.07} ${w} ${base - h * 0.02} V${h} H0Z`} fill={accent} opacity={0.22} />
      </G>
    );
  }
  return (
    <G>
      {Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI + (i / 8) * Math.PI;
        return <Path key={i} d={`M${w / 2} ${base} L${w / 2 + Math.cos(a) * w * 0.6} ${base + Math.sin(a) * w * 0.6}`} stroke={accent} strokeOpacity={0.07} strokeWidth={10} />;
      })}
    </G>
  );
}


// The moving scene inside the arch (1.9.1). It sits in the straight part of
// the arch, low behind the text: palms sway by day, dunes drift at sunset,
// stars twinkle and a shooting star crosses at night, water shimmers on the
// White Days, lights rise in Ramadan, small fireworks on Eid, and the culture's
// landmark faintly at the bottom.
const ND2 = Platform.OS !== 'web';
function useLoop(make, on, deps = []) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return undefined;
    const a = make(v);
    a.start();
    return () => a.stop();
  }, [on, ...deps]);
  return v;
}
const loopT = (v, d, delay = 0) => Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: d, easing: Easing.linear, useNativeDriver: ND2 }), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: ND2 })]));
const swingT = (v, d) => Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: ND2 }), Animated.timing(v, { toValue: 0, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: ND2 })]));

function Palm({ x, bottom, s, color, fx, d }) {
  const v = useLoop((a) => swingT(a, d), fx);
  const H = 56 * s;
  return (
    <Animated.View style={{ position: 'absolute', left: x - 30 * s, bottom, width: 60 * s, height: H, transform: [{ translateY: H / 2 }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) }, { translateY: -H / 2 }] }}>
      <Svg width={60 * s} height={H} viewBox="-30 -56 60 56">
        <Path d="M0 0 Q2 -26 0 -46" stroke={color} strokeOpacity={0.55} strokeWidth={3} fill="none" />
        {[[-14, -6], [14, -6], [-12, 4], [12, 4], [-4, -12], [5, -12]].map(([dx, dy], i) => (
          <Path key={i} d={`M0 -46 q${dx} ${dy} ${dx * 2} ${dy * 1.6}`} stroke={color} strokeOpacity={0.5} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        ))}
      </Svg>
    </Animated.View>
  );
}
function Twinkle({ w, h, color, fx }) {
  const v = useLoop((a) => swingT(a, 1300), fx);
  const dots = (g) => Array.from({ length: 10 }, (_, i) => <Circle key={i} cx={((i * 53 + g * 23) % 92) / 100 * w + w * 0.04} cy={((i * 31 + g * 17) % 60) / 100 * h} r={i % 4 ? 0.9 : 1.5} fill={color} />);
  return (
    <>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity: fx ? v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.9] }) : 0.6 }}><Svg width={w} height={h}>{dots(0)}</Svg></Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity: fx ? v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.25] }) : 0.6 }}><Svg width={w} height={h}>{dots(1)}</Svg></Animated.View>
    </>
  );
}
function Shooter({ w, h, color, fx }) {
  const v = useLoop((a) => loopT(a, 1400, 3200), fx);
  if (!fx) return null;
  return (
    <Animated.View style={{ position: 'absolute', left: w * 0.62, top: h * 0.12, opacity: v.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 0.6, 0] }), transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -w * 0.5] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, h * 0.3] }) }, { rotate: '-28deg' }] }}>
      <Svg width={34} height={3}><Rect x={0} y={0.5} width={34} height={2} rx={1} fill={color} /></Svg>
    </Animated.View>
  );
}
function Riser2({ x, h, size, color, d, delay, fx, fall }) {
  const v = useLoop((a) => loopT(a, d, delay), fx);
  if (!fx) return null;
  return (
    <Animated.View style={{ position: 'absolute', left: x, top: fall ? -6 : h - 6, width: size, height: size, borderRadius: size / 2, backgroundColor: color,
      opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 0.6, 0] }),
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, fall ? h : -h * 0.85] }) }] }} />
  );
}
function Burst({ x, y, r, color, delay, fx }) {
  const v = useLoop((a) => loopT(a, 1800, delay), fx);
  if (!fx) return null;
  return (
    <Animated.View style={{ position: 'absolute', left: x - r, top: y - r, opacity: v.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.5, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.1] }) }] }}>
      <Svg width={r * 2} height={r * 2}>{Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return <Circle key={i} cx={r + Math.cos(a) * r * 0.85} cy={r + Math.sin(a) * r * 0.85} r={1.6} fill={color} />; })}</Svg>
    </Animated.View>
  );
}
function Drift({ w, h, color, fx }) {
  const v = useLoop((a) => swingT(a, 5000), fx);
  return (
    <Animated.View style={{ position: 'absolute', left: -30, bottom: 0, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }] }}>
      <Svg width={w + 60} height={h * 0.35}><Path d={`M0 ${h * 0.14} Q${w * 0.35} ${h * 0.02} ${w * 0.6} ${h * 0.12} T${w + 60} ${h * 0.08} V${h * 0.35} H0Z`} fill={color} opacity={0.2} /></Svg>
    </Animated.View>
  );
}
function Shimmer({ w, h, fx }) {
  const v = useLoop((a) => swingT(a, 1300), fx);
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.22, backgroundColor: 'rgba(138,176,216,0.18)' }}>
      {Array.from({ length: 6 }, (_, i) => (
        <Animated.View key={i} style={{ position: 'absolute', left: 10 + i * (w / 6.5), top: 6 + (i % 3) * 8, width: 16, height: 2, borderRadius: 1, backgroundColor: '#FFFFFF',
          opacity: fx ? v.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? [0.15, 0.8] : [0.8, 0.15] }) : 0.5,
          transform: [{ translateX: fx ? v.interpolate({ inputRange: [0, 1], outputRange: [0, i % 2 ? 6 : -6] }) : 0 }] }} />
      ))}
    </View>
  );
}
function ArchLife({ w, h, top, kind, occasion, culture, accent, ink, fx }) {
  const iw = w - 16;
  const ih = h - top - 6;
  const land = culture && LANDMARKS_A[culture];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 8, top, width: iw, height: ih, overflow: 'hidden' }}>
      {land ? (
        <View style={{ position: 'absolute', left: 0, bottom: -2, opacity: 0.12 }}>
          <SvgXml xml={`<svg viewBox="0 380 300 140">${land.replace(/fill="[^"]*"/g, `fill="${ink}"`)}</svg>`} width={iw} height={iw * (140 / 300)} />
        </View>
      ) : null}
      {kind === 'night' || occasion === 'ramadan' || occasion === 'qadr' || occasion === 'eid' ? <Twinkle w={iw} h={ih * 0.7} color={accent} fx={fx} /> : null}
      {kind === 'night' ? <Shooter w={iw} h={ih} color={accent} fx={fx} /> : null}
      {kind === 'sunset' ? <Drift w={iw} h={ih} color={accent} fx={fx} /> : null}
      {kind !== 'night' && !occasion ? (
        <>
          <Palm x={iw * 0.1} bottom={0} s={0.75 * (iw / 200)} color={accent} fx={fx} d={2200} />
          <Palm x={iw * 0.9} bottom={0} s={0.6 * (iw / 200)} color={accent} fx={fx} d={2600} />
        </>
      ) : null}
      {occasion === 'fullmoon' ? <Shimmer w={iw} h={ih} fx={fx} /> : null}
      {occasion === 'ramadan' || occasion === 'qadr' ? Array.from({ length: 5 }, (_, i) => <Riser2 key={i} x={iw * (0.12 + i * 0.18)} h={ih} size={5} color="#FFD27A" d={4800} delay={i * 900} fx={fx} />) : null}
      {occasion === 'eid' || occasion === 'chandraat' ? [[0.3, 0.35, 16, '#F2C230', 0], [0.7, 0.25, 18, '#E85A9A', 700], [0.5, 0.6, 14, '#7BE0FF', 1300]].map(([x, y, r, c, d], i) => <Burst key={i} x={iw * x} y={ih * y} r={r} color={c} delay={d} fx={fx} />) : null}
    </View>
  );
}
// The glowing tip at the end of the timer, pulsing as it travels.
function TipPulse({ pts, p, color }) {
  const v = useLoop((a) => swingT(a, 700), true);
  const [x, y] = at(pts, Math.max(0, Math.min(1, p)));
  if (p <= 0.005 || p >= 0.995) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - 12, top: y - 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.4] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) }] }} />
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFF6DC', borderWidth: 2, borderColor: color }} />
    </View>
  );
}

function Lattice({ w, h, color }) {
  const s = 18;
  const out = [];
  for (let y = 0; y < h + s; y += s) for (let x = (y / s) % 2 ? s / 2 : 0; x < w + s; x += s) out.push(`M${x} ${y - s / 2}L${x + s / 2} ${y}L${x} ${y + s / 2}L${x - s / 2} ${y}Z`);
  return <Path d={out.join('')} fill="none" stroke={color} strokeOpacity={0.07} strokeWidth={1} />;
}
const rgbaHex = (hex, a) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
};
const darken = (hex, k) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  return `#${[m[1], m[2], m[3]].map((x) => Math.round(parseInt(x, 16) * k).toString(16).padStart(2, '0')).join('')}`;
};

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
  { id: 'Hijri', icon: 'calendar' },
  { id: 'Ibadah', icon: 'book-open' },
  { id: 'Essentials', icon: 'grid' },
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
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!th.fx) return undefined;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(glow, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    a.start();
    return () => a.stop();
  }, [th.fx]);
  const seg = w / TABS.length;
  const onInk = th.isLight ? th.cardInk : th.bg;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: insets.bottom + 10 }}>
      {/* lists fade out before they reach the bar */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: insets.bottom + 128 }}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="tabFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={th.bg} stopOpacity="0" />
              <Stop offset="0.62" stopColor={th.bg} stopOpacity="0.94" />
              <Stop offset="1" stopColor={th.bg} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#tabFade)" />
        </Svg>
      </View>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={{
          width: '92%', maxWidth: 460, height: 64, borderRadius: 32, flexDirection: 'row', alignItems: 'center',
          backgroundColor: th.isLight ? 'rgba(255,255,255,0.92)' : th.sheet, borderWidth: 1, borderColor: th.glassLine || th.line,
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
        }}
      >
        {w > 0 && (
          <Animated.View
            style={{
              position: 'absolute', left: 5, width: seg - 10, height: 50, top: 6, borderRadius: 25, backgroundColor: th.accent,
              shadowColor: th.accent, shadowOpacity: th.fx ? 0.55 : 0, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
              transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, seg] }) }],
            }}
          >
            {th.fx ? <Animated.View style={{ position: 'absolute', left: -4, right: -4, top: -4, bottom: -4, borderRadius: 29, backgroundColor: th.accent, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }} /> : null}
          </Animated.View>
        )}
        {TABS.map((tab) => {
          const on = tab.id === active;
          return (
            <Press key={tab.id} onPress={() => onChange(tab.id)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 64 }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t(tab.id)} scaleTo={0.9}>
              <Feather name={tab.icon} size={19} color={on ? onInk : th.muted} />
              <Body size={10.5} weight={on ? 'bold' : 'med'} color={on ? onInk : th.muted} style={{ marginTop: 3, lineHeight: 13, letterSpacing: -0.1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t(tab.id)}</Body>
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
