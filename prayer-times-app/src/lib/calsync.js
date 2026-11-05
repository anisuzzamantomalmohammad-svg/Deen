// Important days and "My fasts" in the phone's calendar (which syncs to
// Google Calendar). Deen only adds and removes its own all-day events.
// Dates follow the app's Hijri calendar, so when a month moves (moon
// sighting), the city changes or a fast is planned or kept, the events are
// rewritten. Before writing, every event Deen added in that calendar is
// cleared first, so two phones on one account never leave duplicates.
import { Platform } from 'react-native';
import { addDays, addMinutes, formatTime } from './prayer';
import { eventsOnDay } from './events';
import { eventTitle } from '../data/eventText';

export const CAL_KINDS = [
  { id: 'eid', ids: ['eid-fitr', 'eid-adha'], label: 'Eid al-Fitr & Eid al-Adha', on: true },
  { id: 'ramadan', ids: ['ramadan'], label: 'Start of Ramadan', on: true },
  { id: 'qadr', ids: ['laylatul-qadr', 'odd-night'], label: 'Laylat al-Qadr nights', on: true },
  { id: 'fasts', ids: ['arafah', 'ashura'], label: 'Arafah & Ashura fasts', on: true },
  { id: 'nights', ids: ['shab-e-barat', 'shab-e-meraj'], label: 'Shab-e-Barat & Shab-e-Meraj', on: false },
  { id: 'white', ids: [], label: 'White Days (each month)', on: false },
  { id: 'newyear', ids: ['new-year'], label: 'Islamic New Year', on: false },
  { id: 'myfasts', ids: [], label: 'My fasts, with Seheri and Iftar times', on: true },
];
const NOTE_DAYS = 'Added by Deen. Dates follow the moon and may move by a day.';
const NOTE_FASTS = 'Added by Deen · My fasts. Times follow your city in Deen.';
export const DEFAULT_KINDS = CAL_KINDS.filter((k) => k.on).map((k) => k.id);

const Cal = () => {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-calendar');
  } catch (e) {
    return null;
  }
};
export const calendarAvailable = () => !!Cal();

export async function askPermission() {
  const C = Cal();
  if (!C) return false;
  const p = await C.requestCalendarPermissionsAsync();
  return p.status === 'granted';
}

// Calendars Deen can write to, Google ones first.
export async function writableCalendars(email) {
  const C = Cal();
  const all = await C.getCalendarsAsync(C.EntityTypes.EVENT);
  const ok = all.filter((c) => c.allowsModifications);
  const score = (c) => (email && (c.ownerAccount === email || (c.source && c.source.name === email)) ? (c.isPrimary ? 0 : 1) : c.source && c.source.type === 'com.google' ? 2 : 3);
  return ok.sort((a, b) => score(a) - score(b));
}

export async function createDeenCalendar(color) {
  const C = Cal();
  return C.createCalendarAsync({
    title: 'Deen', name: 'Deen', color: color || '#2E6B4F', entityType: C.EntityTypes.EVENT,
    source: { isLocalAccount: true, name: 'Deen', type: C.SourceType ? C.SourceType.LOCAL : 'LOCAL' },
    ownerAccount: 'Deen', accessLevel: C.CalendarAccessLevel ? C.CalendarAccessLevel.OWNER : 'owner',
  });
}

// Every chosen day in the next year: [{ date, title }]. With "My fasts"
// (needs data and getDay): planned fasts and Ramadan days ahead, and fasts
// kept in the last 30 days, each with that day's Seheri and Iftar.
export function plannedEvents({ today, hijri, kinds, lang, data, getDay, tz }) {
  const ids = new Set(CAL_KINDS.filter((k) => kinds.includes(k.id)).flatMap((k) => k.ids));
  const out = [];
  const bn = lang === 'bn';
  if (kinds.includes('myfasts') && data && getDay) {
    const j = data.journalByDay || {};
    const plans = data.fastPlans || {};
    const skip = new Set([...(data.missedFasts || []).map((m) => m.day), ...Object.keys(data.notFastingByDay || {})]);
    const buf = data.safetyBuffer || 0;
    const fmt = (x) => (x ? formatTime(x, tz, { compact: false }) : '');
    for (let i = -30; i < 366; i++) {
      const d = addDays(today, i);
      const key = d.toDateString();
      const h = hijri(d);
      const fasted = !!(j[key] || {}).fasted;
      const ramadan = h.monthIndex === 8;
      if (i < 0 ? !fasted : !(fasted || plans[key] || ramadan) || skip.has(key)) continue;
      const tm = getDay(d);
      const seheri = addMinutes(tm.Fajr, -buf);
      const what = ramadan ? (bn ? `রমজান ${h.day}` : `Ramadan ${h.day}`) : (bn ? 'রোজা' : 'Fast');
      const title = fasted
        ? `✓ ${what} · ${bn ? 'রোজা রেখেছেন' : 'fasted'}`
        : `${what} · ${bn ? 'সেহরি শেষ' : 'Seheri ends'} ${fmt(seheri)} · ${bn ? 'ইফতার' : 'Iftar'} ${fmt(tm.Maghrib)}`;
      out.push({ date: d, title, id: `fast:${key}`, fast: true });
    }
  }
  for (let i = 0; i < 366; i++) {
    const d = addDays(today, i);
    const h = hijri(d);
    eventsOnDay(d, h, hijri).forEach((e) => {
      if (!ids.has(e.id)) return;
      // A night starts at Maghrib the evening before, so it goes on that day.
      if (e.kind === 'night') out.push({ date: addDays(d, -1), title: `${eventTitle(e, lang)} · ${lang === 'bn' ? 'আজ রাতে' : 'tonight'}`, id: e.id });
      else out.push({ date: d, title: eventTitle(e, lang), id: e.id });
    });
    if (kinds.includes('white') && h.day === 13 && h.monthIndex !== 8) out.push({ date: d, title: lang === 'bn' ? 'আইয়ামে বীজ (১৩–১৫)' : 'White Days (13–15)', id: 'white', days: 3 });
  }
  const from = addDays(today, -30);
  return out.filter((e) => (e.fast ? e.date >= from : e.date >= today)).sort((a, b) => a.date - b.date);
}

// Clears every event Deen added in this calendar, from either phone: fasts
// from 30 days back, important days from today on.
export async function clearDeenEvents(calendarId, today) {
  const C = Cal();
  if (!C || !calendarId) return;
  try {
    const evs = await C.getEventsAsync([calendarId], addDays(today, -31), addDays(today, 400));
    for (const e of evs) {
      const n = e.notes || '';
      if (!n.startsWith('Added by Deen')) continue;
      const start = new Date(e.startDate);
      const fast = n.startsWith(NOTE_FASTS.slice(0, 22));
      if (!fast && start < addDays(today, -1)) continue;
      try { await C.deleteEventAsync(e.id); } catch (x) { /* already gone */ }
    }
  } catch (e) {
    // can't read the calendar: the saved ids are still removed
  }
}

export async function removeEvents(ids) {
  const C = Cal();
  if (!C) return;
  for (const id of ids || []) {
    try {
      await C.deleteEventAsync(id);
    } catch (e) {
      // already gone
    }
  }
}

// Writes the events; returns their ids.
export async function writeEvents(calendarId, list, tz) {
  const C = Cal();
  const ids = [];
  for (const ev of list) {
    const start = new Date(ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate());
    const end = addDays(start, ev.days || 1);
    try {
      const id = await C.createEventAsync(calendarId, {
        title: ev.title, startDate: start, endDate: end, allDay: true, timeZone: tz,
        notes: ev.fast ? NOTE_FASTS : NOTE_DAYS,
        alarms: ev.fast ? [] : [{ relativeOffset: -6 * 60 }],
      });
      ids.push(id);
    } catch (e) {
      // skip this one
    }
  }
  return ids;
}

// Rewrite everything for the saved choice (after a moon-sighting change, a
// new city, a fast planned or kept, or weekly).
export async function syncCalendar(sync, { today, hijri, lang, tz, data, getDay }) {
  if (!sync || !sync.calendarId || !Cal()) return null;
  const p = await Cal().getCalendarPermissionsAsync();
  if (p.status !== 'granted') return null;
  await removeEvents(sync.eventIds);
  await clearDeenEvents(sync.calendarId, today);
  const list = plannedEvents({ today, hijri, kinds: sync.kinds, lang, data, getDay, tz });
  const eventIds = await writeEvents(sync.calendarId, list, tz);
  return { ...sync, eventIds, count: list.length, at: new Date().toISOString() };
}
