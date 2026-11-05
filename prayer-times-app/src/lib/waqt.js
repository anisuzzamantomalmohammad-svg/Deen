// When each prayer's time (waqt) starts and ends, plus the extra night and
// morning times. Pure functions over computeDay() results, so the screens and
// the alert planner use exactly the same numbers. Hanafi rules:
//   Fajr     ends at sunrise
//   Dhuhr    ends when Asr starts
//   Asr      ends at Maghrib; best before the sun yellows (15 min before)
//   Maghrib  ends when Isha starts
//   Isha     ends at Fajr; best before Islamic midnight (half the night)
import { addMinutes, MAKRUH } from './prayer';

// day = computeDay(date), next = computeDay(date + 1 day)
export function prayerWindow(name, day, next) {
  switch (name) {
    case 'Fajr':
      return { start: day.Fajr, end: day.Sunrise, endWhy: 'at sunrise', best: null };
    case 'Dhuhr':
      return { start: day.Dhuhr, end: day.Asr, endWhy: 'when Asr starts', best: null };
    case 'Asr':
      return { start: day.Asr, end: day.Maghrib, endWhy: 'at Maghrib', best: { at: addMinutes(day.Maghrib, -MAKRUH.beforeMaghrib), why: 'sun turns yellow' } };
    case 'Maghrib':
      return { start: day.Maghrib, end: day.Isha, endWhy: 'when Isha starts', best: null };
    case 'Isha':
    default: {
      const n = nightOf(day, next);
      return { start: day.Isha, end: next.Fajr, endWhy: 'at Fajr', best: { at: n.midnight, why: 'Islamic midnight' } };
    }
  }
}

// The night that starts at this day's Maghrib.
export function nightOf(day, next) {
  const len = next.Fajr - day.Maghrib;
  return {
    midnight: new Date(day.Maghrib.getTime() + len / 2),
    lastThird: new Date(day.Maghrib.getTime() + (len * 2) / 3),
    end: next.Fajr,
  };
}

// Duha: from 15 minutes after sunrise until shortly before Dhuhr.
export function duhaOf(day) {
  return { start: addMinutes(day.Sunrise, MAKRUH.afterSunrise), end: addMinutes(day.Dhuhr, -10) };
}
