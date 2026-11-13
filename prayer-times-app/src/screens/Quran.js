// Quran reader: the full Quran offline, with Bangla (Muhiuddin Khan) and
// English (Saheeh International). Progress is only what you mark with
// "Read up to here" (nothing is tracked by itself). Keeps saved ayahs and
// notes (in the backup and sync), and shares an ayah as a picture. In
// Ramadan, the para list ticks into the Ramadan tracker.
import React, { useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { nowDate } from '../lib/clock';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Arabic, Card, Press, Input, Segmented, Chip, Tick, PrimaryButton } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout, shortDate } from '../ui/hooks';
import { addDays } from '../lib/prayer';
import { HScroll } from '../ui/swipe';

const SURAHS = require('../data/quran/surahs.json'); // [n, ar, translit, en, bn, type, verses]
let AR = null;
let EN = null;
let BN = null;
const text = () => {
  if (!AR) {
    AR = require('../data/quran/ar.json');
    EN = require('../data/quran/en.json');
    BN = require('../data/quran/bn.json');
  }
  return { AR, EN, BN };
};

// Where each juz starts (surah, ayah).
export const JUZ_START = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];
export const juzOf = (s, a) => {
  let j = 1;
  JUZ_START.forEach(([ss, aa], i) => { if (s > ss || (s === ss && a >= aa)) j = i + 1; });
  return j;
};
export const surahName = (n, lang) => {
  const x = SURAHS[n - 1];
  return x ? (lang === 'bn' ? `${x[2]}` : x[2]) : '';
};

// Progress through the whole Quran.
const CUM = SURAHS.reduce((acc, x, i) => { acc.push((acc[i] || 0) + x[6]); return acc; }, [0]); // ayahs before surah i+1
export const TOTAL_AYAHS = CUM[114];
export const posOf = (s, a) => CUM[s - 1] + a;
const paraEnd = (k) => (k >= 30 ? TOTAL_AYAHS : posOf(JUZ_START[k][0], JUZ_START[k][1]) - 1); // last ayah of para k
const atPos = (p) => { let s = 1; while (s < 114 && CUM[s] < p) s += 1; return [s, Math.max(1, p - CUM[s - 1])]; };
// Finish plan: how many verses are left for today.
export function planToday(plan, pos, today) {
  if (!plan || !plan.days) return null;
  const start = new Date(plan.start);
  const day = Math.max(0, Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - new Date(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000));
  const per = Math.ceil((TOTAL_AYAHS - plan.from) / plan.days);
  const goal = Math.min(TOTAL_AYAHS, plan.from + per * Math.min(plan.days, day + 1));
  const [gs, ga] = atPos(goal);
  return { left: Math.max(0, goal - pos), per, goal, gs, ga, end: addDays(start, plan.days - 1), late: day >= plan.days && pos < TOTAL_AYAHS };
}
const nextAyah = (s, a) => (a < SURAHS[s - 1][6] ? [s, a + 1] : s < 114 ? [s + 1, 1] : null);

export default function QuranScreen({ surah, ayah }) {
  return surah ? <Reader surah={surah} ayah={ayah} /> : <QuranHome />;
}

// The Quran home: progress, shortcuts and the lists. Used as its own screen
// and as the Quran tab in Ibadah.
export function QuranBody() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const [tab, setTab] = useState('surahs');
  const [q, setQ] = useState('');
  const quran = app.data.quran || {};
  const h = app.hijri(app.today);
  const ramadanYear = String(h.monthIndex === 8 ? h.year : h.monthIndex > 8 ? h.year : h.year - 1);
  const juzDone = (app.data.quranJuz || {})[ramadanYear] || {};
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return SURAHS;
    return SURAHS.filter((x) => String(x[0]) === term || x[2].toLowerCase().includes(term) || x[3].toLowerCase().includes(term) || x[4].includes(term) || x[1].includes(term));
  }, [q]);
  const pr = quran.progress;
  const pos = pr ? posOf(pr.s, pr.a) : 0;
  const pct = Math.floor((pos / TOTAL_AYAHS) * 100);
  const next = pr ? nextAyah(pr.s, pr.a) : [1, 1];
  const plan = app.data.quranPlan;
  const pt = planToday(plan, pos, app.today);
  const [planOpen, setPlanOpen] = useState(false);
  const setPlan = (days) => { app.update({ quranPlan: days ? { days, start: nowDate().toISOString(), from: pos } : null }); setPlanOpen(false); };
  const eidDays = h.monthIndex === 8 ? Math.max(1, 30 - h.day + 1) : 0;
  const learnt = Object.values(app.data.namesLearnt || {}).filter(Boolean).length;
  // Short chapters finished in Learn › Read a short chapter show as read here too.
  const readInLearn = ((app.data.learn || {}).read) || {};
  const ramadanTicks = Object.values(juzDone).filter(Boolean).length;
  return (
    <View>
      {/* Progress */}
      <Card active style={{ marginTop: 12, padding: 16 }}>
        <Label size={8.5} color={th.accent}>{t('Your progress')}</Label>
        {pr ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
              <Serif size={30}>{`${t.num(pct)}%`}</Serif>
              <Body size={12} color={th.muted}>{t('of the Quran')}</Body>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: th.line, marginTop: 8, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(1, (pos / TOTAL_AYAHS) * 100)}%`, height: 6, backgroundColor: th.accent }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Body size={11.5} color={th.muted}>{t('Up to {name} {s}:{a} · Part {j}', { name: SURAHS[pr.s - 1][2], s: t.num(pr.s), a: t.num(pr.a), j: t.num(juzOf(pr.s, pr.a)) })}</Body>
              <Body size={11.5} color={th.muted}>{`${t.num(pos.toLocaleString('en-US'))} / ${t.num(TOTAL_AYAHS.toLocaleString('en-US'))}`}</Body>
            </View>
            <View style={{ flexDirection: 'row', gap: 3, marginTop: 12 }}>
              {JUZ_START.map((_, k) => {
                const done = pos >= paraEnd(k + 1);
                const here = !done && juzOf(pr.s, pr.a) === k + 1;
                return <View key={k} style={{ flex: 1, height: 14, borderRadius: 3, backgroundColor: done ? th.accent : here ? th.accentLine : th.line }} />;
              })}
            </View>
            <Body size={10.5} color={th.faint} style={{ marginTop: 4 }}>{t('30 parts (paras) · {n} done', { n: JUZ_START.filter((_, k) => pos >= paraEnd(k + 1)).length })}</Body>
            {next ? <PrimaryButton style={{ marginTop: 12 }} icon="book-open" label={t('Carry on · {s}:{a}', { s: t.num(next[0]), a: t.num(next[1]) })} onPress={() => nav.push('quran', { surah: next[0], ayah: next[1] })} /> : <Body size={13} weight="semi" color={th.ok} style={{ marginTop: 10 }}>{t('You have read the whole Quran. MashaAllah.')}</Body>}
            {pos < TOTAL_AYAHS ? (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: th.line }}>
                {pt && !planOpen ? (
                  <Press onPress={() => setPlanOpen(true)} style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityLabel={t('Finish plan')}>
                    <View style={{ flex: 1 }}>
                      <Label size={8} color={th.accent}>{t('Finish plan')}</Label>
                      <Body size={13.5} weight="semi" color={pt.left ? th.ink : th.ok} style={{ marginTop: 2 }}>{pt.left ? t('Today: {n} verses, to {s}:{a}', { n: t.num(pt.left), s: t.num(pt.gs), a: t.num(pt.ga) }) : t('Today’s reading is done')}</Body>
                      <Body size={11} color={th.muted} style={{ marginTop: 1 }}>{pt.late ? t('The plan’s last day has passed. Tap to set a new one.') : t('Finish on {d}', { d: shortDate(t.lang, pt.end) })}</Body>
                    </View>
                    <Feather name="chevron-right" size={16} color={th.faint} />
                  </Press>
                ) : (
                  <View>
                    <Label size={8} color={th.faint}>{t('Finish the Quran in')}</Label>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {eidDays ? <Chip label={t('By Eid')} active={false} onPress={() => setPlan(eidDays)} /> : null}
                      {[7, 30, 60].map((d) => <Chip key={d} label={t('{n} days', { n: d })} active={!!plan && plan.days === d} onPress={() => setPlan(d)} />)}
                      {plan ? <Chip label={t('Off')} active={false} onPress={() => setPlan(0)} /> : null}
                    </View>
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Serif size={22} style={{ marginTop: 4 }}>{t('Start from Al-Fatihah')}</Serif>
            <Body size={12.5} color={th.muted} style={{ marginTop: 4, lineHeight: 18 }}>{t('Tap a verse where you stop, then “Read up to here”. Your progress shows here.')}</Body>
            <PrimaryButton style={{ marginTop: 12 }} icon="book-open" label={t('Start reading')} onPress={() => nav.push('quran', { surah: 1 })} />
          </>
        )}
      </Card>

      {/* Shortcuts */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Card onPress={() => nav.push('names')} style={{ flex: 1, padding: 12 }}>
          <Arabic size={18} color={th.accent} style={{ lineHeight: 32, textAlign: 'left' }}>الأسماء</Arabic>
          <Body size={14} weight="semi">{t('99 Names')}</Body>
          <Body size={11} color={th.muted} numberOfLines={1}>{t('{n} of 99 learnt', { n: learnt })}</Body>
        </Card>
        <Card onPress={() => setTab('juz')} style={{ flex: 1, padding: 12 }}>
          <Arabic size={18} color={th.accent} style={{ lineHeight: 32, textAlign: 'left' }}>رمضان</Arabic>
          <Body size={14} weight="semi">{t('Ramadan parts')}</Body>
          <Body size={11} color={th.muted} numberOfLines={1}>{t('{n} of 30 · ticks', { n: ramadanTicks })}</Body>
        </Card>
      </View>

      <Segmented style={{ marginTop: 14 }} value={tab} onChange={setTab} options={[{ id: 'surahs', label: t('Chapters') }, { id: 'juz', label: t('Parts') }, { id: 'saved', label: t('Saved') }]} />
      {tab === 'surahs' ? (
        <View>
          <Input value={q} onChangeText={setQ} placeholder={t('Search by name or number')} autoCorrect={false} style={{ marginTop: 10, marginBottom: 4 }} />
          {list.map((x) => (
            <Press key={x[0]} onPress={() => nav.push('quran', { surah: x[0] })} scaleTo={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: th.line }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: (pr && pos >= CUM[x[0]]) || readInLearn[x[0]] ? th.ok : th.accentLine, backgroundColor: (pr && pos >= CUM[x[0]]) || readInLearn[x[0]] ? th.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Body size={12} weight="semi" color={th.accent}>{t.num(x[0])}</Body>
              </View>
              <View style={{ flex: 1 }}>
                <Body size={14.5} weight="semi">{x[2]}</Body>
                {pr && pr.s === x[0] && pos < CUM[x[0]]
                  ? <Body size={11.5} color={th.accent}>{t('Reading · up to {s}:{a}', { s: t.num(pr.s), a: t.num(pr.a) })}</Body>
                  : <Body size={11.5} color={th.muted}>{`${t.lang === 'bn' ? x[4] : x[3]} · ${t('{n} verses', { n: x[6] })}${(pr && pos >= CUM[x[0]]) || readInLearn[x[0]] ? ` · ${t('read')}` : ''}`}</Body>}
              </View>
              <Arabic size={20} color={th.accent} style={{ lineHeight: 34 }}>{x[1]}</Arabic>
            </Press>
          ))}
        </View>
      ) : null}
      {tab === 'juz' ? (
        <View style={{ marginTop: 10 }}>
          {JUZ_START.map(([js, ja], i) => (
            <Card key={i} onPress={() => nav.push('quran', { surah: js, ayah: ja })} style={{ marginBottom: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Serif bold size={18} color={th.accent} style={{ width: 30 }}>{t.num(i + 1)}</Serif>
              <View style={{ flex: 1 }}>
                <Body size={14} weight="semi">{t('Part {n}', { n: i + 1 })}</Body>
                <Body size={11.5} color={th.muted}>
                  {`${SURAHS[js - 1][2]} ${t.num(js)}:${t.num(ja)}`}
                  {pos >= paraEnd(i + 1) ? <Body size={11.5} weight="semi" color={th.accent}>{` · ${t('Read')}`}</Body> : null}
                </Body>
              </View>
              <Press
                onPress={() => app.update((p) => ({ quranJuz: { ...(p.quranJuz || {}), [ramadanYear]: { ...((p.quranJuz || {})[ramadanYear] || {}), [i + 1]: !((p.quranJuz || {})[ramadanYear] || {})[i + 1] } } }))}
                hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: !!juzDone[i + 1] }}
              >
                <Tick done={!!juzDone[i + 1]} />
              </Press>
            </Card>
          ))}
          <Body size={11} color={th.faint} style={{ marginTop: 2 }}>{t('Ticks here are the part ticks of the Ramadan tracker.')}</Body>
        </View>
      ) : null}
      {tab === 'saved' ? (() => {
        const marks = (quran.bookmarks || []).map((k) => k.split(':').map(Number));
        const notes = Object.keys(quran.notes || {}).filter((k) => (quran.notes[k] || '').trim()).map((k) => k.split(':').map(Number));
        const all = [...marks.map(([ss, aa]) => ({ s: ss, a: aa, kind: 'saved' })), ...notes.filter(([ss, aa]) => !marks.some(([x, y]) => x === ss && y === aa)).map(([ss, aa]) => ({ s: ss, a: aa, kind: 'note' }))];
        if (!all.length) return <Body size={13} color={th.muted} style={{ marginTop: 12 }}>{t('Tap the star on a verse or add a note while reading, and it shows here.')}</Body>;
        return (
          <View style={{ marginTop: 10 }}>
            {all.map((item) => (
              <Card key={`${item.s}:${item.a}`} onPress={() => nav.push('quran', { surah: item.s, ayah: item.a })} style={{ marginBottom: 8, padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name={item.kind === 'saved' ? 'star' : 'edit-3'} size={13} color={th.accent} />
                  <Body size={13.5} weight="semi">{`${SURAHS[item.s - 1][2]} ${t.num(item.s)}:${t.num(item.a)}`}</Body>
                </View>
                {(quran.notes || {})[`${item.s}:${item.a}`] ? <Body size={12} color={th.muted} style={{ marginTop: 4 }} numberOfLines={2}>{quran.notes[`${item.s}:${item.a}`]}</Body> : null}
              </Card>
            ))}
          </View>
        );
      })() : null}
      <Body size={10.5} color={th.faint} style={{ marginTop: 14 }}>{t('Bangla: Maulana Muhiuddin Khan · English: Saheeh International')}</Body>
    </View>
  );
}

function QuranHome() {
  const nav = useNav();
  const t = useT();
  const L = useLayout();
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={t('Quran')} arabic="القرآن" />
      <QuranBody />
    </ScrollView>
  );
}

function Reader({ surah, ayah }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const meta = SURAHS[surah - 1];
  const { AR: A, EN: E, BN: B } = text();
  const quran = app.data.quran || {};
  const trans = quran.trans || 'both';
  const [noteFor, setNoteFor] = useState(null);
  const [sel, setSel] = useState(null);
  const [noteText, setNoteText] = useState('');
  const listRef = useRef(null);
  const verses = A[surah - 1].map((ar, i) => ({ n: i + 1, ar, en: E[surah - 1][i], bn: B[surah - 1][i] }));
  const setQ = (patch) => app.update((p) => ({ quran: { ...(p.quran || {}), ...(typeof patch === 'function' ? patch(p.quran || {}) : patch) } }));
  const key = (n) => `${surah}:${n}`;
  const marked = (n) => (quran.bookmarks || []).includes(key(n));
  const toggleMark = (n) => setQ((q) => ({ bookmarks: marked(n) ? (q.bookmarks || []).filter((k) => k !== key(n)) : [...(q.bookmarks || []), key(n)] }));
  // Progress: only what you mark with "Read up to here".
  const pr = quran.progress;
  const prPos = pr ? posOf(pr.s, pr.a) : 0;
  const markHere = (n) => {
    const before = pr || null;
    setQ({ progress: { s: surah, a: n, at: nowDate().toISOString() } });
    setSel(null);
    const p = posOf(surah, n);
    app.setToast({ action: { label: t('Undo'), onPress: () => setQ({ progress: before }) }, message: t('Progress: {n} of {m} verses · {p}%', { n: t.num(p.toLocaleString('en-US')), m: t.num(TOTAL_AYAHS.toLocaleString('en-US')), p: Math.floor((p / TOTAL_AYAHS) * 100) }) });
  };
  const header = (
    <View>
      <ScreenTitle onBack={nav.pop} title={meta[2]} arabic={meta[1]} sub={`${t.lang === 'bn' ? meta[4] : meta[3]} · ${t('{n} verses', { n: meta[6] })} · ${meta[5] === 'meccan' ? t('Makki') : t('Madani')}`} />
      <HScroll style={{ marginTop: 6 }} contentContainerStyle={{ gap: 6 }}>
        {[['both', t('Both')], ['bn', 'বাংলা'], ['en', 'English'], ['none', t('Arabic only')]].map(([id, label]) => (
          <Chip key={id} label={label} active={trans === id} onPress={() => setQ({ trans: id })} />
        ))}
      </HScroll>
      {surah !== 1 && surah !== 9 ? <Arabic size={24 * (app.arabicScale || 1)} color={th.accent} style={{ textAlign: 'center', marginTop: 14, lineHeight: 44 }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Arabic> : null}
    </View>
  );
  return (
    <FlatList
      ref={listRef}
      data={verses}
      extraData={sel}
      keyExtractor={(v) => String(v.n)}
      ListHeaderComponent={header}
      initialNumToRender={ayah ? Math.min(verses.length, ayah + 6) : 10}
      onScrollToIndexFailed={() => {}}
      onLayout={() => { if (ayah && ayah > 1) setTimeout(() => listRef.current && listRef.current.scrollToIndex({ index: ayah - 1, animated: false }), 60); }}
      contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 60 }}
      keyboardShouldPersistTaps="handled"
      ListFooterComponent={(
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }}>
            {surah > 1 ? <PrimaryButton ghost label={`‹ ${SURAHS[surah - 2][2]}`} onPress={() => { nav.pop(); setTimeout(() => nav.push('quran', { surah: surah - 1 }), 260); }} /> : <View />}
            {surah < 114 ? <PrimaryButton ghost label={`${SURAHS[surah][2]} ›`} onPress={() => { nav.pop(); setTimeout(() => nav.push('quran', { surah: surah + 1 }), 260); }} /> : <View />}
          </View>
          <Body size={10.5} color={th.faint} style={{ marginTop: 16, lineHeight: 15, textAlign: 'center' }}>
            {t('Arabic: Uthmani text (The Noble Qur’an Encyclopedia). Bangla: Maulana Muhiuddin Khan. English: Saheeh International. Translations from Tanzil.net.')}
          </Body>
        </View>
      )}
      renderItem={({ item: v }) => {
        const note = (quran.notes || {})[key(v.n)];
        const open = sel === v.n || noteFor === v.n;
        const juzHere = JUZ_START.findIndex(([s, a]) => s === surah && a === v.n);
        return (
          <Press scaleTo={1} haptic={false} accessibilityRole="none" onPress={() => setSel(open ? null : v.n)} style={[{ paddingVertical: 14, borderBottomWidth: 1, borderColor: th.line }, pr && pr.s === surah && pr.a === v.n && { backgroundColor: th.accentSoft, borderLeftWidth: 3, borderLeftColor: th.accent, paddingLeft: 10, borderRadius: 4 }]}>
            {pr && pr.s === surah && pr.a === v.n ? <Label size={8} color={th.accent} style={{ marginBottom: 6 }}>{t('Your progress · {s}:{a}', { s: t.num(surah), a: t.num(v.n) })}</Label> : null}
            {juzHere > 0 ? <Label size={8} color={th.accent} style={{ marginBottom: 6 }}>{t('Part {n} starts', { n: juzHere + 1 })}</Label> : null}
            <Arabic size={23 * (app.arabicScale || 1)} style={{ textAlign: 'right', lineHeight: 44 * (app.arabicScale || 1) }}>{`${v.ar} ﴿${v.n}﴾`}</Arabic>
            {trans === 'both' || trans === 'bn' ? <Body size={13.5} style={{ marginTop: 6, lineHeight: 21 }}>{v.bn}</Body> : null}
            {trans === 'both' || trans === 'en' ? <Body size={13} color={trans === 'both' ? th.muted : th.ink} style={{ marginTop: 6, lineHeight: 20 }}>{v.en}</Body> : null}
            {note ? <Body size={12} color={th.accent} style={{ marginTop: 6 }}>{`✎ ${note}`}</Body> : null}
            {!open && marked(v.n) ? <Feather name="star" size={12} color={th.accent} style={{ marginTop: 6 }} /> : null}
            {open ? <View style={{ flexDirection: 'row', gap: 18, marginTop: 10, alignItems: 'center' }}>
              <Press onPress={() => markHere(v.n)} hitSlop={6} accessibilityLabel={t('Read up to here')} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: pr && pr.s === surah && pr.a === v.n ? th.accent : th.line, backgroundColor: pr && pr.s === surah && pr.a === v.n ? th.accentSoft : 'transparent' }}>
                <Feather name="check" size={13} color={prPos >= posOf(surah, v.n) ? th.accent : th.faint} />
                <Body size={11.5} weight="semi" color={pr && pr.s === surah && pr.a === v.n ? th.accent : th.muted}>{t('Read up to here')}</Body>
              </Press>
              <Body size={11} color={th.faint} style={{ flex: 1, textAlign: 'right' }}>{`${t.num(surah)}:${t.num(v.n)}`}</Body>
              <Press onPress={() => toggleMark(v.n)} hitSlop={8} accessibilityLabel={t('Save')}><Feather name="star" size={16} color={marked(v.n) ? th.accent : th.faint} /></Press>
              <Press onPress={() => { setNoteFor(v.n); setNoteText(note || ''); }} hitSlop={8} accessibilityLabel={t('Note')}><Feather name="edit-3" size={16} color={note ? th.accent : th.faint} /></Press>
              <Press onPress={() => nav.openSheet('shareCard', { arabic: v.ar, en: v.en, bn: v.bn, source: `${t('Quran')} ${surah}:${v.n} · ${meta[2]}`, title: meta[2] })} hitSlop={8} accessibilityLabel={t('Share')}><Feather name="share-2" size={16} color={th.faint} /></Press>
            </View> : null}
            {noteFor === v.n ? (
              <View style={{ marginTop: 8 }}>
                <Input value={noteText} onChangeText={setNoteText} placeholder={t('Your note')} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} maxLength={500} />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <PrimaryButton style={{ flex: 1 }} label={t('Save')} onPress={() => { setQ((q) => ({ notes: { ...(q.notes || {}), [key(v.n)]: noteText.trim() } })); setNoteFor(null); }} />
                  <PrimaryButton ghost style={{ flex: 1 }} label={t('Cancel')} onPress={() => setNoteFor(null)} />
                </View>
              </View>
            ) : null}
          </Press>
        );
      }}
    />
  );
}
