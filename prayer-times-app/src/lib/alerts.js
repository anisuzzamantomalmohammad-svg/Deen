// Local notifications: prayer alerts, "Fajr in 10 minutes" reminders,
// Seheri/Iftar, Sunnah-fast heads-ups, Friday reminders and the monthly
// moon-sighting check. Everything is planned by one pure function from the
// saved settings, so the app and the daily background task schedule exactly
// the same thing.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { computeDay, formatTime, addMinutes, PRAYER_NAMES, addDays } from './prayer';
import { hijriFor, nextMonthBoundary, HIJRI_MONTHS, HIJRI_MONTHS_BN } from './hijri';
import { translate } from '../i18n';

export const CHANNEL_PRAYER = 'prayer-alerts';
export const CHANNEL_REMINDER = 'deen-reminders';
export const MOON_CATEGORY = 'moon-check';
export const DAYS_AHEAD = 7;
const OUR_KINDS = ['prayer', 'pre', 'fasting', 'friday', 'moon'];

// What kind of fast (if any) a day is.
export function fastingDayInfo(dateObj, cal) {
  const h = hijriFor(dateObj, cal);
  if ((h.monthIndex === 9 && h.day === 1) || (h.monthIndex === 11 && h.day >= 10 && h.day <= 13)) return null;
  if (h.monthIndex === 8) return { type: 'ramadan', reason: 'ramadan', day: h.day };
  if (h.monthIndex === 11 && h.day === 9) return { type: 'sunnah', reason: 'arafah' };
  if (h.monthIndex === 0 && h.day === 10) return { type: 'sunnah', reason: 'ashura' };
  if (h.monthIndex === 0 && h.day === 9) return { type: 'sunnah', reason: 'tasua' };
  if (h.day >= 13 && h.day <= 15) return { type: 'sunnah', reason: 'white' };
  const wd = dateObj.getDay();
  if (wd === 1) return { type: 'sunnah', reason: 'monday' };
  if (wd === 4) return { type: 'sunnah', reason: 'thursday' };
  return null;
}

export function planAlerts(s, today, cal, nowMs = Date.now()) {
  const lang = s.lang || 'en';
  const T = (k, v) => translate(lang, k, v);
  const tz = s.coords.timezone;
  const plan = [];
  const pName = (n) => T(n);
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    const times = computeDay(s.coords, s.calcMethod, s.asrMethod, day);
    const fast = s.fastingAlerts ? fastingDayInfo(day, cal) : null;
    const ramadan = fast && fast.type === 'ramadan';

    PRAYER_NAMES.forEach((name) => {
      const at = times[name];
      if (!at) return;
      if (s.notificationsEnabled && !(s.adhanOff || {})[name] && at.getTime() > nowMs) {
        const iftar = ramadan && name === 'Maghrib';
        plan.push({
          kind: 'prayer', date: at, channel: CHANNEL_PRAYER,
          title: iftar ? T('Iftar · {time}', { time: formatTime(at, tz) }) : `${pName(name)} · ${formatTime(at, tz)}`,
          body: iftar ? T("It's Maghrib. Time to break your fast.") : T("It's time for {name} prayer.", { name: pName(name) }),
        });
      }
      const mins = s.preReminderMins || 0;
      const pre = addMinutes(at, -mins);
      if (mins > 0 && s.notificationsEnabled && !(s.preOff || {})[name] && pre.getTime() > nowMs) {
        plan.push({
          kind: 'pre', date: pre, channel: CHANNEL_PRAYER,
          title: T('{name} in {n} minutes', { name: pName(name), n: mins }),
          body: T('{name} is at {time}. Time to get ready.', { name: pName(name), time: formatTime(at, tz) }),
        });
      }
    });

    if (s.fastingAlerts) {
      const seheriEnd = addMinutes(times.Fajr, -(s.safetyBuffer || 0));
      if (ramadan) {
        const warn = addMinutes(seheriEnd, -30);
        if (warn.getTime() > nowMs) {
          plan.push({ kind: 'fasting', date: warn, channel: CHANNEL_PRAYER, title: T('Seheri ends in 30 minutes'), body: T('Finish eating by {time}.', { time: formatTime(seheriEnd, tz) }) });
        }
        if (!s.notificationsEnabled && times.Maghrib.getTime() > nowMs) {
          plan.push({ kind: 'fasting', date: times.Maghrib, channel: CHANNEL_PRAYER, title: T('Iftar · {time}', { time: formatTime(times.Maghrib, tz) }), body: T('Time to break your fast.') });
        }
      } else if (fast) {
        const prev = computeDay(s.coords, s.calcMethod, s.asrMethod, addDays(day, -1));
        const headsUp = addMinutes(prev.Isha, 30);
        if (headsUp.getTime() > nowMs) {
          plan.push({
            kind: 'fasting', date: headsUp, channel: CHANNEL_REMINDER, title: T('Sunnah fast tomorrow'),
            body: T('Tomorrow is {what}. Seheri ends at {time}.', { what: T(`fast:${fast.reason}`), time: formatTime(seheriEnd, tz) }),
          });
        }
      }
    }

    if (day.getDay() === 5) {
      if (s.jumuahReminder > 0) {
        const at = addMinutes(times.Dhuhr, -s.jumuahReminder);
        if (at.getTime() > nowMs) {
          plan.push({ kind: 'friday', date: at, channel: CHANNEL_REMINDER, title: T("Jumu'ah today"), body: T("Jumu'ah prayer is at {time}. Remember Surah Al-Kahf before Maghrib.", { time: formatTime(times.Dhuhr, tz) }) });
        }
      }
      if (s.kahfReminder && s.kahfReminder !== 'off') {
        const at = s.kahfReminder === 'fajr' ? addMinutes(times.Sunrise, 20) : new Date(day.getFullYear(), day.getMonth(), day.getDate(), parseInt(s.kahfReminder, 10), 0);
        if (at.getTime() > nowMs) {
          plan.push({ kind: 'friday', date: at, channel: CHANNEL_REMINDER, title: T('Surah Al-Kahf'), body: T("It's Friday. Read Surah Al-Kahf today.") });
        }
      }
    }
  }

  // Moon-sighting check on the evening before the predicted new month.
  if (s.moonCheck !== false) {
    const b = nextMonthBoundary(today, cal);
    if (b) {
      const eve = computeDay(s.coords, s.calcMethod, s.asrMethod, b.evening);
      const at = addMinutes(eve.Maghrib, 20);
      if (at.getTime() > nowMs && at.getTime() - nowMs < DAYS_AHEAD * 86400000) {
        const month = lang === 'bn' ? HIJRI_MONTHS_BN[b.monthIndex] : HIJRI_MONTHS[b.monthIndex];
        const seen = b.prevLength === 29;
        plan.push({
          kind: 'moon', date: at, channel: CHANNEL_REMINDER, category: MOON_CATEGORY,
          data: { year: b.year, monthIndex: b.monthIndex },
          title: seen ? T('New moon expected tonight') : T('New moon unlikely tonight'),
          body: seen
            ? T('{month} likely starts tomorrow. If your masjid announces otherwise, tap below.', { month })
            : T('{month} likely starts the day after tomorrow. If the moon was sighted, tap below.', { month }),
        });
      }
    }
  }
  plan.sort((a, b) => a.date - b.date);
  return plan.slice(0, 120);
}

export async function ensureChannels(lang = 'en') {
  if (Platform.OS !== 'android') return;
  const T = (k) => translate(lang, k);
  await Notifications.setNotificationChannelAsync(CHANNEL_PRAYER, {
    name: T('Prayer times'), importance: Notifications.AndroidImportance.HIGH, sound: 'default', vibrationPattern: [0, 250, 150, 250],
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_REMINDER, {
    name: T('Reminders'), importance: Notifications.AndroidImportance.DEFAULT, sound: 'default',
  });
  await Notifications.setNotificationCategoryAsync(MOON_CATEGORY, [
    { identifier: 'later', buttonTitle: T('Starts a day later'), options: { opensAppToForeground: false } },
    { identifier: 'earlier', buttonTitle: T('Starts a day earlier'), options: { opensAppToForeground: false } },
  ]);
}

// Cancel what we scheduled before and schedule the new plan.
export async function scheduleAll(s, today, cal) {
  if (Platform.OS === 'web') return 'unsupported';
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((n) => OUR_KINDS.includes(n?.content?.data?.kind))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );
  const anyOn = s.notificationsEnabled || s.fastingAlerts || s.jumuahReminder > 0 || (s.kahfReminder && s.kahfReminder !== 'off') || s.moonCheck !== false;
  if (!anyOn) return 'off';
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') return 'denied';
  await ensureChannels(s.lang);
  const plan = planAlerts(s, today, cal);
  for (const item of plan) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title, body: item.body, sound: true,
        data: { kind: item.kind, ...(item.data || {}) },
        ...(item.category ? { categoryIdentifier: item.category } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date, channelId: item.channel },
    });
  }
  return 'scheduled';
}
