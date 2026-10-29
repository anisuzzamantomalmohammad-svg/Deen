import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bnDigits } from '../i18n';
import { HIJRI_MONTHS, HIJRI_MONTHS_AR, HIJRI_MONTHS_BN } from '../lib/hijri';

// Re-render every `ms` milliseconds, aligned to the clock's second.
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id;
    const start = setTimeout(() => {
      setNow(new Date());
      id = setInterval(() => setNow(new Date()), ms);
    }, ms - (Date.now() % ms));
    return () => {
      clearTimeout(start);
      clearInterval(id);
    };
  }, [ms]);
  return now;
}

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return { width: Math.min(width, 560), height, insets, pad: 18, bottomSpace: insets.bottom + 96 };
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_BN = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
export const WEEK_LETTERS = { en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], bn: ['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ'] };
export const WEEK_SHORT = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'] };

const num = (lang, n) => (lang === 'bn' ? bnDigits(n) : String(n));
export const monthName = (lang, m) => (lang === 'bn' ? MONTHS_BN[m] : MONTHS_EN[m]);
export const monthShort = (lang, m) => (lang === 'bn' ? MONTHS_BN[m] : MONTHS_EN[m].slice(0, 3));
export const dayName = (lang, d) => (lang === 'bn' ? DAYS_BN[d] : DAYS_EN[d]);

// "Tuesday, 20 October" / "মঙ্গলবার, ২০ অক্টোবর"
export function longDate(lang, date, withYear) {
  return `${dayName(lang, date.getDay())}, ${num(lang, date.getDate())} ${monthName(lang, date.getMonth())}${withYear ? ` ${num(lang, date.getFullYear())}` : ''}`;
}
export function shortDate(lang, date) {
  return `${(lang === 'bn' ? WEEK_SHORT.bn : WEEK_SHORT.en)[date.getDay()]} ${num(lang, date.getDate())} ${monthShort(lang, date.getMonth())}`;
}
export function hijriMonthName(lang, i) {
  return lang === 'bn' ? HIJRI_MONTHS_BN[i] : HIJRI_MONTHS[i];
}
export function hijriLabel(lang, h, withYear = true) {
  if (lang === 'bn') return `${num(lang, h.day)} ${HIJRI_MONTHS_BN[h.monthIndex]}${withYear ? ` ${num(lang, h.year)} হিজরি` : ''}`;
  return `${h.day} ${HIJRI_MONTHS[h.monthIndex]}${withYear ? ` ${h.year} AH` : ''}`;
}
export { HIJRI_MONTHS_AR };

// "1h 21m" when an hour or more is left, otherwise "13m 02s".
export function countdownText(t, ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return t('{h}h {m}m', { h, m });
  return t('{m}m {s}s', { m, s: t.lang === 'bn' ? bnDigits(String(s).padStart(2, '0')) : String(s).padStart(2, '0') });
}
export function mmss(t, ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const s = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  return t.lang === 'bn' ? bnDigits(s) : s;
}
export function shortDuration(t, ms) {
  const total = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? t('{h}h {m}m', { h, m }) : t('{m} min', { m });
}

// Time of day in the location's zone, with Bangla digits when needed.
import { formatTime } from '../lib/prayer';
export function timeStr(t, date, tz, compact) {
  const s = formatTime(date, tz, { compact });
  return t.lang === 'bn' ? bnDigits(s) : s;
}
