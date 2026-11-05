// Solar and lunar eclipses that can be seen from the user's location, worked
// out with astronomy-engine. Penumbral lunar eclipses are skipped: they are
// too faint to notice, so there is no eclipse prayer for them.
import * as Astronomy from 'astronomy-engine';
import { zonedParts } from './prayer';

const cache = new Map();

function localDay(date, tz) {
  const p = zonedParts(date, tz);
  return new Date(p.y, p.m - 1, p.d);
}

function moonUp(time, observer) {
  const eq = Astronomy.Equator('Moon', time, observer, true, true);
  return Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal').altitude > 0;
}

// All visible eclipses between `from` and `to` (Date objects).
export function eclipsesBetween(from, to, coords) {
  if (!coords) return [];
  const key = `${coords.latitude.toFixed(2)},${coords.longitude.toFixed(2)},${from.getFullYear()},${to.getFullYear()}`;
  if (cache.has(key)) return cache.get(key);
  const out = [];
  const tz = coords.timezone;
  try {
    const obs = new Astronomy.Observer(coords.latitude, coords.longitude, 0);
    // Solar
    let s = Astronomy.SearchLocalSolarEclipse(from, obs);
    for (let i = 0; i < 12 && s && s.peak.time.date <= to; i++) {
      const visible = s.peak.altitude > 0 || s.partial_begin.altitude > 0 || s.partial_end.altitude > 0;
      if (visible) {
        out.push({
          type: 'solar',
          kind: s.kind, // partial | annular | total
          peak: s.peak.time.date,
          start: s.partial_begin.time.date,
          end: s.partial_end.time.date,
          amount: s.obscuration,
          date: localDay(s.partial_begin.altitude > 0 ? s.partial_begin.time.date : s.peak.time.date, tz),
        });
      }
      s = Astronomy.NextLocalSolarEclipse(s.peak.time, obs);
    }
    // Lunar
    let l = Astronomy.SearchLunarEclipse(from);
    for (let i = 0; i < 20 && l && l.peak.date <= to; i++) {
      if (l.kind !== 'penumbral') {
        const half = l.sd_partial;
        const start = l.peak.AddDays(-half / 1440);
        const end = l.peak.AddDays(half / 1440);
        let visible = false;
        for (let k = 0; k <= 6 && !visible; k++) visible = moonUp(start.AddDays((k * 2 * half) / 6 / 1440), obs);
        if (visible) {
          out.push({ type: 'lunar', kind: l.kind, peak: l.peak.date, start: start.date, end: end.date, date: localDay(start.date, tz) });
        }
      }
      l = Astronomy.NextLunarEclipse(l.peak);
    }
  } catch (e) {
    // astronomy-engine failing must never break the calendar
  }
  out.sort((a, b) => a.peak - b.peak);
  cache.set(key, out);
  return out;
}
