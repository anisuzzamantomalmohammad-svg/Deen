// 1.7.0 additions that sit on other screens: the period pause, jamaat
// times, the qada plan, the Friday checklist and look-back, the "all 5"
// moment and My duas.
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Row, Toggle, Segmented, Press, Tick, Input, PrimaryButton, Empty } from '../ui/kit';
import { ScreenTitle, Stepper } from '../ui/parts';
import { useLayout, timeStr, shortDate, longDate } from '../ui/hooks';
import { PRAYER_NAMES, addDays, jamaatTime } from '../lib/prayer';
import { nowDate } from '../lib/clock';
import { calendarMissed, olderTotal, qadaPrayedOn, pauseDayNumber, isPausedDay } from '../lib/qada';
import { rangeStats, streaks } from '../lib/stats';

/* ----------------------------- Period pause ----------------------------- */
export function PauseSheet({ onClose }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const on = !!app.data.pause;
  const n = pauseDayNumber(app.data, app.today);
  return (
    <View>
      <Body size={13.5} style={{ lineHeight: 20 }}>
        {t('For your period. While it’s on, prayers aren’t asked about, don’t count as missed and don’t go on your qada list. In Ramadan each day’s fast goes on your make-up list.')}
      </Body>
      {on ? (
        <Card style={{ marginTop: 12, padding: 14 }} active>
          <Label color={th.accent}>{t('Paused · day {n}', { n })}</Label>
          <Body size={12.5} color={th.muted} style={{ marginTop: 4 }}>{t('Since {date}', { date: longDate(t.lang, new Date(app.data.pause.since)) })}</Body>
        </Card>
      ) : null}
      <PrimaryButton
        style={{ marginTop: 14 }}
        icon={on ? 'play' : 'pause'}
        label={on ? t('Resume prayers') : t('Pause from now')}
        onPress={() => { if (on) app.pauseEnd(); else app.pauseStart(); app.setToast(on ? t('Prayers resumed') : t('Prayers paused')); onClose && onClose(); }}
      />
      <Body size={11.5} color={th.faint} style={{ marginTop: 10, lineHeight: 17 }}>{t('Prayers from these days aren’t made up. Fasts are (Muslim 335).')}</Body>
    </View>
  );
}

export function PauseBanner() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  if (!app.data.pause) return null;
  return (
    <Card style={{ marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }} active>
      <Feather name="pause-circle" size={18} color={th.accent} />
      <Press onPress={() => nav.openSheet('pause')} style={{ flex: 1 }} scaleTo={0.99}>
        <Body size={13.5} weight="semi">{t('Prayers paused · day {n}', { n: pauseDayNumber(app.data, app.today) })}</Body>
        <Body size={11.5} color={th.muted}>{t('Nothing is asked until you resume')}</Body>
      </Press>
      <Press onPress={() => { app.pauseEnd(); app.setToast(t('Prayers resumed')); }} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: th.accentLine }}>
        <Body size={12} weight="semi" color={th.accent}>{t('Resume')}</Body>
      </Press>
    </Card>
  );
}

/* ----------------------------- Jamaat times ----------------------------- */
const J_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
export function JamaatPage() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const { data, update } = app;
  const tz = app.coords.timezone;
  const day = app.getDay(app.today);
  const set = (name, v) => update((p) => {
    const j = { ...(p.jamaat || {}) };
    if (v) j[name] = v; else delete j[name];
    return { jamaat: j };
  });
  return (
    <View>
      <Body size={12.5} color={th.muted} style={{ marginTop: 6, lineHeight: 18 }}>{t('When your masjid prays each prayer. It shows under the time on Home.')}</Body>
      {J_NAMES.map((name) => {
        const j = (data.jamaat || {})[name];
        const mode = j ? j.mode : 'off';
        const at = jamaatTime(data, name, day[name]);
        const shift = (d) => {
          if (mode === 'after') set(name, { mode: 'after', mins: Math.max(0, Math.min(90, (j.mins || 0) + d)) });
          else if (mode === 'fixed') {
            const m = (((j.h * 60 + j.m + d) % 1440) + 1440) % 1440;
            set(name, { mode: 'fixed', h: Math.floor(m / 60), m: m % 60 });
          }
        };
        return (
          <Card key={name} style={{ marginTop: 10, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Body size={14.5} weight="semi">{t(name)}</Body>
              <Body size={11.5} color={th.muted}>{t('Starts {time}', { time: timeStr(t, day[name], tz) })}</Body>
            </View>
            <Segmented
              style={{ marginTop: 10 }}
              value={mode}
              options={[{ id: 'off', label: t('Off') }, { id: 'after', label: t('Minutes after') }, { id: 'fixed', label: t('Fixed time') }]}
              onChange={(m) => {
                if (m === 'off') set(name, null);
                else if (m === 'after') set(name, { mode: 'after', mins: 15 });
                else {
                  const d = new Date(day[name].getTime() + 15 * 60000);
                  const p = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(d).split(':');
                  set(name, { mode: 'fixed', h: +p[0] % 24, m: Math.round(+p[1] / 5) * 5 % 60 });
                }
              }}
            />
            {mode !== 'off' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <View>
                  <Label size={8.5}>{t('Jamaat')}</Label>
                  <Serif bold size={20} color={th.accent}>{mode === 'after' ? t('+{n} min', { n: j.mins || 0 }) : `${String(j.h).padStart(2, '0')}:${String(j.m).padStart(2, '0')}`}</Serif>
                  {at ? <Body size={11} color={th.muted}>{t('Today at {time}', { time: timeStr(t, at, tz) })}</Body> : null}
                </View>
                <Stepper value="" onMinus={() => shift(-5)} onPlus={() => shift(5)} />
              </View>
            ) : null}
          </Card>
        );
      })}
      <Card style={{ paddingVertical: 2, marginTop: 12 }}>
        <Row first icon="bell" label={t('Alert 10 minutes before jamaat')} right={<Toggle value={!!data.jamaatAlert} onChange={(v) => update({ jamaatAlert: v })} />} chevron={false} />
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 8, lineHeight: 16 }}>{t('Kept on this phone only. A fixed time is in the city’s own clock (24-hour).')}</Body>
    </View>
  );
}
export const jamaatCount = (data) => Object.keys(data.jamaat || {}).length;

/* ------------------------------- Qada plan ------------------------------- */
export function QadaPlanCard() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const { data, update, today } = app;
  const ctx = { today, now: nowDate(), getDay: app.getDay };
  const left = useMemo(() => calendarMissed(data, ctx).length + olderTotal(data), [data.completedByDay, data.qadaRecords, data.qadaCounts, data.qadaLog, data.pausedDays, data.pause, today.toDateString()]);
  const per = (data.qadaPlan && data.qadaPlan.perDay) || 0;
  const doneToday = qadaPrayedOn(data, today).length;
  let run = 0;
  if (per) {
    for (let i = doneToday >= per ? 0 : 1; i < 400; i++) {
      if (qadaPrayedOn(data, addDays(today, -i)).length >= per) run++; else break;
    }
  }
  if (!left && !per) return null;
  const finish = per && left ? addDays(today, Math.ceil(left / per)) : null;
  return (
    <Card style={{ marginTop: 12, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Label>{t('Qada plan')}</Label>
        <Body size={11.5} color={th.muted}>{t('{n} left to make up', { n: left })}</Body>
      </View>
      <Body size={12} color={th.muted} style={{ marginTop: 8 }}>{t('How many a day')}</Body>
      <Segmented
        style={{ marginTop: 6 }}
        value={String(per)}
        options={[{ id: '0', label: t('Off') }, { id: '1', label: t.num(1) }, { id: '2', label: t.num(2) }, { id: '5', label: t.num(5) }, { id: '10', label: t.num(10) }]}
        onChange={(v) => update({ qadaPlan: +v ? { perDay: +v, since: today.toDateString() } : null, dirtyAt: Date.now() })}
      />
      {per ? (
        <View style={{ marginTop: 12 }}>
          <Serif size={17}>{left ? t('Done by {date}', { date: longDate(t.lang, finish, true) }) : t('All made up. Alhamdulillah.')}</Serif>
          <Body size={12} color={th.muted} style={{ marginTop: 2 }}>
            {t('Today {a} of {b}', { a: Math.min(doneToday, per), b: per })}{run > 1 ? ` · ${t('{n} days in a row', { n: run })}` : ''}
          </Body>
        </View>
      ) : null}
    </Card>
  );
}

/* --------------------------- Friday checklist --------------------------- */
// Sunnahs of Jumu'ah, each with its source. Ticks are kept with the day.
const FRIDAY = [
  { k: 'fri_ghusl', label: 'Ghusl', ref: 'Bukhari 877' },
  { k: 'fri_clothes', label: 'Clean clothes and perfume', ref: 'Bukhari 883' },
  { k: 'fri_early', label: 'Go early to the masjid', ref: 'Bukhari 881' },
  { k: 'kahf', label: 'Read Surah Al-Kahf', ref: 'al-Hakim, al-Bayhaqi', go: 'kahf' },
  { k: 'fri_salawat', label: 'Send salawat often', ref: 'Abu Dawud 1047' },
  { k: 'fri_dua', label: 'Dua in the last hour before Maghrib', ref: 'Abu Dawud 1048' },
];
export function FridayCard({ now }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { today } = app;
  if (today.getDay() !== 5 || now >= app.getDay(today).Maghrib) return null;
  const key = today.toDateString();
  const rec = (app.data.todayTicks || {})[key] || {};
  const toggle = (k) => app.update((p) => ({ todayTicks: { ...(p.todayTicks || {}), [key]: { ...((p.todayTicks || {})[key] || {}), [k]: !((p.todayTicks || {})[key] || {})[k] } }, dirtyAt: Date.now() }));
  const done = FRIDAY.filter((f) => rec[f.k]).length;
  return (
    <Card style={{ marginTop: 14, paddingVertical: 10, paddingHorizontal: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
        <Label>{t("Jumu'ah · until Maghrib")}</Label>
        <Body size={11.5} color={th.muted}>{t('{a} of {b}', { a: done, b: FRIDAY.length })}</Body>
      </View>
      {FRIDAY.map((f, i) => (
        <View key={f.k} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 }, i > 0 && { borderTopWidth: 1, borderColor: th.line }]}>
          <Press onPress={f.go === 'kahf' ? () => nav.push('quran', { surah: 18 }) : undefined} style={{ flex: 1 }} scaleTo={0.99} disabled={!f.go}>
            <Body size={13.5} weight="semi">{t(f.label)}</Body>
            <Body size={10.5} color={th.accent}>{f.ref}</Body>
          </Press>
          <Press onPress={() => toggle(f.k)} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: !!rec[f.k] }} accessibilityLabel={t(f.label)}><Tick done={!!rec[f.k]} /></Press>
        </View>
      ))}
    </Card>
  );
}

/* --------------------------- Friday look-back --------------------------- */
// The last 7 days (Saturday to Friday), shown on Friday after Dhuhr.
export function WeekCard({ now }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const { today, data } = app;
  const show = data.weekReview !== false && today.getDay() === 5 && now >= app.getDay(today).Dhuhr;
  const s = useMemo(() => (show ? rangeStats({ from: addDays(today, -6), days: 7, data, today, now: nowDate(), getDay: app.getDay }) : null), [show, data.completedByDay, data.qadaRecords, today.toDateString()]);
  if (!s || !s.due) return null;
  const prayed = s.onTime + s.qada;
  let worst = null;
  let wc = 0;
  PRAYER_NAMES.forEach((n) => {
    const miss = s.per[n].qada + s.per[n].missed;
    if (miss > wc) { wc = miss; worst = n; }
  });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    const rec = data.completedByDay[d.toDateString()] || {};
    const q = (data.qadaRecords || {})[d.toDateString()] || {};
    return { d, n: [1, 2, 3, 4, 5].filter((id) => rec[id] || q[id]).length };
  });
  return (
    <Card style={{ marginTop: 14, padding: 14 }}>
      <Label>{t('This week')}</Label>
      <Serif size={22} style={{ marginTop: 4 }}>{t('{a} of {b} prayed', { a: prayed, b: s.due })}</Serif>
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 10, alignItems: 'flex-end' }}>
        {days.map((x) => (
          <View key={x.d.toDateString()} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: '100%', height: 40, borderRadius: 6, backgroundColor: th.line, justifyContent: 'flex-end', overflow: 'hidden' }}>
              <View style={{ height: `${(x.n / 5) * 100}%`, backgroundColor: th.accent }} />
            </View>
            <Body size={9.5} color={th.faint} style={{ marginTop: 3 }}>{shortDate(t.lang, x.d).split(' ')[0]}</Body>
          </View>
        ))}
      </View>
      {worst ? (
        <Body size={12.5} color={th.muted} style={{ marginTop: 10 }}>
          {t('{name} was the hardest: {a} of {b} on time.', { name: t(worst), a: s.per[worst].onTime, b: s.per[worst].due })}
        </Body>
      ) : <Body size={12.5} color={th.muted} style={{ marginTop: 10 }}>{t('Every prayer on time this week. Alhamdulillah.')}</Body>}
      {worst ? <Body size={13} weight="semi" style={{ marginTop: 4 }}>{t('Next week: {name} on time, one day at a time.', { name: t(worst) })}</Body> : null}
    </Card>
  );
}

/* ----------------------------- All 5 prayed ----------------------------- */
export function All5Card({ prayed, onTime }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  if (prayed < 5) return null;
  const st = streaks(app.data.completedByDay, app.today, (d) => isPausedDay(app.data, d));
  return (
    <Card style={{ marginTop: 10, padding: 16, alignItems: 'center', borderColor: th.ok }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: th.ok, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="check" size={22} color={th.isLight ? '#fff' : th.bg} />
      </View>
      <Serif size={19} style={{ marginTop: 8 }}>{t('All 5 prayed today')}</Serif>
      <Body size={12.5} color={th.muted} style={{ marginTop: 2 }}>
        {onTime === 5 && st.current > 1 ? `${t('Alhamdulillah')} · ${t('{n} days in a row, all on time', { n: st.current })}` : t('Alhamdulillah')}
      </Body>
    </Card>
  );
}

/* -------------------------------- My duas -------------------------------- */
export default function MyDuasScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const list = app.data.myDuas || [];
  const [edit, setEdit] = useState(null); // { id?, title, text }
  const save = () => {
    const title = (edit.title || '').trim();
    const text = (edit.text || '').trim();
    if (!text) { setEdit(null); return; }
    app.update((p) => {
      const cur = p.myDuas || [];
      const item = { id: edit.id || `d${Date.now()}`, title: title || t('My dua'), text, at: new Date().toISOString() };
      return { myDuas: edit.id ? cur.map((x) => (x.id === edit.id ? item : x)) : [item, ...cur], dirtyAt: Date.now() };
    });
    setEdit(null);
  };
  const remove = (id) => {
    const old = (app.data.myDuas || []).find((x) => x.id === id);
    app.update((p) => ({ myDuas: (p.myDuas || []).filter((x) => x.id !== id), dirtyAt: Date.now() }));
    setEdit(null);
    if (old) app.setToast({ message: t('Dua deleted'), action: { label: t('Undo'), onPress: () => app.update((p) => ({ myDuas: [...(p.myDuas || []), old], dirtyAt: Date.now() })) } });
  };
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <ScreenTitle onBack={nav.pop} title={t('My duas')} sub={t('Written by you, in your own words')} />
      {edit ? (
        <Card style={{ marginTop: 12, padding: 14 }} active>
          <Input value={edit.title} onChangeText={(v) => setEdit({ ...edit, title: v })} placeholder={t('Title (for example: For my parents)')} />
          <Input multiline value={edit.text} onChangeText={(v) => setEdit({ ...edit, text: v })} placeholder={t('Write your dua')} style={{ marginTop: 8, minHeight: 110 }} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <PrimaryButton style={{ flex: 1 }} label={t('Save')} onPress={save} />
            <PrimaryButton ghost style={{ flex: 1 }} label={edit.id ? t('Delete') : t('Cancel')} onPress={() => (edit.id ? remove(edit.id) : setEdit(null))} />
          </View>
        </Card>
      ) : (
        <PrimaryButton style={{ marginTop: 12 }} icon="plus" label={t('Add a dua')} onPress={() => setEdit({ title: '', text: '' })} />
      )}
      {list.length ? list.map((d) => (
        <Card key={d.id} onPress={() => setEdit({ id: d.id, title: d.title, text: d.text })} style={{ marginTop: 10, padding: 14 }}>
          <Body size={14.5} weight="semi">{d.title}</Body>
          <Body size={13.5} color={th.muted} style={{ marginTop: 4, lineHeight: 20 }}>{d.text}</Body>
        </Card>
      )) : !edit ? <Empty icon="edit-3" title={t('No duas yet')} text={t('Write the duas you make often, so they’re always with you.')} /> : null}
      <Body size={11} color={th.faint} style={{ marginTop: 12 }}>{t('Private to you. Kept in your backup and on both phones when you’re signed in.')}</Body>
    </ScrollView>
  );
}
