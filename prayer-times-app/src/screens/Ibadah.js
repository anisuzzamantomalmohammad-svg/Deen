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
import { GUIDES, GUIDE_GROUPS } from '../data/guides';
import { SURAHS } from '../data/surahs';
import { SETTINGS_INDEX } from './Settings';
import { translate } from '../i18n';

function useNafilWindows() {
  const app = useApp();
  const { today, getDay, coords, data } = app;
  const tz = coords.timezone;
  const now = new Date();
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
  const items = [
    { key: 'tahajjud', info: 'tahajjud', icon: 'moon', win: fmt(w.tahajjud[0], w.tahajjud[1]) },
    { key: 'duha', info: 'duha', icon: 'sun', win: fmt(w.duha[0], w.duha[1]) },
    { key: 'dhikr', info: 'adhkar', icon: 'repeat', win: t('After Fajr and after Asr') },
    ...(!ramadan ? [{ key: 'roja', info: 'fast', icon: 'sunrise', win: t('Seheri to Iftar') }] : []),
  ];
  const doneCount = items.filter((i) => app.isSunnahDone(today, i.key)).length;
  const I = infoText(t.lang).NAWAFIL;
  const ctx = { today, now: new Date(), getDay: app.getDay };
  const missed = calendarMissed(app.data, ctx);
  const older = olderTotal(app.data);
  const total = missed.length + older;
  const hist = qadaHistory(app.data);
  const tb = app.data.tasbih || {};
  const shown = missed.slice(0, 5);

  return (
    <View>
      <Card onPress={() => nav.push('tasbih')} style={{ marginTop: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }} active>
        <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: th.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Serif bold size={t.lang === 'bn' ? 18 : 15} color={th.accent}>{t.num(tb.count || 0)}</Serif>
        </View>
        <View style={{ flex: 1 }}>
          <Serif size={17}>{t('Tasbih counter')}</Serif>
          <Body size={11.5} color={th.muted}>{t('Tap anywhere to count · target {n}', { n: tb.target || 33 })}</Body>
        </View>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </Card>

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
              <Press onPress={() => app.toggleSunnah(today, it.key)} hitSlop={8} style={{ padding: 6 }} accessibilityRole="checkbox" accessibilityLabel={I[it.info].title} accessibilityState={{ checked: app.isSunnahDone(today, it.key) }}>
                <Tick done={app.isSunnahDone(today, it.key)} />
              </Press>
            </View>
          </View>
        ))}
      </Card>

      <SectionLabel right={<Label color={total ? th.amber : th.muted}>{total ? t('{n} to make up', { n: total }) : t('All caught up')}</Label>}>{t('Qada · missed prayers')}</SectionLabel>
      <Card active onPress={() => nav.push('qadaHistory')} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: th.accent, alignItems: 'center', justifyContent: 'center' }}>
          {total ? <Serif bold size={t.lang === 'bn' ? 18 : 15} color={th.accent}>{t.num(total)}</Serif> : <Feather name="check" size={18} color={th.accent} />}
        </View>
        <View style={{ flex: 1 }}>
          <Serif size={17}>{total ? t('To make up') : t('All caught up')}</Serif>
          <Body size={11.5} color={th.muted}>{total ? t('{a} from your calendar · {b} from before', { a: missed.length, b: older }) : hist.length ? t('{n} made up so far', { n: hist.length }) : t('Nothing missed in your calendar')}</Body>
        </View>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </Card>
      {shown.length ? (
        <Card style={{ marginTop: 10, paddingVertical: 2 }}>
          {shown.map((x, i) => (
            <View key={`${x.date.toDateString()}${x.name}`}>
              {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 14, paddingRight: 8 }}>
                <Press onPress={() => nav.openSheet('day', { date: x.date })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }} scaleTo={0.99}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="rotate-ccw" size={14} color={th.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Serif size={15}>{t(x.name)}</Serif>
                    <Body size={11.5} color={th.muted}>{`${shortDate(t.lang, x.date)} · ${hijriLabel(t.lang, app.hijri(x.date), false)}`}</Body>
                  </View>
                </Press>
                <Press onPress={() => nav.openSheet('makeUp', { date: x.date, name: x.name })} hitSlop={8} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel={t('Mark {name} as made up', { name: t(x.name) })}>
                  <Tick done={false} />
                </Press>
              </View>
            </View>
          ))}
          {missed.length > shown.length ? (
            <Press onPress={() => nav.push('qadaHistory')} style={{ paddingVertical: 10, alignItems: 'center', borderTopWidth: 1, borderColor: th.line }}>
              <Body size={12.5} weight="semi" color={th.accent}>{t('{n} more ›', { n: missed.length - shown.length })}</Body>
            </Press>
          ) : null}
        </Card>
      ) : null}
      {shown.length ? <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{t('Tap the circle when you\u2019ve made it up. Tap the row to open that day.')}</Body> : null}
      <Card style={{ marginTop: 10, paddingVertical: 2 }}>
        <Row first icon="hash" label={t('From before you used Deen')} sub={older ? t('{n} to make up', { n: older }) : t('Add any older missed prayers')} onPress={() => nav.push('qadaOlder')} />
        <Row icon="list" label={t('History')} sub={hist.length ? t('Last: {name} · prayed {date}', { name: t(hist[0].name), date: shortDate(t.lang, hist[0].on) }) : t('Nothing made up yet')} onPress={() => nav.push('qadaHistory')} />
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
        out.push({ kind: t('Setting'), icon: 'settings', title: t(label), go: () => {
          if (target === 'location') nav.openSheet('location');
          else if (target === 'alerts') nav.push('alerts');
          else if (target.startsWith('tool:')) nav.push(target.slice(5));
          else if (target.startsWith('sheet:')) nav.openSheet(target.slice(6));
          else nav.push('settingsPage', { page: target });
        } });
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
      ) : GUIDE_GROUPS.map((gr) => (
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
      <ScreenTitle title={t('Ibadah')} arabic="عبادة" sub={t('Your daily worship')} />
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
