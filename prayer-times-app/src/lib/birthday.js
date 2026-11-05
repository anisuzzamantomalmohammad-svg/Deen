// Hijri birthday: the next Gregorian date with the saved Hijri day and month.
import { addDays } from './prayer';

export function nextHijriDate(b, today, hijri, horizon = 400) {
  if (!b) return null;
  for (let i = 0; i <= horizon; i++) {
    const d = addDays(today, i);
    const h = hijri(d);
    if (h.monthIndex === b.monthIndex && (h.day === b.day || (b.day === 30 && h.day === 29 && hijri(addDays(d, 1)).day === 1))) return d;
  }
  return null;
}

export function isHijriBirthday(b, date, hijri) {
  if (!b) return false;
  const h = hijri(date);
  if (h.monthIndex !== b.monthIndex) return false;
  // Born on the 30th: in a 29-day month, the 29th counts.
  return h.day === b.day || (b.day === 30 && h.day === 29 && hijri(addDays(date, 1)).day === 1);
}

// Age in Hijri years on that date (null if the birth year wasn't saved).
export function hijriAge(b, date, hijri) {
  if (!b || !b.year) return null;
  return hijri(date).year - b.year;
}
