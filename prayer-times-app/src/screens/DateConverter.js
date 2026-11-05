// Convert between English (Gregorian) and Hijri dates, using the same Hijri
// calendar the app uses everywhere else (moon sighting or Umm al-Qura, plus
// any offset). Also home to the Hijri birthday row and its sheet.
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Segmented, IconBtn, PrimaryButton, Press } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout, monthName, hijriMonthName, hijriLabel, longDate, shortDate } from '../ui/hooks';
import { addDays } from '../lib/prayer';
import { HIJRI_MONTHS_AR } from '../lib/hijri';
import { nextHijriDate } from '../lib/birthday';

const parseNum = (s) => parseInt(String(s).replace(/[০-৯]/g, (c) => '০১২৩৪৫৬৭৮৯'.indexOf(c)).replace(/[^0-9]/g, ''), 10);

// A number you can type, or step with the arrows. Bangla digits work too.
export function NumInput({ value, min, max, onSet, label }) {
  const th = useTheme();
  const t = useT();
  const [text, setText] = useState(t.num(value));
  useEffect(() => setText(t.num(value)), [value, t.lang]);
  const commit = () => {
    const n = parseNum(text);
    if (Number.isNaN(n)) setText(t.num(value));
    else {
      const c = Math.min(max, Math.max(min, n));
      onSet(c);
      setText(t.num(c));
    }
  };
  return (
    <TextInput
      value={text}
      onChangeText={(s) => {
        setText(s);
        const n = parseNum(s);
        if (!Number.isNaN(n) && n >= min && n <= max) onSet(n);
      }}
      onBlur={commit}
      onSubmitEditing={commit}
      keyboardType="number-pad"
      returnKeyType="done"
      selectTextOnFocus
      accessibilityLabel={label}
      maxLength={String(max).length}
      style={{ flex: 1, minWidth: 0, width: 10, textAlign: 'center', color: th.ink, fontFamily: 'Fraunces_400Regular', fontSize: 19, paddingVertical: 6, marginHorizontal: 8, borderBottomWidth: 1, borderColor: th.line }}
    />
  );
}

export function Field({ label, value, onPrev, onNext, num, onPressValue }) {
  const th = useTheme();
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
      <Label size={8.5} style={{ width: 62 }}>{label}</Label>
      <IconBtn name="chevron-left" onPress={onPrev} label={t('Previous')} size={16} />
      {num ? <NumInput {...num} label={label} /> : (
        <Press onPress={onPressValue} scaleTo={0.97} accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, marginHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderColor: th.line }}>
          <Serif size={17} numberOfLines={1} adjustsFontSizeToFit>{value}</Serif>
          <Feather name="chevron-down" size={13} color={th.muted} />
        </Press>
      )}
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

// Day / month / year fields for either calendar. `kind` is 'g' or 'h'.
export function DateFields({ kind, value, onChange }) {
  const t = useT();
  const [grid, setGrid] = useState(false);
  const v = value;
  const gDays = new Date(v.y, v.m + 1, 0).getDate();
  const maxD = kind === 'g' ? gDays : 30;
  const yr = kind === 'g' ? [1900, 2150] : [1318, 1580];
  const setM = (dm) => {
    let m = v.m + dm;
    let y = v.y;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    onChange({ ...v, m, y });
  };
  const pickMonth = () => setGrid((x) => !x);
  return (
    <Card style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
      <Field label={t('Day')} num={{ value: Math.min(v.d, maxD), min: 1, max: maxD, onSet: (n) => onChange({ ...v, d: n }) }} onPrev={() => onChange({ ...v, d: v.d > 1 ? Math.min(v.d, maxD) - 1 : maxD })} onNext={() => onChange({ ...v, d: v.d < maxD ? v.d + 1 : 1 })} />
      <Field label={t('Month')} value={kind === 'g' ? monthName(t.lang, v.m) : hijriMonthName(t.lang, v.m)} onPrev={() => setM(-1)} onNext={() => setM(1)} onPressValue={pickMonth} />
      {grid ? <View style={{ paddingVertical: 6 }}><MonthGrid kind={kind} value={v.m} onPick={(m) => { onChange({ ...v, m }); setGrid(false); }} /></View> : null}
      <Field label={t('Year')} num={{ value: v.y, min: yr[0], max: yr[1], onSet: (n) => onChange({ ...v, y: n }) }} onPrev={() => onChange({ ...v, y: v.y - 1 })} onNext={() => onChange({ ...v, y: v.y + 1 })} />
    </Card>
  );
}

// 12 months in a 3 × 4 grid (Hijri months also in Arabic).
export function MonthGrid({ kind, value, onPick }) {
  const th = useTheme();
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {Array.from({ length: 12 }, (_, m) => {
        const on = m === value;
        return (
          <Press key={m} onPress={() => onPick(m)} accessibilityState={{ selected: on }} style={[{ width: '31%', flexGrow: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: th.line, backgroundColor: th.soft }, on && { borderColor: th.accent, backgroundColor: th.accentSoft }]}>
            <Body size={12.5} weight={on ? 'bold' : 'med'} color={on ? th.accent : th.ink} numberOfLines={1} adjustsFontSizeToFit style={{ paddingHorizontal: 4 }}>{kind === 'g' ? monthName(t.lang, m) : hijriMonthName(t.lang, m)}</Body>
            {kind === 'h' ? <Body size={12} color={on ? th.accent : th.muted} style={{ fontFamily: 'Amiri_400Regular' }}>{HIJRI_MONTHS_AR[m]}</Body> : null}
          </Press>
        );
      })}
    </View>
  );
}

// "Your Hijri birthday" row, shown once one is saved.
export function BirthdayRow({ style }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const b = app.data.hijriBirthday;
  if (!b) return null;
  const n = nextHijriDate(b, app.today, app.hijri);
  const days = n ? Math.round((n - app.today) / 86400000) : null;
  return (
    <View style={style}>
      <Label style={{ marginBottom: 8, marginHorizontal: 2 }}>{t('Your Hijri birthday')}</Label>
      <Card onPress={() => nav.openSheet('birthday')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="gift" size={15} color={th.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Body size={14} weight="med">{`${t.num(b.day)} ${hijriMonthName(t.lang, b.monthIndex)}`}</Body>
          {n ? <Body size={11.5} color={th.muted}>{days === 0 ? t('Today!') : t('Next: {date} · in {n} days', { date: `${shortDate(t.lang, n)} ${t.num(n.getFullYear())}`, n: days })}</Body> : null}
        </View>
        <Body size={12.5} color={th.muted}>{t('Change')}</Body>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </Card>
    </View>
  );
}

// Sheet for setting, changing or removing the Hijri birthday.
export function BirthdaySheet({ onClose, initial }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const { today, hijri, data } = app;
  const saved = data.hijriBirthday;
  const [mode, setMode] = useState(initial?.mode || 'g');
  const [g, setG] = useState(() => {
    if (initial?.g) return initial.g;
    if (saved && saved.year) {
      const d = hijriToGregorian(saved.year, saved.monthIndex, Math.min(saved.day, 29), today, hijri);
      if (d) return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
    }
    return { y: 1990, m: 0, d: 1 };
  });
  const [hh, setH] = useState(() => (initial?.h ? initial.h : saved ? { y: saved.year || hijri(today).year - 30, m: saved.monthIndex, d: saved.day } : { y: hijri(today).year - 30, m: 0, d: 1 }));
  const [confirm, setConfirm] = useState(false);
  const gDate = new Date(g.y, g.m, Math.min(g.d, new Date(g.y, g.m + 1, 0).getDate()));
  const result = mode === 'g' ? hijri(gDate) : { year: hh.y, monthIndex: hh.m, day: hh.d };
  const save = () => {
    app.update({ hijriBirthday: { monthIndex: result.monthIndex, day: result.day, year: result.year } });
    app.setToast(t('Hijri birthday saved'));
    onClose();
  };
  const remove = () => {
    if (!confirm) { setConfirm(true); return; }
    app.update({ hijriBirthday: null });
    app.setToast(t('Hijri birthday removed'));
    onClose();
  };
  return (
    <View>
      <Segmented value={mode} onChange={setMode} options={[{ id: 'g', label: t('From my birth date') }, { id: 'h', label: t('Enter Hijri date') }]} />
      <View style={{ marginTop: 12 }}>
        {mode === 'g' ? <DateFields kind="g" value={g} onChange={setG} /> : <DateFields kind="h" value={hh} onChange={setH} />}
      </View>
      <Card active style={{ marginTop: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
        <Label size={8.5}>{t('Your Hijri birthday')}</Label>
        <Serif size={19} style={{ marginTop: 3 }}>{hijriLabel(t.lang, result)}</Serif>
      </Card>
      <PrimaryButton style={{ marginTop: 14 }} label={t('Save')} onPress={save} />
      {saved ? (
        <Card onPress={remove} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: th.redSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="trash-2" size={15} color={th.red} />
          </View>
          <Body size={14} weight="med" color={th.red} style={{ flex: 1 }}>{confirm ? t('Tap again to remove') : t('Remove birthday')}</Body>
        </Card>
      ) : null}
    </View>
  );
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

  const gDays = new Date(g.y, g.m + 1, 0).getDate();
  const gDate = new Date(g.y, g.m, Math.min(g.d, gDays));
  const gResult = useMemo(() => hijri(gDate), [gDate.getTime(), hijri]);
  const hResult = useMemo(() => hijriToGregorian(hh.y, hh.m, hh.d, today, hijri), [hh.y, hh.m, hh.d, hijri]);
  const method = app.cal.mode === 'auto' ? t('Moon sighting: auto') : t('Umm al-Qura');

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={t('Date converter')} sub={method} />
      <Segmented
        style={{ marginTop: 10 }}
        value={mode}
        onChange={setMode}
        options={[{ id: 'g2h', label: t('English date → Hijri') }, { id: 'h2g', label: t('Hijri → English date') }]}
      />
      {mode === 'g2h' ? (
        <>
          <View style={{ marginTop: 14 }}><DateFields kind="g" value={g} onChange={setG} /></View>
          <Card active style={{ marginTop: 12, padding: 16 }}>
            <Label size={8.5}>{longDate(t.lang, gDate, true)}</Label>
            <Serif size={22} numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 4 }}>{hijriLabel(t.lang, gResult)}</Serif>
          </Card>
        </>
      ) : (
        <>
          <View style={{ marginTop: 14 }}><DateFields kind="h" value={hh} onChange={setH} /></View>
          <Card active style={{ marginTop: 12, padding: 16 }}>
            <Label size={8.5}>{hijriLabel(t.lang, { day: hh.d, monthIndex: hh.m, year: hh.y })}</Label>
            {hResult ? (
              <Serif size={22} numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 4 }}>{longDate(t.lang, hResult, true)}</Serif>
            ) : (
              <Body size={13} color={th.muted} style={{ marginTop: 6 }}>{t('This month has 29 days in the calendar used here.')}</Body>
            )}
          </Card>
        </>
      )}
      {data.hijriBirthday ? (
        <BirthdayRow style={{ marginTop: 22 }} />
      ) : (
        <PrimaryButton ghost icon="gift" style={{ marginTop: 14 }} label={t('Save as my Hijri birthday')} onPress={() => nav.openSheet('birthday', { initial: mode === 'g2h' ? { mode: 'g', g } : { mode: 'h', h: hh } })} />
      )}
      <Body size={11} color={th.faint} style={{ marginTop: 16 }}>{t('Dates follow the moon and may differ by a day from your local announcement.')}</Body>
    </ScrollView>
  );
}
