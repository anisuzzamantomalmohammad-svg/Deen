import { ISLAMIC_EVENTS, WHITE_DAYS_EVENT } from '../data/events';
import { addDays } from './prayer';

export function eventOnDay(dateObj, h, hijriFn) {
  for (const evt of ISLAMIC_EVENTS) {
    if (evt.hijri && evt.hijri.monthIndex === h.monthIndex && evt.hijri.day === h.day) return evt;
    if (evt.rule === 'lastFridayOfRamadan' && h.monthIndex === 8 && dateObj.getDay() === 5) {
      if (hijriFn(addDays(dateObj, 7)).monthIndex !== 8) return evt;
    }
  }
  return null;
}

// Next occurrence of every occasion from today, plus the next White Days.
export function upcomingEvents(today, hijriFn, horizon = 400) {
  const out = [];
  const found = new Set();
  let white = null;
  for (let i = 0; i <= horizon && found.size < ISLAMIC_EVENTS.length; i++) {
    const d = addDays(today, i);
    const h = hijriFn(d);
    const evt = eventOnDay(d, h, hijriFn);
    if (evt && !found.has(evt.id)) {
      found.add(evt.id);
      out.push({ evt, date: d, h });
    }
    if (!white && (h.day === 13 || (i === 0 && h.day >= 13 && h.day <= 15))) white = { evt: WHITE_DAYS_EVENT, date: d, h, days: 16 - h.day };
  }
  if (white) out.push(white);
  return out.sort((a, b) => a.date - b.date);
}
