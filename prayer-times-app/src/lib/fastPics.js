// Which picture the fasting card shows (1.8).
//   Day (Seheri → Iftar): an occasion picture on Ramadan, the last 10 nights,
//   the White Days, Arafah and Ashura; otherwise an Iftar food.
//   Night (Iftar → Seheri): a Seheri food.
// Foods follow the user's choice: 'culture' (foods from where they're from,
// worked out from the language or the time zone, or picked in Settings),
// 'turns' (every food takes a turn) or 'simple' (dates & water).
import { IFTAR_PICS, OCCASION_PICS, SEHERI_PICS } from '../data/fastPics';

const TZ_CULTURE = {
  'Asia/Dhaka': 'bd', 'Asia/Karachi': 'pak', 'Asia/Kolkata': 'in', 'Asia/Calcutta': 'in', 'Europe/Istanbul': 'tr', 'Africa/Cairo': 'eg', 'Africa/Casablanca': 'ma',
  'Asia/Riyadh': 'gulf', 'Asia/Dubai': 'gulf', 'Asia/Qatar': 'gulf', 'Asia/Kuwait': 'gulf', 'Asia/Bahrain': 'gulf', 'Asia/Muscat': 'gulf',
  'Asia/Amman': 'lev', 'Asia/Beirut': 'lev', 'Asia/Damascus': 'lev', 'Asia/Gaza': 'ps', 'Asia/Hebron': 'ps', 'Asia/Jerusalem': 'lev',
  'Asia/Tehran': 'ir', 'Asia/Tashkent': 'uz', 'Asia/Samarkand': 'uz', 'Africa/Lagos': 'wa', 'Africa/Dakar': 'wa', 'Africa/Abidjan': 'wa', 'Africa/Accra': 'wa', 'Africa/Bamako': 'wa', 'Africa/Niamey': 'wa', 'Africa/Conakry': 'wa',
  'Asia/Jakarta': 'id', 'Asia/Kuala_Lumpur': 'id', 'Asia/Singapore': 'id', 'Asia/Brunei': 'id', 'Asia/Makassar': 'id',
};
export const CULTURES = [
  ['auto', 'Automatic'], ['bd', 'Bangladesh'], ['pak', 'Pakistan'], ['in', 'India'], ['tr', 'Turkey'], ['eg', 'Egypt'], ['ma', 'Morocco'], ['gulf', 'Gulf'], ['lev', 'Levant'], ['id', 'Indonesia & Malaysia'], ['ir', 'Iran'], ['uz', 'Uzbekistan'], ['wa', 'West Africa'], ['ps', 'Palestine'],
];

const ALL_C = ['bd', 'pak', 'in', 'tr', 'eg', 'ma', 'gulf', 'lev', 'id', 'ir', 'uz', 'wa', 'ps'];
// Settings › Home look › Culture: one, change every day, random, a few, or none.
export function cultureOf(app, date) {
  const mode = app.data.archCulture || 'one';
  const d = date || app.today || new Date();
  const n = dayNo(d);
  if (mode === 'none') return 'all';
  if (mode === 'rotate') return ALL_C[n % ALL_C.length];
  if (mode === 'random') return ALL_C[(n * 7919 + 13) % 97 % ALL_C.length];
  if (mode === 'several') {
    const list = (app.data.cultureList || []).filter((x) => ALL_C.includes(x));
    if (list.length) return list[n % list.length];
  }
  const c = app.data.culture;
  if (c && c !== 'auto') return c;
  if (app.data.lang === 'bn') return 'bd';
  return TZ_CULTURE[(app.coords || {}).timezone] || 'all';
}

const dayNo = (d) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
const byId = (list, id) => list.find((p) => p.id === id);

// The occasion for a fasting day, if it has its own picture.
export function occasionPic(h) {
  if (h.monthIndex === 8) return byId(OCCASION_PICS, h.day >= 21 ? 'qadr' : 'lantern');
  if (h.monthIndex === 11 && h.day === 9) return byId(OCCASION_PICS, 'arafah');
  if (h.monthIndex === 0 && h.day >= 9 && h.day <= 11) return byId(OCCASION_PICS, 'ashura');
  if (h.day >= 13 && h.day <= 15) return byId(OCCASION_PICS, 'moon');
  return null;
}

export function pickFastPic(app, date, night, mode = app.data.fastPics || 'culture') {
  const list = night ? SEHERI_PICS : IFTAR_PICS;
  if (!night) {
    const occ = occasionPic(app.hijri(date));
    if (occ) return occ;
  }
  if (mode === 'simple') return byId(list, night ? 'khejurPani' : 'water');
  let pool = list;
  if (mode !== 'turns') {
    const c = cultureOf(app);
    const cc = c === 'ps' ? 'lev' : c;
    const mine = list.filter((p) => p.c.split(' ').includes(cc));
    pool = mine.length >= 3 ? mine : list.filter((p) => p.c.split(' ').includes('all') || p.c.split(' ').includes(cc));
  }
  return pool[dayNo(date) % pool.length];
}

export { IFTAR_PICS, SEHERI_PICS, OCCASION_PICS };
