// Learn: the Arabic path (letters first) and simple kids games.
// No pictures of people or animals, no music. Progress is kept in `learn`
// (backed up and synced).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Arabic, Card, Press, Segmented, PrimaryButton, Tick } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout } from '../ui/hooks';
import {
  LETTERS, letterForms, letterName, JOIN_WORDS, WORDS, SHORT_SURAHS, MATCH_DUAS, STEP_SETS, GAMES, LESSONS, shuffle,
} from '../data/learnData';
import { DUAS } from '../data/duas';
import { guideById } from '../data/guides';
import { NAMES } from '../data/names99';
import { QURAN_CREDIT } from '../data/eventQuran';

const SURAHS = require('../data/quran/surahs.json'); // [n, ar, translit, en, bn, type, verses]
let Q = null;
const quran = () => {
  if (!Q) Q = { ar: require('../data/quran/ar.json'), en: require('../data/quran/en.json'), bn: require('../data/quran/bn.json') };
  return Q;
};

const count = (o) => Object.values(o || {}).filter(Boolean).length;
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const arNum = (n) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[d]);
const surahTitle = (n, lang) => {
  const x = SURAHS[n - 1];
  return x ? `${x[2]} · ${lang === 'bn' ? x[4] : x[3]}` : '';
};

function useLearn() {
  const app = useApp();
  const lr = app.data.learn || {};
  const set = (key, k, v) => app.update((p) => {
    const l = p.learn || {};
    return { learn: { ...l, [key]: { ...(l[key] || {}), [k]: v } } };
  });
  return [lr, set];
}

function Page({ title, sub, children, right }) {
  const nav = useNav();
  const L = useLayout();
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={title} sub={sub} right={right} />
      <View style={{ height: 8 }} />
      {children}
    </ScrollView>
  );
}

/* ============================== Learn home ============================== */
export default function LearnScreen({ tab: tab0 }) {
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const [lr] = useLearn();
  const [tab, setTab] = useState(tab0 || 'arabic');
  const games = lr.games || {};
  const prog = {
    letters: [count(lr.letters), LETTERS.length],
    join: [count(lr.join), JOIN_WORDS.length],
    words: [count(lr.words), WORDS.length],
    read: [count(lr.read), SHORT_SURAHS.length],
    memorise: [count(lr.mem), SHORT_SURAHS.length],
  };
  const bestLine = (id) => {
    const b = (k, n) => (games[k] != null ? `${t.num(games[k])}/${t.num(n)}` : null);
    if (id === 'steps') {
      const w = Math.max(games['steps:wudu:easy'] ?? -1, games['steps:wudu:hard'] ?? -1);
      const s = Math.max(games['steps:salah:easy'] ?? -1, games['steps:salah:hard'] ?? -1);
      const parts = [w >= 0 ? `${t('Wudu')} ${t.num(w)}/${t.num(STEP_SETS.wudu.steps.length)}` : null, s >= 0 ? `${t('Salah')} ${t.num(s)}/${t.num(STEP_SETS.salah.steps.length)}` : null].filter(Boolean);
      return parts.length ? `${t('Best')} · ${parts.join(' · ')}` : null;
    }
    const tot = id === 'match' ? [3, 6] : [10, 10];
    const parts = [b(`${id}:easy`, tot[0]) ? `${t('Easy')} ${b(`${id}:easy`, tot[0])}` : null, b(`${id}:hard`, tot[1]) ? `${t('Harder')} ${b(`${id}:hard`, tot[1])}` : null].filter(Boolean);
    return parts.length ? `${t('Best')} · ${parts.join(' · ')}` : null;
  };
  return (
    <Page title={t('Learn')} sub={t('Arabic letters · Kids games')}>
      <Segmented value={tab} onChange={setTab} options={[{ id: 'arabic', label: t('Arabic') }, { id: 'kids', label: t('Kids games') }]} />
      {tab === 'arabic' ? (
        <View style={{ marginTop: 14 }}>
          <Body size={12.5} color={th.muted} style={{ marginBottom: 10, lineHeight: 18 }}>{t('Start with the letters. Each step builds on the one before.')}</Body>
          {LESSONS.map((x, i) => {
            const [n, m] = prog[x.id];
            const full = n >= m;
            return (
              <Card key={x.id} onPress={() => nav.push('lesson', { id: x.id })} style={{ marginBottom: 8, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: th.accentLine, alignItems: 'center', justifyContent: 'center' }, full && { backgroundColor: th.ok, borderColor: th.ok }]}>
                  {full ? <Feather name="check" size={15} color="#fff" /> : <Body size={13} weight="bold" color={th.accent}>{t.num(i + 1)}</Body>}
                </View>
                <View style={{ flex: 1 }}>
                  <Body size={14} weight="semi">{t(x.en)}</Body>
                  <Body size={11.5} color={th.muted}>{t(x.sub)}</Body>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: th.line, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.round((n / m) * 100)}%`, height: 4, backgroundColor: full ? th.ok : th.accent }} />
                    </View>
                    <Body size={10.5} color={th.faint}>{`${t.num(n)}/${t.num(m)}`}</Body>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={th.faint} />
              </Card>
            );
          })}
        </View>
      ) : (
        <View style={{ marginTop: 14 }}>
          <Body size={12.5} color={th.muted} style={{ marginBottom: 10, lineHeight: 18 }}>{t('Simple games to learn by playing. Easy is for younger kids, Harder for older kids.')}</Body>
          {GAMES.map((g) => {
            const best = bestLine(g.id);
            return (
              <Card key={g.id} onPress={() => nav.push('game', { id: g.id })} style={{ marginBottom: 8, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  {g.ar ? <Arabic size={20} color={th.accent} style={{ lineHeight: 32 }}>{g.ar}</Arabic> : <Feather name={g.icon} size={17} color={th.accent} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Body size={14.5} weight="semi">{t(g.en)}</Body>
                  <Body size={11.5} color={th.muted}>{t(g.sub)}</Body>
                  {best ? <Body size={11} weight="semi" color={th.ok} style={{ marginTop: 3 }}>{best}</Body> : null}
                </View>
                <Feather name="play-circle" size={20} color={th.accent} />
              </Card>
            );
          })}
        </View>
      )}
    </Page>
  );
}

/* ================================ Lessons ================================ */
export function LessonScreen({ id }) {
  if (id === 'join') return <JoinLesson />;
  if (id === 'words') return <WordsLesson />;
  if (id === 'read') return <SurahLesson mode="read" />;
  if (id === 'memorise') return <SurahLesson mode="memorise" />;
  return <LettersLesson />;
}

const FORM_LABELS = ['Alone', 'Start', 'Middle', 'End'];

function LettersLesson() {
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const [lr, set] = useLearn();
  const [i, setI] = useState(0);
  const [quiz, setQuiz] = useState(null); // null | 'on' | {score}
  const seen = lr.letters || {};
  useEffect(() => { if (!seen[i]) set('letters', i, true); }, [i]);
  const l = LETTERS[i];
  const forms = letterForms(l);
  const cell = Math.floor((L.width - L.pad * 2 - 6 * 6) / 7);
  const questions = useMemo(() => {
    if (quiz !== 'on') return [];
    const pool = Object.keys(seen).length >= 4 ? LETTERS.filter((_, k) => seen[k]) : LETTERS;
    return shuffle(pool).slice(0, 5).map((x) => {
      const others = shuffle(LETTERS.filter((y) => y !== x && letterName(y, t.lang) !== letterName(x, t.lang))).slice(0, 3);
      return {
        ask: t('Which one is {name}?', { name: letterName(x, t.lang) }),
        prompt: <Serif size={30} color={th.accent}>{letterName(x, t.lang)}</Serif>,
        answer: x.ar,
        options: shuffle([x, ...others]).map((y) => ({ key: y.ar, node: <Arabic size={34} style={{ lineHeight: 58 }}>{y.ar}</Arabic> })),
      };
    });
  }, [quiz]);
  if (quiz === 'on') {
    return (
      <Page title={t('Quick check')} sub={t('Letter shapes')}>
        <Quiz questions={questions} grid onDone={(s) => setQuiz({ score: s })} />
      </Page>
    );
  }
  if (quiz && quiz.score != null) {
    return (
      <Page title={t('Quick check')} sub={t('Letter shapes')}>
        <Result score={quiz.score} total={5} onAgain={() => setQuiz('on')} onBack={() => setQuiz(null)} backLabel={t('Back to the letters')} />
      </Page>
    );
  }
  return (
    <Page title={t('Letter shapes')} sub={t('{n} of {m} seen', { n: count(seen), m: LETTERS.length })}>
      <Card active style={{ padding: 18, alignItems: 'center' }}>
        <Arabic size={70} color={th.accent} style={{ lineHeight: 118 }}>{l.ar}</Arabic>
        <Serif size={22}>{letterName(l, t.lang)}</Serif>
        {t.lang === 'bn' ? <Body size={12} color={th.muted}>{l.en}</Body> : null}
        <View style={{ flexDirection: 'row-reverse', marginTop: 14, alignSelf: 'stretch' }}>
          {forms.map((f, k) => (
            <View key={k} style={{ flex: 1, alignItems: 'center' }}>
              <Arabic size={32} style={{ lineHeight: 58 }}>{f}</Arabic>
              <Label>{t(FORM_LABELS[k])}</Label>
            </View>
          ))}
        </View>
        {l.join === false ? <Body size={11.5} color={th.muted} style={{ marginTop: 10, textAlign: 'center' }}>{t('This letter never joins the letter after it.')}</Body> : null}
      </Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <NavBtn icon="arrow-left" label={t('Previous')} onPress={() => setI(i > 0 ? i - 1 : LETTERS.length - 1)} />
        <Body size={12} color={th.faint} style={{ alignSelf: 'center' }}>{`${t.num(i + 1)} / ${t.num(LETTERS.length)}`}</Body>
        <NavBtn icon="arrow-right" label={t('Next')} right onPress={() => setI(i < LETTERS.length - 1 ? i + 1 : 0)} />
      </View>
      <Label style={{ marginTop: 18, marginBottom: 8 }}>{t('All letters · right to left')}</Label>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>
        {LETTERS.map((x, k) => (
          <Press key={x.ar} onPress={() => setI(k)} scaleTo={0.94} accessibilityLabel={x.en} style={{ width: cell, height: cell, borderRadius: 10, borderWidth: k === i ? 1.5 : 1, borderColor: k === i ? th.accent : th.line, backgroundColor: k === i ? th.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <Arabic size={Math.min(22, cell * 0.5)} color={k === i ? th.accent : th.ink} style={{ lineHeight: Math.min(38, cell * 0.85) }}>{x.ar}</Arabic>
            {seen[k] && k !== i ? <View style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: th.ok }} /> : null}
          </Press>
        ))}
      </View>
      <PrimaryButton style={{ marginTop: 16 }} icon="check-square" label={t('Quick check · 5 questions')} onPress={() => setQuiz('on')} />
    </Page>
  );
}

// Shape of a letter inside a word: alone, start, middle or end.
function shapeIn(parts, p) {
  const joins = (ch) => (LETTERS.find((x) => x.ar === ch) || {}).join !== false;
  const prev = p > 0 && joins(parts[p - 1]);
  const next = p < parts.length - 1 && joins(parts[p]);
  const T = 'ـ';
  return `${prev ? T : ''}${parts[p]}${next ? T : ''}`;
}

function JoinLesson() {
  const th = useTheme();
  const t = useT();
  const [lr, set] = useLearn();
  const [i, setI] = useState(0);
  const [joined, setJoined] = useState(false);
  const w = JOIN_WORDS[i];
  const go = (k) => { setI(k); setJoined(false); };
  const join = () => { setJoined(true); if (!(lr.join || {})[i]) set('join', i, true); };
  return (
    <Page title={t('Joining letters')} sub={t('{n} of {m} done', { n: count(lr.join), m: JOIN_WORDS.length })}>
      <Card style={{ padding: 12 }}>
        <Body size={12} color={th.muted} style={{ lineHeight: 18 }}>{t('Most letters join the letter after them and change shape a little. These six never join the letter after them:')}</Body>
        <Arabic size={22} color={th.accent} style={{ textAlign: 'center', lineHeight: 40 }}>ا  د  ذ  ر  ز  و</Arabic>
      </Card>
      <Card active style={{ marginTop: 12, padding: 18, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          {w.parts.map((p, k) => (
            <React.Fragment key={k}>
              {k > 0 ? <Body size={16} color={th.faint}>+</Body> : null}
              <View style={{ alignItems: 'center' }}>
                <Arabic size={34} style={{ lineHeight: 60 }}>{joined ? shapeIn(w.parts, k) : p}</Arabic>
              </View>
            </React.Fragment>
          ))}
        </View>
        {joined ? (
          <>
            <Feather name="arrow-down" size={18} color={th.faint} style={{ marginVertical: 4 }} />
            <Arabic size={56} color={th.accent} style={{ lineHeight: 96 }}>{w.word}</Arabic>
            <Serif size={20}>{w.tr}</Serif>
          </>
        ) : (
          <PrimaryButton style={{ marginTop: 14, alignSelf: 'stretch' }} icon="link-2" label={t('Join them')} onPress={join} />
        )}
      </Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <NavBtn icon="arrow-left" label={t('Previous')} onPress={() => go(i > 0 ? i - 1 : JOIN_WORDS.length - 1)} />
        <Body size={12} color={th.faint} style={{ alignSelf: 'center' }}>{`${t.num(i + 1)} / ${t.num(JOIN_WORDS.length)}`}</Body>
        <NavBtn icon="arrow-right" label={t('Next')} right onPress={() => go(i < JOIN_WORDS.length - 1 ? i + 1 : 0)} />
      </View>
    </Page>
  );
}

function WordsLesson() {
  const th = useTheme();
  const t = useT();
  const [lr, set] = useLearn();
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const known = lr.words || {};
  const w = WORDS[i];
  const go = (k) => { setI(k); setOpen(false); };
  const next = () => go(i < WORDS.length - 1 ? i + 1 : 0);
  return (
    <Page title={t('Short words')} sub={t('{n} of {m} known', { n: count(known), m: WORDS.length })}>
      <Card active onPress={() => setOpen(!open)} style={{ padding: 22, alignItems: 'center', minHeight: 220, justifyContent: 'center' }}>
        <Arabic size={56} color={th.accent} style={{ lineHeight: 100 }}>{w.ar}</Arabic>
        {open ? (
          <>
            <Serif size={22}>{w.tr}</Serif>
            <Body size={15} color={th.muted} style={{ marginTop: 4, textAlign: 'center' }}>{w.en}</Body>
            {t.lang === 'bn' ? <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{t('English meaning · Bangla not added yet')}</Body> : null}
          </>
        ) : (
          <Body size={12} color={th.faint} style={{ marginTop: 6 }}>{t('Read it, then tap to check')}</Body>
        )}
        {known[i] ? <View style={{ position: 'absolute', top: 12, right: 12 }}><Tick done size={20} /></View> : null}
      </Card>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <PrimaryButton ghost style={{ flex: 1 }} label={t('Again later')} onPress={() => { if (known[i]) set('words', i, false); next(); }} />
        <PrimaryButton style={{ flex: 1 }} icon="check" label={t('I know it')} onPress={() => { set('words', i, true); next(); }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16, justifyContent: 'center' }}>
        {WORDS.map((x, k) => (
          <Press key={k} onPress={() => go(k)} hitSlop={6} accessibilityLabel={x.tr} style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: k === i ? th.accent : known[k] ? th.ok : th.line, backgroundColor: known[k] ? th.ok : 'transparent' }} />
        ))}
      </View>
    </Page>
  );
}

// Read a short surah ayah by ayah, or memorise it by hiding words.
function SurahLesson({ mode }) {
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const [lr, set] = useLearn();
  const [s, setS] = useState(null);
  const key = mode === 'read' ? 'read' : 'mem';
  const done = lr[key] || {};
  const title = mode === 'read' ? t('Read a short chapter') : t('Memorise');
  if (s) {
    return mode === 'read'
      ? <ReadSurah s={s} onBack={() => setS(null)} onDone={() => { set('read', s, true); setS(null); }} />
      : <MemoriseSurah s={s} onBack={() => setS(null)} done={!!done[s]} onToggle={() => set('mem', s, !done[s])} />;
  }
  return (
    <Page title={title} sub={t('{n} of {m} done', { n: count(done), m: SHORT_SURAHS.length })}>
      <Body size={12.5} color={th.muted} style={{ marginBottom: 10, lineHeight: 18 }}>
        {mode === 'read' ? t('Start with Al-Fatiha. Read each verse, then check the reading and the meaning.') : t('Recite from memory. Hide some words, then all of them. Tap a hidden word to peek.')}
      </Body>
      {SHORT_SURAHS.map((n) => (
        <Card key={n} onPress={() => setS(n)} style={{ marginBottom: 8, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Tick done={!!done[n]} size={20} />
          <View style={{ flex: 1 }}>
            <Body size={14} weight="semi">{surahTitle(n, t.lang)}</Body>
            <Body size={11.5} color={th.muted}>{t('{n} verses', { n: SURAHS[n - 1][6] })}</Body>
          </View>
          <Arabic size={18} color={th.accent} style={{ lineHeight: 32 }}>{SURAHS[n - 1][1]}</Arabic>
        </Card>
      ))}
      <Press onPress={() => nav.push('quran')} style={{ marginTop: 6, alignSelf: 'center', padding: 8 }}>
        <Body size={12.5} weight="semi" color={th.accent}>{t('Open the full Quran')}</Body>
      </Press>
    </Page>
  );
}

const Bismillah = ({ th }) => <Arabic size={22} color={th.accent} style={{ textAlign: 'center', lineHeight: 40, marginBottom: 6 }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Arabic>;

function SubPage({ title, sub, onBack, children }) {
  const L = useLayout();
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={onBack} title={title} sub={sub} />
      <View style={{ height: 8 }} />
      {children}
    </ScrollView>
  );
}

function ReadSurah({ s, onBack, onDone }) {
  const th = useTheme();
  const t = useT();
  const [a, setA] = useState(0);
  const [reading, setReading] = useState(true);
  const q = quran();
  const ayahs = q.ar[s - 1];
  const n = ayahs.length;
  const meaning = (t.lang === 'bn' ? q.bn : q.en)[s - 1][a];
  const tr = require('../data/quran/tr.json')[s - 1][a];
  const last = a === n - 1;
  return (
    <SubPage title={SURAHS[s - 1][2]} sub={t('Verse {a} of {n}', { a: a + 1, n })} onBack={onBack}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 12 }}>
        {ayahs.map((_, k) => <View key={k} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: k <= a ? th.accent : th.line }} />)}
      </View>
      <Card active style={{ padding: 20 }}>
        {a === 0 && s !== 1 ? <Bismillah th={th} /> : null}
        <Arabic size={30} style={{ textAlign: 'center', lineHeight: 58 }}>{`${ayahs[a]} ﴿${arNum(a + 1)}﴾`}</Arabic>
        {reading ? <Body size={13} color={th.accent} style={{ textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>{tr}</Body> : null}
        <Body size={14} color={th.muted} style={{ textAlign: 'center', marginTop: 10, lineHeight: 21 }}>{meaning}</Body>
        <Body size={10.5} color={th.faint} style={{ textAlign: 'center', marginTop: 10 }}>{QURAN_CREDIT[t.lang === 'bn' ? 'bn' : 'en']}</Body>
      </Card>
      <Press onPress={() => setReading(!reading)} style={{ marginTop: 10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 }}>
        <Feather name={reading ? 'eye-off' : 'eye'} size={13} color={th.muted} />
        <Body size={12} color={th.muted}>{reading ? t('Hide the reading') : t('Show the reading')}</Body>
      </Press>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <PrimaryButton ghost style={{ flex: 1 }} label={t('Previous')} disabled={a === 0} onPress={() => setA(a - 1)} />
        <PrimaryButton style={{ flex: 1 }} icon={last ? 'check' : 'arrow-right'} label={last ? t('Done') : t('Next verse')} onPress={() => (last ? onDone() : setA(a + 1))} />
      </View>
    </SubPage>
  );
}

// Split an ayah into words, keeping pause marks with the word before.
function wordsOf(ayah) {
  return ayah.split(' ').reduce((acc, w) => {
    if (/^[ۖ-ۭ]+$/.test(w) && acc.length) acc[acc.length - 1] += ` ${w}`;
    else if (w) acc.push(w);
    return acc;
  }, []);
}

function MemoriseSurah({ s, onBack, done, onToggle }) {
  const th = useTheme();
  const t = useT();
  const [level, setLevel] = useState('all');
  const [shown, setShown] = useState({});
  const ayahs = quran().ar[s - 1];
  const hidden = (w) => (level === 'some' ? w % 2 === 1 : level === 'none' ? w > 0 : false);
  const change = (v) => { setLevel(v); setShown({}); };
  return (
    <SubPage title={SURAHS[s - 1][2]} sub={t('Memorise')} onBack={onBack}>
      <Segmented value={level} onChange={change} options={[{ id: 'all', label: t('Show all') }, { id: 'some', label: t('Hide some') }, { id: 'none', label: t('Hide all') }]} />
      {level !== 'all' ? <Body size={11.5} color={th.faint} style={{ textAlign: 'center', marginTop: 8 }}>{t('Tap a hidden word to peek')}</Body> : null}
      <Card style={{ marginTop: 12, padding: 16 }}>
        {s !== 1 ? <Bismillah th={th} /> : null}
        {ayahs.map((ay, a) => (
          <View key={a} style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, marginBottom: 6 }}>
            {wordsOf(ay).map((w, k) => {
              const id = `${a}:${k}`;
              if (hidden(k) && !shown[id]) {
                return (
                  <Press key={id} onPress={() => setShown({ ...shown, [id]: true })} scaleTo={0.94} accessibilityLabel={t('Hidden word')} style={{ width: Math.max(28, Math.min(110, w.length * 7)), height: 26, borderRadius: 8, backgroundColor: th.accentSoft, borderWidth: 1, borderColor: th.accentLine, marginVertical: 8 }} />
                );
              }
              return <Arabic key={id} size={26} color={shown[id] ? th.accent : th.ink} style={{ lineHeight: 50 }}>{w}</Arabic>;
            })}
            <Arabic size={20} color={th.accent} style={{ lineHeight: 50 }}>{`﴿${arNum(a + 1)}﴾`}</Arabic>
          </View>
        ))}
      </Card>
      <Press onPress={onToggle} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: done ? th.ok : th.line }}>
        <Tick done={done} />
        <Body size={14} weight="semi">{t('I’ve memorised this chapter')}</Body>
      </Press>
    </SubPage>
  );
}

/* ================================= Games ================================= */
const LEVELS = { easy: 'Younger kids · easier questions', hard: 'Older kids · more to remember' };

export function GameScreen({ id }) {
  const th = useTheme();
  const t = useT();
  const [lr, set] = useLearn();
  const [level, setLevel] = useState('easy');
  const [stepSet, setStepSet] = useState('wudu');
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(null);
  const g = GAMES.find((x) => x.id === id) || GAMES[0];
  const bestKey = id === 'steps' ? `steps:${stepSet}:${level}` : `${id}:${level}`;
  const best = (lr.games || {})[bestKey];
  const restart = () => { setResult(null); setRound((r) => r + 1); };
  const finish = (score, total) => {
    setResult({ score, total, best });
    if (best == null || score > best) set('games', bestKey, score);
  };
  const k = `${level}:${stepSet}:${round}`;
  return (
    <Page title={t(g.en)} sub={t(g.sub)}>
      <Segmented value={level} onChange={(v) => { setLevel(v); restart(); }} options={[{ id: 'easy', label: t('Easy') }, { id: 'hard', label: t('Harder') }]} />
      <Body size={11.5} color={th.faint} style={{ textAlign: 'center', marginTop: 6 }}>{t(LEVELS[level])}</Body>
      {id === 'steps' ? (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 10 }}>
          {Object.keys(STEP_SETS).map((sid) => (
            <Press key={sid} onPress={() => { setStepSet(sid); restart(); }} style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: stepSet === sid ? th.accent : th.line, backgroundColor: stepSet === sid ? th.accentSoft : 'transparent' }}>
              <Body size={12.5} weight="semi" color={stepSet === sid ? th.accent : th.muted}>{t.lang === 'bn' ? STEP_SETS[sid].bn : STEP_SETS[sid].en}</Body>
            </Press>
          ))}
        </View>
      ) : null}
      <View style={{ marginTop: 14 }}>
        {result ? (
          <Result score={result.score} total={result.total} best={result.best} onAgain={restart} />
        ) : id === 'match' ? <MatchGame key={k} level={level} onDone={finish} />
          : id === 'steps' ? <StepsGame key={k} level={level} set={stepSet} onDone={finish} />
            : id === 'names' ? <NamesGame key={k} level={level} onDone={finish} />
              : <LettersGame key={k} level={level} onDone={finish} />}
      </View>
    </Page>
  );
}

const trim = (s, n) => {
  const w = String(s || '').split(' ');
  return w.length > n + 1 ? `${w.slice(0, n).join(' ')} …` : s;
};

function MatchGame({ level, onDone }) {
  const th = useTheme();
  const t = useT();
  const n = level === 'easy' ? 3 : 6;
  const [pairs] = useState(() => shuffle(MATCH_DUAS.filter((x) => level !== 'easy' || x.easy)).slice(0, n));
  const [cards] = useState(() => shuffle(pairs));
  const [sel, setSel] = useState(null); // { side: 'when' | 'dua', id }
  const [done, setDone] = useState({});
  const [wrong, setWrong] = useState(null);
  const [miss, setMiss] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const tap = (side, id) => {
    if (done[id]) return;
    if (!sel || sel.side === side) { setSel(sel && sel.side === side && sel.id === id ? null : { side, id }); return; }
    if (sel.id === id) {
      const d = { ...done, [id]: true };
      setDone(d);
      setSel(null);
      if (Object.keys(d).length === n) timer.current = setTimeout(() => onDone(Math.max(0, n - miss), n), 700);
    } else {
      setWrong({ a: sel.id, b: id });
      setMiss((m) => m + 1);
      setSel(null);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setWrong(null), 700);
    }
  };
  const isWrong = (id) => wrong && (wrong.a === id || wrong.b === id);
  const dua = (id) => DUAS.find((d) => d.id === id) || {};
  return (
    <View>
      <Body size={12.5} color={th.muted} style={{ textAlign: 'center', marginBottom: 10 }}>{t('Tap when we say it, then tap the dua.')}</Body>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {pairs.map((p) => {
          const on = sel && sel.side === 'when' && sel.id === p.id;
          const ok = done[p.id];
          return (
            <Press key={p.id} onPress={() => tap('when', p.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, borderWidth: 1.5, borderColor: ok ? th.ok : isWrong(p.id) ? th.red : on ? th.accent : th.line, backgroundColor: isWrong(p.id) ? th.redSoft : on ? th.accentSoft : 'transparent', opacity: ok ? 0.6 : 1 }}>
              {ok ? <Feather name="check" size={13} color={th.ok} /> : null}
              <Body size={13} weight="semi" color={ok ? th.ok : on ? th.accent : th.ink}>{t.lang === 'bn' ? p.bn : p.en}</Body>
            </Press>
          );
        })}
      </View>
      <View style={{ marginTop: 14, gap: 8 }}>
        {cards.map((p) => {
          const d = dua(p.id);
          const on = sel && sel.side === 'dua' && sel.id === p.id;
          const ok = done[p.id];
          return (
            <Press key={p.id} onPress={() => tap('dua', p.id)} scaleTo={0.98} style={{ padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: ok ? th.ok : isWrong(p.id) ? th.red : on ? th.accent : th.line, backgroundColor: isWrong(p.id) ? th.redSoft : on ? th.accentSoft : th.soft }}>
              <Arabic size={22} color={ok ? th.ok : th.ink} style={{ textAlign: 'center', lineHeight: 42 }}>{trim(d.arabic, 5)}</Arabic>
              {level === 'easy' ? <Body size={12} color={th.muted} style={{ textAlign: 'center', fontStyle: 'italic' }}>{trim(d.transliteration, 6)}</Body> : null}
              {ok ? <Body size={11.5} weight="semi" color={th.ok} style={{ textAlign: 'center', marginTop: 4 }}>{t.lang === 'bn' ? p.bn : p.en}</Body> : null}
            </Press>
          );
        })}
      </View>
      <Body size={11.5} color={th.faint} style={{ textAlign: 'center', marginTop: 12 }}>{t('{n} of {m} matched · {k} wrong tries', { n: Object.keys(done).length, m: n, k: miss })}</Body>
    </View>
  );
}

function StepsGame({ level, set, onDone }) {
  const th = useTheme();
  const t = useT();
  const S = STEP_SETS[set];
  const guide = guideById(S.guide);
  const total = S.steps.length;
  const lang = t.lang === 'bn' ? 'bn' : 'en';
  const makeOpts = (i) => {
    const others = shuffle(S.steps.map((_, j) => j).filter((j) => j > i)).slice(0, level === 'easy' ? 1 : 2);
    return shuffle([i, ...others]);
  };
  const [k, setK] = useState(0);
  const [opts, setOpts] = useState(() => makeOpts(0));
  const [miss, setMiss] = useState(0);
  const [wrong, setWrong] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const pick = (j) => {
    if (k >= total) return;
    if (j === k) {
      const nx = k + 1;
      setK(nx);
      if (nx >= total) timer.current = setTimeout(() => onDone(Math.max(0, total - miss), total), 1200);
      else setOpts(makeOpts(nx));
    } else {
      setWrong(j);
      setMiss((m) => m + 1);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setWrong(null), 650);
    }
  };
  return (
    <View>
      {S.steps.slice(0, k).map((s, i) => {
        const latest = i === k - 1;
        const full = guide && guide.steps[i] ? guide.steps[i][lang] : '';
        return (
          <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderColor: th.line }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: th.ok, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Body size={11} weight="bold" color="#fff">{t.num(i + 1)}</Body>
            </View>
            <View style={{ flex: 1 }}>
              <Body size={13.5} weight="semi">{s[lang]}</Body>
              {latest && full ? <Body size={11.5} color={th.muted} style={{ marginTop: 2, lineHeight: 16 }}>{full}</Body> : null}
            </View>
          </View>
        );
      })}
      {k < total ? (
        <>
          <Label style={{ marginTop: k ? 16 : 0, marginBottom: 8 }}>{k === 0 ? t('What comes first?') : t('What comes next?')}</Label>
          <View style={{ gap: 8 }}>
            {opts.map((j) => (
              <Press key={j} onPress={() => pick(j)} style={{ padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: wrong === j ? th.red : th.accentLine, backgroundColor: wrong === j ? th.redSoft : th.accentSoft }}>
                <Body size={14} weight="semi" color={wrong === j ? th.red : th.accent} style={{ textAlign: 'center' }}>{S.steps[j][lang]}</Body>
              </Press>
            ))}
          </View>
        </>
      ) : (
        <Body size={14} weight="semi" color={th.ok} style={{ textAlign: 'center', marginTop: 14 }}>{t('All in order!')}</Body>
      )}
      <Body size={11.5} color={th.faint} style={{ textAlign: 'center', marginTop: 12 }}>{t('Step {n} of {m} · {k} wrong tries', { n: Math.min(k + 1, total), m: total, k: miss })}</Body>
      {guide ? <Body size={11} weight="semi" color={th.accent} style={{ textAlign: 'center', marginTop: 6 }}>{guide.ref[lang]}</Body> : null}
    </View>
  );
}

function NamesGame({ level, onDone }) {
  const th = useTheme();
  const t = useT();
  const easy = level === 'easy';
  const [questions] = useState(() => {
    const pool = easy ? NAMES.slice(0, 33) : NAMES;
    return shuffle(pool).slice(0, 10).map((x) => {
      const others = shuffle(NAMES.filter((y) => y.n !== x.n && y.en !== x.en)).slice(0, easy ? 2 : 3);
      return {
        ask: t('What does this name mean?'),
        prompt: (
          <View style={{ alignItems: 'center' }}>
            <Arabic size={40} color={th.accent} style={{ lineHeight: 72 }}>{x.ar}</Arabic>
            {easy ? <Serif size={20}>{x.tr}</Serif> : null}
          </View>
        ),
        answer: x.n,
        options: shuffle([x, ...others]).map((y) => ({ key: y.n, node: <Body size={14} weight="semi" style={{ textAlign: 'center' }}>{y.en}</Body> })),
      };
    });
  });
  return (
    <View>
      <Quiz questions={questions} onDone={(s) => onDone(s, questions.length)} />
      {t.lang === 'bn' ? <Body size={11} color={th.faint} style={{ textAlign: 'center', marginTop: 10 }}>{t('English meaning · Bangla not added yet')}</Body> : null}
    </View>
  );
}

function LettersGame({ level, onDone }) {
  const th = useTheme();
  const t = useT();
  const easy = level === 'easy';
  const [questions] = useState(() => shuffle(LETTERS).slice(0, 10).map((x) => {
    if (easy) {
      const others = shuffle(LETTERS.filter((y) => letterName(y, t.lang) !== letterName(x, t.lang))).slice(0, 2);
      return {
        ask: t('What is this letter called?'),
        prompt: <Arabic size={64} color={th.accent} style={{ lineHeight: 110 }}>{x.ar}</Arabic>,
        answer: x.ar,
        options: shuffle([x, ...others]).map((y) => ({ key: y.ar, node: <Body size={15} weight="semi" style={{ textAlign: 'center' }}>{letterName(y, t.lang)}</Body> })),
      };
    }
    const forms = letterForms(x);
    const f = forms[1 + Math.floor(Math.random() * 3)];
    const others = shuffle(LETTERS.filter((y) => y !== x)).slice(0, 3);
    return {
      ask: t('This letter is inside a word. Which letter is it?'),
      prompt: <Arabic size={60} color={th.accent} style={{ lineHeight: 104 }}>{f}</Arabic>,
      answer: x.ar,
      options: shuffle([x, ...others]).map((y) => ({ key: y.ar, node: <Arabic size={30} style={{ lineHeight: 52, textAlign: 'center' }}>{y.ar}</Arabic> })),
    };
  }));
  return <Quiz questions={questions} grid={!easy} onDone={(s) => onDone(s, questions.length)} />;
}

/* ============================ Shared pieces ============================ */
function Quiz({ questions, onDone, grid }) {
  const th = useTheme();
  const t = useT();
  const [k, setK] = useState(0);
  const [pick, setPick] = useState(null);
  const [score, setScore] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const q = questions[k];
  if (!q) return null;
  const choose = (key) => {
    if (pick != null) return;
    setPick(key);
    const ok = key === q.answer;
    const s = score + (ok ? 1 : 0);
    setScore(s);
    timer.current = setTimeout(() => {
      setPick(null);
      if (k + 1 >= questions.length) onDone(s);
      else setK(k + 1);
    }, ok ? 650 : 1400);
  };
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 10 }}>
        {questions.map((_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < k ? th.accent : i === k ? th.accentLine : th.line }} />)}
      </View>
      <Card active style={{ padding: 18, alignItems: 'center', justifyContent: 'center', minHeight: 150 }}>{q.prompt}</Card>
      <Body size={13} weight="semi" color={th.muted} style={{ textAlign: 'center', marginVertical: 12 }}>{q.ask}</Body>
      <View style={grid ? { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } : { gap: 8 }}>
        {q.options.map((o) => {
          const right = pick != null && o.key === q.answer;
          const bad = pick != null && o.key === pick && pick !== q.answer;
          return (
            <Press key={String(o.key)} onPress={() => choose(o.key)} style={[{ padding: 12, minHeight: 50, borderRadius: 16, borderWidth: 1.5, borderColor: right ? th.ok : bad ? th.red : th.line, backgroundColor: bad ? th.redSoft : th.soft, alignItems: 'center', justifyContent: 'center' }, grid && { width: '48.5%' }]}>
              {o.node}
              {right ? <View style={{ position: 'absolute', right: 10, top: 10 }}><Feather name="check-circle" size={16} color={th.ok} /></View> : null}
            </Press>
          );
        })}
      </View>
      <Body size={11.5} color={th.faint} style={{ textAlign: 'center', marginTop: 12 }}>{t('Question {n} of {m} · {s} right', { n: k + 1, m: questions.length, s: score })}</Body>
    </View>
  );
}

function Result({ score, total, best, onAgain, onBack, backLabel }) {
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const good = score >= Math.ceil(total * 0.7);
  const newBest = best == null || score > best;
  return (
    <Card active style={{ padding: 22, alignItems: 'center' }}>
      <Feather name={good ? 'award' : 'refresh-cw'} size={30} color={th.accent} />
      <Serif size={24} style={{ marginTop: 8 }}>{good ? t('Well done!') : t('Good try!')}</Serif>
      <Body size={15} weight="semi" style={{ marginTop: 6 }}>{t('{n} of {m}', { n: score, m: total })}</Body>
      {good ? <Body size={13} color={th.accent} style={{ marginTop: 6 }}>{t('MashaAllah')}</Body> : <Body size={12.5} color={th.muted} style={{ marginTop: 6, textAlign: 'center' }}>{t('Play again to do even better.')}</Body>}
      {best !== undefined ? <Body size={11.5} color={th.faint} style={{ marginTop: 8 }}>{newBest ? t('Your best so far') : t('Your best: {n} of {m}', { n: best, m: total })}</Body> : null}
      <PrimaryButton style={{ marginTop: 16, alignSelf: 'stretch' }} icon="rotate-ccw" label={t('Play again')} onPress={onAgain} />
      <PrimaryButton ghost style={{ marginTop: 8, alignSelf: 'stretch' }} label={backLabel || t('Back to games')} onPress={onBack || nav.pop} />
    </Card>
  );
}

function NavBtn({ icon, label, onPress, right }) {
  const th = useTheme();
  return (
    <Press onPress={onPress} style={{ flexDirection: right ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, borderWidth: 1, borderColor: th.line }}>
      <Feather name={icon} size={14} color={th.accent} />
      <Body size={12.5} weight="semi" color={th.accent}>{label}</Body>
    </Press>
  );
}
