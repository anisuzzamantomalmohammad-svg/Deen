// What the sky inside the arch shows right now: the sun on its path from
// sunrise to Maghrib (with rays on a day you're fasting), or the moon in
// tonight's real shape, with a star on nights that mean something.
import { addDays } from './prayer';
import { isPausedDay } from './qada';

// 0 none, 1 small star, 2 brighter star, for the night that starts Hijri day `h`.
// `weekday` is the weekday of that Hijri day's daytime (5 = Friday).
export function nightStar(h, weekday) {
  const m = h.monthIndex;
  const d = h.day;
  if (m === 8 && d >= 21 && d % 2 === 1) return 2; // odd nights of the last ten
  if ((m === 9 && d === 1) || (m === 11 && d === 10)) return 2; // Eid nights
  if ((m === 7 && d === 15) || (m === 6 && d === 27) || (m === 11 && d === 9)) return 2; // 15 Sha'ban, 27 Rajab, Arafah
  if (m === 8 || d === 1 || weekday === 5) return 1; // Ramadan nights, a new month, the night of Jumu'ah
  return 0;
}

export function isFastingDay(data, date, hijri) {
  const k = date.toDateString();
  if ((data.notFastingByDay || {})[k] || (data.missedFasts || []).some((x) => x.day === k)) return false;
  if (isPausedDay(data, date)) return false;
  return hijri(date).monthIndex === 8 || !!((data.journalByDay || {})[k] || {}).fasted || !!(data.fastPlans || {})[k];
}

export function skyFor({ now, today, getDay, hijri, data, latitude }) {
  const d = getDay(today);
  const south = latitude < 0;
  if (now >= d.Sunrise && now < d.Maghrib) {
    return { kind: 'sun', pos: (now - d.Sunrise) / (d.Maghrib - d.Sunrise), rays: isFastingDay(data, today, hijri) };
  }
  // the night belongs to the Hijri day that starts at its Maghrib
  const before = now < d.Sunrise;
  const start = before ? getDay(addDays(today, -1)).Maghrib : d.Maghrib;
  const end = before ? d.Sunrise : getDay(addDays(today, 1)).Sunrise;
  const dayOf = before ? today : addDays(today, 1);
  const h = hijri(dayOf);
  return { kind: 'moon', pos: Math.max(0, Math.min(1, (now - start) / (end - start))), hDay: h.day, star: nightStar(h, dayOf.getDay()), south };
}
