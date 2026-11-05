// Two phones on one Google account show the same prayer log. Each phone
// keeps a copy in the Drive app folder (deen-sync.json). On open, on coming
// back to the front, and on "Sync now", a phone downloads it, merges, and
// uploads the result. Theme, language and location stay per phone.
//
// Merging: every synced piece carries a time stamp of its last change on
// either phone; the newer one wins. Prayers are stamped one by one
// (day + prayer), other day records day by day, the rest field by field, so
// ticks made on both phones the same day are all kept.

// Fields that sync (and go in the Drive backup).
export const DAY_PRAYER_FIELDS = ['completedByDay', 'qadaRecords', 'rakahByDay', 'tickAt', 'notPrayed', 'imamByDay'];
export const DAY_FIELDS = ['completedSunnahByDay', 'journalByDay', 'fastPlans', 'trackedDays', 'todayTicks', 'jumuahByDay', 'seheriByDay', 'notFastingByDay', 'safarDays'];
export const WHOLE_FIELDS = [
  'qadaCounts', 'olderLog', 'qadaLog', 'taraweeh', 'quranJuz', 'missedFasts', 'zakatFitrDone', 'ramadanChecks', 'quran', 'namesLearnt', 'learn',
  'surahsLearned', 'favoriteDuaIds', 'calcMethod', 'asrMethod', 'hijriMode', 'hijriOffset', 'hijriOverrides', 'hijriBirthday', 'charity', 'firstOpenAt',
];
export const SYNC_FIELDS = [...DAY_PRAYER_FIELDS, ...DAY_FIELDS, ...WHOLE_FIELDS];

// Settings that belong to one phone only: never synced or backed up.
export const PER_PHONE = [
  'themeMode', 'darkPalette', 'lightPalette', 'colourMode', 'colourPins', 'nightOn', 'nightWhen', 'nightOffDay', 'lang', 'arabicSize', 'textSize',
  'savedLocations', 'activeLocationId', 'lastAuto', 'homeBase', 'seenCity', 'cityAsked', 'secondCity', 'secondCityOn',
  'google', 'lastDriveBackupAt', 'backupDirUri', 'lastAutoBackupAt', 'syncStamps', 'lastSyncAt', 'lastSyncedDirty', 'handledResponse',
  'travelConfirmed', 'safar', 'safarDeclined',
];

const eq = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

// Stamp what changed between two versions of the data. Returns new stamps,
// or null if nothing synced changed.
export function stampChanges(prev, next, stamps, now = Date.now()) {
  let out = null;
  const set = (k) => {
    if (!out) out = { ...(stamps || {}) };
    out[k] = now;
  };
  DAY_PRAYER_FIELDS.forEach((f) => {
    const a = prev[f] || {};
    const b = next[f] || {};
    if (a === b) return;
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach((day) => {
      const x = a[day] || {};
      const y = b[day] || {};
      if (x === y) return;
      new Set([...Object.keys(x), ...Object.keys(y)]).forEach((id) => {
        if (!eq(x[id], y[id])) set(`${f}|${day}|${id}`);
      });
    });
  });
  DAY_FIELDS.forEach((f) => {
    const a = prev[f] || {};
    const b = next[f] || {};
    if (a === b) return;
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach((day) => {
      if (!eq(a[day], b[day])) set(`${f}|${day}`);
    });
  });
  WHOLE_FIELDS.forEach((f) => {
    if (prev[f] !== next[f] && !eq(prev[f], next[f])) set(f);
  });
  return out;
}

// Merge a remote copy into local data. For each stamped piece the newer side
// wins; pieces nobody stamped (history from before sync) are combined, so
// nothing is lost. Returns { data, stamps, changedLocal, changedRemote }.
export function mergeSync(local, localStamps = {}, remote, remoteStamps = {}) {
  const data = {};
  const stamps = { ...localStamps };
  let changedLocal = false;
  let changedRemote = false;
  // pick the value for one stamped key
  const pick = (k, lv, rv) => {
    const ls = localStamps[k] || 0;
    const rs = remoteStamps[k] || 0;
    let v = lv;
    if (rs > ls) {
      v = rv;
      stamps[k] = rs;
    } else if (!ls && !rs && lv === undefined) v = rv;
    if (!eq(v, lv)) changedLocal = true;
    if (!eq(v, rv)) changedRemote = true;
    return v;
  };
  DAY_PRAYER_FIELDS.forEach((f) => {
    const L = local[f] || {};
    const R = remote[f] || {};
    const out = {};
    new Set([...Object.keys(L), ...Object.keys(R)]).forEach((day) => {
      const x = L[day] || {};
      const y = R[day] || {};
      const d = {};
      new Set([...Object.keys(x), ...Object.keys(y)]).forEach((id) => {
        const v = pick(`${f}|${day}|${id}`, x[id], y[id]);
        if (v !== undefined) d[id] = v;
      });
      if (Object.keys(d).length) out[day] = d;
    });
    data[f] = out;
  });
  DAY_FIELDS.forEach((f) => {
    const L = local[f] || {};
    const R = remote[f] || {};
    const out = {};
    new Set([...Object.keys(L), ...Object.keys(R)]).forEach((day) => {
      const v = pick(`${f}|${day}`, L[day], R[day]);
      if (v !== undefined) out[day] = v;
    });
    data[f] = out;
  });
  WHOLE_FIELDS.forEach((f) => {
    const v = pick(f, local[f], remote[f]);
    if (v !== undefined) data[f] = v;
  });
  // The earliest "first opened" wins, so history from either phone counts.
  if (local.firstOpenAt && remote.firstOpenAt && remote.firstOpenAt < local.firstOpenAt) data.firstOpenAt = remote.firstOpenAt;
  return { data, stamps, changedLocal, changedRemote };
}

// What goes to Drive (sync file and backups): the synced fields only.
export function syncPayload(data) {
  const out = {};
  SYNC_FIELDS.forEach((f) => { if (data[f] !== undefined) out[f] = data[f]; });
  return out;
}

// A backup: everything except what belongs to this phone only.
export function backupPayload(data) {
  const out = { ...data };
  PER_PHONE.forEach((k) => { delete out[k]; });
  return out;
}
