// Language helper for the important days. All text lives in events.js with
// en/bn side by side.
import { NOTE } from './events';

const pick = (v, lang) => (v ? v[lang === 'bn' ? 'bn' : 'en'] || v.en : null);

export function eventText(evt, lang) {
  return {
    title: pick(evt.title, lang),
    line: pick(evt.line, lang),
    todo: evt.todo ? pick(evt.todo, lang) : [],
    history: pick(evt.history, lang),
    weakNote: pick(evt.weakNote, lang),
    note: evt.note ? pick(NOTE[evt.note], lang) : null,
  };
}

export const eventTitle = (evt, lang) => pick(evt.title, lang);

// A hadith quote in the chosen language. In Bangla the English is shown when
// no trusted Bangla translation is available (flagged with `untranslated`).
export function hadithText(hd, lang) {
  if (lang === 'bn' && hd.bn) return { text: hd.bn, untranslated: false, hisn: hd.bnSrc === 'hisn' };
  return { text: hd.en, untranslated: lang === 'bn', hisn: false };
}

// Hadith reference in the chosen language ("Sahih Muslim 1162" -> "সহীহ মুসলিম ১১৬২").
const BOOKS_BN = [
  ['Sahih al-Bukhari', 'সহীহ বুখারী'],
  ['Sahih Muslim', 'সহীহ মুসলিম'],
  ['Sunan Ibn Majah', 'সুনানে ইবনে মাজাহ'],
  ['Jami’ at-Tirmidhi', 'জামে তিরমিযী'],
  ['(graded hasan by al-Albani)', '(আলবানীর মতে হাসান)'],
];
export function refText(ref, lang) {
  if (lang !== 'bn') return ref;
  let s = ref;
  BOOKS_BN.forEach(([en, bn]) => { s = s.split(en).join(bn); });
  return s.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
}
