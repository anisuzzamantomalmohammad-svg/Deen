// Colours that follow the day.
//
// The day is split into time slots (Fajr, morning, midday, Asr, Maghrib,
// evening, night). Each slot has a few palettes that suit it, and one of
// them is picked at random each day, never the same as yesterday's for that
// slot. Some days add their own palettes to the pick (Friday, White Days,
// a fast you're keeping, Shawwal, the sacred months). Big occasions get one
// fixed "royal" palette instead, so the day is recognisable at a glance.
import { darkPalette, lightPalette } from './palettes';
import { addDays, addMinutes } from '../lib/prayer';

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
};

const DARK_INK = '#ECE7DD';
const LIGHT_INK = '#1E1C18';

// p = { id, name, d: [bg, tint, accent], l: [bg, tint, accent], ink? }
function build(p) {
  const [dbg, dtint, dacc] = p.d;
  const [lbg, ltint, lacc] = p.l;
  const dInk = p.dInk || DARK_INK;
  const lInk = p.lInk || LIGHT_INK;
  const dk = darkPalette(p.id, p.name, dbg, dtint, dInk, dacc, mix(dacc, '#FFFFFF', 0.25), mix(dbg, dInk, 0.06), p.dOk || '#4BBF8A');
  const lt = lightPalette(p.id, p.name, lbg, ltint, lInk, lacc, mix(lacc, '#E0A43A', 0.4), p.lOk || '#2E8A5E');
  const extra = { daily: true, royal: !!p.royal, gold: p.gold || null };
  return { id: p.id, name: p.name, royal: !!p.royal, dark: { ...dk, ...extra, ...(p.dCard ? { card: p.dCard } : {}) }, light: { ...lt, ...extra, sheet: mix(lbg, '#FFFFFF', 0.6) } };
}

// ---------------------------------------------------------------- by time
const T = (id, name, d, l) => build({ id, name, d, l });
export const TIME_PALETTES = {
  fajr: [
    T('dawnMist', 'Dawn Mist', ['#11151C', '#1C2636', '#9DBDE0'], ['#F2F5F9', '#DCE6F2', '#355F8C']),
    T('pearlFajr', 'Pearl Fajr', ['#15131A', '#272230', '#E2BCCB'], ['#F8F3F5', '#EEDDE4', '#8A4A63']),
    T('driftwood', 'Driftwood', ['#141312', '#24221F', '#B8ADA0'], ['#F5F4F2', '#E7E3DF', '#594E40']),
    T('mistBlue', 'Mist Blue', ['#111317', '#1D2128', '#A3B0C4'], ['#F1F3F6', '#DDE2E9', '#3A495F']),
  ],
  morning: [
    T('saffron', 'Saffron Morning', ['#16140F', '#2A2414', '#E3BC62'], ['#FBF7EC', '#F4E7C2', '#7F5B12']),
    T('mint', 'Mint Morning', ['#0F1614', '#18302A', '#86D8BE'], ['#EFF8F4', '#D3EEE3', '#1F6B53']),
    T('pine', 'Pine', ['#0F1513', '#1B2722', '#9DBFA8'], ['#F1F6F3', '#DDE9E1', '#3B5E46']),
    T('oliveGrove', 'Olive Grove', ['#13140F', '#24261A', '#B9B98A'], ['#F6F6F1', '#EAEADC', '#626237']),
    T('cedar', 'Cedar', ['#12140F', '#22261B', '#B7A985'], ['#F6F5F1', '#EAE6DC', '#625637']),
  ],
  midday: [
    T('classic', 'Classic Deen', ['#151618', '#22211D', '#C9A86A'], ['#F5F1E8', '#EAE1CC', '#7D6230']),
    T('iznik', 'Iznik Blue', ['#0F131B', '#16233A', '#7FB2F0'], ['#F0F4FA', '#D6E3F5', '#24569C']),
    T('slate', 'Slate', ['#121417', '#1E2228', '#A9B6C6'], ['#F1F3F6', '#DDE2E9', '#3B4B5E']),
    T('graphiteGold', 'Graphite Gold', ['#141414', '#202020', '#C8AE78'], ['#F8F5F0', '#EDE6D9', '#705929']),
    T('teaLeaf', 'Tea Leaf', ['#12140F', '#20251A', '#A9B48C'], ['#F5F6F1', '#E6E9DD', '#545E3B']),
  ],
  asr: [
    // Amber Hour and Terracotta were too bright; replaced with calmer ones.
    T('datePalm', 'Date Palm', ['#14130E', '#262418', '#C8B27A'], ['#F7F4EA', '#ECE5CF', '#6E5A26']),
    T('desertNight', 'Desert Night', ['#17140F', '#2A241A', '#C9A27C'], ['#F8F3EE', '#EDE1D3', '#7A5634']),
    T('sandalwood', 'Sandalwood', ['#151310', '#26221C', '#BFA98A'], ['#F8F5EF', '#ECE4D6', '#6B5534']),
  ],
  maghrib: [
    T('roseDusk', 'Rose Dusk', ['#1A1316', '#33202A', '#EE958C'], ['#FCF1F0', '#F6D6D4', '#9E3D35']),
    T('copper', 'Copper Sunset', ['#19130E', '#382213', '#F2A160'], ['#FCF3EA', '#F7DBC0', '#984B12']),
    T('walnut', 'Walnut', ['#16120F', '#2A211B', '#C7A58C'], ['#F7F3F0', '#EDE1D9', '#6A482F']),
    T('duskyMauve', 'Dusky Mauve', ['#151216', '#272027', '#C2A6B4'], ['#F6F1F4', '#E8DEE3', '#5C3D4D']),
    T('fig', 'Fig', ['#161214', '#271F23', '#B89AA3'], ['#F6F2F3', '#E8DEE1', '#5B3E47']),
  ],
  evening: [
    T('indigo', 'Indigo Night', ['#10111D', '#1B1D36', '#A3AAF3'], ['#F1F2FB', '#DADDF5', '#434CA6']),
    T('moonlitSea', 'Moonlit Sea', ['#0D1418', '#132A33', '#7EC6D6'], ['#EEF5F7', '#D2E8EE', '#1D6577']),
    T('inkNavy', 'Ink Navy', ['#0E121B', '#18202E', '#9FB0CF'], ['#F0F2F7', '#DAE0EC', '#304469']),
    T('harbor', 'Harbor', ['#0F1315', '#1B2327', '#9DB3BA'], ['#F2F5F6', '#DEE5E8', '#3E545B']),
  ],
  night: [
    T('starlight', 'Starlight', ['#0C0E15', '#161A28', '#C9D0F2'], ['#F2F3F7', '#E0E3EE', '#46506F']),
    T('plum', 'Midnight Plum', ['#120E15', '#221829', '#D2B0E6'], ['#F6F1F8', '#E8DAEF', '#69417F']),
    T('midnightTeal', 'Midnight Teal', ['#0D1414', '#172526', '#93BDB8'], ['#F1F6F6', '#DCEAE8', '#38615C']),
    T('nightSand', 'Night Sand', ['#121110', '#1F1C19', '#C4B39A'], ['#F7F4F1', '#EAE4DC', '#635136']),
    T('pearlGrey', 'Pearl Grey', ['#121213', '#1F1F21', '#B9B8BC'], ['#F3F3F4', '#E3E2E4', '#4B4A4F']),
  ],
};
export const SLOTS = ['fajr', 'morning', 'midday', 'asr', 'maghrib', 'evening', 'night'];
export const SLOT_NAMES = { fajr: 'Fajr to sunrise', morning: 'Morning', midday: 'Midday', asr: 'Asr to Maghrib', maghrib: 'Maghrib', evening: 'Evening', night: 'Late night' };

// --------------------------------------------------- days in the rotation
export const DAY_PALETTES = {
  friday: [
    T('oliveFriday', 'Olive Friday', ['#121611', '#1E2A1C', '#9CCB8F'], ['#F1F6EE', '#DCEBD5', '#3A6E33']),
    T('sageFriday', 'Sage Friday', ['#121513', '#1F2722', '#A9C7B2'], ['#F1F5F2', '#DDE8E1', '#3F634B']),
    T('deepMoss', 'Deep Moss', ['#11140F', '#1F2619', '#B4BE8C'], ['#F5F7F0', '#E8EBDB', '#5B6435']),
  ],
  white: [T('fullMoon', 'Full Moon Silver', ['#121417', '#22262C', '#DDE3EC'], ['#F4F5F7', '#E3E7EC', '#3F4B5C'])],
  fast: [T('fastingSky', 'Fasting Sky', ['#10151A', '#18283A', '#94C8F2'], ['#EFF5FB', '#D5E6F6', '#235F96'])],
  shawwal: [T('shawwal', 'Shawwal Spring', ['#10160F', '#1C2E18', '#B3DA86'], ['#F2F8EC', '#DDEDCC', '#466E1E'])],
  sacred: [T('sacredBronze', 'Sacred Bronze', ['#16130F', '#2A2117', '#D6A97A'], ['#F8F2EB', '#EDDDCB', '#7F5530'])],
};

// ------------------------------------------------------------ royal days
const R = (id, name, d, l, dInk, lInk) => build({ id, name, d, l, dInk, lInk, royal: true, gold: d[2] });
export const ROYAL = {
  eidFitr: R('royalGold', 'Royal Gold', ['#120D05', '#3B2A0A', '#E6B94A'], ['#FBF6EA', '#F3E2B4', '#8A5E06'], '#F3EAD6', '#2A1F0C'),
  eidAdha: R('royalRuby', 'Royal Ruby', ['#14060A', '#4A1020', '#E4B653'], ['#FBF1F1', '#F1CDD3', '#9B2338'], '#F5E6E4', '#2B1015'),
  ramadan: R('royalEmerald', 'Royal Emerald', ['#05130D', '#0E3A28', '#DDB75E'], ['#EFF6F0', '#CDE7D7', '#14694A'], '#EAF0E8', '#0D2419'),
  qadr: R('royalMidnight', 'Royal Midnight', ['#05071A', '#1A2156', '#E6CB82'], ['#EEF0FA', '#D2D7F3', '#2F3A99'], '#E9EBF6', '#121633'),
  arafah: R('royalIvory', 'Royal Ivory', ['#13110B', '#3A3320', '#EDD08A'], ['#FDFAF1', '#F4EACB', '#7F6214'], '#FBF5E6', '#2A2414'),
  dhulHijjah: R('royalAmber', 'Royal Amber', ['#140C05', '#40240C', '#E2AE5C'], ['#FBF3EA', '#F2D9BE', '#954B12'], '#F4E8D8', '#2B1A0B'),
  muharram: R('royalTeal', 'Royal Teal', ['#041312', '#0C3A39', '#DDB866'], ['#EDF6F6', '#CBE7E5', '#126963'], '#E7F2F1', '#0B2423'),
  birthday: R('royalAmethyst', 'Royal Amethyst', ['#0F0717', '#35184F', '#E3BC6C'], ['#F6F0FB', '#E2D2F2', '#6A35A8'], '#F0E8F6', '#211231'),
};
export const ROYAL_NAMES = {
  eidFitr: 'Eid al-Fitr', eidAdha: 'Eid al-Adha', ramadan: 'Ramadan', qadr: 'Last 10 nights of Ramadan', arafah: 'Day of Arafah',
  dhulHijjah: '1–8 Dhul Hijjah', muharram: '1–10 Muharram', birthday: 'Your Hijri birthday',
};

export const ALL_DAILY = [...Object.values(TIME_PALETTES).flat(), ...Object.values(DAY_PALETTES).flat()];
export const paletteById = (id) => ALL_DAILY.find((p) => p.id === id) || Object.values(LIGHT_ONLY).flat().find((p) => p.id === id) || Object.values(ROYAL).find((p) => p.id === id) || null;


// --------------------------------------------- colourful, Light mode only
// Picked at random in Light mode along with the time-of-day palettes.
// (Their dark side is never used.)
const LO = (id, name, l) => build({ id, name, d: ['#151618', '#22211D', '#C9A86A'], l });
export const LIGHT_ONLY = {
  morning: [
    LO('jade', 'Jade', ['#EEF8F3', '#CDEEDF', '#1F7A55']),
    LO('saffronGold', 'Saffron Gold', ['#FCF7EA', '#F5E5B8', '#8E6A0C']),
  ],
  midday: [
    LO('peacock', 'Peacock', ['#ECF6F9', '#C8E6EF', '#14708A']),
    LO('turquoiseTile', 'Turquoise Tile', ['#EDF8F7', '#C9ECE8', '#137A70']),
  ],
  asr: [
    LO('marigold', 'Marigold', ['#FCF6E8', '#F6E3B4', '#9A6A08']),
    LO('coralReef', 'Coral Reef', ['#FCF2EF', '#F6DAD1', '#A34A31']),
  ],
  maghrib: [
    LO('ruby', 'Ruby', ['#FBEFF2', '#F3D3DC', '#A3274A']),
    LO('pomegranate', 'Pomegranate', ['#FCF0EE', '#F5D5CF', '#A8352A']),
  ],
  evening: [
    LO('sapphire', 'Sapphire', ['#EFF2FC', '#D3DCF7', '#2C4BB0']),
  ],
  night: [
    LO('lavender', 'Lavender', ['#F4F1FB', '#E0D8F5', '#5B47A8']),
    LO('amethyst', 'Amethyst', ['#F7F0FA', '#E8D6F1', '#7A3A9E']),
  ],
  friday: [
    LO('emeraldLagoon', 'Emerald Lagoon', ['#EEF8F2', '#C9EBD7', '#16784A']),
  ],
};

// Which slot `now` is in, from today's prayer times.
export function slotAt(now, today, getDay, nightOf) {
  const d = getDay(today);
  const before = now < d.Fajr;
  const nightDay = before ? addDays(today, -1) : today;
  const n = nightOf(getDay(nightDay), getDay(addDays(nightDay, 1)));
  if (before) return now >= n.midnight ? 'night' : 'evening';
  if (now < d.Sunrise) return 'fajr';
  if (now < d.Dhuhr) return 'morning';
  if (now < d.Asr) return 'midday';
  if (now < d.Maghrib) return 'asr';
  if (now < addMinutes(d.Maghrib, 20)) return 'maghrib';
  if (now < n.midnight) return 'evening';
  return 'night';
}

// A number from a string, the same every time (for "random" daily picks).
function seed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
function pick(pool, slot, date) {
  if (pool.length === 1) return pool[0];
  const i = seed(`${dayKey(date)}|${slot}`) % pool.length;
  const y = seed(`${dayKey(addDays(date, -1))}|${slot}`) % pool.length;
  return pool[i === y ? (i + 1) % pool.length : i];
}

// The royal occasion (if any) at `now`. `h` is the Hijri date in effect now
// (it already moves to the next day at Maghrib when that setting is on).
export function royalAt({ h, now, times, birthday, isBirthday }) {
  const m = h.monthIndex;
  const day = h.day;
  if ((m === 9 && day <= 3)) return 'eidFitr';
  if (m === 11 && day >= 10 && day <= 13) return 'eidAdha';
  if (m === 11 && day === 9) return 'arafah';
  if (m === 8 && day >= 21 && (now >= times.Maghrib || now < times.Fajr)) return 'qadr';
  if (m === 8) return 'ramadan';
  if (m === 11 && day <= 8) return 'dhulHijjah';
  if (m === 0 && day <= 10) return 'muharram';
  if (birthday && isBirthday) return 'birthday';
  return null;
}

// Main entry. Returns { palette, slot, royal } or null when colours don't follow the day.
export function dailyPalette({ mode, pins, now, today, getDay, nightOf, h, fasting, isBirthday, birthday }) {
  if (!mode || mode === 'off') return null;
  const times = getDay(today);
  const slot = slotAt(now, today, getDay, nightOf);
  if (mode === 'all') {
    const r = royalAt({ h, now, times, birthday, isBirthday });
    if (r) return { palette: ROYAL[r], slot, royal: r };
  }
  const pinned = pins && pins[slot] && paletteById(pins[slot]);
  if (pinned) return { palette: pinned, slot, royal: null };
  let pool = TIME_PALETTES[slot];
  if (mode === 'all') {
    if (fasting) pool = DAY_PALETTES.fast;
    else if (h.day >= 13 && h.day <= 15) pool = DAY_PALETTES.white;
    else if (today.getDay() === 5) pool = DAY_PALETTES.friday;
    else if (h.monthIndex === 9) pool = [...pool, ...DAY_PALETTES.shawwal];
    else if ([0, 6, 10, 11].includes(h.monthIndex)) pool = [...pool, ...DAY_PALETTES.sacred];
  }
  // Light mode also picks from the colourful light-only set for this time (or Friday).
  const extra = LIGHT_ONLY[pool === DAY_PALETTES.friday ? 'friday' : slot] || [];
  const lightPool = pool === DAY_PALETTES.fast || pool === DAY_PALETTES.white ? pool : [...pool, ...extra];
  return { palette: pick(pool, slot, today), lightPalette: pick(lightPool, `${slot}-light`, today), slot, royal: null };
}
