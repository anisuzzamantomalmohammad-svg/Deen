// Qada: the full list to make up plus the history, and the older (undated)
// counters from before the user started tracking in Deen.
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press, Tick, SectionLabel, Empty } from '../ui/kit';
import { ScreenTitle, Stepper } from '../ui/parts';
import { useLayout, shortDate, hijriLabel } from '../ui/hooks';
import { PRAYER_NAMES } from '../lib/prayer';
import { calendarMissed, qadaHistory, reasonLabel, ymd, olderTotal } from '../lib/qada';
import { dayWord } from './QadaParts';

export function QadaHistoryScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const ctx = { today: app.today, now: new Date(), getDay: app.getDay };
  const missed = calendarMissed(app.data, ctx);
  const hist = qadaHistory(app.data);
  const older = olderTotal(app.data);
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={t('Qada')} sub={missed.length + older ? t('{n} to make up', { n: missed.length + older }) : t('All caught up')} />

      <SectionLabel right={<Label>{t('Oldest first')}</Label>}>{t('From your calendar')}</SectionLabel>
      {missed.length ? (
        <Card style={{ paddingVertical: 2 }}>
          {missed.map((x, i) => (
            <View key={`${x.date.toDateString()}${x.name}`}>
              {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 14, paddingRight: 8 }}>
                <Press onPress={() => nav.openSheet('day', { date: x.date })} style={{ flex: 1 }} scaleTo={0.99}>
                  <Serif size={15}>{t(x.name)}</Serif>
                  <Body size={11.5} color={th.muted}>{`${shortDate(t.lang, x.date)} · ${hijriLabel(t.lang, app.hijri(x.date), false)}`}</Body>
                </Press>
                <Press onPress={() => nav.openSheet('makeUp', { date: x.date, name: x.name })} hitSlop={8} style={{ padding: 6 }} accessibilityLabel={t('Mark {name} as made up', { name: t(x.name) })}>
                  <Tick done={false} />
                </Press>
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <Card style={{ padding: 14 }}><Body size={13} color={th.muted}>{t('Nothing missed in your calendar.')}</Body></Card>
      )}
      {older ? (
        <Card onPress={() => nav.push('qadaOlder')} style={{ marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Feather name="hash" size={15} color={th.accent} />
          <Body size={13.5} style={{ flex: 1 }}>{t('{n} more from before you used Deen', { n: older })}</Body>
          <Feather name="chevron-right" size={16} color={th.faint} />
        </Card>
      ) : null}

      <SectionLabel right={<Label>{t('{n} made up', { n: hist.length })}</Label>}>{t('History')}</SectionLabel>
      {hist.length ? (
        <Card style={{ paddingVertical: 2 }}>
          {hist.map((h, i) => (
            <Press key={i} onPress={() => nav.openSheet('day', { date: h.on })} scaleTo={0.99}>
              {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(224,164,58,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="rotate-ccw" size={13} color={th.amber} />
                </View>
                <View style={{ flex: 1 }}>
                  <Body size={13.5}>
                    <Body size={13.5} weight="semi">{t(h.name)}</Body>
                    {h.forDate ? ` ${t('for {date}', { date: shortDate(t.lang, h.forDate) })}` : ` · ${t('older qada')}`}
                  </Body>
                  <Body size={11} color={th.muted} numberOfLines={1}>{`${t('Prayed {date}', { date: dayWord(t, h.on, app.today) })}${reasonLabel(t, h) ? ` · ${reasonLabel(t, h)}` : ''}`}</Body>
                </View>
                <Feather name="chevron-right" size={16} color={th.faint} />
              </View>
            </Press>
          ))}
        </Card>
      ) : (
        <Empty icon="rotate-ccw" title={t('Nothing made up yet')} text={t('When you make up a missed prayer, it shows here with the day you prayed it.')} />
      )}
    </ScrollView>
  );
}

export function QadaOlderScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const qada = app.data.qadaCounts || {};
  const add = (n) => app.update((p) => ({ qadaCounts: { ...p.qadaCounts, [n]: (p.qadaCounts[n] || 0) + 1 } }));
  const madeOne = (n) => {
    if (!qada[n]) return;
    app.update((p) => ({
      qadaCounts: { ...p.qadaCounts, [n]: Math.max(0, (p.qadaCounts[n] || 0) - 1) },
      olderLog: [...(p.olderLog || []).slice(-2000), { name: n, on: ymd(new Date()), at: new Date().toISOString() }],
    }));
    app.haptic('success');
    app.setToast(t('{name} made up today', { name: t(n) }));
  };
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={t('Older qada')} sub={t('Missed before you started tracking, with no date')} />
      <Card style={{ paddingVertical: 2, marginTop: 12 }}>
        {PRAYER_NAMES.map((n, i) => (
          <View key={n}>
            {i > 0 && <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 14 }}>
              <View style={{ flex: 1 }}>
                <Serif size={15}>{t(n)}</Serif>
                <Body size={11} color={th.muted}>{qada[n] ? t('{n} to make up', { n: qada[n] }) : t('All caught up')}</Body>
              </View>
              <Stepper value={qada[n] || 0} onMinus={() => madeOne(n)} onPlus={() => add(n)} />
            </View>
          </View>
        ))}
      </Card>
      <Body size={11.5} color={th.muted} style={{ marginTop: 8, lineHeight: 17 }}>{t('+ adds one you owe. − means you made one up today, and it goes in your History.')}</Body>
    </ScrollView>
  );
}
