// Hijri calendar.
//
// Two ways of working out which day a Hijri month starts:
//
//  'auto'       Moon-sighting prediction for the user's own location. For each
//               new moon, the app checks the evenings after it and asks: would
//               the crescent be visible to the naked eye here tonight? It uses
//               the Odeh (2006) criterion, the same one many moon-sighting
//               committees use as a guide. The first evening the crescent is
//               likely to be seen, the month starts the next day.
//  'ummalqura'  The official Saudi Umm al-Qura calendar.
//
// On top of either, the user can shift the whole calendar by -2..+2 days, and
// confirm/correct a single month from the "moon sighting" check on the 29th.
import * as Astronomy from 'astronomy-engine';

export const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Awwal', 'Jumada al-Thani',
  'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhul-Qa'dah", 'Dhul-Hijjah',
];
export const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];
export const HIJRI_MONTHS_BN = [
  'মুহাররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি', 'জমাদিউল আউয়াল', 'জমাদিউস সানি',
  'রজব', 'শাবান', 'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ',
];

const DAY = 86400000;

// Days since 1970-01-01 for the calendar date y/m/d (no time zone involved).
export const dayNumber = (dateObj) => Math.round(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()) / DAY);
const fromDayNumber = (dn) => {
  const u = new Date(dn * DAY);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
};

/* ---------------------------- Umm al-Qura ---------------------------- */
// Built-in table (exact, 7 Jul 2024 - 4 May 2030), then the phone's own Intl
// Umm al-Qura calendar, then the arithmetic calendar as a last resort.
const UMALQURA_BASE_DN = Math.round(Date.UTC(2024, 6, 7) / DAY); // 1 Muharram 1446
const UMALQURA_BASE_YEAR = 1446;
const UMALQURA_MONTHS = '011101100100101110101010010110110101001010110110101001010110111001001101';

function umalquraFromTable(dn) {
  let days = dn - UMALQURA_BASE_DN;
  if (days < 0) return null;
  for (let i = 0; i < UMALQURA_MONTHS.length; i++) {
    const len = UMALQURA_MONTHS[i] === '1' ? 30 : 29;
    if (days < len) return { day: days + 1, monthIndex: i % 12, year: UMALQURA_BASE_YEAR + Math.floor(i / 12) };
    days -= len;
  }
  return null;
}

let uqFormatter = null;
let uqChecked = false;
function getUmalquraFormatter() {
  if (uqChecked) return uqFormatter;
  uqChecked = true;
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
    const parts = f.formatToParts(new Date(Date.UTC(2026, 0, 15, 12)));
    const year = parseInt((parts.find((p) => p.type === 'year') || {}).value, 10);
    if (year >= 1440 && year <= 1460) uqFormatter = f;
  } catch (e) {
    // not supported on this engine
  }
  return uqFormatter;
}

function tabularHijri(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jd = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  return { day, monthIndex: month - 1, year: 30 * n + j - 30 };
}

export function umalquraForDayNumber(dn) {
  const fromTable = umalquraFromTable(dn);
  if (fromTable) return fromTable;
  const f = getUmalquraFormatter();
  if (f) {
    try {
      const parts = f.formatToParts(new Date(dn * DAY + 12 * 3600000));
      const get = (type) => parseInt((parts.find((p) => p.type === type) || {}).value, 10);
      const day = get('day');
      const month = get('month');
      const year = get('year');
      if (day && month && year) return { day, monthIndex: month - 1, year };
    } catch (e) {
      // fall through
    }
  }
  const g = new Date(dn * DAY);
  return tabularHijri(g.getUTCFullYear(), g.getUTCMonth() + 1, g.getUTCDate());
}

/* ------------------------ Crescent visibility ------------------------ */
// Odeh, "New criterion for lunar crescent visibility", Experimental Astronomy
// 18 (2004/2006). V = ARCV - (7.1651 - 6.3226 W + 0.7319 W^2 - 0.1018 W^3),
// worked out at the "best time" (sunset + 4/9 of the sunset-moonset lag).
//   V >= 5.65        visible to the naked eye
//   2 <= V < 5.65    visible with optical aid, could be seen by naked eye
//   -0.96 <= V < 2   visible with optical aid only
//   V < -0.96        not visible
export const NAKED_EYE_V = 2;

const rad = Math.PI / 180;

export function crescentVisibility(lat, lon, dateObj) {
  // dateObj: calendar day whose EVENING we test. Start the sunset search at
  // local solar noon of that day.
  const observer = new Astronomy.Observer(lat, lon, 0);
  const noonUtc = Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 12) - (lon / 15) * 3600000;
  const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, new Date(noonUtc), 1);
  if (!sunset) return null; // polar day/night
  const moonset = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, sunset.date, 1);
  const newMoonBefore = Astronomy.SearchMoonPhase(0, new Date(sunset.date.getTime() - 3 * DAY), 3.2);
  const born = newMoonBefore && newMoonBefore.date.getTime() < sunset.date.getTime();
  if (!moonset || !born) return { sunset: sunset.date, visible: false, V: -99, reason: born ? 'moonset' : 'not-born' };
  const lagMs = moonset.date.getTime() - sunset.date.getTime();
  if (lagMs <= 0 || lagMs > 12 * 3600000) return { sunset: sunset.date, visible: false, V: -99, reason: 'sets-first' };
  const best = new Date(sunset.date.getTime() + (lagMs * 4) / 9);
  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, best, observer, true, true);
  const moonEq = Astronomy.Equator(Astronomy.Body.Moon, best, observer, true, true);
  const sunHor = Astronomy.Horizon(best, observer, sunEq.ra, sunEq.dec, false);
  const moonHor = Astronomy.Horizon(best, observer, moonEq.ra, moonEq.dec, false);
  const arcv = moonHor.altitude - sunHor.altitude;
  const cosArcl =
    Math.sin(sunHor.altitude * rad) * Math.sin(moonHor.altitude * rad) +
    Math.cos(sunHor.altitude * rad) * Math.cos(moonHor.altitude * rad) * Math.cos((moonHor.azimuth - sunHor.azimuth) * rad);
  const arcl = Math.acos(Math.max(-1, Math.min(1, cosArcl))) / rad;
  const distKm = moonEq.dist * 149597870.7;
  const sdArcmin = (Math.asin(1737.4 / distKm) / rad) * 60;
  const W = sdArcmin * (1 - Math.cos(arcl * rad));
  const V = arcv - (7.1651 - 6.3226 * W + 0.7319 * W * W - 0.1018 * W * W * W);
  const visible = arcl >= 6.4 && V >= NAKED_EYE_V;
  return { sunset: sunset.date, best, V, W, arcv, arcl, visible };
}

// Month starts (as day numbers) around `centre`, for the given location.
// Returns [{ start, monthIndex, year, conj }] sorted by start.
export function computeVisibilityMonths(lat, lon, centreDate, spanDays = 420) {
  const months = [];
  let t = new Date(centreDate.getTime() - spanDays * DAY);
  const end = centreDate.getTime() + spanDays * DAY;
  for (let guard = 0; guard < 40; guard++) {
    const nm = Astronomy.SearchMoonPhase(0, t, 40);
    if (!nm || nm.date.getTime() > end) break;
    const conj = nm.date;
    // Local (solar) calendar date of the new moon.
    const local = new Date(conj.getTime() + (lon / 15) * 3600000);
    const conjDay = new Date(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
    let start = null;
    for (let k = 0; k <= 2 && start === null; k++) {
      const evening = new Date(conjDay.getFullYear(), conjDay.getMonth(), conjDay.getDate() + k);
      let res = null;
      try {
        res = crescentVisibility(lat, lon, evening);
      } catch (e) {
        res = null;
      }
      if (res && res.visible) start = dayNumber(evening) + 1;
    }
    if (start === null) start = dayNumber(conjDay) + 3;
    const named = umalquraForDayNumber(dayNumber(conjDay) + 6);
    months.push({ start, monthIndex: named.monthIndex, year: named.year, conj: conj.getTime() });
    t = new Date(conj.getTime() + 20 * DAY);
  }
  return months;
}

// Clamp months to 29/30 days and apply per-month corrections from the
// sighting check ({ '1448-8': +1 } = Ramadan 1448 starts a day later).
export function finaliseMonths(raw, overrides = {}) {
  const out = raw.map((m) => ({ ...m, start: m.start + (overrides[`${m.year}-${m.monthIndex}`] || 0) }));
  for (let i = 1; i < out.length; i++) {
    const len = out[i].start - out[i - 1].start;
    if (len < 29) out[i].start = out[i - 1].start + 29;
    if (len > 30) out[i].start = out[i - 1].start + 30;
  }
  return out;
}

// Main entry: Hijri date for a calendar day.
// cal: { mode, offset, months } where months comes from finaliseMonths().
export function hijriFor(dateObj, cal) {
  const dn = dayNumber(dateObj) + (cal?.offset || 0);
  const months = cal?.mode === 'auto' ? cal.months : null;
  if (months && months.length > 1 && dn >= months[0].start && dn < months[months.length - 1].start + 30) {
    let lo = 0;
    for (let i = 0; i < months.length; i++) if (months[i].start <= dn) lo = i;
    const m = months[lo];
    // the last month in the list has no successor; only trust it up to day 30
    if (lo === months.length - 1 && dn - m.start >= 30) return umalquraForDayNumber(dn);
    return { day: dn - m.start + 1, monthIndex: m.monthIndex, year: m.year };
  }
  return umalquraForDayNumber(dn);
}

// The next month boundary after `today` in the active calendar, used for the
// moon-sighting check: { evening (Date), startsOn (Date), monthIndex, year, length29 }.
export function nextMonthBoundary(todayDate, cal) {
  for (let i = 0; i < 32; i++) {
    const d = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + i);
    const h = hijriFor(d, cal);
    if (h.day === 1 && i > 0) {
      const prev = hijriFor(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1), cal);
      return {
        startsOn: d,
        evening: new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1),
        monthIndex: h.monthIndex,
        year: h.year,
        prevLength: prev.day,
      };
    }
  }
  return null;
}

export { fromDayNumber };
