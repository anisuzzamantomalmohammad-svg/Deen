// Very small translation layer. The English text itself is the key, so a
// missing Bangla line simply falls back to English instead of breaking.
import BN from './bn';

const DIGITS_BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const bnDigits = (s) => String(s).replace(/[0-9]/g, (d) => DIGITS_BN[d]);

export function translate(lang, key, vars) {
  let s = key;
  if (lang === 'bn' && BN[key]) s = BN[key];
  else if (key.startsWith('fast:')) s = EN_FAST[key] || key;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      const v = vars[k];
      s = s.split(`{${k}}`).join(lang === 'bn' && typeof v === 'number' ? bnDigits(v) : String(v));
    });
  }
  return s;
}

const EN_FAST = {
  'fast:ramadan': 'a Ramadan fast',
  'fast:arafah': 'the Day of Arafah',
  'fast:ashura': 'the Day of Ashura',
  'fast:tasua': 'Tasu‘a, the day before Ashura',
  'fast:white': 'a White Day (13th–15th of the month)',
  'fast:monday': 'Monday, a Sunnah fast',
  'fast:thursday': 'Thursday, a Sunnah fast',
};
