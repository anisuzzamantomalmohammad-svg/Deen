// Language switch for the dua library. Arabic and transliteration never
// change. In Bangla, titles are Bangla app labels; meanings are Bangla only
// where a trusted published translation is available (see duas_bn.js),
// otherwise the English meaning is shown and flagged.
import { DUAS_BN, CATEGORIES_BN, QURAN_BN_CREDIT, HISN_BN_CREDIT } from './duas_bn';

export function duaText(d, lang) {
  if (lang === 'bn') {
    const b = DUAS_BN[d.id] || {};
    const has = !!b.translation;
    return {
      title: b.title || d.title,
      translation: has ? b.translation : d.translation,
      note: d.note,
      credit: has ? (b.src === 'hisn' ? HISN_BN_CREDIT : QURAN_BN_CREDIT) : null,
      untranslated: !has,
    };
  }
  return { title: d.title, translation: d.translation, note: d.note, credit: null, untranslated: false };
}

export function categoryName(cat, lang) {
  return lang === 'bn' && CATEGORIES_BN[cat] ? CATEGORIES_BN[cat] : cat;
}
