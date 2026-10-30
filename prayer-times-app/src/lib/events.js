import { ISLAMIC_EVENTS, WHITE_DAYS_EVENT, ECLIPSE_EVENT } from '../data/events';
import { addDays, sameDay } from './prayer';
import { eclipsesBetween } from './eclipse';

// Order on days with more than one event: the main days first, history last.
const KIND_ORDER = { eid: 0, fast: 1, night: 2, hajj: 3, sacred: 4, day: 5, custom: 6, history: 7 };
const rank = (e) => (e.alert ? 0 : 10) + (KIND_ORDER[e.kind] ?? 8);

export function eventById(id) {
  if (id === WHITE_DAYS_EVENT.id) return WHITE_DAYS_EVENT;
  if (id === ECLIPSE_EVENT.id) return ECLIPSE_EVENT;
  return ISLAMIC_EVENTS.find((e) => e.id === id) || null;
}

// Does `evt` fall on this day? Returns the day number within a run (1 = first) or 0.
function matches(evt, dateObj, h, hijriFn) {
  if (evt.rule === 'lastFridayOfRamadan') {
    return h.monthIndex === 8 && dateObj.getDay() === 5 && hijriFn(addDays(dateObj, 7)).monthIndex !== 8 ? 1 : 0;
  }
  if (evt.rule === 'lastWednesdayOfSafar') {
    return h.monthIndex === 1 && dateObj.getDay() === 3 && hijriFn(addDays(dateObj, 7)).monthIndex !== 1 ? 1 : 0;
  }
  const hj = evt.hijri;
  if (!hj || hj.monthIndex !== h.monthIndex) return 0;
  if (hj.days) return hj.days.includes(h.day) ? 1 : 0;
  if (hj.span) return h.day >= hj.day && h.day < hj.day + hj.span ? h.day - hj.day + 1 : 0;
  return hj.day === h.day ? 1 : 0;
}

const shown = (evt, opts) => !(evt.kind === 'history' && opts && opts.history === false);

// Every event on a day, most important first.
export function eventsOnDay(dateObj, h, hijriFn, opts) {
  const out = [];
  for (const evt of ISLAMIC_EVENTS) {
    if (shown(evt, opts) && matches(evt, dateObj, h, hijriFn)) out.push(evt);
  }
  return out.sort((a, b) => rank(a) - rank(b));
}

// The main event of a day (or null). Kept for the calendar mark and alerts.
export function eventOnDay(dateObj, h, hijriFn, opts) {
  return eventsOnDay(dateObj, h, hijriFn, opts)[0] || null;
}

// The visible eclipse on this day, if any.
export function eclipseOnDay(dateObj, coords) {
  if (!coords) return null;
  const list = eclipsesBetween(new Date(dateObj.getFullYear(), 0, 1), new Date(dateObj.getFullYear() + 1, 0, 1), coords);
  return list.find((e) => sameDay(e.date, dateObj)) || null;
}

// Next occurrence of each event from today, plus the next White Days and any
// eclipse in range. For runs of days (Tashreeq, Qurbani) the first day counts,
// unless today is already inside the run.
export function upcomingEvents(today, hijriFn, horizon = 400, opts = {}) {
  const out = [];
  const found = new Set();
  let white = null;
  for (let i = 0; i <= horizon; i++) {
    const d = addDays(today, i);
    const h = hijriFn(d);
    for (const evt of ISLAMIC_EVENTS) {
      if (found.has(evt.id) || !shown(evt, opts)) continue;
      const n = matches(evt, d, h, hijriFn);
      if (n === 1 || (n > 1 && i === 0)) {
        found.add(evt.id);
        out.push({ evt, date: d, h });
      }
    }
    if (!white && (h.day === 13 || (i === 0 && h.day >= 13 && h.day <= 15))) white = { evt: WHITE_DAYS_EVENT, date: d, h, days: 16 - h.day };
  }
  if (white) out.push(white);
  if (opts.coords && opts.eclipses !== false) {
    for (const e of eclipsesBetween(today, addDays(today, horizon), opts.coords)) {
      if (e.date >= today) out.push({ evt: ECLIPSE_EVENT, date: e.date, h: hijriFn(e.date), eclipse: e });
    }
  }
  return out.sort((a, b) => a.date - b.date || rank(a.evt) - rank(b.evt));
}

// Every event in one Hijri year, in date order, for the Important days screen.
// `start` is 1 Muharram of that year.
export function yearEvents(start, hijriFn, opts = {}) {
  const out = [];
  const year = hijriFn(start).year;
  for (let i = 0; i < 360; i++) {
    const d = addDays(start, i);
    const h = hijriFn(d);
    if (h.year !== year) break;
    for (const evt of ISLAMIC_EVENTS) {
      if (!shown(evt, opts)) continue;
      if (matches(evt, d, h, hijriFn) === 1) {
        const span = evt.hijri && evt.hijri.span ? evt.hijri.span : 1;
        out.push({ evt, date: d, end: span > 1 ? addDays(d, span - 1) : null, h });
      }
    }
  }
  if (opts.coords && opts.eclipses !== false && out.length) {
    const last = addDays(start, 360);
    for (const e of eclipsesBetween(start, last, opts.coords)) {
      const h = hijriFn(e.date);
      if (h.year === year) out.push({ evt: ECLIPSE_EVENT, date: e.date, h, eclipse: e });
    }
  }
  return out.sort((a, b) => a.date - b.date || rank(a.evt) - rank(b.evt));
}
