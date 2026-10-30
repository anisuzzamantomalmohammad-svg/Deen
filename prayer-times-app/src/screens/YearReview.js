// Year in review: one Hijri year of prayers, month by month. Opens from the
// 1 Muharram alert, or from the month report.
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, SectionLabel, IconBtn } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout, hijriMonthName, shortDate } from '../ui/hooks';
import { addDays } from '../lib/prayer';
import { hijriYearStats, rangeStats, hijriMonthRange, streaks } from '../lib/stats';
import { findYearStart } from './HijriYear';

export default function YearReviewScreen({ year: initial }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { today, hijri, data } = app;
  const thisYear = hijri(today).year;
  const [year, setYear] = useState(initial || thisYear - 1);
  const now = new Date();
  const find = (y) => findYearStart(y, today, hijri);
  const s = useMemo(() => hijriYearStats({ year, data, today, now, getDay: app.getDay, hijri, findYearStart: find }), [year, data, today, hijri]);
  const months = useMemo(() => {
    const out = [];
    let d = s.start;
    for (let i = 0; i < 12; i++) {
      const r = hijriMonthRange(d, hijri);
      const m = rangeStats({ from: r.start, days: r.days, data, today, now, getDay: app.getDay });
      out.push({ i: r.monthIndex, pct: m.pct, due: m.due });
      d = addDays(r.start, r.days);
    }
    return out;
  }, [s.start.toDateString(), data, today]);
  const st = streaks(data.completedByDay, today);
  const end = addDays(s.start, s.days - 1);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle
        onBack={nav.pop}
        title={t('Year in review')}
        sub={`${t.num(year)} ${t('AH')} · ${shortDate(t.lang, s.start)} – ${shortDate(t.lang, end)}`}
        right={(
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <IconBtn name="chevron-left" label={t('Previous year')} onPress={() => setYear((y) => y - 1)} />
            <IconBtn name="chevron-right" label={t('Next year')} onPress={() => setYear((y) => Math.min(thisYear, y + 1))} />
          </View>
        )}
      />

      {!s.due ? (
        <Card style={{ padding: 16, marginTop: 12 }}>
          <Body size={13.5}>{t('Nothing logged in this year.')}</Body>
        </Card>
      ) : (
        <>
          <Card active style={{ marginTop: 12, padding: 18, alignItems: 'center' }}>
            <Serif bold size={44} maxScale={1.1}>{`${t.num(s.pct)}%`}</Serif>
            <Body size={13} color={th.muted}>{t('of prayers on time')}</Body>
          </Card>

          <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: th.line, borderRadius: 16, marginTop: 12 }}>
            {[[s.onTime, t('On time'), th.ok], [s.qada, t('Qada'), th.amber], [s.missed, t('Missed'), th.ink]].map(([v, k, c], i) => (
              <View key={k} style={[{ flex: 1, alignItems: 'center', paddingVertical: 12 }, i > 0 && { borderLeftWidth: 1, borderColor: th.line }]}>
                <Serif bold size={22} maxScale={1.12} color={c}>{t.num(v)}</Serif>
                <Label size={8} maxScale={1.12}>{k}</Label>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {[[t.num(s.madeUp), t('Made up')], [t.num(s.fasts), t('Fasts kept')], [t.num(st.best), t('Best streak')]].map(([v, l]) => (
              <Card key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
                <Serif bold size={19} maxScale={1.12}>{v}</Serif>
                <Label size={7.5} maxScale={1.12} numberOfLines={1}>{l}</Label>
              </Card>
            ))}
          </View>

          {s.mostMissed ? (
            <Card style={{ marginTop: 10, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Feather name="target" size={15} color={th.amber} />
              <Body size={13.5} style={{ flex: 1 }}>{t('{name} slipped most this year. Worth an extra reminder next year.', { name: t(s.mostMissed) })}</Body>
            </Card>
          ) : null}

          <SectionLabel>{t('Month by month')}</SectionLabel>
          <Card style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 110 }}>
              {months.map((m) => (
                <View key={m.i} style={{ alignItems: 'center', flex: 1 }}>
                  <Body size={8.5} color={th.muted} maxScale={1}>{m.due ? t.num(m.pct) : ''}</Body>
                  <View style={{ width: 12, height: m.due ? Math.max(4, (m.pct / 100) * 70) : 3, borderRadius: 4, backgroundColor: m.due ? th.accent : th.line, marginTop: 2 }} />
                  <Label size={7} maxScale={1} style={{ marginTop: 4 }} numberOfLines={1}>{t.lang === 'bn' ? t.num(m.i + 1) : hijriMonthName(t.lang, m.i).slice(0, 3)}</Label>
                </View>
              ))}
            </View>
            <Body size={10.5} color={th.faint} style={{ marginTop: 8 }}>{t('Share of prayers on time each month. Grey: not tracked.')}</Body>
          </Card>
        </>
      )}
      <Body size={11} color={th.faint} style={{ marginTop: 14, textAlign: 'center' }}>{t('Only days from your first ticked prayer are counted.')}</Body>
    </ScrollView>
  );
}
