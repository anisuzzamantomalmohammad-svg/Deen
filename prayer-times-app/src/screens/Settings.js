// Settings: a short main list (each row shows its current value) that opens
// one page per topic, plus a search box that finds any setting by name.
import { nowDate } from '../lib/clock';
import React, { useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Card, Row, Toggle, Segmented, SectionLabel, Press, Arabic, Input, Divider, PrimaryButton } from '../ui/kit';
import { ScreenTitle, archGeometry } from '../ui/parts';
import { useLayout, hijriMonthName, timeStr } from '../ui/hooks';
import { CALC_METHODS, computeDay, timeAdj, adjCityKey } from '../lib/prayer';
import { DARK_PALETTES, LIGHT_PALETTES } from '../theme/palettes';
import { TIME_PALETTES, SLOTS, SLOT_NAMES, ROYAL, ROYAL_NAMES, paletteById } from '../theme/daily';
import { exportBackup, pickBackup, pickBackupFolder } from '../lib/backup';
import { pinWidget } from '../lib/widget';
import { GoogleSection, applyBackup, AccountCorner } from './Account';
import { feedbackReady } from '../lib/feedback';
import { NotConfirmed } from '../ui/kit';
import { ESSENTIALS, openEssential } from './Essentials';
import { translate } from '../i18n';
import { HOME_CARDS, homeCardOrder } from '../lib/homeCards';

/* ---------------------------------------------------------------- shared */
function Swatches({ list, value, onPick }) {
  const th = useTheme();
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10 }}>
      {list.map((p) => {
        const on = p.id === value;
        return (
          <Press
            key={p.id}
            onPress={() => onPick(p.id)}
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(p.name)}
            style={[{ width: '31%', flexGrow: 1, alignItems: 'center', padding: 6, borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent' }, on && { borderColor: th.accent }]}
          >
            <View style={{ alignSelf: 'stretch', height: 34, borderRadius: 10, backgroundColor: p.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(128,128,128,0.25)' }}>
              <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: p.accent }} />
              <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: p.ink }} />
            </View>
            <Body size={11} weight={on ? 'bold' : 'med'} color={on ? th.ink : th.muted} style={{ marginTop: 4 }} numberOfLines={1}>{t(p.name)}</Body>
          </Press>
        );
      })}
    </View>
  );
}

// A small copy of Home (arch, countdown and three prayers) in the colours
// being used right now, so every change shows at once.
function ThemePreview() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const w = 92;
  const h = w * 1.22;
  const { d } = archGeometry(w, h, 2);
  const tz = app.coords.timezone;
  const times = app.getDay(app.today);
  return (
    <Card style={{ padding: 14, flexDirection: 'row', gap: 16, alignItems: 'center', backgroundColor: th.bg2 }}>
      <View style={{ width: w, height: h }}>
        <Svg width={w} height={h} style={{ position: 'absolute' }}>
          <Path d={d} fill={th.card} />
          <Path d={d} fill="none" stroke={th.isLight ? '#FFE9C9' : th.accent} strokeWidth={2} />
        </Svg>
        <View style={{ position: 'absolute', left: 0, right: 0, top: w * 0.3, alignItems: 'center' }}>
          <Arabic size={14} color={th.arcAr} style={{ lineHeight: 22 }}>العصر</Arabic>
          <Serif size={12} color={th.cardInk}>{t('Asr')}</Serif>
          <Serif bold size={15} color={th.cardInk}>{t('{h}h {m}m', { h: 1, m: 59 })}</Serif>
        </View>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        {['Fajr', 'Dhuhr', 'Asr'].map((n, i) => (
          <View key={n} style={[{ flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: th.line, paddingHorizontal: 10, paddingVertical: 6 }, i === 2 && { borderColor: th.accent, backgroundColor: th.accentSoft }]}>
            <Body size={12} weight="semi" color={i === 2 ? th.accent : th.ink} style={{ flex: 1 }}>{t(n)}</Body>
            <Serif size={13} color={i === 2 ? th.accent : th.ink}>{timeStr(t, times[n], tz, true)}</Serif>
            <View style={[{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: th.faint, marginLeft: 8 }, i === 0 && { backgroundColor: th.ok, borderColor: th.ok }]} />
          </View>
        ))}
      </View>
    </Card>
  );
}

export const PAGE_TITLES = {
  prayer: 'Prayer times', calendar: 'Calendar & dates', appearance: 'Appearance', language: 'Language & text', home: 'Home screen', backup: 'Backup', about: 'About', safar: 'Safar (travelling)', adjust: 'Adjust times', widget: 'Add widget',
};

/* --------------------------------------------------------------- pages */
function PrayerPage() {
  const app = useApp();
  const nav = useNav();
  const t = useT();
  const { data, update } = app;
  const method = CALC_METHODS.find((m) => m.id === data.calcMethod) || CALC_METHODS[0];
  return (
    <Card style={{ paddingVertical: 2, marginTop: 12 }}>
      <Row
        first icon="sliders" label={t('Calculation method')} value={method.id === 'Karachi' ? 'Karachi' : t(method.label)}
        onPress={() => nav.openSheet('choice', { title: t('Calculation method'), value: data.calcMethod, options: CALC_METHODS.map((m) => ({ id: m.id, label: t(m.label) })), onPick: (v) => update({ calcMethod: v }), note: t('Karachi is used in Bangladesh, Pakistan and by many NZ masjids. Pick what your local masjid uses.') })}
      />
      <Row
        icon="sun" label={t('Asr time')} value={data.asrMethod === 'Hanafi' ? t('Hanafi') : t('Standard')}
        onPress={() => nav.openSheet('choice', { title: t('Asr time'), value: data.asrMethod, options: [{ id: 'Hanafi', label: t('Hanafi'), sub: t('Shadow twice the length, later Asr') }, { id: 'Standard', label: t('Standard'), sub: t("Shafi'i, Maliki, Hanbali: shadow equal length") }], onPick: (v) => update({ asrMethod: v }) })}
      />
      <Row
        icon="clock" label={t('Seheri ends before Fajr')} value={t('{n} min', { n: data.safetyBuffer })}
        onPress={() => nav.openSheet('choice', { title: t('Seheri ends before Fajr'), value: data.safetyBuffer, options: [0, 3, 5, 10, 15].map((n) => ({ id: n, label: n ? t('{n} minutes before', { n }) : t('At Fajr exactly') })), onPick: (v) => update({ safetyBuffer: v }), note: t('A few minutes of margin so you stop eating safely before Fajr.') })}
      />
      <Row icon="edit-2" label={t('Adjust times')} value={adjCount(data) ? t('{n} changed', { n: adjCount(data) }) : t('Off')} onPress={() => nav.push('settingsPage', { page: 'adjust' })} />
      <Row icon="globe" label={t('Second city')} value={data.secondCityOn && data.secondCity ? t(data.secondCity.name) : t('Off')} onPress={() => nav.openSheet('secondCity')} />
    </Card>
  );
}

// How many prayers are moved from their calculated time.
const adjCount = (data) => Object.values(timeAdj(data) || {}).filter((v) => v).length;

// Move each prayer by a few minutes to match your masjid. This phone only;
// one set for everywhere, or a set per city if the switch is on.
const ADJ_NAMES = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
function AdjustPage() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const { data, update } = app;
  const adj = timeAdj(data) || {};
  const base = computeDay(app.coords, data.calcMethod, data.asrMethod, app.today);
  const setAdj = (next) => update((p) => (p.adjPerCity
    ? { adjByCity: { ...(p.adjByCity || {}), [adjCityKey(p)]: next } }
    : { timeAdj: next }));
  const change = (k, d) => {
    const v = Math.max(-30, Math.min(30, (adj[k] || 0) + d));
    setAdj({ ...adj, [k]: v });
  };
  const fmt = (v) => (v > 0 ? t('+{n} min', { n: v }) : v < 0 ? t('−{n} min', { n: -v }) : t('{n} min', { n: 0 }));
  return (
    <View>
      <Body size={12.5} color={th.muted} style={{ marginTop: 6, lineHeight: 18 }}>{t('Move a prayer by a few minutes to match your masjid’s timetable.')}</Body>
      <Card style={{ paddingVertical: 2, marginTop: 12 }}>
        {ADJ_NAMES.map((k, i) => {
          const v = adj[k] || 0;
          const after = new Date(base[k].getTime() + v * 60000);
          return (
            <View key={k}>
              {i > 0 && <Divider />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Body size={14} weight="semi" color={v ? th.accent : th.ink}>{t(k)}</Body>
                  <Body size={11} color={th.faint}>{`${timeStr(t, base[k], app.coords.timezone)} → ${timeStr(t, after, app.coords.timezone)}`}</Body>
                </View>
                <Press onPress={() => change(k, -1)} hitSlop={6} accessibilityLabel={t('Earlier')} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: v ? th.accentLine : th.line, alignItems: 'center', justifyContent: 'center' }}><Feather name="minus" size={15} color={th.accent} /></Press>
                <Body size={13} weight="semi" color={v ? th.accent : th.muted} style={{ minWidth: 58, textAlign: 'center' }}>{fmt(v)}</Body>
                <Press onPress={() => change(k, 1)} hitSlop={6} accessibilityLabel={t('Later')} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: v ? th.accentLine : th.line, alignItems: 'center', justifyContent: 'center' }}><Feather name="plus" size={15} color={th.accent} /></Press>
              </View>
            </View>
          );
        })}
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 8, lineHeight: 16 }}>{t('Moves the time everywhere: Home, alerts, widgets, timetable and Google Calendar. Seheri and Iftar follow the adjusted Fajr and Maghrib. Kept on this phone only.')}</Body>
      <Card style={{ paddingVertical: 2, marginTop: 12 }}>
        <Row first icon="map-pin" label={t('Separate adjustments for each city')} sub={data.adjPerCity ? t('Now: {city}', { city: app.locationName }) : t('Off: one set for everywhere')} right={<Toggle value={!!data.adjPerCity} onChange={(v) => update({ adjPerCity: v })} />} />
      </Card>
      {adjCount(data) ? <PrimaryButton ghost style={{ marginTop: 14 }} icon="rotate-ccw" label={t('Reset all to calculated times')} onPress={() => setAdj({})} /> : null}
    </View>
  );
}

// Pick one of the four home-screen widgets.
const WIDGET_KINDS = [
  { id: 'glass', icon: 'sidebar', label: 'Glass · all 5 prayers', sub: '4×1 · stretches to 4×2' },
  { id: 'dots', icon: 'target', label: 'Dots · now and next', sub: '2×2 · tap the circle to tick' },
  { id: 'fast', icon: 'sunrise', label: 'Seheri & Iftar', sub: '2×2 · the fast, from Seheri to Iftar' },
  { id: 'card', icon: 'clock', label: 'Countdown card', sub: '2×2 · the next prayer' },
];
function WidgetPage() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  return (
    <View>
      <Body size={12.5} color={th.muted} style={{ marginTop: 6, lineHeight: 18 }}>{t('Pick a widget')}</Body>
      <Card style={{ paddingVertical: 2, marginTop: 12 }}>
        {WIDGET_KINDS.map((w, i) => (
          <Row key={w.id} first={i === 0} icon={w.icon} label={t(w.label)} sub={t(w.sub)} onPress={() => pinWidget(t, w.id).then((m) => m && app.setToast(m))} />
        ))}
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 8, lineHeight: 16 }}>{t('Long-press your home screen, tap Widgets, then find Deen.')}</Body>
    </View>
  );
}

function CalendarPage() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { data, update } = app;
  return (
    <View>
      <SectionLabel>{t('Main date on the calendar')}</SectionLabel>
      <Segmented value={data.calMain === 'regular' ? 'regular' : 'hijri'} onChange={(v) => update({ calMain: v, calMainV: 1 })} options={[{ id: 'regular', label: t('Regular') }, { id: 'hijri', label: t('Hijri') }]} />
      <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{data.calMain === 'regular' ? t('Months run 1 to 31, with the Hijri date small under each day.') : t('Months follow the moon, with the regular date small under each day.')}</Body>
      <Card style={{ paddingVertical: 2, marginTop: 12 }}>
        <Row first icon="moon" label={t('Hijri calendar')} value={data.hijriMode === 'ummalqura' ? t('Umm al-Qura') : t('Moon sighting')} onPress={() => nav.push('hijriSettings')} />
        <Row icon="sunset" label={t('New Hijri day starts at Maghrib')} sub={t('After sunset, Home shows the next Hijri date')} right={<Toggle value={data.hijriAtMaghrib !== false} onChange={(v) => update({ hijriAtMaghrib: v })} />} />
        <Row icon="gift" label={t('Hijri birthday')} value={data.hijriBirthday ? `${t.num(data.hijriBirthday.day)} ${hijriMonthName(t.lang, data.hijriBirthday.monthIndex)}` : t('Not set')} onPress={() => nav.openSheet('birthday')} />
        <Row icon="book" label={t('Show history in the calendar')} right={<Toggle value={data.showHistory !== false} onChange={(v) => update({ showHistory: v })} />} />
        <Row icon="circle" label={t('Show eclipses')} right={<Toggle value={data.showEclipses !== false} onChange={(v) => update({ showEclipses: v })} />} />
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 8 }}>{t('In Islam the day begins at sunset, so the Hijri date changes at Maghrib. The calendar grid still shows whole days.')}</Body>
    </View>
  );
}

function AppearancePage() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { data, update } = app;
  const mode = data.colourMode || 'all';
  const slotLabel = (s) => {
    const pin = (data.colourPins || {})[s];
    const p = pin && paletteById(pin);
    return p ? t(p.name) : t('Random');
  };
  const pickSlot = (s) => nav.openSheet('choice', {
    title: t(SLOT_NAMES[s]),
    value: (data.colourPins || {})[s] || 'random',
    options: [{ id: 'random', label: t('Random'), sub: t('A different colour each day') }, ...TIME_PALETTES[s].map((p) => ({ id: p.id, label: t(p.name) }))],
    onPick: (v) => update((pr) => {
      const pins = { ...(pr.colourPins || {}) };
      if (v === 'random') delete pins[s];
      else pins[s] = v;
      return { colourPins: pins };
    }),
  });
  return (
    <View>
      <SectionLabel>{t('Preview')}</SectionLabel>
      <ThemePreview />
      {app.daily ? (
        <Body size={11.5} color={th.muted} style={{ marginTop: 6 }}>
          {app.daily.royal ? t('Now: {name} for {day}', { name: t((th.isLight && app.daily.lightPalette ? app.daily.lightPalette : app.daily.palette).name), day: t(ROYAL_NAMES[app.daily.royal]) }) : t('Now: {name}', { name: t((th.isLight && app.daily.lightPalette ? app.daily.lightPalette : app.daily.palette).name) })}
        </Body>
      ) : null}

      <SectionLabel>{t('Mode')}</SectionLabel>
      <Segmented value={data.themeMode} onChange={(v) => update({ themeMode: v })} options={[{ id: 'dark', label: t('Dark') }, { id: 'light', label: t('Light') }, { id: 'daynight', label: t('Day & night') }, { id: 'auto', label: t('Auto') }]} />
      <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{data.themeMode === 'daynight' ? t('Light from sunrise, dark from Maghrib.') : t("Auto follows your phone's dark mode setting.")}</Body>
      {app.nightOn ? (
        <Card active style={{ marginTop: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Feather name="moon" size={15} color={th.accent} />
          <Body size={12.5} style={{ flex: 1 }}>{t('Night mode is on now, so these colours show again after Fajr.')}</Body>
          <Press onPress={() => update({ nightOffDay: app.nightBase.toDateString() })}><Body size={12} weight="semi" color={th.accent}>{t('Turn off for tonight')}</Body></Press>
        </Card>
      ) : null}

      <SectionLabel>{t('Colours follow the day')}</SectionLabel>
      <Segmented value={mode} onChange={(v) => update({ colourMode: v })} options={[{ id: 'off', label: t('Off') }, { id: 'time', label: t('Time of day') }, { id: 'all', label: t('Time & occasions') }]} />
      <Body size={11.5} color={th.muted} style={{ marginTop: 8, lineHeight: 17 }}>
        {mode === 'off'
          ? t('One fixed colour scheme, picked below.')
          : mode === 'time'
            ? t('The colours change with the prayer times, and a new one is picked each day.')
            : t('The colours change with the prayer times. Friday, White Days and fasting days get their own, and Eid, Ramadan, Arafah and other big days get a special royal colour.')}
      </Body>

      {mode !== 'off' ? (
        <>
          <SectionLabel>{t('Each part of the day')}</SectionLabel>
          <Card style={{ paddingVertical: 2 }}>
            {SLOTS.map((s, i) => {
              const pin = (data.colourPins || {})[s];
              const list = TIME_PALETTES[s];
              return (
                <Row
                  key={s} first={i === 0} label={t(SLOT_NAMES[s])} value={slotLabel(s)} onPress={() => pickSlot(s)}
                  right={(
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Body size={12.5} color={th.muted}>{slotLabel(s)}</Body>
                      <View style={{ flexDirection: 'row' }}>
                        {list.filter((p) => !pin || p.id === pin).map((p) => (
                          <View key={p.id} style={{ width: 16, height: 16, borderRadius: 8, marginLeft: -4, borderWidth: 2, borderColor: th.bg, backgroundColor: th.isLight ? p.light.accent : p.dark.accent }} />
                        ))}
                      </View>
                      <Feather name="chevron-right" size={16} color={th.faint} />
                    </View>
                  )}
                />
              );
            })}
          </Card>
          {mode === 'all' ? (
            <>
              <SectionLabel>{t('Special days')}</SectionLabel>
              <Card style={{ padding: 12 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {Object.keys(ROYAL).map((k) => {
                    const p = th.isLight ? ROYAL[k].light : ROYAL[k].dark;
                    return (
                      <View key={k} style={{ width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 12, backgroundColor: p.bg, borderWidth: 1, borderColor: p.accentLine }}>
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: p.accent }} />
                        <View style={{ flex: 1 }}>
                          <Body size={11.5} weight="semi" color={p.ink} numberOfLines={1}>{t(ROYAL[k].name)}</Body>
                          <Body size={10} color={p.muted} numberOfLines={1}>{t(ROYAL_NAMES[k])}</Body>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </>
          ) : null}
        </>
      ) : (
        <>
          <SectionLabel>{t('Dark mode colours')}</SectionLabel>
          <Card><Swatches list={DARK_PALETTES} value={data.darkPalette} onPick={(id) => update({ darkPalette: id, ...(data.themeMode === 'light' ? { themeMode: 'dark' } : {}) })} /></Card>
          <SectionLabel>{t('Light mode colours')}</SectionLabel>
          <Card><Swatches list={LIGHT_PALETTES} value={data.lightPalette} onPick={(id) => update({ lightPalette: id, ...(data.themeMode === 'dark' ? { themeMode: 'light' } : {}) })} /></Card>
        </>
      )}

      <SectionLabel>{t('Night mode')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row first icon="moon" label={t('Night mode')} sub={t('Dim, calm colours at night, a different one each night')} right={<Toggle value={!!data.nightOn} onChange={(v) => update({ nightOn: v, nightOffDay: null })} />} />
      </Card>
      {data.nightOn ? (
        <>
          <Segmented style={{ marginTop: 10 }} value={data.nightWhen || 'lastThird'} onChange={(v) => update({ nightWhen: v })} options={[{ id: 'lastThird', label: t('Last third of the night') }, { id: 'always', label: t('All night') }]} />
          <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{data.nightWhen === 'always' ? t('From Isha until Fajr.') : t('From the last third of the night until Fajr, for Tahajjud.')}</Body>
        </>
      ) : null}

      <SectionLabel>{t('Feel')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row first icon="smartphone" label={t('Vibration on tap')} right={<Toggle value={data.hapticsEnabled} onChange={(v) => update({ hapticsEnabled: v })} />} />
      </Card>
    </View>
  );
}

function LanguagePage() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const { data, update } = app;
  return (
    <View>
      <SectionLabel>{t('Preview')}</SectionLabel>
      <Card style={{ padding: 14 }}>
        <Arabic size={22} style={{ textAlign: 'center' }}>رَبِّ زِدْنِي عِلْمًا</Arabic>
        <Body size={13} color={th.muted} style={{ textAlign: 'center', fontStyle: 'italic' }}>Rabbi zidni ‘ilma</Body>
        <Body size={14} style={{ textAlign: 'center', marginTop: 4 }}>{t('My Lord, increase me in knowledge.')}</Body>
        <Serif size={16} style={{ textAlign: 'center', marginTop: 8 }}>{`${t('Asr')} · ${timeStr(t, app.getDay(app.today).Asr, app.coords.timezone)}`}</Serif>
      </Card>

      <SectionLabel>{t('Language')}</SectionLabel>
      <Segmented value={data.lang} onChange={(v) => update({ lang: v })} options={[{ id: 'en', label: 'English' }, { id: 'bn', label: 'বাংলা' }]} />

      <SectionLabel>{t('Arabic text size')}</SectionLabel>
      <Segmented value={String(data.arabicSize ?? 1)} onChange={(v) => update({ arabicSize: Number(v) })} options={[{ id: '0', label: t('Small') }, { id: '1', label: t('Normal') }, { id: '2', label: t('Large') }, { id: '3', label: t('Huge') }]} />

      <SectionLabel>{t('Text size')}</SectionLabel>
      <Segmented value={String(data.textSize ?? 1)} onChange={(v) => update({ textSize: Number(v) })} options={[{ id: '0', label: t('Small') }, { id: '1', label: t('Normal') }, { id: '2', label: t('Large') }, { id: '3', label: t('Largest') }]} />
      <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{t('All text in the app')}</Body>
    </View>
  );
}

function HomePage() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const [which, setWhich] = useState('normal');
  const ramadan = which === 'ramadan';
  const field = ramadan ? 'ramadanOrder' : 'homeCards';
  const order = homeCardOrder(app.data[field], ramadan);
  const save = (list) => app.update({ [field]: list });
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    save(next);
  };
  return (
    <View>
      <Body size={12.5} color={th.muted} style={{ marginTop: 10 }}>{t('The arch always stays at the top. Choose what comes under it and in what order, including the prayer times.')}</Body>
      <Segmented style={{ marginTop: 12 }} value={which} onChange={setWhich} options={[{ id: 'normal', label: t('Every day') }, { id: 'ramadan', label: t('Ramadan') }]} />
      {ramadan ? <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{t('Used during Ramadan. The everyday order comes back after Eid.')}</Body> : null}
      <Card style={{ paddingVertical: 2, marginTop: 12 }}>
        {order.map((c, i) => (
          <View key={c.id}>
            {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 14, paddingRight: 8, gap: 8 }}>
              <Body size={14} weight="med" style={{ flex: 1 }} color={c.hidden ? th.faint : th.ink}>{t(HOME_CARDS[c.id])}</Body>
              <Press onPress={() => move(i, -1)} hitSlop={6} style={{ padding: 6, opacity: i === 0 ? 0.3 : 1 }} accessibilityLabel={t('Move up')}><Feather name="arrow-up" size={16} color={th.muted} /></Press>
              <Press onPress={() => move(i, 1)} hitSlop={6} style={{ padding: 6, opacity: i === order.length - 1 ? 0.3 : 1 }} accessibilityLabel={t('Move down')}><Feather name="arrow-down" size={16} color={th.muted} /></Press>
              <Toggle value={!c.hidden} label={t(HOME_CARDS[c.id])} onChange={(v) => save(order.map((x) => (x.id === c.id ? { ...x, hidden: !v } : x)))} />
            </View>
          </View>
        ))}
      </Card>
      <Press onPress={() => app.update({ [field]: null })} style={{ alignSelf: 'center', paddingVertical: 12 }}>
        <Body size={12.5} weight="semi" color={th.muted}>{t('Reset to the default order')}</Body>
      </Press>
    </View>
  );
}

// Safar: home, the distance and whether Deen asks.
function SafarPage() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const { data, update } = app;
  return (
    <View>
      <Card style={{ paddingVertical: 2, marginTop: 12 }}>
        <Row first icon="navigation" label={t('Safar now')} sub={data.travelConfirmed ? t('On since {date}', { date: data.travelConfirmed }) : t('Off')} right={<Toggle value={!!data.travelConfirmed} onChange={(v) => update(v ? { travelConfirmed: app.today.toDateString() } : { travelConfirmed: null, safarDeclined: true })} />} />
        <Row icon="home" label={t('Home')} value={data.homeBase ? data.homeBase.name || t('Saved') : t('Not set')} onPress={() => { if (app.gps.coords) { update({ homeBase: { ...app.gps.coords, name: app.locationName } }); app.setToast(t('Saved {name} as home', { name: app.locationName })); } }} sub={t('Tap to set where you are now as home')} />
        <Row icon="map" label={t('Distance')} value={t('{n} km', { n: 78 })} chevron={false} />
        <Row icon="help-circle" label={t('When I travel')} value={data.safarAsk === 'off' ? t('Off') : t('Ask me')} onPress={() => update({ safarAsk: data.safarAsk === 'off' ? 'ask' : 'off' })} />
      </Card>
      <Body size={12} color={th.muted} style={{ marginTop: 10, lineHeight: 18 }}>{t("In the Hanafi school you're a traveller once you're about 78 km (48 miles) from home and plan to stay less than 15 days. Dhuhr, Asr and Isha are 2 rak'ahs; Fajr, Maghrib and Witr stay the same. Behind a local imam you pray the full 4. Prayers are not joined.")}</Body>
      <NotConfirmed />
    </View>
  );
}

function BackupPage() {
  const app = useApp();
  const t = useT();
  const { data, update } = app;
  const lastBackupDays = data.lastBackupAt ? Math.floor((Date.now() - new Date(data.lastBackupAt).getTime()) / 86400000) : null;
  const doExport = async () => {
    try {
      await exportBackup(data, t('Save your Deen backup'));
      update({ lastBackupAt: nowDate().toISOString() });
    } catch (e) {
      app.setToast(t('Could not export the backup'));
    }
  };
  const doImport = async () => {
    try {
      const d = await pickBackup();
      if (!d) return;
      applyBackup(app, d);
      app.setToast(t('Backup restored'));
    } catch (e) {
      app.setToast(t("That file isn't a Deen backup"));
    }
  };
  return (
    <View>
    <GoogleSection />
    <SectionLabel>{t('On this phone')}</SectionLabel>
    <Card style={{ paddingVertical: 2 }}>
      <Row
        first icon="upload" label={t('Export backup')}
        sub={lastBackupDays === null ? t('Save your log, fasts, notes and settings to Drive, Files or WhatsApp') : lastBackupDays === 0 ? t('Last backup today') : t('Last backup {n} days ago', { n: lastBackupDays })}
        onPress={doExport}
      />
      <Row icon="bell" label={t('Monthly backup reminder')} right={<Toggle value={data.backupReminder !== false} onChange={(v) => update({ backupReminder: v })} />} />
      <Row icon="download" label={t('Restore from backup')} sub={t('Pick a Deen backup file')} onPress={doImport} />
      {Platform.OS === 'android' && !data.google ? (
        <>
          <Row
            icon="refresh-cw" label={t('Weekly auto backup')}
            sub={data.backupWeekly && data.backupDirUri ? (data.lastAutoBackupAt ? t('Last one {n} days ago · keeps the newest 4', { n: Math.floor((Date.now() - new Date(data.lastAutoBackupAt).getTime()) / 86400000) }) : t('First one runs soon · keeps the newest 4')) : t('Saves a copy to a folder you pick, once a week')}
            right={<Toggle value={!!(data.backupWeekly && data.backupDirUri)} onChange={async (v) => {
              if (!v) { update({ backupWeekly: false }); return; }
              const dir = data.backupDirUri || (await pickBackupFolder().catch(() => null));
              if (dir) update({ backupWeekly: true, backupDirUri: dir });
              else app.setToast(t('No folder picked'));
            }} />}
          />
          {data.backupDirUri ? <Row icon="folder" label={t('Change folder')} onPress={async () => { const dir = await pickBackupFolder().catch(() => null); if (dir) update({ backupDirUri: dir, lastAutoBackupAt: null }); }} /> : null}
        </>
      ) : null}
    </Card>
    </View>
  );
}

function AboutPage() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const version = Constants.expoConfig?.version || '1.6.0';
  const build = Constants.expoConfig?.android?.versionCode;
  const [taps, setTaps] = useState(0);
  const tapVersion = () => {
    const n = taps + 1;
    setTaps(n);
    if (n >= 5) {
      setTaps(0);
      nav.openSheet('preview');
    }
  };
  const open = (url) => Linking.openURL(url).catch(() => {});
  return (
    <View>
      <Card style={{ paddingVertical: 2, marginTop: 12 }}>
        <Row first icon="info" label="Deen" value={`v${t.num(version)}${build ? ` (${t.num(build)})` : ''}`} chevron={false} onPress={tapVersion} />
        <Row icon="message-square" label={t('Send feedback')} sub={feedbackReady() ? t('A suggestion or a problem') : t('Coming soon')} onPress={() => nav.push('feedback')} />
        <Row icon="gift" label={t("What's new")} onPress={() => nav.openSheet('whatsNew')} />
        <Row icon="refresh-cw" label={t('Show the welcome screens again')} onPress={() => app.update({ onboarded: false })} />
        <Row
          icon="book-open" label={t('How times are worked out')}
          onPress={() => nav.openSheet('info', {
            title: t('How times are worked out'),
            body: t('Prayer times use the adhan library with your chosen method. Qibla uses the great-circle bearing to the Kaaba. Moon-sighting prediction uses the Astronomy Engine library with the Odeh (2006) visibility criterion. These calculations all run on your phone; nothing is sent anywhere for them.'),
          })}
        />
        <Row
          icon="feather" label={t('Sources')}
          onPress={() => nav.openSheet('info', {
            title: t('Sources'),
            bullets: [
              t('Quran: Uthmani text (The Noble Qur’an Encyclopedia). Bangla translation by Maulana Muhiuddin Khan, English by Saheeh International, both from Tanzil.net.'),
              t('Duas and hadith: Hisnul Muslim, Bangla translation and editing by Dr. Abu Bakr Muhammad Zakaria (IslamHouse).'),
              t('Guides and rulings: based on Bahishti Zewar (Hanafi), with the reference shown. Rulings not yet checked show a red note.'),
            ],
          })}
        />
      </Card>
      <Card style={{ paddingVertical: 2, marginTop: 12 }}>
        <Row first icon="file-text" label={t('Terms of service')} onPress={() => open(LEGAL.terms)} />
        <Row icon="shield" label={t('Privacy policy')} onPress={() => open(LEGAL.privacy)} />
      </Card>
      <View style={{ alignItems: 'center', marginTop: 22 }}>
        <Arabic size={16} color={th.accent}>دِين</Arabic>
        <Body size={11} color={th.faint}>{t('Prayer times, Qibla, Hijri calendar and daily worship')}</Body>
        <Body size={11.5} weight="semi" color={th.muted} style={{ marginTop: 8 }}>{t('Created and designed by Anisuzzaman Tamal')}</Body>
      </View>
    </View>
  );
}

// The terms and privacy pages on the Deen website (GitHub Pages).
export const LEGAL = {
  terms: 'https://anisuzzamantomalmohammad-svg.github.io/Deen/terms.html',
  privacy: 'https://anisuzzamantomalmohammad-svg.github.io/Deen/privacy.html',
};

export function SettingsPageScreen({ page }) {
  const nav = useNav();
  const t = useT();
  const L = useLayout();
  const Page = { widget: WidgetPage, adjust: AdjustPage, prayer: PrayerPage, calendar: CalendarPage, appearance: AppearancePage, language: LanguagePage, home: HomePage, backup: BackupPage, about: AboutPage, safar: SafarPage }[page] || AboutPage;
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <ScreenTitle onBack={nav.pop} title={t(PAGE_TITLES[page] || 'Settings')} />
      <Page />
    </ScrollView>
  );
}

/* ------------------------------------------------------------- search */
// Every setting, with the page it lives on, plus the Essentials tools.
// Search matches English and Bangla at once, so either language finds it.
export const SETTINGS_INDEX = [
  ['Location', 'location', 'map city place'],
  ['Calculation method', 'prayer', 'karachi isna mwl'],
  ['Asr time', 'prayer', 'hanafi shafi madhab'],
  ['Seheri ends before Fajr', 'prayer', 'sehri suhoor buffer'],
  ['Second city', 'prayer', 'dhaka family'],
  ['Adjust times', 'adjust', 'masjid minutes earlier later offset jamaat'],
  ['Alerts', 'alerts', 'notification adhan sound reminder'],
  ['Hijri calendar', 'calendar', 'moon sighting umm al-qura'],
  ['New Hijri day starts at Maghrib', 'calendar', 'sunset date'],
  ['Hijri birthday', 'calendar', 'birthday'],
  ['Show eclipses', 'calendar', 'eclipse'],
  ['Main date on the calendar', 'calendar', 'hijri regular english gregorian'],
  ['Google account', 'account', 'sign in drive google profile'],
  ['Sync now', 'account', 'two phones same account'],
  ['Add to Google Calendar', 'backup', 'calendar events eid'],
  ['Show history in the calendar', 'calendar', 'history'],
  ['Mode', 'appearance', 'dark light theme'],
  ['Colours follow the day', 'appearance', 'colour color palette royal'],
  ['Night mode', 'appearance', 'amber tahajjud dim'],
  ['Day & night', 'appearance', 'sunrise maghrib theme'],
  ['Vibration on tap', 'appearance', 'haptic vibrate'],
  ['Language', 'language', 'bangla english'],
  ['Arabic text size', 'language', 'font'],
  ['Text size', 'language', 'font bigger'],
  ['Home screen', 'home', 'cards order hide ramadan'],
  ['Safar (travelling)', 'safar', 'travel qasr musafir journey'],
  ['Export backup', 'backup', 'save drive'],
  ['Restore from backup', 'backup', 'import'],
  ['Weekly auto backup', 'backup', 'automatic folder'],
  ['Check my alerts', 'tool:alertCheck', 'test notification watch'],
  ['Different buzz per prayer', 'alerts', 'vibration vibrate pattern'],
  ['Add widget', 'widget', 'home screen countdown'],
  ['Send feedback', 'tool:feedback', 'suggestion complaint problem bug'],
  ["What's new", 'sheet:whatsNew', 'update changes'],
  ['About', 'about', 'version terms privacy'],
  ['Qibla', 'ess:qibla', 'compass direction kaaba'],
  ['Timetable', 'ess:timetable', 'month table monthly'],
  ['Charity', 'ess:charity', 'zakat fitrah fidya kaffarah sadaqah'],
  ['Important days', 'ess:importantDays', 'events eid'],
  ['Date converter', 'ess:dateConverter', 'gregorian convert'],
  ['Share times', 'ess:share', 'image picture whatsapp'],
  ['Tasbih', 'ess:tasbih', 'counter dhikr'],
  ['Learn', 'ess:learn', 'arabic letters kids games'],
  ['Quran reader', 'tool:quran', 'koran surah ayah read bookmark'],
  ['99 Names of Allah', 'tool:names', 'asma husna names'],
  ['Ask Deen', 'tool:ask', 'search question find'],
];

// Open whatever a search result points at.
export function goSetting(nav, app, t, target) {
  if (!target) return;
  if (target === 'location') nav.openSheet('location');
  else if (target === 'alerts') nav.push('alerts');
  else if (target === 'account') nav.openSheet('account');
  else if (target.startsWith('tool:')) nav.push(target.slice(5));
  else if (target.startsWith('sheet:')) nav.openSheet(target.slice(6));
  else if (target.startsWith('ess:')) openEssential(nav, target.slice(4));
  else if (PAGE_TITLES[target]) nav.push('settingsPage', { page: target });
}

/* ---------------------------------------------------------------- main */
export default function SettingsScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { data } = app;
  const [q, setQ] = useState('');
  const method = CALC_METHODS.find((m) => m.id === data.calcMethod) || CALC_METHODS[0];
  const alertsSub = data.notificationsEnabled ? (data.preReminderMins ? t('On · {n} min before', { n: data.preReminderMins }) : t('On')) : t('Off');
  const lastBackupDays = data.lastBackupAt ? Math.floor((Date.now() - new Date(data.lastBackupAt).getTime()) / 86400000) : null;
  const colourName = app.daily ? t((th.isLight && app.daily.lightPalette ? app.daily.lightPalette : app.daily.palette).name) : t((th.isLight ? LIGHT_PALETTES.find((p) => p.id === data.lightPalette) : DARK_PALETTES.find((p) => p.id === data.darkPalette))?.name || '');
  const modeName = { dark: t('Dark'), light: t('Light'), auto: t('Auto'), daynight: t('Day & night') }[data.themeMode];

  const go = (target) => goSetting(nav, app, t, target);
  const where = (target) => {
    if (target.startsWith('ess:')) return t('Essentials');
    if (target.startsWith('tool:') || target.startsWith('sheet:') || target === 'widget') return t('Settings');
    if (target === 'account') return t('Profile');
    return PAGE_TITLES[target] ? t(PAGE_TITLES[target]) : null;
  };

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return null;
    return SETTINGS_INDEX.filter(([label, , words]) => [label, translate('bn', label), words].some((x) => String(x || '').toLowerCase().includes(term)));
  }, [q]);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 16, paddingHorizontal: L.pad, paddingBottom: L.bottomSpace }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <ScreenTitle title={t('Settings')} right={<AccountCorner />} />
      <View style={{ marginTop: 8 }}>
        <Input value={q} onChangeText={setQ} placeholder={t('Search settings')} autoCorrect={false} returnKeyType="search" style={{ paddingRight: 40 }} />
        {q ? (
          <Press onPress={() => setQ('')} hitSlop={10} accessibilityLabel={t('Clear search')} style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
            <Feather name="x-circle" size={17} color={th.faint} />
          </Press>
        ) : null}
      </View>

      {results ? (
        <Card style={{ paddingVertical: 2, marginTop: 12 }}>
          {results.length ? results.map(([label, target], i) => (
            <Row key={label} first={i === 0} label={t(label)} sub={where(target)} onPress={() => { setQ(''); go(target); }} />
          )) : <Body size={13} color={th.muted} style={{ padding: 14 }}>{t('Nothing found')}</Body>}
        </Card>
      ) : (
        <>
          <Card style={{ paddingVertical: 2, marginTop: 14 }}>
            <Row first icon="map-pin" label={t('Location')} value={app.locationName} onPress={() => nav.openSheet('location')} />
            <Row icon="clock" label={t('Prayer times')} value={`${method.id === 'Karachi' ? 'Karachi' : t(method.label)} · ${data.asrMethod === 'Hanafi' ? t('Hanafi') : t('Standard')}${adjCount(data) ? ` · ${t('adjusted')}` : ''}`} onPress={() => go('prayer')} />
            <Row icon="bell" label={t('Alerts')} value={alertsSub} onPress={() => go('alerts')} />
            <Row icon="moon" label={t('Calendar & dates')} value={data.hijriMode === 'ummalqura' ? t('Umm al-Qura') : t('Moon sighting')} onPress={() => go('calendar')} />
            <Row icon="navigation" label={t('Safar (travelling)')} value={data.travelConfirmed ? t('On') : data.safarAsk === 'off' ? t('Off') : t('Ask me')} onPress={() => go('safar')} />
          </Card>
          <Card style={{ paddingVertical: 2, marginTop: 12 }}>
            <Row first icon="droplet" label={t('Appearance')} value={`${modeName} · ${colourName}`} onPress={() => go('appearance')} />
            <Row icon="type" label={t('Language & text')} value={data.lang === 'bn' ? 'বাংলা' : 'English'} onPress={() => go('language')} />
            <Row icon="layout" label={t('Home screen')} value={t('{n} cards', { n: homeCardOrder(data.homeCards).filter((c) => !c.hidden).length })} onPress={() => go('home')} />
            {Platform.OS === 'android' ? <Row icon="smartphone" label={t('Add widget')} onPress={() => go('widget')} /> : null}
          </Card>
          <Card style={{ paddingVertical: 2, marginTop: 12 }}>
            <Row first icon="upload" label={t('Backup')} value={data.google ? t('Google Drive') : lastBackupDays === null ? t('Never') : lastBackupDays === 0 ? t('Today') : t('{n} days ago', { n: lastBackupDays })} onPress={() => go('backup')} />
            <Row icon="info" label={t('About')} value={`v${t.num(Constants.expoConfig?.version || '1.6.0')}`} onPress={() => go('about')} />
          </Card>
        </>
      )}
    </ScrollView>
  );
}
