// The fasting card (1.8): a small food or occasion picture beside the
// countdown. Day: "Iftar in", night: "Seheri ends in". The same card is used
// on Home, the Fasting page and in Settings, so they always match.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme, useT, Serif, Body, Label, Card, Press } from './kit';

const NIGHT = '#AEB8F0';
const NIGHT_LIGHT = '#4A5AB8';

// Pale strokes are drawn for a dark card; on a cream card they turn brown.
export function picXml(xml, light) {
  if (!light) return xml;
  return xml.replace(/rgba\(243,235,216,/g, 'rgba(42,36,24,').replace(/#F3EEDC/g, '#D8C9A6');
}

export function FastPic({ pic, size = 84, light, still }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return undefined;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(bob, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    a.start();
    return () => a.stop();
  }, [still]);
  if (!pic) return null;
  return (
    <Animated.View style={{ width: size, height: size * (74 / 84), transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }}>
      <SvgXml xml={picXml(pic.xml, light)} width={size} height={size * (74 / 84)} />
    </Animated.View>
  );
}

// countdown: text like "1h 49m"; at: the Iftar or Seheri time as text.
export function FastCard({ pic, night, countdown, at, progress = 0, big, onPress, style, sub }) {
  const th = useTheme();
  const t = useT();
  const L = th.isLight;
  const nightC = L ? NIGHT_LIGHT : NIGHT;
  const p = Math.max(0, Math.min(1, progress));
  const bg = night
    ? { backgroundColor: L ? 'rgba(74,90,184,0.08)' : 'rgba(70,86,180,0.2)', borderColor: L ? 'rgba(74,90,184,0.25)' : 'rgba(174,184,240,0.3)' }
    : null;
  return (
    <Card onPress={onPress} style={[{ marginTop: 10, paddingHorizontal: 12, paddingVertical: 10 }, bg, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: big ? 92 : 84 }}>
          <FastPic pic={pic} size={big ? 92 : 84} light={L} />
          <View style={{ height: 3, borderRadius: 2, backgroundColor: th.line, marginTop: 2, overflow: 'hidden' }}>
            <View style={{ width: `${p * 100}%`, height: 3, backgroundColor: night ? nightC : th.accent }} />
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Label size={8.5} color={night ? nightC : th.accent}>{night ? t('Seheri ends in') : t('Iftar in')}</Label>
          <Serif bold size={big ? 30 : 26} numberOfLines={1} style={{ lineHeight: big ? 36 : 31 }}>{countdown}</Serif>
          {sub ? <Body size={10.5} color={th.muted} numberOfLines={1}>{sub}</Body> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Label size={8.5}>{night ? t('Seheri') : t('Iftar')}</Label>
          <Serif size={big ? 18 : 16} numberOfLines={1}>{at}</Serif>
        </View>
      </View>
    </Card>
  );
}

// The thin strip on days you're not fasting: opens the Fasting page.
export function NotFastingStrip({ title, sub, button, onButton, onPress }) {
  const th = useTheme();
  const t = useT();
  return (
    <Card onPress={onPress} style={{ marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <SvgXml xml={`<svg viewBox="0 0 24 24"><path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 5v2M5.5 8l1.4 1.4M18.5 8l-1.4 1.4" stroke="${th.accent}" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>`} width={18} height={18} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Label size={8.5}>{t('Not fasting today')}</Label>
        <Body size={13} weight="semi" numberOfLines={1}>{title}</Body>
        {sub ? <Body size={11} color={th.muted} numberOfLines={1}>{sub}</Body> : null}
      </View>
      {button ? (
        <Press onPress={onButton} hitSlop={6} style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: th.accent }}>
          <Body size={11.5} weight="semi" color={th.accent}>{button}</Body>
        </Press>
      ) : null}
    </Card>
  );
}
