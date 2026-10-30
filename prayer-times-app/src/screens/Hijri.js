import React, { useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press, Arabic, IconBtn } from '../ui/kit';
import { useLayout, monthName, monthShort, WEEK_LETTERS, hijriMonthName, hijriLabel, longDate, HIJRI_MONTHS_AR, shortDate } from '../ui/hooks';
import { sameDay, addDays, PRAYER_NAMES } from '../lib/prayer';
import { eventsOnDay, eclipseOnDay, upcomingEvents } from '../lib/events';
import { eventTitle } from '../data/eventText';
import { rangeStats, streaks, hijriMonthRange } from '../lib/stats';
import { dayMark, statusOf, qadaHistory } from '../lib/qada';
import { fastingDayInfo } from '../lib/alerts';
import { DayTile, BIG_DAYS, MoonBadge, OccStar, FAST_COLORS, OCC_COLOR, rgba } from '../ui/dayTile';
import Svg, { Rect } from 'react-native-svg';
import { daysAwayText } from './Home';

// Everything one calendar day needs, worked out once.
function dayInfo({ date, h, today, app, ctx, qadaCount, regular, t }) {
  const key = date.toDateString();
  const isToday = sameDay(date, today);
  const future = date > today;
  const evs = eventsOnDay(date, h, app.hijri, { history: false }).filter((e) => e.kind !== 'custom');
  let big = null;
  for (const e of evs) if (BIG_DAYS[e.id]) { big = BIG_DAYS[e.id]; break; }
  if (!big && h.monthIndex === 8 && h.day === 1) big = ['ramadan', 'RAMADAN'];
  const ecl = app.data.showEclipses !== false && eclipseOnDay(date, app.coords);
  const occ = !big && (evs.some((e) => e.alert) || !!ecl);
  const j = app.data.journalByDay[key] || {};
  const planned = !!(app.data.fastPlans || {})[key];
  const info = fastingDayInfo(date, app.cal);
  let fast = null;
  if (info) {
    const kind = info.type === 'ramadan' ? 'other' : info.reason === 'white' ? 'white' : info.reason === 'monday' || info.reason === 'thursday' ? 'sun' : 'other';
    fast = { kind, fasted: !!j.fasted };
  } else if (j.fasted || planned) fast = { kind: 'other', fasted: !!j.fasted };
  const tracked = isToday || dayMark(app.data, date, ctx) !== null || Object.keys((app.data.completedByDay || {})[key] || {}).length > 0;
  const prayers = !future && tracked ? PRAYER_NAMES.map((n) => {
    const s = statusOf(app.data, date, n, ctx);
    return s === 'pending' ? null : s;
  }) : null;
  const label = big ? (big[0] === 'eidFitr' || big[0] === 'eidAdha' ? t('EID') : big[0] === 'ramadan' ? t('RAMADAN') : big[0] === 'arafah' ? t('ARAFAH') : t('QADR')) : null;
  let sub;
  let subAccent = false;
  if (regular) {
    sub = h.day === 1 ? `${t.num(1)} ${hijriMonthName(t.lang, h.monthIndex).split(' ')[0].slice(0, 5)}` : t.num(h.day);
    subAccent = h.day === 1;
  } else {
    sub = date.getDate() === 1 ? `${t.num(1)} ${monthShort(t.lang, date.getMonth())}` : t.num(date.getDate());
    subAccent = date.getDate() === 1;
  }
  return {
    n: t.num(regular ? date.getDate() : h.day), sub, subAccent, today: isToday, future,
    state: isToday ? null : dayMark(app.data, date, ctx), prayers, fast, occ, big, bigLabel: label,
    qadaPrayed: qadaCount || 0, note: !!j.text, evs, ecl,
  };
}

function Cell({ day, date, h, t, onPress, width, th }) {
  const parts = [hijriLabel(t.lang, h), longDate(t.lang, date)];
  if (day.state === 'ok') parts.push(t('all on time'));
  else if (day.state === 'qada') parts.push(t('has qada'));
  else if (day.state === 'missed') parts.push(t('missed'));
  if (day.fast) parts.push(day.fast.fasted ? t('fasted') : t('Sunnah fast'));
  if (day.qadaPrayed) parts.push(t('{n} qada prayed', { n: day.qadaPrayed }));
  if (day.big || day.occ) parts.push(day.evs.map((e) => eventTitle(e, t.lang)).join(', '));
  return (
    <Press onPress={onPress} scaleTo={0.9} haptic={false} style={{ width, height: 62, alignItems: 'center' }} accessibilityLabel={parts.filter(Boolean).join(', ')}>
      <DayTile th={th} day={day} width={width} />
    </Press>
  );
}

// The little row of marks on the "What the marks mean" button.
export function KeyIcons({ th }) {
  return (
    <Svg width={92} height={14}>
      <Rect x={0} y={1} width={12} height={12} rx={4} fill={rgba(th.ok, 0.3)} />
      <Rect x={16.5} y={1.5} width={11} height={11} rx={3.5} fill={rgba(th.amber, 0.15)} stroke={th.amber} strokeWidth={1} />
      <Rect x={32.5} y={1.5} width={11} height={11} rx={3.5} fill={rgba(th.red, 0.15)} stroke={th.red} strokeWidth={1} />
      <MoonBadge x={54} y={7} color={th.isLight ? FAST_COLORS.sunLight : FAST_COLORS.sun} fasted scale={1.1} />
      <OccStar x={69} y={7} color={th.isLight ? OCC_COLOR.light : OCC_COLOR.dark} r={5} />
      <Rect x={80} y={2} width={2} height={10} rx={1} fill={th.amber} />
    </Svg>
  );
}

export default function HijriScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { today } = app;
  const [cursor, setCursor] = useState(today);
  const regular = app.data.calMain === 'regular';
  const range = useMemo(() => {
    if (!regular) return hijriMonthRange(cursor, app.hijri);
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return { start, days, monthIndex: app.hijri(start).monthIndex, year: app.hijri(start).year };
  }, [cursor.toDateString(), app.hijri, regular]);
  const hm = app.hijri(range.start);
  const slide = useRef(new Animated.Value(0)).current;

  const go = (delta) => {
    app.haptic();
    Animated.timing(slide, { toValue: -delta, duration: 130, easing: Easing.in(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start(() => {
      setCursor((c) => {
        if (app.data.calMain === 'regular') return new Date(c.getFullYear(), c.getMonth() + delta, 1);
        const r = hijriMonthRange(c, app.hijri);
        return delta > 0 ? addDays(r.start, r.days) : addDays(r.start, -1);
      });
      slide.setValue(delta);
      Animated.timing(slide, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    });
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50) go(1);
          else if (g.dx > 50) go(-1);
        },
      }),
    [app.data.calMain]
  );

  const lastDay = addDays(range.start, range.days - 1);
  const isThisMonth = today >= range.start && today <= lastDay;
  const inPast = range.start <= today;
  const ctx = { today, now: new Date(), getDay: app.getDay };
  const stats = useMemo(
    () => (inPast ? rangeStats({ from: range.start, days: range.days, data: app.data, today, now: new Date(), getDay: app.getDay }) : null),
    [range.start.getTime(), range.days, app.data, today, inPast]
  );
  const st = useMemo(() => streaks(app.data.completedByDay, today), [app.data.completedByDay, today]);
  // How many qada were prayed on each day.
  const qadaCounts = useMemo(() => {
    const m = {};
    qadaHistory(app.data).forEach((q) => { const k = q.on.toDateString(); m[k] = (m[k] || 0) + 1; });
    return m;
  }, [app.data.qadaRecords, app.data.olderLog]);

  const cellW = Math.floor((L.width - L.pad * 2) / 7);
  const cells = [];
  for (let i = 0; i < range.start.getDay(); i++) cells.push(<View key={`e${i}`} style={{ width: cellW, height: 62 }} />);
  for (let d = 0; d < range.days; d++) {
    const date = addDays(range.start, d);
    const h = app.hijri(date);
    const day = dayInfo({ date, h, today, app, ctx, qadaCount: qadaCounts[date.toDateString()], regular, t });
    cells.push(<Cell key={d} day={day} date={date} h={h} t={t} th={th} width={cellW} onPress={() => nav.openSheet('day', { date })} />);
  }
  const gFirst = range.start;
  const gSpan = gFirst.getMonth() === lastDay.getMonth()
    ? `${monthName(t.lang, gFirst.getMonth())} ${t.num(gFirst.getFullYear())}`
    : `${monthName(t.lang, gFirst.getMonth())} – ${monthName(t.lang, lastDay.getMonth())} ${t.num(lastDay.getFullYear())}`;
  const hLast = app.hijri(lastDay);
  const hSpan = hm.monthIndex === hLast.monthIndex
    ? `${hijriMonthName(t.lang, hm.monthIndex)} ${t.num(hm.year)} ${t('AH')}`
    : `${hijriMonthName(t.lang, hm.monthIndex)} – ${hijriMonthName(t.lang, hLast.monthIndex)} ${t.num(hLast.year)} ${t('AH')}`;
  const title = regular ? `${monthName(t.lang, range.start.getMonth())} ${t.num(range.start.getFullYear())}` : hijriMonthName(t.lang, hm.monthIndex);
  const arabic = regular && hm.monthIndex !== hLast.monthIndex ? `${HIJRI_MONTHS_AR[hm.monthIndex]} – ${HIJRI_MONTHS_AR[hLast.monthIndex]}` : HIJRI_MONTHS_AR[hm.monthIndex];
  const subLine = regular ? hSpan : `${t.num(hm.year)} ${t('AH')} · ${gSpan}`;
  const flipMain = () => {
    const next = regular ? 'hijri' : 'regular';
    app.update({ calMain: next });
    app.setToast(next === 'regular' ? t('Showing regular dates') : t('Showing Hijri dates'));
  };

  const events = useMemo(() => upcomingEvents(today, app.hijri, 380, { history: false, coords: app.coords, eclipses: app.data.showEclipses !== false }).filter((e) => e.evt.kind !== 'custom').slice(0, 6), [today, app.hijri, app.coords, app.data.showEclipses]);
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 16, paddingHorizontal: L.pad, paddingBottom: L.bottomSpace }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Press
          style={{ flex: 1 }}
          scaleTo={0.98}
          accessibilityLabel={t('Open the whole year')}
          onPress={() => nav.push('hijriYear', { year: hm.year, onPick: (d) => setCursor(d) })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Serif size={27} numberOfLines={1} style={{ flexShrink: 1 }}>{title}</Serif>
            <Feather name="chevron-down" size={16} color={th.faint} style={{ marginLeft: 6 }} />
          </View>
          <Arabic size={16} color={th.accent} style={{ lineHeight: 28, alignSelf: 'flex-start' }}>{arabic}</Arabic>
          <Body size={12.5} color={th.muted} numberOfLines={1}>{subLine}</Body>
        </Press>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconBtn name="chevron-left" onPress={() => go(-1)} label={t('Previous month')} />
          <IconBtn name="chevron-right" onPress={() => go(1)} label={t('Next month')} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <Press onPress={() => nav.openSheet('monthInfo', { monthIndex: hm.monthIndex })} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Feather name="info" size={12} color={th.accent} />
          <Body size={12} weight="semi" color={th.accent}>{t('About this month')}</Body>
        </Press>
        <Press onPress={flipMain} hitSlop={8} accessibilityLabel={t('Switch between Hijri and regular dates')} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: th.line, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Body size={11.5} weight="semi" color={th.accent}>{regular ? t('Regular') : t('Hijri')}</Body>
          <Feather name="repeat" size={11} color={th.accent} />
        </Press>
      </View>
      {!isThisMonth ? (
        <Press onPress={() => setCursor(today)} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
          <Body size={12} weight="semi" color={th.accent}>{t('Back to today')}</Body>
        </Press>
      ) : null}

      {/* Calendar */}
      <Animated.View
        {...pan.panHandlers}
        style={{ marginTop: 14, opacity: slide.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }), transform: [{ translateX: slide.interpolate({ inputRange: [-1, 1], outputRange: [-40, 40] }) }] }}
      >
        <View style={{ flexDirection: 'row' }}>
          {WEEK_LETTERS[t.lang === 'bn' ? 'bn' : 'en'].map((w, i) => (
            <View key={i} style={{ width: cellW, alignItems: 'center', paddingBottom: 6 }}>
              <Label size={9.5} color={i === 5 ? th.accent : th.muted}>{w}</Label>
            </View>
          ))}
        </View>
        {Array.from({ length: Math.ceil(cells.length / 7) }, (_, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>{cells.slice(r * 7, r * 7 + 7)}</View>
        ))}
      </Animated.View>

      {/* Calendar key */}
      <Press onPress={() => nav.openSheet('calendarKey', { from: range.start, days: range.days })} scaleTo={0.99} style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: th.line, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: th.soft }}>
          <KeyIcons th={th} />
          <Body size={12.5} style={{ flex: 1, marginLeft: 4 }}>{t('What the marks mean')}</Body>
          <Feather name="chevron-right" size={16} color={th.faint} />
        </View>
      </Press>
      <Body size={10.5} color={th.faint} style={{ textAlign: 'center', marginTop: 7 }}>{t('Tap a day to log it · tap the month name for the whole year')}</Body>

      {/* Month stats: one slim row */}
      {stats && stats.tracking && stats.due ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22, marginBottom: 8 }}>
            <Label>{isThisMonth ? t('This month so far') : hijriMonthName(t.lang, hm.monthIndex)}</Label>
            <Press onPress={() => nav.push('monthStats', { date: range.start })}>
              <Body size={11} weight="semi" color={th.accent}>{`${t('Month stats')} ›`}</Body>
            </Press>
          </View>
          <Press onPress={() => nav.push('monthStats', { date: range.start })} scaleTo={0.99} accessibilityLabel={t('Month stats')}>
            <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: th.line, borderRadius: 16 }}>
              {[
                [t.num(stats.onTime), t('On time'), th.ok],
                [t.num(stats.qada), t('Qada'), th.amber],
                [t.num(stats.missed), t('Missed'), th.ink],
                [t.num(st.current), t('Streak'), th.ink],
              ].map(([v, k, c], i) => (
                <View key={i} style={[{ flex: 1, alignItems: 'center', paddingVertical: 11, paddingHorizontal: 4 }, i > 0 && { borderLeftWidth: 1, borderColor: th.line }]}>
                  <Serif size={20} maxScale={1.12} color={c} numberOfLines={1}>{v}</Serif>
                  <Label size={8} maxScale={1.12} numberOfLines={1} style={{ marginTop: 2, textAlign: 'center' }}>{k}</Label>
                </View>
              ))}
            </View>
          </Press>
          <Body size={10.5} color={th.faint} style={{ marginTop: 6, textAlign: 'center' }}>{t('Streak counts days with all 5 on time')}</Body>
        </>
      ) : null}

      {/* Upcoming */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, marginBottom: 8 }}>
        <Label>{t('Coming up')}</Label>
        <Press onPress={() => nav.push('importantDays')}>
          <Body size={11} weight="semi" color={th.accent}>{`${t('See all')} ›`}</Body>
        </Press>
      </View>
      <Card style={{ paddingVertical: 2 }}>
        {events.map((e, i) => (
          <Press key={`${e.evt.id}${i}`} onPress={() => nav.openSheet('event', { id: e.evt.id, date: e.date })} scaleTo={0.99}>
            {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, gap: 12 }}>
              <View style={{ width: 40, alignItems: 'center' }}>
                <Serif bold size={18} color={e.evt.id === 'white-days' ? th.wdc : th.occ}>{t.num(e.date.getDate())}</Serif>
                <Label size={7.5}>{t(monthLabels[e.date.getMonth()])}</Label>
              </View>
              <View style={{ flex: 1 }}>
                <Serif size={15} numberOfLines={1}>{eventTitle(e.evt, t.lang)}</Serif>
                <Body size={11.5} color={th.muted}>{`${shortDate(t.lang, e.date)} · ${daysAwayText(t, e.date, today)}`}</Body>
              </View>
              <Feather name="chevron-right" size={16} color={th.faint} />
            </View>
          </Press>
        ))}
      </Card>

      {/* Tools */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Card onPress={() => nav.push('dateConverter')} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="repeat" size={15} color={th.accent} />
          <Body size={12.5} weight="semi" style={{ flex: 1 }} numberOfLines={1}>{t('Date converter')}</Body>
        </Card>
        <Card onPress={() => nav.push('hijriSettings')} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="moon" size={15} color={th.accent} />
          <Body size={12.5} weight="semi" style={{ flex: 1 }} numberOfLines={1}>
            {app.cal.mode === 'auto' ? t('Moon sighting: auto') : t('Umm al-Qura')}{app.cal.offset ? ` · ${app.cal.offset > 0 ? '+' : ''}${t.num(app.cal.offset)}` : ''}
          </Body>
        </Card>
      </View>
    </ScrollView>
  );
}
