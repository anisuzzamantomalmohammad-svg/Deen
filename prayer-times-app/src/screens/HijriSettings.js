import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Row, Toggle, Segmented, SectionLabel } from '../ui/kit';
import { ScreenTitle, Stepper } from '../ui/parts';
import { useLayout, hijriLabel, longDate } from '../ui/hooks';
import { nextMonthBoundary } from '../lib/hijri';
import { hijriMonthName } from '../ui/hooks';

export default function HijriSettingsScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { data, update, today } = app;
  const h = app.hijri(today);
  const b = useMemo(() => nextMonthBoundary(today, app.cal), [today, app.cal]);
  const overrides = Object.entries(data.hijriOverrides || {}).filter(([, v]) => v);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={t('Hijri calendar')} sub={t('How Deen decides when each month starts')} />

      <Card active style={{ marginTop: 12, padding: 14 }}>
        <Label size={8.5}>{t('Today')}</Label>
        <Serif size={20} style={{ marginTop: 2 }}>{hijriLabel(t.lang, h)}</Serif>
        {b ? <Body size={12} color={th.muted}>{t('{month} starts {date}', { month: hijriMonthName(t.lang, b.monthIndex), date: longDate(t.lang, b.startsOn) })}</Body> : null}
      </Card>

      <SectionLabel>{t('Method')}</SectionLabel>
      <Segmented
        value={data.hijriMode === 'ummalqura' ? 'ummalqura' : 'auto'}
        onChange={(v) => update({ hijriMode: v })}
        options={[{ id: 'auto', label: t('Moon sighting') }, { id: 'ummalqura', label: t('Umm al-Qura') }]}
      />
      <Body size={12} color={th.muted} style={{ marginTop: 8, lineHeight: 18 }}>
        {data.hijriMode === 'ummalqura'
          ? t('The official Saudi calendar, worked out in advance. Many countries start Ramadan and Eid a day after it.')
          : t('Predicts, for where you are, whether the new crescent can be seen on the 29th evening (Odeh criterion). Works offline and matches local sighting most months.')}
      </Body>
      {data.hijriMode !== 'ummalqura' && !app.rawMonthsReady ? <Body size={11.5} color={th.amber} style={{ marginTop: 6 }}>{t('Working out the moon for your location…')}</Body> : null}

      <SectionLabel>{t('Adjust by days')}</SectionLabel>
      <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Body size={14} weight="med">{data.hijriOffset ? t('{n} day(s)', { n: `${data.hijriOffset > 0 ? '+' : ''}${data.hijriOffset}` }) : t('No adjustment')}</Body>
          <Body size={11.5} color={th.muted}>{t('Shifts every Hijri date, if your masjid is always a day apart')}</Body>
        </View>
        <Stepper value={data.hijriOffset || 0} onMinus={() => update({ hijriOffset: Math.max(-2, (data.hijriOffset || 0) - 1) })} onPlus={() => update({ hijriOffset: Math.min(2, (data.hijriOffset || 0) + 1) })} />
      </Card>

      <SectionLabel>{t('Moon-sighting check')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row first icon="moon" label={t('Ask me on the 29th evening')} sub={t('A notification with a button to move the new month by a day')} right={<Toggle value={data.moonCheck !== false} onChange={(v) => update({ moonCheck: v })} />} />
      </Card>
      {overrides.length ? (
        <>
          <SectionLabel right={<Body size={11.5} weight="semi" color={th.accent} onPress={() => update({ hijriOverrides: {} })}>{t('Clear')}</Body>}>{t('Your corrections')}</SectionLabel>
          <Card style={{ paddingVertical: 2 }}>
            {overrides.map(([k, v], i) => {
              const [yy, mi] = k.split('-').map(Number);
              return <Row key={k} first={i === 0} label={`${hijriMonthName(t.lang, mi)} ${t.num(yy)}`} value={v > 0 ? t('a day later') : t('a day earlier')} />;
            })}
          </Card>
        </>
      ) : null}
      <Body size={11} color={th.faint} style={{ marginTop: 14 }}>{t('Ramadan, Eid, the White Days, fasting alerts and the calendar all follow these settings.')}</Body>
    </ScrollView>
  );
}
