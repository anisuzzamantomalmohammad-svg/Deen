// "Today" card: a short checklist of what to do today, based on the day.
// Each item has its source. Ticks for duha / tahajjud / dhikr / fast are the
// same ticks as in Ibadah, so ticking in one place ticks in both.
//   tick: 'sunnah:<key>' (Ibadah sunnah ticks) | 'fast' | 'today:<id>' (own)

const I = {
  adhkar: { id: 'adhkar', tick: 'sunnah:dhikr', en: 'Morning and evening adhkar', bn: 'সকাল-সন্ধ্যার যিকির', ref: 'Hisnul Muslim' },
  duha: { id: 'duha', tick: 'sunnah:duha', en: 'Pray Duha, even 2 rak’ahs', bn: 'চাশতের নামাজ, দুই রাকাত হলেও', ref: 'Muslim 720' },
  quran: { id: 'quran', tick: 'today:quran', en: 'Read some Quran', bn: 'কিছু কুরআন পড়ুন', ref: 'Muslim 804' },
  istighfar: { id: 'istighfar', tick: 'today:istighfar', en: 'Ask Allah for forgiveness 100 times', bn: '১০০ বার ইস্তিগফার', ref: 'Muslim 2702' },
  kahf: { id: 'kahf', tick: 'today:kahf', en: 'Read Surah Al-Kahf before Maghrib', bn: 'মাগরিবের আগে সূরা কাহফ পড়ুন', ref: 'al-Hakim · al-Bayhaqi' },
  salawat: { id: 'salawat', tick: 'today:salawat', en: 'Send lots of salawat on the Prophet ﷺ', bn: 'বেশি বেশি দরুদ পড়ুন', ref: 'Abu Dawud 1047' },
  ghusl: { id: 'ghusl', tick: 'today:ghusl', en: 'Ghusl before Jumu’ah', bn: 'জুমার আগে গোসল', ref: 'Bukhari 877' },
  lastHour: { id: 'lastHour', tick: 'today:lastHour', en: 'Make dua in the last hour before Maghrib', bn: 'মাগরিবের আগের শেষ ঘণ্টায় দোয়া', ref: 'Abu Dawud 1048' },
  fastSunnah: { id: 'fast', tick: 'fast', en: 'Sunnah fast today', bn: 'আজ সুন্নত রোজা', ref: 'Tirmidhi 747' },
  fastWhite: { id: 'fast', tick: 'fast', en: 'Fast the White Day', bn: 'আইয়ামে বীযের রোজা', ref: 'Nasa’i 2420' },
  fastArafah: { id: 'fast', tick: 'fast', en: 'Fast the Day of Arafah', bn: 'আরাফার দিনের রোজা', ref: 'Muslim 1162' },
  fastAshura: { id: 'fast', tick: 'fast', en: 'Fast Ashura (with the 9th or 11th)', bn: 'আশুরার রোজা (৯ বা ১১ তারিখসহ)', ref: 'Muslim 1162 · 1134' },
  dhikr10: { id: 'dhikr10', tick: 'today:dhikr10', en: 'Say lots of takbir, tahlil and tahmid', bn: 'বেশি বেশি তাকবির, তাহলিল ও তাহমিদ', ref: 'Bukhari 969' },
  goodDeeds: { id: 'goodDeeds', tick: 'today:goodDeeds', en: 'Do extra good deeds: the best days of the year', bn: 'বেশি বেশি নেক আমল: বছরের শ্রেষ্ঠ দিন', ref: 'Bukhari 969' },
  qurbaniNails: { id: 'nails', tick: 'today:nails', en: 'Giving Qurbani? Leave hair and nails until after it', bn: 'কুরবানি দিলে চুল-নখ কাটা পরে', ref: 'Muslim 1977' },
  ramadanFast: { id: 'fast', tick: 'fast', en: 'Keep today’s fast', bn: 'আজকের রোজা', ref: 'Quran 2:183' },
  taraweeh: { id: 'taraweeh', tick: 'today:taraweeh', en: 'Pray Taraweeh tonight', bn: 'আজ রাতে তারাবি', ref: 'Bukhari 2009' },
  charity: { id: 'charity', tick: 'today:charity', en: 'Give some charity', bn: 'কিছু দান করুন', ref: 'Bukhari 6' },
  qadr: { id: 'qadr', tick: 'today:qadr', en: 'Seek Laylat al-Qadr: pray, read and make dua', bn: 'লাইলাতুল কদর তালাশ: নামাজ, তিলাওয়াত, দোয়া', ref: 'Bukhari 2017' },
  travelDua: { id: 'travelDua', tick: 'today:travelDua', en: 'Say the travel dua when you set off', bn: 'যাত্রার শুরুতে সফরের দোয়া পড়ুন', ref: 'Muslim 1342', dua: 71 },
  tahajjud: { id: 'tahajjud', tick: 'sunnah:tahajjud', en: 'Pray Tahajjud in the last third of the night', bn: 'রাতের শেষ তৃতীয়াংশে তাহাজ্জুদ', ref: 'Bukhari 1145' },
};

// The day's list. `h` is the Hijri date, `wd` the weekday (5 = Friday).
export function todayItems({ h, wd, safar }) {
  const m = h.monthIndex;
  const d = h.day;
  if (safar) return [I.travelDua, I.adhkar, I.quran];
  if (m === 8) {
    const list = [I.ramadanFast, I.taraweeh, I.quran, I.charity];
    if (d >= 20) list.push(I.qadr);
    return list;
  }
  if (m === 11 && d >= 1 && d <= 10) {
    const list = [I.dhikr10, I.goodDeeds];
    if (d === 9) list.unshift(I.fastArafah);
    else if (d < 9) list.push(I.qurbaniNails);
    return list;
  }
  if (m === 0 && (d === 9 || d === 10)) return [I.fastAshura, I.adhkar, I.quran];
  const list = [];
  if (wd === 5) list.push(I.kahf, I.ghusl, I.salawat, I.lastHour);
  if (d >= 13 && d <= 15) list.push(I.fastWhite);
  else if (wd === 1 || wd === 4) list.push(I.fastSunnah);
  if (wd !== 5) list.push(I.adhkar, I.duha, I.quran);
  return list.slice(0, 4);
}

export const TODAY_ITEMS = I;
