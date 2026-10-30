// One day on the calendar: a rounded tile tinted by how the day went, five
// small marks for the five prayers, a moon badge for a fast (with a star once
// you fasted), a purple star for important days, a royal tile for the
// biggest days and a thin gold strip on the days you prayed qada.
import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Circle, Polygon, G, Defs, LinearGradient, Stop, Mask } from 'react-native-svg';
import { Body } from './kit';
import { ROYAL } from '../theme/daily';

export const FAST_COLORS = { white: '#C9D2DC', whiteLight: '#8C99A8', sun: '#5AA9E6', sunLight: '#3D8BCB', other: '#4FC3A1', otherLight: '#2E9C7C' };
export const OCC_COLOR = { dark: '#B48CF2', light: '#7B61D9' };
// Biggest days get a royal tile in the app's royal colour for that day.
export const BIG_DAYS = { 'eid-fitr': ['eidFitr', 'EID'], 'eid-adha': ['eidAdha', 'EID'], arafah: ['arafah', 'ARAFAH'], 'laylatul-qadr': ['qadr', 'QADR'] };

export const rgba = (hex, a) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
};

const star = (x, y, r) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const q = i % 2 ? r * 0.42 : r;
    p.push(`${(x + q * Math.cos(a)).toFixed(2)},${(y + q * Math.sin(a)).toFixed(2)}`);
  }
  return p.join(' ');
};

// Moon badge. Same moon whether or not you fasted; the star appears once you did.
let maskSeq = 0;
export function MoonBadge({ x, y, color, fasted, scale = 1 }) {
  const [id] = React.useState(() => `mb${(maskSeq += 1)}`);
  return (
    <G transform={`translate(${x},${y}) scale(${scale}) translate(${-x},${-y})`}>
      <Defs>
        <Mask id={id} maskUnits="userSpaceOnUse" x={x - 6} y={y - 6} width={12} height={12}>
          <Circle cx={x} cy={y} r={5} fill="#fff" />
          <Circle cx={x - 1} cy={y} r={3} fill="#000" />
          <Circle cx={x + 0.3} cy={y - 0.4} r={2.6} fill="#fff" />
          {fasted ? <Polygon points={star(x + 2.3, y, 1.35)} fill="#000" /> : null}
        </Mask>
      </Defs>
      <Circle cx={x} cy={y} r={5} fill={color} mask={`url(#${id})`} />
    </G>
  );
}

export function OccStar({ x, y, color, r = 4 }) {
  return <Polygon points={star(x, y, r)} fill={color} />;
}

/**
 * th: theme. day: {
 *   n, sub, subAccent, today, future, state ('ok'|'qada'|'missed'|null),
 *   prayers: [5 x 'ontime'|'qada'|'missed'|'pending'|null],
 *   fast: { kind: 'white'|'sun'|'other', fasted }, occ: bool, big: ['eidFitr','EID'] | null,
 *   qadaPrayed: number, note: bool }
 */
export function DayTile({ th, day, width = 44 }) {
  const W = 40;
  const H = 44;
  const light = th.isLight;
  const pc = { ontime: th.ok, qada: th.amber, missed: th.red };
  let fill = null;
  let stroke = null;
  let ink = th.ink;
  let subInk = th.muted;
  let royal = null;
  if (day.big) {
    const R = ROYAL[day.big[0]];
    royal = R ? (light ? R.light : R.dark) : null;
  }
  if (royal) {
    ink = light ? '#FFF8EE' : '#1E1405';
    subInk = rgba(ink, 0.7);
  } else if (day.today) {
    fill = th.card;
    ink = th.cardInk;
    subInk = rgba(th.cardInk, 0.65);
  } else if (day.state === 'ok') fill = rgba(th.ok, light ? 0.2 : 0.18);
  else if (day.state === 'qada') { fill = rgba(th.amber, 0.13); stroke = rgba(th.amber, 0.7); }
  else if (day.state === 'missed') { fill = rgba(th.red, light ? 0.12 : 0.14); stroke = rgba(th.red, 0.6); }
  const fastColor = day.fast ? (light ? FAST_COLORS[`${day.fast.kind}Light`] : FAST_COLORS[day.fast.kind]) : null;
  const x0 = (width - W) / 2;
  return (
    <View style={{ width, height: 60, alignItems: 'center' }}>
      <Svg width={width} height={60} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          {royal ? (
            <LinearGradient id={`rg${day.n}${day.big ? day.big[0] : ''}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={royal.gold || royal.accent} />
              <Stop offset="1" stopColor={royal.accent} />
            </LinearGradient>
          ) : null}
        </Defs>
        <G transform={`translate(${x0},0)`}>
          {royal ? (
            <>
              <Rect x={0} y={0} width={W} height={H} rx={11} fill={`url(#rg${day.n}${day.big ? day.big[0] : ''})`} />
              <G opacity={0.22}>
                <Rect x={W / 2 - 10} y={H / 2 - 10} width={20} height={20} fill="none" stroke="#fff" strokeWidth={1} />
                <Rect x={W / 2 - 10} y={H / 2 - 10} width={20} height={20} fill="none" stroke="#fff" strokeWidth={1} rotation={45} origin={`${W / 2},${H / 2}`} />
              </G>
              <OccStar x={W - 7} y={7} color={rgba('#FFFFFF', 0.9)} r={3.4} />
            </>
          ) : (
            <>
              {fill ? <Rect x={0} y={0} width={W} height={H} rx={11} fill={fill} /> : null}
              {stroke ? <Rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10.5} fill="none" stroke={stroke} strokeWidth={1} /> : null}
              {day.occ ? <OccStar x={W - 7} y={7} color={light ? OCC_COLOR.light : OCC_COLOR.dark} /> : null}
            </>
          )}
          {fastColor ? <MoonBadge x={7.5} y={7.5} color={fastColor} fasted={day.fast.fasted} scale={1.05} /> : null}
          {day.prayers && !royal ? day.prayers.map((s, i) => (
            <Rect key={i} x={7 + i * 5.6} y={H - 6} width={4.4} height={2.6} rx={1.3} fill={s && pc[s] ? pc[s] : day.today ? rgba(th.cardInk, 0.22) : rgba(th.ink, 0.12)} />
          )) : null}
          {day.qadaPrayed ? <Rect x={2.4} y={15} width={2} height={Math.min(14, 4 + day.qadaPrayed * 3)} rx={1} fill={th.amber} /> : null}
        </G>
      </Svg>
      <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center', paddingBottom: day.prayers ? 4 : 0 }}>
        <Body size={15} weight={day.today || royal ? 'bold' : 'semi'} color={ink} maxScale={1.15} style={[{ lineHeight: 18 }, day.future && !day.today && !royal && { opacity: 0.6 }]}>{day.n}</Body>
        <Body size={8.5} numberOfLines={1} color={day.subAccent && !day.today && !royal ? th.accent : subInk} maxScale={1.1} style={[{ lineHeight: 11 }, day.future && !day.today && !royal && { opacity: 0.7 }]}>
          {day.sub}
          {day.note ? <Body size={8.5} color={day.today ? ink : th.note} style={{ lineHeight: 11 }}> ●</Body> : null}
        </Body>
      </View>
      {royal && day.big ? <Body size={8} weight="bold" color={th.isLight ? royal.accent : royal.gold || royal.accent} maxScale={1} style={{ marginTop: 2, letterSpacing: 0.4 }}>{day.bigLabel || day.big[1]}</Body> : null}
    </View>
  );
}
