// Local notifications: prayer alerts, "Fajr in 10 minutes" reminders,
// Seheri/Iftar, Sunnah-fast heads-ups, Friday reminders and the monthly
// moon-sighting check. Everything is planned by one pure function from the
// saved settings, so the app and the daily background task schedule exactly
// the same thing.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { computeDay, formatTime, addMinutes, PRAYER_NAMES, addDays, dayKeyOf } from './prayer';
import { hijriFor, nextMonthBoundary, dayNumber, HIJRI_MONTHS, HIJRI_MONTHS_BN } from './hijri';
import { prayerWindow, nightOf } from './waqt';
import { eventsOnDay, eclipseOnDay } from './events';
import { isHijriBirthday } from './birthday';
import { eventTitle } from '../data/eventText';
import { DUAS } from '../data/duas';
import { duaText } from '../data/duaText';
import { translate, bnDigits } from '../i18n';

export const CHANNEL_PRAYER = 'prayer-alerts';
export const CHANNEL_REMINDER = 'deen-reminders';
export const MOON_CATEGORY = 'moon-check';
export const PRAYER_CATEGORY = 'prayer-done';
export const DAYS_AHEAD = 7;
const OUR_KINDS = ['prayer', 'pre', 'fasting', 'friday', 'moon', 'nudge', 'tahajjud', 'backup', 'dua', 'special', 'summary', 'test', 'report', 'zakat', 'snooze'];

// Alert groups the user can tune (sound per group). Each kind belongs to one.
export const ALERT_GROUPS = ['prayer', 'nudge', 'fasting', 'daily', 'friday', 'special'];
const KIND_GROUP = { prayer: 'prayer', pre: 'prayer', nudge: 'nudge', fasting: 'fasting', dua: 'daily', tahajjud: 'daily', backup: 'daily', summary: 'daily', report: 'daily', zakat: 'special', snooze: 'prayer', friday: 'friday', special: 'special', moon: 'special' };
export const SOUND_MODES = ['phone', 'vibrate', 'silent'];
export const groupOf = (item) => item.group || KIND_GROUP[item.kind] || 'special';
export const soundOf = (s, group) => ((s.notif || {})[group] || {}).sound || 'phone';
export const channelFor = (group, sound) => `deen-${group}-${sound}`;
// A different buzz for each prayer, so you can tell them apart without
// looking. Android only; a watch may use its own pattern.
export const PRAYER_BUZZ = {
  Fajr: [0, 700],
  Dhuhr: [0, 250, 150, 250],
  Asr: [0, 200, 120, 200, 120, 200],
  Maghrib: [0, 500, 200, 500],
  Isha: [0, 120, 90, 120, 90, 120, 90, 120],
};
const buzzChannel = (sound, name) => `${channelFor('prayer', sound)}-${name.toLowerCase()}`;
const hasTracking = (s) => Object.keys(s.completedByDay || {}).length > 0 || Object.keys(s.qadaRecords || {}).length > 0;

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

const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
const MO_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MO_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_BN = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const ODD_NIGHTS = [21, 23, 25, 27, 29];
// Duas suited to a morning notification.
const MORNING_POOL = DUAS.filter((d) => ['Morning & Evening', 'Quranic Duas', 'Forgiveness', 'Knowledge & Guidance', 'Praise & Dhikr'].includes(d.category));
// A date as plain numbers, safe to pass through a notification and read back.
export const ymd = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export const fromYmd = (k) => {
  const [y, m, d] = String(k).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const atClock = (day, h, m = 0) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);

export function planAlerts(s, today, cal, nowMs = Date.now()) {
  const lang = s.lang || 'en';
  const T = (k, v) => translate(lang, k, v);
  const N = (x) => (lang === 'bn' ? bnDigits(x) : String(x));
  const tz = s.coords.timezone;
  const ft = (d) => N(formatTime(d, tz));
  const dShort = (d) => `${(lang === 'bn' ? WD_BN : WD_EN)[d.getDay()]} ${N(d.getDate())} ${(lang === 'bn' ? MO_BN : MO_EN)[d.getMonth()]}`;
  const hName = (i) => (lang === 'bn' ? HIJRI_MONTHS_BN[i] : HIJRI_MONTHS[i]);
  const hLabel = (h) => `${N(h.day)} ${hName(h.monthIndex)} ${N(h.year)}`;
  const hijriFn = (d) => hijriFor(d, cal);
  const plan = [];
  const add = (item) => {
    if (item.date && item.date.getTime() > nowMs) plan.push(item);
  };
  const pName = (n) => T(n);
  const ticked = (day, name) => !!((s.completedByDay || {})[dayKeyOf(day)] || {})[PRAYER_NAMES.indexOf(name) + 1];
  const day0 = computeDay(s.coords, s.calcMethod, s.asrMethod, addDays(today, -1));
  let prevTimes = day0;
  let times = computeDay(s.coords, s.calcMethod, s.asrMethod, today);

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    const nextTimes = computeDay(s.coords, s.calcMethod, s.asrMethod, addDays(day, 1));
    const h = hijriFn(day);
    const nextH = hijriFn(addDays(day, 1));
    const fast = s.fastingAlerts ? fastingDayInfo(day, cal) : null;
    const ramadan = h.monthIndex === 8;
    const dayKey = dayKeyOf(day);

    PRAYER_NAMES.forEach((name) => {
      const at = times[name];
      if (!at) return;
      if (s.notificationsEnabled && !(s.adhanOff || {})[name]) {
        const iftar = ramadan && name === 'Maghrib';
        const hijriLine = name === 'Fajr' && s.fajrHijri !== false ? `\n${(lang === 'bn' ? DAYS_BN : DAYS_EN)[day.getDay()]} · ${hLabel(h)}` : '';
        add({
          kind: 'prayer', date: at, channel: CHANNEL_PRAYER, category: PRAYER_CATEGORY, data: { name, day: ymd(day) },
          title: iftar ? T('Iftar · {time}', { time: ft(at) }) : `${pName(name)} · ${ft(at)}`,
          body: (iftar ? T("It's Maghrib. Time to break your fast.") : T("It's time for {name} prayer.", { name: pName(name) })) + hijriLine,
        });
      }
      const mins = s.preReminderMins || 0;
      if (mins > 0 && s.notificationsEnabled && !(s.preOff || {})[name]) {
        add({
          kind: 'pre', date: addMinutes(at, -mins), channel: CHANNEL_PRAYER,
          title: T('{name} in {n} minutes', { name: pName(name), n: mins }),
          body: T('{name} is at {time}. Time to get ready.', { name: pName(name), time: ft(at) }),
        });
      }
      // "Did you pray?" a little before the time (or its best part) runs out.
      if ((s.nudgeOn || {})[name] && !ticked(day, name)) {
        const w = prayerWindow(name, times, nextTimes);
        const deadline = w.best ? w.best.at : w.end;
        const when = addMinutes(deadline, -(s.nudgeLead || 30));
        if (when > w.start) {
          add({
            kind: 'nudge', date: when, channel: CHANNEL_REMINDER, category: PRAYER_CATEGORY, data: { name, day: ymd(day) },
            title: T('Did you pray {name}?', { name: pName(name) }),
            body: w.best
              ? T("{name}'s best time ends at {time}.", { name: pName(name), time: ft(deadline) })
              : T('{name} time ends at {time}.', { name: pName(name), time: ft(deadline) }),
          });
        }
      }
    });

    if (s.fastingAlerts && ramadan) {
      const seheriEnd = addMinutes(times.Fajr, -(s.safetyBuffer || 0));
      add({ kind: 'fasting', date: addMinutes(seheriEnd, -30), channel: CHANNEL_PRAYER, title: T('Seheri ends in 30 minutes'), body: T('Finish eating by {time}.', { time: ft(seheriEnd) }) });
      if (!s.notificationsEnabled) {
        add({ kind: 'fasting', date: times.Maghrib, channel: CHANNEL_PRAYER, title: T('Iftar · {time}', { time: ft(times.Maghrib) }), body: T('Time to break your fast.') });
      }
    }

    // Days the user asked to be reminded to fast (from the day sheet).
    const planned = (s.fastPlans || {})[dayKey];
    const seheriEnd = addMinutes(times.Fajr, -(s.safetyBuffer || 0));
    if (planned && !ramadan) {
      add({ kind: 'fasting', date: addMinutes(prevTimes.Isha, 30), channel: CHANNEL_REMINDER, title: T("You're fasting tomorrow"), body: T('Seheri ends at {time}. Set your alarm.', { time: ft(seheriEnd) }) });
      add({ kind: 'fasting', date: addMinutes(seheriEnd, -30), channel: CHANNEL_PRAYER, title: T('Seheri ends in 30 minutes'), body: T('Finish eating by {time}.', { time: ft(seheriEnd) }) });
    }
    if (s.fastingAlerts && !ramadan && fast && !planned) {
      add({
        kind: 'fasting', date: addMinutes(prevTimes.Isha, 30), channel: CHANNEL_REMINDER, title: T('Sunnah fast tomorrow'),
        body: T('Tomorrow is {what}. Seheri ends at {time}.', { what: T(`fast:${fast.reason}`), time: ft(seheriEnd) }),
      });
    }

    // Ramadan nights: Taraweeh, and the odd nights of the last ten.
    if (nextH.monthIndex === 8) {
      if (s.taraweehReminder !== false) {
        add({ kind: 'special', group: 'fasting', date: addMinutes(times.Isha, 30), channel: CHANNEL_REMINDER, title: T('Taraweeh tonight'), body: T('Ramadan night {n}.', { n: nextH.day }) });
      }
      if (s.qadrNights !== false && ODD_NIGHTS.includes(nextH.day)) {
        add({ kind: 'special', date: addMinutes(times.Isha, 15), channel: CHANNEL_REMINDER, title: T('Laylat al-Qadr may be tonight'), body: T('Night {n} of Ramadan, one of the odd nights. Spend it in prayer, Quran and dua.', { n: nextH.day }) });
      }
    }

    // End-of-day summary, a while after Isha. Today's uses what's ticked so
    // far (the plan is rebuilt whenever a prayer is ticked); later days get a
    // general prompt.
    if (s.daySummary !== false) {
      const at = addMinutes(times.Isha, s.daySummaryAfter || 90);
      const n = PRAYER_NAMES.filter((name) => ticked(day, name)).length;
      const left = PRAYER_NAMES.filter((name) => !ticked(day, name)).map(pName);
      add({
        kind: 'summary', date: at, channel: CHANNEL_REMINDER, data: { day: ymd(day) },
        title: i === 0 && n === 5 ? T('All 5 prayers ticked today') : T("Today's prayers"),
        body: i === 0
          ? n === 5
            ? T('Well done. See you at Fajr ({time}).', { time: ft(nextTimes.Fajr) })
            : T('{n} of 5 ticked. Not ticked: {list}. Tap to update.', { n: N(n), list: left.join(', ') })
          : T('How did today go? Tap to tick your prayers.'),
      });
    }

    // Tahajjud: when the last third of tonight starts.
    if (s.tahajjudReminder) {
      const n = nightOf(times, nextTimes);
      add({ kind: 'tahajjud', date: n.lastThird, channel: CHANNEL_REMINDER, title: T('Tahajjud time'), body: T('The last third of the night has started. Fajr is at {time}.', { time: ft(nextTimes.Fajr) }) });
    }

    // Morning dua, a different one each day.
    if (s.morningDua && s.morningDua !== 'off') {
      const d = MORNING_POOL[dayNumber(day) % MORNING_POOL.length];
      const tx = duaText(d, lang);
      const body = tx.translation.length > 150 ? `${tx.translation.slice(0, 147).trim()}…` : tx.translation;
      add({ kind: 'dua', date: atClock(day, parseInt(s.morningDua, 10) || 7), channel: CHANNEL_REMINDER, data: { id: d.id }, title: T('Morning dua · {title}', { title: tx.title }), body });
    }

    // Hijri birthday.
    if (s.hijriBirthday && isHijriBirthday(s.hijriBirthday, day, hijriFn)) {
      const age = s.hijriBirthday.year ? h.year - s.hijriBirthday.year : null;
      add({
        kind: 'special', date: atClock(day, 8), channel: CHANNEL_REMINDER, data: { birthday: true },
        title: T('Your Hijri birthday'),
        body: age ? T('Today is {date}. You are {n} in Hijri years.', { date: hLabel(h), n: N(age) }) : T('Today is {date}.', { date: hLabel(h) }),
      });
    }

    // New Hijri month (Shawwal is covered by the Eid reminder).
    if (s.newMonthAlert !== false && h.day === 1 && h.monthIndex !== 9) {
      const a = addDays(day, 12);
      const b = addDays(day, 14);
      add({
        kind: 'special', date: atClock(day, 7), channel: CHANNEL_REMINDER,
        title: h.monthIndex === 8 ? T('Ramadan Mubarak') : T('Today is 1 {month}', { month: hName(h.monthIndex) }),
        body: T('A new Hijri month has started. White Days this month: {a} – {b}.', { a: dShort(a), b: dShort(b) }),
      });
    }

    // The day before important days.
    if (s.eventEve !== false) {
      const tm = addDays(day, 1);
      const evt = eventsOnDay(tm, nextH, hijriFn).find((e) => e.alert && e.id !== 'laylatul-qadr' && e.id !== 'dhulhijjah-start');
      if (evt) {
        const title = eventTitle(evt, lang);
        const night = evt.kind === 'night';
        add({
          kind: 'special', date: atClock(day, 9), channel: CHANNEL_REMINDER, data: { event: evt.id, day: ymd(tm) },
          title: night ? T('Tonight: {title}', { title }) : T('Tomorrow: {title}', { title }),
          body: night
            ? T('The night begins at Maghrib ({time}). Tap to read what to do.', { time: ft(times.Maghrib) })
            : T('Tap to read why it matters and what to do.'),
        });
      }
      // An eclipse that can be seen here: three hours before it starts.
      const ecl = s.showEclipses !== false ? eclipseOnDay(day, s.coords) : null;
      if (ecl) {
        const at = new Date(Math.max(ecl.start.getTime() - 3 * 3600000, atClock(day, 7).getTime()));
        add({
          kind: 'special', date: at, channel: CHANNEL_REMINDER, data: { event: 'eclipse', day: ymd(day) },
          title: ecl.type === 'solar' ? T('Solar eclipse today') : T('Lunar eclipse tonight'),
          body: T('Visible here from {a} to {b}. The eclipse prayer is prayed while it lasts.', { a: ft(ecl.start), b: ft(ecl.end) }),
        });
      }
    }

    // First 10 days of Dhul Hijjah: heads-up at Maghrib on the eve.
    if (s.dhulHijjah !== false && nextH.monthIndex === 11 && nextH.day === 1) {
      const arafah = addDays(day, 9);
      add({ kind: 'special', date: times.Maghrib, channel: CHANNEL_REMINDER, title: T('The first 10 days of Dhul Hijjah begin'), body: T('The best days of the year. The Arafah fast is on the 9th ({date}).', { date: dShort(arafah) }) });
    }

    // Eid morning.
    if (s.eidMorning !== false && ((h.monthIndex === 9 && h.day === 1) || (h.monthIndex === 11 && h.day === 10))) {
      const fitr = h.monthIndex === 9;
      add({
        kind: 'special', date: addMinutes(times.Fajr, 45), channel: CHANNEL_REMINDER, title: T('Eid Mubarak'),
        body: fitr
          ? T('Say the takbir on the way, eat something sweet before the prayer, and give Zakat al-Fitr before the Eid prayer.')
          : T('Say the takbir on the way, and hold off eating until after the prayer. The Qurbani is after the Eid prayer.'),
      });
    }

    // Month report on the 1st of each Hijri month; on 1 Muharram, the year in review.
    if (s.monthReport !== false && h.day === 1 && hasTracking(s)) {
      const prev = hijriFn(addDays(day, -1));
      add({
        kind: 'report', date: atClock(day, 10), channel: CHANNEL_REMINDER,
        data: h.monthIndex === 0 ? { review: prev.year } : { day: ymd(addDays(day, -1)) },
        title: h.monthIndex === 0 ? T('Your year {year} AH in review', { year: N(prev.year) }) : T('Your {month} report', { month: hName(prev.monthIndex) }),
        body: h.monthIndex === 0 ? T('See how your prayers went this past Hijri year.') : T('On time, qada and missed for last month. Tap to see it.'),
      });
    }

    // Zakat: once a year on the Hijri date the user picked.
    const zd = (s.charity || {}).zakatDay;
    if (s.zakatReminder !== false && zd && h.monthIndex === zd.m && h.day === Math.min(zd.d, 29)) {
      add({ kind: 'zakat', date: atClock(day, 9), channel: CHANNEL_REMINDER, data: { open: 'charity' }, title: T('Zakat is due today'), body: T('A Hijri year since your zakat date. Tap to work it out.') });
    }

    // Friday: Jumu'ah, Al-Kahf and the last hour before Maghrib.
    if (day.getDay() === 5) {
      if (s.jumuahReminder > 0) {
        add({ kind: 'friday', date: addMinutes(times.Dhuhr, -s.jumuahReminder), channel: CHANNEL_REMINDER, title: T("Jumu'ah today"), body: T("Jumu'ah prayer is at {time}. Remember Surah Al-Kahf before Maghrib.", { time: ft(times.Dhuhr) }) });
      }
      if (s.kahfReminder && s.kahfReminder !== 'off') {
        const at = s.kahfReminder === 'fajr' ? addMinutes(times.Sunrise, 20) : atClock(day, parseInt(s.kahfReminder, 10));
        add({ kind: 'friday', date: at, channel: CHANNEL_REMINDER, title: T('Surah Al-Kahf'), body: T("It's Friday. Read Surah Al-Kahf today.") });
      }
      if (s.fridayLastHour !== false) {
        add({ kind: 'friday', date: addMinutes(times.Maghrib, -60), channel: CHANNEL_REMINDER, title: T('The last hour of Friday'), body: T('An hour before Maghrib. A time when dua is accepted (Abu Dawud 1048).') });
      }
    }

    prevTimes = times;
    times = nextTimes;
  }

  // Monthly backup reminder, 30 days after the last backup.
  if (s.backupReminder !== false) {
    const base = s.lastBackupAt || s.firstOpenAt;
    if (base) {
      let at = new Date(new Date(base).getTime() + 30 * 86400000);
      at = atClock(at, 19);
      if (at.getTime() <= nowMs) {
        at = atClock(new Date(nowMs), 19);
        if (at.getTime() <= nowMs) at = atClock(addDays(new Date(nowMs), 1), 19);
      }
      if (at.getTime() - nowMs < DAYS_AHEAD * 86400000) {
        const days = Math.round((at - new Date(base)) / 86400000);
        add({
          kind: 'backup', date: at, channel: CHANNEL_REMINDER, title: T('Time for a backup'),
          body: s.lastBackupAt ? T('Your last backup was {n} days ago. Tap to save one.', { n: days }) : T("You haven't saved a backup yet. Tap to save one."),
        });
      }
    }
  }

  // Moon-sighting check on the evening before the predicted new month.
  if (s.moonCheck !== false) {
    const b = nextMonthBoundary(today, cal);
    if (b) {
      const eve = computeDay(s.coords, s.calcMethod, s.asrMethod, b.evening);
      const at = addMinutes(eve.Maghrib, 20);
      if (at.getTime() - nowMs < DAYS_AHEAD * 86400000) {
        const month = hName(b.monthIndex);
        const seen = b.prevLength === 29;
        add({
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
  return plan.slice(0, 160);
}

export async function ensureChannels(lang = 'en', s = {}) {
  if (Platform.OS !== 'android') return;
  const T = (k) => translate(lang, k);
  const NAMES = { prayer: 'Prayer times', nudge: '"Did you pray?"', fasting: 'Fasting', daily: 'Daily', friday: 'Friday', special: 'Special days' };
  const want = ALERT_GROUPS.map((g) => channelFor(g, soundOf(s, g)));
  const pSound = soundOf(s, 'prayer');
  if (s.vibratePerPrayer && pSound !== 'silent') {
    for (const name of PRAYER_NAMES) {
      want.push(buzzChannel(pSound, name));
      await Notifications.setNotificationChannelAsync(buzzChannel(pSound, name), {
        name: `${T('Prayer times')} · ${T(name)}`,
        importance: Notifications.AndroidImportance.HIGH,
        sound: pSound === 'phone' ? 'default' : null,
        enableVibrate: true,
        vibrationPattern: PRAYER_BUZZ[name],
      });
    }
  }
  for (const g of ALERT_GROUPS) {
    const sound = soundOf(s, g);
    const high = g === 'prayer' || g === 'fasting';
    await Notifications.setNotificationChannelAsync(channelFor(g, sound), {
      name: `${T(NAMES[g])}${sound === 'phone' ? '' : ` · ${T(sound === 'vibrate' ? 'Vibrate only' : 'Silent')}`}`,
      importance: sound === 'silent' ? Notifications.AndroidImportance.LOW : high ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.DEFAULT,
      sound: sound === 'phone' ? 'default' : null,
      enableVibrate: sound !== 'silent',
      vibrationPattern: sound === 'silent' ? null : [0, 250, 150, 250],
    });
  }
  // Remove channels from older versions or sounds no longer picked.
  try {
    const all = await Notifications.getNotificationChannelsAsync();
    for (const c of all || []) {
      const ours = c.id === CHANNEL_PRAYER || c.id === CHANNEL_REMINDER || c.id.startsWith('deen-');
      if (ours && !want.includes(c.id)) await Notifications.deleteNotificationChannelAsync(c.id);
    }
  } catch (e) {
    // not critical
  }
  await Notifications.setNotificationCategoryAsync(PRAYER_CATEGORY, [
    { identifier: 'prayed', buttonTitle: T('Prayed'), options: { opensAppToForeground: true } },
    { identifier: 'snooze', buttonTitle: T('Snooze 10 min'), options: { opensAppToForeground: false } },
  ]);
  await Notifications.setNotificationCategoryAsync(MOON_CATEGORY, [
    { identifier: 'later', buttonTitle: T('Starts a day later'), options: { opensAppToForeground: false } },
    { identifier: 'earlier', buttonTitle: T('Starts a day earlier'), options: { opensAppToForeground: false } },
  ]);
}

// A test alert for one group, a few seconds from now, with its sound.
export async function sendTest(s, group, title, body) {
  if (Platform.OS === 'web') return 'unsupported';
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') return 'denied';
  await ensureChannels(s.lang, s);
  const sound = soundOf(s, group);
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: sound === 'phone', data: { kind: 'test' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: channelFor(group, sound) },
  });
  return 'sent';
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
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') return 'denied';
  await ensureChannels(s.lang, s);
  const plan = planAlerts(s, today, cal);
  for (const item of plan) {
    const group = groupOf(item);
    const sound = soundOf(s, group);
    const channelId = item.kind === 'prayer' && s.vibratePerPrayer && sound !== 'silent' ? buzzChannel(sound, item.data.name) : channelFor(group, sound);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title, body: item.body, sound: sound === 'phone',
        data: { kind: item.kind, ...(item.data || {}) },
        ...(item.category ? { categoryIdentifier: item.category } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date, channelId },
    });
  }
  return 'scheduled';
}

// "Snooze 10 min": the same alert again in 10 minutes.
let lastSnoozed = '';
export async function snoozeAlert(content, s = {}) {
  if (Platform.OS === 'web' || !content) return;
  // The button can be reported twice (background task and app); snooze once.
  const key = `${content.title}|${Math.floor(Date.now() / 60000)}`;
  if (key === lastSnoozed) return;
  lastSnoozed = key;
  const sound = soundOf(s, 'prayer');
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title, body: content.body, sound: sound === 'phone',
      data: { ...(content.data || {}), kind: 'snooze', snoozed: true },
      categoryIdentifier: PRAYER_CATEGORY,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 600, channelId: channelFor('prayer', sound) },
  });
}

// Keep at most `max` Deen alerts in the notification list: the newest stay,
// older ones are cleared. Runs when the app opens, when an alert arrives
// while it's open, and in the background top-up.
export async function trimPresented(max = 2) {
  if (Platform.OS === 'web') return 0;
  try {
    const shown = await Notifications.getPresentedNotificationsAsync();
    const ours = (shown || [])
      .filter((n) => OUR_KINDS.includes(n?.request?.content?.data?.kind))
      .sort((a, b) => (b.date || 0) - (a.date || 0));
    const old = ours.slice(max);
    await Promise.all(old.map((n) => Notifications.dismissNotificationAsync(n.request.identifier).catch(() => {})));
    return old.length;
  } catch (e) {
    return 0;
  }
}
