// Ramadan and fasting pieces: the 30-day fast grid, missed fasts (qada
// roza), the before-Eid checklist, six fasts of Shawwal and the Ramadan
// summary on Eid. In Ramadan a past day counts as fasted unless you said
// you didn't fast it; days you didn't fast go on the make-up list.
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press, Tick, SectionLabel } from '../ui/kit';
import { shortDate } from '../ui/hooks';
import { addDays } from '../lib/prayer';
import { nowDate } from '../lib/clock';
import { rangeStats } from '../lib/stats';
import { isPausedDay } from '../lib/qada';

export const FAST_REASONS = [
  { id: 'travelling', icon: 'navigation', label: 'Travelling' },
  { id: 'sick', icon: 'thermometer', label: 'Sick' },
  { id: 'period', icon: 'droplet', label: 'Period' },
  { id: 'other', icon: 'more-horizontal', label: 'Other' },
];

const keyOf = (d) => d.toDateString();
export const isMissedFast = (data, d) => (data.missedFasts || []).some((m) => m.day === keyOf(d)) || !!(data.notFastingByDay || {})[keyOf(d)] || isPausedDay(data, d);

// Said "not fasting" for a day (with a reason): it goes on the make-up list.
export function notFastingPatch(p, d, reason) {
  const k = keyOf(d);
  const list = (p.missedFasts || []).filter((m) => m.day !== k);
  const j = { ...(p.journalByDay || {}) };
  if (j[k]) { j[k] = { ...j[k], fasted: false }; if (!j[k].text) delete j[k]; }
  return { missedFasts: [...list, { day: k, reason: reason || 'other', madeUp: null }], notFastingByDay: { ...(p.notFastingByDay || {}), [k]: reason || 'other' }, journalByDay: j, dirtyAt: Date.now() };
}
// Fasting after all: off the make-up list.
export function fastingPatch(p, d) {
  const k = keyOf(d);
  const nf = { ...(p.notFastingByDay || {}) };
  delete nf[k];
  return { missedFasts: (p.missedFasts || []).filter((m) => m.day !== k), notFastingByDay: nf, dirtyAt: Date.now() };
}

// The Ramadan that a date is in (or the one just before it): first day and length.
export function ramadanOf(hijri, date) {
  let d = date;
  for (let i = 0; i < 70; i++) {
    const h = hijri(d);
    if (h.monthIndex === 8 && h.day === 1) {
      const len = hijri(addDays(d, 29)).monthIndex === 8 ? 30 : 29;
      return { start: d, len, year: h.year };
    }
    d = addDays(d, -1);
  }
  return null;
}

export function ReasonChips({ value, onPick }) {
  const th = useTheme();
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {FAST_REASONS.map((r) => {
        const on = value === r.id;
        return (
          <Press key={r.id} onPress={() => onPick(r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: on ? th.accent : th.line, backgroundColor: on ? th.accentSoft : 'transparent' }}>
            <Feather name={r.icon} size={12} color={on ? th.accent : th.muted} />
            <Body size={12} weight="semi" color={on ? th.accent : th.muted}>{t(r.label)}</Body>
          </Press>
        );
      })}
    </View>
  );
}

/* ----------------------- Ramadan: 30 days of fasts ----------------------- */
export function RamadanFastGrid({ h }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const [pick, setPick] = useState(null);
  const r = ramadanOf(app.hijri, app.today);
  if (!r) return null;
  const days = Array.from({ length: r.len }, (_, i) => addDays(r.start, i));
  const kept = days.filter((d) => d <= app.today && !isMissedFast(app.data, d)).length;
  const missed = days.filter((d) => d <= app.today && isMissedFast(app.data, d)).length;
  const sel = pick != null ? days[pick] : null;
  const selMissed = sel && isMissedFast(app.data, sel);
  return (
    <View>
      <SectionLabel right={<Label>{t('{n} kept · {m} missed', { n: kept, m: missed })}</Label>}>{t('Fasts')}</SectionLabel>
      <Card style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {days.map((d, i) => {
            const future = d > app.today;
            const miss = !future && isMissedFast(app.data, d);
            const isToday = d.getTime() === app.today.getTime();
            return (
              <Press
                key={i}
                disabled={future}
                onPress={() => setPick(pick === i ? null : i)}
                scaleTo={0.88}
                accessibilityLabel={`${t('Day {n}', { n: i + 1 })}${future ? '' : miss ? `, ${t('not fasted')}` : `, ${t('fasted')}`}`}
                style={[
                  { width: 38, height: 38, borderRadius: 11, borderWidth: 1, borderColor: th.line, alignItems: 'center', justifyContent: 'center' },
                  !future && !miss && { backgroundColor: th.accent, borderColor: th.accent },
                  miss && { borderColor: th.red, borderStyle: 'dashed' },
                  isToday && { borderWidth: 2, borderColor: th.ink },
                  pick === i && { borderWidth: 2, borderColor: th.accent },
                  i >= 20 && future && { borderColor: th.accentLine },
                ]}
              >
                <Body size={12} weight="semi" color={!future && !miss ? th.cardInk : miss ? th.red : th.muted}>{t.num(i + 1)}</Body>
              </Press>
            );
          })}
        </View>
        {sel ? (
          <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: th.line, paddingTop: 10 }}>
            <Body size={13} weight="semi">{t('Ramadan day {n} · {date}', { n: pick + 1, date: shortDate(t.lang, sel) })}</Body>
            {selMissed ? (
              <>
                <Body size={12} color={th.muted} style={{ marginTop: 2 }}>{t('Not fasted · on your make-up list')}</Body>
                <Press onPress={() => { app.update((p) => fastingPatch(p, sel)); setPick(null); }} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                  <Body size={12.5} weight="semi" color={th.accent}>{t('I did fast this day')}</Body>
                </Press>
              </>
            ) : (
              <>
                <Body size={12} color={th.muted} style={{ marginTop: 2 }}>{t('Didn’t fast this day? Pick why, and it goes on your make-up list.')}</Body>
                <ReasonChips onPick={(rid) => { app.update((p) => notFastingPatch(p, sel, rid)); setPick(null); }} />
              </>
            )}
          </View>
        ) : (
          <Body size={11} color={th.faint} style={{ marginTop: 10 }}>{t('Gold: fasted. Red dashed: not fasted. Tap a day to change it.')}</Body>
        )}
      </Card>
    </View>
  );
}

/* --------------------------- Before Eid checklist --------------------------- */
const EID_CHECKS = [
  { id: 'fitr', en: 'Give Zakat al-Fitr before the Eid prayer', ref: 'Bukhari 1509', action: 'fitrah' },
  { id: 'dates', en: 'Eat a few dates (an odd number) before going to the Eid prayer', ref: 'Bukhari 953' },
  { id: 'route', en: 'Go to the Eid prayer one way and come back another', ref: 'Bukhari 986' },
];
export function BeforeEidChecklist({ h }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const y = String(h.year);
  const checks = (app.data.ramadanChecks || {})[y] || {};
  const done = (c) => (c.id === 'fitr' ? !!(app.data.zakatFitrDone || {})[h.year] : !!checks[c.id]);
  const flip = (c) => app.update((p) => (c.id === 'fitr'
    ? { zakatFitrDone: { ...(p.zakatFitrDone || {}), [h.year]: !(p.zakatFitrDone || {})[h.year] }, dirtyAt: Date.now() }
    : { ramadanChecks: { ...(p.ramadanChecks || {}), [y]: { ...((p.ramadanChecks || {})[y] || {}), [c.id]: !((p.ramadanChecks || {})[y] || {})[c.id] } }, dirtyAt: Date.now() }));
  return (
    <View>
      <SectionLabel>{t('Before Eid')}</SectionLabel>
      <Card style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
        {EID_CHECKS.map((c, i) => (
          <View key={c.id} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }, i > 0 && { borderTopWidth: 1, borderColor: th.line }]}>
            <Press onPress={() => flip(c)} hitSlop={8}><Tick done={done(c)} /></Press>
            <View style={{ flex: 1 }}>
              <Body size={13.5} weight="semi">{t(c.en)}</Body>
              <Body size={11} weight="semi" color={th.accent}>{c.ref}</Body>
            </View>
            {c.action ? (
              <Press onPress={() => nav.push('charity', { tab: 'fitrah' })} hitSlop={6}>
                <Body size={12} weight="semi" color={th.accent}>{`${t('Work it out')} ›`}</Body>
              </Press>
            ) : null}
          </View>
        ))}
        <Press onPress={() => nav.push('guide', { id: 'eid' })} style={{ borderTopWidth: 1, borderColor: th.line, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Feather name="book-open" size={16} color={th.accent} style={{ width: 22, textAlign: 'center' }} />
          <Body size={13.5} weight="semi" style={{ flex: 1 }}>{t('How to pray the Eid prayer')}</Body>
          <Feather name="chevron-right" size={16} color={th.faint} />
        </Press>
      </Card>
    </View>
  );
}

/* ---------------------------- Missed fasts ---------------------------- */
export function MissedFastsCard() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const [all, setAll] = useState(false);
  const list = (app.data.missedFasts || []).slice().sort((a, b) => new Date(a.day) - new Date(b.day));
  if (!list.length) return null;
  const owed = list.filter((m) => !m.madeUp);
  const shown = all ? list : owed.slice(0, 5);
  const mark = (m) => app.update((p) => ({ missedFasts: (p.missedFasts || []).map((x) => (x.day === m.day ? { ...x, madeUp: x.madeUp ? null : keyOf(app.today) } : x)), dirtyAt: Date.now() }));
  const label = (m) => {
    const d = new Date(m.day);
    const h = app.hijri(d);
    const r = FAST_REASONS.find((x) => x.id === m.reason);
    return { title: h.monthIndex === 8 ? t('Ramadan day {n}, {y}', { n: h.day, y: h.year }) : shortDate(t.lang, d), sub: [shortDate(t.lang, d), r ? t(r.label) : null].filter(Boolean).join(' · ') };
  };
  return (
    <View>
      <SectionLabel right={<Label color={owed.length ? th.red : th.ok}>{owed.length ? t('{n} to make up', { n: owed.length }) : t('All made up')}</Label>}>{t('Missed fasts')}</SectionLabel>
      <Card style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
        {shown.map((m, i) => {
          const l = label(m);
          return (
            <View key={m.day} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderColor: th.line }]}>
              <Press onPress={() => mark(m)} hitSlop={8} accessibilityLabel={t('Made up')}><Tick done={!!m.madeUp} /></Press>
              <View style={{ flex: 1 }}>
                <Body size={13.5} weight="semi" color={m.madeUp ? th.muted : th.ink}>{l.title}</Body>
                <Body size={11} color={th.muted}>{m.madeUp ? t('Made up {date}', { date: shortDate(t.lang, new Date(m.madeUp)) }) : l.sub}</Body>
              </View>
            </View>
          );
        })}
        {!shown.length ? <Body size={12.5} color={th.muted} style={{ paddingVertical: 10 }}>{t('All made up. May Allah accept them.')}</Body> : null}
        {list.length > shown.length || all ? (
          <Press onPress={() => setAll(!all)} style={{ borderTopWidth: 1, borderColor: th.line, paddingVertical: 10 }}>
            <Body size={12.5} weight="semi" color={th.accent}>{all ? t('Show fewer') : t('Show all {n}', { n: list.length })}</Body>
          </Press>
        ) : null}
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 6, lineHeight: 15 }}>{t('Tick a day once you’ve made it up. Make up one fast for each day missed (Quran 2:184).')}</Body>
    </View>
  );
}

/* -------------------------- Six fasts of Shawwal -------------------------- */
export function ShawwalCard() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const h = app.hijri(app.today);
  if (h.monthIndex !== 9) return null;
  let done = 0;
  for (let i = 0; i <= h.day - 2; i++) if ((app.data.journalByDay[addDays(app.today, -i).toDateString()] || {}).fasted) done++;
  done = Math.min(6, done);
  let left = 0;
  for (let i = 1; i <= 30; i++) { if (app.hijri(addDays(app.today, i)).monthIndex !== 9) break; left++; }
  return (
    <View>
      <SectionLabel right={<Label>{t('{n} of 6', { n: done })}</Label>}>{t('Six fasts of Shawwal')}</SectionLabel>
      <Card active style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: th.accent, backgroundColor: i < done ? th.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {i < done ? <Feather name="check" size={14} color={th.cardInk} /> : <Body size={11} weight="semi" color={th.accent}>{t.num(i + 1)}</Body>}
            </View>
          ))}
        </View>
        <Body size={12.5} color={th.muted} style={{ marginTop: 10, textAlign: 'center', lineHeight: 18 }}>
          {done >= 6 ? t('All six done. Masha Allah.') : h.day === 1 ? t('Fasting is not allowed on Eid day. Start from tomorrow.') : t('{n} days of Shawwal left. Tick “I’m fasting today” above on each fast.', { n: left })}
        </Body>
        <Body size={11} color={th.accent} weight="semi" style={{ marginTop: 6, textAlign: 'center' }}>{t('Like fasting for a lifetime (Muslim 1164)')}</Body>
      </Card>
    </View>
  );
}

/* ---------------------------- Ramadan summary ---------------------------- */
export function useRamadanSummary() {
  const app = useApp();
  return useMemo(() => {
    const r = ramadanOf(app.hijri, addDays(app.today, -1));
    if (!r) return null;
    const days = Array.from({ length: r.len }, (_, i) => addDays(r.start, i));
    const kept = days.filter((d) => d < app.today && !isMissedFast(app.data, d)).length;
    const y = String(r.year);
    const tar = Object.values((app.data.taraweeh || {})[y] || {}).filter(Boolean).length;
    const juz = Object.values((app.data.quranJuz || {})[y] || {}).filter(Boolean).length;
    const st = rangeStats({ from: r.start, days: r.len, data: app.data, today: app.today, now: nowDate(), getDay: app.getDay });
    return { year: r.year, len: r.len, kept, tar, juz, pct: st.due ? st.pct : null };
  }, [app.today, app.data, app.hijri]);
}

export function RamadanSummaryCard({ style }) {
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const s = useRamadanSummary();
  if (!s) return null;
  const rows = [
    [t('Fasts kept'), t('{n} of {m}', { n: s.kept, m: s.len })],
    [t('Taraweeh'), t('{n} nights', { n: s.tar })],
    [t('Quran'), t('{n} of 30 parts', { n: s.juz })],
    s.pct != null ? [t('Prayers on time'), `${t.num(s.pct)}%`] : null,
  ].filter(Boolean);
  const share = () => {
    const lines = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    nav.openSheet('shareCard', { title: t('Ramadan {y} AH', { y: s.year }), arabic: 'عِيدٌ مُبَارَكٌ', en: lines, source: t('My Ramadan · Deen') });
  };
  return (
    <Card active style={[{ padding: 16, borderColor: th.accent }, style]}>
      <Label size={8} color={th.accent}>{t('Eid Mubarak · your Ramadan {y}', { y: s.year })}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {rows.map(([k, v]) => (
          <View key={k} style={{ width: '50%', paddingVertical: 6 }}>
            <Serif size={18}>{v}</Serif>
            <Body size={11} color={th.muted}>{k}</Body>
          </View>
        ))}
      </View>
      <Body size={12} color={th.muted} style={{ marginTop: 4 }}>{t('May Allah accept it from you.')}</Body>
      <Press onPress={share} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' }}>
        <Feather name="share-2" size={14} color={th.accent} />
        <Body size={12.5} weight="semi" color={th.accent}>{t('Share as a picture')}</Body>
      </Press>
    </Card>
  );
}
