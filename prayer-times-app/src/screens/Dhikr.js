// Daily dhikr: the list (shown in Ibadah › Daily) and the counter page.
// Counts are kept per day in `dhikrByDay` (synced): a number for most rows,
// and { prayerId: true } for the ones said after each prayer.
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Arabic, Card, Press, Chip, SectionLabel } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout } from '../ui/hooks';
import { nowDate } from '../lib/clock';
import { PRAYER_NAMES, addDays } from '../lib/prayer';
import { DHIKR, DHIKR_GROUPS, PHRASE, PASSAGES, dhikrTotal, dhikrTitle, dhikrGroupNow } from '../data/dhikr';

const NOTE_DIFFER = { en: 'Scholars differ', bn: 'আলেমদের মতভেদ আছে' };

// The prayer a "after each prayer" count belongs to: the latest one that has
// started (before Fajr, last night's Isha).
// The prayer an "after each prayer" count belongs to: the latest one you've
// ticked whose time has started (or the latest started one if none are ticked).
// Before Fajr it's last night's.
function lastPrayer(app, now) {
  const day = dhikrDay(app, now);
  const d = app.getDay(day);
  const started = PRAYER_NAMES.filter((n) => d[n] <= now);
  const ticked = started.filter((n) => app.isPrayed(day, n) || !!((app.data.qadaRecords || {})[day.toDateString()] || {})[PRAYER_NAMES.indexOf(n) + 1]);
  return { day, name: ticked.length ? ticked[ticked.length - 1] : started.length ? started[started.length - 1] : 'Fajr' };
}
// Dhikr days end at Fajr, the same as the prayer day.
export function dhikrDay(app, now = nowDate()) {
  return now < app.getDay(app.today).Fajr ? addDays(app.today, -1) : app.today;
}

function dayRec(data, day) {
  return ((data.dhikrByDay || {})[day.toDateString()]) || {};
}
// Progress of one row: [done, total].
function progressOf(data, d, today) {
  const v = dayRec(data, today)[d.id];
  if (d.perPrayer) return [Object.values(v || {}).filter(Boolean).length, 5];
  return [Math.min(v || 0, dhikrTotal(d)), dhikrTotal(d)];
}

function Ring({ done, total, size = 40, stroke = 3.5, children }) {
  const th = useTheme();
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const f = total ? Math.min(1, done / total) : 0;
  const full = f >= 1;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={th.line} strokeWidth={stroke} fill="none" />
        {f > 0 ? <Circle cx={size / 2} cy={size / 2} r={r} stroke={full ? th.ok : th.accent} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * f} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} /> : null}
      </Svg>
      {children}
    </View>
  );
}

/* -------------------------- the list (Ibadah) -------------------------- */
export function DailyDhikrCard() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const lang = t.lang === 'bn' ? 'bn' : 'en';
  const now = nowDate();
  const day = dhikrDay(app, now);
  const nowGroup = dhikrGroupNow(app.getDay(app.today), now);
  const done = DHIKR.filter((d) => { const [a, b] = progressOf(app.data, d, day); return a >= b; }).length;
  return (
    <View>
      <SectionLabel right={<Label>{t('{n} of {m}', { n: done, m: DHIKR.length })}</Label>}>{t('Daily dhikr')}</SectionLabel>
      {DHIKR_GROUPS.map((g) => {
        const rows = DHIKR.filter((d) => d.group === g.id);
        const isNow = g.id === nowGroup;
        return (
          <View key={g.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              {isNow ? <View style={{ backgroundColor: th.accent, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 1 }}><Body size={9} weight="bold" color={th.bg}>{t('NOW')}</Body></View> : null}
              <Label color={isNow ? th.accent : th.muted}>{g[lang]}</Label>
            </View>
            <Card active={isNow} style={{ paddingVertical: 2 }}>
              {rows.map((d, i) => {
                const [a, b] = progressOf(app.data, d, day);
                const full = a >= b;
                const rec = dayRec(app.data, day)[d.id] || {};
                return (
                  <Press key={d.id} onPress={() => nav.push('dhikr', { id: d.id })} scaleTo={0.99}>
                    {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
                      <Ring done={a} total={b}>
                        {full ? <Feather name="check" size={15} color={th.ok} /> : <Body size={9} color={th.muted}>{`${t.num(a)}/${t.num(b)}`}</Body>}
                      </Ring>
                      <View style={{ flex: 1 }}>
                        <Body size={14} weight="semi">{dhikrTitle(d, t.lang)}</Body>
                        <Body size={11.5} color={th.muted}>{d.sub[lang]}</Body>
                        {d.perPrayer ? (
                          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                            {PRAYER_NAMES.map((n, k) => <View key={n} style={{ width: 16, height: 5, borderRadius: 3, backgroundColor: rec[k + 1] ? th.ok : th.line }} />)}
                          </View>
                        ) : null}
                        <Body size={10.5} color={th.faint} style={{ marginTop: 2 }}>
                          {d.ref}{d.note ? <Body size={10.5} weight="semi" color={th.amber}>{`  ·  ${NOTE_DIFFER[lang]}`}</Body> : null}
                        </Body>
                      </View>
                      <Arabic size={15} color={th.accent} style={{ lineHeight: 28, maxWidth: 110 }} numberOfLines={1}>{PHRASE[d.phrase || d.steps[0].phrase].ar}</Arabic>
                    </View>
                  </Press>
                );
              })}
            </Card>
          </View>
        );
      })}
      <Body size={11} color={th.faint}>{t('Each one shows its hadith. Counts start again each day.')}</Body>
    </View>
  );
}

/* ------------------------------ the counter ------------------------------ */
let Q = null;
const quranText = () => {
  if (!Q) Q = { ar: require('../data/quran/ar.json'), en: require('../data/quran/en.json'), bn: require('../data/quran/bn.json'), tr: require('../data/quran/tr.json') };
  return Q;
};

export default function DhikrScreen({ id }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const lang = t.lang === 'bn' ? 'bn' : 'en';
  const d = DHIKR.find((x) => x.id === id) || DHIKR[0];
  const total = dhikrTotal(d);
  const now = nowDate();
  const [which, setWhich] = useState(() => (d.perPrayer ? lastPrayer(app, now) : null));
  const theDay = dhikrDay(app, now);
  const dayKey = theDay.toDateString();
  const saved = d.perPrayer ? 0 : Math.min(dayRec(app.data, theDay)[d.id] || 0, total);
  const savedRef = useRef(saved);
  const [count, setCount] = useState(saved);
  const [show, setShow] = useState(false);
  const [trans, setTrans] = useState(t.lang === 'bn' ? 'bn' : 'en');
  const [pron, setPron] = useState(true);
  const countRef = useRef(count);
  countRef.current = count;

  const pid = which ? PRAYER_NAMES.indexOf(which.name) + 1 : null;
  const prayerDone = which ? !!(dayRec(app.data, which.day)[d.id] || {})[pid] : false;

  // Save the count (not on every tap: shortly after counting stops, and on leaving).
  // Every tasbih count also adds to the Tasbih total (Quran readings don't).
  const save = (c) => {
    if (d.perPrayer) return;
    const add = d.kind === 'read' ? 0 : Math.max(0, c - savedRef.current);
    savedRef.current = c;
    app.update((p) => {
      const all = { ...(p.dhikrByDay || {}) };
      all[dayKey] = { ...(all[dayKey] || {}), [d.id]: c };
      return { dhikrByDay: all, tasbih: add ? { ...(p.tasbih || {}), total: ((p.tasbih || {}).total || 0) + add } : p.tasbih, dirtyAt: Date.now() };
    });
  };
  useEffect(() => { const h = setTimeout(() => save(count), 600); return () => clearTimeout(h); }, [count]);
  useEffect(() => () => save(countRef.current), []);

  const markPrayer = (on) => {
    const k = which.day.toDateString();
    app.update((p) => {
      const all = { ...(p.dhikrByDay || {}) };
      const day = { ...(all[k] || {}) };
      day[d.id] = { ...(day[d.id] || {}), [pid]: on };
      all[k] = day;
      return { dhikrByDay: all, dirtyAt: Date.now() };
    });
  };

  // Where we are in a sequence.
  let step = null;
  let stepCount = count;
  let stepTotal = total;
  if (d.kind === 'seq') {
    let left = count;
    for (let i = 0; i < d.steps.length; i++) {
      if (left < d.steps[i].n || i === d.steps.length - 1) { step = i; stepCount = Math.min(left, d.steps[i].n); stepTotal = d.steps[i].n; break; }
      left -= d.steps[i].n;
    }
  }
  const finished = count >= total;
  const phrase = PHRASE[d.kind === 'seq' ? d.steps[step].phrase : d.phrase];

  const tap = () => {
    if (finished) return;
    const next = count + 1;
    setCount(next);
    const endStep = d.kind === 'seq' && stepCount + 1 >= stepTotal;
    app.haptic(next >= total || endStep ? 'heavy' : undefined);
    if (next >= total) {
      setTimeout(() => app.haptic('success'), 120);
      if (d.perPrayer) {
        markPrayer(true);
        if (d.kind !== 'read') app.update((p) => ({ tasbih: { ...(p.tasbih || {}), total: ((p.tasbih || {}).total || 0) + total } }));
      }
    }
  };
  const reset = () => { setCount(0); app.haptic('medium'); if (d.perPrayer && prayerDone) markPrayer(false); };

  const size = Math.min(L.width - 100, 240);
  const isRead = d.kind === 'read';
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={d.perPrayer ? t('After {p}', { p: t(which.name) }) : dhikrTitle(d, t.lang)} sub={`${d.perPrayer ? `${dhikrTitle(d, t.lang)} · ` : ''}${d.ref}`} />
      {d.note ? <Body size={11} weight="semi" color={th.amber} style={{ marginTop: -4 }}>{NOTE_DIFFER[lang]}</Body> : null}
      {d.perPrayer ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
          {PRAYER_NAMES.map((n, k) => {
            const doneN = !!(dayRec(app.data, which.day)[d.id] || {})[k + 1];
            return <Chip key={n} label={`${doneN ? '✓ ' : ''}${t(n)}`} active={which.name === n} color={doneN ? th.ok : undefined} onPress={() => { setWhich({ ...which, name: n }); setCount(0); }} />;
          })}
        </View>
      ) : null}
      {d.kind === 'seq' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {d.steps.map((s, i) => {
            const passed = i < step || finished;
            return (
              <View key={i} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: i === step && !finished ? th.accent : th.line, backgroundColor: i === step && !finished ? th.accentSoft : 'transparent' }}>
                <Body size={11.5} weight="semi" color={passed ? th.ok : i === step ? th.accent : th.muted}>{`${passed ? '✓ ' : ''}${PHRASE[s.phrase][lang].replace('…', '')} ${t.num(s.n)}`}</Body>
              </View>
            );
          })}
        </View>
      ) : null}

      <Pressable onPress={tap} style={{ alignItems: 'center', paddingVertical: 18 }} accessibilityRole="button" accessibilityLabel={t('Count')}>
        <Arabic size={phrase.ar.length > 24 ? 22 : 30} color={th.accent} style={{ textAlign: 'center', lineHeight: phrase.ar.length > 24 ? 42 : 54 }}>{phrase.ar}</Arabic>
        <Body size={12.5} color={th.muted} style={{ fontStyle: 'italic', marginBottom: 12 }}>{phrase[lang]}</Body>
        <Ring done={finished && d.perPrayer ? 1 : d.kind === 'seq' ? stepCount : count} total={d.kind === 'seq' ? stepTotal : finished && d.perPrayer ? 1 : total} size={size} stroke={7}>
          {finished || (d.perPrayer && prayerDone && count === 0) ? (
            <>
              <Feather name="check" size={size * 0.22} color={th.ok} />
              <Body size={13} weight="semi" color={th.ok} style={{ marginTop: 4 }}>{t('Done')}</Body>
            </>
          ) : (
            <>
              <Serif bold size={size * 0.27}>{t.num(d.kind === 'seq' ? stepCount : count)}</Serif>
              <Label>{isRead ? t('of {n} times', { n: total }) : t('of {n}', { n: d.kind === 'seq' ? stepTotal : total })}</Label>
            </>
          )}
        </Ring>
        <Body size={12} color={th.muted} style={{ marginTop: 14 }}>{finished ? t('All done for now') : isRead ? t('Tap anywhere after each time you read it') : t('Tap anywhere to count')}</Body>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        {isRead || d.dua ? (
          <Press onPress={() => (isRead ? setShow(!show) : nav.push('dua', { id: d.dua }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99, borderWidth: 1, borderColor: th.accentLine, backgroundColor: th.accentSoft }}>
            <Feather name="book-open" size={15} color={th.accent} />
            <Body size={13} weight="semi" color={th.accent}>{isRead ? (show ? t('Hide the text') : d.passage === 'kursi' ? t('Show the verse') : t('Show the chapters')) : t('Meaning and pronunciation')}</Body>
          </Press>
        ) : null}
        <Press onPress={reset} disabled={!count && !(d.perPrayer && prayerDone)} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99, borderWidth: 1, borderColor: th.line, opacity: count || (d.perPrayer && prayerDone) ? 1 : 0.45 }}>
          <Feather name="rotate-ccw" size={15} color={th.muted} />
          <Body size={13} weight="semi" color={th.muted}>{t('Reset')}</Body>
        </Press>
      </View>

      {isRead && show ? (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip label="বাংলা" active={trans === 'bn'} onPress={() => setTrans('bn')} />
            <Chip label="English" active={trans === 'en'} onPress={() => setTrans('en')} />
            <Chip label={t('Arabic only')} active={trans === 'none'} onPress={() => setTrans('none')} />
            <Chip label={t('Pronunciation')} active={pron} onPress={() => setPron(!pron)} />
          </View>
          {PASSAGES[d.passage].map(([s, a1, a2]) => {
            const q = quranText();
            const ayahs = [];
            for (let a = a1; a <= a2; a++) ayahs.push(a);
            return (
              <Card key={s} style={{ marginTop: 10, padding: 14 }}>
                <Label color={th.accent}>{`${require('../data/quran/surahs.json')[s - 1][2]} · ${t.num(s)}`}</Label>
                {ayahs.map((a) => (
                  <View key={a} style={{ marginTop: 8 }}>
                    <Arabic size={22 * (app.arabicScale || 1)} style={{ textAlign: 'right', lineHeight: 42 * (app.arabicScale || 1) }}>{`${q.ar[s - 1][a - 1]} ﴿${a}﴾`}</Arabic>
                    {pron ? <Body size={12} color={th.accent} style={{ fontStyle: 'italic', marginTop: 2 }}>{q.tr[s - 1][a - 1]}</Body> : null}
                    {trans !== 'none' ? <Body size={13} style={{ marginTop: 3, lineHeight: 19 }}>{q[trans][s - 1][a - 1]}</Body> : null}
                  </View>
                ))}
              </Card>
            );
          })}
          <Body size={10.5} color={th.faint} style={{ marginTop: 8 }}>{t('Bangla: Maulana Muhiuddin Khan · English: Saheeh International · Pronunciation: Tanzil')}</Body>
        </View>
      ) : null}
    </ScrollView>
  );
}
