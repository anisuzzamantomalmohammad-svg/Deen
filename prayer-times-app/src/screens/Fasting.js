import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press, Arabic, Segmented, Toggle, Row, SectionLabel, PatternBand, IconBtn, FadeSwitch } from '../ui/kit';
import { SunArc } from '../ui/parts';
import { useNow, useLayout, timeStr, WEEK_SHORT, shortDate, countdownText } from '../ui/hooks';
import { addDays, addMinutes, sameDay } from '../lib/prayer';
import { fastingDayInfo } from '../lib/alerts';
import { fastingWindow } from './Home';
import { DUAS } from '../data/duas';
import { duaText } from '../data/duaText';

function TodayView({ now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { today, coords } = app;
  const tz = coords.timezone;
  const fw = fastingWindow(app, now);
  const j = app.data.journalByDay[today.toDateString()] || {};
  const h = app.hijri(today);
  const ramadan = h.monthIndex === 8;
  const dua = DUAS.find((d) => d.id === (fw.night ? 1 : 2));
  const dt = duaText(dua, t.lang);
  const sizeW = Math.min(L.width - 20, 400);

  return (
    <View>
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <View style={{ width: sizeW, height: 170 }}>
          <SunArc progress={fw.progress} night={fw.night} width={sizeW} height={150} strong />
        </View>
        <View style={{ alignItems: 'center', marginTop: -86 }}>
          <Label>{fw.night ? t('Seheri ends in') : t('Iftar in')}</Label>
          <Serif bold size={44} style={{ marginTop: 2 }}>{countdownText(t, fw.to - now)}</Serif>
          <Arabic size={20} color={th.accent}>{fw.night ? 'السحور' : 'الإفطار'}</Arabic>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 4 }}>
        <View>
          <Label size={8.5}>{fw.night ? t('Iftar was') : t('Seheri ended')}</Label>
          <Serif size={17}>{timeStr(t, fw.from, tz)}</Serif>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Label size={8.5}>{fw.night ? t('Seheri ends') : t('Iftar')}</Label>
          <Serif size={17}>{timeStr(t, fw.to, tz)}</Serif>
        </View>
      </View>

      <Card style={{ marginTop: 16, paddingVertical: 2 }}>
        <Row first icon="sunrise" label={ramadan ? t('Fasting today · Ramadan day {n}', { n: h.day }) : t("I'm fasting today")} right={<Toggle value={!!j.fasted} onChange={(v) => app.setFasted(today, v)} />} />
      </Card>

      <Card onPress={() => nav.push('dua', { id: dua.id })} style={{ marginTop: 10, padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Label size={8.5} color={th.accent}>{fw.night ? t('Intention for the fast') : t('Dua for breaking the fast')}</Label>
          <Feather name="maximize-2" size={13} color={th.faint} />
        </View>
        <Arabic size={21} style={{ textAlign: 'right', marginTop: 6 }}>{dua.arabic}</Arabic>
        <Body size={12} color={th.muted} style={{ marginTop: 2 }} numberOfLines={2}>{dt.translation}</Body>
      </Card>

      {ramadan ? <RamadanTracker h={h} /> : <RamadanTeaser />}
    </View>
  );
}

function RamadanTeaser() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const days = useMemo(() => {
    for (let i = 1; i < 400; i++) {
      const h = app.hijri(addDays(app.today, i));
      if (h.monthIndex === 8 && h.day === 1) return i;
    }
    return null;
  }, [app.today, app.hijri]);
  if (!days) return null;
  return (
    <Card style={{ marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Feather name="moon" size={18} color={th.accent} />
      <View style={{ flex: 1 }}>
        <Body size={13} weight="semi">{t('Ramadan in about {n} days', { n: days })}</Body>
        <Body size={11.5} color={th.muted}>{t('A Taraweeh and Quran tracker appears here during Ramadan.')}</Body>
      </View>
    </Card>
  );
}

function RamadanTracker({ h }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const yearKey = String(h.year);
  const tar = (app.data.taraweeh || {})[yearKey] || {};
  const juz = (app.data.quranJuz || {})[yearKey] || {};
  const nights = 30;
  const toggleT = (n) => app.update((p) => ({ taraweeh: { ...(p.taraweeh || {}), [yearKey]: { ...((p.taraweeh || {})[yearKey] || {}), [n]: !((p.taraweeh || {})[yearKey] || {})[n] } } }));
  const toggleJ = (n) => app.update((p) => ({ quranJuz: { ...(p.quranJuz || {}), [yearKey]: { ...((p.quranJuz || {})[yearKey] || {}), [n]: !((p.quranJuz || {})[yearKey] || {})[n] } } }));
  const tDone = Object.values(tar).filter(Boolean).length;
  const jDone = Object.values(juz).filter(Boolean).length;
  const grid = (count, on, toggle, current, label) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const done = !!on[n];
        const isCur = n === current;
        return (
          <Press
            key={n}
            onPress={() => toggle(n)}
            scaleTo={0.88}
            accessibilityLabel={`${label} ${n}`}
            accessibilityState={{ checked: done }}
            style={[
              { width: 38, height: 38, borderRadius: 11, borderWidth: 1, borderColor: th.line, alignItems: 'center', justifyContent: 'center' },
              isCur && { borderColor: th.accent },
              done && { backgroundColor: th.ok, borderColor: th.ok },
            ]}
          >
            <Body size={12} weight="semi" color={done ? '#fff' : isCur ? th.accent : th.muted}>{t.num(n)}</Body>
          </Press>
        );
      })}
    </View>
  );
  return (
    <View>
      <SectionLabel right={<Label>{t('{n} of {m}', { n: tDone, m: nights })}</Label>}>{t('Taraweeh')}</SectionLabel>
      <Card style={{ padding: 12 }}>{grid(nights, tar, toggleT, h.day, t('Night'))}</Card>
      <SectionLabel right={<Label>{t('{n} of {m}', { n: jDone, m: 30 })}</Label>}>{t('Quran · juz read')}</SectionLabel>
      <Card style={{ padding: 12 }}>
        {grid(30, juz, toggleJ, null, t('Juz'))}
        <View style={{ height: 5, borderRadius: 3, backgroundColor: th.line, marginTop: 12, overflow: 'hidden' }}>
          <View style={{ width: `${(jDone / 30) * 100}%`, height: 5, backgroundColor: th.accent }} />
        </View>
        <Body size={11.5} color={th.muted} style={{ marginTop: 6 }}>
          {jDone >= 30 ? t('Khatm complete. May Allah accept it.') : t('{n} juz to go · about {p} a day to finish by Eid', { n: 30 - jDone, p: Math.max(1, Math.ceil((30 - jDone) / Math.max(1, 30 - h.day + 1))) })}
        </Body>
      </Card>
    </View>
  );
}

function WeekView() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { today, coords } = app;
  const tz = coords.timezone;
  const buf = app.data.safetyBuffer || 0;
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const kept = week.filter((d) => app.data.journalByDay[d.toDateString()]?.fasted).length;
  const rows = Array.from({ length: 7 }, (_, i) => addDays(today, i - 1));
  const nextSunnah = useMemo(() => {
    const out = [];
    for (let i = 1; i < 60 && out.length < 4; i++) {
      const d = addDays(today, i);
      const f = fastingDayInfo(d, app.cal);
      if (f && f.type === 'sunnah') {
        const last = out[out.length - 1];
        if (last && last.reason === f.reason && f.reason === 'white' && Math.round((d - last.end) / 86400000) === 1) last.end = d;
        else out.push({ reason: f.reason, date: d, end: d });
      }
    }
    return out;
  }, [today, app.cal]);
  const reasonTitle = (r) => ({ monday: t('Monday fast'), thursday: t('Thursday fast'), white: t('White Days'), arafah: t('Day of Arafah'), ashura: t('Ashura'), tasua: t('Tasu‘a') }[r] || r);
  const dotColor = (r) => (r === 'white' ? th.wdc : r === 'monday' || r === 'thursday' ? th.sfc : th.occ);

  return (
    <View>
      <SectionLabel right={<Label>{t('{n} kept', { n: kept })}</Label>}>{t('Fasts this week')}</SectionLabel>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {week.map((d) => {
          const on = !!app.data.journalByDay[d.toDateString()]?.fasted;
          const isToday = sameDay(d, today);
          return (
            <Press key={d.toDateString()} onPress={() => nav.openSheet('fastDay', { date: d })} style={{ alignItems: 'center', gap: 4 }} scaleTo={0.9}>
              <View style={[{ width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: th.line, alignItems: 'center', justifyContent: 'center' }, on && { backgroundColor: th.ok, borderColor: th.ok }, isToday && !on && { borderColor: th.accent, borderStyle: 'dashed' }]}>
                {on ? <Feather name="check" size={15} color="#fff" /> : null}
              </View>
              <Body size={10.5} color={isToday ? th.accent : th.muted} weight={isToday ? 'semi' : 'reg'}>{WEEK_SHORT[t.lang === 'bn' ? 'bn' : 'en'][d.getDay()]}</Body>
            </Press>
          );
        })}
      </View>

      <SectionLabel>{t('Seheri & Iftar')}</SectionLabel>
      <Card style={{ paddingVertical: 4 }}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 2 }}>
          <View style={{ flex: 1 }} />
          <Label size={8} style={{ width: 70, textAlign: 'right' }}>{t('Seheri')}</Label>
          <Label size={8} style={{ width: 70, textAlign: 'right' }}>{t('Iftar')}</Label>
        </View>
        {rows.map((d, i) => {
          const tm = app.getDay(d);
          const isToday = sameDay(d, today);
          const f = fastingDayInfo(d, app.cal);
          return (
            <Press key={d.toDateString()} onPress={() => nav.openSheet('fastDay', { date: d })} scaleTo={0.99}>
              <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />
              <View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 }, isToday && { backgroundColor: th.accentSoft }]}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Body size={13} weight={isToday ? 'bold' : 'med'} color={isToday ? th.accent : th.ink}>{shortDate(t.lang, d)}{isToday ? ` · ${t('today')}` : ''}</Body>
                  {f && f.type === 'sunnah' ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor(f.reason) }} /> : null}
                </View>
                <Serif size={14} color={isToday ? th.accent : th.ink} style={{ width: 70, textAlign: 'right' }}>{timeStr(t, addMinutes(tm.Fajr, -buf), tz, true)}</Serif>
                <Serif size={14} color={isToday ? th.accent : th.ink} style={{ width: 70, textAlign: 'right' }}>{timeStr(t, tm.Maghrib, tz, true)}</Serif>
              </View>
            </Press>
          );
        })}
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{t('Seheri ends {n} minutes before Fajr (change it in Settings).', { n: buf })}</Body>

      <SectionLabel>{t('Next Sunnah fasts')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {nextSunnah.map((n, i) => (
          <Row
            key={i}
            first={i === 0}
            label={reasonTitle(n.reason)}
            sub={n.end > n.date ? `${shortDate(t.lang, n.date)} – ${shortDate(t.lang, n.end)}` : shortDate(t.lang, n.date)}
            onPress={() => nav.openSheet('sunnahFast', { reason: n.reason, date: n.date })}
            icon={n.reason === 'white' ? 'circle' : 'sunrise'}
            iconColor={dotColor(n.reason)}
          />
        ))}
      </Card>
    </View>
  );
}

export default function FastingScreen({ tab: initial }) {
  const nav = useNav();
  const t = useT();
  const L = useLayout();
  const now = useNow(1000);
  const [tab, setTab] = useState(initial === 'week' ? 'week' : 'today');
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: L.insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
        <PatternBand height={L.insets.top + 260} />
        <View style={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconBtn name="chevron-left" onPress={nav.pop} label={t('Back')} />
            <Segmented style={{ flex: 1 }} value={tab} onChange={setTab} options={[{ id: 'today', label: t('Today') }, { id: 'week', label: t('Week') }]} />
            <View style={{ width: 38 }} />
          </View>
          <FadeSwitch k={tab} style={{ flex: 0 }}>
            {tab === 'today' ? <TodayView now={now} /> : <WeekView />}
          </FadeSwitch>
        </View>
      </ScrollView>
    </View>
  );
}
