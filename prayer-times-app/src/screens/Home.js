import React, { useEffect, useMemo } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Arabic, Press, Card, PatternBand, Divider, Tick } from '../ui/kit';
import { Arch, SunArc } from '../ui/parts';
import { useNow, useLayout, longDate, hijriLabel, countdownText, mmss, timeStr, shortDuration, HIJRI_MONTHS_AR, hijriMonthName } from '../ui/hooks';
import { PRAYER_NAMES, PRAYER_AR, addDays, addMinutes, makruhWindows, computeDay, zonedParts } from '../lib/prayer';
import { isHijriBirthday, hijriAge } from '../lib/birthday';
import { nextMonthBoundary } from '../lib/hijri';
import { upcomingEvents } from '../lib/events';
import { eventTitle } from '../data/eventText';
import { nightOf, duhaOf } from '../lib/waqt';
import { DUAS } from '../data/duas';
import { fastingDayInfo } from '../lib/alerts';
import { homeCardOrder } from '../lib/homeCards';
import { sunnahFor } from '../data/sunnahs';
import { qadaOf } from '../lib/qada';
import { duaText } from '../data/duaText';

export function useNextPrayer(now) {
  const app = useApp();
  const { today, getDay } = app;
  return useMemo(() => {
    const y = getDay(addDays(today, -1));
    const d = getDay(today);
    const tm = getDay(addDays(today, 1));
    const list = [
      { name: 'Isha', at: y.Isha, day: addDays(today, -1) },
      ...PRAYER_NAMES.map((n) => ({ name: n, at: d[n], day: today })),
      { name: 'Fajr', at: tm.Fajr, day: addDays(today, 1) },
    ];
    let i = list.findIndex((p) => p.at > now);
    if (i < 1) i = list.length - 1;
    const next = list[i];
    const prev = list[i - 1];
    const span = next.at - prev.at;
    return { next, prev, progress: span > 0 ? Math.max(0, Math.min(1, (now - prev.at) / span)) : 0, left: next.at - now };
  }, [today, getDay, Math.floor(now / 1000)]);
}

export function fastingWindow(app, now) {
  const { today, getDay, data } = app;
  const buf = data.safetyBuffer || 0;
  const d = getDay(today);
  const seheri = addMinutes(d.Fajr, -buf);
  const iftar = d.Maghrib;
  if (now >= seheri && now < iftar) return { night: false, from: seheri, to: iftar, progress: (now - seheri) / (iftar - seheri) };
  if (now >= iftar) {
    const s2 = addMinutes(getDay(addDays(today, 1)).Fajr, -buf);
    return { night: true, from: iftar, to: s2, progress: (now - iftar) / (s2 - iftar) };
  }
  const i0 = getDay(addDays(today, -1)).Maghrib;
  return { night: true, from: i0, to: seheri, progress: (now - i0) / (seheri - i0) };
}

export default function HomeScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const now = useNow(1000);
  const L = useLayout();
  const { today, coords, hijri, data } = app;
  const tz = coords.timezone;
  const np = useNextPrayer(now);
  const fw = fastingWindow(app, now);
  const times = app.getDay(today);
  const h = hijri(today);
  const hNow = app.hijriNow || h;
  const makruh = app.activeMakruh && now < app.activeMakruh.end ? app.activeMakruh : null;

  const archW = Math.min(L.width * 0.56, 232);
  const archH = archW * 1.22;

  const events = useMemo(() => upcomingEvents(today, hijri, 60, { history: false, coords: app.coords, eclipses: app.data.showEclipses !== false }), [today, hijri, app.coords, app.data.showEclipses]);
  const nextEvent = events[0];
  const boundary = useMemo(() => nextMonthBoundary(today, app.cal), [today, app.cal]);
  const showMoon = data.moonCheck !== false && boundary && boundary.evening.getTime() === today.getTime();

  const cards = homeCardOrder(data.homeCards);
  const cardShown = (id) => !(cards.find((c) => c.id === id) || {}).hidden;
  const belowPrayers = cards.filter((c) => c.id !== 'fasting' && !c.hidden).map((c) => c.id);
  const showHint = (data.homeTicks || 0) < 10 || (app.travelling && data.travelConfirmed);
  const travelLine = app.travelling && data.travelConfirmed ? t("Travelling: Dhuhr, Asr and Isha are 2 rak'ahs") : null;

  // Tick or untick, with Undo on the toast. Ticking the fifth one gets a
  // small celebration instead.
  const tick = (name, wasDone) => {
    app.togglePrayer(today, name);
    const undo = { label: t('Undo'), onPress: () => app.togglePrayer(today, name) };
    const others = PRAYER_NAMES.filter((n) => n !== name).every((n) => app.isPrayed(today, n));
    if (!wasDone && others) {
      app.haptic('success');
      app.setToast({ message: t('All 5 today. Masha Allah!'), action: undo, celebrate: true });
    } else {
      app.setToast({ message: wasDone ? t('{name} unticked', { name: t(name) }) : t('{name} ticked', { name: t(name) }), action: undo });
    }
  };

  const tileState = (name) => {
    const done = app.isPrayed(today, name);
    const qada = !!qadaOf(data, today, name);
    const isNext = np.next.name === name && np.next.day.getTime() === today.getTime();
    const passed = times[name] <= now;
    return { done, qada, isNext, passed };
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: L.bottomSpace }} showsVerticalScrollIndicator={false}>
        <PatternBand height={archH + 150 + L.insets.top} />
        <View style={{ paddingTop: L.insets.top + 14, paddingHorizontal: L.pad, alignItems: 'center' }}>
          {/* Location, date, Hijri date */}
          <Press onPress={() => nav.openSheet('location')} hitSlop={8} accessibilityLabel={t('Change location')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="map-pin" size={15} color={th.accent} />
            <Serif size={20} numberOfLines={1} style={{ maxWidth: L.width - 110, textShadowColor: th.isLight ? 'transparent' : 'rgba(0,0,0,0.45)', textShadowRadius: 6 }}>
              {app.isAuto && app.gps.loading && !app.gps.coords && !data.lastAuto ? t('Finding you…') : app.locationName}
            </Serif>
            <Feather name="chevron-down" size={15} color={th.muted} />
          </Press>
          <Body size={11} weight="semi" style={{ letterSpacing: 0.5, marginTop: 2 }}>{longDate(t.lang, today)}</Body>
          <Press onPress={() => nav.setTab('Hijri')} style={{ marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: th.accentLine, backgroundColor: th.isLight ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.35)' }}>
            <Body size={10.5} weight="semi" color={th.accent}>{`${hijriLabel(t.lang, hNow)}${app.afterMaghrib ? ` · ${t('from Maghrib')}` : ''}`}</Body>
            <Arabic size={11.5} color={th.accent} style={{ lineHeight: 18 }}>{HIJRI_MONTHS_AR[hNow.monthIndex]}</Arabic>
          </Press>

          {/* The arch */}
          <View style={{ marginTop: 18 }}>
            <Arch width={archW} height={archH} progress={np.progress} cycleKey={`${np.next.name}${np.next.at.getTime()}`} onPress={() => nav.openSheet('prayer', { name: np.next.name, date: np.next.day })}>
              <Label color={th.cardInk} style={{ opacity: 0.7 }}>{t('Next prayer')}</Label>
              <Arabic size={archW * 0.13} color={th.arcAr} style={{ marginTop: 2, lineHeight: archW * 0.2 }}>{PRAYER_AR[np.next.name]}</Arabic>
              <Serif size={archW * 0.13} color={th.cardInk} style={{ lineHeight: archW * 0.15 }}>{t(np.next.name)}</Serif>
              <Serif bold size={archW * 0.165} color={th.cardInk} style={{ marginTop: 2 }}>{countdownText(t, np.left)}</Serif>
              <Label color={th.cardInk} style={{ opacity: 0.7, marginTop: 2 }}>{t('At {time}', { time: timeStr(t, np.next.at, tz) })}</Label>
              {makruh ? (
                <View style={{ marginTop: 9, paddingTop: 7, borderTopWidth: 1, borderColor: th.isLight ? 'rgba(255,255,255,0.35)' : 'rgba(179,38,30,0.25)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="alert-triangle" size={10} color={th.isLight ? '#FFE3DC' : '#B3261E'} />
                  <Label color={th.isLight ? '#FFE3DC' : '#B3261E'} size={8.5}>{t('Prohibited · ends in {t}', { t: mmss(t, makruh.end - now) })}</Label>
                </View>
              ) : null}
            </Arch>
          </View>
          {app.nightOn ? (
            <Press onPress={() => { app.update({ nightOffDay: app.nightBase.toDateString() }); app.setToast(t('Night mode off until tomorrow night')); }} hitSlop={8} style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="moon" size={12} color={th.muted} />
              <Body size={11.5} color={th.muted}>{`${t('Night mode')} · `}</Body>
              <Body size={11.5} weight="semi" color={th.accent}>{t('Turn off for tonight')}</Body>
            </Press>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: L.pad, marginTop: 16 }}>
          {/* Seheri / Iftar band */}
          {cardShown('fasting') ? <FastingBand fw={fw} now={now} /> : null}

          <Notice now={now} />

          {showMoon ? (
            <Card style={{ marginTop: 10, padding: 14 }} active>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Feather name="moon" size={18} color={th.accent} />
                <View style={{ flex: 1 }}>
                  <Body size={13} weight="semi">{boundary.prevLength === 29 ? t('New moon expected tonight') : t('New moon unlikely tonight')}</Body>
                  <Body size={11.5} color={th.muted}>
                    {boundary.prevLength === 29
                      ? t('{month} likely starts tomorrow.', { month: hijriMonthName(t.lang, boundary.monthIndex) })
                      : t('{month} likely starts the day after tomorrow.', { month: hijriMonthName(t.lang, boundary.monthIndex) })}
                  </Body>
                </View>
              </View>
              <Press onPress={() => app.shiftMonth(boundary.year, boundary.monthIndex, boundary.prevLength === 29 ? 1 : -1)} style={{ marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: th.accentLine }}>
                <Body size={12} weight="semi" color={th.accent}>{boundary.prevLength === 29 ? t('My masjid says: a day later') : t('It was sighted: starts tomorrow')}</Body>
              </Press>
            </Card>
          ) : null}

          {h.monthIndex === 8 ? (
            <Card onPress={() => nav.push('fasting', { tab: 'today' })} style={{ marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }} active>
              <Feather name="moon" size={18} color={th.accent} />
              <View style={{ flex: 1 }}>
                <Serif size={16}>{t('Ramadan Mubarak · day {n}', { n: h.day })}</Serif>
                <Body size={11.5} color={th.muted}>{t('Taraweeh and Quran tracker on the fasting screen')}</Body>
              </View>
              <Feather name="chevron-right" size={16} color={th.faint} />
            </Card>
          ) : null}

          {/* Five prayers */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
            {PRAYER_NAMES.map((name) => {
              const s = tileState(name);
              return (
                <Press
                  key={name}
                  onPress={() => (s.qada ? nav.openSheet('prayer', { name, date: today }) : s.passed ? tick(name, s.done) : nav.openSheet('prayer', { name, date: today }))}
                  onLongPress={() => nav.openSheet('prayer', { name, date: today })}
                  accessibilityLabel={`${t(name)} ${timeStr(t, times[name], tz)}`}
                  accessibilityState={{ checked: s.done || s.qada }}
                  style={[
                    { flex: 1, alignItems: 'center', paddingTop: 9, paddingBottom: 9, borderRadius: 15, borderWidth: 1, borderColor: th.line, backgroundColor: th.soft },
                    s.isNext && { borderColor: th.accent, backgroundColor: th.accentSoft },
                    s.passed && !s.isNext && { opacity: 0.62 },
                  ]}
                >
                  <Label size={7.5} color={s.isNext ? th.accent : th.muted} numberOfLines={1} adjustsFontSizeToFit style={{ paddingHorizontal: 2 }}>{t(name)}</Label>
                  <Serif bold size={15} numberOfLines={1} adjustsFontSizeToFit color={s.isNext ? th.accent : th.ink} style={{ marginTop: 3, marginBottom: 6, paddingHorizontal: 3 }}>{timeStr(t, times[name], tz, true)}</Serif>
                  <View style={[{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: th.faint, alignItems: 'center', justifyContent: 'center' }, s.done && { backgroundColor: th.ok, borderColor: th.ok }, s.qada && { backgroundColor: th.amber, borderColor: th.amber }]}>
                    {s.done ? <Feather name="check" size={12} color="#fff" /> : s.qada ? <Feather name="rotate-ccw" size={11} color="#2a1a05" /> : null}
                  </View>
                </Press>
              );
            })}
          </View>
          {belowPrayers.map((id) => {
            if (id === 'extraTimes') {
              return (
                <View key={id}>
                  <ExtraTimes />
                  {showHint ? <Body size={10.5} color={th.faint} style={{ textAlign: 'center', marginTop: 6 }}>{travelLine || t('Tap a prayer to tick it off · hold for details')}</Body> : null}
                </View>
              );
            }
            if (id === 'secondCity') return <SecondCity key={id} now={now} />;
            if (id === 'prohibited') return <Prohibited key={id} times={times} now={now} />;
            if (id === 'comingUp') return nextEvent ? <ComingUp key={id} nextEvent={nextEvent} /> : null;
            if (id === 'sunnah') return <SunnahOfDay key={id} />;
            return null;
          })}
          {!belowPrayers.includes('extraTimes') && showHint ? <Body size={10.5} color={th.faint} style={{ textAlign: 'center', marginTop: 6 }}>{travelLine || t('Tap a prayer to tick it off · hold for details')}</Body> : null}
        </View>
      </ScrollView>
    </View>
  );
}


/* ---------------------------- Prohibited times ---------------------------- */
// Each window on one line, like "6:12–6:27 AM".
function Prohibited({ times, now }) {
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const tz = useApp().coords.timezone;
  const range = (a, b) => {
    const s0 = timeStr(t, a, tz, true);
    const s1 = timeStr(t, b, tz);
    return `${s0}–${s1}`;
  };
  return (
    <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22, marginBottom: 8, marginHorizontal: 2 }}>
            <Label>{t('Prohibited times')}</Label>
            <Body size={10.5} color={th.muted}>{t('No voluntary prayer')}</Body>
          </View>
          <Card style={{ paddingVertical: 2 }}>
            {makruhWindows(times).map((w, i) => {
              const nowIn = now >= w.start && now < w.end;
              const titles = { Sunrise: ['After sunrise', 'Sunrise'], Zawal: ['Midday', 'Zawal'], Sunset: ['Before sunset', 'Sunset'] };
              return (
                <View key={w.key}>
                  {i > 0 && <Divider inset={0} />}
                  <Press onPress={() => nav.openSheet('prohibited', { key: w.key })} scaleTo={0.99} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingRight: 14, paddingLeft: 16 }, nowIn && { backgroundColor: th.redSoft }]}>
                    <View style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 2.5, borderRadius: 2, backgroundColor: th.red }} />
                    <View style={{ flex: 1 }}>
                      <Serif size={15}>{t(titles[w.key][0])}</Serif>
                      <Label size={8} style={{ marginTop: 2 }} color={nowIn ? th.red : th.muted}>{nowIn ? `${t(titles[w.key][1])} · ${t('Now')}` : t(titles[w.key][1])}</Label>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Serif bold size={14} color={nowIn ? th.red : th.ink}>{range(w.start, w.end)}</Serif>
                      <Label size={8} style={{ marginTop: 2 }} color={nowIn ? th.red : th.muted}>{nowIn ? t('Ends in {t}', { t: mmss(t, w.end - now) }) : t('{n} min', { n: Math.round((w.end - w.start) / 60000) })}</Label>
                    </View>
                  </Press>
                </View>
              );
            })}
          </Card>

    </View>
  );
}

function ComingUp({ nextEvent }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const today = app.today;
  return (
            <Card onPress={() => nav.openSheet('event', { id: nextEvent.evt.id, date: nextEvent.date })} style={{ marginTop: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, alignItems: 'center' }}>
                <Serif bold size={20} color={th.accent}>{t.num(nextEvent.date.getDate())}</Serif>
                <Label size={8}>{t(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][nextEvent.date.getMonth()])}</Label>
              </View>
              <View style={{ flex: 1 }}>
                <Label size={8}>{t('Coming up')}</Label>
                <Serif size={15} numberOfLines={1} style={{ marginTop: 2 }}>{eventTitle(nextEvent.evt, t.lang)}</Serif>
                <Body size={11.5} color={th.muted}>{daysAwayText(t, nextEvent.date, today)}</Body>
              </View>
              <Feather name="chevron-right" size={16} color={th.faint} />
            </Card>
  );
}

function SunnahOfDay() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const s = sunnahFor(app.today);
  return (
    <Card style={{ marginTop: 14, padding: 14, flexDirection: 'row', gap: 12 }}>
      <Feather name="sun" size={17} color={th.accent} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Label size={8}>{t('Sunnah of the day')}</Label>
        <Body size={13.5} weight="med" style={{ marginTop: 3 }}>{t.lang === 'bn' ? s.bn : s.en}</Body>
        <Body size={11} weight="semi" color={th.accent} style={{ marginTop: 3 }}>{s.ref}</Body>
      </View>
    </Card>
  );
}

export function daysAwayText(t, date, today) {
  const n = Math.round((date - today) / 86400000);
  if (n <= 0) return t('Today');
  if (n === 1) return t('Tomorrow');
  return t('In {n} days', { n });
}

/* ------------------------- Seheri / Iftar band ------------------------- */
// "% fasted" only when you're fasting. Otherwise the day shows as a quiet grey
// arc, with a tap to mark today as a fast.
function FastingBand({ fw, now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const tz = app.coords.timezone;
  const fasting = app.fastingToday;
  const sunnah = !fw.night && !fasting ? fastingDayInfo(app.today, app.cal) : null;
  const quiet = !fw.night && !fasting;
  const markFast = () => {
    app.setFasted(app.today, true);
    app.setToast(t('Marked today as a fast'));
  };
  return (
    <Card onPress={() => nav.push('fasting')} style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 9 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Label size={8.5}>{fw.night ? t('Iftar') : t('Seheri')}</Label>
        {quiet ? (
          <Press onPress={markFast} hitSlop={8} accessibilityLabel={t('Mark today as a fast')}>
            <Label size={8.5} color={sunnah && sunnah.type === 'sunnah' ? th.sfc : th.muted}>{sunnah && sunnah.type === 'sunnah' ? t('Sunnah fast day ›') : t('Not fasting today ›')}</Label>
          </Press>
        ) : (
          <Label size={8.5}>{fw.night ? t('Night ›') : t('{p}% fasted ›', { p: Math.round(fw.progress * 100) })}</Label>
        )}
        <Label size={8.5}>{fw.night ? t('Seheri') : t('Iftar')}</Label>
      </View>
      <SunArc progress={fw.progress} night={fw.night} width={320} height={44} muted={quiet} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Serif size={15}>{timeStr(t, fw.from, tz, true)}</Serif>
        <Label size={9} color={quiet ? th.muted : th.accent}>
          {fw.night
            ? t('Seheri ends in {d}', { d: shortDuration(t, fw.to - now) })
            : quiet ? t('Maghrib at {time}', { time: timeStr(t, fw.to, tz, true) }) : t('Iftar in {d}', { d: shortDuration(t, fw.to - now) })}
        </Label>
        <Serif size={15}>{timeStr(t, fw.to, tz, true)}</Serif>
      </View>
    </Card>
  );
}

/* ------------- Duha · Isha ends · Tahajjud, under the prayers ------------- */
// The night shown is the one we're in (after midnight it's still last night).
function currentNight(app) {
  const { today, getDay } = app;
  const now = new Date();
  const d = getDay(today);
  if (now < d.Fajr) return nightOf(getDay(addDays(today, -1)), d);
  return nightOf(d, getDay(addDays(today, 1)));
}

function ExtraTimes() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const tz = app.coords.timezone;
  const duha = duhaOf(app.getDay(app.today));
  const night = currentNight(app);
  const cells = [
    { k: 'Duha', v: `${timeStr(t, duha.start, tz, true)}–${timeStr(t, duha.end, tz, true)}`, sheet: 'duha' },
    { k: 'Isha ends', v: timeStr(t, night.midnight, tz), info: t("Isha is best prayed before Islamic midnight, halfway between Maghrib and Fajr. After that it's still valid until Fajr, but delaying without a reason is disliked.") },
    { k: 'Tahajjud', v: timeStr(t, night.lastThird, tz), sheet: 'tahajjud' },
  ];
  return (
    <View style={{ flexDirection: 'row', marginTop: 10, borderWidth: 1, borderColor: th.line, borderRadius: 14, overflow: 'hidden' }}>
      {cells.map((c, i) => (
        <Press
          key={c.k}
          scaleTo={0.98}
          onPress={() => (c.sheet ? nav.openSheet('nightTime', { k: c.sheet }) : nav.openSheet('info', { title: t(c.k), body: c.info }))}
          accessibilityLabel={`${t(c.k)} ${c.v}`}
          style={[{ flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 }, i > 0 && { borderLeftWidth: 1, borderColor: th.line }]}
        >
          <Label size={8} numberOfLines={1}>{t(c.k)}</Label>
          <Serif size={13.5} numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 2 }}>{c.v}</Serif>
        </Press>
      ))}
    </View>
  );
}

/* --------------------- One notice card at a time --------------------- */
const IFTAR_DUA = DUAS.find((d) => d.id === 2);

// Prayer times somewhere else (family back home), shown small under the times.
function SecondCity({ now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const c = app.data.secondCity;
  if (!app.data.secondCityOn || !c) return null;
  // Hide it when you're in that city yourself.
  const dLat = Math.abs(c.latitude - app.coords.latitude);
  const dLon = Math.abs(c.longitude - app.coords.longitude);
  if (dLat < 0.3 && dLon < 0.3) return null;
  const tz = c.timezone;
  const p = zonedParts(new Date(now), tz);
  const localDay = new Date(p.y, p.m - 1, p.d);
  const bd = c.cc === 'BD';
  const method = bd ? 'Karachi' : app.data.calcMethod;
  const asr = bd ? 'Hanafi' : app.data.asrMethod;
  const tdy = computeDay(c, method, asr, localDay);
  const tmr = computeDay(c, method, asr, addDays(localDay, 1));
  let next = null;
  for (const n of PRAYER_NAMES) if (!next && tdy[n] > now) next = { name: n, at: tdy[n] };
  if (!next) next = { name: 'Fajr', at: tmr.Fajr };
  return (
    <Card onPress={() => nav.openSheet('secondCity')} style={{ marginTop: 12, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Feather name="globe" size={16} color={th.accent} />
      <View style={{ flex: 1 }}>
        <Body size={13.5} weight="semi" numberOfLines={1}>{`${t(c.name)} · ${timeStr(t, new Date(now), tz)}`}</Body>
        <Body size={11.5} color={th.muted} numberOfLines={1}>
          {t('{name} at {time} · in {d}', { name: t(next.name), time: timeStr(t, next.at, tz), d: shortDuration(t, next.at - now) })}
        </Body>
      </View>
      <Feather name="chevron-right" size={16} color={th.faint} />
    </Card>
  );
}

// Minutes ahead of UTC in a time zone at a moment (for clock changes).
const offFmt = {};
export function tzOffsetMin(date, tz) {
  try {
    if (!offFmt[tz]) offFmt[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    const p = {};
    offFmt[tz].formatToParts(date).forEach((x) => { p[x.type] = parseInt(x.value, 10); });
    return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute) - date.getTime()) / 60000);
  } catch (e) {
    return 0;
  }
}
// A clock change in the next 3 days: which day and by how much.
export function clockChangeSoon(today, tz) {
  const noon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  let prev = tzOffsetMin(noon(today), tz);
  for (let i = 1; i <= 3; i++) {
    const d = addDays(today, i);
    const o = tzOffsetMin(noon(d), tz);
    if (o !== prev) return { date: d, mins: o - prev };
    prev = o;
  }
  return null;
}

function useNotice(now) {
  const app = useApp();
  const { today, data, getDay, hijri } = app;
  const todayKey = today.toDateString();
  const hidden = (kind) => (data.noticeHidden || {})[kind] === todayKey;
  const d = getDay(today);
  const h = hijri(today);
  const fastingToday = app.fastingToday;
  // Remember the first city seen, so a new one can be asked about.
  const city = app.isAuto && app.gps.coords && app.gps.name ? app.gps.name : null;
  useEffect(() => {
    if (city && !data.seenCity) app.update({ seenCity: { name: city, ...app.gps.coords } });
  }, [city, !!data.seenCity]);
  const clock = useMemo(() => clockChangeSoon(today, app.coords.timezone), [todayKey, app.coords.timezone]);

  // 0. Location is off or blocked: help to fix it.
  if (app.isAuto && app.gps.error && !hidden('location')) return { kind: 'location', denied: app.gps.error === 'denied' };
  // 1. Iftar dua, in the hour before Maghrib on a fasting day.
  if (fastingToday && !hidden('iftar') && now >= d.Maghrib - 60 * 60000 && now < d.Maghrib.getTime() + 30 * 60000) {
    return { kind: 'iftar', at: d.Maghrib };
  }
  // 1b. Hijri birthday.
  if (data.hijriBirthday && !hidden('birthday') && isHijriBirthday(data.hijriBirthday, today, hijri)) {
    return { kind: 'birthday', age: hijriAge(data.hijriBirthday, today, hijri) };
  }
  // 2. Yesterday catch-up, in the morning, only for people who tick prayers.
  if (!hidden('catchup') && now < d.Dhuhr) {
    const y = addDays(today, -1);
    const missing = PRAYER_NAMES.filter((n) => !app.isPrayed(y, n) && !qadaOf(data, y, n));
    let tracks = false;
    for (let i = 1; i <= 14 && !tracks; i++) {
      const rec = data.completedByDay[addDays(today, -i).toDateString()];
      if (rec && Object.values(rec).some(Boolean)) tracks = true;
    }
    if (tracks && missing.length > 0) return { kind: 'catchup', date: y, missing };
  }
  // 2b. A new city: use its times?
  if (city && data.seenCity && data.seenCity.name !== city && data.cityAsked !== city) return { kind: 'city', city, old: data.seenCity };
  // 2c. Clocks change in the next few days.
  if (clock && !hidden('clock')) return { kind: 'clock', ...clock };
  // 3. Travelling.
  if (app.travelling && !data.travelConfirmed && !hidden('travel')) return { kind: 'travel', km: app.awayKm };
  // 4. Six fasts of Shawwal.
  if (h.monthIndex === 9 && h.day >= 2 && !hidden('shawwal')) {
    let done = 0;
    for (let i = 0; i <= h.day - 2; i++) {
      if ((data.journalByDay[addDays(today, -i).toDateString()] || {}).fasted) done++;
    }
    let left = 0;
    for (let i = 1; i <= 30; i++) {
      if (hijri(addDays(today, i)).monthIndex !== 9) break;
      left++;
    }
    return { kind: 'shawwal', done: Math.min(6, done), left };
  }
  // 5. Ramadan countdown, in the 30 days before.
  if (!hidden('ramadan') && h.monthIndex !== 8) {
    for (let i = 1; i <= 30; i++) {
      const dd = addDays(today, i);
      const hh = hijri(dd);
      if (hh.monthIndex === 8 && hh.day === 1) return { kind: 'ramadan', days: i, date: dd };
    }
  }
  return null;
}

function Notice({ now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const n = useNotice(now);
  if (!n) return null;
  const hide = () => app.update((p) => ({ noticeHidden: { ...(p.noticeHidden || {}), [n.kind]: app.today.toDateString() } }));
  const Btn = ({ label, onPress, fill }) => (
    <Press onPress={onPress} style={[{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: th.accentLine }, fill && { backgroundColor: th.accent, borderColor: th.accent }]}>
      <Body size={12} weight="semi" color={fill ? th.cardInk : th.accent}>{label}</Body>
    </Press>
  );
  let icon = 'info';
  let title = '';
  let body = null;
  let extra = null;
  let onPress;
  if (n.kind === 'location') {
    icon = 'map-pin';
    title = n.denied ? t('Location is off for Deen') : t("Couldn't find your location");
    body = t('Times are showing for {name}. Turn location on, or pick your city, so prayer times and Qibla are right where you are.', { name: app.locationName });
    const turnOn = async () => {
      try {
        const p = await Location.requestForegroundPermissionsAsync();
        if (p.status === 'granted') app.fetchGps(true);
        else if (!p.canAskAgain) Linking.openSettings();
      } catch (e) {
        Linking.openSettings();
      }
    };
    extra = (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <Btn fill label={n.denied ? t('Turn on location') : t('Try again')} onPress={n.denied ? turnOn : () => app.fetchGps(true)} />
        <Btn label={t('Choose a city')} onPress={() => nav.openSheet('location')} />
      </View>
    );
  } else if (n.kind === 'iftar') {
    icon = 'moon';
    const left = n.at - now;
    title = left > 0 ? t('Iftar in {d}', { d: shortDuration(t, left) }) : t("It's iftar time");
    const tx = duaText(IFTAR_DUA, t.lang);
    extra = (
      <View>
        <Arabic size={19} style={{ textAlign: 'right', marginTop: 6 }}>{IFTAR_DUA.arabic}</Arabic>
        <Body size={11.5} color={th.muted} style={{ marginTop: 2 }}>{tx.translation}</Body>
        <Body size={11} weight="semi" color={th.accent} style={{ marginTop: 2 }}>{IFTAR_DUA.source}</Body>
      </View>
    );
    onPress = () => nav.push('dua', { id: IFTAR_DUA.id });
  } else if (n.kind === 'catchup') {
    icon = 'rotate-ccw';
    title = n.missing.length === 1
      ? t('Yesterday: {name} not ticked', { name: t(n.missing[0]) })
      : t('Yesterday: {n} prayers not ticked', { n: n.missing.length });
    body = n.missing.length === 1 ? t('Did you pray it? Tick it here, or leave it and it stays as missed.') : n.missing.map((x) => t(x)).join(' · ');
    extra = (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        {n.missing.length === 1
          ? <Btn fill label={t('I prayed it')} onPress={() => app.setPrayed(n.date, n.missing[0], true)} />
          : <Btn fill label={t('Tick all')} onPress={() => app.tickAll(n.date)} />}
        {n.missing.length > 1 ? <Btn label={t('Choose')} onPress={() => nav.openSheet('day', { date: n.date })} /> : null}
        <Btn label={t('Not now')} onPress={hide} />
      </View>
    );
  } else if (n.kind === 'travel') {
    icon = 'navigation';
    title = t('Travelling?');
    body = t("You're {km} km from home. As a traveller, Dhuhr, Asr and Isha can be shortened to 2 rak'ahs. Fajr and Maghrib stay the same.", { km: n.km });
    extra = (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        {!app.data.travelConfirmed ? <Btn fill label={t("Yes, I'm travelling")} onPress={() => { app.update({ travelConfirmed: app.today.toDateString() }); hide(); }} /> : null}
        <Btn label={t('Learn more')} onPress={() => nav.openSheet('info', { title: t('Praying while travelling'), body: t("In the Hanafi school you count as a traveller once you're about 77 km (48 miles) from home and plan to stay less than 15 days. Then the 4-rak'ah Fard prayers (Dhuhr, Asr, Isha) become 2. Fajr, Maghrib and Witr don't change. If you plan to stay 15 days or more, pray in full.") })} />
        <Btn label={t("I'm home now")} onPress={() => { app.update({ homeBase: { ...app.gps.coords, name: app.locationName }, travelConfirmed: null }); app.setToast(t('Saved {name} as home', { name: app.locationName })); }} />
      </View>
    );
  } else if (n.kind === 'city') {
    icon = 'map-pin';
    title = t("You're in {city} now", { city: n.city });
    body = t("Use {city}'s prayer times?", { city: n.city });
    extra = (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <Btn fill label={t('Yes')} onPress={() => app.update({ seenCity: { name: n.city, ...app.gps.coords }, cityAsked: n.city })} />
        <Btn
          label={t('Keep {city}', { city: n.old.name })}
          onPress={() => {
            const id = `loc-${Date.now()}`;
            const o = n.old;
            app.update((p) => ({ cityAsked: n.city, savedLocations: [...p.savedLocations, { id, label: o.name, latitude: o.latitude, longitude: o.longitude, timezone: o.timezone }], activeLocationId: id }));
          }}
        />
      </View>
    );
  } else if (n.kind === 'clock') {
    icon = 'clock';
    const fwd = n.mins > 0;
    const hrs = Math.abs(n.mins) / 60;
    title = fwd ? t('Clocks go forward on {day}', { day: longDate(t.lang, n.date) }) : t('Clocks go back on {day}', { day: longDate(t.lang, n.date) });
    body = t('{n} hour change. Prayer times and alerts move with it, nothing to do.', { n: t.num(hrs) });
  } else if (n.kind === 'shawwal') {
    icon = 'pie-chart';
    title = n.done >= 6 ? t('Six fasts of Shawwal · all done') : t('Six fasts of Shawwal · {n} of 6', { n: n.done });
    body = n.done >= 6 ? t('Masha Allah. May Allah accept them.') : t('{n} days of Shawwal left.', { n: n.left });
    extra = (
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => <Tick key={i} done={i < n.done} size={20} />)}
      </View>
    );
    onPress = () => nav.push('fasting', { tab: 'week' });
  } else if (n.kind === 'birthday') {
    icon = 'gift';
    title = t('Your Hijri birthday');
    body = n.age ? t('Today is {date}. You are {n} in Hijri years.', { date: hijriLabel(t.lang, app.hijri(app.today)), n: t.num(n.age) }) : hijriLabel(t.lang, app.hijri(app.today));
    onPress = () => nav.push('dateConverter');
  } else if (n.kind === 'ramadan') {
    icon = 'star';
    title = t('Ramadan in {n} days', { n: n.days });
    body = t('Expected to start {date}, depending on the moon.', { date: longDate(t.lang, n.date) });
    onPress = () => nav.push('fasting');
  }
  return (
    <Card active onPress={onPress} style={{ marginTop: 10, padding: 14 }}>
      <View style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}>
        <Feather name={icon} size={17} color={th.accent} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Body size={13.5} weight="semi">{title}</Body>
          {body ? <Body size={11.5} color={th.muted} style={{ marginTop: 2 }}>{body}</Body> : null}
          {extra}
        </View>
        {n.kind !== 'catchup' ? (
          <Press onPress={hide} hitSlop={10} accessibilityLabel={t('Hide for today')}>
            <Feather name="x" size={15} color={th.faint} />
          </Press>
        ) : null}
      </View>
    </Card>
  );
}
