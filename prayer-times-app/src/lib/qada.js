// Prayer status for any day: on time, qada (made up later) or missed.
//
//   completedByDay[day][id] = true        prayed on time
//   qadaRecords[day][id] = { on, reason, note, at }
//                                          made up later, on day `on` (ymd)
//   anything else for a past prayer       missed
//
// Older missed prayers with no date (from before the user started tracking)
// live in qadaCounts; each one made up is logged in olderLog so it shows in
// the history and on the calendar day it was prayed.
import { PRAYER_NAMES, addDays } from './prayer';

export const REASONS = [
  { id: 'job', icon: 'briefcase', label: 'Job', emoji: '💼' },
  { id: 'class', icon: 'book', label: 'Class', emoji: '🎓' },
  { id: 'sleep', icon: 'moon', label: 'Sleep', emoji: '😴' },
  { id: 'other', icon: 'edit-3', label: 'Other', emoji: '✎' },
];

export const ymd = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export const fromYmd = (k) => {
  const [y, m, d] = String(k).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const idOf = (name) => PRAYER_NAMES.indexOf(name) + 1;

export function qadaOf(data, date, name) {
  return ((data.qadaRecords || {})[date.toDateString()] || {})[idOf(name)] || null;
}

// 'ontime' | 'qada' | 'missed' | 'pending' (not due yet)
export function statusOf(data, date, name, { today, now, getDay }) {
  const key = date.toDateString();
  const id = idOf(name);
  if ((data.completedByDay[key] || {})[id]) return 'ontime';
  if (((data.qadaRecords || {})[key] || {})[id]) return 'qada';
  if (date > today) return 'pending';
  if (date.getTime() === today.getTime()) {
    const t = getDay(date)[name];
    if (!t || t > now) return 'pending';
    // Today's prayer that has started but not ended is still "not ticked yet".
    const next = name === 'Isha' ? getDay(addDays(date, 1)).Fajr : getDay(date)[PRAYER_NAMES[PRAYER_NAMES.indexOf(name) + 1]];
    if (name === 'Fajr' ? now < getDay(date).Sunrise : next && now < next) return 'pending';
  }
  return 'missed';
}

// A patch for app.update() that sets one prayer's status.
export function statusPatch(prev, date, name, status, extra = {}) {
  const key = date.toDateString();
  const id = idOf(name);
  const done = { ...(prev.completedByDay[key] || {}) };
  const qr = { ...((prev.qadaRecords || {})[key] || {}) };
  delete done[id];
  delete qr[id];
  if (status === 'ontime') done[id] = true;
  if (status === 'qada') qr[id] = { on: extra.on || ymd(new Date()), reason: extra.reason || null, note: extra.note || '', at: new Date().toISOString() };
  const qadaRecords = { ...(prev.qadaRecords || {}) };
  if (Object.keys(qr).length) qadaRecords[key] = qr;
  else delete qadaRecords[key];
  return {
    completedByDay: { ...prev.completedByDay, [key]: done },
    qadaRecords,
    trackedDays: { ...(prev.trackedDays || {}), [key]: true },
  };
}

// Has the user tracked this day at all? Days with nothing set are skipped
// (most likely the app just wasn't used), unless they touched the day.
function tracked(data, key) {
  const rec = data.completedByDay[key] || {};
  return Object.values(rec).some(Boolean) || !!(data.qadaRecords || {})[key] || !!(data.trackedDays || {})[key];
}

// Missed prayers from the calendar, oldest first.
export function calendarMissed(data, ctx, days = 365) {
  const { today } = ctx;
  const startTs = data.firstOpenAt ? new Date(data.firstOpenAt) : today;
  const first = new Date(startTs.getFullYear(), startTs.getMonth(), startTs.getDate());
  const handled = new Set((data.qadaLog || []).filter((q) => q.kind === 'counted').map((q) => q.key));
  const out = [];
  for (let i = days; i >= 0; i--) {
    const d = addDays(today, -i);
    if (d < first) continue;
    const key = d.toDateString();
    if (!tracked(data, key)) continue;
    PRAYER_NAMES.forEach((name) => {
      if (handled.has(`${key}|${name}`)) return;
      if (statusOf(data, d, name, ctx) === 'missed') out.push({ date: d, name });
    });
  }
  return out;
}

// One coloured dot per past day: 'ok' (all on time), 'qada', 'missed' or null.
export function dayMark(data, date, ctx) {
  if (date > ctx.today) return null;
  const key = date.toDateString();
  if (!tracked(data, key)) return null;
  const st = PRAYER_NAMES.map((n) => statusOf(data, date, n, ctx));
  if (st.includes('missed')) return 'missed';
  if (st.includes('qada')) return 'qada';
  if (st.every((s) => s === 'ontime')) return 'ok';
  return null;
}

// Every qada prayed, newest first.
export function qadaHistory(data) {
  const out = [];
  Object.entries(data.qadaRecords || {}).forEach(([key, rec]) => {
    Object.entries(rec).forEach(([id, r]) => {
      out.push({ name: PRAYER_NAMES[id - 1], forDate: new Date(key), on: fromYmd(r.on), reason: r.reason, note: r.note, at: r.at });
    });
  });
  (data.olderLog || []).forEach((r) => out.push({ name: r.name, forDate: null, on: fromYmd(r.on), reason: null, note: '', at: r.at }));
  return out.sort((a, b) => b.on - a.on || String(b.at).localeCompare(String(a.at)));
}

// Qada prayers that were prayed on `date`.
export function qadaPrayedOn(data, date) {
  const k = ymd(date);
  return qadaHistory(data).filter((h) => ymd(h.on) === k);
}
export function prayedQadaDays(data) {
  const s = new Set();
  qadaHistory(data).forEach((h) => s.add(h.on.toDateString()));
  return s;
}

export function olderTotal(data) {
  return PRAYER_NAMES.reduce((a, n) => a + ((data.qadaCounts || {})[n] || 0), 0);
}

export function reasonLabel(t, r) {
  if (!r) return null;
  const R = REASONS.find((x) => x.id === r.reason);
  if (r.reason === 'other' && r.note) return r.note;
  return R ? t(R.label) : null;
}

// Old 1.2/1.3 "made up" entries become dated qada records.
export function migrateQada(out) {
  if (out.qadaMigrated) return out;
  const qadaRecords = { ...(out.qadaRecords || {}) };
  (out.qadaLog || []).forEach((q) => {
    if (!['madeup', 'madeUp'].includes(q.kind) || !q.key) return;
    const [dayKey, name] = q.key.split('|');
    const id = idOf(name);
    if (id < 1) return;
    const at = q.at ? new Date(q.at) : new Date();
    qadaRecords[dayKey] = { ...(qadaRecords[dayKey] || {}), [id]: { on: ymd(at), reason: null, note: '', at: q.at } };
  });
  return { ...out, qadaRecords, qadaMigrated: true };
}
