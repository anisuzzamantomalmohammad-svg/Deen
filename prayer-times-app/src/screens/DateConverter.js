// Convert between Gregorian and Hijri dates, using the same Hijri calendar
// the app uses everywhere else (moon sighting or Umm al-Qura, plus any offset).
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Segmented, IconBtn, PrimaryButton } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout, monthName, hijriMonthName, hijriLabel, longDate } from '../ui/hooks';
import { addDays } from '../lib/prayer';
import { nextHijriDate } from '../lib/birthday';

function Field({ label, value, onPrev, onNext }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
      <Label size={8.5} style={{ width: 62 }}>{label}</Label>
      <IconBtn name="chevron-left" onPress={onPrev} label={t('Previous')} size={16} />
      <Serif size={17} numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, textAlign: 'center' }}>{value}</Serif>
      <IconBtn name="chevron-right" onPress={onNext} label={t('Next')} size={16} />
    </View>
  );
}

// The Gregorian date of a Hijri date, searched around an estimate.
export function hijriToGregorian(hy, hm, hd, today, hijri) {
  const h0 = hijri(today);
  const est = Math.round((hy - h0.year) * 354.367 + (hm - h0.monthIndex) * 29.53 + (hd - h0.day));
  for (let k = 0; k <= 8; k++) {
    for (const s of k ? [est - k, est + k] : [est]) {
      const d = addDays(today, s);
      const h = hijri(d);
      if (h.year === hy && h.monthIndex === hm && h.day === hd) return d;
    }
  }
  return null;
}

export default function DateConverterScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { today, hijri, data } = app;
  const [mode, setMode] = useState('g2h');
  const [g, setG] = useState(() => ({ y: today.getFullYear(), m: today.getMonth(), d: today.getDate() }));
  const h0 = hijri(today);
  const [hh, setH] = useState(() => ({ y: h0.year, m: h0.monthIndex, d: h0.day }));
  const [saved, setSaved] = useState(false);

  const gDays = new Date(g.y, g.m + 1, 0).getDate();
  const gDate = new Date(g.y, g.m, Math.min(g.d, gDays));
  const gResult = useMemo(() => hijri(gDate), [gDate.getTime(), hijri]);
  const hResult = useMemo(() => hijriToGregorian(hh.y, hh.m, hh.d, today, hijri), [hh.y, hh.m, hh.d, hijri]);

  const setGm = (dm) => setG((p) => {
    const n = new Date(p.y, p.m + dm, 1);
    return { y: n.getFullYear(), m: n.getMonth(), d: p.d };
  });
  const setHm = (dm) => setH((p) => {
    let m = p.m + dm;
    let y = p.y;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    return { ...p, m, y };
  });
  const method = app.cal.mode === 'auto' ? t('Moon sighting: auto') : t('Umm al-Qura');
  const bday = data.hijriBirthday;
  const isBday = bday && bday.monthIndex === gResult.monthIndex && bday.day === gResult.day;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={t('Date converter')} sub={method} />
      <Segmented
        style={{ marginTop: 10 }}
        value={mode}
        onChange={setMode}
        options={[{ id: 'g2h', label: t('To Hijri') }, { id: 'h2g', label: t('To Gregorian') }]}
      />
      {mode === 'g2h' ? (
        <>
          <Card style={{ marginTop: 14, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Field label={t('Day')} value={t.num(gDate.getDate())} onPrev={() => setG((p) => ({ ...p, d: p.d > 1 ? Math.min(p.d, gDays) - 1 : gDays }))} onNext={() => setG((p) => ({ ...p, d: p.d < gDays ? p.d + 1 : 1 }))} />
            <Field label={t('Month')} value={monthName(t.lang, g.m)} onPrev={() => setGm(-1)} onNext={() => setGm(1)} />
            <Field label={t('Year')} value={t.num(g.y)} onPrev={() => setG((p) => ({ ...p, y: p.y - 1 }))} onNext={() => setG((p) => ({ ...p, y: p.y + 1 }))} />
          </Card>
          <Card active style={{ marginTop: 12, padding: 16 }}>
            <Label size={8.5}>{longDate(t.lang, gDate, true)}</Label>
            <Serif size={24} style={{ marginTop: 4 }}>{hijriLabel(t.lang, gResult)}</Serif>
          </Card>
          {isBday || saved ? (
            <Body size={12} color={th.ok} style={{ marginTop: 10 }}>{t('Saved as your Hijri birthday.')}</Body>
          ) : (
            <PrimaryButton
              ghost
              icon="gift"
              style={{ marginTop: 12 }}
              label={t('Save as my Hijri birthday')}
              onPress={() => {
                app.update({ hijriBirthday: { monthIndex: gResult.monthIndex, day: gResult.day, year: gResult.year } });
                setSaved(true);
              }}
            />
          )}
          {bday ? (
            <Body size={11.5} color={th.muted} style={{ marginTop: 8 }}>
              {(() => {
                const n = nextHijriDate(bday, today, hijri);
                return n ? t('Your next Hijri birthday: {date}', { date: longDate(t.lang, n, true) }) : '';
              })()}
            </Body>
          ) : null}
        </>
      ) : (
        <>
          <Card style={{ marginTop: 14, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Field label={t('Day')} value={t.num(hh.d)} onPrev={() => setH((p) => ({ ...p, d: p.d > 1 ? p.d - 1 : 30 }))} onNext={() => setH((p) => ({ ...p, d: p.d < 30 ? p.d + 1 : 1 }))} />
            <Field label={t('Month')} value={hijriMonthName(t.lang, hh.m)} onPrev={() => setHm(-1)} onNext={() => setHm(1)} />
            <Field label={t('Year')} value={t.num(hh.y)} onPrev={() => setH((p) => ({ ...p, y: p.y - 1 }))} onNext={() => setH((p) => ({ ...p, y: p.y + 1 }))} />
          </Card>
          <Card active style={{ marginTop: 12, padding: 16 }}>
            <Label size={8.5}>{hijriLabel(t.lang, { day: hh.d, monthIndex: hh.m, year: hh.y })}</Label>
            {hResult ? (
              <Serif size={24} style={{ marginTop: 4 }}>{longDate(t.lang, hResult, true)}</Serif>
            ) : (
              <Body size={13} color={th.muted} style={{ marginTop: 6 }}>{t('This month has 29 days in the calendar used here.')}</Body>
            )}
          </Card>
        </>
      )}
      <Body size={11} color={th.faint} style={{ marginTop: 16 }}>{t('Dates follow the moon and may differ by a day from your local announcement.')}</Body>
    </ScrollView>
  );
}
