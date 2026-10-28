import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Arabic, Press, Card, PatternBand, Divider } from '../ui/kit';
import { Arch, SunArc } from '../ui/parts';
import { useNow, useLayout, longDate, hijriLabel, countdownText, mmss, timeStr, shortDuration, HIJRI_MONTHS_AR, hijriMonthName } from '../ui/hooks';
import { PRAYER_NAMES, PRAYER_AR, addDays, addMinutes, makruhWindows } from '../lib/prayer';
import { nextMonthBoundary } from '../lib/hijri';
import { upcomingEvents } from '../lib/events';
import { eventTitle } from '../data/eventText';

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
  const makruh = app.activeMakruh && now < app.activeMakruh.end ? app.activeMakruh : null;

  const archW = Math.min(L.width * 0.56, 232);
  const archH = archW * 1.22;

  const events = useMemo(() => upcomingEvents(today, hijri, 60), [today, hijri]);
  const nextEvent = events[0];
  const boundary = useMemo(() => nextMonthBoundary(today, app.cal), [today, app.cal]);
  const showMoon = data.moonCheck !== false && boundary && boundary.evening.getTime() === today.getTime();

  const tileState = (name) => {
    const done = app.isPrayed(today, name);
    const isNext = np.next.name === name && np.next.day.getTime() === today.getTime();
    const passed = times[name] <= now;
    return { done, isNext, passed };
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
            <Body size={10.5} weight="semi" color={th.accent}>{hijriLabel(t.lang, h)}</Body>
            <Arabic size={11.5} color={th.accent} style={{ lineHeight: 18 }}>{HIJRI_MONTHS_AR[h.monthIndex]}</Arabic>
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
        </View>

        <View style={{ paddingHorizontal: L.pad, marginTop: 16 }}>
          {/* Seheri / Iftar band */}
          <Card onPress={() => nav.push('fasting')} style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 9 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Label size={8.5}>{fw.night ? t('Iftar') : t('Seheri')}</Label>
              <Label size={8.5}>{fw.night ? t('Night ›') : t('{p}% fasted ›', { p: Math.round(fw.progress * 100) })}</Label>
              <Label size={8.5}>{fw.night ? t('Seheri') : t('Iftar')}</Label>
            </View>
            <SunArc progress={fw.progress} night={fw.night} width={320} height={44} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Serif size={15}>{timeStr(t, fw.from, tz, true)}</Serif>
              <Label size={9} color={th.accent}>{fw.night ? t('Seheri ends in {d}', { d: shortDuration(t, fw.to - now) }) : t('Iftar in {d}', { d: shortDuration(t, fw.to - now) })}</Label>
              <Serif size={15}>{timeStr(t, fw.to, tz, true)}</Serif>
            </View>
          </Card>

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
                  onPress={() => (s.passed ? app.togglePrayer(today, name) : nav.openSheet('prayer', { name, date: today }))}
                  onLongPress={() => nav.openSheet('prayer', { name, date: today })}
                  accessibilityLabel={`${t(name)} ${timeStr(t, times[name], tz)}`}
                  accessibilityState={{ checked: s.done }}
                  style={[
                    { flex: 1, alignItems: 'center', paddingTop: 9, paddingBottom: 9, borderRadius: 15, borderWidth: 1, borderColor: th.line, backgroundColor: th.soft },
                    s.isNext && { borderColor: th.accent, backgroundColor: th.accentSoft },
                    s.passed && !s.isNext && { opacity: 0.62 },
                  ]}
                >
                  <Label size={7.5} color={s.isNext ? th.accent : th.muted} numberOfLines={1}>{t(name)}</Label>
                  <Serif bold size={15} color={s.isNext ? th.accent : th.ink} style={{ marginTop: 3, marginBottom: 6 }}>{timeStr(t, times[name], tz, true)}</Serif>
                  <View style={[{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: th.faint, alignItems: 'center', justifyContent: 'center' }, s.done && { backgroundColor: th.ok, borderColor: th.ok }]}>
                    {s.done ? <Feather name="check" size={12} color="#fff" /> : null}
                  </View>
                </Press>
              );
            })}
          </View>
          <Body size={10.5} color={th.faint} style={{ textAlign: 'center', marginTop: 6 }}>{t('Tap a prayer to tick it off · hold for details')}</Body>

          {/* Prohibited times */}
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
                      <Serif bold size={14} color={nowIn ? th.red : th.ink}>{`${timeStr(t, w.start, tz, true)} – ${timeStr(t, w.end, tz, true)}`}</Serif>
                      <Label size={8} style={{ marginTop: 2 }} color={nowIn ? th.red : th.muted}>{nowIn ? t('Ends in {t}', { t: mmss(t, w.end - now) }) : timeStr(t, w.end, tz).replace(/^.*\s/, '')}</Label>
                    </View>
                  </Press>
                </View>
              );
            })}
          </Card>

          {/* Next important day */}
          {nextEvent ? (
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
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

export function daysAwayText(t, date, today) {
  const n = Math.round((date - today) / 86400000);
  if (n <= 0) return t('Today');
  if (n === 1) return t('Tomorrow');
  return t('In {n} days', { n });
}
