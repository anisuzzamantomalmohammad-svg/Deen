import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Arabic, Press, PrimaryButton, PatternBand, Segmented } from '../ui/kit';
import { archGeometry, GlowMoon } from '../ui/parts';
import { useLayout } from '../ui/hooks';
import { CALC_METHODS } from '../lib/prayer';

function ArchFrame({ w, h, children }) {
  const th = useTheme();
  const { d } = archGeometry(w, h);
  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Path d={d} fill={th.card} />
        <Path d={d} fill="none" stroke={th.isLight ? '#FFE9C9' : th.accent} strokeWidth={2.5} />
      </Svg>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: w * 0.25 }}>{children}</View>
    </View>
  );
}

export default function Onboarding() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const a = useRef(new Animated.Value(1)).current;

  const goTo = (n) => {
    Animated.timing(a, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start(() => {
      setStep(n);
      Animated.timing(a, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    });
  };
  const finish = () => app.update({ onboarded: true });

  // If the user picks a city in the sheet during step 2, move on.
  const startLoc = useRef(app.data.activeLocationId);
  useEffect(() => {
    if (step === 1 && app.data.activeLocationId !== startLoc.current && app.data.activeLocationId !== 'auto') goTo(2);
  }, [app.data.activeLocationId]);

  const allowLocation = async () => {
    setBusy(true);
    try {
      if (Platform.OS !== 'web') {
        const p = await Location.requestForegroundPermissionsAsync();
        if (p.status === 'granted') {
          app.update({ activeLocationId: 'auto' });
          app.fetchGps(false);
        } else {
          setBusy(false);
          nav.openSheet('location');
          return;
        }
      }
    } catch (e) {
      // fall through to the next step
    }
    setBusy(false);
    goTo(2);
  };
  const allowAlerts = async () => {
    setBusy(true);
    try {
      if (Platform.OS !== 'web') await Notifications.requestPermissionsAsync();
    } catch (e) {
      // ignore
    }
    setBusy(false);
    finish();
  };

  const w = Math.min(L.width * 0.52, 210);
  const h = w * 1.22;
  const steps = [
    {
      icon: <GlowMoon size={w * 0.62} color={th.isLight ? th.cardInk : th.accent} />,
      body: (
        <>
          <Arabic size={20} color={th.accent}>بِسْمِ ٱللَّٰهِ</Arabic>
          <Serif size={30}>Deen</Serif>
          <Body size={13.5} color={th.muted} style={{ textAlign: 'center', marginTop: 8, lineHeight: 20 }}>{t('Prayer times, Qibla, fasting and your daily worship, in one calm place.')}</Body>
          <Segmented style={{ marginTop: 18, alignSelf: 'stretch' }} value={app.data.lang} onChange={(v) => app.update({ lang: v })} options={[{ id: 'en', label: 'English' }, { id: 'bn', label: 'বাংলা' }]} />
        </>
      ),
      btn: t('Get started'),
      onPress: () => goTo(1),
    },
    {
      icon: <Feather name="map-pin" size={w * 0.26} color={th.isLight ? th.cardInk : th.accent} />,
      body: (
        <>
          <Serif size={26}>{t('Your location')}</Serif>
          <Body size={13.5} color={th.muted} style={{ textAlign: 'center', marginTop: 8, lineHeight: 20 }}>{t('Used only on your phone to work out prayer times and the Qibla direction. It is never sent anywhere.')}</Body>
        </>
      ),
      btn: t('Allow location'),
      onPress: allowLocation,
      alt: t('Choose a city instead'),
      onAlt: () => nav.openSheet('location'),
    },
    {
      icon: <Feather name="clock" size={w * 0.26} color={th.isLight ? th.cardInk : th.accent} />,
      body: (
        <>
          <Serif size={26}>{t('Prayer times')}</Serif>
          <Body size={13.5} color={th.muted} style={{ textAlign: 'center', marginTop: 8, lineHeight: 20 }}>{t('Pick what your local masjid uses. You can change it later in Settings.')}</Body>
          <Press
            onPress={() => nav.openSheet('choice', { title: t('Calculation method'), value: app.data.calcMethod, options: CALC_METHODS.map((m) => ({ id: m.id, label: t(m.label) })), onPick: (v) => app.update({ calcMethod: v }), note: t('Karachi is used in Bangladesh, Pakistan and by many NZ masjids. Pick what your local masjid uses.') })}
            style={{ marginTop: 16, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: th.line, backgroundColor: th.soft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 }}
          >
            <View style={{ flex: 1 }}>
              <Body size={11} color={th.muted}>{t('Calculation method')}</Body>
              <Body size={14} weight="semi">{app.data.calcMethod === 'Karachi' ? 'Karachi' : t((CALC_METHODS.find((m) => m.id === app.data.calcMethod) || CALC_METHODS[0]).label)}</Body>
            </View>
            <Feather name="chevron-down" size={16} color={th.muted} />
          </Press>
          <Body size={11} color={th.muted} style={{ marginTop: 14, alignSelf: 'flex-start' }}>{t('Asr time')}</Body>
          <Segmented style={{ marginTop: 6, alignSelf: 'stretch' }} value={app.data.asrMethod} onChange={(v) => app.update({ asrMethod: v })} options={[{ id: 'Hanafi', label: t('Hanafi') }, { id: 'Standard', label: t('Standard') }]} />
        </>
      ),
      btn: t('Continue'),
      onPress: () => goTo(3),
    },
    {
      icon: <Feather name="bell" size={w * 0.26} color={th.isLight ? th.cardInk : th.accent} />,
      body: (
        <>
          <Serif size={26}>{t('Prayer alerts')}</Serif>
          <Body size={13.5} color={th.muted} style={{ textAlign: 'center', marginTop: 8, lineHeight: 20 }}>{t('A gentle alert at each prayer, 10 minutes before, and for Seheri and Iftar. You can change any of it later.')}</Body>
          <View style={{ marginTop: 14, alignSelf: 'center', width: 230, borderWidth: 1, borderColor: th.line, backgroundColor: th.soft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 }}>
            <Body size={12.5} weight="semi">{t('{name} in {n} minutes', { name: t('Fajr'), n: 10 })}</Body>
            <Body size={11} color={th.muted}>{app.locationName}</Body>
          </View>
        </>
      ),
      btn: t('Turn on alerts'),
      onPress: allowAlerts,
      alt: t('Not now'),
      onAlt: finish,
    },
  ];
  const s = steps[step];

  return (
    <View style={{ flex: 1 }}>
      <PatternBand height={L.insets.top + h + 140} />
      <Animated.View style={{ flex: 1, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
        <View style={{ alignItems: 'center', paddingTop: L.insets.top + 50 }}>
          <ArchFrame w={w} h={h}>{s.icon}</ArchFrame>
        </View>
        <View style={{ paddingHorizontal: 30, marginTop: 22, alignItems: 'center' }}>{s.body}</View>
      </Animated.View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: L.insets.bottom + 20, paddingHorizontal: 26 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
          {[0, 1, 2, 3].map((k) => (
            <View key={k} style={{ height: 6, width: k === step ? 20 : 6, borderRadius: 3, backgroundColor: k === step ? th.accent : th.line }} />
          ))}
        </View>
        <PrimaryButton label={busy ? '…' : s.btn} onPress={s.onPress} disabled={busy} />
        {s.alt ? (
          <Press onPress={s.onAlt} style={{ alignSelf: 'center', paddingVertical: 12 }}>
            <Body size={13} color={th.muted} weight="semi">{s.alt}</Body>
          </Press>
        ) : <View style={{ height: 44 }} />}
      </View>
    </View>
  );
}
