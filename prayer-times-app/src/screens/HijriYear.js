// The whole Hijri year at a glance: 12 months with their Gregorian dates and
// the main occasion in each. Tap a month to open it in the calendar.
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Press, Arabic, IconBtn } from '../ui/kit';
import { useLayout, hijriMonthName, monthShort, monthName, HIJRI_MONTHS_AR } from '../ui/hooks';
import { addDays } from '../lib/prayer';
import { ISLAMIC_EVENTS } from '../data/events';
import { eventTitle } from '../data/eventText';
import { SwipeView, useSlide } from '../ui/swipe';

// First day of `year`'s month 0, found by estimating and then nudging.
export function findYearStart(year, today, hijri) {
  const h = hijri(today);
  const est = Math.round((year - h.year) * 354.367 + (0 - h.monthIndex) * 29.53 - (h.day - 1));
  for (let k = 0; k <= 6; k++) {
    for (const s of [est - k, est + k]) {
      const d = addDays(today, s);
      const hh = hijri(d);
      if (hh.year === year && hh.monthIndex === 0 && hh.day === 1) return d;
    }
  }
  return addDays(today, est);
}

export default function HijriYearScreen({ year: startYear, onPick }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { today, hijri } = app;
  const hToday = hijri(today);
  const [year, setYear] = useState(startYear || hToday.year);
  const { step, style: slideStyle } = useSlide();
  const change = (d) => {
    app.haptic();
    step(d, () => setYear((y) => y + d));
  };

  const months = useMemo(() => {
    const out = [];
    let d = findYearStart(year, today, hijri);
    let cur = null;
    for (let i = 0; i < 400; i++) {
      const h = hijri(d);
      if (h.year !== year && out.length) {
        if (cur) cur.end = addDays(d, -1);
        break;
      }
      if (h.year === year && (!cur || cur.monthIndex !== h.monthIndex)) {
        if (cur) cur.end = addDays(d, -1);
        cur = { monthIndex: h.monthIndex, start: d, end: d };
        out.push(cur);
      }
      d = addDays(d, 1);
    }
    return out;
  }, [year, hijri]);

  const first = months[0]?.start;
  const last = months[months.length - 1]?.end;
  const range = (a, b) => `${t.num(a.getDate())} ${monthShort(t.lang, a.getMonth())} – ${t.num(b.getDate())} ${monthShort(t.lang, b.getMonth())}`;
  const half = (L.width - L.pad * 2 - 8) / 2;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IconBtn name="chevron-left" onPress={nav.pop} label={t('Back')} />
        <Serif size={28} style={{ flex: 1 }}>{t.lang === 'bn' ? `${t.num(year)} হিজরি` : `${year} AH`}</Serif>
        <IconBtn name="chevron-left" onPress={() => change(-1)} label={t('Previous year')} />
        <IconBtn name="chevron-right" onPress={() => change(1)} label={t('Next year')} />
      </View>
      {first && last ? (
        <Body size={12} color={th.muted} style={{ marginTop: 6, marginBottom: 14 }}>
          {`${monthName(t.lang, first.getMonth())} ${t.num(first.getFullYear())} – ${monthName(t.lang, last.getMonth())} ${t.num(last.getFullYear())} · ${app.cal.mode === 'auto' ? t('Moon sighting: auto') : t('Umm al-Qura')}`}
        </Body>
      ) : null}

      <SwipeView onNext={() => change(1)} onPrev={() => change(-1)} style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, slideStyle]}>
        {months.map((mo) => {
          const isNow = today >= mo.start && today <= mo.end;
          const evt = ISLAMIC_EVENTS.filter((e) => e.hijri && e.hijri.day && e.hijri.monthIndex === mo.monthIndex && e.kind !== 'history' && e.kind !== 'custom').sort((a, b) => (b.alert ? 1 : 0) - (a.alert ? 1 : 0) || a.hijri.day - b.hijri.day)[0];
          const evtDate = evt ? addDays(mo.start, evt.hijri.day - 1) : null;
          const daysTo = Math.round((mo.start - today) / 86400000);
          let line = null;
          let lineColor = th.muted;
          let dot = th.occ;
          if (isNow) {
            line = t('Now · day {n}', { n: hToday.day });
            lineColor = th.accent;
            dot = th.accent;
          } else if (mo.monthIndex === 8 && daysTo > 0) {
            line = t('In {n} days', { n: daysTo });
            dot = th.accent;
          } else if (evt) {
            line = `${eventTitle(evt, t.lang).replace(/\s*\(.*\)$/, '')} · ${t.num(evtDate.getDate())} ${monthShort(t.lang, evtDate.getMonth())}`;
          }
          return (
            <Press
              key={mo.monthIndex}
              onPress={() => {
                if (onPick) onPick(addDays(mo.start, 14));
                nav.pop();
              }}
              scaleTo={0.97}
              style={[
                { width: half, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: th.line, backgroundColor: th.soft },
                isNow && { borderColor: th.accent, backgroundColor: th.accentSoft },
                !isNow && mo.monthIndex === 8 && { borderColor: th.accentLine },
              ]}
            >
              <Arabic size={15} color={th.accent} style={{ lineHeight: 24, textAlign: 'left' }}>{HIJRI_MONTHS_AR[mo.monthIndex]}</Arabic>
              <Serif size={15} numberOfLines={1}>{hijriMonthName(t.lang, mo.monthIndex)}</Serif>
              <Body size={11} color={th.muted} style={{ marginTop: 1 }}>{range(mo.start, mo.end)}</Body>
              {line ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
                  <Body size={10.5} weight={isNow ? 'semi' : 'regular'} color={lineColor} numberOfLines={1} style={{ flex: 1 }}>{line}</Body>
                </View>
              ) : null}
            </Press>
          );
        })}
      </SwipeView>
      <Pressable onPress={() => nav.push('importantDays', { year })} style={{ marginTop: 14 }}>
        <Body size={12.5} weight="semi" color={th.accent}>{`${t('All important days this year')} ›`}</Body>
      </Pressable>
      <Body size={11} color={th.faint} style={{ marginTop: 10 }}>{t('Dates follow the moon and may differ by a day from your local announcement.')}</Body>
    </ScrollView>
  );
}
