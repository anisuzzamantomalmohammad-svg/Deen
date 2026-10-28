// Every bottom sheet in the app lives here, picked by `sheet.type`.
// A sheet keeps its last content while it slides away, so closing never
// flashes an empty panel.
import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, ActivityIndicator, Keyboard } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Sheet, Serif, Body, Label, Press, Card, Divider, Chip, Toggle, Row, Input, Tick, SectionLabel } from '../ui/kit';
import { longDate, hijriLabel, timeStr } from '../ui/hooks';
import { PRAYER_NAMES, PRAYER_AR, addDays, addMinutes, resolveTimezone, makruhWindows, qiblaBearing, compassPoint } from '../lib/prayer';
import { prayerWindow } from '../lib/waqt';
import { shortDuration } from '../ui/hooks';
import { RAKAH, JUMUAH_RAKAH, PROHIBITED_INFO, NAWAFIL_INFO, SUNNAH_FAST_INFO } from '../data/prayerInfo';
import { ISLAMIC_EVENTS, WHITE_DAYS_EVENT } from '../data/events';
import { eventText } from '../data/eventText';
import { eventOnDay } from '../lib/events';
import { fastingDayInfo } from '../lib/alerts';
import { infoText } from '../data/infoText';
import { ALL_CITIES } from '../data/cities';

export const MOODS = [
  { id: 'grateful', label: 'Grateful', icon: 'heart' },
  { id: 'productive', label: 'Productive', icon: 'zap' },
  { id: 'reflective', label: 'Reflective', icon: 'moon' },
  { id: 'challenging', label: 'Challenging', icon: 'cloud' },
];

// Cities that can be picked with no internet or GPS (see data/cities.js).
export const CITIES = ALL_CITIES;

/* ------------------------------ helpers ------------------------------ */

function Para({ children, style }) {
  const th = useTheme();
  return <Body size={13.5} color={th.ink} style={[{ lineHeight: 21 }, style]}>{children}</Body>;
}
function Bullets({ items, icon = 'check-circle' }) {
  const th = useTheme();
  return (
    <View style={{ gap: 8, marginTop: 4 }}>
      {items.map((a, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start' }}>
          <Feather name={icon} size={14} color={th.accent} style={{ marginTop: 3 }} />
          <Body size={13.5} style={{ flex: 1, lineHeight: 20 }}>{a}</Body>
        </View>
      ))}
    </View>
  );
}

/* ---------------------------- Prayer sheet ---------------------------- */
function PrayerSheet({ name, date }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const tz = app.coords.timezone;
  const w = prayerWindow(name, app.getDay(date), app.getDay(addDays(date, 1)));
  const start = w.start;
  const now = new Date();
  const passed = start <= now;
  const inside = now >= w.start && now < w.end;
  const done = app.isPrayed(date, name);
  const isFriday = date.getDay() === 5 && name === 'Dhuhr';
  const rakah = isFriday ? JUMUAH_RAKAH : RAKAH[name];
  const adhanOn = !(app.data.adhanOff || {})[name];
  const preOn = !(app.data.preOff || {})[name];
  const nudgeOn = !!(app.data.nudgeOn || {})[name];
  const span = w.end - w.start;
  const pct = inside ? (now - w.start) / span : 0;
  const bestPct = w.best ? (w.best.at - w.start) / span : null;
  const nudgeAt = addMinutes(w.best ? w.best.at : w.end, -(app.data.nudgeLead || 30));
  const qibla = qiblaBearing(app.coords.latitude, app.coords.longitude);
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Card style={{ flex: 1, padding: 12 }}>
          <Label size={8.5}>{t('Starts')}</Label>
          <Serif bold size={20} style={{ marginTop: 3 }}>{timeStr(t, start, tz)}</Serif>
        </Card>
        <Card style={{ flex: 1, padding: 12 }}>
          {w.best ? (
            <>
              <Label size={8.5}>{t('Best before')}</Label>
              <Serif bold size={20} style={{ marginTop: 3 }}>{timeStr(t, w.best.at, tz)}</Serif>
              <Body size={11} color={th.muted}>{t(w.best.why)}</Body>
            </>
          ) : (
            <>
              <Label size={8.5}>{t('Lasts')}</Label>
              <Serif bold size={20} style={{ marginTop: 3 }}>{shortDuration(t, span)}</Serif>
              <Body size={11} color={th.muted}>{t(w.endWhy)}</Body>
            </>
          )}
        </Card>
      </View>

      {/* When the waqt ends, with a bar from start to end */}
      <Card active style={{ marginTop: 10, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Label size={8.5} color={th.accent}>{t('Ends')}</Label>
            <Serif bold size={20} style={{ marginTop: 3 }}>{timeStr(t, w.end, tz)}</Serif>
          </View>
          <Body size={11.5} color={th.accent} style={{ marginBottom: 3 }}>{t(w.endWhy)}</Body>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: th.soft2, marginTop: 12, marginBottom: 6 }}>
          {inside ? <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, borderRadius: 3, backgroundColor: th.accent }} /> : null}
          {bestPct !== null ? <View style={{ position: 'absolute', left: `${bestPct * 100}%`, top: -3, bottom: -3, width: 2, borderRadius: 1, backgroundColor: th.accent }} /> : null}
          {inside ? <View style={{ position: 'absolute', left: `${pct * 100}%`, top: -4, width: 14, height: 14, marginLeft: -7, borderRadius: 7, backgroundColor: th.sun, borderWidth: 3, borderColor: th.sheet }} /> : null}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Body size={11} color={th.muted}>{timeStr(t, w.start, tz, true)}</Body>
          {inside
            ? <Body size={11} weight="semi" color={th.ok}>{t('Ends in {d}', { d: shortDuration(t, w.end - now) })}</Body>
            : <Body size={11} color={th.muted}>{t('{d} long', { d: shortDuration(t, span) })}</Body>}
          <Body size={11} color={th.muted}>{timeStr(t, w.end, tz, true)}</Body>
        </View>
      </Card>

      {/* Qibla at a glance */}
      <Card onPress={() => { nav.closeSheet(); nav.setTab('Qibla'); }} style={{ marginTop: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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

      <Card
        onPress={passed ? () => app.togglePrayer(date, name) : undefined}
        style={{ marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        active={done}
      >
        <Tick done={done} />
        <View style={{ flex: 1 }}>
          <Body size={14} weight="semi">{done ? t('Prayed') : passed ? t('Mark as prayed') : t('Not time yet')}</Body>
          <Body size={11.5} color={th.muted}>{longDate(t.lang, date)}</Body>
        </View>
      </Card>

      <SectionLabel>{isFriday ? t("Jumu'ah · rak'ahs") : t("Rak'ahs")}</SectionLabel>
      <Card style={{ paddingVertical: 4 }}>
        {rakah.map((r, i) => (
          <View key={i}>
            {i > 0 && <Divider />}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 }}>
              <View style={{ flex: 1 }}>
                <Body size={13.5} weight={r.label.startsWith('Fard') ? 'semi' : 'med'}>{t(r.label)}</Body>
                {r.note ? <Body size={11} color={th.muted}>{t(r.note)}</Body> : null}
              </View>
              <Serif bold size={18} color={r.label.startsWith('Fard') ? th.accent : th.ink}>{t.num(r.n)}</Serif>
            </View>
          </View>
        ))}
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{t('Sunnah counts follow the Hanafi school.')}</Body>

      <SectionLabel>{t('Alerts for {name}', { name: t(name) })}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row first icon="bell" label={t('At prayer time')} right={<Toggle value={adhanOn} onChange={(v) => app.update((p) => ({ adhanOff: { ...(p.adhanOff || {}), [name]: !v } }))} />} />
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
      </Card>
    </View>
  );
}

/* -------------------------- Prohibited sheet -------------------------- */
function ProhibitedSheet({ k }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const w = makruhWindows(app.todayTimes).find((x) => x.key === k);
  const info = infoText(t.lang).PROHIBITED[k] || PROHIBITED_INFO[k];
  return (
    <View>
      <Card danger style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Feather name="alert-triangle" size={18} color={th.red} />
        <View style={{ flex: 1 }}>
          <Label size={8.5} color={th.red}>{t('Today')}</Label>
          <Serif bold size={20}>{`${timeStr(t, w.start, app.coords.timezone)} – ${timeStr(t, w.end, app.coords.timezone)}`}</Serif>
        </View>
      </Card>
      <Para style={{ marginTop: 14 }}>{info.reason}</Para>
      <SectionLabel>{t('What you can still do')}</SectionLabel>
      <Bullets
        items={[
          t('Make up a missed Fard prayer (Hanafi scholars say wait until the window passes).'),
          t('Dhikr, dua and reading Quran are fine at any time.'),
          t('Voluntary (nafl) prayers wait until the window ends.'),
        ]}
      />
      <Body size={11} color={th.faint} style={{ marginTop: 12 }}>{t('Windows used here: 15 min after sunrise, 8 min before Dhuhr, 15 min before Maghrib.')}</Body>
    </View>
  );
}

/* ----------------------------- Event sheet ----------------------------- */
function EventSheet({ id, date }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const evt = id === WHITE_DAYS_EVENT.id ? WHITE_DAYS_EVENT : ISLAMIC_EVENTS.find((e) => e.id === id);
  if (!evt) return null;
  const tx = eventText(evt, t.lang);
  const h = date ? app.hijri(date) : null;
  return (
    <View>
      {date ? (
        <Card active style={{ padding: 14 }}>
          <Label size={8.5}>{t(evt.labelPrefix || 'Date')}</Label>
          <Serif size={18} style={{ marginTop: 3 }}>{longDate(t.lang, date, true)}</Serif>
          <Body size={12} color={th.accent}>{hijriLabel(t.lang, h)}</Body>
        </Card>
      ) : null}
      <SectionLabel>{t('Why it matters')}</SectionLabel>
      <Para>{tx.importance}</Para>
      {tx.virtues && tx.virtues.length ? (
        <>
          <SectionLabel>{t('Virtues')}</SectionLabel>
          <Bullets items={tx.virtues} icon="star" />
        </>
      ) : null}
      {tx.actions && tx.actions.length ? (
        <>
          <SectionLabel>{t('What to do')}</SectionLabel>
          <Bullets items={tx.actions} />
        </>
      ) : null}
      <Body size={11} color={th.faint} style={{ marginTop: 14 }}>{t('Dates follow the moon and may differ by a day from your local announcement.')}</Body>
    </View>
  );
}

/* ------------------------------ Day sheet ------------------------------ */
function DaySheet({ date }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const key = date.toDateString();
  const j = app.data.journalByDay[key] || {};
  const [note, setNote] = useState(j.text || '');
  const h = app.hijri(date);
  const isFuture = date > app.today;
  const times = app.getDay(date);
  const now = new Date();
  const evt = eventOnDay(date, h, app.hijri);
  const fast = fastingDayInfo(date, app.cal);
  const prayedCount = PRAYER_NAMES.filter((n) => app.isPrayed(date, n)).length;
  const saveJournal = (patch) => {
    app.update((p) => {
      const cur = { ...(p.journalByDay[key] || {}), ...patch, updatedAt: new Date().toISOString() };
      const next = { ...p.journalByDay };
      if (!cur.text && !cur.mood && !cur.fasted) delete next[key];
      else next[key] = cur;
      return { journalByDay: next };
    });
  };
  // save the note shortly after typing stops
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    const hd = setTimeout(() => saveJournal({ text: note.trim() }), 500);
    return () => clearTimeout(hd);
  }, [note]);

  const tags = [];
  if (evt) tags.push({ color: th.occ, icon: 'star', title: eventText(evt, t.lang).title, onPress: () => nav.openSheet('event', { id: evt.id, date }) });
  if (h.day >= 13 && h.day <= 15) tags.push({ color: th.wdc, icon: 'circle', title: t('White Day'), text: t('Fasting the 13th–15th of each Hijri month is Sunnah.'), onPress: () => nav.openSheet('event', { id: 'white-days' }) });
  else if (fast && (fast.reason === 'monday' || fast.reason === 'thursday')) tags.push({ color: th.sfc, icon: 'sunrise', title: fast.reason === 'monday' ? t('Monday fast') : t('Thursday fast'), text: t('A Sunnah fast day.'), onPress: () => nav.openSheet('sunnahFast', { reason: fast.reason, date }) });
  if (h.monthIndex === 8) tags.push({ color: th.accent, icon: 'moon', title: t('Ramadan · day {n}', { n: h.day }) });

  const due = PRAYER_NAMES.filter((n) => times[n] <= now);
  const canTickAll = !isFuture && due.length > 0 && due.some((n) => !app.isPrayed(date, n));
  const tz = app.coords.timezone;
  return (
    <View>
      {/* That day's five times */}
      <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: th.line, borderRadius: 14, marginBottom: 12 }}>
        {PRAYER_NAMES.map((n, i) => (
          <View key={n} style={[{ flex: 1, alignItems: 'center', paddingVertical: 8 }, i > 0 && { borderLeftWidth: 1, borderColor: th.line }]}>
            <Label size={7.5} numberOfLines={1} adjustsFontSizeToFit style={{ paddingHorizontal: 2 }}>{t(n)}</Label>
            <Serif size={13} numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 2, paddingHorizontal: 2 }}>{timeStr(t, times[n], tz, true)}</Serif>
          </View>
        ))}
      </View>

      {tags.map((g, i) => (
        <Card key={i} onPress={g.onPress} style={{ padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: g.color }}>
          <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: g.color }} />
          <View style={{ flex: 1 }}>
            <Body size={13.5} weight="semi">{g.title}</Body>
            {g.text ? <Body size={11.5} color={th.muted}>{g.text}</Body> : null}
          </View>
          {g.onPress ? <Feather name="chevron-right" size={16} color={th.faint} /> : null}
        </Card>
      ))}

      {isFuture ? (
        <>
          <SectionLabel>{t('Fasting')}</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Card style={{ flex: 1, padding: 11 }}>
              <Label size={8.5}>{t('Seheri ends')}</Label>
              <Serif bold size={18} style={{ marginTop: 2 }}>{timeStr(t, addMinutes(times.Fajr, -(app.data.safetyBuffer || 0)), tz)}</Serif>
            </Card>
            <Card style={{ flex: 1, padding: 11 }}>
              <Label size={8.5}>{t('Iftar')}</Label>
              <Serif bold size={18} style={{ marginTop: 2 }}>{timeStr(t, times.Maghrib, tz)}</Serif>
            </Card>
          </View>
          <Card style={{ marginTop: 10, paddingVertical: 2 }}>
            <FastPlanRow date={date} />
          </Card>
        </>
      ) : (
        <>
          <SectionLabel right={<Label>{t('{n} of 5', { n: prayedCount })}</Label>}>{t('Prayers')}</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {PRAYER_NAMES.map((n) => {
              const on = app.isPrayed(date, n);
              const isDue = times[n] <= now;
              return (
                <Press
                  key={n}
                  disabled={!isDue}
                  onPress={() => app.togglePrayer(date, n)}
                  accessibilityState={{ checked: on }}
                  style={[
                    { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: th.line, gap: 5 },
                    on && { borderColor: th.ok, backgroundColor: 'rgba(63,178,127,0.14)' },
                  ]}
                >
                  <Tick done={on} size={20} />
                  <Body size={10.5} weight="semi" color={on ? th.ok : th.muted} numberOfLines={1} adjustsFontSizeToFit>{t(n)}</Body>
                </Press>
              );
            })}
          </View>
          {canTickAll ? (
            <Press onPress={() => due.forEach((n) => app.setPrayed(date, n, true))} style={{ alignSelf: 'flex-end', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: th.accentLine }}>
              <Feather name="check" size={13} color={th.accent} />
              <Body size={12} weight="semi" color={th.accent}>{due.length === 5 ? t('Tick all 5') : t('Tick all so far')}</Body>
            </Press>
          ) : null}

          <SectionLabel>{t('Mood')}</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
            {MOODS.map((m) => (
              <Chip key={m.id} label={t(m.label)} icon={m.icon} active={j.mood === m.id} onPress={() => saveJournal({ mood: j.mood === m.id ? null : m.id })} />
            ))}
          </View>

          <SectionLabel>{t('Fasted')}</SectionLabel>
          <Card style={{ paddingVertical: 2 }}>
            <Row first label={t('Kept a fast this day')} right={<Toggle value={!!j.fasted} onChange={(v) => saveJournal({ fasted: v })} />} />
          </Card>
        </>
      )}

      <SectionLabel>{t('Note')}</SectionLabel>
      <Input value={note} onChangeText={setNote} placeholder={t('Anything to remember about this day…')} multiline />
      <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{isFuture ? t('Prayers and mood can be logged once this day arrives.') : t('Saved automatically.')}</Body>
    </View>
  );
}

/* --------------------------- Location sheet --------------------------- */
function LocationSheet({ onClose }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const { data } = app;
  // Which country's list to show first: wherever the app is set now.
  const startGroup = app.coords.latitude < -30 ? 'NZ' : app.coords.latitude > 20 && app.coords.latitude < 27 && app.coords.longitude > 88 && app.coords.longitude < 93 ? 'BD' : 'NZ';
  const [group, setGroup] = useState(startGroup);

  const choose = (loc) => {
    if (!loc) {
      app.update({ activeLocationId: 'auto' });
      app.fetchGps(false);
    } else {
      const existing = data.savedLocations.find((l) => Math.abs(l.latitude - loc.latitude) < 0.01 && Math.abs(l.longitude - loc.longitude) < 0.01);
      if (existing) app.update({ activeLocationId: existing.id });
      else {
        const id = `loc-${Date.now()}`;
        app.update((p) => ({ savedLocations: [...p.savedLocations, { ...loc, id }], activeLocationId: id }));
      }
    }
    app.setToast(t('Location set to {name}', { name: loc ? loc.label : t('Current location') }));
    onClose();
  };
  const remove = (id) => {
    app.update((p) => ({ savedLocations: p.savedLocations.filter((l) => l.id !== id), activeLocationId: p.activeLocationId === id ? 'auto' : p.activeLocationId }));
  };
  const useGps = async () => {
    if (Platform.OS !== 'web') {
      const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
      if (!perm || perm.status !== 'granted') {
        app.setToast(t('Location permission is off. Pick a city instead.'));
        return;
      }
    }
    choose(null);
  };
  const search = async () => {
    const term = q.trim();
    Keyboard.dismiss();
    if (!term) return;
    const local = CITIES.filter((c) => `${c[0]} ${c[1]}`.toLowerCase().includes(term.toLowerCase())).map((c) => ({ label: `${c[0]}, ${c[1]}`, latitude: c[2], longitude: c[3] }));
    setBusy(true);
    let found = [];
    if (Platform.OS !== 'web') {
      try {
        const g = await Location.geocodeAsync(term);
        for (const r of g.slice(0, 4)) {
          let label = term;
          try {
            const rev = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
            if (rev && rev[0]) label = [rev[0].city || rev[0].subregion || rev[0].region || term, rev[0].isoCountryCode].filter(Boolean).join(', ');
          } catch (e) {
            // keep the typed name
          }
          found.push({ label, latitude: r.latitude, longitude: r.longitude });
        }
      } catch (e) {
        found = [];
      }
    }
    const all = [...local, ...found].filter((x, i, arr) => arr.findIndex((y) => Math.abs(y.latitude - x.latitude) < 0.05 && Math.abs(y.longitude - x.longitude) < 0.05) === i);
    setResults(all.map((x) => ({ ...x, timezone: resolveTimezone(x.latitude, x.longitude) })));
    setBusy(false);
  };

  const inGroup = (c) => (group === 'other' ? c[1] !== 'NZ' && c[1] !== 'BD' : c[1] === group);
  const list = results || CITIES.filter(inGroup).map((c) => ({ label: `${c[0]}, ${c[1]}`, latitude: c[2], longitude: c[3], timezone: resolveTimezone(c[2], c[3]) }));
  return (
    <View>
      <Card style={{ paddingVertical: 2 }}>
        <Row
          first
          icon="navigation"
          label={t('Use my location')}
          sub={app.isAuto ? `${t('On')} · ${app.locationName}` : t('Updates automatically when you travel')}
          right={app.isAuto ? <Feather name="check" size={18} color={th.ok} /> : null}
          onPress={useGps}
        />
        {data.savedLocations.map((l) => (
          <Row
            key={l.id}
            icon="map-pin"
            label={l.label}
            sub={l.timezone}
            onPress={() => choose(l)}
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {data.activeLocationId === l.id ? <Feather name="check" size={18} color={th.ok} /> : null}
                <Press onPress={() => remove(l.id)} hitSlop={10} accessibilityLabel={t('Remove')}>
                  <Feather name="trash-2" size={16} color={th.faint} />
                </Press>
              </View>
            }
          />
        ))}
      </Card>
      <SectionLabel>{t('Find a city')}</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Input value={q} onChangeText={setQ} placeholder={t('e.g. Auckland or Sylhet')} style={{ flex: 1 }} returnKeyType="search" onSubmitEditing={search} autoCorrect={false} />
        <Press onPress={search} style={{ width: 46, borderRadius: 14, backgroundColor: th.card, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={t('Search')}>
          {busy ? <ActivityIndicator color={th.cardInk} /> : <Feather name="search" size={18} color={th.cardInk} />}
        </Press>
      </View>
      {results ? <SectionLabel>{t('Results')}</SectionLabel> : (
        <View style={{ flexDirection: 'row', marginTop: 16, marginBottom: 8 }}>
          {[['NZ', t('New Zealand')], ['BD', t('Bangladesh')], ['other', t('Elsewhere')]].map(([id, label]) => (
            <Chip key={id} label={`${label} · ${t.num(CITIES.filter((c) => (id === 'other' ? c[1] !== 'NZ' && c[1] !== 'BD' : c[1] === id)).length)}`} active={group === id} onPress={() => setGroup(id)} />
          ))}
        </View>
      )}
      {results && results.length === 0 ? <Body size={12.5} color={th.muted}>{t('No match. Try a bigger city nearby.')}</Body> : null}
      <Card style={{ paddingVertical: 2 }}>
        {list.map((c, i) => (
          <Row key={`${c.label}${i}`} first={i === 0} label={c.label} sub={c.timezone} onPress={() => choose(c)} />
        ))}
      </Card>
    </View>
  );
}

/* --------------------------- Nawafil sheet --------------------------- */
function NawafilSheet({ k, win }) {
  const th = useTheme();
  const t = useT();
  const info = infoText(t.lang).NAWAFIL[k] || NAWAFIL_INFO[k];
  return (
    <View>
      {win ? (
        <Card active style={{ padding: 14 }}>
          <Label size={8.5}>{t('Today')}</Label>
          <Serif bold size={20} style={{ marginTop: 3 }}>{win}</Serif>
        </Card>
      ) : null}
      <Para style={{ marginTop: 14 }}>{info.body}</Para>
      <Body size={11} color={th.faint} style={{ marginTop: 12 }}>{t('Tick it off on the Ibadah tab once done.')}</Body>
    </View>
  );
}

function SunnahFastSheet({ reason, date }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const text = (infoText(t.lang).SUNNAH_FAST || {})[reason] || SUNNAH_FAST_INFO[reason];
  const d = app.getDay(date);
  const tz = app.coords.timezone;
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, padding: 12 }}>
          <Label size={8.5}>{t('Seheri ends')}</Label>
          <Serif bold size={19} style={{ marginTop: 3 }}>{timeStr(t, addMinutes(d.Fajr, -(app.data.safetyBuffer || 0)), tz)}</Serif>
        </Card>
        <Card style={{ flex: 1, padding: 12 }}>
          <Label size={8.5}>{t('Iftar')}</Label>
          <Serif bold size={19} style={{ marginTop: 3 }}>{timeStr(t, d.Maghrib, tz)}</Serif>
        </Card>
      </View>
      <Para style={{ marginTop: 14 }}>{text}</Para>
      <Body size={11} color={th.faint} style={{ marginTop: 12 }}>{t('You get a reminder the evening before if fasting alerts are on.')}</Body>
    </View>
  );
}

/* --------------------------- Fast day sheet --------------------------- */
function FastDaySheet({ date }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const d = app.getDay(date);
  const tz = app.coords.timezone;
  const j = app.data.journalByDay[date.toDateString()] || {};
  const fast = fastingDayInfo(date, app.cal);
  const isFuture = date > app.today;
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, padding: 12 }}>
          <Label size={8.5}>{t('Seheri ends')}</Label>
          <Serif bold size={19} style={{ marginTop: 3 }}>{timeStr(t, addMinutes(d.Fajr, -(app.data.safetyBuffer || 0)), tz)}</Serif>
        </Card>
        <Card style={{ flex: 1, padding: 12 }}>
          <Label size={8.5}>{t('Iftar')}</Label>
          <Serif bold size={19} style={{ marginTop: 3 }}>{timeStr(t, d.Maghrib, tz)}</Serif>
        </Card>
      </View>
      <Body size={12} color={th.muted} style={{ marginTop: 8 }}>
        {t('Fasting time: {d}', { d: (() => { const ms = d.Maghrib - addMinutes(d.Fajr, -(app.data.safetyBuffer || 0)); const m = Math.round(ms / 60000); return t('{h}h {m}m', { h: Math.floor(m / 60), m: m % 60 }); })() })}
      </Body>
      {fast ? (
        <Card style={{ marginTop: 12, padding: 12 }} active>
          <Body size={13} weight="semi">{t(`fast:${fast.reason}`).replace(/^./, (c) => c.toUpperCase())}</Body>
        </Card>
      ) : null}
      <Card style={{ marginTop: 12, paddingVertical: 2 }}>
        {isFuture ? (
          <FastPlanRow date={date} />
        ) : (
          <Row first label={t('Kept a fast this day')} right={<Toggle value={!!j.fasted} onChange={(v) => app.setFasted(date, v)} />} />
        )}
      </Card>
    </View>
  );
}

/* A future day: offer a reminder instead of a "kept" switch. */
function FastPlanRow({ date }) {
  const app = useApp();
  const t = useT();
  const key = date.toDateString();
  const on = !!(app.data.fastPlans || {})[key];
  const toggle = (v) => {
    app.update((p) => {
      const next = { ...(p.fastPlans || {}) };
      if (v) next[key] = true;
      else delete next[key];
      return { fastPlans: next };
    });
    if (v) app.setToast(app.alertsStatus === 'denied' ? t('Turn on notifications for Deen to get this reminder') : t("We'll remind you the night before"));
  };
  return <Row first icon="bell" label={t('Remind me to fast')} sub={t('The night before, and 30 min before Seheri ends')} right={<Toggle value={on} onChange={toggle} />} />;
}

/* -------------------------- Choice (generic) -------------------------- */
function ChoiceSheet({ options, value, onPick, onClose, note }) {
  const th = useTheme();
  return (
    <View>
      <Card style={{ paddingVertical: 2 }}>
        {options.map((o, i) => (
          <Row
            key={String(o.id)}
            first={i === 0}
            label={o.label}
            sub={o.sub}
            onPress={() => {
              onPick(o.id);
              onClose();
            }}
            right={o.id === value ? <Feather name="check" size={18} color={th.ok} /> : <View />}
          />
        ))}
      </Card>
      {note ? <Body size={11.5} color={th.muted} style={{ marginTop: 10 }}>{note}</Body> : null}
    </View>
  );
}

/* --------------------------- Info (generic) --------------------------- */
function InfoSheet({ body, bullets }) {
  return (
    <View>
      {body ? <Para>{body}</Para> : null}
      {bullets ? <Bullets items={bullets} /> : null}
    </View>
  );
}

/* --------------------------- Qibla route --------------------------- */
function CalibrateSheet() {
  const t = useT();
  return (
    <View>
      <Para>{t('Phone compasses drift near metal, magnets, cars and speakers. To fix it:')}</Para>
      <Bullets
        items={[
          t('Move away from metal objects and take the phone out of a magnetic case.'),
          t('Wave the phone in a figure 8 a few times, tilting it as you go.'),
          t('Hold it flat and wait a second for the dial to settle.'),
        ]}
      />
    </View>
  );
}

/* ------------------------------ Router ------------------------------ */
export default function Sheets({ sheet, onClose }) {
  const app = useApp();
  const t = useT();
  const [last, setLast] = useState(sheet);
  useEffect(() => {
    if (sheet && sheet.open) setLast(sheet);
  }, [sheet]);
  const s = sheet && sheet.open ? sheet : last;
  if (!s) return null;
  const p = s.params || {};
  let title = '';
  let subtitle = '';
  let body = null;
  switch (s.type) {
    case 'prayer': {
      title = t(p.name);
      subtitle = `${PRAYER_AR[p.name] || ''}  ·  ${longDate(t.lang, p.date)}`;
      body = <PrayerSheet name={p.name} date={p.date} />;
      break;
    }
    case 'prohibited': {
      const info = infoText(t.lang).PROHIBITED[p.key] || PROHIBITED_INFO[p.key];
      title = info.title;
      subtitle = t('Prohibited time');
      body = <ProhibitedSheet k={p.key} />;
      break;
    }
    case 'event': {
      const evt = p.id === WHITE_DAYS_EVENT.id ? WHITE_DAYS_EVENT : ISLAMIC_EVENTS.find((e) => e.id === p.id);
      title = evt ? eventText(evt, t.lang).title : '';
      body = <EventSheet id={p.id} date={p.date} />;
      break;
    }
    case 'day': {
      title = longDate(t.lang, p.date, true);
      subtitle = hijriLabel(t.lang, app.hijri(p.date));
      body = <DaySheet key={p.date.toDateString()} date={p.date} />;
      break;
    }
    case 'location':
      title = t('Location');
      subtitle = t('Prayer times and Qibla are worked out for this place');
      body = <LocationSheet onClose={onClose} />;
      break;
    case 'nawafil': {
      const info = infoText(t.lang).NAWAFIL[p.k] || NAWAFIL_INFO[p.k];
      title = info.title;
      body = <NawafilSheet k={p.k} win={p.window} />;
      break;
    }
    case 'sunnahFast':
      title = p.reason === 'monday' ? t('Monday fast') : p.reason === 'thursday' ? t('Thursday fast') : t(`fast:${p.reason}`);
      subtitle = longDate(t.lang, p.date);
      body = <SunnahFastSheet reason={p.reason} date={p.date} />;
      break;
    case 'fastDay':
      title = longDate(t.lang, p.date);
      subtitle = hijriLabel(t.lang, app.hijri(p.date));
      body = <FastDaySheet date={p.date} />;
      break;
    case 'choice':
      title = p.title;
      subtitle = p.subtitle;
      body = <ChoiceSheet {...p} onClose={onClose} />;
      break;
    case 'info':
      title = p.title;
      subtitle = p.subtitle;
      body = <InfoSheet {...p} />;
      break;
    case 'calibrate':
      title = t('Calibrate the compass');
      body = <CalibrateSheet />;
      break;
    default:
      body = null;
  }
  return (
    <Sheet visible={!!(sheet && sheet.open)} onClose={onClose} title={title} subtitle={subtitle}>
      {body}
      <View style={{ height: 8 }} />
    </Sheet>
  );
}

export { Bullets, Para, PrayerSheet };
