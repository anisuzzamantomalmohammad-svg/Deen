// Ticks made on the home-screen widget. The widget saves them to
// widget-ticks.json and starts a short background task; the app applies
// them as "on time" (same rak'ah rule as the green circle) and cancels that
// prayer's alerts. If Android didn't let the task run, the app applies them
// the next time it opens or comes back to the front.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { statusPatch, fromYmd } from './qada';
import { clearPrayerAlerts } from './alerts';
import { stampChanges } from './sync';

const PERSIST_KEY = '@prayerApp:v1';

// While the app is running, ticks go through its own state (so they're not
// overwritten when it saves). Set to null while previewing a day.
let live = null;
export const setLiveApply = (fn) => { live = fn; };

async function takeTicks() {
  if (Platform.OS !== 'android') return [];
  try {
    const { File, Paths } = require('expo-file-system');
    const f = new File(Paths.document, 'widget-ticks.json');
    if (!f.exists) return [];
    const txt = f.textSync();
    f.delete();
    const list = JSON.parse(txt || '[]');
    return Array.isArray(list) ? list.filter((x) => x && x.day && x.name) : [];
  } catch (e) {
    return [];
  }
}

// Apply ticks to a copy of the data.
export function applyTicks(prev, ticks) {
  let next = prev;
  ticks.forEach((tk) => {
    const date = fromYmd(tk.day);
    const key = date.toDateString();
    const id = Number(tk.id);
    if (((next.completedByDay || {})[key] || {})[id] || ((next.qadaRecords || {})[key] || {})[id]) return;
    next = { ...next, ...statusPatch(next, date, tk.name, 'ontime') };
  });
  return next;
}

let running = false;
export async function runWidgetTicks() {
  if (running) return;
  running = true;
  try {
    const ticks = await takeTicks();
    if (!ticks.length) return;
    if (live) live(ticks);
    else {
      const raw = await AsyncStorage.getItem(PERSIST_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const next = applyTicks(s, ticks);
        const stamps = stampChanges(s, next, s.syncStamps || {});
        await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(stamps ? { ...next, syncStamps: stamps } : next));
      }
    }
    for (const tk of ticks) await clearPrayerAlerts(tk.day, tk.name);
  } finally {
    running = false;
  }
}
