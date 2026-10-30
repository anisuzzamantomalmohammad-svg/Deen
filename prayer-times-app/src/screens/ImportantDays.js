// Every important day of one Hijri year, grouped by month, with filters.
// Swipe sideways (or use the arrows) to change the year.
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Press, Arabic, IconBtn, Chip, Toggle } from '../ui/kit';
import { useLayout, hijriMonthName, monthShort, HIJRI_MONTHS_AR, WEEK_SHORT } from '../ui/hooks';
import { sameDay } from '../lib/prayer';
import { yearEvents } from '../lib/events';
import { EVENT_FILTERS, eventInFilter } from '../data/events';
import { eventText } from '../data/eventText';
import { findYearStart } from './HijriYear';
import { SwipeView, useSlide, HScroll } from '../ui/swipe';
import { daysAwayText } from './Home';

export default function ImportantDaysScreen({ year: startYear }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { today, hijri, data } = app;
  const [year, setYear] = useState(startYear || hijri(today).year);
  const [filter, setFilter] = useState('all');
  const { step, style } = useSlide();
  const history = data.showHistory !== false;

  const list = useMemo(() => {
    const start = findYearStart(year, today, hijri);
    return yearEvents(start, hijri, { history, coords: app.coords, eclipses: data.showEclipses !== false });
  }, [year, hijri, history, app.coords, data.showEclipses]);

  const shown = list.filter((e) => eventInFilter(e.evt, filter));
  const groups = [];
  for (const e of shown) {
    const g = groups[groups.length - 1];
    if (g && g.monthIndex === e.h.monthIndex) g.items.push(e);
    else groups.push({ monthIndex: e.h.monthIndex, items: [e] });
  }
  const change = (d) => {
    app.haptic();
    step(d, () => setYear((y) => y + d));
  };
  const nextIdx = shown.findIndex((e) => (e.end || e.date) >= today);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IconBtn name="chevron-left" onPress={nav.pop} label={t('Back')} />
        <Serif size={24} style={{ flex: 1 }}>{t('Important days')}</Serif>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
        <IconBtn name="chevron-left" onPress={() => change(-1)} label={t('Previous year')} />
        <Serif size={17} color={th.accent} style={{ minWidth: 96, textAlign: 'center' }}>{t.lang === 'bn' ? `${t.num(year)} হিজরি` : `${year} AH`}</Serif>
        <IconBtn name="chevron-right" onPress={() => change(1)} label={t('Next year')} />
      </View>

      <HScroll style={{ marginTop: 12, marginHorizontal: -L.pad }} contentContainerStyle={{ paddingHorizontal: L.pad }}>
        {EVENT_FILTERS.map((f) => (
          <Chip key={f.id} label={t.lang === 'bn' ? f.bn : f.en} active={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </HScroll>

      <SwipeView onNext={() => change(1)} onPrev={() => change(-1)} style={style}>
        {groups.length === 0 ? (
          <Body size={13} color={th.muted} style={{ marginTop: 24, textAlign: 'center' }}>{t('Nothing in this filter this year.')}</Body>
        ) : null}
        {groups.map((g) => (
          <View key={`${g.monthIndex}-${g.items[0].date.toDateString()}`} style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <Serif size={17}>{hijriMonthName(t.lang, g.monthIndex)}</Serif>
              <Arabic size={14} color={th.accent} style={{ lineHeight: 24 }}>{HIJRI_MONTHS_AR[g.monthIndex]}</Arabic>
            </View>
            <View style={{ borderWidth: 1, borderColor: th.line, borderRadius: 16, backgroundColor: th.soft }}>
              {g.items.map((e, i) => {
                const tx = eventText(e.evt, t.lang);
                const past = (e.end || e.date) < today && !sameDay(e.end || e.date, today);
                const isNext = shown.indexOf(e) === nextIdx;
                const hist = e.evt.kind === 'history';
                const custom = e.evt.kind === 'custom';
                const hd = e.end ? `${t.num(e.h.day)}–${t.num(e.h.day + (e.evt.hijri.span - 1))}` : t.num(e.h.day);
                return (
                  <Press key={`${e.evt.id}${i}`} onPress={() => nav.openSheet('event', { id: e.evt.id, date: e.date })} scaleTo={0.99}>
                    {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
                    <View style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, gap: 12 }, past && { opacity: 0.5 }]}>
                      <View style={{ width: 44, alignItems: 'center' }}>
                        <Serif bold size={e.end ? 14 : 19} color={hist || custom ? th.muted : th.occ} numberOfLines={1} maxScale={1.12}>{hd}</Serif>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Serif size={15} numberOfLines={2}>{tx.title}</Serif>
                        <Body size={11.5} color={th.muted}>
                          {`${WEEK_SHORT[t.lang === 'bn' ? 'bn' : 'en'][e.date.getDay()]} ${t.num(e.date.getDate())} ${monthShort(t.lang, e.date.getMonth())}${isNext ? ` · ${daysAwayText(t, e.date, today)}` : ''}`}
                        </Body>
                        {tx.note ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                            <Feather name={e.evt.note === 'weak' || e.evt.note === 'noBasis' ? 'alert-triangle' : 'info'} size={10} color={e.evt.note === 'weak' || e.evt.note === 'noBasis' ? th.amber : th.faint} />
                            <Body size={10.5} color={e.evt.note === 'weak' || e.evt.note === 'noBasis' ? th.amber : th.faint}>{tx.note}</Body>
                          </View>
                        ) : null}
                      </View>
                      {hist ? <Feather name="book-open" size={14} color={th.faint} /> : <Feather name="chevron-right" size={16} color={th.faint} />}
                    </View>
                  </Press>
                );
              })}
            </View>
          </View>
        ))}
      </SwipeView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, paddingVertical: 4 }}>
        <View style={{ flex: 1 }}>
          <Body size={13.5} weight="semi">{t('Show history')}</Body>
          <Body size={11.5} color={th.muted}>{t('Badr, the conquest of Makkah and other events')}</Body>
        </View>
        <Toggle value={history} onChange={(v) => app.update({ showHistory: v })} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingVertical: 4 }}>
        <View style={{ flex: 1 }}>
          <Body size={13.5} weight="semi">{t('Show eclipses')}</Body>
          <Body size={11.5} color={th.muted}>{t('Only the ones you can see from where you are')}</Body>
        </View>
        <Toggle value={data.showEclipses !== false} onChange={(v) => app.update({ showEclipses: v })} />
      </View>
      <Body size={11} color={th.faint} style={{ marginTop: 16 }}>{t('Dates follow the moon and may differ by a day from your local announcement.')}</Body>
    </ScrollView>
  );
}
