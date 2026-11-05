import { nowDate } from '../lib/clock';
import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { HScroll } from '../ui/swipe';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press, Arabic, Segmented, Chip, Input, Tick, SectionLabel, Empty, Row } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout, timeStr, shortDate, hijriLabel } from '../ui/hooks';
import { addDays, addMinutes } from '../lib/prayer';
import { DUAS, DUA_CATEGORIES } from '../data/duas';
import { duaText, categoryName } from '../data/duaText';
import { KALIMAS } from '../data/kalimas';
import { kalimaText } from '../data/kalimaText';
import { infoText } from '../data/infoText';
import { calendarMissed, olderTotal, qadaHistory } from '../lib/qada';
import { needsAnswer } from '../lib/homeLogic';
import { CircleMark } from './Home';
import { dayWord } from './QadaParts';
import { JUMUAH_AYAH } from '../data/quranSnippets';
import { GUIDES, GUIDE_GROUPS } from '../data/guides';
import { SURAHS } from '../data/surahs';
import { FEELINGS } from '../data/feelings';
import { SETTINGS_INDEX, goSetting } from './Settings';
import { translate } from '../i18n';

function useNafilWindows() {
  const app = useApp();
  const { today, getDay, coords, data } = app;
  const tz = coords.timezone;
  const now = nowDate();
  const d = getDay(today);
  const beforeFajr = now < d.Fajr;
  const nightStart = beforeFajr ? getDay(addDays(today, -1)).Maghrib : d.Maghrib;
  const nightEnd = beforeFajr ? d.Fajr : getDay(addDays(today, 1)).Fajr;
  const lastThird = new Date(nightEnd.getTime() - (nightEnd - nightStart) / 3);
  return { tz, tahajjud: [lastThird, addMinutes(nightEnd, -(data.safetyBuffer || 0))], duha: [addMinutes(d.Sunrise, 15), addMinutes(d.Dhuhr, -10)], d };
}

function DailyView() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { today } = app;
  const w = useNafilWindows();
  const h = app.hijri(today);
  const ramadan = h.monthIndex === 8;
  const fmt = (a, b) => `${timeStr(t, a, w.tz)} – ${timeStr(t, b, w.tz)}`;
  const now = nowDate();
  // Tahajjud belongs to the night: before Fajr it's last night's.
  const nightDay = now < app.getDay(today).Fajr ? addDays(today, -1) : today;
  const items = [
    { key: 'tahajjud', info: 'tahajjud', icon: 'moon', win: fmt(w.tahajjud[0], w.tahajjud[1]), day: nightDay },
    { key: 'duha', info: 'duha', icon: 'sun', win: fmt(w.duha[0], w.duha[1]), day: today },
    { key: 'dhikr', info: 'adhkar', icon: 'repeat', win: t('After Fajr and after Asr'), day: today },
    ...(!ramadan ? [{ key: 'roja', info: 'fast', icon: 'sunrise', win: t('Seheri to Iftar'), day: today }] : []),
  ];
  const doneCount = items.filter((i) => app.isSunnahDone(i.day, i.key)).length;
  const I = infoText(t.lang).NAWAFIL;
  const ctx = { today, now, getDay: app.getDay };
  const owed = calendarMissed(app.data, ctx).length + olderTotal(app.data);
  const hist = qadaHistory(app.data);
  const list = needsAnswer(app, now).slice(0, 3);
  const tz = app.coords.timezone;

  return (
    <View>
      <SectionLabel right={<Label>{t('{n} of {m}', { n: doneCount, m: items.length })}</Label>}>{t('Sunnah & nawafil')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {items.map((it, i) => (
          <View key={it.key}>
            {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingLeft: 14, paddingRight: 8 }}>
              <Press onPress={() => (it.key === 'tahajjud' || it.key === 'duha' ? nav.openSheet('nightTime', { k: it.key }) : it.key === 'roja' ? nav.push('fasting') : nav.openSheet('nawafil', { k: it.info, window: it.win }))} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }} scaleTo={0.99}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={it.icon} size={15} color={th.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Body size={14} weight="med">{I[it.info].title}</Body>
                  <Body size={11.5} color={th.muted}>{it.win}</Body>
                </View>
              </Press>
              <Press onPress={() => app.toggleSunnah(it.day, it.key)} hitSlop={8} style={{ padding: 6 }} accessibilityRole="checkbox" accessibilityLabel={I[it.info].title} accessibilityState={{ checked: app.isSunnahDone(it.day, it.key) }}>
                <Tick done={app.isSunnahDone(it.day, it.key)} />
              </Press>
            </View>
          </View>
        ))}
      </Card>

      <JumuahTracker />

      {/* Qada: the newest 3 prayers still to answer, then one card for everything else. */}
      <SectionLabel right={<Label color={owed ? th.red : th.muted}>{owed ? t('Owed {n}', { n: owed }) : t('All caught up')}</Label>}>{t('Qada')}</SectionLabel>
      {list.length ? (
        <Card style={{ paddingVertical: 2, marginBottom: 10, borderColor: th.amber }}>
          {list.map((x, i) => (
            <View key={`${x.date.toDateString()}${x.name}`}>
              {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
              <Press onPress={() => nav.openSheet('prayer', { name: x.name, date: x.date })} scaleTo={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
                <CircleMark state={x.state === 'missed' ? 'missed' : 'unanswered'} size={18} />
                <View style={{ flex: 1 }}>
                  <Serif size={15}>{t(x.name)}</Serif>
                  <Body size={11.5} color={th.muted}>{`${dayWord(t, x.date, today)} · ${t('ended {time}', { time: timeStr(t, x.end, tz) })}`}</Body>
                </View>
                <View style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99, backgroundColor: th.accent }}>
                  <Body size={11.5} weight="semi" color={th.cardInk}>{t('Did you pray?')}</Body>
                </View>
              </Press>
            </View>
          ))}
        </Card>
      ) : null}
      <Card active onPress={() => nav.push('qadaHistory')} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: owed ? th.red : th.accent, alignItems: 'center', justifyContent: 'center' }}>
          {owed ? <Serif bold size={t.lang === 'bn' ? 18 : 15} color={th.red}>{t.num(owed)}</Serif> : <Feather name="check" size={18} color={th.accent} />}
        </View>
        <View style={{ flex: 1 }}>
          <Serif size={17}>{t('Missed prayers')}</Serif>
          <Body size={11.5} color={th.muted}>{owed ? t('{n} owed · {m} made up so far', { n: owed, m: hist.length }) : hist.length ? t('All caught up · {n} made up so far', { n: hist.length }) : t('Nothing missed in your calendar')}</Body>
        </View>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </Card>
    </View>
  );
}

// Jumu'ah over the last 8 Fridays. Al-Jumu'ah 62:9 shows only after 3 missed
// in a row, or 3 of the last 5 for a reason that isn't an excuse.
const EXCUSED = ['travel', 'sick', 'nomosque'];
function JumuahTracker() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { today, data } = app;
  const back = (today.getDay() + 2) % 7; // days since the last Friday
  const fridays = Array.from({ length: 8 }, (_, i) => addDays(today, -back - 7 * i)).filter((d) => d >= new Date(new Date(data.firstOpenAt || today).toDateString()) || (data.completedByDay[d.toDateString()] || {})[2]);
  if (!fridays.length) return null;
  const rows = fridays.map((d) => {
    const key = d.toDateString();
    const rec = (data.jumuahByDay || {})[key] || {};
    const prayed = !!(data.completedByDay[key] || {})[2] || !!((data.qadaRecords || {})[key] || {})[2];
    const isToday = d.getTime() === today.getTime();
    let st = 'missed';
    if (prayed && rec.choice === 'dhuhr') st = 'dhuhr';
    else if (prayed) st = 'jumuah';
    else if (isToday) st = 'today';
    return { d, st, reason: rec.reason };
  });
  const jumuah = rows.filter((r) => r.st === 'jumuah').length;
  const dhuhr = rows.filter((r) => r.st === 'dhuhr').length;
  const notExcused = (r) => r.st === 'missed' || (r.st === 'dhuhr' && !EXCUSED.includes(r.reason));
  const past = rows.filter((r) => r.st !== 'today');
  const inRow = past.slice(0, 3).length === 3 && past.slice(0, 3).every(notExcused);
  const ofFive = past.slice(0, 5).filter(notExcused).length >= 3;
  const colour = { jumuah: th.ok, dhuhr: th.amber, missed: th.red, today: th.faint };
  return (
    <View>
      <SectionLabel right={<Label>{t('{n} of the last {m}', { n: jumuah, m: past.length })}</Label>}>{t("Jumu'ah")}</SectionLabel>
      <Card style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[...rows].reverse().map((r) => (
            <Press key={r.d.toDateString()} onPress={() => nav.openSheet('prayer', { name: 'Dhuhr', date: r.d })} style={{ flex: 1, alignItems: 'center' }} scaleTo={0.95}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: r.st === 'today' ? 'transparent' : colour[r.st], borderWidth: 1.5, borderColor: colour[r.st], borderStyle: r.st === 'today' ? 'dashed' : 'solid' }} />
              <Body size={9.5} color={th.muted} style={{ marginTop: 4 }}>{t.num(r.d.getDate())}</Body>
            </Press>
          ))}
        </View>
        <Body size={11.5} color={th.muted} style={{ marginTop: 10 }}>{t("{a} Jumu'ah · {b} Dhuhr instead · {c} missed", { a: jumuah, b: dhuhr, c: past.filter((r) => r.st === 'missed').length })}</Body>
        {inRow || ofFive ? (
          <View style={{ marginTop: 10, borderTopWidth: 1, borderColor: th.line, paddingTop: 10 }}>
            <Arabic size={18} style={{ textAlign: 'right' }}>{JUMUAH_AYAH.ar}</Arabic>
            <Body size={12} color={th.muted} style={{ marginTop: 4 }}>{t.lang === 'bn' ? JUMUAH_AYAH.bn : JUMUAH_AYAH.en}</Body>
            <Body size={11} weight="semi" color={th.accent} style={{ marginTop: 3 }}>{t('Al-Jumu‘ah 62:9')}</Body>
          </View>
        ) : null}
      </Card>
    </View>
  );
}

function GuidesView() {
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const app = useApp();
  const [q, setQ] = useState('');
  const lang = t.lang === 'bn' ? 'bn' : 'en';
  const learned = SURAHS.filter((x) => (app.data.surahsLearned || {})[x.n]).length;
  const term = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!term) return null;
    const has = (...xs) => xs.some((x) => (x || '').toLowerCase().includes(term));
    const out = [];
    GUIDES.forEach((g) => { if (has(g.title.en, g.title.bn, g.intro.en, g.intro.bn, ...g.steps.map((s) => s.en), ...g.steps.map((s) => s.bn))) out.push({ kind: t('Guide'), icon: 'book-open', title: g.title[lang], go: () => nav.push('guide', { id: g.id }) }); });
    DUAS.forEach((d) => {
      const dt = duaText(d, t.lang);
      if (has(d.title, d.translation, d.transliteration, d.category, dt.title, dt.translation)) out.push({ kind: t('Dua'), icon: 'star', title: dt.title, go: () => nav.push('dua', { id: d.id }) });
    });
    SURAHS.forEach((x) => { if (has(x.name, x.nameBn, x.meaning, ...x.verses.map((v) => v.en), ...x.verses.map((v) => v.bn))) out.push({ kind: t('Surah'), icon: 'book', title: lang === 'bn' ? x.nameBn : x.name, go: () => nav.push('surahs', { n: x.n }) }); });
    SETTINGS_INDEX.forEach(([label, target, words]) => {
      if (has(label, translate('bn', label), words)) {
        out.push({ kind: t('Setting'), icon: 'settings', title: t(label), go: () => goSetting(nav, app, t, target) });
      }
    });
    return out.slice(0, 40);
  }, [term, t.lang]);
  return (
    <View>
      <Input value={q} onChangeText={setQ} placeholder={t('Search duas, guides, surahs, settings')} autoCorrect={false} returnKeyType="search" style={{ marginTop: 14 }} />
      {results ? (
        <Card style={{ paddingVertical: 2, marginTop: 10 }}>
          {results.length ? results.map((r, i) => (
            <Press key={i} onPress={r.go} scaleTo={0.99}>
              {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
                <Feather name={r.icon} size={14} color={th.accent} />
                <View style={{ flex: 1 }}>
                  <Body size={13.5} weight="med" numberOfLines={1}>{r.title}</Body>
                  <Body size={11} color={th.muted}>{r.kind}</Body>
                </View>
                <Feather name="chevron-right" size={16} color={th.faint} />
              </View>
            </Press>
          )) : <Body size={13} color={th.muted} style={{ padding: 14 }}>{t('Nothing found')}</Body>}
        </Card>
      ) : null}
      {!results ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {[
            { id: 'quran', ar: 'القرآن', label: t('Quran'), sub: (app.data.quran || {}).last ? t('Continue reading') : t('Bangla and English') },
            { id: 'names', ar: 'الأسماء', label: t('99 Names'), sub: t('{n} of 99 learnt', { n: Object.values(app.data.namesLearnt || {}).filter(Boolean).length }) },
          ].map((x) => (
            <Card key={x.id} active onPress={() => (x.id === 'quran' && (app.data.quran || {}).last ? nav.push('quran', { surah: app.data.quran.last.s, ayah: app.data.quran.last.a }) : nav.push(x.id))} style={{ flex: 1, padding: 12 }}>
              <Arabic size={20} color={th.accent} style={{ lineHeight: 36, textAlign: 'left' }}>{x.ar}</Arabic>
              <Body size={14} weight="semi">{x.label}</Body>
              <Body size={11} color={th.muted} numberOfLines={1}>{x.sub}</Body>
            </Card>
          ))}
        </View>
      ) : null}
      {results ? null : GUIDE_GROUPS.map((gr) => (
        <View key={gr.id}>
          <SectionLabel>{gr[lang]}</SectionLabel>
          <Card style={{ paddingVertical: 2 }}>
            {GUIDES.filter((g) => g.group === gr.id).map((g, i) => (
              <Press key={g.id} onPress={() => nav.push('guide', { id: g.id })} scaleTo={0.99}>
                {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={gr.icon} size={14} color={th.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body size={14} weight="med">{g.title[lang]}</Body>
                    <Body size={11.5} color={th.muted}>{t('{n} steps', { n: g.steps.length })}</Body>
                  </View>
                  <Feather name="chevron-right" size={16} color={th.faint} />
                </View>
              </Press>
            ))}
            {gr.id === 'salah' ? (
              <Press onPress={() => nav.push('surahs')} scaleTo={0.99}>
                <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="book" size={14} color={th.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body size={14} weight="med">{t('Surahs for salah')}</Body>
                    <Body size={11.5} color={th.muted}>{t('{n} of {m} memorised', { n: learned, m: SURAHS.length })}</Body>
                  </View>
                  <Feather name="chevron-right" size={16} color={th.faint} />
                </View>
              </Press>
            ) : null}
          </Card>
        </View>
      ))}
      {!results ? <Body size={11} color={th.faint} style={{ marginTop: 10 }}>{t('Based on Bahishti Zewar (Hanafi). Each guide shows its reference.')}</Body> : null}
    </View>
  );
}

function KalimaCard({ k }) {
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const kt = kalimaText(k, t.lang);
  return (
    <Card onPress={() => nav.push('dua', { kalima: k.id })} style={{ padding: 14, marginBottom: 10 }}>
      <Label size={8.5} color={th.accent}>{kt.title}</Label>
      <Arabic size={21} style={{ textAlign: 'right', marginTop: 6 }}>{k.arabic}</Arabic>
      <Body size={12} color={th.muted} style={{ fontStyle: 'italic', marginTop: 2 }} numberOfLines={2}>{k.transliteration}</Body>
      <Body size={12.5} style={{ marginTop: 4 }} numberOfLines={3}>{kt.translation}</Body>
      {kt.untranslated ? <Body size={10.5} color={th.faint} style={{ marginTop: 3 }}>{t('English meaning · Bangla not added yet')}</Body> : null}
    </Card>
  );
}

function DuaCard({ d, fav, onFav }) {
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const dt = duaText(d, t.lang);
  return (
    <Card onPress={() => nav.push('dua', { id: d.id })} style={{ padding: 14, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Label size={8} color={th.accent} style={{ flex: 1 }}>{categoryName(d.category, t.lang)}</Label>
        <Press onPress={onFav} hitSlop={12} haptic accessibilityLabel={fav ? t('Remove from saved') : t('Save')}>
          <Feather name="star" size={17} color={fav ? th.accent : th.faint} style={fav ? { opacity: 1 } : null} />
        </Press>
      </View>
      <Serif size={16} style={{ marginTop: 2 }}>{dt.title}</Serif>
      <Arabic size={20} style={{ textAlign: 'right', marginTop: 4 }} numberOfLines={3}>{d.arabic}</Arabic>
      <Body size={12.5} color={th.muted} numberOfLines={2}>{dt.translation}</Body>
      {dt.untranslated ? <Body size={10.5} color={th.faint} style={{ marginTop: 3 }}>{t('English meaning · Bangla not added yet')}</Body> : null}
    </Card>
  );
}

export default function IbadahScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const [tab, setTab] = useState('daily');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const favs = app.data.favoriteDuaIds || [];
  const toggleFav = (id) => app.update((p) => ({ favoriteDuaIds: (p.favoriteDuaIds || []).includes(id) ? p.favoriteDuaIds.filter((x) => x !== id) : [...(p.favoriteDuaIds || []), id] }));

  const duas = useMemo(() => {
    if (tab !== 'duas') return [];
    if (cat === 'kalimas') return KALIMAS.map((k) => ({ ...k, isKalima: true }));
    const term = q.trim().toLowerCase();
    const feeling = FEELINGS.find((f) => `feel:${f.id}` === cat);
    if (feeling) return feeling.ids.map((id) => DUAS.find((d) => d.id === id)).filter(Boolean);
    return DUAS.filter((d) => {
      if (cat === 'saved' && !favs.includes(d.id)) return false;
      if (cat !== 'All' && cat !== 'saved' && d.category !== cat) return false;
      if (!term) return true;
      const dt = duaText(d, t.lang);
      return [d.title, d.translation, d.transliteration, d.category, d.note || '', d.source || '', dt.title, dt.translation].some((x) => (x || '').toLowerCase().includes(term));
    });
  }, [tab, q, cat, favs, t.lang]);

  const header = (
    <View>
      <ScreenTitle
        title={t('Ibadah')} arabic="عبادة" sub={t('Your daily worship')}
        right={(
          <Press onPress={() => nav.push('ask')} accessibilityLabel={t('Ask Deen')} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: th.accentLine, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="search" size={17} color={th.accent} />
          </Press>
        )}
      />
      <Segmented
        style={{ marginTop: 10 }}
        value={tab}
        onChange={(v) => { app.haptic(); setTab(v); }}
        options={[{ id: 'daily', label: t('Daily') }, { id: 'duas', label: t('Duas') }, { id: 'guides', label: t('Guides') }]}
      />
      {tab === 'daily' ? <DailyView /> : null}
      {tab === 'guides' ? <GuidesView /> : null}
      {tab === 'duas' ? (
        <View style={{ marginTop: 14 }}>
          <Input value={q} onChangeText={setQ} placeholder={t('Search {n} duas (e.g. sleep, travel, rain)', { n: DUAS.length })} autoCorrect={false} returnKeyType="search" />
          <Label style={{ marginTop: 12, marginBottom: 8 }}>{t('How are you feeling?')}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {FEELINGS.map((f) => {
              const on = cat === `feel:${f.id}`;
              return (
                <Press key={f.id} onPress={() => setCat(on ? 'All' : `feel:${f.id}`)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: th.line }, on && { borderColor: th.accent, backgroundColor: th.accentSoft }]}>
                  <Feather name={f.icon} size={12} color={on ? th.accent : th.muted} />
                  <Body size={12} weight={on ? 'semi' : 'med'} color={on ? th.accent : th.muted}>{t.lang === 'bn' ? f.bn : f.en}</Body>
                </Press>
              );
            })}
          </View>
          <HScroll style={{ marginTop: 10, marginHorizontal: -L.pad }} contentContainerStyle={{ paddingHorizontal: L.pad }}>
            <Chip label={t('All')} active={cat === 'All'} onPress={() => setCat('All')} />
            <Chip label={t('Saved')} icon="star" active={cat === 'saved'} onPress={() => setCat('saved')} />
            <Chip label={t('Kalimas')} active={cat === 'kalimas'} onPress={() => setCat('kalimas')} />
            {DUA_CATEGORIES.map((c) => <Chip key={c} label={categoryName(c, t.lang)} active={cat === c} onPress={() => setCat(c)} />)}
          </HScroll>
          <Body size={11} color={th.faint} style={{ marginTop: 8, marginBottom: 6 }}>{cat === 'kalimas' ? t('{n} kalimas', { n: KALIMAS.length }) : t('{n} duas', { n: duas.length })}</Body>
        </View>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={duas}
      keyExtractor={(d) => `${d.isKalima ? 'k' : 'd'}${d.id}`}
      renderItem={({ item }) => (item.isKalima ? <KalimaCard k={item} /> : <DuaCard d={item} fav={favs.includes(item.id)} onFav={() => toggleFav(item.id)} />)}
      ListHeaderComponent={header}
      ListEmptyComponent={tab === 'duas' ? <Empty icon={cat === 'saved' ? 'star' : 'search'} title={cat === 'saved' ? t('No saved duas yet') : t('No duas found')} text={cat === 'saved' ? t('Tap the star on any dua to keep it here.') : t('Try another word or a different category.')} /> : null}
      contentContainerStyle={{ paddingTop: L.insets.top + 16, paddingHorizontal: L.pad, paddingBottom: L.bottomSpace }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      windowSize={7}
    />
  );
}
