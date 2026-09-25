import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Switch,
  TextInput,
  Share,
  Image,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { WebView } from 'react-native-webview';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import tzlookup from 'tz-lookup';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Rect, G, Line, Path, Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
// All three icon sets ship inside the expo package itself (nothing new to
// install). Feather is the main line-icon set; MaterialCommunityIcons is
// used only for the five prayer-time weather glyphs, and Ionicons only for
// the filled/outline favourite star (Feather's star can't be filled).
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Foreground notification behaviour - without this, a local notification
// that fires while the app is open and focused is silently swallowed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Schedules a one-off local notification for a reminder's due date/time.
// Local notifications need no server and work in Expo Go - this is NOT
// the same thing as remote push, which Expo Go no longer supports.
async function scheduleReminderNotification(text, dueDateIso) {
  try {
    const current = await Notifications.getPermissionsAsync();
    let granted = current.status === 'granted';
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.status === 'granted';
    }
    if (!granted) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Reminder', body: text, sound: true },
      trigger: new Date(dueDateIso),
    });
  } catch (e) {
    return null;
  }
}

function cancelReminderNotification(notificationId) {
  if (!notificationId) return;
  Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
}

// Best-effort lat/lon -> IANA timezone lookup. tz-lookup throws for a few
// ocean/edge coordinates, so this always falls back to something usable
// instead of leaving prayer times displayed in the wrong zone.
function resolveTimezone(latitude, longitude) {
  try {
    return tzlookup(latitude, longitude);
  } catch (error) {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
    } catch (e2) {
      return DEFAULT_TIMEZONE;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Pure helpers (kept outside the component so they don't get        */
/*  recreated / re-bound on every render)                             */
/* ------------------------------------------------------------------ */

const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;
const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];
const DEFAULT_TIMEZONE = 'Pacific/Auckland';

// Great-circle bearing from (lat, lon) to the Kaaba.
function getQiblaBearing(lat, lon) {
  const kaabaLatRad = (KAABA_LAT * Math.PI) / 180;
  const kaabaLonRad = (KAABA_LON * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  const dLon = kaabaLonRad - lambda;
  const y = Math.sin(dLon);
  const x = Math.cos(phi) * Math.tan(kaabaLatRad) - Math.sin(phi) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Great-circle (haversine) distance to the Kaaba in km - shown on the
// Qibla screen next to the bearing.
function getDistanceToKaabaKm(lat, lon) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(KAABA_LAT - lat);
  const dLon = toRad(KAABA_LON - lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(KAABA_LAT)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingToCompassPoint(deg) {
  const idx = Math.round(deg / 22.5) % 16;
  return COMPASS_POINTS[idx];
}

// timeZone is explicit so displayed prayer times reflect the SELECTED
// location's local time, not whatever timezone the testing device/emulator
// happens to be set to (that mismatch is what caused Fajr to show as "9:11 PM").
function formatTime(dateObj, timeZone) {
  if (!dateObj) return '--:--';
  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone });
}

function addMinutes(dateObj, mins) {
  if (!dateObj) return null;
  return new Date(dateObj.getTime() + mins * 60000);
}

function hexToRgba(hex, alpha = 1) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCalculationParams(calcMethod, asrMethod) {
  let params = CalculationMethod.Karachi();
  if (calcMethod === 'MWL') {
    params = CalculationMethod.MuslimWorldLeague();
  } else if (calcMethod === 'ISNA') {
    params = CalculationMethod.NorthAmerica();
  }
  params.madhab = asrMethod === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

// Returns [Fajr, Dhuhr, Asr, Maghrib, Isha, { sunrise, rawSunrise }]
function computePrayerTimes(coords, calcMethod, asrMethod, targetDate) {
  const adhanCoords = new Coordinates(coords.latitude, coords.longitude);
  const params = getCalculationParams(calcMethod, asrMethod);
  const computed = new PrayerTimes(adhanCoords, targetDate, params);
  const tz = coords.timezone || DEFAULT_TIMEZONE;

  return [
    { id: 1, name: 'Fajr', time: formatTime(computed.fajr, tz), rawDate: computed.fajr },
    { id: 2, name: 'Dhuhr', time: formatTime(computed.dhuhr, tz), rawDate: computed.dhuhr },
    { id: 3, name: 'Asr', note: asrMethod, time: formatTime(computed.asr, tz), rawDate: computed.asr },
    { id: 4, name: 'Maghrib', time: formatTime(computed.maghrib, tz), rawDate: computed.maghrib },
    { id: 5, name: 'Isha', time: formatTime(computed.isha, tz), rawDate: computed.isha },
    { sunrise: formatTime(computed.sunrise, tz), rawSunrise: computed.sunrise },
  ];
}

// ---- Dates in the SELECTED location's timezone ------------------------
// "Today" (prayer check-offs, the calendar, prayer calculations) follows
// the chosen location, not whatever timezone the phone is set to.
const zonedDateFormatters = {};
function getZonedDateParts(date, timeZone) {
  try {
    if (!zonedDateFormatters[timeZone]) {
      zonedDateFormatters[timeZone] = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
    }
    const parts = zonedDateFormatters[timeZone].formatToParts(date);
    const get = (type) => parseInt((parts.find((p) => p.type === type) || {}).value, 10);
    const y = get('year');
    const m = get('month');
    const d = get('day');
    if (y && m && d) return { y, m, d };
  } catch (e) {
    // Unknown timezone or no Intl support - fall back to the phone's own date.
  }
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

// ---- Hijri dates (Umm al-Qura) ------------------------------------------
// 1) A built-in Umm al-Qura table (the official Saudi calendar most apps
//    use) covering 7 Jul 2024 - 4 May 2030: exact on every phone, no
//    engine support needed. 1 = a 30-day month, 0 = a 29-day month.
// 2) Outside that range: the phone's own Intl Umm al-Qura calendar, if the
//    JS engine supports it.
// 3) Last resort: the arithmetic ("tabular") Islamic calendar, usually
//    within a day of Umm al-Qura.
// The Hijri Date Offset setting then shifts it to match local moon sighting.
const UMALQURA_BASE_UTC = Date.UTC(2024, 6, 7); // 1 Muharram 1446
const UMALQURA_BASE_YEAR = 1446;
const UMALQURA_MONTHS = '011101100100101110101010010110110101001010110110101001010110111001001101';

function umalquraFromTable(utcMidnightMs) {
  let days = Math.round((utcMidnightMs - UMALQURA_BASE_UTC) / 86400000);
  if (days < 0) return null;
  for (let i = 0; i < UMALQURA_MONTHS.length; i++) {
    const len = UMALQURA_MONTHS[i] === '1' ? 30 : 29;
    if (days < len) {
      return { day: days + 1, monthIndex: i % 12, year: UMALQURA_BASE_YEAR + Math.floor(i / 12) };
    }
    days -= len;
  }
  return null;
}

let umalquraFormatter = null;
let umalquraChecked = false;
function getUmalquraFormatter() {
  if (umalquraChecked) return umalquraFormatter;
  umalquraChecked = true;
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    // Engines that ignore the calendar silently return Gregorian dates - a
    // 2026 date must come back as a 14xx AH year to be trusted.
    const parts = f.formatToParts(new Date(Date.UTC(2026, 0, 15, 12)));
    const year = parseInt((parts.find((p) => p.type === 'year') || {}).value, 10);
    if (year >= 1440 && year <= 1460) umalquraFormatter = f;
  } catch (e) {
    // calendar not supported
  }
  return umalquraFormatter;
}

function tabularHijri(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jd = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  return { day, month, year: 30 * n + j - 30 };
}

// dateObj: a Date whose local year/month/day is the calendar day wanted.
function getHijriDate(dateObj, offsetDays = 0) {
  const utc = Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + offsetDays);
  const fromTable = umalquraFromTable(utc);
  if (fromTable) return fromTable;
  const f = getUmalquraFormatter();
  if (f) {
    try {
      const parts = f.formatToParts(new Date(utc + 12 * 3600000));
      const get = (type) => parseInt((parts.find((p) => p.type === type) || {}).value, 10);
      const day = get('day');
      const month = get('month');
      const year = get('year');
      if (day && month && year) return { day, monthIndex: month - 1, year };
    } catch (e) {
      // fall through to the arithmetic calendar
    }
  }
  const g = new Date(utc);
  const t = tabularHijri(g.getUTCFullYear(), g.getUTCMonth() + 1, g.getUTCDate());
  return { day: t.day, monthIndex: t.month - 1, year: t.year };
}

// ---- Prayer & fasting alerts ---------------------------------------------
// Android needs a notification channel; iOS ignores it.
const ALERT_CHANNEL_ID = 'prayer-alerts';
// Rolling window of days scheduled ahead. iOS keeps at most 64 pending local
// notifications per app: 6 days x 5 prayers = 30, plus at most 12 fasting
// alerts, leaves room for reminders from the Tasks tab.
const ALERT_DAYS_AHEAD = 6;
const ALERT_KINDS = ['prayer', 'fasting'];

// Small interactive map (Leaflet + OpenStreetMap, no API key needed) shown
// inside a WebView for picking a saved location - works inside Expo Go,
// unlike native map modules which need a custom dev client.
function buildMapHtml(lat, lon, bg = '#0B1020') {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0;padding:0;background:${bg};}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: true }).setView([${lat}, ${lon}], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);
  var marker = L.marker([${lat}, ${lon}], { draggable: true }).addTo(map);
  function sendPosition(latlng) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: latlng.lat, longitude: latlng.lng }));
  }
  marker.on('dragend', function (e) { sendPosition(e.target.getLatLng()); });
  map.on('click', function (e) {
    marker.setLatLng(e.latlng);
    sendPosition(e.latlng);
  });
</script>
</body></html>`;
}

/* ------------------------------------------------------------------ */
/*  Islamic occasions, defined by their HIJRI date (monthIndex 0 =     */
/*  Muharram ... 8 = Ramadan ... 11 = Dhul-Hijjah). The Gregorian date */
/*  is worked out from the Umm al-Qura calendar every time, so the     */
/*  list never runs out - no yearly updates needed. Local moon         */
/*  sighting can still shift a date by a day (Hijri Date Offset).      */
/* ------------------------------------------------------------------ */

const WHITE_DAYS_EVENT = {
  id: 'white-days',
  title: 'Ayyam al-Beed (White Days)',
  hijriLabel: '13th, 14th, 15th of every lunar month',
  importance:
    'Fasting on the 13th, 14th, and 15th of every lunar month is a highly recommended Sunnah of Prophet Muhammad (ﷺ). The days are named "White Days" because the moon is at its fullest and brightest.',
  virtues: ['Fasting 3 days every month carries the spiritual reward of fasting an entire lifetime.'],
  actions: [
    'Make the intention (Niyyah) for voluntary fasting before Fajr.',
    'Fast on the 13th, 14th, and 15th of the Islamic month.',
  ],
};

const ISLAMIC_EVENTS = [
  {
    id: 'shab-e-meraj',
    title: 'Shab-e-Meraj (Isra & Mi’raj)',
    hijri: { monthIndex: 6, day: 27 },
    labelPrefix: 'Estimated',
    importance:
      'Commemorates the Prophet’s (ﷺ) night journey (Isra) from Makkah to Al-Aqsa Mosque in Jerusalem, and his ascension (Mi’raj) through the heavens, during which the five daily prayers were made obligatory.',
    virtues: [
      'The five daily prayers - a gift given directly on this night - are a means of constant closeness to Allah.',
      'A reminder of Allah’s power and the honour given to Prophet Muhammad (ﷺ).',
    ],
    actions: [
      'Reflect on the significance and blessing of the five daily prayers.',
      'Increase voluntary prayer, dua and dhikr this night.',
      'Learn and share the story of the journey with family.',
    ],
  },
  {
    id: 'shab-e-barat',
    title: 'Shab-e-Barat (Laylat al-Bara’ah)',
    hijri: { monthIndex: 7, day: 15 },
    labelPrefix: 'Estimated',
    labelSuffix: ' (night of the 14th–15th)',
    importance:
      'The Night of Forgiveness in the middle of Sha’ban, in the run-up to Ramadan. Widely observed - especially in South Asian tradition - as a night of mercy and forgiveness; scholars differ on the authenticity and weight of individual narrations about it, but voluntary worship on any night is always encouraged.',
    virtues: [
      'Hadith describe Allah’s special mercy and forgiveness being extended on this night to those who sincerely seek it.',
      'A spiritual checkpoint to prepare the heart before Ramadan begins.',
    ],
    actions: [
      'Spend part of the night in voluntary prayer (nafl) and dua.',
      'Seek forgiveness (Istighfar) sincerely for the past year.',
      'Many observe a voluntary fast on 15 Sha’ban.',
      'Renew your intention and prepare a plan for Ramadan, now less than 3 weeks away.',
    ],
  },
  {
    id: 'ramadan',
    title: 'Ramadan Begins',
    hijri: { monthIndex: 8, day: 1 },
    labelPrefix: 'Estimated',
    importance:
      'Ramadan is the ninth month of the Islamic calendar, when the Qur’an was first revealed. Fasting from dawn to sunset is obligatory for every able adult Muslim, one of the Five Pillars of Islam.',
    virtues: [
      'Fasting is a shield from sin and draws you closer to Allah.',
      'The gates of Paradise are opened and the gates of Hellfire are closed throughout the month.',
      'Every good deed is multiplied in reward.',
    ],
    actions: [
      'Fast from Fajr to Maghrib every day unless exempt.',
      'Increase Qur’an recitation – many aim to complete a full reading during the month.',
      'Give charity (Sadaqah) generously.',
      'Pray the extra night prayers (Taraweeh).',
    ],
  },
  {
    id: 'nuzul-quran',
    title: 'Nuzul al-Qur’an',
    hijri: { monthIndex: 8, day: 17 },
    importance:
      'Commemorates the beginning of the Qur’an’s revelation to Prophet Muhammad (ﷺ) in the Cave of Hira. Many scholars link the actual first revelation to Laylatul Qadr in the last ten nights, but 17 Ramadan is the date traditionally marked for public commemoration, especially across Southeast Asia.',
    virtues: [
      'The Qur’an is described as guidance for mankind and clear proofs of guidance, revealed in this blessed month.',
      'A reminder of the very beginning of Islam’s central miracle.',
    ],
    actions: [
      'Increase Qur’an recitation and reflect on its meaning (tadabbur).',
      'Attend or hold a Qur’an commemoration gathering if your community has one.',
      'Renew your intention to understand and apply the Qur’an, not just recite it.',
    ],
  },
  {
    id: 'jumuatul-wida',
    title: 'Jumu’atul Wida (Last Friday of Ramadan)',
    rule: 'lastFridayOfRamadan',
    importance:
      'The final Friday of Ramadan - widely observed, especially in South Asian tradition, as a specially blessed Jumu’ah that combines the merit of the best day of the week with the best month of the year.',
    virtues: ['Combines the reward of Friday - the best day of the week - with the reward of fasting in Ramadan.'],
    actions: [
      'Attend Jumu’ah prayer with extra devotion and arrive early.',
      'Increase dua, charity, and Qur’an recitation - the final days of Ramadan are slipping away.',
    ],
  },
  {
    id: 'laylatul-qadr',
    title: 'Laylatul Qadr (Night of Power)',
    hijri: { monthIndex: 8, day: 27 },
    labelPrefix: 'Commonly observed',
    importance:
      'The exact night is not certain but it falls within the odd nights of the last ten days of Ramadan – most commonly marked as the 27th. The Qur’an describes it as better than a thousand months.',
    virtues: [
      'Worship on this night outweighs worship over 1,000 months.',
      'The angels descend with peace and blessings until dawn.',
    ],
    actions: [
      'Increase night prayer (Qiyam al-Layl) through the last ten nights.',
      'Recite: "Allahumma innaka Afuwwun tuhibbul-afwa fa’fu anni" (O Allah, You are Forgiving and love forgiveness, so forgive me).',
      'Seek it especially on the odd nights – 21st, 23rd, 25th, 27th, 29th.',
    ],
  },
  {
    id: 'eid-fitr',
    title: 'Eid al-Fitr',
    hijri: { monthIndex: 9, day: 1 },
    labelPrefix: 'Estimated',
    importance:
      'Marks the end of Ramadan and the month of fasting – a day of celebration, gratitude, and community.',
    virtues: [
      'A reward for the month of fasting and worship.',
      'A day of forgiveness for believers who fasted with sincerity.',
    ],
    actions: [
      'Pay Zakat al-Fitr before the Eid prayer.',
      'Attend Salat al-Eid in congregation.',
      'Wear your best clothes; eat something before the prayer.',
      'Visit family and friends and exchange "Eid Mubarak" greetings.',
    ],
  },
  {
    id: 'arafah',
    title: 'Day of Arafah',
    hijri: { monthIndex: 11, day: 9 },
    labelPrefix: 'Estimated',
    importance:
      'The day pilgrims stand at Mount Arafah during Hajj – widely regarded as the most virtuous day of the year.',
    virtues: [
      'Fasting this day (for non-pilgrims) expiates the sins of the past year and the year to come.',
      'Allah frees more people from the Hellfire on this day than any other.',
    ],
    actions: [
      'Fast the day if you are not performing Hajj.',
      'Increase dua and dhikr, especially "La ilaha illallah wahdahu la sharika lah..."',
      'Reflect and seek forgiveness.',
    ],
  },
  {
    id: 'eid-adha',
    title: 'Eid al-Adha',
    hijri: { monthIndex: 11, day: 10 },
    labelPrefix: 'Estimated',
    importance:
      'The "Festival of Sacrifice", commemorating Prophet Ibrahim’s (AS) willingness to sacrifice his son in obedience to Allah. Marks the culmination of Hajj.',
    virtues: [
      'Commemorates ultimate submission and trust in Allah.',
      'A time of sacrifice (Qurbani), sharing, and gratitude.',
    ],
    actions: [
      'Attend Salat al-Eid.',
      'Perform Qurbani if able, and share the meat with family, neighbours, and those in need.',
      'Continue takbeer and celebration through the days of Tashreeq.',
    ],
  },
  {
    id: 'new-year',
    title: 'Islamic New Year',
    hijri: { monthIndex: 0, day: 1 },
    labelPrefix: 'Estimated',
    importance:
      'Marks the start of the Hijri year, commemorating the Prophet’s (ﷺ) migration (Hijrah) from Makkah to Madinah.',
    virtues: ['Muharram is one of the four sacred months in which extra good deeds are especially rewarded.'],
    actions: [
      'Reflect on the past year and renew your intentions.',
      'Increase in voluntary worship – Muharram is a recommended month for fasting.',
    ],
  },
  {
    id: 'ashura',
    title: 'Day of Ashura',
    hijri: { monthIndex: 0, day: 10 },
    labelPrefix: 'Estimated',
    importance:
      'Commemorates Allah saving Prophet Musa (AS) and the Israelites from Pharaoh. One of the most rewarded voluntary fasting days.',
    virtues: ['Fasting this day expiates the sins of the previous year.'],
    actions: ['Fast on the 9th and 10th, or 10th and 11th, of Muharram.', 'Increase charity and good deeds.'],
  },
  {
    id: 'mawlid-nabi',
    title: 'Mawlid un-Nabi (Eid Milad un-Nabi)',
    hijri: { monthIndex: 2, day: 12 },
    labelPrefix: 'Estimated',
    importance:
      'Commemorates the birth of Prophet Muhammad (ﷺ). Observed with great enthusiasm across many Muslim communities, including widely in South Asia - though scholars differ on it: some encourage marking it as a way to remember and honour his life, others consider it an innovation since the earliest generations did not observe it. Both views are common; how you mark it (or don’t) is a personal matter.',
    virtues: ['An occasion to reflect on the Prophet’s (ﷺ) character, mercy, and teachings.'],
    actions: [
      'Study or share the Seerah (biography) of the Prophet (ﷺ).',
      'Increase Salawat (sending blessings) upon him.',
      'Reflect on his character and strive to emulate it in daily life.',
    ],
  },
];

// "Estimated 27 Rajab 1448 AH" etc. for one occurrence of an occasion.
function islamicEventLabel(evt, h) {
  if (evt.rule === 'lastFridayOfRamadan') return `Last Friday of Ramadan ${h.year} AH`;
  const base = `${h.day} ${HIJRI_MONTHS[h.monthIndex]} ${h.year} AH`;
  return `${evt.labelPrefix ? `${evt.labelPrefix} ` : ''}${base}${evt.labelSuffix || ''}`;
}

const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabia al-Awwal', 'Rabia al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani',
  'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhul-Qa'dah", 'Dhul-Hijjah',
];
// Arabic script for the same 12 months, same order - verified against a
// reference source rather than guessed, for the home-screen Hijri date.
const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

/* ------------------------------------------------------------------ */
/*  DESIGN SYSTEM                                                      */
/*                                                                     */
/*  Palette - "Midnight & Gold". Draws on the three colours with the   */
/*  deepest roots in Islamic art: midnight blue (the heavens,          */
/*  contemplation), gold (illumination, nobility) and emerald green    */
/*  (paradise), used here only as the "done / fine" colour.            */
/*                                                                     */
/*  Dark mode follows the standard guidance: no pure black, a slightly */
/*  warm off-white instead of pure white text, desaturated accents,    */
/*  and lighter surfaces (not heavier shadows) for elevation. Every    */
/*  text colour below was checked for at least 4.5:1 contrast (WCAG    */
/*  AA) against the card surface it sits on, in both themes.           */
/* ------------------------------------------------------------------ */

const THEMES = {
  dark: {
    isLight: false,
    statusBar: 'light-content',
    bgGradient: ['#0B1020', '#0D1327', '#10172E'],
    surface: '#141B31',
    surfaceRaised: '#1A2340',
    sheet: '#141B31',
    segmentActive: '#2A3558',
    fill: 'rgba(255,255,255,0.06)',
    fillStrong: 'rgba(255,255,255,0.10)',
    border: 'rgba(255,255,255,0.07)',
    borderStrong: 'rgba(255,255,255,0.16)',
    separator: 'rgba(255,255,255,0.06)',
    text: '#F2EFE8',
    textSecondary: '#A6AEC4',
    textTertiary: '#858EA8',
    accent: '#D8B56E',
    accentFill: '#D2AE62',
    accentSoft: 'rgba(216,181,110,0.14)',
    accentBorder: 'rgba(216,181,110,0.38)',
    onAccent: '#17130A',
    success: '#43C793',
    successFill: '#43C793',
    successSoft: 'rgba(67,199,147,0.14)',
    onSuccess: '#0B1020',
    danger: '#F2766F',
    dangerSoft: 'rgba(242,118,111,0.13)',
    seheri: '#98A8F4',
    iftar: '#F0A76F',
    ringTrack: 'rgba(255,255,255,0.08)',
    ringFace: 'rgba(255,255,255,0.025)',
    navBg: 'rgba(20,27,49,0.88)',
    overlay: 'rgba(3,5,12,0.66)',
    switchTrackOff: '#2B3452',
    glowAlpha: 0.4,
    cardShadow: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
      elevation: 4,
    },
    prayer: { Fajr: '#98A8F4', Dhuhr: '#E7C46E', Asr: '#F0A76F', Maghrib: '#E58FAE', Isha: '#A99CF2' },
    priority: { low: '#43C793', medium: '#D8B56E', high: '#F2766F' },
    special: { event: '#A99CF2', whiteDays: '#D8B56E', sunnahFast: '#43C793', note: '#F2766F' },
  },
  light: {
    isLight: true,
    statusBar: 'dark-content',
    bgGradient: ['#F8F5EF', '#F4F0E8', '#F0EBE2'],
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    sheet: '#FBF9F5',
    segmentActive: '#FFFFFF',
    fill: 'rgba(19,26,46,0.05)',
    fillStrong: 'rgba(19,26,46,0.09)',
    border: 'rgba(19,26,46,0.08)',
    borderStrong: 'rgba(19,26,46,0.16)',
    separator: 'rgba(19,26,46,0.07)',
    text: '#131A2E',
    textSecondary: '#4F576D',
    textTertiary: '#646B82',
    accent: '#8C6419',
    accentFill: '#C9A24E',
    accentSoft: 'rgba(201,162,78,0.16)',
    accentBorder: 'rgba(160,120,40,0.35)',
    onAccent: '#17130A',
    success: '#0F7F56',
    successFill: '#1E9E6D',
    successSoft: 'rgba(15,127,86,0.10)',
    onSuccess: '#FFFFFF',
    danger: '#C23A32',
    dangerSoft: 'rgba(194,58,50,0.08)',
    seheri: '#4757C4',
    iftar: '#B25A1B',
    ringTrack: 'rgba(19,26,46,0.07)',
    ringFace: 'rgba(255,255,255,0.55)',
    navBg: 'rgba(255,255,255,0.90)',
    overlay: 'rgba(19,26,46,0.38)',
    switchTrackOff: '#D5D9E1',
    glowAlpha: 0.6,
    cardShadow: {
      shadowColor: '#1B2340',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 14,
      elevation: 2,
    },
    prayer: { Fajr: '#4757C4', Dhuhr: '#A87B12', Asr: '#B25A1B', Maghrib: '#B0476E', Isha: '#6552C2' },
    priority: { low: '#0F7F56', medium: '#A87B12', high: '#C23A32' },
    special: { event: '#7B61D9', whiteDays: '#C9A24E', sunnahFast: '#1E9E6D', note: '#D9534B' },
  },
};

// Type scale based on Apple's iOS text styles (Large Title 34 down to
// Caption 11, tab-bar labels never below 10). System font on purpose - SF
// Pro on iOS, Roboto on Android - no font files to download, and both are
// designed specifically for small screens.
const TYPE = {
  display: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.2 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  subhead: { fontSize: 14, lineHeight: 19, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  tab: { fontSize: 10, lineHeight: 12, fontWeight: '600' },
  arabic: { fontSize: 22, lineHeight: 40, fontWeight: '500', textAlign: 'right', writingDirection: 'rtl' },
};

// 4-point spacing grid and a small set of corner radii, used everywhere.
const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const RADIUS = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

// One soft "sky glow" per prayer period, washed in from the top of the
// screen. Keeps the day-cycle idea of the old photo backgrounds as a quiet
// tint instead of a busy image.
const PERIOD_GLOW = {
  lateNight: { dark: '#343C8C', light: '#C9CDEE' },
  fajr: { dark: '#6E5AA8', light: '#EDC6B8' },
  morning: { dark: '#2B6A96', light: '#C6DDEC' },
  midday: { dark: '#1F706E', light: '#CDE6DE' },
  afternoon: { dark: '#8E6232', light: '#F1D8B2' },
  maghrib: { dark: '#8F4468', light: '#EFC9D5' },
  isha: { dark: '#2F3A8A', light: '#CFD3EF' },
};

// Weather-style glyphs that follow the sun through the day.
const PRAYER_ICONS = {
  Fajr: 'weather-sunset-up',
  Dhuhr: 'white-balance-sunny',
  Asr: 'weather-partly-cloudy',
  Maghrib: 'weather-sunset-down',
  Isha: 'weather-night',
};

const ThemeContext = createContext(THEMES.dark);

// A few faint stars, only at night in dark mode.
function Stars({ count = 40 }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        top: `${Math.random() * 42}%`,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 1.6 + 0.8,
        opacity: Math.random() * 0.35 + 0.12,
      })),
    [count]
  );
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {stars.map((s) => (
        <View
          key={s.id}
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: '#FFFFFF',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

// The one card surface used everywhere. Solid (no blur) on purpose: with a
// clean background there is nothing behind a card worth blurring, and the
// native blur used to smear the text inside TextInputs.
function Card({ children, style, highlight }) {
  const t = useContext(ThemeContext);
  return (
    <View
      style={[
        { backgroundColor: t.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: highlight || t.border },
        t.cardShadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Round (or rounded-square) tinted icon badge.
function IconBadge({ name, color, size = 34, iconSize = 17, family = 'feather', shape = 'circle' }) {
  const Icon = family === 'mci' ? MaterialCommunityIcons : family === 'ion' ? Ionicons : Feather;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: shape === 'square' ? Math.round(size * 0.3) : size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hexToRgba(color, 0.14),
      }}
    >
      <Icon name={name} size={iconSize} color={color} />
    </View>
  );
}

// Round check-off control, shared by prayers, Sunnah items and reminders.
function CheckCircle({ checked, onPress, ringColor, size = 26 }) {
  const t = useContext(ThemeContext);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: checked ? 0 : 2,
        borderColor: ringColor || t.textTertiary,
        backgroundColor: checked ? t.successFill : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && <Feather name="check" size={Math.round(size * 0.58)} color={t.onSuccess} />}
    </TouchableOpacity>
  );
}

// Small uppercase section label with an optional action on the right.
function SectionTitle({ title, icon, action, onAction, style }) {
  const t = useContext(ThemeContext);
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACE.xxl + 4, marginBottom: SPACE.md - 2, paddingHorizontal: 4 },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        {icon ? <Feather name={icon} size={12} color={t.textSecondary} /> : null}
        <Text style={[TYPE.overline, { color: t.textSecondary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {action ? (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[TYPE.footnote, { color: t.accent, fontWeight: '600' }]}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Solid gold primary button.
function PrimaryButton({ label, icon, onPress, disabled, style }) {
  const t = useContext(ThemeContext);
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={[
        {
          backgroundColor: disabled ? t.fillStrong : t.accentFill,
          borderRadius: RADIUS.md,
          minHeight: 50,
          paddingHorizontal: SPACE.xl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={17} color={disabled ? t.textTertiary : t.onAccent} /> : null}
      <Text style={[TYPE.callout, { color: disabled ? t.textTertiary : t.onAccent, fontWeight: '700' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Selectable pill (due date, priority, mood).
function Chip({ label, icon, dotColor, active, onPress, color }) {
  const t = useContext(ThemeContext);
  const c = color || t.accent;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.pill,
        backgroundColor: active ? hexToRgba(c, t.isLight ? 0.12 : 0.16) : t.fill,
        borderWidth: 1,
        borderColor: active ? hexToRgba(c, 0.55) : 'transparent',
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {dotColor ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} /> : null}
      {icon ? <Feather name={icon} size={13} color={active ? c : t.textSecondary} /> : null}
      <Text style={[TYPE.footnote, { fontWeight: '600', color: active ? c : t.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// iOS-style segmented control (used for the theme picker).
function Segmented({ options, value, onChange }) {
  const t = useContext(ThemeContext);
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.fill, borderRadius: RADIUS.sm + 2, padding: 3 }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <TouchableOpacity
            key={o.id}
            onPress={() => onChange(o.id)}
            activeOpacity={0.8}
            style={[
              {
                flex: 1,
                paddingVertical: 8,
                borderRadius: RADIUS.sm,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
              },
              active && { backgroundColor: t.segmentActive },
              active && t.isLight && t.cardShadow,
            ]}
          >
            {o.icon ? <Feather name={o.icon} size={13} color={active ? t.text : t.textSecondary} /> : null}
            <Text style={[TYPE.footnote, { fontWeight: '600', color: active ? t.text : t.textSecondary }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// One row of a grouped settings list.
function SettingRow({ icon, iconColor, label, sublabel, value, valueColor, onPress, right, isFirst, showChevron = true }) {
  const t = useContext(ThemeContext);
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <View>
      {!isFirst && <View style={{ height: 1, backgroundColor: t.separator, marginLeft: icon ? 62 : 16 }} />}
      <Wrapper
        onPress={onPress}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingVertical: 10, paddingHorizontal: 14, gap: 14 }}
      >
        {icon ? <IconBadge name={icon} color={iconColor || t.accent} size={34} iconSize={16} shape="square" /> : null}
        <View style={{ flex: 1 }}>
          <Text style={[TYPE.callout, { color: t.text }]} numberOfLines={1}>
            {label}
          </Text>
          {sublabel ? (
            <Text style={[TYPE.caption, { color: t.textTertiary, marginTop: 2, fontWeight: '400' }]}>{sublabel}</Text>
          ) : null}
        </View>
        {value != null ? (
          <Text style={[TYPE.subhead, { color: valueColor || t.textSecondary, fontWeight: '500' }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {right}
        {onPress && !right && showChevron ? <Feather name="chevron-right" size={18} color={t.textTertiary} /> : null}
      </Wrapper>
    </View>
  );
}

// Bottom-sheet modal shell shared by the event, location and journal sheets.
function Sheet({ visible, onClose, title, subtitle, children, scroll = true }) {
  const t = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const bodyPadding = { paddingHorizontal: SPACE.xl, paddingTop: SPACE.sm, paddingBottom: 24 + insets.bottom };
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'flex-end' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{
            backgroundColor: t.sheet,
            borderTopLeftRadius: RADIUS.xl,
            borderTopRightRadius: RADIUS.xl,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: t.border,
            maxHeight: '88%',
          }}
        >
          <View style={{ alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: t.borderStrong, marginTop: 10 }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: SPACE.xl, paddingTop: 14, paddingBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.title2, { color: t.text }]}>{title}</Text>
              {subtitle ? (
                <Text style={[TYPE.footnote, { color: t.accent, fontWeight: '600', marginTop: 4 }]}>{subtitle}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="x" size={17} color={t.textSecondary} />
            </TouchableOpacity>
          </View>
          {scroll ? (
            <ScrollView contentContainerStyle={bodyPadding} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            <View style={bodyPadding}>{children}</View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// Real full-moon photograph (Pixabay Content License - free for commercial
// use, hotlinking allowed). A square shot where the moon fills nearly the
// whole frame; scaled up inside a circular crop so no dark margin shows.
const MOON_PHOTO_URI = 'https://cdn.pixabay.com/photo/2024/06/26/14/02/moon-8855057_1280.jpg';

// Home-screen centrepiece: a countdown ring to the next prayer. The moon
// now travels AROUND the ring as the progress knob (top = the previous
// prayer just began, full circle = the next one is due), instead of sitting
// behind the countdown text where it hurt legibility.
// Ring colour still carries meaning: emerald = fine to pray, coral = a
// Makruh (prohibited) window is active right now.
function MoonCountdownRing({ size = 268, progress = 0, strokeWidth = 12, isMakruh = false, trackColor, faceColor, cutoutColor, children }) {
  const knobR = 21;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - knobR - 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clamped);
  const angle = clamped * 2 * Math.PI - Math.PI / 2;
  const knobX = cx + radius * Math.cos(angle);
  const knobY = cy + radius * Math.sin(angle);
  const gradientId = isMakruh ? 'ringGradWarning' : 'ringGradOk';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgLinearGradient id="ringGradOk" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#7BE3B6" />
            <Stop offset="55%" stopColor="#43C793" />
            <Stop offset="100%" stopColor="#1E9E6D" />
          </SvgLinearGradient>
          <SvgLinearGradient id="ringGradWarning" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFB1A8" />
            <Stop offset="55%" stopColor="#F2766F" />
            <Stop offset="100%" stopColor="#D9453D" />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={radius - strokeWidth / 2 - 8} fill={faceColor || 'transparent'} />
        <Circle cx={cx} cy={cy} r={radius} stroke={trackColor || 'rgba(255,255,255,0.08)'} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>

      {/* The moon knob: a soft glow (un-clipped outer View, so its shadow
          isn't cut off) around a circular-cropped photo. The border in the
          page-background colour makes it read as sitting ON the ring. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: knobX - knobR,
          top: knobY - knobR,
          width: knobR * 2,
          height: knobR * 2,
          borderRadius: knobR,
          shadowColor: '#FFF1CF',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.55,
          shadowRadius: 12,
        }}
      >
        <View
          style={{
            width: knobR * 2,
            height: knobR * 2,
            borderRadius: knobR,
            overflow: 'hidden',
            backgroundColor: '#E7E2D6',
            borderWidth: 3,
            borderColor: cutoutColor || '#0B1020',
          }}
        >
          <Image
            source={{ uri: MOON_PHOTO_URI }}
            style={{ width: '100%', height: '100%', transform: [{ scale: 1.7 }] }}
            resizeMode="cover"
          />
        </View>
      </View>

      {children ? (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
        </View>
      ) : null}
    </View>
  );
}

// Compass dial drawn in SVG: 5-degree ticks, cardinal letters and a
// Kaaba marker at the Qibla bearing. The whole dial counter-rotates by the
// device heading; the gold index at the top is fixed and shows where the
// phone is pointing - line the Kaaba up under it to face the Qibla.
function QiblaDial({ size = 288, heading = 0, qiblaAngle = 0, aligned = false, children }) {
  const t = useContext(ThemeContext);
  const c = size / 2;
  const rim = c - 4;
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 5) {
    const major = deg % 30 === 0;
    const a = (deg * Math.PI) / 180;
    const r1 = rim - 6;
    const r2 = r1 - (major ? 12 : 6);
    ticks.push(
      <Line
        key={deg}
        x1={c + r1 * Math.sin(a)}
        y1={c - r1 * Math.cos(a)}
        x2={c + r2 * Math.sin(a)}
        y2={c - r2 * Math.cos(a)}
        stroke={major ? t.textSecondary : t.textTertiary}
        strokeOpacity={major ? 0.9 : 0.45}
        strokeWidth={major ? 2 : 1}
        strokeLinecap="round"
      />
    );
  }
  const labelR = rim - 56;
  const cardinals = [
    ['N', 0],
    ['E', 90],
    ['S', 180],
    ['W', 270],
  ];
  const qa = (qiblaAngle * Math.PI) / 180;
  const needleStart = 60;
  const kaabaR = rim - 30;
  const kx = c + kaabaR * Math.sin(qa);
  const ky = c - kaabaR * Math.cos(qa);
  const needleColor = aligned ? t.success : t.accent;

  return (
    <View style={{ width: size, height: size + 14, alignItems: 'center' }}>
      {/* fixed heading index */}
      <Svg width={20} height={14} viewBox="0 0 20 14" style={{ position: 'absolute', top: 0 }}>
        <Path d="M10 14 L2 2 Q10 5 18 2 Z" fill={needleColor} />
      </Svg>

      <View style={{ position: 'absolute', top: 14, width: size, height: size }}>
        {/* dial face */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { borderRadius: c, backgroundColor: t.surface, borderWidth: 1, borderColor: aligned ? hexToRgba(t.success, 0.6) : t.border },
            t.cardShadow,
          ]}
        />
        {/* rotating ring */}
        <View style={[StyleSheet.absoluteFillObject, { transform: [{ rotate: `${-heading}deg` }] }]}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {ticks}
            {cardinals.map(([label, deg]) => {
              const a = (deg * Math.PI) / 180;
              return (
                <SvgText
                  key={label}
                  x={c + labelR * Math.sin(a)}
                  y={c - labelR * Math.cos(a) + 6}
                  fontSize={label === 'N' ? 17 : 15}
                  fontWeight="700"
                  fontFamily={Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' : undefined}
                  fill={label === 'N' ? t.danger : t.textSecondary}
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              );
            })}
            <Line
              x1={c + needleStart * Math.sin(qa)}
              y1={c - needleStart * Math.cos(qa)}
              x2={c + (kaabaR - 17) * Math.sin(qa)}
              y2={c - (kaabaR - 17) * Math.cos(qa)}
              stroke={needleColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Kaaba: black cube with a gold band */}
            <G>
              <Circle cx={kx} cy={ky} r={15} fill={hexToRgba(needleColor, 0.2)} />
              <Rect x={kx - 9} y={ky - 9} width={18} height={18} rx={2.5} fill="#15171D" stroke={t.accentFill} strokeWidth={1} />
              <Rect x={kx - 9} y={ky - 4.5} width={18} height={3} fill={t.accentFill} />
            </G>
          </Svg>
        </View>
        {/* fixed centre readout */}
        {children ? (
          <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
            {children}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const PERSIST_KEY = '@prayerApp:v1';

// Flat Feather line icons for every tab (no emoji), so the nav reads as
// one consistent icon family.
const TABS = [
  { id: 'Prayers', iconName: 'clock', label: 'Prayers' },
  { id: 'Qibla', iconName: 'compass', label: 'Qibla' },
  { id: 'Hijri', iconName: 'calendar', label: 'Hijri' },
  { id: 'Agenda', iconName: 'list', label: 'Agenda' },
  { id: 'Duas', iconName: 'book-open', label: 'Duas' },
  { id: 'Tasks', iconName: 'check-square', label: 'Tasks' },
  { id: 'More', iconName: 'settings', label: 'Settings' },
];

// Priority colours now come from the active theme (t.priority[id]).
const REMINDER_PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

const DUE_DATE_OPTIONS = [
  { id: 'none', label: 'No date' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'week', label: 'Next week' },
];

// Quick-tap mood tags for the calendar journal - kept to a short, fixed
// list (not free-form tags) so the data stays small and the monthly
// summary can just count occurrences per id. Line icons instead of emoji.
const MOOD_OPTIONS = [
  { id: 'grateful', label: 'Grateful', icon: 'heart' },
  { id: 'productive', label: 'Productive', icon: 'zap' },
  { id: 'reflective', label: 'Reflective', icon: 'moon' },
  { id: 'challenging', label: 'Challenging', icon: 'cloud' },
];

const CALC_METHOD_LABELS = { Karachi: 'Karachi', MWL: 'Muslim World League', ISNA: 'ISNA (North America)' };

const THEME_OPTIONS = [
  { id: 'system', label: 'System', icon: 'smartphone' },
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
];

function computeReminderDueDate(option) {
  if (option === 'none') return null;
  const d = new Date();
  if (option === 'tomorrow') d.setDate(d.getDate() + 1);
  if (option === 'week') d.setDate(d.getDate() + 7);
  d.setHours(9, 0, 0, 0); // fixed default reminder time, 9 AM local
  if (d.getTime() <= Date.now()) {
    // "Today" picked after 9 AM has already passed - don't silently miss
    // the window, fire a couple hours out instead.
    d.setTime(Date.now() + 2 * 60 * 60 * 1000);
  }
  return d.toISOString();
}

function formatReminderDueDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  const isSameDay = (a, b) => a.toDateString() === b.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, tomorrow)) return 'Tomorrow';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function PrayerApp() {
  // Status bar / notch / navigation-bar sizes. Android apps now draw
  // edge-to-edge, so content has to be padded by these to stay visible.
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Prayers');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Dynamic Location & Time State
  const [locationName, setLocationName] = useState('Wellington, NZ');
  const [coords, setCoords] = useState({ latitude: -41.2865, longitude: 174.7762, timezone: DEFAULT_TIMEZONE });
  const [now, setNow] = useState(new Date());
  const [loadingLocation, setLoadingLocation] = useState(true);

  // Saved locations ("Home" / "Work" / "Uni" ...). 'auto' means "track
  // live GPS"; anything else is the id of an entry in savedLocations.
  const [savedLocations, setSavedLocations] = useState([]);
  const [activeLocationId, setActiveLocationId] = useState('auto');
  const [addLocationModalVisible, setAddLocationModalVisible] = useState(false);
  const [newLocationLabel, setNewLocationLabel] = useState('');
  const [pickedCoords, setPickedCoords] = useState(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  // Completed Prayers / Sunnah tracking, keyed by calendar day so it
  // resets automatically every day instead of staying checked forever.
  const [completedByDay, setCompletedByDay] = useState({});
  const [completedSunnahByDay, setCompletedSunnahByDay] = useState({});

  // Qada (missed-prayer) tracker - a running backlog count per prayer,
  // not reset daily like the trackers above, since qada is made up
  // whenever you get the chance, not necessarily the same day.
  const [qadaCounts, setQadaCounts] = useState({ Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 });

  // Calendar journal - one optional entry per calendar day (free text +
  // a mood tag + a fasted flag), keyed the same way as completedByDay so
  // the two can be cross-referenced by date. journalModalDate holds which
  // date's entry is currently open in the modal (null = closed); the
  // draft fields are local edit state, committed into journalByDay only
  // on Save so closing without saving doesn't half-write anything.
  const [journalByDay, setJournalByDay] = useState({});
  const [journalModalDate, setJournalModalDate] = useState(null);
  const [journalDraftText, setJournalDraftText] = useState('');
  const [journalDraftMood, setJournalDraftMood] = useState(null);
  const [journalDraftFasted, setJournalDraftFasted] = useState(false);

  // Backup & Restore (Settings tab) - Export uses the native Share sheet
  // (no extra dependency: Save to Files / AirDrop / Mail / Copy are all
  // offered by the OS itself). Import is paste-based for the same reason
  // - avoids pulling in a document-picker/file-system package just for
  // this. importText is the pasted JSON; importStatus is the small
  // inline confirmation/error message shown under the button.
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');

  // Advanced Settings State Management
  const [calcMethod, setCalcMethod] = useState('Karachi');
  const [asrMethod, setAsrMethod] = useState('Hanafi');
  const [safetyBuffer, setSafetyBuffer] = useState(5);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [fastingAlerts, setFastingAlerts] = useState(true);
  const [hijriOffset, setHijriOffset] = useState(0);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [themeMode, setThemeMode] = useState('dark'); // 'system' | 'light' | 'dark'

  // Device compass heading in degrees from TRUE north (see the Qibla effect
  // below). 0 until the first reading arrives.
  const [heading, setHeading] = useState(0);
  // null = not checked yet, true = readings arriving, false = no compass.
  const [compassAvailable, setCompassAvailable] = useState(null);
  // isTrue: heading is corrected to true north (needs location permission);
  // accuracy: OS calibration level, 3 = high ... 0 = none.
  const [headingInfo, setHeadingInfo] = useState({ isTrue: true, accuracy: 3 });

  // Follows the phone's own light/dark setting when theme = 'system'.
  const systemScheme = useColorScheme();

  // True once saved data has been read from storage. Nothing is saved (and
  // GPS isn't queried) before this, so the empty starting state can never
  // overwrite someone's real data on a slow launch.
  const [hydrated, setHydrated] = useState(false);
  // Bumped to force a fresh GPS reading when "Current GPS" is tapped again.
  const [gpsRefreshKey, setGpsRefreshKey] = useState(0);
  // Result of the last attempt to schedule prayer/fasting alerts:
  // null | 'scheduled' | 'denied' | 'unsupported' | 'error'
  const [alertsStatus, setAlertsStatus] = useState(null);

  // 1. Live Clock Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Automatic GPS Location Fetcher - only runs while "auto" is the
  // active location; a saved location sets coords directly instead.
  useEffect(() => {
    if (!hydrated || activeLocationId !== 'auto') return undefined;
    // Set when the active location changes mid-request, so a slow GPS answer
    // can't overwrite a saved location the user has since switched to.
    let cancelled = false;
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setLocationName('Wellington, NZ');
          setLoadingLocation(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        const { latitude, longitude } = location.coords;
        const newCoords = {
          latitude,
          longitude,
          // Derived from the real detected coordinates, not hardcoded -
          // this is what makes prayer times correct wherever you actually
          // are, not just in Wellington.
          timezone: resolveTimezone(latitude, longitude),
        };
        setCoords(newCoords);

        let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (cancelled) return;
        if (geocode && geocode.length > 0) {
          const city = geocode[0].city || geocode[0].region;
          const country = geocode[0].isoCountryCode || geocode[0].country;
          setLocationName(city && country ? `${city}, ${country}` : city || country || 'Current Location');
        } else {
          setLocationName('Current Location');
        }
      } catch (error) {
        if (!cancelled) setLocationName('Wellington, NZ');
      } finally {
        if (!cancelled) setLoadingLocation(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeLocationId, hydrated, gpsRefreshKey]);

  // 3. Compass heading while the Qibla tab is open. Uses the phone's own
  // compass service (expo-location), which reports TRUE north - corrected
  // for magnetic declination, about 20 degrees in New Zealand - once
  // location permission is granted. The Qibla bearing is measured from true
  // north, so this is what makes the two line up. (The old version read the
  // raw magnetometer, i.e. magnetic north, with a formula that also varies
  // between phones.) Without permission it falls back to magnetic north and
  // the screen says so.
  useEffect(() => {
    let subscription;
    let cancelled = false;
    let noReadingTimer;
    if (activeTab === 'Qibla' && Platform.OS === 'web') {
      // Browsers have no compass API here (expo-location only warns), and
      // removing its web heading subscription throws - so skip it on web.
      setCompassAvailable(false);
    } else if (activeTab === 'Qibla') {
      (async () => {
        try {
          let perm = await Location.getForegroundPermissionsAsync();
          if (perm.status !== 'granted' && perm.canAskAgain !== false) {
            perm = await Location.requestForegroundPermissionsAsync();
          }
          if (cancelled) return;
          let smoothed = null;
          let gotReading = false;
          const sub = await Location.watchHeadingAsync(({ trueHeading, magHeading, accuracy }) => {
            const isTrue = typeof trueHeading === 'number' && trueHeading >= 0;
            const raw = isTrue ? trueHeading : magHeading;
            if (typeof raw !== 'number' || raw < 0) return;
            if (!gotReading) {
              gotReading = true;
              setCompassAvailable(true);
            }
            // Low-pass filter along the shortest way round the circle, so
            // the dial doesn't jitter (and 359 -> 0 doesn't swing the long way).
            smoothed =
              smoothed === null ? raw : (smoothed + ((((raw - smoothed + 540) % 360) - 180) * 0.25) + 360) % 360;
            const rounded = Math.round(smoothed) % 360;
            setHeading((prev) => (prev === rounded ? prev : rounded));
            setHeadingInfo((prev) => (prev.isTrue === isTrue && prev.accuracy === accuracy ? prev : { isTrue, accuracy }));
          });
          if (cancelled) {
            try {
              sub.remove();
            } catch (e) {
              // already gone
            }
            return;
          }
          subscription = sub;
          // Some devices accept the subscription but have no compass at all.
          noReadingTimer = setTimeout(() => {
            if (!cancelled && !gotReading) setCompassAvailable(false);
          }, 4000);
        } catch (e) {
          // No compass service here (e.g. the web preview).
          if (!cancelled) setCompassAvailable(false);
        }
      })();
    }
    return () => {
      cancelled = true;
      clearTimeout(noReadingTimer);
      try {
        if (subscription) subscription.remove();
      } catch (e) {
        // never let a sensor clean-up error take the whole app down
      }
    };
  }, [activeTab]);

  // 4. Dynamic Astronomical Prayer Calculation Engine
  // Only recomputed when the day, location, or calculation settings
  // actually change - not on every 1-second clock tick.
  // "Today" is the calendar date AT THE SELECTED LOCATION, so check-offs
  // reset at that location's midnight even if the phone is set to another
  // timezone. Stored as a local-midnight Date with the same y/m/d, so saved
  // history keys (toDateString format) are unchanged.
  const zonedToday = getZonedDateParts(now, coords.timezone);
  const zonedTodayKey = `${zonedToday.y}-${zonedToday.m}-${zonedToday.d}`;
  const todayDateOnly = useMemo(
    () => new Date(zonedToday.y, zonedToday.m - 1, zonedToday.d),
    [zonedTodayKey]
  );
  const tomorrowDateOnly = useMemo(() => {
    const d = new Date(todayDateOnly);
    d.setDate(d.getDate() + 1);
    return d;
  }, [todayDateOnly]);
  // Only needed to anchor the countdown ring's progress (the window runs
  // from LAST night's Isha to Fajr, and before today's Fajr that "last
  // Isha" is yesterday's, not today's).
  const yesterdayDateOnly = useMemo(() => {
    const d = new Date(todayDateOnly);
    d.setDate(d.getDate() - 1);
    return d;
  }, [todayDateOnly]);

  const todayPrayers = useMemo(
    () => computePrayerTimes(coords, calcMethod, asrMethod, todayDateOnly),
    [todayDateOnly, coords.latitude, coords.longitude, coords.timezone, calcMethod, asrMethod]
  );
  const tomorrowPrayers = useMemo(
    () => computePrayerTimes(coords, calcMethod, asrMethod, tomorrowDateOnly),
    [tomorrowDateOnly, coords.latitude, coords.longitude, coords.timezone, calcMethod, asrMethod]
  );
  const yesterdayPrayers = useMemo(
    () => computePrayerTimes(coords, calcMethod, asrMethod, yesterdayDateOnly),
    [yesterdayDateOnly, coords.latitude, coords.longitude, coords.timezone, calcMethod, asrMethod]
  );

  const dynamicPrayers = todayPrayers;
  const maghribTimeStr = dynamicPrayers[3]?.time || '--:--';

  // End time (Wakt-out) for each obligatory prayer - the moment the next
  // prayer's window begins, so each row can show a start-end range.
  const prayerEndTimes = useMemo(() => {
    const tz = coords.timezone;
    const sunrise = todayPrayers[5]?.rawSunrise;
    const asrRaw = todayPrayers[2]?.rawDate;
    const maghribRaw = todayPrayers[3]?.rawDate;
    const ishaRaw = todayPrayers[4]?.rawDate;
    const fajrTomorrowRaw = tomorrowPrayers[0]?.rawDate;
    return {
      1: formatTime(sunrise, tz), // Fajr ends at sunrise
      2: formatTime(asrRaw, tz), // Dhuhr ends when Asr begins
      3: formatTime(maghribRaw, tz), // Asr ends at Maghrib
      4: formatTime(ishaRaw, tz), // Maghrib ends when Isha begins
      5: formatTime(fajrTomorrowRaw, tz), // Isha ends at tomorrow's Fajr
    };
  }, [todayPrayers, tomorrowPrayers, coords.timezone]);

  const dayKey = todayDateOnly.toDateString();
  const completedPrayers = completedByDay[dayKey] || {};
  const completedSunnah = completedSunnahByDay[dayKey] || {};

  // Real haptic feedback, gated by the setting, and wrapped in try/catch
  // since haptics aren't available in every preview environment (e.g. web).
  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (!hapticsEnabled) return;
    try {
      Haptics.impactAsync(style);
    } catch (error) {
      // no-op - haptics unsupported on this platform/preview
    }
  };

  const togglePrayer = (id) => {
    triggerHaptic();
    setCompletedByDay((prev) => ({
      ...prev,
      [dayKey]: { ...(prev[dayKey] || {}), [id]: !(prev[dayKey]?.[id]) },
    }));
  };

  const toggleSunnah = (key) => {
    triggerHaptic();
    setCompletedSunnahByDay((prev) => ({
      ...prev,
      [dayKey]: { ...(prev[dayKey] || {}), [key]: !(prev[dayKey]?.[key]) },
    }));
  };

  const adjustQada = (prayerName, delta) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setQadaCounts((prev) => ({ ...prev, [prayerName]: Math.max(0, (prev[prayerName] || 0) + delta) }));
  };

  const markAllPrayersDone = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setCompletedByDay((prev) => ({
      ...prev,
      [dayKey]: { 1: true, 2: true, 3: true, 4: true, 5: true },
    }));
  };

  // ---- Calendar journal (Hijri tab) ------------------------------------
  const openJournalForDate = (dateObj) => {
    triggerHaptic();
    const key = dateObj.toDateString();
    const existing = journalByDay[key];
    setJournalDraftText(existing?.text || '');
    setJournalDraftMood(existing?.mood || null);
    setJournalDraftFasted(!!existing?.fasted);
    setJournalModalDate(dateObj);
  };

  const saveJournalEntry = () => {
    if (!journalModalDate) return;
    triggerHaptic();
    const key = journalModalDate.toDateString();
    const text = journalDraftText.trim();
    const hasContent = text.length > 0 || journalDraftMood || journalDraftFasted;
    setJournalByDay((prev) => {
      const next = { ...prev };
      if (hasContent) {
        next[key] = { text, mood: journalDraftMood, fasted: journalDraftFasted, updatedAt: new Date().toISOString() };
      } else {
        delete next[key]; // saving an empty entry just clears whatever was there
      }
      return next;
    });
    setJournalModalDate(null);
  };

  const deleteJournalEntry = () => {
    if (!journalModalDate) return;
    triggerHaptic();
    const key = journalModalDate.toDateString();
    setJournalByDay((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setJournalModalDate(null);
  };

  // Prayer completion for whichever date is open in the journal modal -
  // reads the SAME completedByDay the Prayers tab writes to, so this is
  // always the real recorded state for that day, not a guess.
  const journalModalPrayerSummary = useMemo(() => {
    if (!journalModalDate) return { completed: 0, total: 5 };
    const rec = completedByDay[journalModalDate.toDateString()] || {};
    const completed = [1, 2, 3, 4, 5].filter((id) => rec[id]).length;
    return { completed, total: 5 };
  }, [journalModalDate, completedByDay]);

  const [favoriteDuaIds, setFavoriteDuaIds] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const toggleFavoriteDua = (id) => {
    triggerHaptic();
    setFavoriteDuaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // ---- Reminders / Tasks tab (Todoist-style) ---------------------------
  const [reminders, setReminders] = useState([]);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderPriority, setNewReminderPriority] = useState('medium');
  const [newReminderDueOption, setNewReminderDueOption] = useState('none');
  const [showCompletedReminders, setShowCompletedReminders] = useState(false);

  const addReminder = async () => {
    const text = newReminderText.trim();
    if (!text) return;
    triggerHaptic();
    const dueDate = computeReminderDueDate(newReminderDueOption);
    const id = `${Date.now()}`;
    // Add it to the list immediately - don't make the tap wait on the
    // permission prompt / notification scheduling round-trip.
    setReminders((prev) => [
      { id, text, completed: false, priority: newReminderPriority, dueDate, notificationId: null, createdAt: Date.now() },
      ...prev,
    ]);
    setNewReminderText('');
    setNewReminderPriority('medium');
    setNewReminderDueOption('none');
    if (dueDate) {
      const notificationId = await scheduleReminderNotification(text, dueDate);
      if (notificationId) {
        setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, notificationId } : r)));
      }
    }
  };

  const toggleReminder = (id) => {
    triggerHaptic();
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (!r.completed) cancelReminderNotification(r.notificationId); // completing it - no need to still buzz later
        return { ...r, completed: !r.completed };
      })
    );
  };

  const deleteReminder = (id) => {
    triggerHaptic();
    setReminders((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) cancelReminderNotification(target.notificationId);
      return prev.filter((r) => r.id !== id);
    });
  };

  const reminderGroups = useMemo(() => {
    const priorityRank = { high: 0, medium: 1, low: 2 };
    const active = reminders
      .filter((r) => !r.completed)
      .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.createdAt - a.createdAt);
    const done = reminders.filter((r) => r.completed).sort((a, b) => b.createdAt - a.createdAt);
    return { active, done };
  }, [reminders]);

  // ---- Local persistence -------------------------------------------
  // Loads a single JSON blob once on mount and re-saves it (debounced)
  // whenever any of the durable bits change. Deliberately NOT persisted:
  // activeTab, selectedEvent, `now`, in-progress form fields, map/GPS UI
  // state - all short-lived and fine to reset on a fresh launch.
  // Shared by the mount-time load below AND by "Import Data" in Settings -
  // one place that knows how to turn a saved JSON blob back into state, so
  // the two stay in sync instead of drifting apart.
  const applySavedState = (saved) => {
    if (saved.savedLocations) setSavedLocations(saved.savedLocations);
    if (saved.activeLocationId) {
      const savedLoc =
        saved.activeLocationId !== 'auto' &&
        (saved.savedLocations || []).find((l) => l.id === saved.activeLocationId);
      if (savedLoc) {
        // A saved location was active - restore its coordinates and name too,
        // not just its id (previously the app fell back to GPS/Wellington).
        setActiveLocationId(savedLoc.id);
        setCoords({ latitude: savedLoc.latitude, longitude: savedLoc.longitude, timezone: savedLoc.timezone || DEFAULT_TIMEZONE });
        setLocationName(savedLoc.label);
        setLoadingLocation(false);
      } else {
        setActiveLocationId('auto');
      }
    }
    if (saved.completedByDay) setCompletedByDay(saved.completedByDay);
    if (saved.completedSunnahByDay) setCompletedSunnahByDay(saved.completedSunnahByDay);
    if (saved.qadaCounts) setQadaCounts(saved.qadaCounts);
    if (saved.journalByDay) setJournalByDay(saved.journalByDay);
    if (saved.calcMethod) setCalcMethod(saved.calcMethod);
    if (saved.asrMethod) setAsrMethod(saved.asrMethod);
    if (typeof saved.safetyBuffer === 'number') setSafetyBuffer(saved.safetyBuffer);
    if (typeof saved.notificationsEnabled === 'boolean') setNotificationsEnabled(saved.notificationsEnabled);
    if (typeof saved.fastingAlerts === 'boolean') setFastingAlerts(saved.fastingAlerts);
    if (typeof saved.hijriOffset === 'number') setHijriOffset(saved.hijriOffset);
    if (typeof saved.hapticsEnabled === 'boolean') setHapticsEnabled(saved.hapticsEnabled);
    if (saved.themeMode) setThemeMode(saved.themeMode);
    if (saved.favoriteDuaIds) setFavoriteDuaIds(saved.favoriteDuaIds);
    if (saved.reminders) setReminders(saved.reminders);
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PERSIST_KEY);
        if (raw) applySavedState(JSON.parse(raw));
      } catch (e) {
        // Corrupt or unavailable storage - just start fresh, non-fatal.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const buildBackupPayload = () => ({
    savedLocations, activeLocationId, completedByDay, completedSunnahByDay, qadaCounts, journalByDay,
    calcMethod, asrMethod, safetyBuffer, notificationsEnabled, fastingAlerts, hijriOffset,
    hapticsEnabled, themeMode, favoriteDuaIds, reminders,
  });

  useEffect(() => {
    // Never write before the saved data has loaded - otherwise a slow read
    // lets the empty starting state overwrite everything that was saved.
    if (!hydrated) return undefined;
    const handle = setTimeout(() => {
      AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(buildBackupPayload())).catch(() => {});
    }, 400); // debounced so a burst of taps (marking several prayers done) is one write, not five
    return () => clearTimeout(handle);
  }, [
    hydrated,
    savedLocations, activeLocationId, completedByDay, completedSunnahByDay, qadaCounts, journalByDay,
    calcMethod, asrMethod, safetyBuffer, notificationsEnabled, fastingAlerts, hijriOffset,
    hapticsEnabled, themeMode, favoriteDuaIds, reminders,
  ]);

  // ---- Backup & Restore (Settings tab) --------------------------------
  // Real .json file export/import, without adding expo-file-system /
  // expo-sharing / expo-document-picker as dependencies - those packages
  // (or at least expo-file-system) don't resolve on Expo Snack's Web
  // preview target, which crashes the ENTIRE app at bundle time. On web,
  // a real .json file download/upload is just Blob/URL/<input type=file>
  // - plain browser globals, referenced only at runtime inside a
  // Platform.OS==='web' branch. Native keeps the Share-sheet text export
  // and, for import, the paste-JSON box.
  const exportData = async () => {
    triggerHaptic();
    const json = JSON.stringify(buildBackupPayload(), null, 2);
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prayer-app-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: json, title: 'Prayer App Backup' });
      }
    } catch (e) {
      setImportStatus('Could not export the backup.');
    }
  };

  // Pick an actual .json file (e.g. one saved by Export above) and
  // restore from it directly. Web-only (see note above) - on a phone,
  // use the paste-JSON box instead.
  const importDataFromFile = () => {
    triggerHaptic();
    if (Platform.OS !== 'web') {
      setImportStatus('On a phone, paste the backup JSON below instead.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          applySavedState(parsed);
          setImportStatus('Data imported from file.');
        } catch (err) {
          setImportStatus('That file didn\'t look like a valid backup.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const importData = () => {
    triggerHaptic();
    try {
      const parsed = JSON.parse(importText.trim());
      applySavedState(parsed);
      setImportText('');
      setImportStatus('Data imported.');
    } catch (e) {
      setImportStatus('That didn\'t look like a valid backup - check you pasted the whole thing.');
    }
  };

  // ---- Saved locations: select / add / remove -------------------------
  const selectAutoLocation = () => {
    setActiveLocationId('auto');
    setLoadingLocation(true);
    setGpsRefreshKey((k) => k + 1); // re-detect even if GPS was already active
  };

  const selectSavedLocation = (loc) => {
    setActiveLocationId(loc.id);
    setCoords({ latitude: loc.latitude, longitude: loc.longitude, timezone: loc.timezone || DEFAULT_TIMEZONE });
    setLocationName(loc.label);
  };

  const removeSavedLocation = (id) => {
    setSavedLocations((prev) => prev.filter((l) => l.id !== id));
    if (activeLocationId === id) selectAutoLocation();
  };

  const openAddLocationModal = () => {
    setNewLocationLabel('');
    setPickedCoords({ latitude: coords.latitude, longitude: coords.longitude });
    setMapKey((k) => k + 1);
    setAddLocationModalVisible(true);
  };

  const useDeviceGpsForNewLocation = async () => {
    try {
      setCapturingLocation(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCapturingLocation(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const next = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      setPickedCoords(next);
      setMapKey((k) => k + 1);
    } catch (error) {
      // ignore - user can still place the pin manually on the map
    } finally {
      setCapturingLocation(false);
    }
  };

  const saveNewLocation = () => {
    const label = newLocationLabel.trim();
    if (!label || !pickedCoords) return;
    const newLoc = {
      id: `loc-${Date.now()}`,
      label,
      latitude: pickedCoords.latitude,
      longitude: pickedCoords.longitude,
      // Wherever this pin was dropped on the map - not hardcoded to NZ -
      // so a saved location anywhere in the world shows correct times.
      timezone: resolveTimezone(pickedCoords.latitude, pickedCoords.longitude),
    };
    setSavedLocations((prev) => [...prev, newLoc]);
    setActiveLocationId(newLoc.id);
    setCoords({ latitude: newLoc.latitude, longitude: newLoc.longitude, timezone: newLoc.timezone });
    setLocationName(newLoc.label);
    setAddLocationModalVisible(false);
  };

  // Next prayer countdown - cheap date arithmetic, safe to run every second.
  const nextPrayerInfo = useMemo(() => {
    // Spans yesterday's Isha -> today's 5 -> tomorrow's Fajr so the
    // "previous" prayer is always known too (needed for the big
    // countdown ring's progress sweep - how far through the CURRENT
    // prayer's waiting window we are, not just time left).
    const combined = [
      yesterdayPrayers[4] && { name: yesterdayPrayers[4].name, rawDate: yesterdayPrayers[4].rawDate, time: yesterdayPrayers[4].time },
      ...todayPrayers.slice(0, 5).map((p) => ({ name: p.name, rawDate: p.rawDate, time: p.time })),
      tomorrowPrayers[0] && { name: 'Fajr', rawDate: tomorrowPrayers[0].rawDate, time: tomorrowPrayers[0].time },
    ].filter(Boolean).sort((a, b) => a.rawDate - b.rawDate);

    let upcomingIdx = combined.findIndex((p) => p.rawDate > now);
    if (upcomingIdx === -1) upcomingIdx = combined.length - 1;
    const upcoming = combined[upcomingIdx];
    const previous = upcomingIdx > 0 ? combined[upcomingIdx - 1] : null;

    const diffMs = Math.max(0, upcoming.rawDate - now);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const windowMs = previous ? upcoming.rawDate - previous.rawDate : 0;
    const progress = windowMs > 0 ? Math.max(0, Math.min(1, (now - previous.rawDate) / windowMs)) : 0;
    return {
      name: upcoming.name,
      time: upcoming.time,
      countdown: `${hours}h ${mins}m`,
      hms: `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
      progress,
    };
  }, [now, todayPrayers, tomorrowPrayers, yesterdayPrayers]);

  // Seheri (with rollover to tomorrow once today's window has passed)
  const seheriInfo = useMemo(() => {
    const fajrToday = todayPrayers[0]?.rawDate;
    if (!fajrToday) return { time: '--:--', rawDate: now, countdown: '--', hms: '--:--:--' };

    let seheriTarget = addMinutes(fajrToday, -safetyBuffer);
    if (seheriTarget <= now) {
      const fajrTomorrow = tomorrowPrayers[0]?.rawDate;
      if (fajrTomorrow) seheriTarget = addMinutes(fajrTomorrow, -safetyBuffer);
    }

    const diffMs = Math.max(0, seheriTarget - now);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return {
      time: formatTime(seheriTarget, coords.timezone),
      rawDate: seheriTarget,
      countdown: `${hours}h ${mins}m`,
      hms: `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
    };
  }, [now, todayPrayers, tomorrowPrayers, safetyBuffer, coords.timezone]);

  // Iftar (with rollover to tomorrow once today's Maghrib has passed)
  const iftarInfo = useMemo(() => {
    const maghribToday = todayPrayers[3]?.rawDate;
    if (!maghribToday) return { time: '--:--', rawDate: now, countdown: '--', hms: '--:--:--' };

    let targetTime = maghribToday;
    if (targetTime <= now) {
      const maghribTomorrow = tomorrowPrayers[3]?.rawDate;
      if (maghribTomorrow) targetTime = maghribTomorrow;
    }

    const diffMs = Math.max(0, targetTime - now);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return {
      time: formatTime(targetTime, coords.timezone),
      rawDate: targetTime,
      countdown: `${hours}h ${mins}m`,
      hms: `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
    };
  }, [now, todayPrayers, tomorrowPrayers, coords.timezone]);

  const nextFasting = useMemo(() => {
    if (seheriInfo.rawDate < iftarInfo.rawDate) {
      return { label: 'Seheri', time: seheriInfo.time, countdown: seheriInfo.countdown, hms: seheriInfo.hms };
    }
    return { label: 'Iftar', time: iftarInfo.time, countdown: iftarInfo.countdown, hms: iftarInfo.hms };
  }, [seheriInfo, iftarInfo]);

  // How far through the current Seheri/Iftar window we are, 0→1, driving
  // the fasting card's progress bar. Seheri's window runs from the most
  // recent Maghrib to the Seheri cutoff; before today's Fajr that "most
  // recent Maghrib" is yesterday's. Iftar's window runs from today's Fajr
  // to today's Maghrib.
  const fastingRingProgress = useMemo(() => {
    let windowStart, windowEnd;
    if (nextFasting.label === 'Seheri') {
      const todayMaghrib = todayPrayers[3]?.rawDate;
      const yesterdayMaghrib = yesterdayPrayers[3]?.rawDate;
      windowStart = todayMaghrib && now >= todayMaghrib ? todayMaghrib : yesterdayMaghrib;
      windowEnd = seheriInfo.rawDate;
    } else {
      windowStart = todayPrayers[0]?.rawDate;
      windowEnd = iftarInfo.rawDate;
    }
    if (!windowStart || !windowEnd || windowEnd <= windowStart) return 0;
    return Math.max(0, Math.min(1, (now - windowStart) / (windowEnd - windowStart)));
  }, [nextFasting, now, todayPrayers, yesterdayPrayers, seheriInfo, iftarInfo]);

  // Makruh (prohibited) windows - derived from the computed sunrise / Dhuhr
  // / Maghrib instead of hardcoded strings.
  const makruhWindows = useMemo(() => {
    const sunrise = todayPrayers[5]?.rawSunrise;
    const dhuhr = todayPrayers[1]?.rawDate;
    const maghrib = todayPrayers[3]?.rawDate;
    const tz = coords.timezone;
    return {
      sunrise: sunrise ? `${formatTime(sunrise, tz)} – ${formatTime(addMinutes(sunrise, 20), tz)}` : '--:-- – --:--',
      zawal: dhuhr ? `${formatTime(addMinutes(dhuhr, -10), tz)} – ${formatTime(dhuhr, tz)}` : '--:-- – --:--',
      sunset: maghrib ? `${formatTime(addMinutes(maghrib, -20), tz)} – ${formatTime(maghrib, tz)}` : '--:-- – --:--',
    };
  }, [todayPrayers, coords.timezone]);

  // Live Makruh status - is *right now* inside one of the three prohibited
  // windows? Drives the countdown ring's colour and the warning banner.
  const makruhStatus = useMemo(() => {
    const sunrise = todayPrayers[5]?.rawSunrise;
    const dhuhr = todayPrayers[1]?.rawDate;
    const maghrib = todayPrayers[3]?.rawDate;

    const windows = [
      sunrise ? { start: sunrise, end: addMinutes(sunrise, 20), label: 'Sunrise' } : null,
      dhuhr ? { start: addMinutes(dhuhr, -10), end: dhuhr, label: 'Zawal' } : null,
      maghrib ? { start: addMinutes(maghrib, -20), end: maghrib, label: 'Sunset' } : null,
    ].filter(Boolean);

    const active = windows.find((w) => now >= w.start && now < w.end);
    return { isMakruh: !!active, label: active?.label || null };
  }, [now, todayPrayers]);

  // Tahajjud / Qiyam voluntary window - last third of the night, ending
  // at the Seheri cutoff (Fajr minus the safety buffer). Before today's
  // Fajr that's the night we're still in (yesterday's Maghrib -> today's
  // Fajr); after it, tonight's (today's Maghrib -> tomorrow's Fajr).
  const isBeforeFajr = !!todayPrayers[0]?.rawDate && now < todayPrayers[0].rawDate;
  const tahajjudWindow = useMemo(() => {
    const nightStart = isBeforeFajr ? yesterdayPrayers[3]?.rawDate : todayPrayers[3]?.rawDate;
    const nightEnd = isBeforeFajr ? todayPrayers[0]?.rawDate : tomorrowPrayers[0]?.rawDate;
    if (!nightStart || !nightEnd) return null;
    const nightMs = nightEnd.getTime() - nightStart.getTime();
    const lastThirdStart = new Date(nightEnd.getTime() - nightMs / 3);
    const windowEnd = addMinutes(nightEnd, -safetyBuffer);
    return `${formatTime(lastThirdStart, coords.timezone)} – ${formatTime(windowEnd, coords.timezone)}`;
  }, [isBeforeFajr, yesterdayPrayers, todayPrayers, tomorrowPrayers, safetyBuffer, coords.timezone]);

  // Duha (Chasht) - from 20 minutes after sunrise (once the sunrise Makruh
  // window ends) until the Zawal Makruh window begins before Dhuhr.
  const duhaWindow = useMemo(() => {
    const sunrise = todayPrayers[5]?.rawSunrise;
    const dhuhr = todayPrayers[1]?.rawDate;
    if (!sunrise || !dhuhr) return '--:-- – --:--';
    return `${formatTime(addMinutes(sunrise, 20), coords.timezone)} – ${formatTime(addMinutes(dhuhr, -10), coords.timezone)}`;
  }, [todayPrayers, coords.timezone]);

  // Qibla bearing - real great-circle calculation from the current coords.
  const qiblaAngle = useMemo(() => getQiblaBearing(coords.latitude, coords.longitude), [coords.latitude, coords.longitude]);
  const qiblaDirectionLabel = useMemo(() => bearingToCompassPoint(qiblaAngle), [qiblaAngle]);
  const distanceToKaabaKm = useMemo(
    () => getDistanceToKaabaKm(coords.latitude, coords.longitude),
    [coords.latitude, coords.longitude]
  );
  // How far (and which way) to turn so the Kaaba marker sits under the
  // fixed index at the top of the dial. Within 5 degrees counts as facing it.
  const qiblaTurn = useMemo(() => {
    const diff = ((qiblaAngle - heading + 540) % 360) - 180;
    return { diff, aligned: Math.abs(diff) <= 5 };
  }, [qiblaAngle, heading]);

  // Which of the 7 wakt-based periods is currently active - ticks forward
  // automatically as each prayer time passes. Drives the soft sky-glow tint
  // behind the whole app.
  const dayPeriod = useMemo(() => {
    const fajr = todayPrayers[0]?.rawDate;
    const sunrise = todayPrayers[5]?.rawSunrise;
    const dhuhr = todayPrayers[1]?.rawDate;
    const asr = todayPrayers[2]?.rawDate;
    const maghrib = todayPrayers[3]?.rawDate;
    const isha = todayPrayers[4]?.rawDate;
    if (!fajr || !sunrise || !dhuhr || !asr || !maghrib || !isha) return 'isha';
    if (now < fajr) return 'lateNight';
    if (now < sunrise) return 'fajr';
    if (now < dhuhr) return 'morning';
    if (now < asr) return 'midday';
    if (now < maghrib) return 'afternoon';
    if (now < isha) return 'maghrib';
    return 'isha';
  }, [now, todayPrayers]);

  // ---- Theme ---------------------------------------------------------
  // A real Light / Dark / System choice. (Previously "light" only applied
  // through the bright hours and flipped back to dark at dusk.)
  const resolvedMode = themeMode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themeMode === 'light' ? 'light' : 'dark';
  const t = THEMES[resolvedMode];
  const styles = useMemo(() => buildStyles(t), [t]);
  const glowColor = PERIOD_GLOW[dayPeriod][t.isLight ? 'light' : 'dark'];
  const starCount = t.isLight
    ? 0
    : dayPeriod === 'lateNight' || dayPeriod === 'isha'
      ? 45
      : dayPeriod === 'fajr' || dayPeriod === 'maghrib'
        ? 14
        : 0;

  // Essential Duas Database
  const essentialDuas = [
    {
      id: 1,
      category: 'FASTING',
      title: 'Dua for Beginning Fast (Seheri Intention)',
      arabic: 'وَبِصَوْمِ غَدٍ نَّوَيْتُ مِنْ شَهْرِ رَمَضَانَ',
      transliteration: 'Wa bisawmi ghadin nawaitu min shahri Ramadan',
      translation: 'I intend to keep the fast tomorrow for the month of Ramadan (or voluntary fast).',
    },
    {
      id: 2,
      category: 'FASTING',
      title: 'Dua for Breaking Fast (Iftar)',
      arabic: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ',
      transliteration: 'Zahaba adh-dhama’u wabtallatil-‘urooqu wa thabatal-ajru in sha’ Allah',
      translation: 'The thirst is gone, the veins are moistened, and the reward is confirmed, if Allah wills.',
    },
    {
      id: 3,
      category: 'DAILY PROTECTION',
      title: 'Dua for Protection Against All Harm',
      arabic: 'بِسْمِ اللهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
      transliteration: 'Bismillahil-ladhi la yadurru ma‘as-mihi shay’un fil-ardi wa la fis-sama’i wa huwas-Sami‘ul-‘Alim',
      translation: 'In the Name of Allah with Whose Name nothing can cause harm on earth or in the heavens, and He is the All-Hearing, All-Knowing.',
    },
    {
      id: 4,
      category: 'HOME',
      title: 'Dua for Entering the Home',
      arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلِجِ وَخَيْرَ الْمَخْرَجِ، بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا',
      transliteration: 'Allahumma inni as’aluka khayral-mawliji wa khayral-makhraji, bismillahi walajna wa bismillahi kharajna wa ‘alallahi rabbina tawakkalna',
      translation: 'O Allah, I ask You for the best of entrances and the best of exits. In the name of Allah we enter, in the name of Allah we leave, and upon Allah our Lord we depend.',
    },
    {
      id: 5,
      category: 'HOME',
      title: 'Dua for Leaving the Home',
      arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
      transliteration: 'Bismillahi, tawakkaltu ‘alallahi, wa la hawla wa la quwwata illa billah',
      translation: 'In the name of Allah, I place my trust in Allah, and there is no power or strength except with Allah.',
    },
    {
      id: 6,
      category: 'FOOD',
      title: 'Dua Before Eating',
      arabic: 'بِسْمِ اللَّهِ',
      transliteration: 'Bismillah',
      translation: 'In the name of Allah. (If you forget at the start: "Bismillahi fi awwalihi wa akhirihi" - In the name of Allah at its beginning and end.)',
    },
    {
      id: 7,
      category: 'FOOD',
      title: 'Dua After Eating',
      arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
      transliteration: 'Alhamdu lillahil-ladhi at‘amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah',
      translation: 'Praise be to Allah Who fed me this and provided it for me, without any might or power on my part.',
    },
    {
      id: 8,
      category: 'TRAVEL',
      title: 'Dua for Travelling (Safar)',
      arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
      transliteration: 'Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun',
      translation: 'Glory to Him Who has made this subservient to us, for we could never have accomplished it by ourselves. And to our Lord we shall surely return.',
    },
    {
      id: 9,
      category: 'FORGIVENESS',
      title: "Sayyidul Istighfar (Master of Seeking Forgiveness)",
      // Full text as in Sahih al-Bukhari 6306 (it previously stopped halfway).
      arabic: 'اللَّهُمَّ أَنْتَ رَبِّي، لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
      transliteration: 'Allahumma anta Rabbi, la ilaha illa anta, khalaqtani wa ana ‘abduka, wa ana ‘ala ‘ahdika wa wa‘dika mastata‘tu, a‘udhu bika min sharri ma sana‘tu, abu’u laka bini‘matika ‘alayya, wa abu’u laka bidhanbi, faghfir li, fa innahu la yaghfirudh-dhunuba illa anta',
      translation: 'O Allah, You are my Lord, there is none worthy of worship except You. You created me and I am Your servant, and I keep Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your blessings upon me, and I admit my sins, so forgive me, for none forgives sins except You.',
    },
    {
      id: 10,
      category: 'PARENTS',
      title: 'Dua for Parents',
      arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
      transliteration: 'Rabbi irhamhuma kama rabbayani saghira',
      translation: 'My Lord, have mercy upon them as they raised me when I was small.',
    },
    {
      id: 11,
      category: 'DIFFICULTY',
      title: 'Dua in Difficulty or Distress',
      arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
      transliteration: 'Hasbunallahu wa ni‘mal-wakil',
      translation: 'Allah is sufficient for us, and He is the best Disposer of affairs.',
    },
    {
      id: 12,
      category: 'KNOWLEDGE',
      title: 'Dua for Increase in Knowledge',
      arabic: 'رَبِّ زِدْنِي عِلْمًا',
      transliteration: 'Rabbi zidni ‘ilma',
      translation: 'My Lord, increase me in knowledge.',
    },
    {
      id: 13,
      category: 'SLEEP',
      title: 'Dua Before Sleeping',
      arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
      transliteration: 'Bismika Allahumma amutu wa ahya',
      translation: 'In Your name, O Allah, I die and I live.',
    },
    {
      id: 14,
      category: 'SLEEP',
      title: 'Dua Upon Waking Up',
      arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
      transliteration: 'Alhamdu lillahil-ladhi ahyana ba‘da ma amatana wa ilayhin-nushur',
      translation: 'Praise be to Allah Who gave us life after having caused us to die, and to Him is the resurrection.',
    },
    {
      id: 15,
      category: 'GENERAL',
      title: 'Dua for Good in Both Worlds',
      arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
      transliteration: 'Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina ‘adhaban-nar',
      translation: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
    },
  ];

  // Complete Six Kalimas Reference Library
  const kalimas = [
    {
      id: 1,
      title: '1. Kalimah Tayyibah',
      arabic: 'لَا إِلٰهَ إِلَّا اللهُ مُحَمَّدٌ رَسُولُ اللهِ',
      transliteration: 'La ilaha illallahu Muhammadur Rasulullah',
      translation: 'There is none worthy of worship except Allah, Muhammad is the Messenger of Allah.',
    },
    {
      id: 2,
      title: '2. Kalimah Shahadah',
      arabic: 'أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
      transliteration: 'Ashhadu an la ilaha illallahu wahdahu la sharika lahu, wa ashhadu anna Muhammadan abduhu wa rasuluh',
      translation: 'I bear witness that none has the right to be worshipped but Allah alone, Who has no partner, and I bear witness that Muhammad is His slave and Messenger.',
    },
    {
      id: 3,
      title: '3. Kalimah Tamjeed',
      arabic: 'سُبْحَانَ اللهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلٰهَ إِلَّا اللهُ وَاللهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ',
      transliteration: 'Subhanallahi wal-hamdu lillahi wa la ilaha illallahu wallahu akbar, wa la hawla wa la quwwata illa billahil-aliyil-azim',
      translation: 'Glory be to Allah, all praise is for Allah, there is none worthy of worship except Allah, and Allah is the Greatest. There is no power and no strength except with Allah, the Most High, the Most Great.',
    },
    {
      id: 4,
      title: '4. Kalimah Tawheed',
      arabic: 'لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، يُحْيِي وَيُمِيتُ، وَهُوَ حَيٌّ لَا يَمُوتُ أَبَدًا أَبَدًا، ذُو الْجَلَالِ وَالْإِكْرَامِ، بِيَدِهِ الْخَيْرُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
      transliteration: 'La ilaha illallahu wahdahu la sharika lahu, lahul-mulku wa lahul-hamdu, yuhyi wa yumitu wa huwa hayyun la yamutu abadan abadan, dhul-jalali wal-ikrami, biyadihil-khayru, wa huwa ala kulli shay-in qadir',
      translation: 'There is none worthy of worship except Allah, alone without partner. To Him belongs the kingdom and all praise. He gives life and causes death, and He is Alive, never dying, ever. Possessor of Majesty and Honor. In His hand is all good, and He has power over all things.',
    },
    {
      id: 5,
      title: '5. Kalimah Istighfar',
      arabic: 'أَسْتَغْفِرُ اللهَ رَبِّي مِنْ كُلِّ ذَنْبٍ أَذْنَبْتُهُ عَمْدًا أَوْ خَطَأً، سِرًّا أَوْ عَلَانِيَةً، وَأَتُوبُ إِلَيْهِ مِنَ الذَّنْبِ الَّذِي أَعْلَمُ، وَمِنَ الذَّنْبِ الَّذِي لَا أَعْلَمُ، إِنَّكَ أَنْتَ عَلَّامُ الْغُيُوبِ، وَسَتَّارُ الْعُيُوبِ، وَغَفَّارُ الذُّنُوبِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ الْعَلِيِّ الْعَظِيمِ',
      transliteration: 'Astaghfirullaha rabbi min kulli dhambin adhnabtuhu ‘amdan aw khata’an, sirran aw ‘alaniyatan, wa atubu ilayhi minadh-dhambil-ladhi a‘lamu, wa minadh-dhambil-ladhi la a‘lamu, innaka anta ‘allamul-ghuyubi, wa sattarul-‘uyubi, wa ghaffarudh-dhunubi, wa la hawla wa la quwwata illa billahil-‘aliyyil-‘azim',
      translation: 'I seek forgiveness from Allah, my Lord, for every sin I have committed, deliberately or by mistake, secretly or openly, and I turn to Him in repentance from the sin I know and from the sin I do not know. Truly You are the Knower of the unseen, the Concealer of faults and the Forgiver of sins. There is no power and no strength except with Allah, the Most High, the Most Great.',
    },
    {
      id: 6,
      title: '6. Kalimah Radd-e-Kufr',
      arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ أَنْ أُشْرِكَ بِكَ شَيْئًا وَأَنَا أَعْلَمُ بِهِ، وَأَسْتَغْفِرُكَ لِمَا لَا أَعْلَمُ بِهِ، تُبْتُ عَنْهُ وَتَبَرَّأْتُ مِنَ الْكُفْرِ وَالشِّرْكِ وَالْكِذْبِ وَالْغِيبَةِ وَالْبِدْعَةِ وَالنَّمِيمَةِ وَالْفَوَاحِشِ وَالْبُهْتَانِ وَالْمَعَاصِي كُلِّهَا، وَأَسْلَمْتُ وَأَقُولُ لَا إِلٰهَ إِلَّا اللهُ مُحَمَّدٌ رَسُولُ اللهِ',
      transliteration: 'Allahumma inni a‘udhu bika min an ushrika bika shay’an wa ana a‘lamu bihi, wa astaghfiruka lima la a‘lamu bihi, tubtu ‘anhu wa tabarra’tu minal-kufri wash-shirki wal-kidhbi wal-ghibati wal-bid‘ati wan-namimati wal-fawahishi wal-buhtani wal-ma‘asi kulliha, wa aslamtu wa aqulu la ilaha illallahu Muhammadur Rasulullah',
      translation: 'O Allah, I seek refuge in You from knowingly associating anything with You, and I seek Your forgiveness for what I do not know. I repent from it, and I free myself from disbelief, associating partners with You, lying, backbiting, innovation, tale-bearing, indecency, slander and all sins. I submit, and I declare: there is none worthy of worship except Allah, Muhammad is the Messenger of Allah.',
    },
  ];

  // Hijri date for any calendar day - the real Umm al-Qura calendar (see
  // getHijriDate), shifted by the Hijri Date Offset setting so it can
  // match local moon sighting.
  const hijriInfoForDate = (dateObj) => {
    const { day, monthIndex, year } = getHijriDate(dateObj, hijriOffset);
    return { day, monthIndex, monthName: HIJRI_MONTHS[monthIndex], monthNameAr: HIJRI_MONTHS_AR[monthIndex], year };
  };

  // Does a named occasion fall on this day? (h = that day's Hijri date)
  const eventMatchesDay = (evt, dateObj, h) => {
    if (evt.hijri) return evt.hijri.monthIndex === h.monthIndex && evt.hijri.day === h.day;
    if (evt.rule === 'lastFridayOfRamadan') {
      if (h.monthIndex !== 8 || dateObj.getDay() !== 5) return false;
      const nextWeek = new Date(dateObj);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return hijriInfoForDate(nextWeek).monthIndex !== 8; // no more Fridays left in Ramadan
    }
    return false;
  };
  const islamicEventForDay = (dateObj, h) => ISLAMIC_EVENTS.find((evt) => eventMatchesDay(evt, dateObj, h)) || null;

  // Builds one month's grid (Gregorian day + matching Hijri day per cell)
  // for any year/month - used both for "this month" (which drives the
  // White Days / next-event logic below, always tied to the real date)
  // and for whichever month the user is currently browsing to on the
  // Hijri tab.
  const buildMonthGrid = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const label = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const days = Array.from({ length: firstWeekday }, () => ({ empty: true }));
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const h = hijriInfoForDate(dateObj);
      const { day: hijriDay, monthName: hijriMonthName, year: hijriYear } = h;
      const isWhiteDay = hijriDay === 13 || hijriDay === 14 || hijriDay === 15;
      const islamicEvent = islamicEventForDay(dateObj, h);
      const isSunnahFastDay = dateObj.getDay() === 1 || dateObj.getDay() === 4; // weekly Sunnah: Monday & Thursday
      // Priority when a day matches more than one kind: named Islamic
      // occasion > White Days > weekly Monday/Thursday fast.
      const specialType = islamicEvent ? 'event' : isWhiteDay ? 'whiteDays' : isSunnahFastDay ? 'sunnahFast' : null;
      days.push({
        gregDay: d,
        hijriDay,
        hijriMonthName,
        hijriYear,
        dateObj,
        isToday: year === todayDateOnly.getFullYear() && month === todayDateOnly.getMonth() && d === todayDateOnly.getDate(),
        isPast: dateObj.getTime() < todayDateOnly.getTime(),
        event: isWhiteDay ? 'White Days' : undefined,
        islamicEvent,
        specialType,
      });
    }
    return { year, month, daysInMonth, firstWeekday, label, days };
  };

  const hijriToday = useMemo(() => hijriInfoForDate(todayDateOnly), [todayDateOnly, hijriOffset]);

  // ---- Ramadan mode & Sunnah fasting-day nudge -------------------------
  // Driven by the Hijri month itself, so it works every year - not just
  // for one hard-coded Ramadan.
  const isRamadan = hijriToday.monthIndex === 8;
  const ramadanDayNumber = isRamadan ? hijriToday.day : null;
  const isSunnahFastingDay = useMemo(() => {
    const day = todayDateOnly.getDay(); // 0=Sun ... 1=Mon, 4=Thu
    return (day === 1 || day === 4) && !isRamadan;
  }, [todayDateOnly, isRamadan]);

  // What kind of fast (if any) a given day is - used for fasting alerts.
  // Fasting is not allowed on either Eid or the days of Tashreeq, so those
  // days never count, even when they fall on a Monday or Thursday.
  const getFastingDay = (dateObj) => {
    const h = hijriInfoForDate(dateObj);
    if ((h.monthIndex === 9 && h.day === 1) || (h.monthIndex === 11 && h.day >= 10 && h.day <= 13)) return null;
    if (h.monthIndex === 8) return { type: 'ramadan', label: `Ramadan day ${h.day}` };
    if (h.monthIndex === 11 && h.day === 9) return { type: 'sunnah', label: 'the Day of Arafah' };
    if (h.monthIndex === 0 && h.day === 10) return { type: 'sunnah', label: 'the Day of Ashura' };
    if (h.monthIndex === 0 && h.day === 9) return { type: 'sunnah', label: 'Tasu‘a (9 Muharram), the day before Ashura' };
    if (h.day >= 13 && h.day <= 15) return { type: 'sunnah', label: `a White Day (${h.day} ${h.monthName})` };
    const wd = dateObj.getDay();
    if (wd === 1 || wd === 4) return { type: 'sunnah', label: wd === 1 ? 'Monday' : 'Thursday' };
    return null;
  };

  // Always the real current month - independent of what's being browsed
  // to below - since the "Next: White Days" card on the Prayers tab must
  // never change just because you're looking ahead at November.
  const currentMonthGrid = useMemo(
    () => buildMonthGrid(todayDateOnly.getFullYear(), todayDateOnly.getMonth()),
    [todayDateOnly, hijriOffset]
  );
  const calendarDays = currentMonthGrid.days;

  // Which month the Hijri tab is browsing to - 0 = this month, +1 = next
  // month, -1 = previous month, etc. Resets to "this month" whenever the
  // real calendar day changes.
  const [calendarViewOffset, setCalendarViewOffset] = useState(0);
  useEffect(() => {
    setCalendarViewOffset(0);
  }, [todayDateOnly.toDateString()]);

  const viewedMonthDate = useMemo(
    () => new Date(todayDateOnly.getFullYear(), todayDateOnly.getMonth() + calendarViewOffset, 1),
    [todayDateOnly, calendarViewOffset]
  );
  const viewedMonthGrid = useMemo(
    () => buildMonthGrid(viewedMonthDate.getFullYear(), viewedMonthDate.getMonth()),
    [viewedMonthDate, hijriOffset]
  );
  const goToPrevMonth = () => { triggerHaptic(); setCalendarViewOffset((o) => o - 1); };
  const goToNextMonth = () => { triggerHaptic(); setCalendarViewOffset((o) => o + 1); };
  const goToCurrentMonth = () => setCalendarViewOffset(0);

  // "Rabia al-Thani 1448 AH" or, when the Gregorian month spans two Hijri
  // months, "Rabia al-Thani – Jumada al-Awwal 1448 AH" - for whichever
  // month is currently being viewed.
  const hijriMonthRangeLabel = useMemo(() => {
    const real = viewedMonthGrid.days.filter((d) => !d.empty);
    if (real.length === 0) return '';
    const first = real[0];
    const last = real[real.length - 1];
    if (first.hijriMonthName === last.hijriMonthName && first.hijriYear === last.hijriYear) {
      return `${first.hijriMonthName} ${first.hijriYear} AH`;
    }
    return `${first.hijriMonthName} – ${last.hijriMonthName} ${last.hijriYear} AH`;
  }, [viewedMonthGrid]);

  const nextWhiteDaysInfo = useMemo(() => {
    const whiteDayEntries = calendarDays.filter((d) => d.event === 'White Days');
    if (whiteDayEntries.length === 0) return null;
    const todayNum = todayDateOnly.getDate();
    const upcoming = whiteDayEntries.filter((d) => d.gregDay >= todayNum);
    const isPast = upcoming.length === 0;
    const relevant = isPast ? whiteDayEntries : upcoming;
    const first = relevant[0].gregDay;
    const last = relevant[relevant.length - 1].gregDay;
    const daysAway = first - todayNum;
    const label = daysAway <= 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} Days`;
    const dateObj = new Date(todayDateOnly.getFullYear(), todayDateOnly.getMonth(), first);
    const monthAbbrev = dateObj.toLocaleDateString(undefined, { month: 'short' });
    const dayRangeText = first === last ? `${first}` : `${first}–${last}`; // "26", not "26–26"
    return {
      range: `${monthAbbrev} ${dayRangeText}`,
      dayRangeText,
      monthAbbrev: monthAbbrev.toUpperCase(),
      hijriMonthName: relevant[0].hijriMonthName,
      hijriYear: relevant[0].hijriYear,
      label,
      dateObj,
      isPast,
    };
  }, [calendarDays, todayDateOnly]);

  // Monthly summary for whichever month the Hijri tab is currently
  // browsing - prayers completed vs. possible, days fasted, journal
  // entries, and a mood breakdown, all read straight from completedByDay
  // / journalByDay rather than kept as a separate running total, so it's
  // always in sync and there's nothing extra to persist for it.
  const monthlySummary = useMemo(() => {
    const realDays = viewedMonthGrid.days.filter((d) => !d.empty);
    let prayersCompleted = 0;
    let fastedDays = 0;
    let journalEntries = 0;
    const moodCounts = {};
    realDays.forEach((d) => {
      const key = d.dateObj.toDateString();
      const prec = completedByDay[key];
      if (prec) prayersCompleted += [1, 2, 3, 4, 5].filter((id) => prec[id]).length;
      const jrec = journalByDay[key];
      if (jrec) {
        journalEntries += 1;
        if (jrec.fasted) fastedDays += 1;
        if (jrec.mood) moodCounts[jrec.mood] = (moodCounts[jrec.mood] || 0) + 1;
      }
    });
    const possiblePrayers = realDays.length * 5;
    const pct = possiblePrayers > 0 ? Math.round((prayersCompleted / possiblePrayers) * 100) : 0;
    return { prayersCompleted, possiblePrayers, pct, fastedDays, journalEntries, moodCounts };
  }, [viewedMonthGrid, completedByDay, journalByDay]);

  // The next occurrence (today onwards) of every named occasion, found by
  // walking the Hijri calendar forward day by day - so the list never runs
  // out, unlike the old typed-in dates that stopped in August 2027.
  const upcomingIslamicEvents = useMemo(() => {
    const results = [];
    const found = new Set();
    for (let i = 0; i <= 400 && found.size < ISLAMIC_EVENTS.length; i++) {
      const d = new Date(todayDateOnly);
      d.setDate(d.getDate() + i);
      const h = hijriInfoForDate(d);
      ISLAMIC_EVENTS.forEach((evt) => {
        if (!found.has(evt.id) && eventMatchesDay(evt, d, h)) {
          found.add(evt.id);
          results.push({ ...evt, dateObj: d, hijriLabel: islamicEventLabel(evt, h) });
        }
      });
    }
    return results.sort((a, b) => a.dateObj - b.dateObj);
  }, [todayDateOnly, hijriOffset]);
  // Soonest upcoming named Islamic occasion (Ramadan / Eid / Ashura / ...).
  const upcomingIslamicEvent = upcomingIslamicEvents[0] || null;

  // Whichever is chronologically sooner - this month's White Days, or the
  // next big named occasion - drives the "Next Important" card.
  const nextImportantEvent = useMemo(() => {
    const candidates = [];
    if (nextWhiteDaysInfo && !nextWhiteDaysInfo.isPast) {
      candidates.push({
        kind: 'white-days',
        title: 'White Days',
        subtitle: `${nextWhiteDaysInfo.range} (${nextWhiteDaysInfo.label})`,
        dateObj: nextWhiteDaysInfo.dateObj,
      });
    }
    if (upcomingIslamicEvent) {
      const daysAway = Math.round((upcomingIslamicEvent.dateObj - todayDateOnly) / 86400000);
      const label = daysAway <= 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} Days`;
      candidates.push({
        kind: 'islamic-event',
        title: upcomingIslamicEvent.title,
        subtitle: `${upcomingIslamicEvent.dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} (${label})`,
        dateObj: upcomingIslamicEvent.dateObj,
        event: upcomingIslamicEvent,
      });
    }
    candidates.sort((a, b) => a.dateObj - b.dateObj);
    return candidates[0] || null;
  }, [nextWhiteDaysInfo, upcomingIslamicEvent, todayDateOnly]);

  // Live days/hours/minutes countdown to that next important day - ticks
  // with the clock, same pattern as the per-prayer countdown ring.
  const nextImportantCountdown = useMemo(() => {
    if (!nextImportantEvent) return null;
    const diffMs = Math.max(0, nextImportantEvent.dateObj - now);
    const totalMins = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMins / 1440);
    const hours = Math.floor((totalMins % 1440) / 60);
    const mins = totalMins % 60;
    return { days, hours, mins, text: `${days}d ${hours}h ${mins}m` };
  }, [nextImportantEvent, now]);

  const openNextImportant = () =>
    setSelectedEvent(nextImportantEvent?.kind === 'islamic-event' ? nextImportantEvent.event : WHITE_DAYS_EVENT);

  // ---- Prayer-time & fasting alerts (local notifications) ---------------
  // Re-plans a rolling ALERT_DAYS_AHEAD window whenever the toggles,
  // location or calculation settings change, and again each new day the
  // app is open. Opening the app at least every few days keeps them going.
  //  - Adhan alerts: one notification at each of the five prayer times.
  //  - Fasting alerts: in Ramadan, "Seheri ends in 30 minutes" and an Iftar
  //    alert at Maghrib; outside Ramadan, a heads-up the evening before a
  //    recommended Sunnah fast (Mon/Thu, White Days, Arafah, Ashura).
  // Only alerts this code created (data.kind 'prayer' / 'fasting') are ever
  // cancelled - reminders from the Tasks tab are left alone.
  useEffect(() => {
    if (!hydrated) return undefined;
    let cancelled = false;
    const handle = setTimeout(async () => {
      if (Platform.OS === 'web') {
        setAlertsStatus(notificationsEnabled || fastingAlerts ? 'unsupported' : null);
        return;
      }
      try {
        const existing = await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(
          existing
            .filter((n) => ALERT_KINDS.includes(n?.content?.data?.kind))
            .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
        );
        if (cancelled) return;
        if (!notificationsEnabled && !fastingAlerts) {
          setAlertsStatus(null);
          return;
        }

        let perm = await Notifications.getPermissionsAsync();
        if (perm.status !== 'granted' && perm.canAskAgain !== false) {
          perm = await Notifications.requestPermissionsAsync();
        }
        if (cancelled) return;
        if (perm.status !== 'granted') {
          setAlertsStatus('denied');
          return;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(ALERT_CHANNEL_ID, {
            name: 'Prayer times & fasting',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
          });
        }

        const tz = coords.timezone;
        const nowMs = Date.now();
        const plan = [];
        for (let i = 0; i < ALERT_DAYS_AHEAD; i++) {
          const day = new Date(todayDateOnly);
          day.setDate(day.getDate() + i);
          const times = computePrayerTimes(coords, calcMethod, asrMethod, day);
          const fast = fastingAlerts ? getFastingDay(day) : null;
          const isRamadanDay = !!fast && fast.type === 'ramadan';

          if (notificationsEnabled) {
            times.slice(0, 5).forEach((p) => {
              if (p.rawDate && p.rawDate.getTime() > nowMs) {
                // In Ramadan the Maghrib alert doubles as the Iftar alert,
                // rather than two notifications landing at the same moment.
                const iftarToo = isRamadanDay && p.name === 'Maghrib';
                plan.push({
                  kind: 'prayer',
                  date: p.rawDate,
                  title: iftarToo ? `Iftar · ${p.time}` : `${p.name} · ${p.time}`,
                  body: iftarToo ? "It's time for Maghrib - time to break your fast." : `It's time for ${p.name} prayer.`,
                });
              }
            });
          }

          if (fastingAlerts) {
            const fajr = times[0].rawDate;
            const maghrib = times[3].rawDate;
            const seheriEnd = fajr ? addMinutes(fajr, -safetyBuffer) : null;
            if (fast && fast.type === 'ramadan' && seheriEnd) {
              const warn = addMinutes(seheriEnd, -30);
              if (warn.getTime() > nowMs) {
                plan.push({ kind: 'fasting', date: warn, title: 'Seheri ends in 30 minutes', body: `Finish eating by ${formatTime(seheriEnd, tz)}.` });
              }
              if (!notificationsEnabled && maghrib && maghrib.getTime() > nowMs) {
                plan.push({ kind: 'fasting', date: maghrib, title: `Iftar · ${times[3].time}`, body: 'Time to break your fast.' });
              }
            } else if (fast && seheriEnd) {
              const prevDay = new Date(day);
              prevDay.setDate(prevDay.getDate() - 1);
              const prevIsha = computePrayerTimes(coords, calcMethod, asrMethod, prevDay)[4].rawDate;
              const headsUp = prevIsha ? addMinutes(prevIsha, 30) : null;
              if (headsUp && headsUp.getTime() > nowMs) {
                plan.push({
                  kind: 'fasting',
                  date: headsUp,
                  title: 'Sunnah fast tomorrow',
                  body: `Tomorrow is ${fast.label}. Seheri ends at ${formatTime(seheriEnd, tz)} - set an alarm if you plan to fast.`,
                });
              }
            }
          }
        }

        plan.sort((a, b) => a.date - b.date);
        for (const item of plan.slice(0, 45)) {
          if (cancelled) return;
          await Notifications.scheduleNotificationAsync({
            content: { title: item.title, body: item.body, sound: true, data: { kind: item.kind } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date, channelId: ALERT_CHANNEL_ID },
          });
        }
        if (!cancelled) setAlertsStatus('scheduled');
      } catch (e) {
        if (!cancelled) setAlertsStatus('error');
      }
    }, 1200); // debounced: tapping through settings re-plans once, not per tap
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [
    hydrated,
    notificationsEnabled,
    fastingAlerts,
    coords.latitude,
    coords.longitude,
    coords.timezone,
    calcMethod,
    asrMethod,
    safetyBuffer,
    hijriOffset,
    zonedTodayKey,
  ]);
  // ---- Render helpers ---------------------------------------------------
  const doneCount = [1, 2, 3, 4, 5].filter((id) => completedPrayers[id]).length;
  const nextPrayerRowIdx = dynamicPrayers
    .slice(0, 5)
    .findIndex((p) => !completedPrayers[p.id] && p.name === nextPrayerInfo.name);
  const compassReady = compassAvailable === true;
  const qiblaAligned = compassReady && qiblaTurn.aligned;
  const switchColors = { false: t.switchTrackOff, true: t.successFill };
  // Every screen's scroll area clears the status bar at the top and the
  // floating tab bar (plus the system navigation bar) at the bottom.
  const scrollContentStyle = [styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 124 }];
  const activeBadge = (
    <View style={styles.activeBadge}>
      <Feather name="check" size={12} color={t.success} />
      <Text style={styles.activeBadgeText}>Active</Text>
    </View>
  );

  return (
    <ThemeContext.Provider value={t}>
      <View style={styles.container}>
        {/* Clean background: a calm base gradient plus a soft sky-glow tint
            from the top that changes colour with each prayer period. */}
        <LinearGradient colors={t.bgGradient} style={StyleSheet.absoluteFillObject} />
        <LinearGradient
          colors={[hexToRgba(glowColor, t.glowAlpha), hexToRgba(glowColor, 0)]}
          style={styles.skyGlow}
          pointerEvents="none"
        />
        {starCount > 0 && <Stars count={starCount} />}
        <StatusBar barStyle={t.statusBar} translucent backgroundColor="transparent" />

        <View style={styles.flex1}>
          <View style={styles.flex1}>
            {/* TAB 1: PRAYERS DASHBOARD (HOME) */}
            {activeTab === 'Prayers' && (
              <ScrollView contentContainerStyle={scrollContentStyle} showsVerticalScrollIndicator={false}>
                <View style={styles.hero}>
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic();
                      setActiveTab('More');
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                    style={styles.heroLocationRow}
                    accessibilityRole="button"
                    accessibilityLabel="Change location"
                  >
                    <Feather name="map-pin" size={14} color={t.accent} />
                    <Text style={styles.heroLocationText} numberOfLines={1}>
                      {loadingLocation && activeLocationId === 'auto' ? 'Detecting location…' : locationName}
                    </Text>
                    <Feather name="chevron-down" size={15} color={t.textTertiary} />
                  </TouchableOpacity>

                  <Text style={styles.heroDateText} numberOfLines={1}>
                    {now.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      timeZone: coords.timezone,
                    })}
                  </Text>

                  <View style={styles.hijriPill}>
                    <Text style={styles.hijriPillText}>
                      {hijriToday.day} {hijriToday.monthName} {hijriToday.year} AH
                    </Text>
                    <View style={styles.hijriPillDot} />
                    <Text style={styles.hijriPillArabic}>{hijriToday.monthNameAr}</Text>
                  </View>

                  <View style={styles.ringWrap}>
                    <MoonCountdownRing
                      size={268}
                      strokeWidth={12}
                      progress={nextPrayerInfo.progress}
                      isMakruh={makruhStatus.isMakruh}
                      trackColor={t.ringTrack}
                      faceColor={t.ringFace}
                      cutoutColor={t.bgGradient[0]}
                    >
                      <Text style={styles.ringEyebrow}>Next prayer</Text>
                      <Text style={styles.ringPrayerName}>{nextPrayerInfo.name}</Text>
                      <Text style={styles.ringCountdown} allowFontScaling={false}>
                        {nextPrayerInfo.countdown}
                      </Text>
                      <View style={[styles.ringTimeChip, makruhStatus.isMakruh && styles.ringTimeChipWarning]}>
                        <Feather name="bell" size={12} color={makruhStatus.isMakruh ? t.danger : t.accent} />
                        <Text style={[styles.ringTimeText, makruhStatus.isMakruh && { color: t.danger }]}>
                          {nextPrayerInfo.time}
                        </Text>
                      </View>
                    </MoonCountdownRing>
                  </View>

                  {makruhStatus.isMakruh && (
                    <View style={styles.makruhBanner}>
                      <Feather name="alert-triangle" size={14} color={t.danger} />
                      <Text style={styles.makruhBannerText}>
                        Makruh time ({makruhStatus.label}) — avoid praying now
                      </Text>
                    </View>
                  )}
                </View>

                {isRamadan && (
                  <Card style={styles.bannerCard} highlight={t.accentBorder}>
                    <IconBadge name="moon" color={t.accent} size={34} iconSize={16} />
                    <Text style={styles.bannerTitle}>Ramadan Mubarak</Text>
                    <Text style={styles.bannerMeta}>Day {ramadanDayNumber}</Text>
                  </Card>
                )}

                {(() => {
                  const isSeheri = nextFasting.label === 'Seheri';
                  const accent = isSeheri ? t.seheri : t.iftar;
                  return (
                    <Card style={styles.infoCard}>
                      <View style={styles.infoCardRow}>
                        <IconBadge name={isSeheri ? 'moon' : 'sunset'} color={accent} />
                        <View style={styles.flex1}>
                          <Text style={styles.eyebrow}>Next fasting time</Text>
                          <Text style={styles.infoCardTitle}>{nextFasting.label}</Text>
                        </View>
                        <View style={[styles.countPill, { backgroundColor: hexToRgba(accent, t.isLight ? 0.1 : 0.16) }]}>
                          <Text style={[styles.countPillText, { color: accent }]} allowFontScaling={false}>
                            {nextFasting.countdown}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.round(fastingRingProgress * 100)}%`, backgroundColor: accent },
                          ]}
                        />
                      </View>

                      <View style={styles.timePairRow}>
                        <View style={styles.timePairCell}>
                          <Text style={styles.timePairLabel}>Seheri</Text>
                          <Text style={styles.timePairValue}>{seheriInfo.time}</Text>
                        </View>
                        <View style={styles.timePairDivider} />
                        <View style={styles.timePairCell}>
                          <Text style={styles.timePairLabel}>Iftar</Text>
                          <Text style={styles.timePairValue}>{iftarInfo.time}</Text>
                        </View>
                      </View>
                    </Card>
                  );
                })()}

                <TouchableOpacity activeOpacity={0.85} onPress={openNextImportant}>
                  <Card style={styles.infoCard}>
                    <View style={styles.infoCardRow}>
                      <IconBadge name="star" color={t.accent} />
                      <View style={styles.flex1}>
                        <Text style={styles.eyebrow}>Next important date</Text>
                        <Text style={styles.infoCardTitle} numberOfLines={1}>
                          {nextImportantEvent?.title || '—'}
                        </Text>
                        <Text style={styles.infoCardSub}>{nextImportantEvent?.subtitle || '—'}</Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={t.textTertiary} />
                    </View>
                  </Card>
                </TouchableOpacity>

                <SectionTitle title="Today's prayers" action="Mark all done" onAction={markAllPrayersDone} />
                <Card style={styles.listCard}>
                  <View style={styles.listCardHeader}>
                    <View style={styles.progressTrackFlex}>
                      <View style={[styles.progressFillSuccess, { width: `${(doneCount / 5) * 100}%` }]} />
                    </View>
                    <Text style={styles.progressLabel}>{doneCount} of 5 prayed</Text>
                  </View>
                  {dynamicPrayers.slice(0, 5).map((item, idx) => {
                    const isChecked = !!completedPrayers[item.id];
                    const isNext = idx === nextPrayerRowIdx;
                    const showSeparator = idx > 0 && idx !== nextPrayerRowIdx && idx - 1 !== nextPrayerRowIdx;
                    return (
                      <View key={item.id}>
                        {showSeparator && <View style={styles.insetSeparator} />}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => togglePrayer(item.id)}
                          style={[styles.prayerRow, isNext && styles.prayerRowNext]}
                        >
                          <IconBadge
                            family="mci"
                            name={PRAYER_ICONS[item.name]}
                            color={t.prayer[item.name]}
                            size={38}
                            iconSize={19}
                          />
                          <View style={styles.flex1}>
                            <View style={styles.prayerNameRow}>
                              <Text style={[styles.prayerName, isChecked && styles.prayerNameDone]} numberOfLines={1}>
                                {item.name}
                              </Text>
                              {item.note ? (
                                <Text style={styles.prayerNote} numberOfLines={1}>
                                  {item.note}
                                </Text>
                              ) : null}
                              {isNext && (
                                <View style={styles.nextChip}>
                                  <Text style={styles.nextChipText}>Next</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.prayerSub} numberOfLines={1}>
                              Until {prayerEndTimes[item.id] || '--:--'}
                            </Text>
                          </View>
                          <Text style={[styles.prayerTime, isNext && styles.prayerTimeNext]} numberOfLines={1}>
                            {item.time}
                          </Text>
                          <CheckCircle checked={isChecked} onPress={() => togglePrayer(item.id)} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </Card>

                {/* Prohibited (Makruh) windows, one row each. The row that's
                    active right now gets a red wash and a "Now" tag. */}
                <SectionTitle title="Prohibited times · Makruh" icon="alert-triangle" />
                <Card style={styles.listCard}>
                  {[
                    { key: 'Sunrise', label: 'Sunrise', icon: 'sunrise', value: makruhWindows.sunrise },
                    { key: 'Zawal', label: 'Zenith (Zawal)', icon: 'sun', value: makruhWindows.zawal },
                    { key: 'Sunset', label: 'Sunset', icon: 'sunset', value: makruhWindows.sunset },
                  ].map((row, idx) => {
                    const active = makruhStatus.isMakruh && makruhStatus.label === row.key;
                    return (
                      <View key={row.key}>
                        {idx > 0 && <View style={styles.insetSeparator} />}
                        <View style={[styles.simpleRow, active && styles.simpleRowDanger]}>
                          <IconBadge name={row.icon} color={t.danger} size={34} iconSize={16} />
                          <Text style={styles.simpleRowLabelGrow} numberOfLines={1}>
                            {row.label}
                          </Text>
                          {active && (
                            <View style={styles.nowChip}>
                              <Text style={styles.nowChipText}>Now</Text>
                            </View>
                          )}
                          <Text style={styles.simpleRowValue} numberOfLines={1}>
                            {row.value}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </Card>

                {tahajjudWindow && (
                  <>
                    <SectionTitle title="Voluntary" icon="moon" />
                    <Card style={styles.listCard}>
                      <View style={styles.simpleRow}>
                        <IconBadge name="moon" color={t.accent} size={34} iconSize={16} />
                        <View style={styles.flex1}>
                          <Text style={styles.simpleRowLabel}>Tahajjud · Qiyam</Text>
                          <Text style={styles.simpleRowSub}>Last third of the night</Text>
                        </View>
                        <Text style={styles.simpleRowValue} numberOfLines={1}>
                          {tahajjudWindow}
                        </Text>
                      </View>
                    </Card>
                  </>
                )}
              </ScrollView>
            )}

            {/* TAB 2: QIBLA COMPASS */}
            {activeTab === 'Qibla' && (
              <ScrollView contentContainerStyle={scrollContentStyle} showsVerticalScrollIndicator={false}>
                <Text style={styles.screenTitle}>Qibla</Text>
                <Text style={styles.screenSubtitle}>Direction to the Kaaba from {locationName}</Text>

                <View style={styles.qiblaDialWrap}>
                  <QiblaDial size={292} heading={heading} qiblaAngle={qiblaAngle} aligned={qiblaAligned}>
                    <View style={styles.qiblaCenter}>
                      <Text style={styles.qiblaCenterDeg}>{Math.round(qiblaAngle)}°</Text>
                      <Text style={styles.qiblaCenterDir}>{qiblaDirectionLabel}</Text>
                    </View>
                  </QiblaDial>
                </View>

                {(() => {
                  let icon = 'loader';
                  let text = 'Checking for a compass…';
                  let color = t.textSecondary;
                  if (compassAvailable === false) {
                    icon = 'info';
                    text = `No compass found · face ${qiblaAngle.toFixed(0)}° from north`;
                  } else if (qiblaAligned) {
                    icon = 'check-circle';
                    text = "You're facing the Qibla";
                    color = t.success;
                  } else if (compassReady) {
                    icon = qiblaTurn.diff > 0 ? 'rotate-cw' : 'rotate-ccw';
                    text = `Turn ${qiblaTurn.diff > 0 ? 'right' : 'left'} ${Math.round(Math.abs(qiblaTurn.diff))}°`;
                    color = t.text;
                  }
                  return (
                    <View style={[styles.statusPill, qiblaAligned && styles.statusPillSuccess]}>
                      <Feather name={icon} size={14} color={color} />
                      <Text style={[styles.statusPillText, { color }]}>{text}</Text>
                    </View>
                  );
                })()}

                {compassReady && (headingInfo.accuracy <= 1 || !headingInfo.isTrue) && (
                  <View style={styles.qiblaHintRow}>
                    <Feather name="alert-circle" size={13} color={t.accent} />
                    <Text style={styles.qiblaHintText}>
                      {headingInfo.accuracy <= 1
                        ? 'Low compass accuracy — move your phone in a figure-8 to calibrate.'
                        : 'Using magnetic north — allow location access for a true-north reading.'}
                    </Text>
                  </View>
                )}

                <Card style={styles.statsCard}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{qiblaAngle.toFixed(1)}°</Text>
                    <Text style={styles.statLabel}>Qibla bearing</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{compassReady ? `${heading}°` : '—'}</Text>
                    <Text style={styles.statLabel}>{headingInfo.isTrue ? 'Your heading' : 'Heading (magnetic)'}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{Math.round(distanceToKaabaKm).toLocaleString()}</Text>
                    <Text style={styles.statLabel}>km to Makkah</Text>
                  </View>
                </Card>
                <Text style={styles.footnoteCenter}>
                  Hold your phone flat and away from metal or magnets for the most accurate reading.
                </Text>
              </ScrollView>
            )}

            {/* TAB 3: HIJRI CALENDAR SCREEN */}
            {activeTab === 'Hijri' && (
              <ScrollView contentContainerStyle={scrollContentStyle} showsVerticalScrollIndicator={false}>
                <View style={styles.monthNavRow}>
                  <TouchableOpacity
                    style={styles.roundIconBtn}
                    onPress={goToPrevMonth}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Previous month"
                  >
                    <Feather name="chevron-left" size={20} color={t.text} />
                  </TouchableOpacity>
                  <View style={styles.monthNavCenter}>
                    <Text style={styles.monthTitle}>{viewedMonthGrid.label}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.roundIconBtn}
                    onPress={goToNextMonth}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Next month"
                  >
                    <Feather name="chevron-right" size={20} color={t.text} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.monthSubtitle}>{hijriMonthRangeLabel}</Text>

                {calendarViewOffset !== 0 && (
                  <TouchableOpacity activeOpacity={0.8} onPress={goToCurrentMonth} style={styles.todayLink}>
                    <Feather name="rotate-ccw" size={12} color={t.accent} />
                    <Text style={styles.todayLinkText}>Back to today</Text>
                  </TouchableOpacity>
                )}

                {/* Weekday header and grid share one card and the exact same
                    1/7 column widths, so every date sits under its letter. */}
                <Card style={styles.calendarCard}>
                  <View style={styles.weekdaysRow}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, idx) => (
                      // Friday (Jumu'ah) gets the gold accent.
                      <Text key={idx} style={[styles.weekdayLabel, idx === 5 && styles.weekdayLabelFriday]}>
                        {day}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.calendarGrid}>
                    {viewedMonthGrid.days.map((item, index) => {
                      if (item.empty) {
                        return <View key={index} style={styles.calendarCell} />;
                      }
                      const hasJournal = !!journalByDay[item.dateObj.toDateString()];
                      const dotColor = item.specialType ? t.special[item.specialType] : null;
                      const isFriday = index % 7 === 5;
                      return (
                        <TouchableOpacity
                          key={index}
                          activeOpacity={0.7}
                          style={styles.calendarCell}
                          onPress={() => openJournalForDate(item.dateObj)}
                        >
                          <View
                            style={[
                              styles.dayCircle,
                              item.isToday && styles.dayCircleToday,
                              !item.isToday && isFriday && styles.dayCircleFriday,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayNumber,
                                item.isToday && styles.dayNumberToday,
                                item.isPast && !item.isToday && styles.dayNumberPast,
                              ]}
                            >
                              {item.gregDay}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.hijriNumber,
                              item.isToday && styles.hijriNumberToday,
                              item.isPast && !item.isToday && styles.hijriNumberPast,
                            ]}
                          >
                            {item.hijriDay}
                          </Text>
                          <View style={styles.cellDotRow}>
                            {dotColor && <View style={[styles.cellDot, { backgroundColor: dotColor }]} />}
                            {hasJournal && <View style={[styles.cellDot, { backgroundColor: t.special.note }]} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Card>

                <View style={styles.legendRow}>
                  {[
                    ['White Days', t.special.whiteDays],
                    ['Mon/Thu fast', t.special.sunnahFast],
                    ['Islamic occasion', t.special.event],
                    ['Your note', t.special.note],
                  ].map(([label, color]) => (
                    <View key={label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: color }]} />
                      <Text style={styles.legendText}>{label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.footnoteCenter}>Tap any date to log a journal entry, mood and fasting.</Text>

                {nextImportantEvent && nextImportantCountdown && (
                  <TouchableOpacity activeOpacity={0.85} onPress={openNextImportant}>
                    <Card style={styles.countdownCard} highlight={t.accentBorder}>
                      <View style={styles.countdownHeaderRow}>
                        <Feather name="clock" size={13} color={t.accent} />
                        <Text style={styles.eyebrowAccent}>Countdown</Text>
                      </View>
                      <Text style={styles.countdownTitle} numberOfLines={2}>
                        {nextImportantEvent.title}
                      </Text>
                      {nextImportantCountdown.days + nextImportantCountdown.hours + nextImportantCountdown.mins === 0 ? (
                        // The day has arrived - say so instead of showing 00 00 00.
                        <View style={styles.countdownTodayRow}>
                          <Feather name="star" size={18} color={t.accent} />
                          <Text style={styles.countdownTodayText}>It's today</Text>
                        </View>
                      ) : (
                      <View style={styles.countdownUnitsRow}>
                        {[
                          ['Days', nextImportantCountdown.days],
                          ['Hours', nextImportantCountdown.hours],
                          ['Minutes', nextImportantCountdown.mins],
                        ].map(([label, value]) => (
                          <View key={label} style={styles.countdownUnit}>
                            <Text style={styles.countdownUnitValue}>{String(value).padStart(2, '0')}</Text>
                            <Text style={styles.countdownUnitLabel}>{label}</Text>
                          </View>
                        ))}
                      </View>
                      )}
                      <Text style={styles.countdownSub}>
                        {nextImportantEvent.dateObj.toLocaleDateString(undefined, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    </Card>
                  </TouchableOpacity>
                )}

                <SectionTitle title="This month at a glance" icon="bar-chart-2" />
                <Card style={styles.statsCard}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{monthlySummary.pct}%</Text>
                    <Text style={styles.statLabel}>Prayers logged</Text>
                    <Text style={styles.statSub}>
                      {monthlySummary.prayersCompleted}/{monthlySummary.possiblePrayers}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{monthlySummary.fastedDays}</Text>
                    <Text style={styles.statLabel}>Days fasted</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{monthlySummary.journalEntries}</Text>
                    <Text style={styles.statLabel}>Journal entries</Text>
                  </View>
                </Card>
                {Object.keys(monthlySummary.moodCounts).length > 0 && (
                  <View style={[styles.chipWrapRow, { marginTop: SPACE.md }]}>
                    {MOOD_OPTIONS.filter((m) => monthlySummary.moodCounts[m.id]).map((m) => (
                      <View key={m.id} style={styles.summaryChip}>
                        <Feather name={m.icon} size={12} color={t.textSecondary} />
                        <Text style={styles.summaryChipText}>
                          {m.label} · {monthlySummary.moodCounts[m.id]}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <SectionTitle title="Upcoming Islamic events" icon="star" />
                <Card style={styles.listCard}>
                  {(() => {
                    const rows = [];
                    if (nextWhiteDaysInfo && !nextWhiteDaysInfo.isPast) {
                      rows.push({
                        key: 'white-days',
                        day: nextWhiteDaysInfo.dayRangeText,
                        month: nextWhiteDaysInfo.monthAbbrev,
                        title: 'White Days Fasting (Ayyam al-Beed)',
                        sub: `13–15 ${nextWhiteDaysInfo.hijriMonthName} ${nextWhiteDaysInfo.hijriYear} · ${nextWhiteDaysInfo.label}`,
                        event: WHITE_DAYS_EVENT,
                      });
                    }
                    upcomingIslamicEvents.forEach((evt) => {
                      const { dateObj } = evt;
                      const daysAway = Math.round((dateObj - todayDateOnly) / 86400000);
                      const label = daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`;
                      rows.push({
                        key: evt.id,
                        day: String(dateObj.getDate()),
                        month: dateObj.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
                        title: evt.title,
                        sub: `${evt.hijriLabel} · ${label}`,
                        event: evt,
                      });
                    });
                    if (rows.length === 0) {
                      return <Text style={[styles.emptyText, { padding: SPACE.lg }]}>No upcoming events.</Text>;
                    }
                    return rows.map((row, idx) => (
                      <View key={row.key}>
                        {idx > 0 && <View style={styles.insetSeparatorWide} />}
                        <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedEvent(row.event)} style={styles.eventRow}>
                          <View style={styles.dateBadge}>
                            <Text style={styles.dateBadgeDay} numberOfLines={1}>
                              {row.day}
                            </Text>
                            <Text style={styles.dateBadgeMonth}>{row.month}</Text>
                          </View>
                          <View style={styles.flex1}>
                            <Text style={styles.eventTitle} numberOfLines={2}>
                              {row.title}
                            </Text>
                            <Text style={styles.eventSub} numberOfLines={2}>
                              {row.sub}
                            </Text>
                          </View>
                          <Feather name="chevron-right" size={18} color={t.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    ));
                  })()}
                </Card>
              </ScrollView>
            )}

            {/* TAB 4: DAILY AGENDA & SUNNAH TRACKER */}
            {activeTab === 'Agenda' && (
              <ScrollView contentContainerStyle={scrollContentStyle} showsVerticalScrollIndicator={false}>
                <Text style={styles.screenTitle}>Daily Agenda</Text>
                <Text style={styles.screenSubtitle}>Sunnah, nawafil and qada · {locationName}</Text>

                {isSunnahFastingDay && (
                  <Card style={styles.bannerCard} highlight={hexToRgba(t.success, 0.35)}>
                    <IconBadge name="moon" color={t.success} size={34} iconSize={16} />
                    <Text style={styles.bannerText}>
                      It's {todayDateOnly.getDay() === 1 ? 'Monday' : 'Thursday'} — a recommended day for a voluntary Sunnah fast.
                    </Text>
                  </Card>
                )}

                <SectionTitle title="Sunnah & nawafil" />
                <Card style={styles.listCard}>
                  {[
                    { key: 'tahajjud', label: 'Tahajjud prayer', icon: 'moon', window: tahajjudWindow || '--:-- – --:--' },
                    { key: 'duha', label: 'Duha (Chasht) prayer', icon: 'sun', window: duhaWindow },
                    { key: 'dhikr', label: 'Morning & evening adhkar', icon: 'repeat', window: 'After Fajr and after Asr' },
                    ...(!isRamadan
                      ? [{ key: 'roja', label: 'Voluntary fast (Roja)', icon: 'sunset', window: `${seheriInfo.time} – ${maghribTimeStr}` }]
                      : []),
                  ].map((row, idx) => {
                    const checked = !!completedSunnah[row.key];
                    return (
                      <View key={row.key}>
                        {idx > 0 && <View style={styles.insetSeparator} />}
                        <TouchableOpacity activeOpacity={0.7} onPress={() => toggleSunnah(row.key)} style={styles.prayerRow}>
                          <IconBadge name={row.icon} color={t.accent} size={38} iconSize={17} />
                          <View style={styles.flex1}>
                            <Text style={[styles.prayerName, checked && styles.prayerNameDone]} numberOfLines={1}>
                              {row.label}
                            </Text>
                            <Text style={styles.prayerSub} numberOfLines={1}>
                              {row.window}
                            </Text>
                          </View>
                          <CheckCircle checked={checked} onPress={() => toggleSunnah(row.key)} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {isRamadan && (
                    <View>
                      <View style={styles.insetSeparator} />
                      <View style={styles.noteRow}>
                        <Feather name="info" size={15} color={t.accent} />
                        <Text style={styles.noteText}>
                          Obligatory Ramadan fasting is in effect — see the Seheri/Iftar card on the Prayers tab.
                        </Text>
                      </View>
                    </View>
                  )}
                </Card>

                <SectionTitle title="Qada · missed prayers" />
                <Text style={styles.hintText}>
                  Tap + when you miss a prayer, and ✓ each time you make one up. This is a running backlog, so it doesn't reset daily.
                </Text>
                <Card style={styles.listCard}>
                  {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((name, idx) => {
                    const owed = qadaCounts[name] || 0;
                    return (
                      <View key={name}>
                        {idx > 0 && <View style={styles.insetSeparator} />}
                        <View style={styles.prayerRow}>
                          <IconBadge family="mci" name={PRAYER_ICONS[name]} color={t.prayer[name]} size={38} iconSize={19} />
                          <View style={styles.flex1}>
                            <Text style={styles.prayerName}>{name}</Text>
                            <Text style={[styles.prayerSub, owed > 0 && { color: t.accent }]}>
                              {owed === 0 ? 'All caught up' : `${owed} to make up`}
                            </Text>
                          </View>
                          <View style={styles.stepper}>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => adjustQada(name, -1)}
                              disabled={owed === 0}
                              accessibilityLabel={`Made up one ${name}`}
                            >
                              <Feather name="check" size={16} color={owed === 0 ? t.textTertiary : t.success} />
                            </TouchableOpacity>
                            <Text style={styles.stepperValue}>{owed}</Text>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => adjustQada(name, 1)}
                              accessibilityLabel={`Add a missed ${name}`}
                            >
                              <Feather name="plus" size={16} color={t.text} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </Card>

                <SectionTitle title="The Six Kalimas" />
                {kalimas.map((k) => (
                  <Card key={k.id} style={styles.textCard}>
                    <Text style={styles.textCardTitle}>{k.title}</Text>
                    <Text style={styles.arabicText}>{k.arabic}</Text>
                    <View style={styles.textCardDivider} />
                    <Text style={styles.transliterationText}>{k.transliteration}</Text>
                    <Text style={styles.translationText}>{k.translation}</Text>
                  </Card>
                ))}
              </ScrollView>
            )}

            {/* TAB 5: DUAS LIBRARY */}
            {activeTab === 'Duas' && (
              <ScrollView contentContainerStyle={scrollContentStyle} showsVerticalScrollIndicator={false}>
                <View style={styles.screenHeaderRow}>
                  <View style={styles.flex1}>
                    <Text style={styles.screenTitle}>Duas</Text>
                    <Text style={styles.screenSubtitle}>Essential supplications</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.filterChip, showFavoritesOnly && styles.filterChipActive]}
                    onPress={() => {
                      triggerHaptic();
                      setShowFavoritesOnly((v) => !v);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: showFavoritesOnly }}
                  >
                    <Ionicons
                      name={showFavoritesOnly ? 'star' : 'star-outline'}
                      size={14}
                      color={showFavoritesOnly ? t.accent : t.textSecondary}
                    />
                    <Text style={[styles.filterChipText, showFavoritesOnly && { color: t.accent }]}>Favourites</Text>
                  </TouchableOpacity>
                </View>

                {(showFavoritesOnly ? essentialDuas.filter((d) => favoriteDuaIds.includes(d.id)) : essentialDuas).map((dua) => {
                  const fav = favoriteDuaIds.includes(dua.id);
                  return (
                    <Card key={dua.id} style={styles.textCard}>
                      <View style={styles.textCardHeaderRow}>
                        <Text style={styles.textCardEyebrow}>{dua.category}</Text>
                        <TouchableOpacity
                          onPress={() => toggleFavoriteDua(dua.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessibilityLabel={fav ? 'Remove from favourites' : 'Add to favourites'}
                        >
                          <Ionicons name={fav ? 'star' : 'star-outline'} size={20} color={fav ? t.accent : t.textTertiary} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.textCardTitle}>{dua.title}</Text>
                      <Text style={styles.arabicText}>{dua.arabic}</Text>
                      <View style={styles.textCardDivider} />
                      <Text style={styles.transliterationText}>{dua.transliteration}</Text>
                      <Text style={styles.translationText}>{dua.translation}</Text>
                    </Card>
                  );
                })}

                {showFavoritesOnly && essentialDuas.filter((d) => favoriteDuaIds.includes(d.id)).length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="star-outline" size={28} color={t.textTertiary} />
                    <Text style={styles.emptyTitle}>No favourites yet</Text>
                    <Text style={styles.emptyText}>Tap the star on any dua to keep it here.</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* TAB 6: REMINDERS / TASKS (Todoist-style) */}
            {activeTab === 'Tasks' && (
              <ScrollView
                contentContainerStyle={scrollContentStyle}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.screenTitle}>Reminders</Text>
                <Text style={styles.screenSubtitle}>To-dos, chores, anything you don't want to forget</Text>

                <Card style={styles.composerCard}>
                  <TextInput
                    style={styles.input}
                    placeholder="Add a reminder…"
                    placeholderTextColor={t.textTertiary}
                    value={newReminderText}
                    onChangeText={setNewReminderText}
                    onSubmitEditing={addReminder}
                    returnKeyType="done"
                  />
                  <Text style={styles.fieldLabel}>Priority</Text>
                  <View style={styles.chipWrapRow}>
                    {REMINDER_PRIORITIES.map((p) => (
                      <Chip
                        key={p.id}
                        label={p.label}
                        dotColor={t.priority[p.id]}
                        color={t.priority[p.id]}
                        active={newReminderPriority === p.id}
                        onPress={() => {
                          triggerHaptic();
                          setNewReminderPriority(p.id);
                        }}
                      />
                    ))}
                  </View>
                  <Text style={styles.fieldLabel}>Due</Text>
                  <View style={styles.chipWrapRow}>
                    {DUE_DATE_OPTIONS.map((opt) => (
                      <Chip
                        key={opt.id}
                        label={opt.label}
                        icon={opt.id === 'none' ? null : 'calendar'}
                        active={newReminderDueOption === opt.id}
                        onPress={() => {
                          triggerHaptic();
                          setNewReminderDueOption(opt.id);
                        }}
                      />
                    ))}
                  </View>
                  <PrimaryButton
                    label="Add reminder"
                    icon="plus"
                    onPress={addReminder}
                    disabled={!newReminderText.trim()}
                    style={{ marginTop: SPACE.xs }}
                  />
                </Card>

                {reminderGroups.active.length === 0 && reminderGroups.done.length === 0 && (
                  <View style={styles.emptyState}>
                    <Feather name="check-circle" size={28} color={t.textTertiary} />
                    <Text style={styles.emptyTitle}>Nothing here yet</Text>
                    <Text style={styles.emptyText}>Add your first reminder above.</Text>
                  </View>
                )}

                {reminderGroups.active.length > 0 && (
                  <>
                    <SectionTitle title={`Open · ${reminderGroups.active.length}`} />
                    <Card style={styles.listCard}>
                      {reminderGroups.active.map((r, idx) => {
                        const pColor = t.priority[r.priority] || t.priority.medium;
                        const pLabel = (REMINDER_PRIORITIES.find((x) => x.id === r.priority) || REMINDER_PRIORITIES[1]).label;
                        const due = formatReminderDueDate(r.dueDate);
                        return (
                          <View key={r.id}>
                            {idx > 0 && <View style={styles.reminderSeparator} />}
                            <View style={styles.reminderRow}>
                              <CheckCircle checked={false} ringColor={pColor} onPress={() => toggleReminder(r.id)} />
                              <View style={styles.flex1}>
                                <Text style={styles.reminderText}>{r.text}</Text>
                                <View style={styles.reminderMetaRow}>
                                  <View style={[styles.tag, { backgroundColor: hexToRgba(pColor, t.isLight ? 0.1 : 0.16) }]}>
                                    <Text style={[styles.tagText, { color: pColor }]}>{pLabel}</Text>
                                  </View>
                                  {due && (
                                    <View style={styles.dueRow}>
                                      <Feather name="calendar" size={11} color={t.textTertiary} />
                                      <Text style={styles.dueText}>{due}</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                              <TouchableOpacity
                                style={styles.iconBtn}
                                onPress={() => deleteReminder(r.id)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Delete reminder"
                              >
                                <Feather name="trash-2" size={16} color={t.textTertiary} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </Card>
                  </>
                )}

                {reminderGroups.done.length > 0 && (
                  <>
                    <SectionTitle
                      title={`Completed · ${reminderGroups.done.length}`}
                      action={showCompletedReminders ? 'Hide' : 'Show'}
                      onAction={() => setShowCompletedReminders((v) => !v)}
                    />
                    {showCompletedReminders && (
                      <Card style={styles.listCard}>
                        {reminderGroups.done.map((r, idx) => (
                          <View key={r.id}>
                            {idx > 0 && <View style={styles.reminderSeparator} />}
                            <View style={styles.reminderRow}>
                              <CheckCircle checked onPress={() => toggleReminder(r.id)} />
                              <View style={styles.flex1}>
                                <Text style={[styles.reminderText, styles.reminderTextDone]}>{r.text}</Text>
                              </View>
                              <TouchableOpacity
                                style={styles.iconBtn}
                                onPress={() => deleteReminder(r.id)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Delete reminder"
                              >
                                <Feather name="trash-2" size={16} color={t.textTertiary} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </Card>
                    )}
                  </>
                )}
              </ScrollView>
            )}

            {/* TAB 7: SETTINGS - grouped lists, iOS Settings style */}
            {activeTab === 'More' && (
              <ScrollView
                contentContainerStyle={scrollContentStyle}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.screenTitle}>Settings</Text>

                <SectionTitle title="Prayer times" />
                <Card style={styles.groupCard}>
                  <SettingRow
                    isFirst
                    icon="sliders"
                    label="Calculation method"
                    value={CALC_METHOD_LABELS[calcMethod] || calcMethod}
                    onPress={() => {
                      triggerHaptic();
                      setCalcMethod(calcMethod === 'Karachi' ? 'MWL' : calcMethod === 'MWL' ? 'ISNA' : 'Karachi');
                    }}
                  />
                  <SettingRow
                    icon="sun"
                    label="Asr method"
                    value={asrMethod}
                    onPress={() => {
                      triggerHaptic();
                      setAsrMethod(asrMethod === 'Hanafi' ? 'Standard (Shafi)' : 'Hanafi');
                    }}
                  />
                  <SettingRow
                    icon="clock"
                    label="Seheri safety buffer"
                    sublabel="Stop eating this long before Fajr"
                    value={`${safetyBuffer} min`}
                    onPress={() => {
                      triggerHaptic();
                      setSafetyBuffer(safetyBuffer === 5 ? 10 : safetyBuffer === 10 ? 15 : 5);
                    }}
                  />
                </Card>

                <SectionTitle title="Calendar" />
                <Card style={styles.groupCard}>
                  <SettingRow
                    isFirst
                    icon="calendar"
                    label="Hijri date offset"
                    sublabel="Umm al-Qura calendar · adjust for local moon sighting"
                    value={`${hijriOffset >= 0 ? '+' : ''}${hijriOffset} day${Math.abs(hijriOffset) === 1 ? '' : 's'}`}
                    onPress={() => {
                      triggerHaptic();
                      // cycles 0 -> +1 -> +2 -> -2 -> -1 -> 0
                      setHijriOffset(hijriOffset >= 2 ? -2 : hijriOffset + 1);
                    }}
                  />
                </Card>

                <SectionTitle title="Location" />
                <Card style={styles.groupCard}>
                  <SettingRow
                    isFirst
                    icon="navigation"
                    label="Current GPS"
                    sublabel={activeLocationId === 'auto' ? locationName : 'Detect my location automatically'}
                    onPress={selectAutoLocation}
                    right={activeLocationId === 'auto' ? activeBadge : <Text style={styles.useText}>Use</Text>}
                  />
                  {savedLocations.map((loc) => (
                    <SettingRow
                      key={loc.id}
                      icon="map-pin"
                      label={loc.label}
                      onPress={() => selectSavedLocation(loc)}
                      right={
                        <View style={styles.rowActions}>
                          {activeLocationId === loc.id ? activeBadge : <Text style={styles.useText}>Use</Text>}
                          <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => removeSavedLocation(loc.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel={`Remove ${loc.label}`}
                          >
                            <Feather name="x" size={14} color={t.danger} />
                          </TouchableOpacity>
                        </View>
                      }
                    />
                  ))}
                  <SettingRow icon="plus" label="Add a location" sublabel="Home, work, uni…" onPress={openAddLocationModal} />
                </Card>

                <SectionTitle title="Appearance" />
                <Card style={[styles.groupCard, styles.groupCardPadded]}>
                  <Text style={styles.groupCardLabel}>Theme</Text>
                  <Segmented
                    options={THEME_OPTIONS}
                    value={themeMode}
                    onChange={(v) => {
                      triggerHaptic();
                      setThemeMode(v);
                    }}
                  />
                  <Text style={styles.groupCardHint}>
                    The background glow shifts gently with each prayer time in every theme.
                  </Text>
                </Card>

                <SectionTitle title="Notifications & feedback" />
                <Card style={styles.groupCard}>
                  <SettingRow
                    isFirst
                    icon="bell"
                    label="Adhan alerts"
                    sublabel={
                      alertsStatus === 'denied'
                        ? 'Blocked — allow notifications for this app in phone Settings'
                        : alertsStatus === 'unsupported'
                          ? 'Works in the phone app, not the web preview'
                          : alertsStatus === 'error'
                            ? "Couldn't schedule alerts — try toggling off and on"
                            : 'A notification at each prayer time'
                    }
                    right={
                      <Switch
                        value={notificationsEnabled}
                        onValueChange={setNotificationsEnabled}
                        trackColor={switchColors}
                        thumbColor="#FFFFFF"
                        ios_backgroundColor={t.switchTrackOff}
                      />
                    }
                  />
                  <SettingRow
                    icon="moon"
                    label="Fasting & Seheri reminders"
                    sublabel="Seheri & Iftar in Ramadan, plus a heads-up the night before Sunnah fasts"
                    right={
                      <Switch
                        value={fastingAlerts}
                        onValueChange={setFastingAlerts}
                        trackColor={switchColors}
                        thumbColor="#FFFFFF"
                        ios_backgroundColor={t.switchTrackOff}
                      />
                    }
                  />
                  <SettingRow
                    icon="smartphone"
                    label="Vibration haptics"
                    right={
                      <Switch
                        value={hapticsEnabled}
                        onValueChange={setHapticsEnabled}
                        trackColor={switchColors}
                        thumbColor="#FFFFFF"
                        ios_backgroundColor={t.switchTrackOff}
                      />
                    }
                  />
                </Card>

                <SectionTitle title="Backup & restore" />
                <Text style={styles.hintText}>
                  Your settings, prayer and fasting history, reminders and journal live only on this device. Export a backup before switching phones or reinstalling.
                </Text>
                <Card style={styles.groupCard}>
                  <SettingRow isFirst icon="upload" label="Export data" sublabel="Save a .json backup" onPress={exportData} />
                  <SettingRow
                    icon="download"
                    label="Import from file"
                    sublabel="Web only — on a phone, paste below"
                    onPress={importDataFromFile}
                  />
                </Card>
                <Card style={[styles.groupCard, styles.groupCardPadded, { marginTop: SPACE.md }]}>
                  <Text style={styles.groupCardLabel}>Or paste backup JSON</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    placeholder="Paste the exported backup here to restore it…"
                    placeholderTextColor={t.textTertiary}
                    value={importText}
                    onChangeText={(v) => {
                      setImportText(v);
                      setImportStatus('');
                    }}
                    multiline
                    textAlignVertical="top"
                  />
                  <PrimaryButton
                    label="Import data"
                    icon="download"
                    onPress={importData}
                    disabled={!importText.trim()}
                    style={{ marginTop: SPACE.md }}
                  />
                  {!!importStatus && <Text style={styles.importStatusText}>{importStatus}</Text>}
                </Card>
              </ScrollView>
            )}

            {/* EVENT DETAIL SHEET */}
            <Sheet
              visible={selectedEvent !== null}
              onClose={() => setSelectedEvent(null)}
              title={selectedEvent?.title || ''}
              subtitle={selectedEvent?.hijriLabel}
            >
              {selectedEvent ? (
                <>
                  <Text style={styles.sheetBody}>{selectedEvent.importance}</Text>
                  {selectedEvent.virtues?.length > 0 && (
                    <View style={styles.sheetSection}>
                      <Text style={styles.sheetSectionTitle}>Virtues</Text>
                      {selectedEvent.virtues.map((v, i) => (
                        <View key={i} style={styles.bulletRow}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.bulletText}>{v}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {selectedEvent.actions?.length > 0 && (
                    <View style={styles.sheetSection}>
                      <Text style={styles.sheetSectionTitle}>Things to do</Text>
                      {selectedEvent.actions.map((a, i) => (
                        <View key={i} style={styles.bulletRow}>
                          <Feather name="check-circle" size={15} color={t.success} style={styles.bulletIcon} />
                          <Text style={styles.bulletText}>{a}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : null}
            </Sheet>

            {/* ADD LOCATION SHEET - interactive map + GPS capture */}
            <Sheet
              visible={addLocationModalVisible}
              onClose={() => setAddLocationModalVisible(false)}
              title="Save a location"
              scroll={false}
            >
              <Text style={styles.sheetBody}>Tap or drag the pin on the map, or use your current GPS position.</Text>
              <View style={styles.mapWrapper}>
                <WebView
                  key={mapKey}
                  originWhitelist={['*']}
                  source={{
                    html: buildMapHtml(
                      pickedCoords?.latitude ?? coords.latitude,
                      pickedCoords?.longitude ?? coords.longitude,
                      t.surface
                    ),
                  }}
                  onMessage={(event) => {
                    try {
                      const data = JSON.parse(event.nativeEvent.data);
                      setPickedCoords(data);
                    } catch (e) {
                      // ignore malformed message
                    }
                  }}
                  style={styles.mapView}
                />
              </View>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={useDeviceGpsForNewLocation}
                disabled={capturingLocation}
                activeOpacity={0.8}
              >
                {!capturingLocation && <Feather name="navigation" size={15} color={t.accent} />}
                <Text style={styles.secondaryButtonText}>{capturingLocation ? 'Locating…' : 'Use my current GPS'}</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { marginTop: SPACE.md }]}
                placeholder="Name it, e.g. Home, Work, Uni"
                placeholderTextColor={t.textTertiary}
                value={newLocationLabel}
                onChangeText={setNewLocationLabel}
              />
              <PrimaryButton
                label="Save location"
                icon="check"
                onPress={saveNewLocation}
                disabled={!newLocationLabel.trim() || !pickedCoords}
                style={{ marginTop: SPACE.lg }}
              />
            </Sheet>

            {/* CALENDAR JOURNAL SHEET - tap any Hijri-tab date to open this */}
            <Sheet
              visible={journalModalDate !== null}
              onClose={() => setJournalModalDate(null)}
              title={
                journalModalDate
                  ? journalModalDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
                  : ''
              }
              subtitle={
                journalModalDate
                  ? (() => {
                      const h = hijriInfoForDate(journalModalDate);
                      return `${h.day} ${h.monthName} ${h.year} AH`;
                    })()
                  : null
              }
            >
              <View style={styles.journalStatRow}>
                <View style={styles.journalStat}>
                  <Text style={styles.journalStatValue}>
                    {journalModalPrayerSummary.completed}/{journalModalPrayerSummary.total}
                  </Text>
                  <Text style={styles.journalStatLabel}>Prayers logged</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.journalStat, journalDraftFasted && styles.journalStatActive]}
                  onPress={() => {
                    triggerHaptic();
                    setJournalDraftFasted((v) => !v);
                  }}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: journalDraftFasted }}
                >
                  <View style={styles.journalStatValueRow}>
                    <Feather
                      name={journalDraftFasted ? 'check-circle' : 'circle'}
                      size={16}
                      color={journalDraftFasted ? t.success : t.textTertiary}
                    />
                    <Text style={[styles.journalStatValue, journalDraftFasted && { color: t.success }]}>
                      {journalDraftFasted ? 'Fasted' : 'Not fasted'}
                    </Text>
                  </View>
                  <Text style={styles.journalStatLabel}>Tap to change</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Mood</Text>
              <View style={styles.chipWrapRow}>
                {MOOD_OPTIONS.map((m) => (
                  <Chip
                    key={m.id}
                    label={m.label}
                    icon={m.icon}
                    active={journalDraftMood === m.id}
                    onPress={() => {
                      triggerHaptic();
                      setJournalDraftMood(journalDraftMood === m.id ? null : m.id);
                    }}
                  />
                ))}
              </View>

              <Text style={styles.fieldLabel}>Journal</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="How was this day? Anything you want to remember…"
                placeholderTextColor={t.textTertiary}
                value={journalDraftText}
                onChangeText={setJournalDraftText}
                multiline
                textAlignVertical="top"
              />

              <PrimaryButton label="Save entry" icon="check" onPress={saveJournalEntry} style={{ marginTop: SPACE.lg }} />

              {journalModalDate && journalByDay[journalModalDate.toDateString()] && (
                <TouchableOpacity style={styles.destructiveLink} onPress={deleteJournalEntry}>
                  <Feather name="trash-2" size={14} color={t.danger} />
                  <Text style={styles.destructiveLinkText}>Delete this entry</Text>
                </TouchableOpacity>
              )}
            </Sheet>

            {/* Floating bottom navigation */}
            <View style={[styles.navContainer, { bottom: insets.bottom + 10 }]} pointerEvents="box-none">
              <View style={styles.navBar}>
                <BlurView intensity={40} tint={t.isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFillObject} />
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: t.navBg }]} />
                {TABS.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      onPress={() => {
                        if (!active) triggerHaptic();
                        setActiveTab(tab.id);
                      }}
                      style={styles.navItem}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={tab.label}
                    >
                      <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
                        <Feather name={tab.iconName} size={19} color={active ? t.accent : t.textTertiary} />
                      </View>
                      <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </View>
    </ThemeContext.Provider>
  );
}

// The app itself sits inside SafeAreaProvider so every screen, sheet and
// the tab bar can read the device's safe-area insets.
export default function App() {
  return (
    <SafeAreaProvider>
      <PrayerApp />
    </SafeAreaProvider>
  );
}

// All screen styles are built from the active theme tokens (t), the TYPE
// scale, SPACE grid and RADIUS set above - no stray one-off colours.
const buildStyles = (t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bgGradient[0] },
    skyGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: '62%' },
    flex1: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACE.xl },

    // ---- Home hero ------------------------------------------------------
    hero: { alignItems: 'center', paddingTop: SPACE.xs, marginBottom: SPACE.sm },
    heroLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: SPACE.xs,
      paddingHorizontal: 10,
      maxWidth: '100%',
    },
    heroLocationText: { ...TYPE.headline, color: t.text, flexShrink: 1 },
    heroDateText: { ...TYPE.subhead, color: t.textSecondary, marginTop: 2 },
    hijriPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      marginTop: SPACE.md,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: RADIUS.pill,
      backgroundColor: t.accentSoft,
      borderWidth: 1,
      borderColor: t.accentBorder,
    },
    hijriPillText: { ...TYPE.caption, color: t.accent, fontWeight: '600' },
    hijriPillDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: t.accent, opacity: 0.6 },
    hijriPillArabic: { fontSize: 13, lineHeight: 18, color: t.accent, fontWeight: '600', writingDirection: 'rtl' },
    ringWrap: { marginTop: SPACE.lg, alignItems: 'center', justifyContent: 'center' },
    ringEyebrow: { ...TYPE.overline, color: t.textTertiary },
    ringPrayerName: { ...TYPE.title2, color: t.text, marginTop: SPACE.xs },
    ringCountdown: { ...TYPE.display, color: t.text, marginTop: 2 },
    ringTimeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: SPACE.sm,
      paddingHorizontal: SPACE.md,
      paddingVertical: 5,
      borderRadius: RADIUS.pill,
      backgroundColor: t.accentSoft,
    },
    ringTimeChipWarning: { backgroundColor: t.dangerSoft },
    ringTimeText: { ...TYPE.footnote, color: t.accent, fontWeight: '700', fontVariant: ['tabular-nums'] },
    makruhBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      marginTop: SPACE.md,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: RADIUS.md,
      backgroundColor: t.dangerSoft,
    },
    makruhBannerText: { ...TYPE.footnote, color: t.danger, fontWeight: '600', flexShrink: 1 },

    // ---- Banners & info cards -------------------------------------------
    bannerCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: 14, marginTop: SPACE.md },
    bannerTitle: { ...TYPE.headline, color: t.text, flex: 1 },
    bannerMeta: { ...TYPE.footnote, color: t.accent, fontWeight: '700' },
    bannerText: { ...TYPE.subhead, color: t.text, flex: 1 },

    infoCard: { padding: SPACE.lg, marginTop: SPACE.md },
    infoCardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    eyebrow: { ...TYPE.overline, color: t.textTertiary },
    eyebrowAccent: { ...TYPE.overline, color: t.accent },
    infoCardTitle: { ...TYPE.headline, color: t.text, marginTop: 3 },
    infoCardSub: { ...TYPE.footnote, color: t.textSecondary, marginTop: 2 },
    countPill: { paddingHorizontal: SPACE.md, paddingVertical: 6, borderRadius: RADIUS.pill },
    countPillText: { ...TYPE.subhead, fontWeight: '700', fontVariant: ['tabular-nums'] },
    progressTrack: { height: 6, borderRadius: 3, backgroundColor: t.fill, marginTop: 14, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    timePairRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
    timePairCell: { flex: 1 },
    timePairLabel: { ...TYPE.caption, color: t.textTertiary },
    timePairValue: { ...TYPE.headline, color: t.text, marginTop: 2, fontVariant: ['tabular-nums'] },
    timePairDivider: { width: 1, alignSelf: 'stretch', backgroundColor: t.separator, marginHorizontal: SPACE.lg },

    // ---- Lists ----------------------------------------------------------
    listCard: { paddingVertical: 6 },
    listCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      paddingHorizontal: SPACE.lg,
      paddingTop: 10,
      paddingBottom: SPACE.sm,
    },
    progressTrackFlex: { flex: 1, height: 6, borderRadius: 3, backgroundColor: t.fill, overflow: 'hidden' },
    progressFillSuccess: { height: '100%', borderRadius: 3, backgroundColor: t.successFill },
    progressLabel: { ...TYPE.caption, color: t.textSecondary },
    insetSeparator: { height: 1, backgroundColor: t.separator, marginLeft: 66, marginRight: SPACE.lg },
    insetSeparatorWide: { height: 1, backgroundColor: t.separator, marginLeft: 82, marginRight: SPACE.lg },

    prayerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      paddingHorizontal: SPACE.md,
      paddingVertical: 11,
      marginHorizontal: SPACE.xs,
      borderRadius: RADIUS.md,
    },
    prayerRowNext: { backgroundColor: t.accentSoft },
    prayerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    prayerName: { ...TYPE.headline, fontSize: 16, color: t.text, flexShrink: 1 },
    prayerNameDone: { color: t.textTertiary },
    prayerNote: { ...TYPE.caption, color: t.textTertiary, flexShrink: 1 },
    nextChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.pill, backgroundColor: t.accentFill },
    nextChipText: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '800',
      color: t.onAccent,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    prayerSub: { ...TYPE.footnote, color: t.textTertiary, marginTop: 2 },
    prayerTime: { ...TYPE.callout, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] },
    prayerTimeNext: { color: t.accent },

    simpleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      paddingHorizontal: SPACE.md,
      paddingVertical: 11,
      marginHorizontal: SPACE.xs,
      borderRadius: RADIUS.md,
    },
    simpleRowDanger: { backgroundColor: t.dangerSoft },
    simpleRowLabel: { ...TYPE.callout, color: t.text },
    simpleRowLabelGrow: { ...TYPE.callout, color: t.text, flex: 1 },
    simpleRowSub: { ...TYPE.caption, color: t.textTertiary, marginTop: 2, fontWeight: '400' },
    simpleRowValue: { ...TYPE.subhead, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] },
    nowChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.pill, backgroundColor: t.danger },
    nowChipText: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },

    // ---- Screen headers -------------------------------------------------
    screenTitle: { ...TYPE.title1, color: t.text },
    screenSubtitle: { ...TYPE.subhead, color: t.textSecondary, marginTop: SPACE.xs },
    screenHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, marginBottom: SPACE.xl },

    // ---- Qibla ----------------------------------------------------------
    qiblaDialWrap: { alignItems: 'center', marginTop: 28, marginBottom: SPACE.sm },
    qiblaCenter: {
      width: 112,
      height: 112,
      borderRadius: 56,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surfaceRaised,
      borderWidth: 1,
      borderColor: t.border,
    },
    qiblaCenterDeg: { ...TYPE.title1, color: t.accent, fontVariant: ['tabular-nums'] },
    qiblaCenterDir: { ...TYPE.caption, color: t.textSecondary, fontWeight: '700', letterSpacing: 1 },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: SPACE.sm,
      marginTop: 14,
      paddingHorizontal: SPACE.lg,
      paddingVertical: 9,
      borderRadius: RADIUS.pill,
      backgroundColor: t.fill,
      maxWidth: '100%',
    },
    statusPillSuccess: { backgroundColor: t.successSoft },
    statusPillText: { ...TYPE.subhead, fontWeight: '600', flexShrink: 1 },
    qiblaHintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: 6,
      marginTop: 10,
      paddingHorizontal: SPACE.md,
      maxWidth: '100%',
    },
    qiblaHintText: { ...TYPE.footnote, color: t.accent, flexShrink: 1, textAlign: 'center' },
    statsCard: { flexDirection: 'row', paddingVertical: SPACE.lg, paddingHorizontal: SPACE.sm, marginTop: SPACE.lg },
    statBlock: { flex: 1, alignItems: 'center', paddingHorizontal: SPACE.xs },
    statValue: { ...TYPE.title3, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] },
    statLabel: { ...TYPE.caption, color: t.textTertiary, marginTop: SPACE.xs, textAlign: 'center' },
    statSub: { ...TYPE.caption, color: t.textSecondary, marginTop: 1, fontVariant: ['tabular-nums'] },
    statDivider: { width: 1, backgroundColor: t.separator, marginVertical: SPACE.xs },
    footnoteCenter: {
      ...TYPE.footnote,
      color: t.textTertiary,
      textAlign: 'center',
      marginTop: SPACE.md,
      paddingHorizontal: SPACE.md,
    },

    // ---- Calendar -------------------------------------------------------
    monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
    roundIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthNavCenter: { flex: 1, alignItems: 'center' },
    monthTitle: { ...TYPE.title2, color: t.text, textAlign: 'center' },
    monthSubtitle: { ...TYPE.footnote, color: t.accent, fontWeight: '600', marginTop: 6, textAlign: 'center' },
    todayLink: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: 6,
      marginTop: 10,
      paddingHorizontal: SPACE.md,
      paddingVertical: 6,
      borderRadius: RADIUS.pill,
      backgroundColor: t.accentSoft,
    },
    todayLinkText: { ...TYPE.caption, color: t.accent, fontWeight: '700' },
    calendarCard: { marginTop: SPACE.lg, paddingHorizontal: SPACE.sm, paddingTop: SPACE.md, paddingBottom: SPACE.sm },
    weekdaysRow: { flexDirection: 'row', marginBottom: 6 },
    weekdayLabel: { ...TYPE.caption, width: '14.28%', textAlign: 'center', fontWeight: '700', color: t.textTertiary },
    weekdayLabelFriday: { color: t.accent },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarCell: { width: '14.28%', height: 66, alignItems: 'center', paddingTop: SPACE.xs },
    dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    dayCircleToday: { backgroundColor: t.accentFill },
    dayCircleFriday: { borderWidth: 1, borderColor: t.accentBorder },
    dayNumber: { ...TYPE.callout, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] },
    dayNumberToday: { color: t.onAccent, fontWeight: '800' },
    dayNumberPast: { color: t.textTertiary, fontWeight: '500' },
    hijriNumber: { fontSize: 11, lineHeight: 14, color: t.textSecondary, marginTop: 1, fontVariant: ['tabular-nums'] },
    hijriNumberToday: { color: t.accent, fontWeight: '700' },
    hijriNumberPast: { color: t.textTertiary },
    cellDotRow: { flexDirection: 'row', gap: 3, height: 6, marginTop: 3, alignItems: 'center' },
    cellDot: { width: 5, height: 5, borderRadius: 3 },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      columnGap: 14,
      rowGap: 6,
      marginTop: 14,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 7, height: 7, borderRadius: 4 },
    legendText: { ...TYPE.caption, color: t.textSecondary, fontWeight: '500' },

    countdownCard: { padding: 18, marginTop: SPACE.xl },
    countdownHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    countdownTitle: { ...TYPE.title3, color: t.text, marginTop: 6 },
    countdownUnitsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    countdownUnit: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: SPACE.md,
      borderRadius: RADIUS.md,
      backgroundColor: t.fill,
    },
    countdownUnitValue: { ...TYPE.title1, color: t.text, fontVariant: ['tabular-nums'] },
    countdownUnitLabel: { ...TYPE.caption, color: t.textTertiary, marginTop: 2 },
    countdownTodayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
      paddingVertical: 14,
      paddingHorizontal: SPACE.lg,
      borderRadius: RADIUS.md,
      backgroundColor: t.accentSoft,
    },
    countdownTodayText: { ...TYPE.title3, color: t.accent, fontWeight: '700' },
    countdownSub: { ...TYPE.footnote, color: t.textSecondary, marginTop: SPACE.md },

    chipWrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
    summaryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: SPACE.md,
      paddingVertical: 7,
      borderRadius: RADIUS.pill,
      backgroundColor: t.fill,
      marginRight: SPACE.sm,
      marginBottom: SPACE.sm,
    },
    summaryChipText: { ...TYPE.caption, color: t.textSecondary, fontWeight: '600' },

    eventRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: SPACE.md },
    dateBadge: {
      width: 54,
      paddingVertical: SPACE.sm,
      borderRadius: RADIUS.md,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
    },
    dateBadgeDay: { ...TYPE.headline, color: t.accent, fontVariant: ['tabular-nums'] },
    dateBadgeMonth: { fontSize: 10, lineHeight: 12, fontWeight: '800', color: t.accent, letterSpacing: 0.8, marginTop: 1 },
    eventTitle: { ...TYPE.callout, fontWeight: '600', color: t.text },
    eventSub: { ...TYPE.caption, color: t.textTertiary, marginTop: 3, fontWeight: '400' },

    emptyState: { alignItems: 'center', paddingVertical: 36, gap: 6 },
    emptyTitle: { ...TYPE.headline, color: t.textSecondary, marginTop: 6 },
    emptyText: { ...TYPE.footnote, color: t.textTertiary, textAlign: 'center' },

    // ---- Agenda ---------------------------------------------------------
    noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
    noteText: { ...TYPE.footnote, color: t.textSecondary, flex: 1 },
    hintText: { ...TYPE.footnote, color: t.textTertiary, marginBottom: SPACE.md, marginTop: -2, paddingHorizontal: SPACE.xs },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.xs,
      backgroundColor: t.fill,
      borderRadius: RADIUS.pill,
      padding: 3,
    },
    stepperBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surfaceRaised,
    },
    stepperValue: {
      ...TYPE.callout,
      fontWeight: '700',
      color: t.text,
      minWidth: 26,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },

    // ---- Duas & Kalimas -------------------------------------------------
    textCard: { padding: 18, marginBottom: SPACE.md },
    textCardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    textCardEyebrow: { ...TYPE.overline, color: t.accent },
    textCardTitle: { ...TYPE.headline, color: t.text },
    arabicText: { ...TYPE.arabic, color: t.text, marginTop: 14 },
    textCardDivider: { height: 1, backgroundColor: t.separator, marginVertical: 14 },
    transliterationText: { ...TYPE.subhead, fontStyle: 'italic', color: t.textSecondary },
    translationText: { ...TYPE.subhead, lineHeight: 20, color: t.text, marginTop: SPACE.sm },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: RADIUS.pill,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      marginTop: SPACE.xs,
    },
    filterChipActive: { backgroundColor: t.accentSoft, borderColor: t.accentBorder },
    filterChipText: { ...TYPE.footnote, fontWeight: '600', color: t.textSecondary },

    // ---- Reminders ------------------------------------------------------
    composerCard: { padding: SPACE.lg, marginTop: SPACE.xl },
    input: {
      ...TYPE.body,
      color: t.text,
      backgroundColor: t.fill,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: SPACE.md,
      minHeight: 48,
      borderWidth: 1,
      borderColor: t.border,
    },
    inputMultiline: { minHeight: 110, paddingTop: SPACE.md },
    fieldLabel: { ...TYPE.overline, color: t.textTertiary, marginTop: SPACE.lg, marginBottom: SPACE.sm },
    reminderSeparator: { height: 1, backgroundColor: t.separator, marginLeft: 56, marginRight: SPACE.lg },
    reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
    reminderText: { ...TYPE.body, fontWeight: '500', color: t.text },
    reminderTextDone: { color: t.textTertiary, textDecorationLine: 'line-through', fontWeight: '400' },
    reminderMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    tag: { paddingHorizontal: SPACE.sm, paddingVertical: 2, borderRadius: RADIUS.pill },
    tagText: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
    dueRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
    dueText: { ...TYPE.caption, color: t.textTertiary },
    iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

    // ---- Settings -------------------------------------------------------
    groupCard: { paddingVertical: 2 },
    groupCardPadded: { paddingVertical: SPACE.lg, paddingHorizontal: SPACE.lg },
    groupCardLabel: { ...TYPE.overline, color: t.textTertiary, marginBottom: 10 },
    groupCardHint: { ...TYPE.caption, color: t.textTertiary, marginTop: 10, fontWeight: '400' },
    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.xs,
      paddingHorizontal: 9,
      paddingVertical: SPACE.xs,
      borderRadius: RADIUS.pill,
      backgroundColor: t.successSoft,
    },
    activeBadgeText: { ...TYPE.caption, color: t.success, fontWeight: '700' },
    useText: { ...TYPE.subhead, color: t.accent, fontWeight: '600' },
    rowActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    removeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.dangerSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    importStatusText: { ...TYPE.footnote, color: t.textSecondary, marginTop: 10, textAlign: 'center' },

    // ---- Sheets ---------------------------------------------------------
    sheetBody: { ...TYPE.subhead, lineHeight: 21, color: t.textSecondary, marginTop: SPACE.xs },
    sheetSection: { marginTop: SPACE.xl },
    sheetSectionTitle: { ...TYPE.overline, color: t.accent, marginBottom: 10 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.accent, marginTop: 7 },
    bulletIcon: { marginTop: 2 },
    bulletText: { ...TYPE.subhead, lineHeight: 20, color: t.text, flex: 1 },
    mapWrapper: {
      height: 220,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      marginTop: 14,
      borderWidth: 1,
      borderColor: t.border,
    },
    mapView: { flex: 1 },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACE.sm,
      marginTop: SPACE.md,
      minHeight: 48,
      borderRadius: RADIUS.md,
      backgroundColor: t.accentSoft,
    },
    secondaryButtonText: { ...TYPE.callout, color: t.accent, fontWeight: '700' },
    journalStatRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    journalStat: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: RADIUS.md,
      backgroundColor: t.fill,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    journalStatActive: { backgroundColor: t.successSoft, borderColor: hexToRgba(t.success, 0.4) },
    journalStatValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    journalStatValue: { ...TYPE.headline, color: t.text },
    journalStatLabel: { ...TYPE.caption, color: t.textTertiary, marginTop: SPACE.xs },
    destructiveLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 14,
      paddingVertical: 10,
    },
    destructiveLinkText: { ...TYPE.subhead, color: t.danger, fontWeight: '600' },

    // ---- Bottom navigation ----------------------------------------------
    navContainer: {
      position: 'absolute',
      left: SPACE.md,
      right: SPACE.md,
      borderRadius: 26,
      ...t.cardShadow,
      shadowOpacity: t.isLight ? 0.12 : 0.45,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 26,
      borderWidth: 1,
      borderColor: t.border,
      paddingVertical: SPACE.sm,
      paddingHorizontal: SPACE.xs,
      overflow: 'hidden',
    },
    navItem: { flex: 1, alignItems: 'center', paddingVertical: 2 },
    navIconWrap: { width: 42, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    navIconWrapActive: { backgroundColor: t.accentSoft },
    navLabel: { ...TYPE.tab, color: t.textTertiary, marginTop: 3 },
    navLabelActive: { color: t.accent, fontWeight: '700' },
  });
