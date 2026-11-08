// Ask Deen: a smart offline search. There is no AI model. A question is
// matched to meaning groups (English and Bangla words), then searched across
// duas, guides, the Quran, the 99 Names, important days, settings and the
// Essentials tools. A few questions get a direct answer from your own data
// (today's times, the next Eid, the prayer you miss most). It only ever shows
// what is already in the app, so it can't make anything up.
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press, Input } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout, timeStr, longDate, hijriLabel } from '../ui/hooks';
import { translate } from '../i18n';
import { nowDate } from '../lib/clock';
import { PRAYER_NAMES, addDays, addMinutes, qiblaBearing, compassPoint } from '../lib/prayer';
import { nextPrayer } from '../lib/homeLogic';
import { rangeStats, streaks } from '../lib/stats';
import { calendarMissed, olderTotal } from '../lib/qada';
import { upcomingEvents } from '../lib/events';
import { eventTitle } from '../data/eventText';
import { ISLAMIC_EVENTS } from '../data/events';
import { DUAS } from '../data/duas';
import { duaText } from '../data/duaText';
import { GUIDES } from '../data/guides';
import { NAMES } from '../data/names99';
import { FEELINGS } from '../data/feelings';
import { KALIMAS } from '../data/kalimas';
import { kalimaText } from '../data/kalimaText';
import { SETTINGS_INDEX, goSetting } from './Settings';
import { feedbackReady } from '../lib/feedback';

const QSURAHS = require('../data/quran/surahs.json'); // [n, ar, translit, en, bn, type, verses]

/* ------------------------------ text helpers ------------------------------ */
function norm(s) {
  let x = String(s || '').toLowerCase();
  try { x = x.normalize('NFKD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* old engines */ }
  return x.replace(/[‘’'`ʿʾ´]/g, '').replace(/[.,!?;:()"“”\-–—/·।?]/g, ' ').replace(/\s+/g, ' ').trim();
}
const STOP = new Set(('what whats is the a an how to do i my me for of in on at when which does can should it are and or about with please tell show '
  + 'there any be was will today time times dua duas say read কি কী কিভাবে কীভাবে কখন আমার আমি করব করবো করে এর ও এবং কোন কোনটা আজ আজকে সময় দোয়া পড়ব').split(' ').map(norm));
const tokensOf = (q) => norm(q).split(' ').filter((w) => w.length > 1 && !STOP.has(w));
const isBn = (w) => /[\u0980-\u09FF]/.test(w);
// Bangla words take endings (ফজরের, নামাজে), so a Bangla word matches at the
// start of a query word. English needs the whole word, or a long enough part.
const hasWord = (q, list) => list.some((w) => {
  const n = norm(w);
  if ((` ${q} `).includes(` ${n} `)) return true;
  if (isBn(n)) return n.includes(' ') ? q.includes(n) : q.split(' ').some((x) => x.startsWith(n));
  return n.length > 4 && q.includes(n);
});
const BN_ENDINGS = ['গুলোর', 'গুলো', 'দের', 'য়ের', 'ের', 'এর', 'কে', 'তে', 'টি', 'টা', 'ে'];
const stem = (w) => {
  if (!isBn(w)) return w;
  const e = BN_ENDINGS.find((x) => w.endsWith(x) && w.length - x.length >= 2);
  return e ? w.slice(0, -e.length) : w;
};

/* ----------------------------- meaning groups ----------------------------- */
// Each group: words (English and Bangla) → the things to show first.
const G = (words, results, weak) => ({ words: words.split('|'), results, weak });
const GROUPS = [
  G('sleep|cant sleep|insomnia|bed|bedtime|nightmare|bad dream|ঘুম|ঘুমাতে|দুঃস্বপ্ন', [['feel', 'sleep']]),
  G('worried|worry|anxious|anxiety|stress|stressed|nervous|দুশ্চিন্তা|চিন্তা|টেনশন', [['feel', 'worried']]),
  G('sad|sadness|depressed|grief|upset|crying|lonely|দুঃখ|মন খারাপ|কষ্ট', [['feel', 'sad']]),
  G('afraid|scared|fear|frightened|ভয়|ভয়', [['feel', 'afraid']]),
  G('angry|anger|mad|furious|রাগ', [['feel', 'angry']]),
  G('sick|ill|illness|pain|fever|hospital|healing|অসুস্থ|অসুখ|জ্বর|ব্যথা', [['feel', 'sick']]),
  G('distress|hardship|trouble|problem|difficulty|বিপদ|সমস্যা', [['feel', 'distress']]),
  G('debt|loan|owe money|ঋণ|দেনা', [['feel', 'debt'], ['guide', 'riba']]),
  G('travel|travelling|traveling|journey|trip|safar|qasr|musafir|সফর|ভ্রমণ|কসর|মুসাফির', [['guide', 'travel'], ['set', 'safar'], ['feel', 'travelling']]),
  G('forgive|forgiveness|sin|sins|repent|repentance|tawbah|tauba|istighfar|ক্ষমা|তওবা|গুনাহ|ইস্তিগফার', [['feel', 'guilty']]),
  G('study|studying|exam|exams|test|knowledge|পড়াশোনা|পরীক্ষা|জ্ঞান', [['feel', 'studying']]),
  G('thank|thanks|grateful|gratitude|shukr|alhamdulillah|কৃতজ্ঞ|শুকরিয়া', [['feel', 'grateful']]),
  G('qibla|qiblah|kibla|kiblah|direction|kaaba|kaba|কিবলা|কাবা', [['ans', 'qibla'], ['set', 'qibla']]),
  G('zakat|zakah|sadaqah|sadaqa|charity|fitrah|fitra|fidya|fidyah|kaffarah|যাকাত|জাকাত|ফিতরা|সদকা|দান|ফিদিয়া', [['set', 'charity'], ['guide', 'kaffarah']]),
  G('tasbih|tasbeeh|dhikr|zikr|counter|তাসবিহ|জিকির', [['set', 'tasbih']]),
  G('quran|koran|quraan|recite|কুরআন|কোরআন', [['tool', 'quran']]),
  G('names of allah|99 names|asma|husna|asmaul|আল্লাহর নাম', [['tool', 'names']]),
  G('arabic|alphabet|letters|kids|children|child|game|games|আরবি|বাচ্চা|শিশু|খেলা|হরফ', [['tool', 'learn']]),
  G('qada|qaza|kaza|missed|make up|makeup|owed|owe|কাজা|কাযা|ছুটে যাওয়া', [['ans', 'owed'], ['guide', 'qada']]),
  G('miss most|most missed|miss the most|stats|statistics|report|progress|how am i doing|streak|best streak|সবচেয়ে|বেশি ছুটে|বেশি মিস|হিসাব|রিপোর্ট|পরিসংখ্যান', [['ans', 'most'], ['ans', 'streak']]),
  G('eid|eids|ঈদ', [['ans', 'eid']]),
  G('ramadan|ramzan|ramadhan|fasting month|রমজান|রমযান|রোজার মাস', [['ans', 'ramadan']]),
  G('hijri|islamic date|arabic date|date today|today date|হিজরি|তারিখ', [['ans', 'hijri']]),
  G('next prayer|next salah|next namaz|পরের নামাজ', [['ans', 'next']]),
  G('witr|qunut|বিতর|কুনুত', [['guide', 'witr']]),
  G('masbuq|joined late|late for jamaat|late for jamat|missed rakah|missed a rakah|jamaat|jamat|jama‘ah|congregation|জামাত|মাসবুক', [['guide', 'masbuq']]),
  G('wudu|wudhu|ablution|ozu|অজু|ওজু', [['guide', 'wudu'], ['guide', 'breaksWudu']]),
  G('pray|prayer|salah|salat|namaz|how to pray|নামাজ|সালাত', [['guide', 'pray2'], ['guide', 'pray4']], true),
  G('fast|fasting|roza|roja|sawm|রোজা|রোযা', [['guide', 'breaksFast'], ['guide', 'qadaFast']], true),
  G('dead|death|died|funeral|janazah|janaza|জানাজা|মৃত্যু', [['guide', 'janazah']]),
  G('decision|decide|choose|istikhara|ইস্তিখারা', [['guide', 'istikhara']]),
  G('backup|restore|sync|two phones|google account|ব্যাকআপ|সিঙ্ক', [['set', 'account']]),
];

// Words that name a prayer or a fasting time, for the "times" answer.
const TIME_WORDS = {
  Fajr: 'fajr|fazr|fojor|ফজর', Sunrise: 'sunrise|shuruq|ishraq|সূর্যোদয়', Dhuhr: 'dhuhr|zuhr|zohr|johor|duhr|যোহর|জোহর',
  Asr: 'asr|আসর', Maghrib: 'maghrib|magrib|মাগরিব', Isha: 'isha|esha|ইশা|এশা',
  Iftar: 'iftar|iftaar|ইফতার', Seheri: 'seheri|sehri|suhoor|sahur|sehr|সেহরি|সাহরি', Jumuah: 'jumuah|jumma|juma|jummah|friday|জুমা|জুম্মা',
};

/* --------------------------------- screen --------------------------------- */
export default function AskScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const [q, setQ] = useState('');
  const lang = t.lang === 'bn' ? 'bn' : 'en';
  const tz = app.coords.timezone;
  const recent = app.data.askRecent || [];

  const remember = (text) => {
    const s = String(text || '').trim();
    if (!s) return;
    app.update((p) => ({ askRecent: [s, ...(p.askRecent || []).filter((x) => x !== s)].slice(0, 6) }));
  };

  // Upcoming important days, to open the right date.
  const upcoming = useMemo(() => upcomingEvents(app.today, app.hijri, 400, { history: true }), [app.today, app.hijri]);
  const nextOf = (id) => upcoming.find((e) => e.evt.id === id);
  const daysAway = (d) => {
    const n = Math.round((d - app.today) / 86400000);
    return n <= 0 ? t('Today') : n === 1 ? t('Tomorrow') : t('In {n} days', { n });
  };

  // Everything searchable, built once per language.
  const index = useMemo(() => {
    const out = [];
    const add = (kind, icon, title, sub, hay, go, rank = 3) => out.push({ kind, icon, title, sub, hay: norm(hay), tnorm: norm(title), go, rank });
    GUIDES.forEach((g) => add(t('Guide'), 'book-open', g.title[lang], t('{n} steps', { n: g.steps.length }),
      [g.title.en, g.title.bn, g.intro.en, g.intro.bn, ...g.steps.map((s) => `${s.en} ${s.bn}`)].join(' '), () => nav.push('guide', { id: g.id }), 1));
    DUAS.forEach((d) => {
      const dt = duaText(d, t.lang);
      add(t('Dua'), 'star', dt.title, d.source || '', [d.title, dt.title, d.category, d.transliteration, d.translation, dt.translation].join(' '), () => nav.push('dua', { id: d.id }), 2);
    });
    KALIMAS.forEach((k) => {
      const kt = kalimaText(k, t.lang);
      add(t('Kalima'), 'award', kt.title, '', [kt.title, k.transliteration, kalimaText(k, 'en').title].join(' '), () => nav.push('dua', { kalima: k.id }), 2);
    });
    SETTINGS_INDEX.forEach(([label, target, words]) => {
      if (target === 'tool:feedback' && !feedbackReady()) return; // "Coming soon" isn't an answer
      const ess = target.startsWith('ess:') || target.startsWith('tool:');
      add(ess ? t('Essentials') : t('Setting'), ess ? 'grid' : 'settings', t(label), '', [label, translate('bn', label), words].join(' '), () => goSetting(nav, app, t, target), ess ? 1 : 4);
    });
    add(t('Quran'), 'book', t('Quran reader'), t('The full Quran with Bangla and English'), 'quran koran read recite কুরআন কোরআন', () => nav.push('quran'), 1);
    add(t('Learn'), 'grid', t('99 Names of Allah'), '', '99 names allah asma husna আল্লাহর নাম', () => nav.push('names'), 1);
    add(t('Ibadah'), 'book', t('Chapters for salah'), t('Short chapters to memorise'), 'surahs salah memorise short সূরা মুখস্থ', () => nav.push('surahs'), 2);
    QSURAHS.forEach((x) => add(t('Chapter'), 'book', `${x[0]}. ${x[2]}`, lang === 'bn' ? x[4] : x[3], `surah sura সূরা ${x[0]} ${x[2]} ${x[3]} ${x[4]}`, () => nav.push('quran', { surah: x[0] }), 3));
    NAMES.forEach((x) => add(t('Name of Allah'), 'star', x.tr, x.en, `${x.tr} ${x.en}`, () => nav.push('names', { n: x.n }), 4));
    ISLAMIC_EVENTS.forEach((evt) => {
      const nx = nextOf(evt.id);
      if (!nx) return;
      add(t('Important day'), 'calendar', eventTitle(evt, t.lang), `${daysAway(nx.date)} · ${longDate(t.lang, nx.date)}`,
        [evt.title.en, evt.title.bn, evt.id.replace(/-/g, ' ')].join(' '), () => nav.openSheet('event', { id: evt.id, date: nx.date }), 2);
    });
    return out;
  }, [t.lang, upcoming]);

  // Direct answers from the app's own data.
  const answer = (id) => {
    const now = nowDate();
    const ctx = { today: app.today, now, getDay: app.getDay };
    if (id === 'qibla') {
      const deg = qiblaBearing(app.coords.latitude, app.coords.longitude);
      return { icon: 'navigation', title: t('Qibla {deg}° · {dir}', { deg: t.num(Math.round(deg)), dir: t(compassPoint(deg)) }), sub: t('From {place}. Tap to open the compass.', { place: app.locationName }), go: () => nav.push('qibla') };
    }
    if (id === 'owed') {
      const n = calendarMissed(app.data, ctx).length + olderTotal(app.data);
      return { icon: 'rotate-ccw', title: n ? t('{n} owed', { n }) : t('All caught up'), sub: t('Missed prayers to make up'), go: () => nav.push('qadaHistory'), red: n > 0 };
    }
    if (id === 'most') {
      const r = rangeStats({ from: addDays(app.today, -29), days: 30, data: app.data, today: app.today, now, getDay: app.getDay });
      if (!r.tracking || !r.due) return { icon: 'bar-chart-2', title: t('Not enough ticks yet'), sub: t('Tick your prayers for a few days and ask again.'), go: () => nav.push('monthStats', { date: app.today }) };
      const p = r.mostMissed ? r.per[r.mostMissed] : null;
      return {
        icon: 'bar-chart-2',
        title: r.mostMissed ? t('{p} is the one you miss most', { p: t(r.mostMissed) }) : t('No late or missed prayers'),
        sub: r.mostMissed ? t('{n} late or missed in the last 30 days · {pct}% on time overall', { n: p.qada + p.missed, pct: r.pct }) : t('In the last 30 days. MashaAllah.'),
        go: () => nav.push('monthStats', { date: app.today }),
      };
    }
    if (id === 'streak') {
      const s = streaks(app.data.completedByDay || {}, app.today);
      return { icon: 'zap', title: s.current ? t('{n}-day streak', { n: s.current }) : t('No streak right now'), sub: s.best === 1 ? t('All 5 on time · best 1 day') : t('All 5 on time · best {n} days', { n: s.best }), go: () => nav.push('monthStats', { date: app.today }) };
    }
    if (id === 'eid' || id === 'ramadan') {
      const ids = id === 'eid' ? ['eid-fitr', 'eid-adha'] : ['ramadan'];
      const hits = ids.map(nextOf).filter(Boolean).sort((a, b) => a.date - b.date);
      if (!hits.length) return null;
      const e = hits[0];
      return { icon: 'star', title: `${eventTitle(e.evt, t.lang)} · ${daysAway(e.date)}`, sub: `${longDate(t.lang, e.date, true)} · ${hijriLabel(t.lang, e.h)}`, go: () => nav.openSheet('event', { id: e.evt.id, date: e.date }), more: hits[1] ? `${eventTitle(hits[1].evt, t.lang)} · ${daysAway(hits[1].date)}` : null };
    }
    if (id === 'hijri') {
      const h = app.hijri(app.today);
      return { icon: 'moon', title: hijriLabel(t.lang, h), sub: longDate(t.lang, app.today, true), go: () => nav.setTab('Hijri') };
    }
    if (id === 'next') {
      const n = nextPrayer(app.getDay, app.today, now);
      return { icon: 'clock', title: t('{p} at {time}', { p: t(n.name), time: timeStr(t, n.at, tz) }), sub: t('Next prayer · {d}', { d: daysAway(n.day) }), go: () => nav.openSheet('prayer', { name: n.name, date: n.day }) };
    }
    return null;
  };

  // A prayer-time answer, when the question names a prayer.
  const timeAnswer = (qn) => {
    const hit = Object.keys(TIME_WORDS).find((k) => hasWord(qn, TIME_WORDS[k].split('|')));
    if (!hit) return null;
    const d = app.getDay(app.today);
    const buf = app.data.safetyBuffer || 0;
    if (hit === 'Iftar') return { icon: 'sunset', title: t('Iftar at {time}', { time: timeStr(t, d.Maghrib, tz) }), sub: t('Today, at Maghrib · {place}', { place: app.locationName }), go: () => nav.openSheet('prayer', { name: 'Maghrib', date: app.today }) };
    if (hit === 'Seheri') {
      const tomorrow = app.getDay(addDays(app.today, 1));
      const end = nowDate() > d.Fajr ? addMinutes(tomorrow.Fajr, -buf) : addMinutes(d.Fajr, -buf);
      return { icon: 'sunrise', title: t('Seheri ends at {time}', { time: timeStr(t, end, tz) }), sub: buf ? t('{n} min before Fajr, as set in Settings', { n: buf }) : t('At Fajr'), go: () => nav.push('timetable') };
    }
    if (hit === 'Jumuah') {
      let f = app.today;
      for (let i = 0; i < 7 && f.getDay() !== 5; i++) f = addDays(f, 1);
      const fd = app.getDay(f);
      return { icon: 'users', title: t('Jumu‘ah · Dhuhr at {time}', { time: timeStr(t, fd.Dhuhr, tz) }), sub: `${daysAway(f)} · ${longDate(t.lang, f)}`, go: () => nav.openSheet('prayer', { name: 'Dhuhr', date: f }) };
    }
    if (hit === 'Sunrise') return { icon: 'sun', title: t('Sunrise at {time}', { time: timeStr(t, d.Sunrise, tz) }), sub: t('Fajr ends at sunrise'), go: () => nav.push('timetable') };
    const rows = PRAYER_NAMES.includes(hit) ? hit : null;
    if (!rows) return null;
    return { icon: 'clock', title: t('{p} at {time}', { p: t(hit), time: timeStr(t, d[hit], tz) }), sub: t('Today · {place}', { place: app.locationName }), go: () => nav.openSheet('prayer', { name: hit, date: app.today }) };
  };

  const results = useMemo(() => {
    const qn = norm(q);
    if (!qn) return null;
    const toks = tokensOf(q);
    const answers = [];
    const best = [];
    const seen = new Set();
    const pushBest = (r) => { if (r && !seen.has(r.title)) { seen.add(r.title); best.push(r); } };
    const ta = timeAnswer(qn);
    if (ta) answers.push(ta);
    // Weak groups (plain "prayer", "fast") only count when nothing more specific matched.
    const strongHit = GROUPS.some((g) => !g.weak && hasWord(qn, g.words));
    GROUPS.forEach((g) => {
      if (!hasWord(qn, g.words) || (g.weak && (strongHit || ta))) return;
      g.results.forEach(([type, id]) => {
        if (type === 'ans') { const a = answer(id); if (a && !answers.some((x) => x.title === a.title)) answers.push(a); return; }
        if (type === 'feel') {
          const f = FEELINGS.find((x) => x.id === id);
          if (f) f.ids.forEach((did) => { const d = DUAS.find((x) => x.id === did); if (d) pushBest({ kind: t('Dua · {f}', { f: f[lang] }), icon: 'star', title: duaText(d, t.lang).title, sub: d.source || '', go: () => nav.push('dua', { id: d.id }) }); });
          return;
        }
        if (type === 'guide') {
          const g2 = GUIDES.find((x) => x.id === id);
          if (g2) pushBest({ kind: t('Guide'), icon: 'book-open', title: g2.title[lang], sub: t('{n} steps', { n: g2.steps.length }), go: () => nav.push('guide', { id }) });
          return;
        }
        if (type === 'set') {
          const row = SETTINGS_INDEX.find(([, target]) => target === id || target === `ess:${id}` || target === `tool:${id}`);
          if (row) pushBest({ kind: row[1].startsWith('ess:') || row[1].startsWith('tool:') ? t('Essentials') : t('Setting'), icon: row[1].startsWith('ess:') ? 'grid' : 'settings', title: t(row[0]), go: () => goSetting(nav, app, t, row[1]) });
          return;
        }
        if (type === 'tool') {
          const map = { quran: ['Quran reader', 'book', () => nav.push('quran')], names: ['99 Names of Allah', 'star', () => nav.push('names')], learn: ['Learn', 'grid', () => nav.push('learn')] };
          const m = map[id];
          if (m) pushBest({ kind: t('Essentials'), icon: m[1], title: t(m[0]), go: m[2] });
        }
      });
    });
    // General search: every word counts; titles count double.
    const more = [];
    // Once there's an answer or a best match, the rest must match by title.
    const picked = answers.length > 0 || best.length > 0;
    if (toks.length) {
      index.forEach((it) => {
        let hit = 0;
        let inTitle = 0;
        toks.forEach((w) => {
          const sw = stem(w);
          if (it.hay.includes(w) || it.hay.includes(sw)) hit++;
          if (it.tnorm.includes(w) || it.tnorm.includes(sw)) inTitle++;
        });
        const need = toks.length <= 2 ? toks.length : Math.ceil(toks.length * 0.6);
        if (hit >= need && !seen.has(it.title) && (!picked || inTitle)) more.push({ ...it, score: hit + inTitle * 1.5 - it.rank * 0.3 });
      });
      more.sort((a, b) => b.score - a.score);
    }
    return { answers, best, more: more.filter((x) => !seen.has(x.title)).slice(0, 30) };
  }, [q, index, t.lang, app.today, app.data]);

  const open = (r) => { remember(q); r.go(); };
  const SUGGEST = lang === 'bn'
    ? ['ঘুম আসছে না', 'বিতর নামাজ', 'ইফতারের সময়', 'কিবলা', 'কোন নামাজ বেশি ছুটে যায়', 'যাকাত', 'সফরের দোয়া', 'পরের ঈদ']
    : ['Can’t sleep', 'How to pray Witr', 'Iftar time', 'Qibla', 'Which prayer do I miss most?', 'Zakat', 'Dua for travel', 'Next Eid'];

  const Row = ({ r, i }) => (
    <Press onPress={() => open(r)} scaleTo={0.99}>
      {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
        <Feather name={r.icon} size={14} color={th.accent} />
        <View style={{ flex: 1 }}>
          <Body size={13.5} weight="med" numberOfLines={2}>{r.title}</Body>
          <Body size={11} color={th.muted} numberOfLines={1}>{[r.kind, r.sub].filter(Boolean).join(' · ')}</Body>
        </View>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </View>
    </Press>
  );

  const empty = results && !results.answers.length && !results.best.length && !results.more.length;
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={t('Ask Deen')} sub={t('Search everything in Deen · works offline')} />
      <View style={{ marginTop: 8 }}>
        <Feather name="search" size={16} color={th.faint} style={{ position: 'absolute', left: 14, top: 0, bottom: 0, textAlignVertical: 'center', zIndex: 1, lineHeight: 46 }} />
        <Input value={q} onChangeText={setQ} autoFocus placeholder={t('Ask anything…')} autoCorrect={false} returnKeyType="search" onSubmitEditing={() => remember(q)} style={{ paddingLeft: 38, paddingRight: 40 }} />
        {q ? (
          <Press onPress={() => setQ('')} hitSlop={10} accessibilityLabel={t('Clear search')} style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
            <Feather name="x-circle" size={17} color={th.faint} />
          </Press>
        ) : null}
      </View>

      {!results ? (
        <View>
          {recent.length ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
                <Label style={{ flex: 1 }}>{t('Recent')}</Label>
                <Press onPress={() => app.update({ askRecent: [] })} hitSlop={8}><Body size={11.5} weight="semi" color={th.accent}>{t('Clear')}</Body></Press>
              </View>
              {recent.map((r) => (
                <Press key={r} onPress={() => setQ(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 }}>
                  <Feather name="clock" size={13} color={th.faint} />
                  <Body size={13.5} style={{ flex: 1 }}>{r}</Body>
                  <Feather name="arrow-up-left" size={14} color={th.faint} />
                </Press>
              ))}
            </>
          ) : null}
          <Label style={{ marginTop: 18, marginBottom: 8 }}>{t('Try asking')}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SUGGEST.map((s) => (
              <Press key={s} onPress={() => setQ(s)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: th.accentLine }}>
                <Body size={12.5} weight="semi" color={th.accent}>{s}</Body>
              </Press>
            ))}
          </View>
          <Body size={11} color={th.faint} style={{ marginTop: 20, lineHeight: 16 }}>{t('Ask Deen searches the duas, guides, Quran, settings and tools inside the app. It works offline and only shows what’s already in Deen, with its source.')}</Body>
        </View>
      ) : (
        <View>
          {results.answers.map((a, i) => (
            <Card key={`a${i}`} active onPress={() => open(a)} style={{ marginTop: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: th.card, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={a.icon} size={16} color={a.red ? th.red : th.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Serif size={17} color={a.red ? th.red : th.ink}>{a.title}</Serif>
                {a.sub ? <Body size={12} color={th.muted} style={{ marginTop: 2 }}>{a.sub}</Body> : null}
                {a.more ? <Body size={11.5} color={th.faint} style={{ marginTop: 2 }}>{a.more}</Body> : null}
              </View>
              <Feather name="chevron-right" size={16} color={th.faint} />
            </Card>
          ))}
          {results.best.length ? (
            <>
              <Label style={{ marginTop: 16, marginBottom: 8 }}>{t('Best matches')}</Label>
              <Card style={{ paddingVertical: 2 }}>{results.best.map((r, i) => <Row key={`b${i}`} r={r} i={i} />)}</Card>
            </>
          ) : null}
          {results.more.length ? (
            <>
              <Label style={{ marginTop: 16, marginBottom: 8 }}>{results.best.length || results.answers.length ? t('More results') : t('Results')}</Label>
              <Card style={{ paddingVertical: 2 }}>{results.more.map((r, i) => <Row key={`m${i}`} r={r} i={i} />)}</Card>
            </>
          ) : null}
          {empty ? (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 6 }}>
              <Feather name="search" size={24} color={th.faint} />
              <Serif size={17}>{t('Nothing found')}</Serif>
              <Body size={12.5} color={th.muted} style={{ textAlign: 'center', maxWidth: 270 }}>{t('Try one simple word, like “sleep”, “Witr” or “zakat”.')}</Body>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}
