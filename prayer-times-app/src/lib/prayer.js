import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import tzlookup from 'tz-lookup';

export const DEFAULT_TIMEZONE = 'Pacific/Auckland';
export const DEFAULT_COORDS = { latitude: -41.2865, longitude: 174.7762, timezone: DEFAULT_TIMEZONE };
export const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
export const PRAYER_AR = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء', Sunrise: 'الشروق' };

// Calculation methods the adhan library supports. Karachi is the default
// (University of Islamic Sciences, Karachi), common in South Asia and NZ.
export const CALC_METHODS = [
  { id: 'Karachi', label: 'Karachi (Univ. of Islamic Sciences)', make: () => CalculationMethod.Karachi() },
  { id: 'MWL', label: 'Muslim World League', make: () => CalculationMethod.MuslimWorldLeague() },
  { id: 'ISNA', label: 'ISNA (North America)', make: () => CalculationMethod.NorthAmerica() },
  { id: 'UmmAlQura', label: 'Umm al-Qura (Makkah)', make: () => CalculationMethod.UmmAlQura() },
  { id: 'Egyptian', label: 'Egyptian General Authority', make: () => CalculationMethod.Egyptian() },
  { id: 'Dubai', label: 'Dubai', make: () => CalculationMethod.Dubai() },
  { id: 'MoonsightingCommittee', label: 'Moonsighting Committee', make: () => CalculationMethod.MoonsightingCommittee() },
  { id: 'Singapore', label: 'Singapore / Malaysia', make: () => CalculationMethod.Singapore() },
  { id: 'Turkey', label: 'Diyanet (Turkey)', make: () => CalculationMethod.Turkey() },
];

export function resolveTimezone(latitude, longitude) {
  try {
    return tzlookup(latitude, longitude);
  } catch (e) {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
    } catch (e2) {
      return DEFAULT_TIMEZONE;
    }
  }
}

export function formatTime(dateObj, timeZone, { compact = false } = {}) {
  if (!dateObj) return '--:--';
  try {
    const s = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
    return compact ? s.replace(/\s?[AP]M$/i, '') : s;
  } catch (e) {
    const h = dateObj.getHours();
    const m = String(dateObj.getMinutes()).padStart(2, '0');
    return `${((h + 11) % 12) + 1}:${m}${compact ? '' : h < 12 ? ' AM' : ' PM'}`;
  }
}
export const ampm = (dateObj, timeZone) => {
  const s = formatTime(dateObj, timeZone);
  const m = /([AP]M)$/i.exec(s);
  return m ? m[1].toUpperCase() : '';
};

export const addMinutes = (d, mins) => (d ? new Date(d.getTime() + mins * 60000) : null);

function params(calcMethod, asrMethod) {
  const def = CALC_METHODS.find((m) => m.id === calcMethod) || CALC_METHODS[0];
  const p = def.make();
  p.madhab = asrMethod === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return p;
}

// Times for one calendar day at the location. dateObj's local y/m/d is the day.
export function computeDay(coords, calcMethod, asrMethod, dateObj) {
  const pt = new PrayerTimes(new Coordinates(coords.latitude, coords.longitude), dateObj, params(calcMethod, asrMethod));
  return {
    Fajr: pt.fajr, Sunrise: pt.sunrise, Dhuhr: pt.dhuhr, Asr: pt.asr, Maghrib: pt.maghrib, Isha: pt.isha,
  };
}

// Prohibited (makruh) windows. Scholars give these as roughly 15-20 minutes
// after sunrise, a few minutes around solar noon before Dhuhr, and the time
// the sun yellows before sunset. We use 15 min / 8 min / 15 min.
export const MAKRUH = { afterSunrise: 15, beforeDhuhr: 8, beforeMaghrib: 15 };
export function makruhWindows(day) {
  if (!day || !day.Sunrise) return [];
  return [
    { key: 'Sunrise', start: day.Sunrise, end: addMinutes(day.Sunrise, MAKRUH.afterSunrise) },
    { key: 'Zawal', start: addMinutes(day.Dhuhr, -MAKRUH.beforeDhuhr), end: day.Dhuhr },
    { key: 'Sunset', start: addMinutes(day.Maghrib, -MAKRUH.beforeMaghrib), end: day.Maghrib },
  ];
}

/* ---------------------------- Qibla ---------------------------- */
const KAABA = { lat: 21.4225, lon: 39.8262 };
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export function qiblaBearing(lat, lon) {
  const r = Math.PI / 180;
  const dLon = (KAABA.lon - lon) * r;
  const y = Math.sin(dLon);
  const x = Math.cos(lat * r) * Math.tan(KAABA.lat * r) - Math.sin(lat * r) * Math.cos(dLon);
  return ((Math.atan2(y, x) / r) + 360) % 360;
}
export function distanceToKaabaKm(lat, lon) {
  const r = Math.PI / 180;
  const dLat = (KAABA.lat - lat) * r;
  const dLon = (KAABA.lon - lon) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * r) * Math.cos(KAABA.lat * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export const compassPoint = (deg) => COMPASS[Math.round(deg / 22.5) % 16];

// Great-circle path points for the route card (lat/lon pairs).
export function greatCircle(lat1, lon1, steps = 24) {
  const r = Math.PI / 180;
  const p1 = [lat1 * r, lon1 * r];
  const p2 = [KAABA.lat * r, KAABA.lon * r];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((p2[0] - p1[0]) / 2) ** 2 + Math.cos(p1[0]) * Math.cos(p2[0]) * Math.sin((p2[1] - p1[1]) / 2) ** 2));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1[0]) * Math.cos(p1[1]) + B * Math.cos(p2[0]) * Math.cos(p2[1]);
    const y = A * Math.cos(p1[0]) * Math.sin(p1[1]) + B * Math.cos(p2[0]) * Math.sin(p2[1]);
    const z = A * Math.sin(p1[0]) + B * Math.sin(p2[0]);
    pts.push([Math.atan2(z, Math.sqrt(x * x + y * y)) / r, Math.atan2(y, x) / r]);
  }
  return pts;
}

/* ------------------------- Date helpers ------------------------- */
const zonedFormatters = {};
export function zonedParts(date, timeZone) {
  try {
    if (!zonedFormatters[timeZone]) {
      zonedFormatters[timeZone] = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' });
    }
    const parts = zonedFormatters[timeZone].formatToParts(date);
    const get = (type) => parseInt((parts.find((p) => p.type === type) || {}).value, 10);
    const y = get('year');
    const m = get('month');
    const d = get('day');
    if (y && m && d) return { y, m, d };
  } catch (e) {
    // unknown zone
  }
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}
export const dayKeyOf = (dateObj) => dateObj.toDateString();
export const addDays = (dateObj, n) => new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + n);
export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function splitDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}
