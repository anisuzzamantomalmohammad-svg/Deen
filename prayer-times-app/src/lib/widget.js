// Home-screen widget (Android). The app writes the next few days of
// countdowns to widget.json; the native widget reads it, shows a live
// countdown and redraws itself at each prayer and every 5 minutes.
import { NativeModules, Platform } from 'react-native';
import { computeDay, formatTime, PRAYER_NAMES, addDays, makruhWindows, dayKeyOf } from './prayer';
import { hijriFor, HIJRI_MONTHS, HIJRI_MONTHS_BN } from './hijri';
import { eventsOnDay } from './events';
import { eventTitle } from '../data/eventText';
import { fastingDayInfo } from './alerts';
import { translate, bnDigits } from '../i18n';
import { LIGHT_PALETTES } from '../theme/palettes';

// The widget is always the ivory card, with the user's light-palette colours.
export function widgetColors(s) {
  const p = LIGHT_PALETTES.find((x) => x.id === s.lightPalette) || LIGHT_PALETTES[0];
  return { bg: '#FBF6EC', ink: p.ink, accent: p.accent, glow: p.sun || p.accent, red: '#C0392B', amber: '#C9851F' };
}

const Native = () => NativeModules.DeenWidget || null;
const DAYS = 4; // yesterday, today and the next two days

// Everything the widget needs, worked out here so the Java side stays simple.
export function buildWidgetData(s, today, cal, colors = widgetColors(s)) {
  const lang = s.lang || 'en';
  const T = (k, v) => translate(lang, k, v);
  const N = (x) => (lang === 'bn' ? bnDigits(String(x)) : String(x));
  const tz = s.coords.timezone;
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i - 1));
  const times = days.map((d) => computeDay(s.coords, s.calcMethod, s.asrMethod, d));
  const list = [];
  days.forEach((d, i) => PRAYER_NAMES.forEach((n) => list.push({ name: n, at: times[i][n], day: d })));
  const ticked = (d, n) => !!((s.completedByDay || {})[dayKeyOf(d)] || {})[PRAYER_NAMES.indexOf(n) + 1];
  const special = (d) => {
    const h = hijriFor(d, cal);
    const evt = eventsOnDay(d, h, (x) => hijriFor(x, cal)).find((e) => e.alert);
    if (evt) return eventTitle(evt, lang);
    const f = fastingDayInfo(d, cal);
    if (f && f.type === 'sunnah') return T(`fast:${f.reason}`);
    return `${N(h.day)} ${(lang === 'bn' ? HIJRI_MONTHS_BN : HIJRI_MONTHS)[h.monthIndex]}`;
  };
  const fasting = (d) => {
    const k = d.toDateString();
    return hijriFor(d, cal).monthIndex === 8 || !!((s.journalByDay || {})[k] || {}).fasted || !!(s.fastPlans || {})[k];
  };
  const slots = [];
  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1];
    const next = list[i];
    const di = days.findIndex((d) => d.getTime() === next.day.getTime());
    const iftar = fasting(next.day) && next.name !== 'Fajr' && next.name !== 'Isha' && PRAYER_NAMES.indexOf(next.name) <= 3 ? times[di].Maghrib.getTime() : 0;
    slots.push({
      from: prev.at.getTime(),
      to: next.at.getTime(),
      title: T(next.name),
      line: T('at {time}', { time: N(formatTime(next.at, tz)) }),
      current: T(prev.name),
      done: ticked(prev.day, prev.name),
      special: special(next.day),
      iftar,
    });
  }
  const red = [];
  times.forEach((d) => makruhWindows(d).forEach((w) => red.push({ from: w.start.getTime(), to: w.end.getTime() })));
  return {
    v: 1,
    madeAt: Date.now(),
    slots,
    red,
    maxTwo: s.maxTwoAlerts !== false,
    text: { iftar: T('Iftar in'), prohibited: T('Prohibited time'), open: T('Open Deen') },
    colors,
  };
}

export async function writeWidget(payload) {
  if (Platform.OS !== 'android') return;
  try {
    const { File, Paths } = require('expo-file-system');
    const f = new File(Paths.document, 'widget.json');
    if (!f.exists) f.create();
    f.write(JSON.stringify(payload));
    const m = Native();
    if (m && m.refresh) m.refresh();
  } catch (e) {
    // the widget just keeps its last data
  }
}

// "Add widget": ask the launcher to pin it, or explain how.
export async function pinWidget(t) {
  const how = t('Long-press your home screen, tap Widgets, then find Deen.');
  if (Platform.OS !== 'android') return t('The widget is for Android phones.');
  const m = Native();
  if (!m || !m.pin) return how;
  try {
    const ok = await m.pin();
    return ok ? null : how;
  } catch (e) {
    return how;
  }
}
