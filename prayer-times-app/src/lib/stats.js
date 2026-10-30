// Prayer statistics: on time, qada (made up later) and missed.
// Only days from the first day anything was logged are counted, so a new
// user isn't shown months of "missed" prayers from before they started.
// Stats are worked out per Hijri month, to match the Hijri tab.
import { PRAYER_NAMES, addDays } from './prayer';
import { statusOf, qadaHistory } from './qada';

const ids = [1, 2, 3, 4, 5];

export function firstTrackedDay(data) {
  let first = null;
  const consider = (k) => {
    const d = new Date(k);
    if (!Number.isNaN(d.getTime()) && (!first || d < first)) first = d;
  };
  Object.keys(data.completedByDay || {}).forEach((k) => {
    const rec = data.completedByDay[k];
    if (rec && ids.some((i) => rec[i])) consider(k);
  });
  Object.keys(data.qadaRecords || {}).forEach(consider);
  Object.keys(data.trackedDays || {}).forEach(consider);
  return first;
}

// The Hijri month that `date` falls in: its first day and length.
export function hijriMonthRange(date, hijri) {
  const h = hijri(date);
  const start = addDays(date, -(h.day - 1));
  let len = 29;
  if (hijri(addDays(start, 29)).monthIndex === h.monthIndex) len = 30;
  return { start, days: len, monthIndex: h.monthIndex, year: h.year };
}

// Stats over `days` days starting at `from`.
export function rangeStats({ from, days, data, today, now, getDay }) {
  const start = firstTrackedDay(data);
  const ctx = { today, now, getDay };
  let onTime = 0;
  let qada = 0;
  let missed = 0;
  let fasts = 0;
  const per = {};
  PRAYER_NAMES.forEach((n) => { per[n] = { onTime: 0, qada: 0, missed: 0, due: 0 }; });
  const reasons = {};
  const reasonsBy = {};
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const key = date.toDateString();
    if ((data.journalByDay || {})[key]?.fasted && date <= today) fasts++;
    if (!start || date < start || date > today) continue;
    PRAYER_NAMES.forEach((name, k) => {
      const s = statusOf(data, date, name, ctx);
      if (s === 'pending') return;
      per[name].due++;
      if (s === 'ontime') { onTime++; per[name].onTime++; }
      else if (s === 'qada') {
        qada++; per[name].qada++;
        const r = ((data.qadaRecords || {})[key] || {})[k + 1];
        const rid = (r && r.reason) || 'none';
        reasons[rid] = (reasons[rid] || 0) + 1;
        reasonsBy[name] = reasonsBy[name] || {};
        reasonsBy[name][rid] = (reasonsBy[name][rid] || 0) + 1;
      } else { missed++; per[name].missed++; }
    });
  }
  const due = onTime + qada + missed;
  let mostMissed = null;
  let worst = 0;
  PRAYER_NAMES.forEach((n) => {
    const late = per[n].qada + per[n].missed;
    if (late > worst) { worst = late; mostMissed = n; }
  });
  return { onTime, qada, missed, due, prayed: onTime, pct: due ? Math.round((onTime / due) * 100) : 0, fasts, per, reasons, reasonsBy, mostMissed, tracking: !!start };
}

export function hijriMonthStats({ date, data, today, now, getDay, hijri }) {
  const r = hijriMonthRange(date, hijri);
  return { ...rangeStats({ from: r.start, days: r.days, data, today, now, getDay }), range: r };
}

const fullDay = (rec) => rec && ids.every((i) => rec[i]);

// Current streak: consecutive days with all 5 on time, ending today (or
// yesterday, if today isn't finished yet), and the best streak ever.
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

// The last few Hijri months, only ones with something tracked.
export function lastHijriMonths({ data, today, now, getDay, hijri, count = 6, until }) {
  const out = [];
  let cur = hijriMonthRange(until || today, hijri);
  for (let i = 0; i < count; i++) {
    const s = rangeStats({ from: cur.start, days: cur.days, data, today, now, getDay });
    if (s.due) out.unshift({ ...cur, pct: s.pct, onTime: s.onTime, qada: s.qada, missed: s.missed });
    cur = hijriMonthRange(addDays(cur.start, -1), hijri);
  }
  return out;
}

// Week by week (Mon–Sun) for the last `weeks` weeks.
export function weeklyStats({ data, today, now, getDay, weeks = 6 }) {
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const from = addDays(monday, -7 * w);
    const s = rangeStats({ from, days: 7, data, today, now, getDay });
    let worst = null;
    let wc = 0;
    PRAYER_NAMES.forEach((n) => {
      const late = s.per[n].qada + s.per[n].missed;
      if (late > wc) { wc = late; worst = n; }
    });
    out.push({ from, onTime: s.onTime, qada: s.qada, missed: s.missed, due: s.due, worst, worstCount: wc });
  }
  return out;
}

// For the year in review: a whole Hijri year.
export function hijriYearStats({ year, data, today, now, getDay, hijri, findYearStart }) {
  const start = findYearStart(year);
  const next = findYearStart(year + 1);
  const days = Math.round((next - start) / 86400000);
  const s = rangeStats({ from: start, days, data, today, now, getDay });
  const made = qadaHistory(data).filter((h) => h.on >= start && h.on < next).length;
  return { ...s, start, days, madeUp: made };
}

export { qadaHistory };
