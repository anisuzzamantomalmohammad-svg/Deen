import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, SectionLabel } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout, monthName, monthShort } from '../ui/hooks';
import { PRAYER_NAMES } from '../lib/prayer';
import { monthStats, streaks, lastMonths } from '../lib/stats';
import { MOODS } from './Sheets';

export default function MonthStatsScreen({ year, month }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { today } = app;
  const y = year ?? today.getFullYear();
  const m = month ?? today.getMonth();
  const now = new Date();
  const s = useMemo(() => monthStats({ year: y, month: m, completedByDay: app.data.completedByDay, journalByDay: app.data.journalByDay, today, now, getDay: app.getDay }), [y, m, app.data]);
  const st = useMemo(() => streaks(app.data.completedByDay, today), [app.data.completedByDay, today]);
  const hist = useMemo(() => lastMonths({ completedByDay: app.data.completedByDay, journalByDay: app.data.journalByDay, today: new Date(y, m + 1, 0) < today ? new Date(y, m + 1, 0) : today, now, getDay: app.getDay }), [y, m, app.data]);
  const moods = {};
  let notes = 0;
  Object.keys(app.data.journalByDay).forEach((k) => {
    const d = new Date(k);
    if (d.getFullYear() !== y || d.getMonth() !== m) return;
    const j = app.data.journalByDay[k];
    if (j.mood) moods[j.mood] = (moods[j.mood] || 0) + 1;
    if (j.text) notes++;
  });
  const maxPct = 100;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={monthName(t.lang, m)} sub={t('Your prayer log for this month')} />

      {!s.tracking ? (
        <Card style={{ padding: 16, marginTop: 10 }}>
          <Body size={13.5}>{t('Nothing logged yet. Tick prayers on the Prayers tab or on any calendar date, and your progress shows up here.')}</Body>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {[
          [s.due ? `${t.num(s.pct)}%` : '—', t('Prayed')],
          [t.num(st.current), t('Day streak')],
          [t.num(st.best), t('Best streak')],
        ].map(([v, l]) => (
          <Card key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
            <Serif bold size={22} maxScale={1.12} numberOfLines={1} adjustsFontSizeToFit>{v}</Serif>
            <Label size={7.5} maxScale={1.12} numberOfLines={1}>{l}</Label>
          </Card>
        ))}
      </View>
      <Body size={10.5} color={th.faint} style={{ marginTop: 6, textAlign: 'center' }}>{t('Streaks count days with all 5 ticked')}</Body>
      {s.due ? <Body size={12} color={th.muted} style={{ marginTop: 8, textAlign: 'center' }}>{t('{a} of {b} prayers since you started tracking', { a: s.prayed, b: s.due })}</Body> : null}

      <SectionLabel>{t('By prayer')}</SectionLabel>
      <Card style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 9 }}>
        {PRAYER_NAMES.map((n) => {
          const [a, b] = s.per[n];
          const pct = b ? (a / b) * 100 : 0;
          return (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Serif size={14} style={{ width: 66 }}>{t(n)}</Serif>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: th.line, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: pct >= 90 ? th.ok : pct >= 60 ? th.accent : th.amber }} />
              </View>
              <Serif bold size={12.5} style={{ width: 44, textAlign: 'right' }}>{b ? `${t.num(a)}/${t.num(b)}` : '—'}</Serif>
            </View>
          );
        })}
      </Card>

      <SectionLabel>{t('Last 5 months')}</SectionLabel>
      <Card style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 }}>
          {hist.map((h) => (
            <View key={h.date.toISOString()} style={{ alignItems: 'center', gap: 4 }}>
              <Body size={10} color={th.muted}>{h.pct === null ? '' : `${t.num(h.pct)}%`}</Body>
              <View style={{ width: 22, height: h.pct === null ? 3 : Math.max(4, (h.pct / maxPct) * 66), borderRadius: 6, backgroundColor: h.pct === null ? th.line : h.date.getMonth() === m ? th.accent : th.accentLine }} />
              <Label size={8}>{monthShort(t.lang, h.date.getMonth())}</Label>
            </View>
          ))}
        </View>
      </Card>

      <SectionLabel>{t('Fasts and journal')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          <Feather name="sunrise" size={16} color={th.accent} />
          <Body size={14} style={{ flex: 1, marginLeft: 10 }}>{t('Fasts kept')}</Body>
          <Serif bold size={17}>{t.num(s.fasts)}</Serif>
        </View>
        <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          <Feather name="edit-3" size={16} color={th.accent} />
          <Body size={14} style={{ flex: 1, marginLeft: 10 }}>{t('Days with a note')}</Body>
          <Serif bold size={17}>{t.num(notes)}</Serif>
        </View>
        {Object.keys(moods).length ? (
          <>
            <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 }}>
              {MOODS.filter((md) => moods[md.id]).map((md) => (
                <View key={md.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: th.line, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Feather name={md.icon} size={12} color={th.accent} />
                  <Body size={12}>{`${t(md.label)} · ${t.num(moods[md.id])}`}</Body>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 14, textAlign: 'center' }}>{t('Only days from your first ticked prayer are counted.')}</Body>
    </ScrollView>
  );
}
