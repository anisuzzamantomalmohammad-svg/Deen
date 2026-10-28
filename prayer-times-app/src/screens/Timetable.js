// A full month of prayer times in one table, with the Hijri date and a
// share button that sends the month as plain text (WhatsApp, email...).
import React, { useMemo, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Chip, IconBtn } from '../ui/kit';
import { useLayout, monthName, monthShort, timeStr, WEEK_SHORT } from '../ui/hooks';
import { CALC_METHODS, sameDay } from '../lib/prayer';
import { HIJRI_MONTHS_BN } from '../lib/hijri';
import { SwipeView, useSlide } from '../ui/swipe';

const COLS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const HIJRI_SHORT = ['Muh', 'Saf', 'Rab I', 'Rab II', 'Jum I', 'Jum II', 'Raj', 'Sha', 'Ram', 'Shaw', 'DhQ', 'DhH'];

export default function TimetableScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { today, coords, data } = app;
  const tz = coords.timezone;
  const [offset, setOffset] = useState(0);
  const { step, style: slideStyle } = useSlide();
  const move = (d) => {
    app.haptic();
    step(d, () => setOffset((o) => o + d));
  };
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const y = first.getFullYear();
  const m = first.getMonth();
  const method = CALC_METHODS.find((c) => c.id === data.calcMethod);
  const methodName = data.calcMethod === 'Karachi' ? 'Karachi' : t(method ? method.label : data.calcMethod);

  const rows = useMemo(() => {
    const n = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(y, m, i + 1);
      return { d, times: app.getDay(d), h: app.hijri(d) };
    });
  }, [y, m, app.getDay, app.hijri]);

  const hShort = (h, force) => {
    if (!force && h.day !== 1) return t.num(h.day);
    return `${t.num(h.day)} ${t.lang === 'bn' ? HIJRI_MONTHS_BN[h.monthIndex] : HIJRI_SHORT[h.monthIndex]}`;
  };

  const share = async () => {
    const head = `${app.locationName} · ${monthName(t.lang, m)} ${t.num(y)}\n${methodName} · ${data.asrMethod === 'Hanafi' ? t('Hanafi Asr') : t('Standard Asr')}\n`;
    const colHead = [t('Date'), ...COLS.map((c) => t(c))].join(' | ');
    const lines = rows.map(({ d, times }) => [`${WEEK_SHORT[t.lang === 'bn' ? 'bn' : 'en'][d.getDay()]} ${t.num(d.getDate())}`, ...COLS.map((c) => timeStr(t, times[c], tz, true))].join(' | '));
    try {
      await Share.share({ message: `${head}\n${colHead}\n${lines.join('\n')}\n\n${t('Shared from Deen')}` });
    } catch (e) {
      // dismissed
    }
  };

  const dateW = 52;
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IconBtn name="chevron-left" onPress={nav.pop} label={t('Back')} />
        <View style={{ flex: 1 }}>
          <Serif size={24}>{`${monthName(t.lang, m)} ${t.num(y)}`}</Serif>
          <Body size={11.5} color={th.muted} numberOfLines={1}>{`${app.locationName} · ${methodName} · ${data.asrMethod === 'Hanafi' ? t('Hanafi Asr') : t('Standard Asr')}`}</Body>
        </View>
        <IconBtn name="share-2" onPress={share} label={t('Share')} />
      </View>
      <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 6 }}>
        {[-1, 0, 1].map((k) => {
          const d = new Date(today.getFullYear(), today.getMonth() + offset + k, 1);
          return <Chip key={k} active={k === 0} label={`${k < 0 ? '‹ ' : ''}${monthShort(t.lang, d.getMonth())}${k > 0 ? ' ›' : ''}`} onPress={() => k && move(k)} />;
        })}
      </View>

      <SwipeView onNext={() => move(1)} onPrev={() => move(-1)} style={slideStyle}>
      <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
        <Label size={7.5} style={{ width: dateW }}>{t('Date')}</Label>
        {COLS.map((c) => <Label key={c} size={7.5} numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, textAlign: 'right' }}>{t(c)}</Label>)}
      </View>
      {rows.map(({ d, times, h }, i) => {
        const isToday = sameDay(d, today);
        const fri = d.getDay() === 5;
        const color = isToday ? th.accent : th.ink;
        return (
          <View key={i} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: 1, borderColor: th.line }, isToday && { backgroundColor: th.accentSoft }]}>
            <View style={{ width: dateW }}>
              <Body size={11.5} weight={isToday ? 'bold' : 'med'} color={fri ? th.accent : color}>{`${WEEK_SHORT[t.lang === 'bn' ? 'bn' : 'en'][d.getDay()]} ${t.num(d.getDate())}`}</Body>
              <Body size={9} color={th.faint} numberOfLines={1}>{hShort(h, i === 0)}</Body>
            </View>
            {COLS.map((c) => (
              <Body key={c} size={11.5} weight={isToday ? 'semi' : 'reg'} color={color} numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, textAlign: 'right' }}>
                {timeStr(t, times[c], tz, true)}
              </Body>
            ))}
          </View>
        );
      })}
      </SwipeView>
      <Body size={11} color={th.faint} style={{ marginTop: 10 }}>{t('Fridays are shown in gold. Tap the share button to send this month as text.')}</Body>
    </ScrollView>
  );
}
