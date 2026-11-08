// The prayer page (a sheet): one time card with the countdown, the bar from
// start to end and the tick or "Did you pray it?"; then the rak'ahs with a
// select circle per sunnah / nafl row; Qibla; and this prayer's alerts.
import { nowDate } from '../lib/clock';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press, Divider, Toggle, Row, SectionLabel, Tick, PrimaryButton, Input } from '../ui/kit';
import { HScroll } from '../ui/swipe';
import { useNow, timeStr, shortDuration, countdownText, mmss, longDate } from '../ui/hooks';
import { addDays, addMinutes, makruhWindows, qiblaBearing, compassPoint } from '../lib/prayer';
import { prayerWindow } from '../lib/waqt';
import { statusOf, qadaOf, ymd, fromYmd, reasonLabel, rakahOf } from '../lib/qada';
import { rakahRows } from '../data/prayerInfo';
import { ReasonChips, MadeOnPicker, dayWord } from './QadaParts';
import { CircleMark } from './Home';
import { NotConfirmed } from '../ui/kit';

export const JUMUAH_REASONS = [
  { id: 'work', icon: 'briefcase', label: 'Work' },
  { id: 'class', icon: 'book', label: 'Class' },
  { id: 'nomosque', icon: 'map-pin', label: 'No mosque nearby' },
  { id: 'travel', icon: 'navigation', label: 'Travelling' },
  { id: 'sick', icon: 'thermometer', label: 'Sick' },
  { id: 'other', icon: 'edit-3', label: 'Other' },
];

export default function PrayerPage({ name, date }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const now = useNow(1000);
  const tz = app.coords.timezone;
  const w = prayerWindow(name, app.getDay(date), app.getDay(addDays(date, 1)));
  const friday = date.getDay() === 5 && name === 'Dhuhr' && !app.data.travelConfirmed;
  const adhanOn = !(app.data.adhanOff || {})[name];
  const preOn = !(app.data.preOff || {})[name];
  const nudgeOn = !!(app.data.nudgeOn || {})[name];
  const nudgeAt = addMinutes(w.best ? w.best.at : w.end, -(app.data.nudgeLead || 30));
  const qibla = qiblaBearing(app.coords.latitude, app.coords.longitude);
  return (
    <View>
      <TimeCard name={name} date={date} w={w} now={now} friday={friday} />
      {friday ? <JumuahCard date={date} /> : null}
      <RakahCard name={name} date={date} />

      {/* Qibla at a glance */}
      <Card onPress={() => { nav.closeSheet(); nav.push('qibla'); }} style={{ marginTop: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: th.line, alignItems: 'center', justifyContent: 'center' }}>
          <Body size={7} color={th.faint} style={{ position: 'absolute', top: 1 }}>N</Body>
          <View style={{ width: 40, height: 40, alignItems: 'center', transform: [{ rotate: `${qibla}deg` }] }}>
            <View style={{ width: 2, height: 15, marginTop: 5, borderRadius: 1, backgroundColor: th.accent }} />
          </View>
          <View style={{ position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: th.accent }} />
        </View>
        <View style={{ flex: 1 }}>
          <Body size={13.5} weight="semi">{t('Qibla {deg}° · {dir}', { deg: t.num(Math.round(qibla)), dir: t(compassPoint(qibla)) })}</Body>
          <Body size={11} color={th.muted}>{t('Tap to open the compass')}</Body>
        </View>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </Card>

      <SectionLabel>{t('Alerts for {name}', { name: t(name) })}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row first icon="bell" label={t('Prayer time alert')} right={<Toggle value={adhanOn} onChange={(v) => app.update((p) => ({ adhanOff: { ...(p.adhanOff || {}), [name]: !v } }))} />} />
        <Row
          icon="clock"
          label={t('{n} minutes before', { n: app.data.preReminderMins || 10 })}
          sub={app.data.preReminderMins ? null : t('Turned off in Settings › Alerts')}
          right={<Toggle value={preOn && !!app.data.preReminderMins} disabled={!app.data.preReminderMins} onChange={(v) => app.update((p) => ({ preOff: { ...(p.preOff || {}), [name]: !v } }))} />}
        />
        <Row
          icon="help-circle"
          label={t('"Did you pray?" check')}
          sub={t('At {time} if not ticked', { time: timeStr(t, nudgeAt, tz) })}
          right={<Toggle value={nudgeOn} onChange={(v) => app.update((p) => ({ nudgeOn: { ...(p.nudgeOn || {}), [name]: v } }))} />}
        />
        {friday ? (
          <Row icon="bell" label={t("Remind me 1 hour before Jumu'ah")} right={<Toggle value={(app.data.jumuahReminder || 0) > 0} onChange={(v) => app.update({ jumuahReminder: v ? 60 : 0 })} />} />
        ) : null}
      </Card>
    </View>
  );
}

/* ------------------------------ Time card ------------------------------ */
function TimeCard({ name, date, w, now, friday }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const tz = app.coords.timezone;
  const ctx = { today: app.today, now, getDay: app.getDay };
  const st = statusOf(app.data, date, name, ctx);
  const notStarted = now < w.start;
  const inside = now >= w.start && now < w.end;
  const span = w.end - w.start;
  const pct = inside ? (now - w.start) / span : now >= w.end ? 1 : 0;
  const bestPct = w.best ? (w.best.at - w.start) / span : null;
  const answeredNow = st === 'ontime' || st === 'qada';
  const unanswered = !answeredNow && now >= w.end;
  const border = unanswered ? th.amber : answeredNow ? (st === 'ontime' ? th.ok : th.amber) : th.accentLine;
  let head;
  if (notStarted) head = { label: t('Starts in'), value: countdownText(t, w.start - now), color: th.ink };
  else if (inside) head = { label: t('Ends in'), value: countdownText(t, w.end - now), color: w.end - now <= 15 * 60000 ? th.amber : th.ink };
  else head = { label: t('Ended'), value: t('{d} ago', { d: shortDuration(t, now - w.end) }), color: th.muted };
  return (
    <Card active style={{ marginTop: 4, padding: 14, borderColor: border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Label size={8.5} color={unanswered ? th.amber : th.accent}>{head.label}</Label>
          <Serif bold size={26} color={head.color} style={{ marginTop: 2 }}>{head.value}</Serif>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {w.best ? <Body size={11} color={th.muted}>{t('Best before {time}', { time: timeStr(t, w.best.at, tz, true) })}</Body> : null}
          <Body size={11} color={th.muted}>{t('Ends {why}', { why: t(w.endWhy) })}</Body>
        </View>
      </View>
      {/* bar from start to end */}
      <View style={{ height: 6, borderRadius: 3, backgroundColor: th.soft2, marginTop: 12, marginBottom: 6 }}>
        {pct > 0 ? <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, borderRadius: 3, backgroundColor: unanswered ? th.amber : th.accent }} /> : null}
        {bestPct !== null ? <View style={{ position: 'absolute', left: `${bestPct * 100}%`, top: -3, bottom: -3, width: 2, borderRadius: 1, backgroundColor: th.accent }} /> : null}
        {inside ? <View style={{ position: 'absolute', left: `${pct * 100}%`, top: -4, width: 14, height: 14, marginLeft: -7, borderRadius: 7, backgroundColor: th.sun, borderWidth: 3, borderColor: th.sheet }} /> : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Body size={11} color={th.muted}>{timeStr(t, w.start, tz, true)}</Body>
        <Body size={11} color={th.muted}>{t('{d} long', { d: shortDuration(t, span) })}</Body>
        <Body size={11} color={th.muted}>{timeStr(t, w.end, tz, true)}</Body>
      </View>
      <View style={{ height: 1, backgroundColor: th.line, marginVertical: 12 }} />
      {notStarted ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CircleMark state="notYet" size={22} />
          <Body size={12.5} color={th.muted} style={{ flex: 1 }}>{t('You can tick it once it starts.')}</Body>
        </View>
      ) : (
        <AnswerBlock name={name} date={date} w={w} now={now} st={st} friday={friday} />
      )}
    </Card>
  );
}

/* ------------------------- Tick / Did you pray it? ------------------------- */
function AnswerBlock({ name, date, w, now, st, friday }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const [mode, setMode] = useState(null); // null | 'late'
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [pick, setPick] = useState(false);
  const [on, setOn] = useState(app.today);
  const q = qadaOf(app.data, date, name);
  const dayEnded = now >= app.getDay(addDays(date, 1)).Fajr;
  const makruh = makruhWindows(app.getDay(app.today)).find((m) => now >= m.start && now < m.end);

  // Answered already: show it, with a way to change.
  if (st === 'ontime' || st === 'qada') {
    const ontime = st === 'ontime';
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <CircleMark state={ontime ? 'ontime' : 'late'} size={26} />
        <View style={{ flex: 1 }}>
          <Body size={14} weight="semi">{ontime ? (friday && ((app.data.jumuahByDay || {})[date.toDateString()] || {}).choice !== 'dhuhr' ? t("Prayed Jumu'ah") : t('Prayed on time')) : q && q.on !== ymd(date) ? t('Made up {date}', { date: dayWord(t, fromYmd(q.on), app.today) }) : t('Prayed late')}</Body>
          {!ontime && q && reasonLabel(t, q) ? <Body size={11.5} color={th.muted}>{t('Reason: {r}', { r: reasonLabel(t, q) })}</Body> : null}
        </View>
        <Press onPress={() => app.setStatus(date, name, 'missed')} hitSlop={8} style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: th.line }}>
          <Body size={11.5} weight="semi" color={th.muted}>{t('Change')}</Body>
        </Press>
      </View>
    );
  }
  // Time is on: one tap.
  if (now < w.end && st !== 'missed') {
    if (friday) return <Body size={12.5} color={th.muted}>{t("Pick Jumu'ah or Dhuhr below.")}</Body>;
    return (
      <Press onPress={() => { app.setStatus(date, name, 'ontime'); app.haptic('success'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityRole="button">
        <CircleMark state="open" size={26} />
        <Body size={14} weight="semi" style={{ flex: 1 }}>{t('I prayed {name}', { name: t(name) })}</Body>
        <Feather name="check" size={16} color={th.accent} />
      </Press>
    );
  }
  // Time is over: Did you pray it?
  const saveLate = (day) => {
    app.setStatus(date, name, 'qada', { on: ymd(day), reason, note: reason === 'other' ? note.trim() : '', late: true });
    app.haptic('success');
    app.setToast(t('{name} saved as late', { name: t(name) }));
  };
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <CircleMark state={st === 'missed' ? 'missed' : 'unanswered'} size={22} />
        <Body size={14.5} weight="semi" style={{ flex: 1 }}>{st === 'missed' ? t('Missed · not made up yet') : t('Did you pray it?')}</Body>
      </View>
      {makruh ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, padding: 8, borderRadius: 10, backgroundColor: th.redSoft }}>
          <Feather name="alert-triangle" size={12} color={th.red} />
          <Body size={11.5} color={th.red} style={{ flex: 1 }}>{t('Prohibited time now. Wait {t} before making it up.', { t: mmss(t, makruh.end - now) })}</Body>
        </View>
      ) : null}
      {mode !== 'late' ? (
        <View style={{ gap: 8, marginTop: 12 }}>
          <Choice icon="check" color={th.ok} label={t('Yes, on time')} onPress={() => { app.setStatus(date, name, 'ontime'); app.haptic('success'); }} />
          <Choice icon="rotate-ccw" color={th.amber} label={dayEnded ? t('Yes, made up later') : t('Yes, but late')} onPress={() => setMode('late')} />
          {st !== 'missed' ? <Choice icon="x" color={th.red} label={t('Not yet')} sub={t('Goes on your qada list')} onPress={() => app.setStatus(date, name, 'missed', { notYet: true })} /> : null}
        </View>
      ) : (
        <View>
          <ReasonChips value={reason} note={note} onChange={setReason} onNote={setNote} />
          {dayEnded ? (
            <View style={{ marginTop: 12 }}>
              <Label style={{ marginBottom: 8, marginHorizontal: 2 }}>{t('Which day did you pray it?')}</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <PrimaryButton style={{ flex: 1 }} label={t('Today')} onPress={() => saveLate(app.today)} />
                <PrimaryButton ghost style={{ flex: 1 }} label={t('Pick a day')} onPress={() => setPick((x) => !x)} />
              </View>
              {pick ? (
                <View style={{ marginTop: 10 }}>
                  <MadeOnPicker forDate={date} value={on} onChange={setOn} />
                  <PrimaryButton style={{ marginTop: 10 }} label={t('Save for {day}', { day: dayWord(t, on, app.today) })} onPress={() => saveLate(on)} />
                </View>
              ) : null}
            </View>
          ) : (
            <PrimaryButton style={{ marginTop: 14 }} label={t('Save as late')} onPress={() => saveLate(app.today)} />
          )}
          <Press onPress={() => setMode(null)} style={{ alignSelf: 'center', paddingVertical: 10 }}>
            <Body size={12.5} weight="semi" color={th.muted}>{t('Back')}</Body>
          </Press>
        </View>
      )}
    </View>
  );
}

function Choice({ icon, color, label, sub, onPress }) {
  const th = useTheme();
  return (
    <Press onPress={onPress} scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: th.line, backgroundColor: th.soft }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={13} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Body size={14} weight="semi">{label}</Body>
        {sub ? <Body size={11} color={th.muted}>{sub}</Body> : null}
      </View>
    </Press>
  );
}

/* ------------------------------- Jumu'ah ------------------------------- */
// On Fridays the circle always opens here: Jumu'ah, or Dhuhr instead (both
// count as on time), with an optional reason.
function JumuahCard({ date }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const key = date.toDateString();
  const rec = (app.data.jumuahByDay || {})[key] || {};
  const prayed = app.isPrayed(date, 'Dhuhr');
  const set = (choice, reason) => {
    app.update((p) => ({ jumuahByDay: { ...(p.jumuahByDay || {}), [key]: { choice, reason: reason || null } }, dirtyAt: Date.now() }));
    if (!prayed) app.setStatus(date, 'Dhuhr', 'ontime');
    app.haptic('success');
  };
  const opt = (choice, label, sub) => {
    const on = prayed && (rec.choice || 'jumuah') === choice;
    return (
      <Press onPress={() => set(choice, choice === 'dhuhr' ? rec.reason : null)} style={[{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: th.line, backgroundColor: th.soft }, on && { borderColor: th.ok, backgroundColor: 'rgba(75,191,138,0.12)' }]}>
        <Body size={14} weight="semi" color={on ? th.ok : th.ink}>{label}</Body>
        <Body size={11} color={th.muted}>{sub}</Body>
      </Press>
    );
  };
  return (
    <View>
      <SectionLabel>{t("Friday · Jumu'ah")}</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {opt('jumuah', t("Prayed Jumu'ah"), t("2 rak'ahs with the imam"))}
        {opt('dhuhr', t('Dhuhr instead'), t("4 rak'ahs"))}
      </View>
      {prayed && rec.choice === 'dhuhr' ? (
        <View>
          <Label style={{ marginTop: 12, marginBottom: 8, marginHorizontal: 2 }}>{t('Why not Jumu’ah? · optional')}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {JUMUAH_REASONS.map((r) => {
              const on = rec.reason === r.id;
              return (
                <Press key={r.id} onPress={() => set('dhuhr', on ? null : r.id)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: th.line }, on && { borderColor: th.amber, backgroundColor: 'rgba(224,164,58,0.15)' }]}>
                  <Feather name={r.icon} size={12} color={on ? th.amber : th.muted} />
                  <Body size={12.5} weight={on ? 'semi' : 'med'} color={on ? th.amber : th.muted}>{t(r.label)}</Body>
                </Press>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------- Rak'ahs ------------------------------- */
// Each row with its count and a select circle. Fard is ticked by the main
// circle; the strongly recommended sunnah and Witr fill in with it; other
// sunnah and nafl wait for you. In Safar the Fard of Dhuhr, Asr and Isha is
// 2 (4 if you prayed behind a local imam).
export function RakahCard({ name, date }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const rows = rakahRows(name, date, app.data);
  const answered = app.isPrayed(date, name) || !!qadaOf(app.data, date, name);
  const ticks = rakahOf(app.data, date, name);
  // Nothing can be ticked before the prayer's time starts.
  const started = app.getDay(date)[name] <= nowDate();
  const safar = !!app.data.travelConfirmed && ['Dhuhr', 'Asr', 'Isha'].includes(name);
  const key = date.toDateString();
  const id = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].indexOf(name) + 1;
  const imam = !!(((app.data.imamByDay || {})[key]) || {})[id];
  const toggleImam = (v) => app.update((p) => ({ imamByDay: { ...(p.imamByDay || {}), [key]: { ...((p.imamByDay || {})[key] || {}), [id]: v } }, dirtyAt: Date.now() }));
  return (
    <View>
      <SectionLabel>{t("Rak'ahs")}</SectionLabel>
      <Card style={{ paddingVertical: 4 }}>
        {rows.map((r, i) => {
          const fard = r.kind === 'fard';
          const n = fard && safar && !imam ? 2 : r.n;
          const on = fard ? answered : !!ticks[r.key];
          const optionalInSafar = safar && !fard && r.kind !== 'witr';
          return (
            <View key={r.key}>
              {i > 0 && <Divider />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Body size={13.5} weight={fard ? 'semi' : 'med'}>{t(r.label)}</Body>
                  {r.note || optionalInSafar ? <Body size={11} color={th.muted}>{optionalInSafar ? t('Optional while travelling') : t(r.note)}</Body> : null}
                </View>
                {fard && safar && !imam ? <Body size={12} color={th.faint} style={{ textDecorationLine: 'line-through' }}>{t.num(r.n)}</Body> : null}
                <Serif bold size={18} color={fard ? th.red : th.ink}>{t.num(n)}</Serif>
                {fard ? (
                  <View style={{ opacity: 0.6 }}><Tick done={on} size={22} /></View>
                ) : (
                  <Press onPress={() => (started ? app.setRakah(date, name, r.key, !on) : app.setToast(t('You can tick it once it starts.')))} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: !started }} accessibilityLabel={t(r.label)} style={started ? null : { opacity: 0.4 }}>
                    <Tick done={on} size={22} />
                  </Press>
                )}
              </View>
            </View>
          );
        })}
        {safar ? (
          <>
            <Divider />
            <Row icon="users" label={t('Prayed behind a local imam')} sub={t("Then the Fard is 4, in full")} right={<Toggle value={imam} onChange={toggleImam} />} />
          </>
        ) : null}
      </Card>
      {qadaOf(app.data, date, name) ? (
        <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{t('Prayed after its time: only the Fard and Witr are made up, not the sunnah. Fajr’s sunnah is the exception, if made up the same day before midday.')}</Body>
      ) : (
  <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{t('Fard is ticked by the main circle. The strongly recommended sunnah and Witr are ticked with it; tick the others yourself.')}</Body>
      )}
      <NotConfirmed />
    </View>
  );
}
