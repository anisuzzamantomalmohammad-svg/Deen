// Pieces for marking prayers on time / qada / missed, shared by the day
// sheet, the prayer sheet and Ibadah's qada list.
import React, { useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Body, Label, Card, Press, Input, PrimaryButton, Serif } from '../ui/kit';
import { HScroll } from '../ui/swipe';
import { shortDate, longDate, hijriLabel, timeStr } from '../ui/hooks';
import { addDays, sameDay } from '../lib/prayer';
import { REASONS, ymd, fromYmd, qadaOf, statusOf, reasonLabel } from '../lib/qada';

export function dayWord(t, d, today) {
  if (sameDay(d, today)) return t('Today');
  if (sameDay(d, addDays(today, -1))) return t('Yesterday');
  return shortDate(t.lang, d);
}

// "Made up on" chips, from the missed day to today.
export function MadeOnPicker({ forDate, value, onChange }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const [open, setOpen] = useState(false);
  const days = Math.max(0, Math.min(30, Math.round((app.today - forDate) / 86400000)));
  const list = Array.from({ length: days + 1 }, (_, i) => addDays(app.today, -i));
  return (
    <View>
      <Card onPress={() => setOpen((o) => !o)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12 }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="calendar" size={14} color={th.accent} />
        </View>
        <Body size={14} weight="med" style={{ flex: 1 }}>{t('Made up on')}</Body>
        <Body size={12.5} color={th.muted}>{dayWord(t, value, app.today)}</Body>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={th.faint} />
      </Card>
      {open ? (
        <HScroll style={{ marginTop: 8 }} contentContainerStyle={{ gap: 6 }}>
          {list.map((d) => {
            const on = sameDay(d, value);
            return (
              <Press key={d.toDateString()} onPress={() => { onChange(d); setOpen(false); }} accessibilityState={{ selected: on }} style={[{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: th.line }, on && { borderColor: th.amber, backgroundColor: 'rgba(224,164,58,0.15)' }]}>
                <Body size={12} weight={on ? 'semi' : 'med'} color={on ? th.amber : th.muted}>{dayWord(t, d, app.today)}</Body>
              </Press>
            );
          })}
        </HScroll>
      ) : null}
    </View>
  );
}

export function ReasonChips({ value, note, onChange, onNote }) {
  const th = useTheme();
  const t = useT();
  return (
    <View>
      <Label style={{ marginTop: 14, marginBottom: 8, marginHorizontal: 2 }}>{t('Why was it late? · optional')}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {REASONS.map((r) => {
          const on = value === r.id;
          return (
            <Press key={r.id} onPress={() => onChange(on ? null : r.id)} accessibilityState={{ selected: on }} style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: th.line }, on && { borderColor: th.amber, backgroundColor: 'rgba(224,164,58,0.15)' }]}>
              <Feather name={r.icon} size={12} color={on ? th.amber : th.muted} />
              <Body size={12.5} weight={on ? 'semi' : 'med'} color={on ? th.amber : th.muted}>{t(r.label)}</Body>
            </Press>
          );
        })}
      </View>
      {value === 'other' ? <Input value={note} onChangeText={onNote} placeholder={t('Type the reason')} style={{ marginTop: 8 }} maxLength={60} /> : null}
    </View>
  );
}

// Sheet body: mark one missed prayer as made up.
export function MakeUpSheet({ date, name, onClose }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const old = qadaOf(app.data, date, name);
  const [on, setOn] = useState(old ? fromYmd(old.on) : app.today);
  const [reason, setReason] = useState(old ? old.reason : null);
  const [note, setNote] = useState(old ? old.note : '');
  const save = () => {
    app.setStatus(date, name, 'qada', { on: ymd(on), reason, note: reason === 'other' ? note.trim() : '' });
    app.haptic('success');
    app.setToast(t('{name} marked as made up', { name: t(name) }));
    onClose();
  };
  return (
    <View>
      <MadeOnPicker forDate={date} value={on} onChange={setOn} />
      <ReasonChips value={reason} note={note} onChange={setReason} onNote={setNote} />
      <PrimaryButton style={{ marginTop: 16 }} label={t('Save')} onPress={save} />
      {old ? (
        <Press onPress={() => { app.setStatus(date, name, 'missed'); onClose(); }} style={{ alignSelf: 'center', paddingVertical: 12 }}>
          <Body size={13} weight="semi" color={th.red}>{t('Not made up yet')}</Body>
        </Press>
      ) : null}
    </View>
  );
}

// One prayer's On time · Qada · Missed switch, used in the day sheet.
export function StatusRow({ date, name, time }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const ctx = { today: app.today, now: new Date(), getDay: app.getDay };
  const st = statusOf(app.data, date, name, ctx);
  const q = qadaOf(app.data, date, name);
  const notYet = st === 'pending' && (date > app.today || app.getDay(date)[name] > new Date());
  const opts = [
    { id: 'ontime', icon: 'check', label: t('On time'), bg: th.ok, fg: '#0d2419' },
    { id: 'qada', icon: 'rotate-ccw', label: t('Qada'), bg: th.amber, fg: '#2a1a05' },
    { id: 'missed', icon: null, label: t('Missed'), bg: th.soft2, fg: th.ink },
  ];
  const pick = (id) => {
    if (id === 'qada') nav.openSheet('makeUp', { date, name });
    else app.setStatus(date, name, id);
  };
  return (
    <Card style={{ marginTop: 7, paddingHorizontal: 10, paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Serif size={15}>{t(name)}</Serif>
        <Body size={11} color={th.muted}>{time}</Body>
      </View>
      {notYet ? (
        <Body size={11.5} color={th.faint} style={{ marginTop: 4 }}>{t('Not time yet')}</Body>
      ) : (
        <View style={{ flexDirection: 'row', marginTop: 6, borderWidth: 1, borderColor: th.line, borderRadius: 99, padding: 2 }}>
          {opts.map((o) => {
            const on = st === o.id || (o.id === 'missed' && st === 'pending' && false);
            return (
              <Press key={o.id} onPress={() => pick(o.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${t(name)}: ${o.label}`} style={[{ flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 99 }, on && { backgroundColor: o.bg }]}>
                {o.icon ? <Feather name={o.icon} size={11} color={on ? o.fg : th.muted} /> : null}
                <Body size={11.5} weight="semi" color={on ? o.fg : th.muted}>{o.label}</Body>
              </Press>
            );
          })}
        </View>
      )}
      {st === 'qada' && q ? (
        <Press onPress={() => nav.openSheet('makeUp', { date, name })} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 9, backgroundColor: 'rgba(224,164,58,0.15)' }}>
          <Body size={11.5} numberOfLines={1} style={{ flex: 1 }}>{`${t('Made up {date}', { date: dayWord(t, fromYmd(q.on), app.today) })}${reasonLabel(t, q) ? ` · ${reasonLabel(t, q)}` : ''}`}</Body>
          <Feather name="chevron-right" size={14} color={th.amber} />
        </Press>
      ) : null}
    </Card>
  );
}

// Small block at the top of a prayer sheet: how this prayer was logged.
export function PrayerStatusCard({ date, name }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const ctx = { today: app.today, now: new Date(), getDay: app.getDay };
  const st = statusOf(app.data, date, name, ctx);
  const q = qadaOf(app.data, date, name);
  if (st === 'pending') {
    const notYet = app.getDay(date)[name] > new Date() || date > app.today;
    return (
      <Card onPress={notYet ? undefined : () => app.setStatus(date, name, 'ontime')} style={{ marginTop: 4, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: th.faint }} />
        <View style={{ flex: 1 }}>
          <Body size={14} weight="semi">{notYet ? t('Not time yet') : t('Mark as prayed')}</Body>
          <Body size={11.5} color={th.muted}>{longDate(t.lang, date)}</Body>
        </View>
      </Card>
    );
  }
  const map = {
    ontime: { bg: 'rgba(75,191,138,0.14)', border: th.ok, icon: 'check', title: t('Prayed on time'), sub: t('Tap to change') },
    qada: { bg: 'rgba(224,164,58,0.15)', border: th.amber, icon: 'rotate-ccw', title: q ? t('Qada · made up {date}', { date: dayWord(t, fromYmd(q.on), app.today) }) : t('Qada'), sub: q && reasonLabel(t, q) ? t('Reason: {r}', { r: reasonLabel(t, q) }) : t('Tap to change') },
    missed: { bg: th.soft, border: th.line, icon: null, title: t('Missed'), sub: t('Tap to mark it on time or made up') },
  }[st];
  return (
    <Card onPress={() => nav.openSheet('day', { date })} style={{ marginTop: 4, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: map.bg, borderColor: map.border }}>
      <View style={[{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: th.faint }, map.icon && { backgroundColor: map.border, borderColor: map.border }]}>
        {map.icon ? <Feather name={map.icon} size={13} color="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Body size={14} weight="semi">{map.title}</Body>
        <Body size={11.5} color={th.muted}>{map.sub}</Body>
      </View>
      <Feather name="chevron-right" size={16} color={th.faint} />
    </Card>
  );
}

export { hijriLabel, timeStr };
