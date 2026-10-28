import React, { useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press, Arabic, IconBtn } from '../ui/kit';
import { useLayout, monthName, WEEK_LETTERS, hijriMonthName, HIJRI_MONTHS_AR, shortDate } from '../ui/hooks';
import { sameDay } from '../lib/prayer';
import { eventOnDay, upcomingEvents } from '../lib/events';
import { eventTitle } from '../data/eventText';
import { monthStats, streaks } from '../lib/stats';
import { daysAwayText } from './Home';

function Cell({ date, today, app, th, t, missed, pending, onPress, width }) {
  const h = app.hijri(date);
  const isToday = sameDay(date, today);
  const past = date < today;
  const evt = eventOnDay(date, h, app.hijri);
  const wd = date.getDay();
  let under = null;
  if (evt) under = th.occ;
  else if (h.day >= 13 && h.day <= 15 && h.monthIndex !== 8) under = th.wdc;
  else if ((wd === 1 || wd === 4) && h.monthIndex !== 8) under = th.sfc;
  const note = !!app.data.journalByDay[date.toDateString()]?.text;
  const planned = !!(app.data.fastPlans || {})[date.toDateString()];
  return (
    <Press onPress={onPress} scaleTo={0.9} haptic={false} style={{ width, height: 50, alignItems: 'center', paddingTop: 4 }} accessibilityLabel={date.toDateString()}>
      <View style={[{ width: 36, alignItems: 'center', borderRadius: 10, paddingVertical: 2 }, isToday && { backgroundColor: th.card }]}>
        <Body size={15} weight="semi" color={isToday ? th.cardInk : evt ? th.occ : th.ink} style={[{ lineHeight: 19 }, past && !isToday && { opacity: 0.55 }]}>{t.num(date.getDate())}</Body>
        <Body size={9.5} color={isToday ? th.cardInk : th.muted} style={[{ lineHeight: 12 }, past && !isToday && { opacity: 0.6 }]}>
          {t.num(h.day)}
          {note ? <Body size={9.5} color={th.note} style={{ lineHeight: 12 }}> ●</Body> : null}
        </Body>
      </View>
      {missed ? <View style={{ position: 'absolute', top: 3, right: width / 2 - 20, width: 6, height: 6, borderRadius: 3, backgroundColor: th.amber }} /> : null}
      {pending ? <View style={{ position: 'absolute', top: 2, right: width / 2 - 21, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: th.amber }} /> : null}
      {planned ? <Feather name="bell" size={9} color={th.accent} style={{ position: 'absolute', top: 2, right: width / 2 - 22 }} /> : null}
      {under ? <View style={{ position: 'absolute', bottom: 2, width: 26, height: 8, borderWidth: 2, borderTopWidth: 0, borderColor: under, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }} /> : null}
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
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const slide = useRef(new Animated.Value(0)).current;

  const go = (delta) => {
    app.haptic();
    Animated.timing(slide, { toValue: -delta, duration: 130, easing: Easing.in(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start(() => {
      setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
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

  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const hStart = app.hijri(first);
  const hEnd = app.hijri(new Date(y, m, days));
  const sub =
    hStart.monthIndex === hEnd.monthIndex
      ? `${hijriMonthName(t.lang, hStart.monthIndex)} ${t.num(hStart.year)}`
      : `${hijriMonthName(t.lang, hStart.monthIndex)} – ${hijriMonthName(t.lang, hEnd.monthIndex)} ${t.num(hEnd.year)}`;

  const isThisMonth = y === today.getFullYear() && m === today.getMonth();
  const inPast = first <= today;
  const stats = useMemo(
    () => (inPast ? monthStats({ year: y, month: m, completedByDay: app.data.completedByDay, journalByDay: app.data.journalByDay, today, now: new Date(), getDay: app.getDay }) : null),
    [y, m, app.data.completedByDay, app.data.journalByDay, today, inPast]
  );
  const st = useMemo(() => streaks(app.data.completedByDay, today), [app.data.completedByDay, today]);

  // Today: any prayer whose time has come but isn't ticked yet.
  const nowD = new Date();
  const todayTimes = app.getDay(today);
  const todayPending = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].some((n) => todayTimes[n] <= nowD && !app.isPrayed(today, n));
  let anyPlanned = false;
  for (let d = 1; d <= days && !anyPlanned; d++) if ((app.data.fastPlans || {})[new Date(y, m, d).toDateString()]) anyPlanned = true;
  // The Hijri month most of this Gregorian month falls in.
  const hMid = isThisMonth ? app.hijri(today) : app.hijri(new Date(y, m, 15));
  const cellW = Math.floor((L.width - L.pad * 2) / 7);
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(<View key={`e${i}`} style={{ width: cellW, height: 50 }} />);
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m, d);
    cells.push(
      <Cell
        key={d} date={date} today={today} app={app} th={th} t={t} width={cellW}
        missed={stats && stats.missedDays.has(d)}
        pending={isThisMonth && d === today.getDate() && todayPending}
        onPress={() => nav.openSheet('day', { date })}
      />
    );
  }

  const events = useMemo(() => upcomingEvents(today, app.hijri, 380).slice(0, 6), [today, app.hijri]);
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 16, paddingHorizontal: L.pad, paddingBottom: L.bottomSpace }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Press
          style={{ flex: 1 }}
          scaleTo={0.98}
          onPress={() => nav.push('hijriYear', { year: hMid.year, onPick: (d) => setCursor(new Date(d.getFullYear(), d.getMonth(), 1)) })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Serif size={30}>{monthName(t.lang, m)}</Serif>
            {y !== today.getFullYear() ? <Serif size={30} color={th.muted}>{` ${t.num(y)}`}</Serif> : null}
            <Arabic size={18} color={th.accent} style={{ marginLeft: 8, lineHeight: 32 }}>{HIJRI_MONTHS_AR[hMid.monthIndex]}</Arabic>
            <Feather name="chevron-down" size={16} color={th.faint} style={{ marginLeft: 4 }} />
          </View>
          <Body size={12.5} color={th.muted}>{sub}</Body>
        </Press>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconBtn name="chevron-left" onPress={() => go(-1)} label={t('Previous month')} />
          <IconBtn name="chevron-right" onPress={() => go(1)} label={t('Next month')} />
        </View>
      </View>
      {!isThisMonth ? (
        <Press onPress={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
          <Body size={12} weight="semi" color={th.accent}>{t('Back to today')}</Body>
        </Press>
      ) : null}

      {/* Monthly stats */}
      {stats ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <Card onPress={() => nav.push('monthStats', { year: y, month: m })} style={{ flex: 1.35, padding: 12 }}>
            <Label size={8}>{isThisMonth ? t('{month} so far', { month: monthName(t.lang, m) }) : monthName(t.lang, m)}</Label>
            {stats.tracking && stats.due ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 3 }}>
                  <Serif bold size={26}>{t.num(stats.prayed)}</Serif>
                  <Serif size={22} color={th.muted}>/</Serif>
                  <Serif bold size={26}>{t.num(stats.due)}</Serif>
                  <Body size={11} color={th.muted} style={{ marginLeft: 4 }}>{t('prayed')}</Body>
                </View>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: th.line, marginTop: 6, overflow: 'hidden' }}>
                  <View style={{ width: `${stats.pct}%`, height: 5, backgroundColor: th.ok, borderRadius: 3 }} />
                </View>
              </>
            ) : (
              <Body size={12} color={th.muted} style={{ marginTop: 4 }}>{t('Tick prayers on the Prayers tab to see your progress here.')}</Body>
            )}
          </Card>
          <View style={{ flex: 1, gap: 8 }}>
            <Card onPress={() => nav.push('monthStats', { year: y, month: m })} style={{ flex: 1, paddingHorizontal: 11, paddingVertical: 8 }}>
              <Serif bold size={17}>{t.num(st.current)}</Serif>
              <Label size={7.5}>{t('Day streak')}</Label>
            </Card>
            <Card onPress={() => nav.push('monthStats', { year: y, month: m })} style={{ flex: 1, paddingHorizontal: 11, paddingVertical: 8 }}>
              <Serif bold size={17}>{stats.mostMissed ? t(stats.mostMissed) : '—'}</Serif>
              <Label size={7.5}>{stats.mostMissed ? t('Missed {n}×', { n: stats.mostMissedCount }) : t('Nothing missed')}</Label>
            </Card>
          </View>
        </View>
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

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14, rowGap: 6, marginTop: 10 }}>
        {[
          [th.wdc, t('White Days'), 'u'],
          [th.sfc, t('Mon/Thu fast'), 'u'],
          [th.occ, t('Occasion'), 'u'],
          [th.amber, t('Missed prayer'), 'd'],
          ...(isThisMonth && todayPending ? [[th.amber, t('Not ticked yet'), 'r']] : []),
          ...(anyPlanned ? [[th.accent, t('Fast reminder'), 'b']] : []),
        ].map(([c, label, kind]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {kind === 'u' ? (
              <View style={{ width: 12, height: 6, borderWidth: 1.8, borderTopWidth: 0, borderColor: c, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} />
            ) : kind === 'r' ? (
              <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: c }} />
            ) : kind === 'b' ? (
              <Feather name="bell" size={10} color={c} />
            ) : (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
            )}
            <Body size={10.5} color={th.muted}>{label}</Body>
          </View>
        ))}
      </View>
      <Body size={10.5} color={th.faint} style={{ textAlign: 'center', marginTop: 6 }}>{t('Tap any date to log prayers, a note or a fast · tap the month name for the whole year')}</Body>

      {/* Upcoming */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, marginBottom: 8 }}>
        <Label>{t('Coming up')}</Label>
        <Press onPress={() => nav.push('hijriSettings')}>
          <Body size={11} weight="semi" color={th.accent}>{app.cal.mode === 'auto' ? t('Moon sighting: auto') : t('Umm al-Qura')}{app.cal.offset ? ` · ${app.cal.offset > 0 ? '+' : ''}${t.num(app.cal.offset)}` : ''}</Body>
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
    </ScrollView>
  );
}
