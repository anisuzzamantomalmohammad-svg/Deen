import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import {
  DEFAULT_COORDS, PRAYER_NAMES, computeDay, makruhWindows, resolveTimezone, zonedParts, addDays,
} from '../lib/prayer';
import { computeVisibilityMonths, finaliseMonths, hijriFor } from '../lib/hijri';
import { scheduleAll, fromYmd } from '../lib/alerts';
import { resolveTheme } from '../theme/palettes';
import { translate } from '../i18n';

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
  nudgeOn: { Fajr: true, Isha: true },
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
};
export const ARABIC_SCALES = [0.85, 1, 1.15, 1.32];
export const TEXT_SCALES = [0.9, 1, 1.12, 1.25];
// Travelling (safar) in the Hanafi school: about 48 miles / 77 km from home.
export const SAFAR_KM = 77;

// Turn whatever was saved (any version, or an imported backup) into the
// current shape. Unknown keys are dropped, missing ones get defaults.
export function migrate(saved) {
  const out = { ...DEFAULTS };
  if (!saved || typeof saved !== 'object') return out;
  Object.keys(DEFAULTS).forEach((k) => {
    if (saved[k] !== undefined && saved[k] !== null) out[k] = saved[k];
  });
  if (saved.themeMode === 'system') out.themeMode = 'auto';
  if (saved.themeMode && !['auto', 'light', 'dark'].includes(out.themeMode)) out.themeMode = 'auto';
  if (saved.onboarded === undefined && (saved.completedByDay || saved.calcMethod)) out.onboarded = true; // existing user
  if (out.asrMethod !== 'Hanafi') out.asrMethod = 'Standard';
  out.qadaCounts = { ...DEFAULTS.qadaCounts, ...(out.qadaCounts || {}) };
  out.tasbih = { ...DEFAULTS.tasbih, ...(out.tasbih || {}) };
  return out;
}

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

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
  const [clock, setClock] = useState(() => new Date());
  const [toast, setToast] = useState(null);
  const [gps, setGps] = useState({ loading: true, coords: null, name: null, error: null });
  const [rawMonths, setRawMonths] = useState(null);
  const [alertsStatus, setAlertsStatus] = useState(null);
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
        if (!loaded.firstOpenAt) loaded.firstOpenAt = new Date().toISOString();
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
    if (!hydrated) return undefined;
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
    const id = setInterval(() => setClock(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

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
        setClock(new Date());
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

  /* ---------------- today & times ---------------- */
  const zp = zonedParts(clock, coords.timezone);
  const todayKey = `${zp.y}-${zp.m}-${zp.d}`;
  const today = useMemo(() => new Date(zp.y, zp.m - 1, zp.d), [todayKey]);
  const settingsKey = `${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)},${data.calcMethod},${data.asrMethod}`;
  const dayCache = useRef({ key: '', map: new Map() });
  const getDay = useCallback((dateObj) => {
    if (dayCache.current.key !== settingsKey) dayCache.current = { key: settingsKey, map: new Map() };
    const k = dateObj.toDateString();
    let v = dayCache.current.map.get(k);
    if (!v) {
      v = computeDay(coords, data.calcMethod, data.asrMethod, dateObj);
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
  const activeMakruh = useMemo(() => {
    const w = makruhWindows(todayTimes).find((x) => clock >= x.start && clock < x.end);
    return w || null;
  }, [todayTimes, clock]);
  const theme = useMemo(
    () => resolveTheme({ mode: data.themeMode, darkId: data.darkPalette, lightId: data.lightPalette, systemScheme, prohibited: !!activeMakruh }),
    [data.themeMode, data.darkPalette, data.lightPalette, systemScheme, !!activeMakruh]
  );

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
    hydrated, data.onboarded, todayKey, coords.latitude.toFixed(2), coords.longitude.toFixed(2), coords.timezone, data.calcMethod, data.asrMethod, data.safetyBuffer,
    data.notificationsEnabled, data.fastingAlerts, data.preReminderMins, JSON.stringify(data.preOff), JSON.stringify(data.adhanOff), JSON.stringify(data.fastPlans),
    data.jumuahReminder, data.kahfReminder, data.moonCheck, data.lang, cal.mode, cal.offset, JSON.stringify(data.hijriOverrides), rawMonths?.key,
    JSON.stringify(data.nudgeOn), data.nudgeLead, data.fajrHijri, data.morningDua, data.tahajjudReminder, data.fridayLastHour, data.newMonthAlert,
    data.eventEve, data.qadrNights, data.dhulHijjah, data.eidMorning, data.taraweehReminder, data.backupReminder, data.lastBackupAt,
    JSON.stringify(data.completedByDay[today.toDateString()] || {}), data.daySummary, data.daySummaryAfter, JSON.stringify(data.notif), data.showEclipses, data.hijriBirthday && JSON.stringify(data.hijriBirthday),
  ].join('|');
  useEffect(() => {
    if (!hydrated || !data.onboarded) return undefined;
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
      if (action === 'prayed' && d.name && d.day) {
        setPrayed(fromYmd(d.day), d.name, true);
        setToast(translate(dataRef.current.lang, '{name} marked as prayed', { name: translate(dataRef.current.lang, d.name) }));
        return;
      }
      if (d.kind === 'dua' && d.id) setPendingOpen({ type: 'dua', id: d.id });
      else if (d.kind === 'special' && d.event) setPendingOpen({ type: 'event', id: d.event, day: d.day });
      else if (d.kind === 'backup') setPendingOpen({ type: 'backup' });
      else if (d.kind === 'summary' && d.day) setPendingOpen({ type: 'day', day: d.day });
      else if (d.kind === 'special' && d.birthday) setPendingOpen({ type: 'converter' });
    };
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    Notifications.getLastNotificationResponseAsync().then((r) => r && handle(r)).catch(() => {});
    return () => sub.remove();
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
  const togglePrayer = useCallback((dateObj, name) => {
    const id = PRAYER_NAMES.indexOf(name) + 1;
    const key = dateObj.toDateString();
    setData((prev) => {
      const rec = prev.completedByDay[key] || {};
      const on = !rec[id];
      return { ...prev, completedByDay: { ...prev.completedByDay, [key]: { ...rec, [id]: on } } };
    });
  }, []);
  const setPrayed = useCallback((dateObj, name, on) => {
    const id = PRAYER_NAMES.indexOf(name) + 1;
    const key = dateObj.toDateString();
    setData((prev) => {
      const rec = prev.completedByDay[key] || {};
      return { ...prev, completedByDay: { ...prev.completedByDay, [key]: { ...rec, [id]: on } } };
    });
  }, []);
  const tickAll = useCallback((dateObj) => {
    const key = dateObj.toDateString();
    setData((prev) => ({ ...prev, completedByDay: { ...prev.completedByDay, [key]: { ...(prev.completedByDay[key] || {}), 1: true, 2: true, 3: true, 4: true, 5: true } } }));
  }, []);
  const isPrayed = (dateObj, name) => !!data.completedByDay[dateObj.toDateString()]?.[PRAYER_NAMES.indexOf(name) + 1];
  const toggleSunnah = useCallback((dateObj, k) => {
    const key = dateObj.toDateString();
    setData((prev) => ({ ...prev, completedSunnahByDay: { ...prev.completedSunnahByDay, [key]: { ...(prev.completedSunnahByDay[key] || {}), [k]: !(prev.completedSunnahByDay[key] || {})[k] } } }));
  }, []);
  const setFasted = useCallback((dateObj, fasted) => {
    const key = dateObj.toDateString();
    setData((prev) => {
      const j = { ...(prev.journalByDay[key] || {}) };
      j.fasted = fasted;
      j.updatedAt = new Date().toISOString();
      const next = { ...prev.journalByDay };
      if (!j.fasted && !j.text && !j.mood) delete next[key];
      else next[key] = j;
      return { ...prev, journalByDay: next };
    });
  }, []);

  const value = {
    data, update, hydrated, clock, setClock, toast, setToast,
    coords, locationName, gps, fetchGps, isAuto: !saved,
    today, todayKey, getDay, todayTimes, cal, hijri, rawMonthsReady: !!rawMonths, shiftMonth,
    activeMakruh, theme, haptic, alertsStatus,
    togglePrayer, setPrayed, tickAll, isPrayed, toggleSunnah, setFasted,
    arabicScale: ARABIC_SCALES[data.arabicSize] || 1,
    textScale: TEXT_SCALES[data.textSize ?? 1] || 1,
    awayKm, travelling, pendingOpen, setPendingOpen,
    t: (k, v) => translate(data.lang, k, v),
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export { addDays };
