import { nowDate } from '../lib/clock';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import {
  DEFAULT_COORDS, PRAYER_NAMES, computeDay, makruhWindows, resolveTimezone, zonedParts, addDays, addMinutes, timeAdj,
} from '../lib/prayer';
import { computeVisibilityMonths, finaliseMonths, hijriFor } from '../lib/hijri';
import { scheduleAll, fromYmd, snoozeAlert, trimPresented, clearPrayerAlerts, ymd } from '../lib/alerts';
import { resolveTheme, nightPaletteFor } from '../theme/palettes';
import { dailyPalette } from '../theme/daily';
import { nightOf, prayerWindow } from '../lib/waqt';
import { isHijriBirthday } from '../lib/birthday';
import { migrateQada, statusPatch, rakahPatch, answered } from '../lib/qada';
import { DHIKR, dhikrTotal } from '../data/dhikr';
import { translate } from '../i18n';
import { autoBackupDue, writeAutoBackup } from '../lib/backup';
import { driveBackupDue, uploadBackup, downloadSync, uploadSync } from '../lib/google';
import { stampChanges, mergeSync, syncPayload } from '../lib/sync';
import { setClockOffset } from '../lib/clock';
import { syncCalendar } from '../lib/calsync';
import { buildWidgetData, writeWidget } from '../lib/widget';
import { setLiveApply, applyTicks, runWidgetTicks } from '../lib/widgetTicks';

export const PERSIST_KEY = '@prayerApp:v1';
export const MOON_CACHE_KEY = '@deen:moonCache';

export const DEFAULTS = {
  onboarded: false,
  savedLocations: [],
  activeLocationId: 'auto',
  lastAuto: null,
  completedByDay: {},
  completedSunnahByDay: {},
  qadaCounts: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
  journalByDay: {},
  fastPlans: {},
  calcMethod: 'Karachi',
  asrMethod: 'Hanafi',
  safetyBuffer: 5,
  notificationsEnabled: true,
  fastingAlerts: true,
  hapticsEnabled: true,
  preReminderMins: 10,
  preOff: {},
  adhanOff: {},
  jumuahReminder: 60,
  kahfReminder: '9',
  moonCheck: true,
  hijriMode: 'auto',
  hijriOffset: 0,
  hijriOverrides: {},
  themeMode: 'auto',
  darkPalette: 'emerald',
  lightPalette: 'sandstone',
  lang: 'en',
  arabicSize: 1,
  favoriteDuaIds: [],
  reminders: [],
  remindersCleared: false,
  taraweeh: {},
  quranJuz: {},
  tasbih: { count: 0, target: 33, phrase: 'subhanallah', total: 0 },
  // round 2
  textSize: 1,
  firstOpenAt: null,
  lastBackupAt: null,
  backupReminder: true,
  nudgeOn: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  nudgeLead: 30,
  fajrHijri: true,
  morningDua: '7',
  tahajjudReminder: false,
  fridayLastHour: true,
  newMonthAlert: true,
  eventEve: true,
  qadrNights: true,
  dhulHijjah: true,
  eidMorning: true,
  taraweehReminder: true,
  homeBase: null,
  noticeHidden: {},
  handledResponse: null,
  // round 3 (1.2.0)
  showHistory: true,
  showEclipses: true,
  hijriBirthday: null,
  daySummary: true,
  daySummaryAfter: 90,
  notif: {},
  secondCity: { name: 'Dhaka', cc: 'BD', latitude: 23.8103, longitude: 90.4125, timezone: 'Asia/Dhaka' },
  secondCityOn: true,
  batteryCardHidden: false,
  qadaLog: [],
  // round 4 (1.3.0)
  colourMode: 'all', // off | time | all
  colourPins: {},
  nightMode: 'off', // off | lastThird | always
  hijriAtMaghrib: true,
  homeCards: null, // [{ id, hidden }] in order
  travelConfirmed: null, // date string the user said "yes, travelling"
  charity: { currency: 'NZD', gold: 0, silver: 0, cash: 0, business: 0, owed: 0, debts: 0, goldPrice: 0, silverPrice: 0, nisab: 'silver', people: 1, fitrahRate: 0, fasts: 0, fidyaRate: 0, kaffarahCount: 1 },
  setupDone: false,
  // round 5 (1.4.0)
  qadaRecords: {},
  olderLog: [],
  trackedDays: {},
  qadaMigrated: false,
  nightOn: false,
  nightWhen: 'lastThird', // lastThird | always
  nightOffDay: null, // "turn off for tonight": the date it was turned off
  vibratePerPrayer: false,
  nudgeAll: true,
  maxTwoAlerts: true,
  zakatReminder: true,
  monthReport: true,
  backupWeekly: false,
  backupDirUri: null,
  lastAutoBackupAt: null,
  homeTicks: 0,
  surahsLearned: {},
  tipsHidden: {},
  seenCity: null,
  cityAsked: null,
  alertLog: [],
  // round 6 (1.5.0)
  google: null, // { name, email, photo } when signed in
  driveWeekly: true,
  lastDriveBackupAt: null,
  googleCardHidden: false,
  calSync: null, // { calendarId, kinds, eventIds, title }
  timeAdj: {}, // minutes per prayer, this phone only
  adjPerCity: false,
  adjByCity: {},
  calMain: 'regular', // regular | hijri (regular by default from 1.6.0)
  calMainV: 0,
  // 1.6.0
  rakahByDay: {}, // { [day]: { [prayerId]: { sb, sa, nf, wt, ... } } } sunnah/nafl ticks
  tickAt: {}, // { [day]: { [prayerId]: iso } } when a prayer was answered
  jumuahByDay: {}, // { [day]: { choice: 'jumuah' | 'dhuhr', reason } }
  dirtyAt: 0, // last change to synced data (prayer log etc.)
  syncStamps: {}, // when each synced piece last changed (see lib/sync.js)
  lastSyncAt: null,
  lastSyncedDirty: 0,
  syncedRemoteAt: null,
  safar: null, // { since, city, homeName } while travelling with qasr on
  safarAsk: 'ask', // ask | off
  safarDeclined: null, // the trip (day string) the user said "No" for
  imamByDay: {}, // { [day]: { [prayerId]: true } } prayed behind a local imam
  seheriByDay: {}, // { [day]: 'yes' | 'missed' }
  notFastingByDay: {}, // { [day]: 'travelling' }
  shawwalHidden: false,
  missedFasts: [], // [{ day, reason, madeUp }]
  zakatFitrDone: {}, // { [hijriYear]: true }
  quran: { last: null, bookmarks: [], notes: {}, trans: 'both' }, // last: { s, a }
  dhikrByDay: {},
  namesLearnt: {},
  learn: { letters: {}, games: {} },
  ramadanOrder: null, // Home order during Ramadan
  whatsNewSeen: null,
  askRecent: [],
  todayTicks: {}, // { [day]: { [itemId]: true } } Today card ticks
  notPrayed: {}, // { [day]: { [prayerId]: true } } answered "Not yet"
  safarDays: {}, // { [day]: true } days spent travelling (safar)
  ramadanChecks: {}, // { [hijriYear]: { dates, route } } before-Eid checklist
};
export const ARABIC_SCALES = [0.85, 1, 1.15, 1.32];
export const TEXT_SCALES = [0.9, 1, 1.12, 1.25];
// Travelling (safar) in the Hanafi school: about 48 miles / 78 km from home.
export const SAFAR_KM = 78;

// Turn whatever was saved (any version, or an imported backup) into the
// current shape. Unknown keys are dropped, missing ones get defaults.
export function migrate(saved) {
  const out = { ...DEFAULTS };
  if (!saved || typeof saved !== 'object') return out;
  Object.keys(DEFAULTS).forEach((k) => {
    if (saved[k] !== undefined && saved[k] !== null) out[k] = saved[k];
  });
  // 1.6.0: the calendar opens on regular (English) dates. Switch everyone once;
  // after that their own choice stays.
  if (!saved.calMainV) { out.calMain = 'regular'; out.calMainV = 1; }
  if (saved.themeMode === 'system') out.themeMode = 'auto';
  if (saved.onboarded === undefined && (saved.completedByDay || saved.calcMethod)) out.onboarded = true; // existing user
  if (out.asrMethod !== 'Hanafi') out.asrMethod = 'Standard';
  out.qadaCounts = { ...DEFAULTS.qadaCounts, ...(out.qadaCounts || {}) };
  out.tasbih = { ...DEFAULTS.tasbih, ...(out.tasbih || {}) };
  out.charity = { ...DEFAULTS.charity, ...(out.charity || {}) };
  if (!['off', 'time', 'all'].includes(out.colourMode)) out.colourMode = 'all';
  // 1.3 night mode setting -> on/off switch + when
  if (saved.nightMode && saved.nightOn === undefined) {
    out.nightOn = saved.nightMode !== 'off';
    out.nightWhen = saved.nightMode === 'always' ? 'always' : 'lastThird';
  }
  if (!['auto', 'light', 'dark', 'daynight'].includes(out.themeMode)) out.themeMode = 'auto';
  // 1.4: "Did you pray?" for all 5 prayers, once, for people updating.
  if (saved.nudgeAll === undefined) {
    out.nudgeOn = { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true };
    out.nudgeAll = true;
  }
  return migrateQada(out);
}

// Where the times are for, from saved data alone (used outside render).
export function saved0Coords(s) {
  const sv = (s.savedLocations || []).find((l) => l.id === s.activeLocationId);
  if (sv) return { latitude: sv.latitude, longitude: sv.longitude, timezone: sv.timezone };
  return s.lastAuto ? { latitude: s.lastAuto.latitude, longitude: s.lastAuto.longitude, timezone: s.lastAuto.timezone } : DEFAULT_COORDS;
}

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

// Morning & evening adhkar: done when the Daily dhikr morning and evening rows are complete.
const ADHKAR_ROWS = DHIKR.filter((d) => d.group === 'morning' || d.group === 'evening');
function adhkarDone(data, dateObj) {
  const rec = ((data.dhikrByDay || {})[dateObj.toDateString()]) || {};
  return ADHKAR_ROWS.every((d) => (rec[d.id] || 0) >= dhikrTotal(d));
}

const distKm = (a, b) => {
  if (!a || !b) return 0;
  const r = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * r;
  const dLon = (b.longitude - a.longitude) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

async function placeName(latitude, longitude) {
  try {
    const g = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (g && g.length) {
      const city = g[0].city || g[0].district || g[0].subregion || g[0].region;
      const cc = g[0].isoCountryCode || g[0].country;
      return city && cc ? `${city}, ${cc}` : city || cc || null;
    }
  } catch (e) {
    // no geocoder (web) or offline
  }
  return null;
}

export function AppProvider({ children }) {
  const [data, setData] = useState(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const [clock, setClock] = useState(() => nowDate());
  const [toast, setToast] = useState(null);
  const [gps, setGps] = useState({ loading: true, coords: null, name: null, error: null });
  const [rawMonths, setRawMonths] = useState(null);
  const [alertsStatus, setAlertsStatus] = useState(null);
  // Preview a day: the app acts as another moment; nothing is saved.
  const [preview, setPreviewState] = useState(null);
  const previewRef = useRef(null);
  previewRef.current = preview;
  const systemScheme = useColorScheme();
  const dataRef = useRef(data);
  dataRef.current = data;

  const update = useCallback((patch) => {
    setData((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  /* ---------------- load & save ---------------- */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PERSIST_KEY);
        const loaded = raw ? migrate(JSON.parse(raw)) : { ...DEFAULTS };
        if (!loaded.firstOpenAt) loaded.firstOpenAt = nowDate().toISOString();
        setData(loaded);
        const mc = await AsyncStorage.getItem(MOON_CACHE_KEY);
        if (mc) {
          const parsed = JSON.parse(mc);
          if (parsed && parsed.raw) setRawMonths(parsed);
        }
      } catch (e) {
        // start fresh
      } finally {
        setHydrated(true);
      }
    })();
  }, []);
  useEffect(() => {
    if (!hydrated || preview) return undefined;
    const h = setTimeout(() => AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(data)).catch(() => {}), 350);
    return () => clearTimeout(h);
  }, [data, hydrated]);

  // One-time clean-up after the Tasks tab was removed: cancel its alerts.
  useEffect(() => {
    if (!hydrated || data.remindersCleared) return;
    (data.reminders || []).forEach((r) => {
      if (r.notificationId) Notifications.cancelScheduledNotificationAsync(r.notificationId).catch(() => {});
    });
    update({ remindersCleared: true });
  }, [hydrated]);

  /* ---------------- clock ---------------- */
  useEffect(() => {
    const id = setInterval(() => setClock(nowDate()), 15000);
    return () => clearInterval(id);
  }, []);
  // Roll over to the new day right at midnight, not up to 15 s later.
  useEffect(() => {
    const n = nowDate();
    const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 1);
    const h = setTimeout(() => setClock(nowDate()), next - n);
    return () => clearTimeout(h);
  }, [clock.getDate()]);

  /* ---------------- location ---------------- */
  const saved = data.savedLocations.find((l) => l.id === data.activeLocationId);
  const fetchGps = useCallback(async (announce) => {
    if (Platform.OS === 'web') {
      setGps((g) => ({ ...g, loading: false }));
      return;
    }
    try {
      setGps((g) => ({ ...g, loading: true }));
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setGps((g) => ({ ...g, loading: false, error: 'denied' }));
        return;
      }
      let pos = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60000 });
      if (!pos) pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, timezone: resolveTimezone(pos.coords.latitude, pos.coords.longitude) };
      const prev = dataRef.current.lastAuto;
      const moved = distKm(prev, c) > 25;
      const name = (await placeName(c.latitude, c.longitude)) || (moved ? null : prev?.name) || translate(dataRef.current.lang, 'Current location');
      setGps({ loading: false, coords: c, name, error: null });
      if (!prev || moved || prev.name !== name) update({ lastAuto: { ...c, name } });
      if (!dataRef.current.homeBase) update({ homeBase: { latitude: c.latitude, longitude: c.longitude, name } });
      if (announce && prev && moved) setToast(translate(dataRef.current.lang, 'Location updated to {name}', { name }));
    } catch (e) {
      setGps((g) => ({ ...g, loading: false, error: 'failed' }));
    }
  }, []);

  useEffect(() => {
    if (!hydrated || data.activeLocationId !== 'auto' || !data.onboarded) return;
    fetchGps(true);
  }, [hydrated, data.activeLocationId, data.onboarded]);

  // Travelling: re-check the location whenever the app comes back to the front.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        setClock(nowDate());
        if (dataRef.current.activeLocationId === 'auto' && dataRef.current.onboarded) fetchGps(true);
      }
    });
    return () => sub.remove();
  }, []);

  const coords = saved
    ? { latitude: saved.latitude, longitude: saved.longitude, timezone: saved.timezone }
    : gps.coords || (data.lastAuto ? { latitude: data.lastAuto.latitude, longitude: data.lastAuto.longitude, timezone: data.lastAuto.timezone } : DEFAULT_COORDS);
  const locationName = saved ? saved.label : gps.name || data.lastAuto?.name || 'Wellington, NZ';
  // Away from home (only judged from GPS, not from a city picked by hand).
  const awayKm = !saved && gps.coords && data.homeBase ? Math.round(distKm(data.homeBase, gps.coords)) : 0;
  const travelling = awayKm >= SAFAR_KM;
  // Back home: travel mode switches itself off.
  useEffect(() => {
    if (data.travelConfirmed && gps.coords && !travelling) {
      update({ travelConfirmed: null, safarDeclined: null });
      setToast(translate(dataRef.current.lang, 'Welcome home · safar ended'));
    }
  }, [travelling, !!gps.coords]);

  /* ---------------- today & times ---------------- */
  const zp = zonedParts(clock, coords.timezone);
  const todayKey = `${zp.y}-${zp.m}-${zp.d}`;
  const today = useMemo(() => new Date(zp.y, zp.m - 1, zp.d), [todayKey]);
  // Remember the days spent travelling, for the compass mark on the calendar.
  useEffect(() => {
    const k = today.toDateString();
    if (hydrated && !preview && data.travelConfirmed && !(data.safarDays || {})[k]) update((p) => ({ safarDays: { ...(p.safarDays || {}), [k]: true } }));
  }, [data.travelConfirmed, todayKey, hydrated, preview]);
  const settingsKey = `${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)},${data.calcMethod},${data.asrMethod},${JSON.stringify(timeAdj(data) || {})}`;
  const dayCache = useRef({ key: '', map: new Map() });
  const getDay = useCallback((dateObj) => {
    if (dayCache.current.key !== settingsKey) dayCache.current = { key: settingsKey, map: new Map() };
    const k = dateObj.toDateString();
    let v = dayCache.current.map.get(k);
    if (!v) {
      v = computeDay(coords, data.calcMethod, data.asrMethod, dateObj, timeAdj(data));
      dayCache.current.map.set(k, v);
    }
    return v;
  }, [settingsKey]);

  /* ---------------- Hijri calendar ---------------- */
  const moonKey = `${Math.round(coords.latitude)},${Math.round(coords.longitude)},${today.getFullYear()}-${today.getMonth()}`;
  useEffect(() => {
    if (!hydrated || data.hijriMode !== 'auto') return undefined;
    if (rawMonths && rawMonths.key === moonKey) return undefined;
    let cancelled = false;
    // A short delay lets the first screen draw before the (once a month)
    // moon calculation runs. Not tied to InteractionManager: the arch timer
    // animates constantly, so "after interactions" might never come.
    const h = setTimeout(() => {
      if (cancelled) return;
      try {
        const raw = computeVisibilityMonths(coords.latitude, coords.longitude, today, 420);
        const payload = { key: moonKey, raw };
        setRawMonths(payload);
        AsyncStorage.setItem(MOON_CACHE_KEY, JSON.stringify(payload)).catch(() => {});
      } catch (e) {
        // falls back to Umm al-Qura
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
  }, [hydrated, data.hijriMode, moonKey]);

  const cal = useMemo(() => {
    const months = data.hijriMode === 'auto' && rawMonths?.raw ? finaliseMonths(rawMonths.raw, data.hijriOverrides) : null;
    return { mode: months ? 'auto' : 'ummalqura', offset: data.hijriOffset || 0, months };
  }, [data.hijriMode, rawMonths, data.hijriOverrides, data.hijriOffset]);
  const hijri = useCallback((dateObj) => hijriFor(dateObj, cal), [cal]);

  /* ---------------- prohibited time & theme ---------------- */
  const todayTimes = getDay(today);

  // The prayer day on Home. The day's prayers stay up after midnight until
  // Isha is ticked; then the next day's times show. If Isha isn't ticked,
  // the next day takes over 2 hours before Fajr (Isha is still valid until
  // Fajr and the timer keeps it). The prayer day itself ends at Fajr.
  const prayerDay = useMemo(() => {
    const base = clock < todayTimes.Fajr ? addDays(today, -1) : today;
    const baseTimes = getDay(base);
    const nextFajr = getDay(addDays(base, 1)).Fajr;
    if (clock >= baseTimes.Isha && answered(data, base, 'Isha')) return addDays(base, 1);
    if (clock >= new Date(nextFajr.getTime() - 2 * 3600000)) return addDays(base, 1);
    return base;
  }, [todayKey, clock, todayTimes, data.completedByDay, data.qadaRecords, getDay]);
  // The day whose Isha is still running (before Fajr), if any.
  const nightDay = clock < todayTimes.Fajr ? addDays(today, -1) : today;
  const activeMakruh = useMemo(() => {
    const w = makruhWindows(todayTimes).find((x) => clock >= x.start && clock < x.end);
    return w || null;
  }, [todayTimes, clock]);
  // The Hijri date in effect right now: it moves on at Maghrib (setting).
  const afterMaghrib = data.hijriAtMaghrib !== false && clock >= todayTimes.Maghrib;
  const hijriNow = useMemo(() => hijri(afterMaghrib ? addDays(today, 1) : today), [hijri, today, afterMaghrib]);
  const fastingToday = hijri(today).monthIndex === 8 || !!(data.journalByDay[today.toDateString()] || {}).fasted || !!(data.fastPlans || {})[today.toDateString()];
  const daily = dailyPalette({
    mode: data.colourMode, pins: data.colourPins, now: clock, today, getDay, nightOf, h: hijriNow, fasting: fastingToday,
    birthday: data.hijriBirthday, isBirthday: !!data.hijriBirthday && isHijriBirthday(data.hijriBirthday, afterMaghrib ? addDays(today, 1) : today, hijri),
  });
  // Tahajjud night mode. "Turn off for tonight" is remembered for the night
  // it was pressed (the night belongs to the day it started on).
  const nightBase = clock < todayTimes.Fajr ? addDays(today, -1) : today;
  const nightOn = (() => {
    if (!data.nightOn) return false;
    if (data.nightOffDay === nightBase.toDateString()) return false;
    const n = nightOf(getDay(nightBase), getDay(addDays(nightBase, 1)));
    if (data.nightWhen === 'always') return clock >= getDay(nightBase).Isha && clock < n.end;
    return clock >= n.lastThird && clock < n.end;
  })();
  // "Day & night" mode: light from sunrise, dark from Maghrib.
  const dayLight = clock >= todayTimes.Sunrise && clock < todayTimes.Maghrib;
  const effectiveMode = data.themeMode === 'daynight' ? (dayLight ? 'light' : 'dark') : data.themeMode;
  const dailyId = daily ? daily.palette.id : '';
  const theme = useMemo(
    () => resolveTheme({ mode: effectiveMode, darkId: data.darkPalette, lightId: data.lightPalette, systemScheme, prohibited: !!activeMakruh, daily: daily && { ...daily.palette, light: (daily.lightPalette || daily.palette).light }, night: nightOn ? nightPaletteFor(nightBase) : false }),
    [effectiveMode, data.darkPalette, data.lightPalette, systemScheme, !!activeMakruh, dailyId, nightOn, nightBase.toDateString()]
  );

  /* ---------------- widget ---------------- */
  // The widget follows the app's colours (palette, light/dark, daily colours),
  // without the red of prohibited times or night mode.
  const widgetTheme = useMemo(
    () => resolveTheme({ mode: effectiveMode, darkId: data.darkPalette, lightId: data.lightPalette, systemScheme, prohibited: false, daily: daily && { ...daily.palette, light: (daily.lightPalette || daily.palette).light }, night: false }),
    [effectiveMode, data.darkPalette, data.lightPalette, systemScheme, dailyId]
  );
  const widgetKey = [hydrated, todayKey, settingsKey, coords.timezone, data.lang, widgetTheme.bg, widgetTheme.accent, data.maxTwoAlerts, cal.mode, cal.offset, rawMonths?.key,
    JSON.stringify(data.completedByDay[today.toDateString()] || {}), JSON.stringify(data.completedByDay[addDays(today, -1).toDateString()] || {}),
    JSON.stringify((data.qadaRecords || {})[today.toDateString()] || {}), JSON.stringify((data.qadaRecords || {})[addDays(today, -1).toDateString()] || {}),
    !!data.travelConfirmed, JSON.stringify(data.journalByDay[today.toDateString()] || {}), JSON.stringify(data.fastPlans || {}), JSON.stringify(data.notFastingByDay || {}), (data.missedFasts || []).length, data.nightOn, data.nightWhen, data.nightOffDay, data.darkPalette, data.safetyBuffer].join('|');
  useEffect(() => {
    if (!hydrated || Platform.OS !== 'android' || preview) return undefined;
    const h = setTimeout(() => {
      try {
        const w = widgetTheme;
        writeWidget(buildWidgetData({ ...dataRef.current, coords }, today, cal, { bg: w.bg, ink: w.ink, accent: w.accent, glow: w.sun || w.accent, red: w.red || '#C0392B', amber: w.amber || '#C9851F', ok: w.ok || '#2E8A5E' }));
      } catch (e) {
        // not critical
      }
    }, 1200);
    return () => clearTimeout(h);
  }, [widgetKey]);

  /* ---------------- calendar events follow moon changes ---------------- */
  // My fasts: planned fasts, kept fasts, the city and the time settings.
  const fastKey = data.calSync && (data.calSync.kinds || []).includes('myfasts')
    ? `${Object.keys(data.fastPlans || {}).filter((k) => data.fastPlans[k]).join(',')}|${Object.keys(data.journalByDay || {}).filter((k) => data.journalByDay[k] && data.journalByDay[k].fasted).length}|${(data.missedFasts || []).length}|${coords.latitude.toFixed(2)},${coords.longitude.toFixed(2)}|${data.safetyBuffer}|${data.calcMethod}`
    : '';
  const calKey = `${JSON.stringify(data.hijriOverrides || {})}|${cal.mode}|${cal.offset}|${rawMonths?.key}|${data.lang}|${fastKey}`;
  const lastCalKey = useRef(null);
  useEffect(() => {
    if (!hydrated || preview || !data.calSync || Platform.OS === 'web') return undefined;
    const weekOld = !data.calSync.at || Date.now() - new Date(data.calSync.at).getTime() > 7 * 86400000;
    const changed = lastCalKey.current !== null && lastCalKey.current !== calKey;
    lastCalKey.current = calKey;
    if (!weekOld && !changed) return undefined;
    const h = setTimeout(() => {
      syncCalendar(dataRef.current.calSync, { today, hijri, lang: dataRef.current.lang, tz: coords.timezone, data: dataRef.current, getDay })
        .then((r) => r && update({ calSync: r }))
        .catch(() => {});
    }, 8000);
    return () => clearTimeout(h);
  }, [hydrated, calKey, todayKey]);

  /* ---------------- sync & Drive backup ---------------- */
  // Every change to synced data is stamped with its time (and marks the
  // data as changed, so the next backup picks it up).
  const prevDataRef = useRef(null);
  const applyingRemote = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    const prev = prevDataRef.current;
    prevDataRef.current = data;
    if (!prev || previewRef.current) return;
    if (applyingRemote.current) {
      applyingRemote.current = false;
      return;
    }
    const st = stampChanges(prev, data, data.syncStamps || {});
    if (st) setData((d) => ({ ...d, syncStamps: st, dirtyAt: Date.now() }));
  }, [data, hydrated]);

  // Merge with the copy in Drive: on open, on coming back to the front and
  // on "Sync now".
  const syncing = useRef(false);
  const syncNow = useCallback(async () => {
    const d0 = dataRef.current;
    if (!d0.google || Platform.OS === 'web' || syncing.current || previewRef.current) return 'skip';
    syncing.current = true;
    try {
      const remote = await downloadSync();
      let result = null;
      // Merge inside the update, so a tick made while downloading isn't lost.
      await new Promise((resolve) => {
        setData((prev) => {
          const m = remote ? mergeSync(syncPayload(prev), prev.syncStamps || {}, remote.data || {}, remote.stamps || {}) : { data: syncPayload(prev), stamps: prev.syncStamps || {}, changedLocal: false, changedRemote: true };
          result = m;
          resolve();
          if (!m.changedLocal) return prev;
          applyingRemote.current = true;
          return { ...prev, ...m.data, syncStamps: m.stamps, dirtyAt: Date.now() };
        });
      });
      if (result && (result.changedRemote || !remote)) await uploadSync({ data: result.data, stamps: result.stamps }, remote && remote.fileId);
      update({ lastSyncAt: new Date().toISOString() });
      return 'ok';
    } catch (e) {
      return 'error';
    } finally {
      syncing.current = false;
    }
  }, []);
  const backupIfChanged = useCallback(() => {
    const d = dataRef.current;
    if (previewRef.current || !driveBackupDue(d)) return;
    uploadBackup(d)
      .then(() => update({ lastDriveBackupAt: new Date().toISOString() }))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!hydrated || !data.google) return undefined;
    const h = setTimeout(() => { syncNow().finally(backupIfChanged); }, 3000);
    return () => clearTimeout(h);
  }, [hydrated, !!data.google]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (!dataRef.current.google) return;
      if (s === 'active') syncNow();
      else if (s === 'background') backupIfChanged();
    });
    return () => sub.remove();
  }, []);

  /* ---------------- ticks from the home-screen widget ---------------- */
  useEffect(() => {
    if (!hydrated || preview) { setLiveApply(null); return undefined; }
    setLiveApply((ticks) => setData((prev) => applyTicks(prev, ticks)));
    runWidgetTicks();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') runWidgetTicks(); });
    return () => { sub.remove(); setLiveApply(null); };
  }, [hydrated, !!preview]);

  /* ---------------- weekly auto backup ---------------- */
  useEffect(() => {
    if (!hydrated || !autoBackupDue(data)) return undefined;
    const h = setTimeout(() => {
      writeAutoBackup(dataRef.current)
        .then((ok) => ok && update({ lastAutoBackupAt: nowDate().toISOString() }))
        .catch(() => {});
    }, 4000);
    return () => clearTimeout(h);
  }, [hydrated, todayKey, data.backupWeekly, data.backupDirUri]);

  /* ---------------- haptics ---------------- */
  const haptic = useCallback((kind) => {
    if (!dataRef.current.hapticsEnabled || Platform.OS === 'web') return;
    try {
      if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (kind === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (kind === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else Haptics.selectionAsync();
    } catch (e) {
      // unsupported
    }
  }, []);

  /* ---------------- alerts ---------------- */
  const alertKey = [
    hydrated, data.onboarded, todayKey, coords.latitude.toFixed(2), coords.longitude.toFixed(2), coords.timezone, data.calcMethod, data.asrMethod, data.safetyBuffer, JSON.stringify(timeAdj(data) || {}),
    data.notificationsEnabled, data.fastingAlerts, data.preReminderMins, JSON.stringify(data.preOff), JSON.stringify(data.adhanOff), JSON.stringify(data.fastPlans),
    data.jumuahReminder, data.kahfReminder, data.moonCheck, data.lang, cal.mode, cal.offset, JSON.stringify(data.hijriOverrides), rawMonths?.key,
    JSON.stringify(data.nudgeOn), data.nudgeLead, data.fajrHijri, data.morningDua, data.tahajjudReminder, data.fridayLastHour, data.newMonthAlert,
    data.eventEve, data.qadrNights, data.dhulHijjah, data.eidMorning, data.taraweehReminder, data.backupReminder, data.lastBackupAt,
    ...[today, addDays(today, -1)].map((d) => JSON.stringify([data.completedByDay[d.toDateString()], (data.qadaRecords || {})[d.toDateString()], (data.tickAt || {})[d.toDateString()]])),
    !!data.travelConfirmed, data.daySummary, data.daySummaryAfter, JSON.stringify(data.notif), data.showEclipses, data.hijriBirthday && JSON.stringify(data.hijriBirthday),
    data.vibratePerPrayer, data.monthReport, data.zakatReminder, JSON.stringify((data.charity || {}).zakatDay || null),
  ].join('|');
  useEffect(() => {
    if (!hydrated || !data.onboarded || preview) return undefined;
    let cancelled = false;
    const h = setTimeout(async () => {
      try {
        const res = await scheduleAll({ ...dataRef.current, coords }, today, cal);
        if (!cancelled) setAlertsStatus(res);
      } catch (e) {
        if (!cancelled) setAlertsStatus('error');
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
  }, [alertKey]);

  // Taps on notifications: "Prayed" ticks the prayer, the moon buttons move
  // the month, and taps on a dua / event / backup alert open that screen.
  // Each response is handled once, even though the last one is reported
  // again every time the app starts.
  const [pendingOpen, setPendingOpen] = useState(null);
  useEffect(() => {
    if (Platform.OS === 'web' || !hydrated) return undefined;
    const handle = (resp) => {
      const req = resp?.notification?.request;
      const d = req?.content?.data;
      if (!d) return;
      const id = `${req.identifier}:${resp.actionIdentifier}`;
      if (dataRef.current.handledResponse === id) return;
      update({ handledResponse: id });
      const action = resp.actionIdentifier;
      if (d.kind === 'moon' && (action === 'later' || action === 'earlier')) {
        shiftMonth(d.year, d.monthIndex, action === 'later' ? 1 : -1);
        return;
      }
      if (action === 'snooze') {
        snoozeAlert(req.content, dataRef.current).catch(() => {});
        Notifications.dismissNotificationAsync(req.identifier).catch(() => {});
        return;
      }
      if (action === 'prayed' && d.name && d.day) {
        Notifications.dismissNotificationAsync(req.identifier).catch(() => {});
        const day = fromYmd(d.day);
        const s0 = dataRef.current;
        const c0 = saved0Coords(s0);
        const w = prayerWindow(d.name, computeDay(c0, s0.calcMethod, s0.asrMethod, day, timeAdj(s0)), computeDay(c0, s0.calcMethod, s0.asrMethod, addDays(day, 1), timeAdj(s0)));
        // After the prayer's time: ask "Did you pray it?" instead of ticking.
        if (nowDate() >= w.end) {
          setPendingOpen({ type: 'prayer', name: d.name, day: d.day });
          return;
        }
        setPrayed(day, d.name, true);
        setToast(translate(dataRef.current.lang, '{name} marked as prayed', { name: translate(dataRef.current.lang, d.name) }));
        return;
      }
      if ((d.kind === 'nudge' || d.kind === 'snooze') && d.name && d.day) {
        setPendingOpen({ type: 'prayer', name: d.name, day: d.day });
        return;
      }
      if (d.kind === 'dua' && d.id) setPendingOpen({ type: 'dua', id: d.id });
      else if (d.kind === 'special' && d.event) setPendingOpen({ type: 'event', id: d.event, day: d.day });
      else if (d.kind === 'backup') setPendingOpen({ type: 'backup' });
      else if (d.kind === 'summary' && d.day) setPendingOpen({ type: 'day', day: d.day });
      else if (d.kind === 'special' && d.birthday) setPendingOpen({ type: 'converter' });
      else if (d.kind === 'report' && d.review) setPendingOpen({ type: 'review', year: d.review });
      else if (d.kind === 'report' && d.day) setPendingOpen({ type: 'report', day: d.day });
      else if (d.kind === 'zakat') setPendingOpen({ type: 'charity' });
    };
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    Notifications.getLastNotificationResponseAsync().then((r) => r && handle(r)).catch(() => {});
    // At most 2 Deen alerts in the list: trim when one arrives while the app
    // is open, and whenever the app comes to the front.
    const trim = () => { if (dataRef.current.maxTwoAlerts !== false) trimPresented(1); };
    const got = Notifications.addNotificationReceivedListener(() => setTimeout(trim, 800));
    const st = AppState.addEventListener('change', (x) => { if (x === 'active') trim(); });
    trim();
    return () => { sub.remove(); got.remove(); st.remove(); };
  }, [hydrated]);

  const shiftMonth = useCallback((year, monthIndex, delta) => {
    const key = `${year}-${monthIndex}`;
    setData((prev) => {
      const cur = (prev.hijriOverrides || {})[key] || 0;
      const next = Math.max(-1, Math.min(1, cur + delta));
      return { ...prev, hijriOverrides: { ...(prev.hijriOverrides || {}), [key]: next } };
    });
    setToast(translate(dataRef.current.lang, delta > 0 ? 'Moved the new month a day later' : 'Moved the new month a day earlier'));
  }, []);

  /* ---------------- logging actions ---------------- */
  // Answering a prayer anywhere clears its "time for" alert and its
  // "Did you pray?" reminder straight away (scheduled and already shown).
  const afterAnswer = (dateObj, name, status) => {
    if (status === 'ontime' || status === 'qada') clearPrayerAlerts(ymd(dateObj), name).catch(() => {});
  };
  const togglePrayer = useCallback((dateObj, name) => {
    const id = PRAYER_NAMES.indexOf(name) + 1;
    const key = dateObj.toDateString();
    const on = !(dataRef.current.completedByDay[key] || {})[id];
    setData((prev) => ({ ...prev, ...statusPatch(prev, dateObj, name, on ? 'ontime' : 'missed'), homeTicks: (prev.homeTicks || 0) + (on ? 1 : 0) }));
    afterAnswer(dateObj, name, on ? 'ontime' : 'missed');
  }, []);
  const setPrayed = useCallback((dateObj, name, on) => {
    setData((prev) => ({ ...prev, ...statusPatch(prev, dateObj, name, on ? 'ontime' : 'missed') }));
    afterAnswer(dateObj, name, on ? 'ontime' : 'missed');
  }, []);
  const tickAll = useCallback((dateObj) => {
    setData((prev) => {
      let next = prev;
      PRAYER_NAMES.forEach((n) => {
        const st = ((next.qadaRecords || {})[dateObj.toDateString()] || {})[PRAYER_NAMES.indexOf(n) + 1];
        if (!st) next = { ...next, ...statusPatch(next, dateObj, n, 'ontime') };
      });
      return next;
    });
    PRAYER_NAMES.forEach((n) => afterAnswer(dateObj, n, 'ontime'));
  }, []);
  const setRakah = useCallback((dateObj, name, rowKey, on) => {
    setData((prev) => ({ ...prev, ...rakahPatch(prev, dateObj, name, rowKey, on) }));
  }, []);
  const isPrayed = (dateObj, name) => !!data.completedByDay[dateObj.toDateString()]?.[PRAYER_NAMES.indexOf(name) + 1];
  const toggleSunnah = useCallback((dateObj, k) => {
    const key = dateObj.toDateString();
    if (k === 'roja') {
      // The voluntary fast tick is the same as "I'm fasting today".
      setData((prev) => {
        const j = { ...(prev.journalByDay[key] || {}) };
        j.fasted = !j.fasted;
        j.updatedAt = nowDate().toISOString();
        const next = { ...prev.journalByDay };
        if (!j.fasted && !j.text) delete next[key];
        else next[key] = j;
        return { ...prev, journalByDay: next };
      });
      return;
    }
    // Duha and Tahajjud can't be ticked before their time starts (like prayers).
    if (k === 'duha' || k === 'tahajjud') {
      const dd = getDay(dateObj);
      const start = k === 'duha' ? addMinutes(dd.Sunrise, 15) : dd.Isha;
      const on = !(dataRef.current.completedSunnahByDay[key] || {})[k];
      if (on && nowDate() < start) { setToast(translate(dataRef.current.lang, 'You can tick it once it starts.')); return; }
    }
    // Morning & evening adhkar is the same tick as the Daily dhikr morning and evening rows.
    if (k === 'dhikr') {
      setData((prev) => {
        const on = !adhkarDone(prev, dateObj);
        const all = { ...(prev.dhikrByDay || {}) };
        const day = { ...(all[key] || {}) };
        ADHKAR_ROWS.forEach((d) => { day[d.id] = on ? dhikrTotal(d) : 0; });
        all[key] = day;
        return { ...prev, dhikrByDay: all, completedSunnahByDay: { ...prev.completedSunnahByDay, [key]: { ...(prev.completedSunnahByDay[key] || {}), dhikr: on } }, dirtyAt: Date.now() };
      });
      return;
    }
    setData((prev) => ({ ...prev, completedSunnahByDay: { ...prev.completedSunnahByDay, [key]: { ...(prev.completedSunnahByDay[key] || {}), [k]: !(prev.completedSunnahByDay[key] || {})[k] } } }));
  }, [getDay]);
  const isSunnahDone = (dateObj, k) => {
    if (k === 'roja') return !!(data.journalByDay[dateObj.toDateString()] || {}).fasted;
    if (k === 'dhikr') return adhkarDone(data, dateObj);
    return !!(data.completedSunnahByDay[dateObj.toDateString()] || {})[k];
  };
  const setStatus = useCallback((dateObj, name, status, extra) => {
    setData((prev) => ({ ...prev, ...statusPatch(prev, dateObj, name, status, extra) }));
    afterAnswer(dateObj, name, status);
  }, []);
  const setFasted = useCallback((dateObj, fasted) => {
    const key = dateObj.toDateString();
    setData((prev) => {
      const j = { ...(prev.journalByDay[key] || {}) };
      j.fasted = fasted;
      j.updatedAt = nowDate().toISOString();
      const next = { ...prev.journalByDay };
      if (!j.fasted && !j.text) delete next[key];
      else next[key] = j;
      return { ...prev, journalByDay: next };
    });
  }, []);

  // Preview a day: jump the whole app to a moment; Exit puts it back.
  const startPreview = useCallback((at) => {
    setClockOffset(at.getTime() - Date.now());
    setPreviewState({ at });
    setClock(nowDate());
  }, []);
  const stopPreview = useCallback(async () => {
    setClockOffset(0);
    // Anything tapped during the preview is thrown away.
    try {
      const raw = await AsyncStorage.getItem(PERSIST_KEY);
      if (raw) {
        applyingRemote.current = true;
        setData(migrate(JSON.parse(raw)));
      }
    } catch (e) {
      // keep what's in memory
    }
    setPreviewState(null);
    setClock(nowDate());
  }, []);

  const value = {
    data, update, hydrated, clock, setClock, toast, setToast,
    coords, locationName, gps, fetchGps, isAuto: !saved,
    today, todayKey, getDay, todayTimes, cal, hijri, rawMonthsReady: !!rawMonths, shiftMonth, hijriNow, afterMaghrib, daily, fastingToday,
    activeMakruh, theme, haptic, alertsStatus,
    togglePrayer, setPrayed, tickAll, isPrayed, toggleSunnah, isSunnahDone, setFasted, setStatus, setRakah, nightOn, nightBase, effectiveMode,
    prayerDay, nightDay, preview, startPreview, stopPreview, syncNow,
    arabicScale: ARABIC_SCALES[data.arabicSize] || 1,
    textScale: TEXT_SCALES[data.textSize ?? 1] || 1,
    awayKm, travelling, pendingOpen, setPendingOpen,
    t: (k, v) => translate(data.lang, k, v),
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export { addDays };
