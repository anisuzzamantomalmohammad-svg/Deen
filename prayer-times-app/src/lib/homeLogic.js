// What Home shows right now: the arch (timer), the highlighted prayer tile,
// each tile's circle, and the list of prayers that still need an answer.
// Pure functions over the app state so Home, Ibadah and the widget agree.
import { PRAYER_NAMES, PRAYER_AR, addDays, addMinutes, makruhWindows } from './prayer';
import { prayerWindow, nightOf, duhaOf } from './waqt';
import { statusOf, answered, calendarMissed, isPaused, pauseCovers } from './qada';

const AMBER_MS = 15 * 60000;

// Each prayer's window for a prayer day.
export function windowsFor(getDay, day) {
  const d = getDay(day);
  const n = getDay(addDays(day, 1));
  const out = {};
  PRAYER_NAMES.forEach((name) => { out[name] = prayerWindow(name, d, n); });
  return out;
}

// The prayer whose time is on right now (on the day it belongs to), if any.
// Between sunrise and Dhuhr there is none.
export function currentPrayer(getDay, today, now) {
  for (const day of [addDays(today, -1), today]) {
    const w = windowsFor(getDay, day);
    for (const name of PRAYER_NAMES) {
      if (now >= w[name].start && now < w[name].end) return { name, day, w: w[name] };
    }
  }
  return null;
}

// The next prayer to start after now.
export function nextPrayer(getDay, today, now) {
  for (const day of [today, addDays(today, 1)]) {
    const d = getDay(day);
    for (const name of PRAYER_NAMES) if (d[name] > now) return { name, day, at: d[name] };
  }
  const d = getDay(addDays(today, 2));
  return { name: 'Fajr', day: addDays(today, 2), at: d.Fajr };
}

const ctxOf = (app, now) => ({ today: app.today, now, getDay: app.getDay });

// One circle on a Home tile.
//   notYet     faint dashed: its time hasn't started (opens the page)
//   open       full empty circle: its time is on (tap ticks)
//   unanswered amber dashed: time over, not answered yet (opens "Did you pray it?")
//   ontime     green tick · late: gold · missed: red
export function circleState(app, day, name, now) {
  const st = statusOf(app.data, day, name, ctxOf(app, now));
  if (st === 'ontime') return 'ontime';
  if (st === 'qada') return 'late';
  if (st === 'unanswered') return 'unanswered';
  if (st === 'missed') return 'missed';
  if (isPaused(app.data, day) && pauseCovers(app.data, day, prayerWindow(name, app.getDay(day), app.getDay(addDays(day, 1))).end)) return 'paused';
  return now < app.getDay(day)[name] ? 'notYet' : 'open';
}

// Prayers still waiting for an answer, newest first: today's / last night's
// unanswered ones (amber) and missed ones from the calendar (red, owed).
export function needsAnswer(app, now, { days = 365 } = {}) {
  const ctx = ctxOf(app, now);
  const out = [];
  [app.today, addDays(app.today, -1)].forEach((day) => {
    PRAYER_NAMES.forEach((name) => {
      if (statusOf(app.data, day, name, ctx) === 'unanswered') out.push({ date: day, name, state: 'unanswered', end: prayerWindow(name, app.getDay(day), app.getDay(addDays(day, 1))).end });
    });
  });
  const missed = calendarMissed(app.data, ctx, days).map((x) => ({ ...x, state: 'missed', end: prayerWindow(x.name, app.getDay(x.date), app.getDay(addDays(x.date, 1))).end }));
  return [...out, ...missed].sort((a, b) => b.end - a.end);
}

// Ramadan (or a planned fast) decides whether the arch counts to Iftar /
// Seheri. `fastDay` is the day whose fast is being kept or is next.
function fastingFor(app, day) {
  const h = app.hijri(day);
  const key = day.toDateString();
  return h.monthIndex === 8 || !!(app.data.journalByDay[key] || {}).fasted || !!(app.data.fastPlans || {})[key];
}

// The arch. Returns what to show in it.
//   mode: 'current' | 'next' | 'iftar' | 'seheri' | 'iftarNow'
export function archState(app, now) {
  const { today, getDay, data } = app;
  const d = getDay(today);
  const buf = data.safetyBuffer || 0;
  const cur = currentPrayer(getDay, today, now);
  const nxt = nextPrayer(getDay, today, now);
  const lines = [];
  const curOpen = cur && !answered(data, cur.day, cur.name);

  // Ramadan / fasting: Seheri and Iftar come first.
  const fastToday = fastingFor(app, today);
  const seheriToday = addMinutes(d.Fajr, -buf);
  if (fastToday && now >= d.Maghrib && now < addMinutes(d.Maghrib, 15)) {
    const hd = app.hijri(today);
    return { mode: 'iftarNow', title: 'Iftar time', ar: 'الإفطار', to: null, fastN: hd.monthIndex === 8 ? hd.day : null, lines: curOpen && cur.name !== 'Maghrib' ? [{ kind: 'amber', prayer: cur }] : [], from: d.Maghrib, until: addMinutes(d.Maghrib, 15), progress: (now - d.Maghrib) / AMBER_MS, amber: false, glow: true };
  }
  if (fastToday && now >= d.Asr && now < d.Maghrib) {
    if (curOpen) lines.push({ kind: 'notTicked', prayer: cur });
    return { mode: 'iftar', title: 'Iftar', ar: 'الإفطار', to: d.Maghrib, from: seheriToday, progress: (now - seheriToday) / (d.Maghrib - seheriToday), lines, nextLine: null };
  }
  // After Isha (or before Fajr) with a fast tomorrow / today: count to Seheri.
  const nightBase = now < d.Fajr ? addDays(today, -1) : today;
  const fastNext = now < d.Fajr ? fastToday : fastingFor(app, addDays(today, 1));
  const nb = getDay(nightBase);
  const seheri = addMinutes(getDay(addDays(nightBase, 1)).Fajr, -buf);
  if (fastNext && now >= nb.Isha && now < seheri) {
    if (curOpen) lines.push({ kind: 'notTicked', prayer: cur });
    return { mode: 'seheri', title: 'Seheri ends', ar: 'السحور', to: seheri, from: nb.Isha, progress: (now - nb.Isha) / (seheri - nb.Isha), lines };
  }

  // A prayer whose time is on and isn't answered: the arch stays on it.
  if (curOpen) {
    const w = cur.w;
    let to = w.end;
    let note = w.endWhy;
    let amber = to - now <= AMBER_MS;
    if (cur.name === 'Isha') {
      const n = nightOf(getDay(cur.day), getDay(addDays(cur.day, 1)));
      if (now < n.midnight) {
        to = n.midnight;
        note = 'best before midnight · valid until Fajr';
        amber = to - now <= AMBER_MS;
      } else {
        note = 'past the best time · still valid until Fajr';
        amber = true;
      }
    }
    return {
      mode: 'current', name: cur.name, day: cur.day, title: `${cur.name} time`, ar: PRAYER_AR[cur.name], to, note, amber,
      from: w.start, progress: (now - w.start) / (to - w.start),
      lines: [], nextLine: { name: nxt.name, at: nxt.at },
    };
  }

  // Otherwise the next prayer, with a small line for what's useful now.
  const prev = cur ? cur.w.start : addMinutes(nxt.at, -6 * 3600000 / 60000);
  const from = cur ? cur.w.start : (() => {
    // the last prayer that started before now
    let last = null;
    for (const day of [addDays(today, -1), today]) {
      const dd = getDay(day);
      PRAYER_NAMES.forEach((n) => { if (dd[n] <= now && (!last || dd[n] > last)) last = dd[n]; });
    }
    if (now >= d.Sunrise && now < d.Dhuhr && d.Sunrise > (last || 0)) last = d.Sunrise;
    return last || prev;
  })();
  // An unanswered prayer from this prayer day: one red line.
  const pending = needsAnswer(app, now, { days: 1 }).find((x) => x.state === 'unanswered');
  if (pending) lines.push({ kind: 'didYouPray', prayer: { name: pending.name, day: pending.date, end: pending.end } });
  // Sunrise to Dhuhr: Duha (after the prohibited window).
  const duha = duhaOf(d);
  const makruhNow = makruhWindows(d).some((m) => now >= m.start && now < m.end);
  if (now >= d.Sunrise && now < d.Dhuhr && !makruhNow && now >= duha.start && now < duha.end) {
    lines.push({ kind: 'duha', until: duha.end, done: app.isSunnahDone(today, 'duha') });
  }
  // Isha answered at night: Tahajjud.
  if (now >= nb.Isha && answered(data, nightBase, 'Isha') && nxt.name === 'Fajr') {
    const n = nightOf(nb, getDay(addDays(nightBase, 1)));
    lines.push({ kind: 'tahajjud', at: n.lastThird, done: app.isSunnahDone(nightBase, 'tahajjud') });
  }
  return { mode: 'next', name: nxt.name, day: nxt.day, title: 'Next prayer', ar: PRAYER_AR[nxt.name], to: nxt.at, from, progress: (now - from) / (nxt.at - from), lines };
}

// The tile that's highlighted: the prayer whose time is on (until its time
// ends), otherwise the next one (e.g. Dhuhr between sunrise and Dhuhr).
export function highlightedTile(app, now) {
  const cur = currentPrayer(app.getDay, app.today, now);
  if (cur && cur.day.getTime() === app.prayerDay.getTime()) return cur.name;
  const nxt = nextPrayer(app.getDay, app.today, now);
  if (nxt.day.getTime() === app.prayerDay.getTime()) return nxt.name;
  return null;
}
