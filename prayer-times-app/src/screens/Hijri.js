import React, { useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press, Arabic, IconBtn } from '../ui/kit';
import { useLayout, monthName, monthShort, WEEK_LETTERS, hijriMonthName, hijriLabel, longDate, HIJRI_MONTHS_AR, shortDate } from '../ui/hooks';
import { sameDay, addDays } from '../lib/prayer';
import { eventsOnDay, eclipseOnDay, upcomingEvents } from '../lib/events';
import { eventTitle } from '../data/eventText';
import { rangeStats, streaks, hijriMonthRange } from '../lib/stats';
import { dayMark, statusOf, prayedQadaDays } from '../lib/qada';
import { daysAwayText } from './Home';

function Cell({ date, h, today, app, th, t, mark, qadaHere, pending, onPress, width }) {
  const isToday = sameDay(date, today);
  const past = date < today;
  const evt = eventsOnDay(date, h, app.hijri, { history: false }).find((e) => e.kind !== 'custom') || (app.data.showEclipses !== false && eclipseOnDay(date, app.coords));
  const wd = date.getDay();
  let under = null;
  if (evt) under = th.occ;
  else if (h.day >= 13 && h.day <= 15 && h.monthIndex !== 8) under = th.wdc;
  else if ((wd === 1 || wd === 4) && h.monthIndex !== 8) under = th.sfc;
  const note = !!app.data.journalByDay[date.toDateString()]?.text;
  const planned = !!(app.data.fastPlans || {})[date.toDateString()];
  const markColor = mark === 'ok' ? th.ok : mark === 'qada' ? th.amber : mark === 'missed' ? th.faint : null;
  const gLabel = date.getDate() === 1 ? `${t.num(1)} ${monthShort(t.lang, date.getMonth())}` : t.num(date.getDate());
  return (
    <Press onPress={onPress} scaleTo={0.9} haptic={false} style={{ width, height: 54, alignItems: 'center', paddingTop: 4 }} accessibilityLabel={`${hijriLabel(t.lang, h)}, ${longDate(t.lang, date)}${mark === 'qada' ? `, ${t('has qada')}` : mark === 'missed' ? `, ${t('missed')}` : mark === 'ok' ? `, ${t('all on time')}` : ''}`}>
      <View style={[{ width: 38, alignItems: 'center', borderRadius: 10, paddingVertical: 2 }, isToday && { backgroundColor: th.card }]}>
        <Body size={15} weight="semi" color={isToday ? th.cardInk : evt ? th.occ : th.ink} style={[{ lineHeight: 19 }, past && !isToday && { opacity: 0.7 }]}>{t.num(h.day)}</Body>
        <Body size={8.5} numberOfLines={1} color={isToday ? th.cardInk : date.getDate() === 1 ? th.accent : th.muted} style={[{ lineHeight: 11 }, past && !isToday && { opacity: 0.7 }]}>
          {gLabel}
          {note ? <Body size={8.5} color={th.note} style={{ lineHeight: 11 }}> ●</Body> : null}
        </Body>
      </View>
      {markColor && !isToday ? (
        mark === 'ok' ? <Feather name="check" size={9} color={markColor} style={{ position: 'absolute', bottom: 10 }} />
          : mark === 'qada' ? <View style={{ position: 'absolute', bottom: 11, width: 6, height: 6, borderRadius: 3, backgroundColor: markColor }} />
            : <View style={{ position: 'absolute', bottom: 11, width: 6, height: 6, borderRadius: 3, borderWidth: 1.4, borderColor: markColor }} />
      ) : null}
      {qadaHere ? <Body size={9} weight="bold" color={th.amber} style={{ position: 'absolute', top: 1, right: width / 2 - 23, lineHeight: 11 }}>↺</Body> : null}
      {pending ? <View style={{ position: 'absolute', top: 2, right: width / 2 - 22, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: th.amber }} /> : null}
      {planned && !qadaHere ? <Feather name="bell" size={9} color={th.accent} style={{ position: 'absolute', top: 2, left: width / 2 - 23 }} /> : null}
      {under ? <View style={{ position: 'absolute', bottom: 2, width: 26, height: 7, borderWidth: 2, borderTopWidth: 0, borderColor: under, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }} /> : null}
    </Press>
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
  const range = useMemo(() => hijriMonthRange(cursor, app.hijri), [cursor.toDateString(), app.hijri]);
  const hm = app.hijri(range.start);
  const slide = useRef(new Animated.Value(0)).current;

  const go = (delta) => {
    app.haptic();
    Animated.timing(slide, { toValue: -delta, duration: 130, easing: Easing.in(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start(() => {
      setCursor((c) => {
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
    []
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
  const qadaDays = useMemo(() => prayedQadaDays(app.data), [app.data.qadaRecords, app.data.olderLog]);

  // Today: any prayer whose time has come but isn't ticked yet.
  const nowD = new Date();
  const todayTimes = app.getDay(today);
  const todayPending = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].some((n) => todayTimes[n] <= nowD && statusOf(app.data, today, n, ctx) === 'pending');
  const cellW = Math.floor((L.width - L.pad * 2) / 7);
  const cells = [];
  for (let i = 0; i < range.start.getDay(); i++) cells.push(<View key={`e${i}`} style={{ width: cellW, height: 54 }} />);
  for (let d = 0; d < range.days; d++) {
    const date = addDays(range.start, d);
    cells.push(
      <Cell
        key={d} date={date} h={app.hijri(date)} today={today} app={app} th={th} t={t} width={cellW}
        mark={dayMark(app.data, date, ctx)}
        qadaHere={qadaDays.has(date.toDateString())}
        pending={sameDay(date, today) && todayPending}
        onPress={() => nav.openSheet('day', { date })}
      />
    );
  }
  const gFirst = range.start;
  const gSpan = gFirst.getMonth() === lastDay.getMonth()
    ? `${monthName(t.lang, gFirst.getMonth())} ${t.num(gFirst.getFullYear())}`
    : `${monthName(t.lang, gFirst.getMonth())} – ${monthName(t.lang, lastDay.getMonth())} ${t.num(lastDay.getFullYear())}`;

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
            <Serif size={27} numberOfLines={1} style={{ flexShrink: 1 }}>{hijriMonthName(t.lang, hm.monthIndex)}</Serif>
            <Arabic size={17} color={th.accent} style={{ marginLeft: 8, lineHeight: 30 }}>{HIJRI_MONTHS_AR[hm.monthIndex]}</Arabic>
            <Feather name="chevron-down" size={16} color={th.faint} style={{ marginLeft: 6 }} />
          </View>
          <Body size={12.5} color={th.muted} numberOfLines={1}>{`${t.num(hm.year)} ${t('AH')} · ${gSpan}`}</Body>
        </Press>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconBtn name="chevron-left" onPress={() => go(-1)} label={t('Previous month')} />
          <IconBtn name="chevron-right" onPress={() => go(1)} label={t('Next month')} />
        </View>
      </View>
      <Press onPress={() => nav.openSheet('monthInfo', { monthIndex: hm.monthIndex })} style={{ alignSelf: 'flex-start', marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Feather name="info" size={12} color={th.accent} />
        <Body size={12} weight="semi" color={th.accent}>{t('About this month')}</Body>
      </Press>
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
          <Feather name="check" size={10} color={th.ok} />
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: th.amber }} />
          <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.4, borderColor: th.faint }} />
          <Body size={10} weight="bold" color={th.amber}>↺</Body>
          {[th.wdc, th.sfc, th.occ].map((c) => (
            <View key={c} style={{ width: 12, height: 6, borderWidth: 1.8, borderTopWidth: 0, borderColor: c, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} />
          ))}
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
