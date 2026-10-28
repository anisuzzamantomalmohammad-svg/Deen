// Prayer statistics from the prayer log (completedByDay).
// Only days from the first day anything was logged are counted, so a new
// user isn't shown months of "missed" prayers from before they started.
import { PRAYER_NAMES, addDays } from './prayer';

const ids = [1, 2, 3, 4, 5];

export function firstTrackedDay(completedByDay) {
  let first = null;
  Object.keys(completedByDay || {}).forEach((k) => {
    const rec = completedByDay[k];
    if (!rec || !ids.some((i) => rec[i])) return;
    const d = new Date(k);
    if (!Number.isNaN(d.getTime()) && (!first || d < first)) first = d;
  });
  return first;
}

// How many prayers of `dateObj` were due by `now` (all 5 for past days).
function dueCount(dateObj, today, now, getDay) {
  if (dateObj < today) return 5;
  if (dateObj > today) return 0;
  const t = getDay(dateObj);
  return PRAYER_NAMES.filter((n) => t[n] && t[n] <= now).length;
}

export function monthStats({ year, month, completedByDay, journalByDay, today, now, getDay }) {
  const start = firstTrackedDay(completedByDay);
  const days = new Date(year, month + 1, 0).getDate();
  let prayed = 0;
  let due = 0;
  let fasts = 0;
  const per = { Fajr: [0, 0], Dhuhr: [0, 0], Asr: [0, 0], Maghrib: [0, 0], Isha: [0, 0] };
  const missedDays = new Set();
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month, d);
    if (journalByDay?.[date.toDateString()]?.fasted && date <= today) fasts++;
    if (!start || date < start || date > today) continue;
    const rec = completedByDay[date.toDateString()] || {};
    const n = dueCount(date, today, now, getDay);
    due += n;
    let missedHere = false;
    PRAYER_NAMES.forEach((name, i) => {
      if (i >= n) return;
      per[name][1]++;
      if (rec[i + 1]) {
        per[name][0]++;
        prayed++;
      } else missedHere = true;
    });
    if (missedHere && date < today) missedDays.add(d);
  }
  let mostMissed = null;
  let worst = 0;
  PRAYER_NAMES.forEach((n) => {
    const miss = per[n][1] - per[n][0];
    if (miss > worst) {
      worst = miss;
      mostMissed = n;
    }
  });
  return { prayed, due, pct: due ? Math.round((prayed / due) * 100) : 0, fasts, per, missedDays, mostMissed, mostMissedCount: worst, tracking: !!start };
}

const fullDay = (rec) => rec && ids.every((i) => rec[i]);

// Current streak: consecutive full days ending today (or yesterday, if today
// isn't finished yet), and the best streak ever.
export function streaks(completedByDay, today) {
  let current = 0;
  let d = fullDay(completedByDay[today.toDateString()]) ? today : addDays(today, -1);
  while (fullDay(completedByDay[d.toDateString()])) {
    current++;
    d = addDays(d, -1);
  }
  const keys = Object.keys(completedByDay || {})
    .filter((k) => fullDay(completedByDay[k]))
    .map((k) => new Date(k))
    .filter((x) => !Number.isNaN(x.getTime()))
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = null;
  keys.forEach((k) => {
    run = prev && Math.round((k - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  });
  return { current, best: Math.max(best, current) };
}

export function lastMonths({ completedByDay, journalByDay, today, now, getDay, count = 5 }) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const s = monthStats({ year: m.getFullYear(), month: m.getMonth(), completedByDay, journalByDay, today, now, getDay });
    out.push({ date: m, pct: s.due ? s.pct : null });
  }
  return out;
}
