import React, { useEffect, useMemo } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Arabic, Press, Card, PatternBand, Divider, Tick, NotConfirmed } from '../ui/kit';
import { Arch, SunArc, MoonPhase } from '../ui/parts';
import { useNow, useLayout, longDate, hijriLabel, countdownText, mmss, timeStr, shortDuration, HIJRI_MONTHS_AR, hijriMonthName } from '../ui/hooks';
import { PRAYER_NAMES, PRAYER_AR, addDays, addMinutes, makruhWindows, computeDay, zonedParts, timeAdj } from '../lib/prayer';
import { isHijriBirthday, hijriAge } from '../lib/birthday';
import { nextMonthBoundary } from '../lib/hijri';
import { upcomingEvents } from '../lib/events';
import { eventTitle } from '../data/eventText';
import { nightOf, duhaOf } from '../lib/waqt';
import { DUAS } from '../data/duas';
import { fastingDayInfo } from '../lib/alerts';
import { homeCardOrder } from '../lib/homeCards';
import { sunnahFor } from '../data/sunnahs';
import { duaText } from '../data/duaText';
import { archState, circleState, needsAnswer, highlightedTile } from '../lib/homeLogic';
import { todayItems } from '../data/todayList';
import { nameOfDay, NAMES_SOURCE } from '../data/names99';
import { rakahRows } from '../data/prayerInfo';
import { RamadanSummaryCard, notFastingPatch, fastingPatch, isMissedFast } from './FastingParts';

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

// The special look for today: Ramadan > special day > safar > normal.
export function homeLook(app) {
  const h = app.hijriNow || app.hijri(app.today);
  const h0 = app.hijri(app.today);
  if (h0.monthIndex === 8) return 'ramadan';
  if (h0.monthIndex === 11 && h0.day <= 13) return 'kaaba';
  if (h.day >= 13 && h.day <= 15 && h0.day >= 13 && h0.day <= 15) return 'fullmoon';
  if (app.data.travelConfirmed) return 'safar';
  return null;
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
  const h = hijri(today);
  const hNow = app.hijriNow || h;
  const ramadan = h.monthIndex === 8;
  const look = homeLook(app);
  const fw = fastingWindow(app, now);

  const archW = Math.min(L.width * 0.56, 232);
  const archH = archW * 1.22;

  const events = useMemo(() => upcomingEvents(today, hijri, 60, { history: false, coords: app.coords, eclipses: app.data.showEclipses !== false }), [today, hijri, app.coords, app.data.showEclipses]);
  const nextEvent = events[0];
  const boundary = useMemo(() => nextMonthBoundary(today, app.cal), [today, app.cal]);
  const showMoon = data.moonCheck !== false && boundary && boundary.evening.getTime() === today.getTime();

  const order = homeCardOrder(ramadan ? data.ramadanOrder : data.homeCards, ramadan).filter((c) => !c.hidden).map((c) => c.id);

  const renderCard = (id) => {
    switch (id) {
      case 'safar': return <SafarCard key={id} />;
      case 'fasting': return <FastingBand key={id} fw={fw} now={now} />;
      case 'prayers': return <PrayerRow key={id} now={now} />;
      case 'extraTimes': return <ExtraTimes key={id} now={now} />;
      case 'today': return <TodayCard key={id} now={now} />;
      case 'kahf': return <KahfCard key={id} now={now} />;
      case 'special': return <SpecialCard key={id} now={now} />;
      case 'nameOfDay': return <NameOfDayCard key={id} />;
      case 'secondCity': return <SecondCity key={id} now={now} />;
      case 'prohibited': return <Prohibited key={id} times={app.getDay(today)} now={now} />;
      case 'comingUp': return nextEvent ? <ComingUp key={id} nextEvent={nextEvent} /> : null;
      case 'sunnah': return <SunnahOfDay key={id} />;
      default: return null;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: L.bottomSpace }} showsVerticalScrollIndicator={false}>
        <PatternBand height={archH + 150 + L.insets.top + (ramadan || look === 'kaaba' ? 30 : 0)} variant={look} />
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
          {ramadan ? <RamadanDots /> : null}
          {look === 'kaaba' && h.day <= 10 ? <DhulHijjahDots /> : null}

          {/* The arch */}
          <View style={{ marginTop: 18 }}>
            <ArchBlock now={now} width={archW} height={archH} />
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
          <Notice now={now} />
          <NeedsAnswerCard now={now} />

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

          {ramadan && (h.day === 1 || isLastRamadanDay(app, today)) ? (
            <Card onPress={() => nav.push('fasting', { tab: 'today' })} style={{ marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }} active>
              <Feather name="moon" size={18} color={th.accent} />
              <View style={{ flex: 1 }}>
                <Serif size={16}>{h.day === 1 ? t('Ramadan Mubarak · day {n}', { n: h.day }) : t('Last day of Ramadan, in sha Allah')}</Serif>
                <Body size={11.5} color={th.muted}>{h.day === 1 ? t('Taraweeh and Quran tracker on the fasting screen') : t('Depends on the moon tonight. Give Zakat al-Fitr before the Eid prayer.')}</Body>
              </View>
              <Feather name="chevron-right" size={16} color={th.faint} />
            </Card>
          ) : null}

          {order.map(renderCard)}
        </View>
      </ScrollView>
    </View>
  );
}

// Ramadan's length isn't known until the moon is seen: day 29 "may be the
// last day", day 30 is.
function isLastRamadanDay(app, date) {
  const h = app.hijri(date);
  if (h.monthIndex !== 8) return false;
  return h.day >= 29 && app.hijri(addDays(date, 1)).monthIndex !== 8;
}

/* -------------------------------- Arch -------------------------------- */
function ArchBlock({ now, width, height }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const tz = app.coords.timezone;
  const a = archState(app, now);
  const h = app.hijri(app.today);
  const makruh = app.activeMakruh && now < app.activeMakruh.end ? app.activeMakruh : null;
  const eid = (h.monthIndex === 9 && h.day === 1) || (h.monthIndex === 11 && h.day === 10);
  const eidMorning = eid && now >= app.getDay(app.today).Fajr && now < app.getDay(app.today).Dhuhr && a.mode === 'next';
  const safarQasr = app.data.travelConfirmed && ['Dhuhr', 'Asr', 'Isha'].includes(a.name) && (a.mode === 'current' || a.mode === 'next');
  const ink = th.cardInk;
  const amber = a.amber ? (th.isLight ? '#FFE3A8' : th.amber) : ink;
  const onPress = () => {
    if (a.mode === 'current' || a.mode === 'next') nav.openSheet('prayer', { name: a.name, date: a.day });
    else nav.push('fasting', { tab: 'today' });
  };
  const title = eidMorning ? t('Eid Mubarak') : a.mode === 'current' ? t('{name} time', { name: t(a.name) }) : t(a.title);
  const bigName = a.mode === 'current' || a.mode === 'next' ? t(a.name) : a.mode === 'iftarNow' ? t('Iftar time') : t(a.title);
  const fastN = a.mode === 'iftarNow' && a.fastN ? t('Fast {n} done', { n: a.fastN }) : null;
  const line = (x, i) => {
    const base = { marginTop: 7, paddingTop: 6, borderTopWidth: 1, borderColor: th.isLight ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)', flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: width - 30 };
    if (x.kind === 'didYouPray') {
      return (
        <Press key={i} onPress={() => nav.openSheet('prayer', { name: x.prayer.name, date: x.prayer.day })} style={base} hitSlop={6}>
          <Feather name="help-circle" size={10} color={th.isLight ? '#FFE3DC' : th.red} />
          <Label size={8.5} numberOfLines={1} color={th.isLight ? '#FFE3DC' : th.red}>{t('{name} ended at {time} · Did you pray it?', { name: t(x.prayer.name), time: timeStr(t, x.prayer.end, tz, true) })}</Label>
        </Press>
      );
    }
    if (x.kind === 'notTicked' || x.kind === 'amber') {
      return (
        <Press key={i} onPress={() => nav.openSheet('prayer', { name: x.prayer.name, date: x.prayer.day })} style={base} hitSlop={6}>
          <Label size={8.5} numberOfLines={1} color={amberInk(th)}>{t('{name} not ticked · ends {when}', { name: t(x.prayer.name), when: `${t(x.prayer.w.endWhy)} ${timeStr(t, x.prayer.w.end, tz, true)}` })}</Label>
        </Press>
      );
    }
    if (x.kind === 'duha') {
      return (
        <Press key={i} onPress={() => app.toggleSunnah(app.today, 'duha')} style={base} hitSlop={6}>
          <Label size={8.5} color={ink} style={{ opacity: 0.85 }}>{t('Duha now · until {time}', { time: timeStr(t, x.until, tz, true) })}</Label>
          <View style={{ marginLeft: 3 }}><Tick done={x.done} size={13} color={th.ok} /></View>
        </Press>
      );
    }
    if (x.kind === 'tahajjud') {
      return (
        <Press key={i} onPress={() => nav.openSheet('nightTime', { k: 'tahajjud' })} style={base} hitSlop={6}>
          <Label size={8.5} color={ink} style={{ opacity: 0.85 }}>{x.done ? t('Tahajjud prayed') : t('Tahajjud from {time}', { time: timeStr(t, x.at, tz, true) })}</Label>
        </Press>
      );
    }
    return null;
  };
  return (
    <Arch width={width} height={height} progress={Math.max(0, Math.min(1, a.progress || 0))} cycleKey={`${a.mode}${a.name || ''}${a.to ? a.to.getTime() : ''}`} onPress={onPress}>
      {h.monthIndex === 8 ? <View style={{ position: 'absolute', top: -width * 0.13 }}><MoonPhase hDay={h.day} size={22} fill={th.accent} /></View> : null}
      <Label color={a.amber ? amber : ink} style={{ opacity: a.amber ? 1 : 0.7 }}>{title}</Label>
      <Arabic size={width * 0.13} color={th.arcAr} style={{ marginTop: 2, lineHeight: width * 0.2 }}>{a.ar}</Arabic>
      <Serif size={width * 0.13} color={ink} style={{ lineHeight: width * 0.15 }}>{bigName}</Serif>
      {a.to ? <Serif bold size={width * 0.165} color={a.amber ? amber : ink} style={{ marginTop: 2 }}>{countdownText(t, a.to - now)}</Serif> : null}
      {fastN ? <Serif bold size={width * 0.1} color={ink} style={{ marginTop: 4 }}>{fastN}</Serif> : null}
      {a.mode === 'current' ? (
        <Label color={a.amber ? amber : ink} style={{ opacity: a.amber ? 1 : 0.7, marginTop: 2, maxWidth: width * 0.84, textAlign: 'center' }} numberOfLines={2}>{`${t('Ends in')} · ${t(a.note)}`}</Label>
      ) : a.to ? (
        <Label color={ink} style={{ opacity: 0.7, marginTop: 2 }}>{t('At {time}', { time: timeStr(t, a.to, tz) })}</Label>
      ) : null}
      {safarQasr ? <Label size={8.5} color={ink} style={{ marginTop: 3 }}>{t("Qasr · 2 rak'ahs")}</Label> : null}
      {a.mode === 'current' && a.nextLine ? (
        <Label size={8} color={ink} style={{ opacity: 0.6, marginTop: 4 }}>{t('Next: {name} {time}', { name: t(a.nextLine.name), time: timeStr(t, a.nextLine.at, tz, true) })}</Label>
      ) : null}
      {makruh ? (
        <View style={{ marginTop: 9, paddingTop: 7, borderTopWidth: 1, borderColor: th.isLight ? 'rgba(255,255,255,0.35)' : 'rgba(179,38,30,0.25)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="alert-triangle" size={10} color={th.isLight ? '#FFE3DC' : '#B3261E'} />
          <Label color={th.isLight ? '#FFE3DC' : '#B3261E'} size={8.5}>{t('Prohibited · ends in {t}', { t: mmss(t, makruh.end - now) })}</Label>
        </View>
      ) : null}
      {(a.lines || []).slice(0, makruh ? 1 : 2).map(line)}
    </Arch>
  );
}
const amberInk = (th) => (th.isLight ? '#FFE3A8' : th.amber);

/* ------------------------------ Prayer row ------------------------------ */
// Tap the circle to tick, tap the name or time to open the prayer page.
//   faint dashed  not time yet (opens the page with "Starts in")
//   full circle   time is on (tap ticks)
//   amber dashed  time over, not answered (opens "Did you pray it?")
//   green tick · gold late · red missed
export function CircleMark({ state, size = 20, two }) {
  const th = useTheme();
  const map = {
    notYet: { border: th.faint, dashed: true, op: 0.55 },
    open: { border: th.ink, dashed: false },
    unanswered: { border: th.amber, dashed: true },
    ontime: { bg: th.ok, border: th.ok, icon: 'check', fg: '#fff' },
    late: { bg: th.amber, border: th.amber, icon: 'rotate-ccw', fg: '#2a1a05' },
    missed: { bg: th.red, border: th.red, icon: 'x', fg: '#fff' },
  }[state] || { border: th.faint };
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: map.border, borderStyle: map.dashed ? 'dashed' : 'solid', alignItems: 'center', justifyContent: 'center', opacity: map.op || 1 }, map.bg && { backgroundColor: map.bg }]}>
      {map.icon ? <Feather name={map.icon} size={size * 0.58} color={map.fg} /> : null}
      {two && !map.icon ? <Body size={size * 0.5} weight="bold" color={th.muted} style={{ lineHeight: size * 0.62 }}>2</Body> : null}
    </View>
  );
}

function PrayerRow({ now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { data } = app;
  const day = app.prayerDay;
  const tz = app.coords.timezone;
  const times = app.getDay(day);
  const hi = highlightedTile(app, now);
  const friday = day.getDay() === 5 && !data.travelConfirmed;
  const showHint = (data.homeTicks || 0) < 10;
  const nightRow = day.getTime() !== app.today.getTime();

  const tick = (name) => {
    app.setStatus(day, name, 'ontime');
    app.haptic('success');
    const undo = { label: t('Undo'), onPress: () => app.setStatus(day, name, 'missed') };
    const others = PRAYER_NAMES.filter((n) => n !== name).every((n) => app.isPrayed(day, n) || ['late'].includes(circleState(app, day, n, now)));
    app.update((p) => ({ homeTicks: (p.homeTicks || 0) + 1 }));
    if (others) app.setToast({ message: t('All 5 today. Masha Allah!'), action: undo, celebrate: true });
    else app.setToast({ message: t('{name} ticked', { name: t(name) }), action: undo });
  };
  const onCircle = (name, st) => {
    const jumuah = friday && name === 'Dhuhr';
    if (st === 'open' && !jumuah) tick(name);
    else nav.openSheet('prayer', { name, date: day });
  };

  return (
    <View style={{ marginTop: 14 }}>
      {nightRow ? <Label size={8} style={{ marginBottom: 6, marginHorizontal: 2 }}>{t('{day} night', { day: t(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day.getDay()]) })}</Label> : null}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {PRAYER_NAMES.map((name) => {
          const st = circleState(app, day, name, now);
          const isHi = hi === name;
          const label = friday && name === 'Dhuhr' ? t("Jumu'ah") : t(name);
          const two = !!data.travelConfirmed && ['Dhuhr', 'Asr', 'Isha'].includes(name);
          const dim = (st === 'ontime' || st === 'late' || st === 'missed') && !isHi;
          return (
            <View
              key={name}
              style={[
                { flex: 1, alignItems: 'center', borderRadius: 15, borderWidth: 1, borderColor: th.line, backgroundColor: th.soft, overflow: 'hidden' },
                isHi && { borderColor: th.accent, backgroundColor: th.accentSoft },
                dim && { opacity: 0.72 },
              ]}
            >
              <Press onPress={() => nav.openSheet('prayer', { name, date: day })} scaleTo={0.97} accessibilityLabel={`${label} ${timeStr(t, times[name], tz)}`} style={{ alignSelf: 'stretch', alignItems: 'center', paddingTop: 9 }}>
                <Label size={7.5} color={isHi ? th.accent : th.muted} numberOfLines={1} adjustsFontSizeToFit style={{ paddingHorizontal: 2 }}>{label}</Label>
                <Serif bold size={15} numberOfLines={1} adjustsFontSizeToFit color={isHi ? th.accent : th.ink} style={{ marginTop: 3, marginBottom: (timeAdj(app.data) || {})[name] ? 0 : 4, paddingHorizontal: 3 }}>{timeStr(t, times[name], tz, true)}</Serif>
                {(timeAdj(app.data) || {})[name] ? <Body size={8} weight="bold" color={th.accent} style={{ marginTop: -1, marginBottom: 2 }}>{t('adj.')}</Body> : null}
              </Press>
              <Press onPress={() => onCircle(name, st)} hitSlop={6} accessibilityRole="checkbox" accessibilityState={{ checked: st === 'ontime' || st === 'late' }} accessibilityLabel={t('{name} circle', { name: label })} style={{ paddingBottom: 9, paddingTop: 2, paddingHorizontal: 10 }}>
                <CircleMark state={st} two={two} />
              </Press>
            </View>
          );
        })}
      </View>
      {showHint ? <Body size={10.5} color={th.faint} style={{ textAlign: 'center', marginTop: 6 }}>{t('Tap the circle to tick · tap the name for details')}</Body> : null}
    </View>
  );
}

/* --------------- Prayers that still need an answer (Home) --------------- */
// The same list as Ibadah's, newest 3. Today's ended prayers are amber;
// after the day ends (Fajr) they're red and owed.
function NeedsAnswerCard({ now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const tz = app.coords.timezone;
  const list = needsAnswer(app, now, { days: 2 }).slice(0, 3);
  if (!list.length) return null;
  const word = (d) => (d.getTime() === app.today.getTime() ? t('Today') : d.getTime() === addDays(app.today, -1).getTime() ? t('Yesterday') : longDate(t.lang, d));
  return (
    <Card style={{ marginTop: 10, paddingVertical: 4, borderColor: th.amber }}>
      <Label size={8} color={th.amber} style={{ marginHorizontal: 14, marginTop: 8 }}>{t('Needs an answer · {n}', { n: list.length })}</Label>
      {list.map((x, i) => (
        <View key={`${x.date.toDateString()}${x.name}`}>
          {i > 0 && <Divider />}
          <Press onPress={() => nav.openSheet('prayer', { name: x.name, date: x.date })} scaleTo={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 14 }}>
            <CircleMark state={x.state === 'missed' ? 'missed' : 'unanswered'} size={18} />
            <View style={{ flex: 1 }}>
              <Body size={13.5} weight="semi">{t(x.name)}</Body>
              <Body size={11} color={th.muted}>{t('{day} · ended {time}', { day: word(x.date), time: timeStr(t, x.end, tz, true) })}</Body>
            </View>
            <View style={[{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99, backgroundColor: th.accent }, th.nightRed && { backgroundColor: 'transparent', borderWidth: 1, borderColor: th.accentLine }]}>
              <Body size={11.5} weight="semi" color={th.nightRed ? th.accent : th.cardInk}>{t('Did you pray?')}</Body>
            </View>
          </Press>
        </View>
      ))}
    </Card>
  );
}

/* ---------------------------- Ramadan dots ---------------------------- */
// One dot per day of Ramadan: gold = fasted, outline = not fasted (past),
// the last ten a little bigger. The 30th goes if the month has 29 days.
function RamadanDots() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const h = app.hijri(app.today);
  const start = addDays(app.today, -(h.day - 1));
  const len = app.hijri(addDays(start, 29)).monthIndex === 8 ? 30 : 29;
  let kept = 0;
  const dots = Array.from({ length: len }, (_, i) => {
    const d = addDays(start, i);
    const fasted = !!(app.data.journalByDay[d.toDateString()] || {}).fasted || (d < app.today && !(app.data.notFastingByDay || {})[d.toDateString()] && !(app.data.missedFasts || []).some((m) => m.day === d.toDateString()));
    if (d <= app.today && fasted) kept++;
    return { i, d, past: d < app.today, today: d.getTime() === app.today.getTime(), fasted, big: i >= 20 };
  });
  return (
    <Press onPress={() => nav.push('fasting', { tab: 'today' })} style={{ marginTop: 9, alignItems: 'center' }} scaleTo={0.98}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3.5, maxWidth: 300 }}>
        {dots.map((x) => {
          const s = x.big ? 8 : 6;
          return <View key={x.i} style={{ width: s, height: s, borderRadius: s / 2, borderWidth: 1, borderColor: x.today ? th.ink : th.accent, backgroundColor: (x.past || x.today) && x.fasted ? th.accent : 'transparent', opacity: x.past || x.today ? 1 : 0.45 }} />;
        })}
      </View>
      <Label size={8} color={th.accent} style={{ marginTop: 5 }}>{t('Fast {n} · {k} kept', { n: h.day, k: kept })}</Label>
    </Press>
  );
}

// The first ten days of Dhul-Hijjah.
function DhulHijjahDots() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const h = app.hijri(app.today);
  return (
    <View style={{ marginTop: 9, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i} style={{ width: i === 8 ? 9 : 7, height: i === 8 ? 9 : 7, borderRadius: 5, borderWidth: 1, borderColor: i + 1 === h.day ? th.ink : th.accent, backgroundColor: i + 1 < h.day ? th.accent : 'transparent' }} />
        ))}
      </View>
      <Label size={8} color={th.accent} style={{ marginTop: 5 }}>{t('Day {n} of the best 10 days', { n: h.day })}</Label>
    </View>
  );
}

/* --------------------------- Prohibited times --------------------------- */
function Prohibited({ times, now }) {
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const tz = useApp().coords.timezone;
  const range = (a, b) => `${timeStr(t, a, tz, true)}–${timeStr(t, b, tz)}`;
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
  return (
    <Card onPress={() => nav.openSheet('event', { id: nextEvent.evt.id, date: nextEvent.date })} style={{ marginTop: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 42, alignItems: 'center' }}>
        <Serif bold size={20} color={th.accent}>{t.num(nextEvent.date.getDate())}</Serif>
        <Label size={8}>{t(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][nextEvent.date.getMonth()])}</Label>
      </View>
      <View style={{ flex: 1 }}>
        <Label size={8}>{t('Coming up')}</Label>
        <Serif size={15} numberOfLines={1} style={{ marginTop: 2 }}>{eventTitle(nextEvent.evt, t.lang)}</Serif>
        <Body size={11.5} color={th.muted}>{daysAwayText(t, nextEvent.date, app.today)}</Body>
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

// Name of Allah of the day.
function NameOfDayCard() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const n = nameOfDay(app.today);
  return (
    <Card onPress={() => nav.push('names', { n: n.n })} style={{ marginTop: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Label size={8}>{t('Name of the day · {n} of 99', { n: n.n })}</Label>
        <Serif size={16} style={{ marginTop: 3 }}>{n.tr}</Serif>
        <Body size={12} color={th.muted}>{n.en}</Body>
      </View>
      <Arabic size={26} color={th.accent} style={{ lineHeight: 44 }}>{n.ar}</Arabic>
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
// When the arch already counts down to Iftar, the band shows how much of
// the fast is done instead of a second countdown.
function FastingBand({ fw, now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const tz = app.coords.timezone;
  const fasting = app.fastingToday;
  const sunnah = !fw.night && !fasting ? fastingDayInfo(app.today, app.cal) : null;
  const quiet = !fw.night && !fasting;
  const archIftar = fasting && !fw.night && now >= app.getDay(app.today).Asr;
  const markFast = () => {
    app.setFasted(app.today, true);
    app.setToast(t('Marked today as a fast'));
  };
  return (
    <Card onPress={() => nav.push('fasting')} style={{ marginTop: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 9 }}>
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
            : quiet ? t('Maghrib at {time}', { time: timeStr(t, fw.to, tz, true) }) : archIftar ? t('{p}% of the fast done', { p: Math.round(fw.progress * 100) }) : t('Iftar in {d}', { d: shortDuration(t, fw.to - now) })}
        </Label>
        <Serif size={15}>{timeStr(t, fw.to, tz, true)}</Serif>
      </View>
    </Card>
  );
}

/* ------------- Duha · Midnight · Tahajjud, under the prayers ------------- */
function currentNight(app, now) {
  const { today, getDay } = app;
  const d = getDay(today);
  if (now < d.Fajr) return { n: nightOf(getDay(addDays(today, -1)), d), base: addDays(today, -1) };
  return { n: nightOf(d, getDay(addDays(today, 1))), base: today };
}

function ExtraTimes({ now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const tz = app.coords.timezone;
  const duha = duhaOf(app.getDay(app.today));
  const { n: night, base } = currentNight(app, now);
  const cells = [
    { k: 'Duha', v: `${timeStr(t, duha.start, tz, true)}–${timeStr(t, duha.end, tz, true)}`, sheet: 'duha', done: app.isSunnahDone(app.today, 'duha') },
    { k: 'Midnight', v: timeStr(t, night.midnight, tz), info: t("Islamic midnight, halfway between Maghrib and Fajr. Isha is best prayed before it. After that Isha is still valid until Fajr, but delaying it without a reason is disliked.") },
    { k: 'Tahajjud', v: timeStr(t, night.lastThird, tz), sheet: 'tahajjud', done: app.isSunnahDone(base, 'tahajjud') },
  ];
  return (
    <View style={{ flexDirection: 'row', marginTop: 10, borderWidth: 1, borderColor: th.line, borderRadius: 14, overflow: 'hidden' }}>
      {cells.map((c, i) => (
        <Press
          key={c.k}
          scaleTo={0.98}
          onPress={() => (c.sheet ? nav.openSheet('nightTime', { k: c.sheet }) : nav.openSheet('info', { title: t(c.k), body: c.info }))}
          accessibilityLabel={`${t(c.k)} ${c.v}`}
          style={[{ flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 }, i > 0 && { borderLeftWidth: 1, borderColor: th.line }, c.done && { backgroundColor: 'rgba(75,191,138,0.12)' }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Label size={8} numberOfLines={1} color={c.done ? th.ok : th.muted}>{t(c.k)}</Label>
            {c.done ? <Feather name="check" size={10} color={th.ok} /> : null}
          </View>
          <Serif size={13.5} numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 2 }}>{c.v}</Serif>
        </Press>
      ))}
    </View>
  );
}

/* ------------------------------ Today card ------------------------------ */
// One card all year that changes through the day. In Ramadan: did you have
// Seheri → today's list → dua of the day from Asr → Tonight after Isha
// (gold on the odd nights of the last ten, with the Laylat al-Qadr dua).
const QADR_DUA = DUAS.find((d) => d.id === 68);
const RAMADAN_DUAS = DUAS.filter((d) => ['Fasting & Ramadan', 'Forgiveness', 'Quranic Duas'].includes(d.category));

export function isTicked(app, day, item) {
  if (item.tick === 'fast') return !!(app.data.journalByDay[day.toDateString()] || {}).fasted;
  if (item.tick.startsWith('sunnah:')) return app.isSunnahDone(day, item.tick.slice(7));
  // "Ask Allah for forgiveness 100 times" is the same as the Daily dhikr Astaghfirullah row.
  if (item.tick === 'today:istighfar') return (((app.data.dhikrByDay || {})[day.toDateString()] || {}).istighfar || 0) >= 100 || !!((app.data.todayTicks || {})[day.toDateString()] || {}).istighfar;
  return !!((app.data.todayTicks || {})[day.toDateString()] || {})[item.tick.slice(6)];
}
export function toggleTick(app, day, item) {
  if (item.tick === 'fast') return app.setFasted(day, !isTicked(app, day, item));
  if (item.tick.startsWith('sunnah:')) return app.toggleSunnah(day, item.tick.slice(7));
  const k = day.toDateString();
  const id = item.tick.slice(6);
  if (item.tick === 'today:istighfar') {
    const on = !isTicked(app, day, item);
    return app.update((p) => ({
      dhikrByDay: { ...(p.dhikrByDay || {}), [k]: { ...((p.dhikrByDay || {})[k] || {}), istighfar: on ? 100 : 0 } },
      todayTicks: { ...(p.todayTicks || {}), [k]: { ...((p.todayTicks || {})[k] || {}), istighfar: on } },
      dirtyAt: Date.now(),
    }));
  }
  return app.update((p) => ({ todayTicks: { ...(p.todayTicks || {}), [k]: { ...((p.todayTicks || {})[k] || {}), [id]: !((p.todayTicks || {})[k] || {})[id] } }, dirtyAt: Date.now() }));
}

function TodayCard({ now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { today, getDay, data } = app;
  const d = getDay(today);
  const h = app.hijri(today);
  const ramadan = h.monthIndex === 8;
  const seheriEnd = addMinutes(d.Fajr, -(data.safetyBuffer || 0));
  // After Isha the card is about tonight (the next Hijri night).
  const tonight = now >= d.Isha || now < d.Fajr;
  const nightH = now < d.Fajr ? h : app.hijri(addDays(today, 1));
  const lang = t.lang === 'bn' ? 'bn' : 'en';

  // Ramadan while travelling: are you fasting today? (Quran 2:184)
  const seheriAns = (data.seheriByDay || {})[today.toDateString()];
  if (ramadan && app.data.travelConfirmed && now >= seheriEnd && now < d.Asr && !seheriAns && !isMissedFast(data, today) && !(data.journalByDay[today.toDateString()] || {}).fasted) {
    return (
      <Card active style={{ marginTop: 14, padding: 14 }}>
        <Label size={8}>{t('Safar · Ramadan day {n}', { n: h.day })}</Label>
        <Serif size={16} style={{ marginTop: 3 }}>{t('Are you fasting today?')}</Serif>
        <Body size={11.5} color={th.muted}>{t('A traveller may leave the fast and make it up later (Quran 2:184).')}</Body>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Pill fill label={t('Yes, fasting')} onPress={() => { app.update((p) => ({ ...fastingPatch(p, today), seheriByDay: { ...(p.seheriByDay || {}), [today.toDateString()]: 'yes' } })); app.setFasted(today, true); }} />
          <Pill label={t('Not fasting · travelling')} onPress={() => app.update((p) => notFastingPatch(p, today, 'travelling'))} />
        </View>
      </Card>
    );
  }
  // Ramadan: Seheri check, from Seheri's end until Dhuhr.
  if (ramadan && now >= seheriEnd && now < d.Dhuhr && !seheriAns && !app.data.travelConfirmed) {
    const set = (v) => app.update((p) => ({ seheriByDay: { ...(p.seheriByDay || {}), [today.toDateString()]: v }, dirtyAt: Date.now() }));
    return (
      <Card active style={{ marginTop: 14, padding: 14 }}>
        <Label size={8}>{t('Today · Ramadan day {n}', { n: h.day })}</Label>
        <Serif size={16} style={{ marginTop: 3 }}>{t('Did you have Seheri?')}</Serif>
        <Body size={11.5} color={th.muted}>{t('Eating Seheri is a blessing, even a sip of water (Bukhari 1923).')}</Body>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Pill fill label={t('Yes')} onPress={() => set('yes')} />
          <Pill label={t('Missed it')} onPress={() => set('missed')} />
        </View>
      </Card>
    );
  }
  // Ramadan nights: Tonight (Taraweeh + juz), gold on odd last-ten nights.
  if ((ramadan || nightH.monthIndex === 8) && tonight && nightH.monthIndex === 8) {
    const yearKey = String(nightH.year);
    const n = nightH.day;
    const tar = !!(((data.taraweeh || {})[yearKey]) || {})[n];
    const juz = !!(((data.quranJuz || {})[yearKey]) || {})[n];
    const juzDone = Object.values(((data.quranJuz || {})[yearKey]) || {}).filter(Boolean).length;
    const odd = n >= 21 && n % 2 === 1;
    const toggle = (field) => app.update((p) => ({ [field]: { ...(p[field] || {}), [yearKey]: { ...((p[field] || {})[yearKey] || {}), [n]: !((p[field] || {})[yearKey] || {})[n] } }, dirtyAt: Date.now() }));
    const qd = duaText(QADR_DUA, t.lang);
    return (
      <Card active style={[{ marginTop: 14, padding: 14 }, odd && { borderColor: th.accent, backgroundColor: th.accentSoft }]}>
        <Label size={8} color={odd ? th.accent : th.muted}>{odd ? t('Night {n} · Laylat al-Qadr may be tonight', { n }) : t('Tonight · night {n} of Ramadan', { n })}</Label>
        <TickRow done={tar} label={t('Taraweeh')} sub={t('Bukhari 2009')} onPress={() => toggle('taraweeh')} />
        <TickRow done={juz} label={t('Part {n}', { n: Math.min(30, n) })} sub={t('{n} of 30 parts read', { n: juzDone })} onPress={() => toggle('quranJuz')} bar={juzDone / 30} />
        {odd ? (
          <Press onPress={() => nav.push('dua', { id: QADR_DUA.id })} style={{ marginTop: 10, borderTopWidth: 1, borderColor: th.line, paddingTop: 10 }}>
            <Arabic size={19} style={{ textAlign: 'right' }}>{QADR_DUA.arabic}</Arabic>
            <Body size={11.5} color={th.muted} style={{ marginTop: 2 }}>{qd.translation}</Body>
            <Body size={11} weight="semi" color={th.accent} style={{ marginTop: 2 }}>{QADR_DUA.source}</Body>
          </Press>
        ) : null}
      </Card>
    );
  }
  // Ramadan afternoons: dua of the day, from Asr.
  if (ramadan && now >= d.Asr && now < d.Isha) {
    const dua = RAMADAN_DUAS[(h.day - 1) % RAMADAN_DUAS.length];
    const dt = duaText(dua, t.lang);
    return (
      <Card active onPress={() => nav.push('dua', { id: dua.id })} style={{ marginTop: 14, padding: 14 }}>
        <Label size={8}>{t('Dua of the day · {title}', { title: dt.title })}</Label>
        <Arabic size={19} style={{ textAlign: 'right', marginTop: 6 }} numberOfLines={3}>{dua.arabic}</Arabic>
        <Body size={11.5} color={th.muted} style={{ marginTop: 2 }} numberOfLines={3}>{dt.translation}</Body>
        <Body size={11} weight="semi" color={th.accent} style={{ marginTop: 2 }}>{dua.source}</Body>
      </Card>
    );
  }
  // Everything else: today's list.
  const items = todayItems({ h, wd: today.getDay(), safar: !!data.travelConfirmed });
  if (!items.length) return null;
  const done = items.filter((it) => isTicked(app, today, it)).length;
  return (
    <Card style={{ marginTop: 14, paddingVertical: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 14, marginTop: 6 }}>
        <Label size={8}>{ramadan ? t('Today · Ramadan day {n}', { n: h.day }) : today.getDay() === 5 ? t("Today · Jumu'ah") : t("Today's ibadah")}</Label>
        <Label size={8}>{t('{n} of {m}', { n: done, m: items.length })}</Label>
      </View>
      {items.map((it) => (
        <View key={it.id} style={{ paddingHorizontal: 14 }}>
          <TickRow done={isTicked(app, today, it)} label={it[lang]} sub={it.dua ? `${it.ref} · ${t('Read the dua')} ›` : it.ref} onSub={it.dua ? () => nav.push('dua', { id: it.dua }) : null} onPress={() => toggleTick(app, today, it)} />
        </View>
      ))}
    </Card>
  );
}

function TickRow({ done, label, sub, onPress, bar, onSub }) {
  const th = useTheme();
  return (
    <Press onPress={onPress} scaleTo={0.99} accessibilityRole="checkbox" accessibilityState={{ checked: done }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <View style={{ flex: 1 }}>
        <Body size={13.5} weight="med">{label}</Body>
        {sub && onSub ? (
          <Press onPress={onSub} hitSlop={6} style={{ alignSelf: 'flex-start' }}><Body size={10.5} weight="semi" color={th.accent}>{sub}</Body></Press>
        ) : sub ? <Body size={10.5} color={th.accent}>{sub}</Body> : null}
        {bar !== undefined ? (
          <View style={{ height: 4, borderRadius: 2, backgroundColor: th.soft2, marginTop: 5 }}>
            <View style={{ height: 4, borderRadius: 2, width: `${Math.round(Math.min(1, bar) * 100)}%`, backgroundColor: th.accent }} />
          </View>
        ) : null}
      </View>
      <Tick done={done} />
    </Press>
  );
}

function Pill({ label, onPress, fill }) {
  const th = useTheme();
  return (
    <Press onPress={onPress} style={[{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: th.accentLine }, fill && { backgroundColor: th.accent, borderColor: th.accent }]}>
      <Body size={12} weight="semi" color={fill ? th.cardInk : th.accent}>{label}</Body>
    </Press>
  );
}

/* ------------------------- Friday: Surah Al-Kahf ------------------------- */
function KahfCard({ now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { today } = app;
  if (today.getDay() !== 5 || now >= app.getDay(today).Maghrib) return null;
  const item = { tick: 'today:kahf' };
  const done = isTicked(app, today, item);
  return (
    <Card style={{ marginTop: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Press onPress={() => nav.push('quran', { surah: 18 })} style={{ flex: 1 }} scaleTo={0.99}>
        <Label size={8}>{t('Friday · until Maghrib')}</Label>
        <Serif size={16} style={{ marginTop: 3 }}>{t('Surah Al-Kahf')}</Serif>
        <Body size={11} color={th.accent}>{t('Light between the two Fridays · al-Hakim, al-Bayhaqi')}</Body>
      </Press>
      <Press onPress={() => toggleTick(app, today, item)} hitSlop={8}><Tick done={done} /></Press>
    </Card>
  );
}

/* ----------------------------- Special days ----------------------------- */
// Arafah, Eid al-Adha (Qurbani until the 12th), Ashura (a few days before),
// the White Days, and the takbir of Dhul-Hijjah.
const TAKBIR = 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ لَا إِلَٰهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ وَلِلَّهِ الْحَمْدُ';
function SpecialCard({ now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { today, data } = app;
  const h = app.hijri(today);
  const tz = app.coords.timezone;
  const fasted = !!(data.journalByDay[today.toDateString()] || {}).fasted;
  const planned = (d) => !!(data.fastPlans || {})[d.toDateString()];
  const plan = (d) => app.update((p) => {
    const k = d.toDateString();
    const next = { ...(p.fastPlans || {}) };
    if (next[k]) delete next[k];
    else next[k] = true;
    return { fastPlans: next, dirtyAt: Date.now() };
  });
  const day = getDayTimes(app, today);

  // Day of Arafah: royal gold "fast today".
  if (h.monthIndex === 11 && h.day === 9) {
    return (
      <Card active style={{ marginTop: 14, padding: 14, borderColor: th.accent, backgroundColor: th.accentSoft }}>
        <Label size={8} color={th.accent}>{t('Day of Arafah')}</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <Serif size={17}>{t('Fast today')}</Serif>
            <Body size={11.5} color={th.muted}>{t('It wipes out the sins of the past year and the coming one (Muslim 1162).')}</Body>
          </View>
          <Press onPress={() => app.setFasted(today, !fasted)} hitSlop={8}><Tick done={fasted} size={26} /></Press>
        </View>
        <Takbir />
      </Card>
    );
  }
  // Eid al-Fitr (first 3 days of Shawwal): your Ramadan in numbers.
  if (h.monthIndex === 9 && h.day <= 3) return <RamadanSummaryCard style={{ marginTop: 14 }} />;
  // Eid al-Adha and the days of Tashreeq: Qurbani checklist.
  if (h.monthIndex === 11 && h.day >= 10 && h.day <= 12) {
    const items = [
      { id: 'eidPrayer', en: 'Eid prayer, then the Qurbani', bn: 'ঈদের নামাজ, তারপর কুরবানি', ref: 'Bukhari 5545' },
      { id: 'qurbani', en: 'Qurbani done', bn: 'কুরবানি সম্পন্ন', ref: 'Quran 22:36' },
      { id: 'share', en: 'Share the meat with family, friends and those in need', bn: 'পরিবার, বন্ধু ও অভাবীদের মাঝে মাংস বণ্টন', ref: 'Quran 22:28' },
    ].map((x) => ({ ...x, tick: `today:${x.id}` }));
    const lang = t.lang === 'bn' ? 'bn' : 'en';
    return (
      <Card active style={{ marginTop: 14, paddingVertical: 8, paddingHorizontal: 14 }}>
        <Label size={8} color={th.accent}>{h.day === 10 ? t('Eid al-Adha Mubarak') : t('Days of Tashreeq · {n} Dhul-Hijjah', { n: h.day })}</Label>
        {items.map((it) => {
          // Qurbani ticks are remembered across the three days.
          const k = `${h.year}-qurbani`;
          const done = !!((data.todayTicks || {})[k] || {})[it.id];
          const toggle = () => app.update((p) => ({ todayTicks: { ...(p.todayTicks || {}), [k]: { ...((p.todayTicks || {})[k] || {}), [it.id]: !done } }, dirtyAt: Date.now() }));
          return <TickRow key={it.id} done={done} label={it[lang]} sub={it.ref} onPress={toggle} />;
        })}
        <Takbir />
      </Card>
    );
  }
  // First 9 days of Dhul-Hijjah: the takbir.
  if (h.monthIndex === 11 && h.day <= 8) {
    return (
      <Card style={{ marginTop: 14, padding: 14 }}>
        <Label size={8}>{t('The best 10 days · day {n}', { n: h.day })}</Label>
        <Body size={12.5} style={{ marginTop: 4 }}>{t('Do more good deeds, say lots of takbir, and fast the Day of Arafah on the 9th.')}</Body>
        <Body size={11} weight="semi" color={th.accent} style={{ marginTop: 3 }}>Bukhari 969</Body>
      </Card>
    );
  }
  // Ashura: from 1 Muharram, plan the 9th and 10th fasts.
  if (h.monthIndex === 0 && h.day <= 10) {
    const d9 = addDays(today, 9 - h.day);
    const d10 = addDays(today, 10 - h.day);
    const row = (d, label) => {
      const isPast = d < today;
      const done = !!(data.journalByDay[d.toDateString()] || {}).fasted;
      const on = done || planned(d);
      return <TickRow key={label} done={on} label={label} sub={done ? t('Fasted') : planned(d) ? t('Planned · Seheri reminder on') : longDate(t.lang, d)} onPress={() => (d.getTime() === today.getTime() ? app.setFasted(today, !done) : isPast ? null : plan(d))} />;
    };
    return (
      <Card style={{ marginTop: 14, paddingVertical: 8, paddingHorizontal: 14 }}>
        <Label size={8}>{h.day === 10 ? t('Day of Ashura') : t('Ashura in {n} days', { n: 10 - h.day })}</Label>
        {row(d9, t('Fast the 9th (Tasu‘a)'))}
        {row(d10, t('Fast the 10th (Ashura)'))}
        <Body size={11} color={th.accent}>Muslim 1162 · 1134</Body>
      </Card>
    );
  }
  // White Days (13th–15th).
  if (h.day >= 13 && h.day <= 15 && h.monthIndex !== 8) {
    return (
      <Card style={{ marginTop: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <MoonPhase hDay={14} size={34} fill={th.accent} />
        <View style={{ flex: 1 }}>
          <Label size={8}>{t('White Days · {n} of 3', { n: h.day - 12 })}</Label>
          <Serif size={15} style={{ marginTop: 2 }}>{t('Sunnah fast today')}</Serif>
          <Body size={11} color={th.muted}>{t('Seheri ends {a} · Iftar {b}', { a: timeStr(t, addMinutes(day.Fajr, -(data.safetyBuffer || 0)), tz, true), b: timeStr(t, day.Maghrib, tz, true) })}</Body>
          <Body size={11} color={th.accent}>Nasa’i 2420</Body>
        </View>
        <Press onPress={() => app.setFasted(today, !fasted)} hitSlop={8}><Tick done={fasted} /></Press>
      </Card>
    );
  }
  return null;
}
const getDayTimes = (app, d) => app.getDay(d);

function Takbir() {
  const th = useTheme();
  const t = useT();
  return (
    <View style={{ marginTop: 10, borderTopWidth: 1, borderColor: th.line, paddingTop: 10 }}>
      <Label size={8}>{t('Takbir al-Tashreeq')}</Label>
      <Arabic size={18} style={{ textAlign: 'right', marginTop: 4 }}>{TAKBIR}</Arabic>
      <Body size={11} color={th.muted}>{t('After each Fard prayer from Fajr on the 9th to Asr on the 13th.')}</Body>
      <NotConfirmed />
    </View>
  );
}

// A ruling not yet checked against Bahishti Zewar shows this small red note.
export { NotConfirmed };

/* --------------------------------- Safar --------------------------------- */
function SafarCard() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const since = app.data.travelConfirmed;
  if (!since) return null;
  const days = Math.max(1, Math.round((app.today - new Date(since)) / 86400000) + 1);
  return (
    <Card active style={{ marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Feather name="navigation" size={17} color={th.accent} />
      <Press onPress={() => nav.push('settingsPage', { page: 'safar' })} style={{ flex: 1 }} scaleTo={0.99}>
        <Body size={13.5} weight="semi">{t('Safar · day {n} · {city}', { n: days, city: app.locationName })}</Body>
        <Body size={11.5} color={th.muted}>{t("Qasr on: Dhuhr, Asr and Isha are 2 rak'ahs")}</Body>
      </Press>
      <Press onPress={() => { app.update({ travelConfirmed: null, safarDeclined: true }); app.setToast(t('Safar turned off')); }} style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: th.accentLine }}>
        <Body size={11.5} weight="semi" color={th.accent}>{t('Turn off')}</Body>
      </Press>
    </Card>
  );
}

/* ----------------------------- Second city ----------------------------- */
function SecondCity({ now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const c = app.data.secondCity;
  if (!app.data.secondCityOn || !c) return null;
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

/* --------------------- One notice card at a time --------------------- */
const IFTAR_DUA = DUAS.find((d) => d.id === 2);

function useNotice(now) {
  const app = useApp();
  const { today, data, getDay, hijri } = app;
  const todayKey = today.toDateString();
  const hidden = (kind) => (data.noticeHidden || {})[kind] === todayKey;
  const d = getDay(today);
  const h = hijri(today);
  const fastingToday = app.fastingToday;
  const city = app.isAuto && app.gps.coords && app.gps.name ? app.gps.name : null;
  useEffect(() => {
    if (city && !data.seenCity) app.update({ seenCity: { name: city, ...app.gps.coords } });
  }, [city, !!data.seenCity]);
  // Back home: the "No" for this trip is forgotten, so the next trip asks again.
  useEffect(() => {
    if (!app.travelling && app.gps.coords && data.safarDeclined) app.update({ safarDeclined: null });
  }, [app.travelling, !!app.gps.coords]);
  const clock = useMemo(() => clockChangeSoon(today, app.coords.timezone), [todayKey, app.coords.timezone]);

  if (app.isAuto && app.gps.error && !hidden('location')) return { kind: 'location', denied: app.gps.error === 'denied' };
  if (fastingToday && !hidden('iftar') && now >= d.Maghrib - 60 * 60000 && now < d.Maghrib.getTime() + 30 * 60000 && !(h.monthIndex === 8)) {
    return { kind: 'iftar', at: d.Maghrib };
  }
  if (data.hijriBirthday && !hidden('birthday') && isHijriBirthday(data.hijriBirthday, today, hijri)) {
    return { kind: 'birthday', age: hijriAge(data.hijriBirthday, today, hijri) };
  }
  if (city && data.seenCity && data.seenCity.name !== city && data.cityAsked !== city) return { kind: 'city', city, old: data.seenCity };
  if (clock && !hidden('clock')) return { kind: 'clock', ...clock };
  // Safar: asked once per trip, when ~78 km from home.
  if (app.travelling && !data.travelConfirmed && !data.safarDeclined && data.safarAsk !== 'off') return { kind: 'travel', km: app.awayKm };
  // 15 days in one place: still travelling?
  if (data.travelConfirmed && (app.today - new Date(data.travelConfirmed)) / 86400000 >= 15 && !hidden('safar15')) return { kind: 'safar15' };
  if (h.monthIndex === 9 && h.day >= 2 && !hidden('shawwal') && !data.shawwalHidden) {
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
  // Zakat al-Fitr, in the last 10 days of Ramadan.
  if (h.monthIndex === 8 && h.day >= 20 && !(data.zakatFitrDone || {})[h.year] && !hidden('fitr')) return { kind: 'fitr', year: h.year };
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
  const Btn = ({ label, onPress, fill }) => <Pill label={label} onPress={onPress} fill={fill} />;
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
  } else if (n.kind === 'travel') {
    icon = 'navigation';
    title = t('Travelling?');
    body = t("You're {km} km from home. Are you travelling and staying less than 15 days? Then Dhuhr, Asr and Isha are 2 rak'ahs (qasr).", { km: n.km });
    extra = (
      <View style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Btn fill label={t('Yes, turn on Safar')} onPress={() => app.update({ travelConfirmed: app.today.toDateString(), safar: { since: app.today.toDateString(), city: app.locationName } })} />
          <Btn label={t('No')} onPress={() => app.update({ safarDeclined: true })} />
          <Btn label={t("I'm home now")} onPress={() => { app.update({ homeBase: { ...app.gps.coords, name: app.locationName }, travelConfirmed: null }); app.setToast(t('Saved {name} as home', { name: app.locationName })); }} />
        </View>
        <NotConfirmed />
      </View>
    );
  } else if (n.kind === 'safar15') {
    icon = 'navigation';
    title = t('15 days in Safar');
    body = t("If you're staying 15 days or more in one place, pray in full. Still travelling?");
    extra = (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Btn fill label={t('Still travelling')} onPress={hide} />
        <Btn label={t('Turn off Safar')} onPress={() => app.update({ travelConfirmed: null, safarDeclined: true })} />
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
    onPress = () => nav.push('fasting', { tab: 'shawwal' });
  } else if (n.kind === 'fitr') {
    icon = 'heart';
    title = t('Zakat al-Fitr');
    body = t('Give it before the Eid prayer, for everyone in your family.');
    extra = (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Btn fill label={t('Work it out')} onPress={() => nav.push('charity', { tab: 'fitrah' })} />
        <Btn label={t('Given')} onPress={() => app.update((p) => ({ zakatFitrDone: { ...(p.zakatFitrDone || {}), [n.year]: true }, dirtyAt: Date.now() }))} />
      </View>
    );
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
        {n.kind !== 'travel' ? (
          <Press onPress={hide} hitSlop={10} accessibilityLabel={t('Hide for today')}>
            <Feather name="x" size={15} color={th.faint} />
          </Press>
        ) : null}
      </View>
    </Card>
  );
}
