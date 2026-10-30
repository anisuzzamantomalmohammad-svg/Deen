// Month stats for one Hijri month: on time, qada and missed; by prayer;
// week by week; why prayers were late (with tips); recent months.
import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, SectionLabel, Press } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout, hijriMonthName, HIJRI_MONTHS_AR, shortDate, monthShort } from '../ui/hooks';
import { PRAYER_NAMES } from '../lib/prayer';
import { hijriMonthStats, streaks, lastHijriMonths, weeklyStats } from '../lib/stats';
import { REASONS } from '../lib/qada';
import { reasonTips } from '../lib/tips';

function Stack({ a, b, c, total, h = 8 }) {
  const th = useTheme();
  const w = (x) => `${total ? (x / total) * 100 : 0}%`;
  return (
    <View style={{ flex: 1, height: h, borderRadius: h / 2, backgroundColor: th.soft2, overflow: 'hidden', flexDirection: 'row' }}>
      <View style={{ width: w(a), backgroundColor: th.ok }} />
      <View style={{ width: w(b), backgroundColor: th.amber }} />
      <View style={{ width: w(c), backgroundColor: th.faint }} />
    </View>
  );
}

export default function MonthStatsScreen({ date }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { today, hijri } = app;
  const at = date || today;
  const now = new Date();
  const s = useMemo(() => hijriMonthStats({ date: at, data: app.data, today, now, getDay: app.getDay, hijri }), [at.toDateString(), app.data, today, hijri]);
  const st = useMemo(() => streaks(app.data.completedByDay, today), [app.data.completedByDay, today]);
  const hist = useMemo(() => lastHijriMonths({ data: app.data, today, now, getDay: app.getDay, hijri, until: s.range.start > today ? today : at }), [app.data, today, hijri, at.toDateString()]);
  const weeks = useMemo(() => weeklyStats({ data: app.data, today, now, getDay: app.getDay }), [app.data, today]);
  const tips = reasonTips({ reasonsBy: s.reasonsBy, data: app.data, monthKey: `${s.range.year}-${s.range.monthIndex}` });
  let notes = 0;
  for (let i = 0; i < s.range.days; i++) {
    const d = new Date(s.range.start.getFullYear(), s.range.start.getMonth(), s.range.start.getDate() + i);
    if ((app.data.journalByDay[d.toDateString()] || {}).text) notes++;
  }
  const reasonRows = REASONS.map((r) => ({ ...r, n: s.reasons[r.id] || 0 })).filter((r) => r.n);
  const maxR = Math.max(1, ...reasonRows.map((r) => r.n));
  const maxW = Math.max(1, ...weeks.map((w) => w.due));

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={hijriMonthName(t.lang, s.range.monthIndex)} arabic={HIJRI_MONTHS_AR[s.range.monthIndex]} sub={`${t.num(s.range.year)} ${t('AH')} · ${shortDate(t.lang, s.range.start)} – ${shortDate(t.lang, new Date(s.range.start.getFullYear(), s.range.start.getMonth(), s.range.start.getDate() + s.range.days - 1))}`} />

      {!s.tracking ? (
        <Card style={{ padding: 16, marginTop: 10 }}>
          <Body size={13.5}>{t('Nothing logged yet. Tick prayers on the Prayers tab or on any calendar date, and your progress shows up here.')}</Body>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: th.line, borderRadius: 16, marginTop: 12 }}>
        {[[s.onTime, t('On time'), th.ok], [s.qada, t('Qada'), th.amber], [s.missed, t('Missed'), th.ink]].map(([v, k, c], i) => (
          <View key={k} style={[{ flex: 1, alignItems: 'center', paddingVertical: 12 }, i > 0 && { borderLeftWidth: 1, borderColor: th.line }]}>
            <Serif bold size={22} maxScale={1.12} color={c}>{t.num(v)}</Serif>
            <Label size={8} maxScale={1.12}>{k}</Label>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 10 }}><Stack a={s.onTime} b={s.qada} c={s.missed} total={s.due} /></View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {[[t.num(st.current), t('Day streak')], [t.num(st.best), t('Best streak')], [t.num(s.fasts), t('Fasts kept')]].map(([v, l]) => (
          <Card key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
            <Serif bold size={19} maxScale={1.12}>{v}</Serif>
            <Label size={7.5} maxScale={1.12} numberOfLines={1}>{l}</Label>
          </Card>
        ))}
      </View>
      <Body size={10.5} color={th.faint} style={{ marginTop: 6, textAlign: 'center' }}>{t('Streaks count days with all 5 on time')}</Body>

      <SectionLabel>{t('By prayer')}</SectionLabel>
      <Card style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
        {PRAYER_NAMES.map((n) => {
          const p = s.per[n];
          return (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Serif size={14} style={{ width: 66 }}>{t(n)}</Serif>
              <Stack a={p.onTime} b={p.qada} c={p.missed} total={p.due} />
              <Body size={11} color={th.muted} style={{ width: 60, textAlign: 'right' }} numberOfLines={1}>{p.qada ? t('{n} qada', { n: p.qada }) : p.due ? `${t.num(p.onTime)}/${t.num(p.due)}` : '—'}</Body>
            </View>
          );
        })}
      </Card>

      <SectionLabel>{t('Week by week')}</SectionLabel>
      <Card style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 110 }}>
          {weeks.map((w, i) => {
            const h = (x) => (x / maxW) * 80;
            return (
              <View key={i} style={{ alignItems: 'center', width: 40 }}>
                <Body size={9} color={th.muted} numberOfLines={1}>{w.worst ? t(w.worst).slice(0, 4) : ''}</Body>
                <View style={{ width: 18, borderRadius: 5, overflow: 'hidden', marginTop: 2 }}>
                  <View style={{ height: h(w.missed), backgroundColor: th.faint }} />
                  <View style={{ height: h(w.qada), backgroundColor: th.amber }} />
                  <View style={{ height: Math.max(w.due ? 0 : 3, h(w.onTime)), backgroundColor: w.due ? th.ok : th.line }} />
                </View>
                <Label size={7.5} style={{ marginTop: 4 }}>{`${t.num(w.from.getDate())} ${monthShort(t.lang, w.from.getMonth())}`}</Label>
              </View>
            );
          })}
        </View>
        <Body size={10.5} color={th.faint} style={{ marginTop: 8 }}>{t('The name above each week is the prayer that slipped most.')}</Body>
      </Card>

      {reasonRows.length ? (
        <>
          <SectionLabel>{t('Why prayers were late')}</SectionLabel>
          <Card style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 9 }}>
            {reasonRows.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Feather name={r.icon} size={13} color={th.amber} />
                <Body size={13} style={{ width: 62 }}>{t(r.label)}</Body>
                <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: th.soft2 }}>
                  <View style={{ width: `${(r.n / maxR) * 100}%`, height: 7, borderRadius: 4, backgroundColor: th.amber }} />
                </View>
                <Body size={12} color={th.muted} style={{ width: 22, textAlign: 'right' }}>{t.num(r.n)}</Body>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {tips.map((tip) => (
        <Card key={tip.id} active style={{ marginTop: 10, padding: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Feather name="zap" size={15} color={th.accent} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Body size={12} color={th.muted}>{t('{name} was late {n} times because of {r}', { name: t(tip.name), n: tip.n, r: t(REASONS.find((x) => x.id === tip.reason).label).toLowerCase() })}</Body>
              <Body size={13.5} weight="semi" style={{ marginTop: 3 }}>{t(tip.text, { name: t(tip.name) })}</Body>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {tip.action ? (
                  <Press onPress={() => { app.update((p) => ({ ...tip.patch(p), tipsHidden: { ...(p.tipsHidden || {}), [tip.id]: true } })); app.setToast(t('Done')); }} style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 99, backgroundColor: th.accent }}>
                    <Body size={12} weight="semi" color={th.cardInk}>{t(tip.action)}</Body>
                  </Press>
                ) : null}
                <Press onPress={() => app.update((p) => ({ tipsHidden: { ...(p.tipsHidden || {}), [tip.id]: true } }))} style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: th.accentLine }}>
                  <Body size={12} weight="semi" color={th.accent}>{t('Not now')}</Body>
                </Press>
              </View>
            </View>
          </View>
        </Card>
      ))}

      {hist.length > 1 ? (
        <>
          <SectionLabel>{t('Recent months')}</SectionLabel>
          <Card style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 }}>
              {hist.map((h) => (
                <View key={h.start.toISOString()} style={{ alignItems: 'center', gap: 4 }}>
                  <Body size={10} color={th.muted}>{`${t.num(h.pct)}%`}</Body>
                  <View style={{ width: 22, height: Math.max(4, (h.pct / 100) * 66), borderRadius: 6, backgroundColor: h.monthIndex === s.range.monthIndex ? th.accent : th.accentLine }} />
                  <Label size={7.5} numberOfLines={1}>{hijriMonthName(t.lang, h.monthIndex).split(' ')[0].slice(0, 6)}</Label>
                </View>
              ))}
            </View>
            <Body size={10.5} color={th.faint} style={{ marginTop: 8 }}>{t('Share of prayers on time, only for months you tracked.')}</Body>
          </Card>
        </>
      ) : null}

      <Card style={{ marginTop: 14, paddingVertical: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          <Feather name="edit-3" size={16} color={th.accent} />
          <Body size={14} style={{ flex: 1, marginLeft: 10 }}>{t('Days with a note')}</Body>
          <Serif bold size={17}>{t.num(notes)}</Serif>
        </View>
      </Card>
      <Card onPress={() => nav.push('yearReview', { year: s.range.monthIndex === 0 ? s.range.year - 1 : s.range.year })} style={{ marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Feather name="award" size={16} color={th.accent} />
        <Body size={14} style={{ flex: 1 }}>{t('Year in review')}</Body>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 14, textAlign: 'center' }}>{t('Only days from your first ticked prayer are counted.')}</Body>
    </ScrollView>
  );
}
