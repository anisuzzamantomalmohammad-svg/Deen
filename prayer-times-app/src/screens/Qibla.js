import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, View, AppState } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press } from '../ui/kit';
import { ScreenTitle, QiblaDial } from '../ui/parts';
import { useLayout } from '../ui/hooks';
import { qiblaBearing, distanceToKaabaKm, compassPoint, greatCircle } from '../lib/prayer';

const ALIGN_DEG = 2;
const CLOSE_DEG = 10;

// Live compass heading (true north when the phone can work it out).
function useHeading(active) {
  const [state, setState] = useState({ heading: null, accuracy: null, available: Platform.OS !== 'web', isTrue: false });
  useEffect(() => {
    if (!active || Platform.OS === 'web') {
      if (Platform.OS === 'web') setState((s) => ({ ...s, available: false }));
      return undefined;
    }
    let sub = null;
    let cancelled = false;
    let smoothed = null;
    let got = false;
    let noReading = null;
    (async () => {
      try {
        let perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted' && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        const s = await Location.watchHeadingAsync(({ trueHeading, magHeading, accuracy }) => {
          const isTrue = typeof trueHeading === 'number' && trueHeading >= 0;
          const raw = isTrue ? trueHeading : magHeading;
          if (typeof raw !== 'number' || raw < 0) return;
          got = true;
          // low-pass filter the shortest way round, so 359 -> 0 doesn't spin
          smoothed = smoothed === null ? raw : (smoothed + ((((raw - smoothed + 540) % 360) - 180) * 0.22) + 360) % 360;
          const rounded = Math.round(smoothed * 2) / 2;
          setState((prev) => (prev.heading === rounded && prev.accuracy === accuracy ? prev : { heading: rounded, accuracy, available: true, isTrue }));
        });
        if (cancelled) {
          try { s.remove(); } catch (e) { /* gone */ }
          return;
        }
        sub = s;
        noReading = setTimeout(() => {
          if (!cancelled && !got) setState((p) => ({ ...p, available: false }));
        }, 4000);
      } catch (e) {
        if (!cancelled) setState((p) => ({ ...p, available: false }));
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(noReading);
      try {
        if (sub) sub.remove();
      } catch (e) {
        // never let sensor clean-up crash the app
      }
    };
  }, [active]);
  return state;
}

function RouteMap({ lat, lon }) {
  const th = useTheme();
  const W = 300;
  const H = 120;
  const pts = useMemo(() => greatCircle(lat, lon, 40), [lat, lon]);
  // Fit the route into the box (simple equirectangular projection).
  const lons = pts.map((p) => p[1]);
  // unwrap longitudes so the path doesn't jump across the date line
  const un = [lons[0]];
  for (let i = 1; i < lons.length; i++) {
    let v = lons[i];
    while (v - un[i - 1] > 180) v -= 360;
    while (v - un[i - 1] < -180) v += 360;
    un.push(v);
  }
  const lats = pts.map((p) => p[0]);
  const minX = Math.min(...un) - 8;
  const maxX = Math.max(...un) + 8;
  const minY = Math.min(...lats) - 8;
  const maxY = Math.max(...lats) + 8;
  const sx = (W - 20) / Math.max(1, maxX - minX);
  const sy = (H - 30) / Math.max(1, maxY - minY);
  const s = Math.min(sx, sy * 1.6);
  const px = (x) => 10 + (x - minX) * s;
  const py = (y) => H - 14 - (y - minY) * (s / 1.6);
  const d = un.map((x, i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)} ${py(lats[i]).toFixed(1)}`).join(' ');
  const eq = py(0);
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {eq > 0 && eq < H ? <Line x1={0} y1={eq} x2={W} y2={eq} stroke={th.line} strokeDasharray="2 4" /> : null}
      <Path d={d} fill="none" stroke={th.accent} strokeWidth={1.8} strokeDasharray="4 4" />
      <Circle cx={px(un[0])} cy={py(lats[0])} r={4.5} fill={th.ink} />
      <Circle cx={px(un[un.length - 1])} cy={py(lats[lats.length - 1])} r={5.5} fill={th.accent} />
      {eq > 0 && eq < H ? <SvgText x={W - 4} y={eq - 3} fontSize={8} fill={th.faint} textAnchor="end">equator</SvgText> : null}
    </Svg>
  );
}

export default function QiblaScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const [focused, setFocused] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const s = AppState.addEventListener('change', (st) => setFocused(st === 'active'));
    return () => s.remove();
  }, []);
  const { heading, accuracy, available, isTrue } = useHeading(focused);
  const { latitude, longitude } = app.coords;
  const qibla = useMemo(() => qiblaBearing(latitude, longitude), [latitude, longitude]);
  const km = Math.round(distanceToKaabaKm(latitude, longitude));
  const [showRoute, setShowRoute] = useState(false);

  const hasHeading = available && heading !== null;
  let rel = hasHeading ? ((qibla - heading + 540) % 360) - 180 : 0;
  const lowAccuracy = Platform.OS === 'android' && hasHeading && accuracy !== null && accuracy <= 1;
  const state = !hasHeading ? 'static' : lowAccuracy ? 'calibrate' : Math.abs(rel) <= ALIGN_DEG ? 'aligned' : Math.abs(rel) <= CLOSE_DEG ? 'close' : 'turn';

  // one buzz when you line up
  const wasAligned = useRef(false);
  useEffect(() => {
    if (state === 'aligned' && !wasAligned.current) app.haptic('success');
    wasAligned.current = state === 'aligned';
  }, [state]);

  const size = Math.min(L.width - 40, 340);
  const dialHeading = hasHeading ? heading : qibla; // static: Kaaba at the top
  const kmText = t.num(km.toLocaleString('en-US'));

  let mid = null;
  if (state === 'aligned') {
    mid = (
      <>
        <Serif size={22} color={th.ok} style={{ textAlign: 'center', lineHeight: 26 }}>{t("You're facing\nthe Qibla")}</Serif>
        <Label style={{ marginTop: 6 }}>{t('Hold steady · {deg}°', { deg: t.num(Math.round(qibla)) })}</Label>
      </>
    );
  } else if (state === 'calibrate') {
    mid = (
      <>
        <Serif size={22} color={th.muted}>{t('Calibrating…')}</Serif>
        <Label style={{ marginTop: 4 }}>{t('Accuracy low')}</Label>
      </>
    );
  } else if (state === 'static') {
    mid = (
      <>
        <Serif bold size={44}>{`${t.num(Math.round(qibla))}°`}</Serif>
        <Label style={{ marginTop: 2 }}>{t(compassPoint(qibla))}</Label>
      </>
    );
  } else {
    mid = (
      <>
        <Serif bold size={46} color={state === 'close' ? '#9BD8A8' : th.ink}>{`${t.num(Math.round(Math.abs(rel)))}°`}</Serif>
        <Label style={{ marginTop: 2 }} color={state === 'close' ? '#9BD8A8' : th.muted}>{state === 'close' ? t('Almost there') : rel > 0 ? t('Turn right') : t('Turn left')}</Label>
      </>
    );
  }

  const hint =
    state === 'aligned' ? null
      : state === 'calibrate' ? t('Move the phone in a figure 8 to calibrate')
        : state === 'static' ? t('No compass here. Face {deg}° ({dir}) using any compass.', { deg: t.num(Math.round(qibla)), dir: t(compassPoint(qibla)) })
          : state === 'close' ? (rel > 0 ? t('A little more to the right') : t('A little more to the left'))
            : rel > 0 ? t('Turn right until the Kaaba reaches the top') : t('Turn left until the Kaaba reaches the top');

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 16, paddingHorizontal: L.pad, paddingBottom: L.bottomSpace }} showsVerticalScrollIndicator={false}>
      <ScreenTitle title={t('Qibla')} arabic="القبلة" sub={t('From {place}', { place: app.locationName })} />

      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <View style={{ width: size, height: size + 20 }}>
          <QiblaDial size={size} heading={dialHeading} qibla={qibla} state={state === 'static' ? 'aligned-static' : state} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: size / 2 + 12 - 42, height: 84, alignItems: 'center', justifyContent: 'center' }}>
            {mid}
          </View>
        </View>
        {state === 'aligned' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Feather name="check" size={15} color={th.ok} />
            <Body size={13} weight="bold" color={th.ok}>{t('Aligned')}</Body>
          </View>
        ) : (
          <Body size={12} color={th.muted} style={{ textAlign: 'center', marginTop: 2, maxWidth: 300 }}>{hint}</Body>
        )}
      </View>

      {state === 'calibrate' ? (
        <Card onPress={() => nav.openSheet('calibrate')} style={{ marginTop: 14, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center', borderColor: 'rgba(224,164,58,0.5)', backgroundColor: 'rgba(224,164,58,0.1)' }}>
          <Svg width={42} height={22} viewBox="0 0 60 30">
            <Path d="M30 15 C20 2 4 2 4 15 C4 28 20 28 30 15 C40 2 56 2 56 15 C56 28 40 28 30 15Z" fill="none" stroke={th.amber} strokeWidth={2.4} />
          </Svg>
          <View style={{ flex: 1 }}>
            <Body size={13} weight="bold" color={th.amber}>{t('Compass needs calibrating')}</Body>
            <Body size={11.5} color={th.muted}>{t('Wave your phone in a figure 8, away from metal and magnets. Tap for help.')}</Body>
          </View>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <Card style={{ flex: 1, paddingVertical: 11, alignItems: 'center' }}>
          <Serif bold size={17}>{`${t.num(qibla.toFixed(1))}°`}</Serif>
          <Label size={8}>{t('Qibla')}</Label>
        </Card>
        <Card onPress={() => nav.openSheet('calibrate')} style={{ flex: 1, paddingVertical: 11, alignItems: 'center' }}>
          <Serif bold size={17}>{hasHeading ? `${t.num(Math.round(heading))}°` : '—'}</Serif>
          <Label size={8}>{hasHeading && !isTrue ? t('Facing (magnetic)') : t('Facing')}</Label>
        </Card>
        <Card onPress={() => setShowRoute((v) => !v)} active={showRoute} style={{ flex: 1, paddingVertical: 11, alignItems: 'center' }}>
          <Serif bold size={17}>{kmText}</Serif>
          <Label size={8}>{t('km away')}</Label>
        </Card>
      </View>

      {showRoute ? (
        <Card style={{ marginTop: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10 }}>
          <RouteMap lat={latitude} lon={longitude} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Body size={11} color={th.muted} style={{ flex: 1 }}>{t('Shortest path over the globe, {place} to Makkah', { place: app.locationName.split(',')[0] })}</Body>
            <Serif bold size={13}>{`${kmText} km · ${t.num(Math.round(qibla))}°`}</Serif>
          </View>
          <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{t('That is why the Qibla can point a different way than a flat map suggests.')}</Body>
        </Card>
      ) : (
        <Press onPress={() => setShowRoute(true)} style={{ alignSelf: 'center', marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name="globe" size={13} color={th.accent} />
          <Body size={12} weight="semi" color={th.accent}>{t('See the route to Makkah')}</Body>
        </Press>
      )}
      <Body size={11} color={th.faint} style={{ textAlign: 'center', marginTop: 14 }}>{t('Keep the phone flat and away from metal for the best reading.')}</Body>
    </ScrollView>
  );
}
