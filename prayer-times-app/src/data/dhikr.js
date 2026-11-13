// Daily dhikr: set counts from the Sunnah, grouped by time of day.
// Texts are the app's own checked duas (duas.js) or the Quran text, so each
// one can be opened with its pronunciation and meaning.
//
// kind:
//   count  one phrase, `n` times
//   seq    several phrases in a row (steps: [{ phrase, n }])
//   read   recite something `n` times (Quran passage), counted by rounds
// perPrayer: done once after each of the 5 prayers (a dot per prayer).

export const PHRASE = {
  subhan: { ar: 'سُبْحَانَ اللَّهِ', en: 'SubhanAllah', bn: 'সুবহানাল্লাহ' },
  hamd: { ar: 'الْحَمْدُ لِلَّهِ', en: 'Alhamdulillah', bn: 'আলহামদুলিল্লাহ' },
  akbar: { ar: 'اللَّهُ أَكْبَرُ', en: 'Allahu Akbar', bn: 'আল্লাহু আকবার' },
  tahlilFull: { ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', en: 'La ilaha illallahu wahdahu la sharika lah…', bn: 'লা ইলাহা ইল্লাল্লাহু ওয়াহদাহু লা শারিকা লাহু…', tr: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu, wa huwa ‘ala kulli shay’in qadir' },
  bihamdihi: { ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', en: 'SubhanAllahi wa bihamdihi', bn: 'সুবহানাল্লাহি ওয়া বিহামদিহি' },
  istighfar: { ar: 'أَسْتَغْفِرُ اللَّهَ', en: 'Astaghfirullah', bn: 'আস্তাগফিরুল্লাহ' },
  durud: { ar: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', en: 'Durud Sharif', bn: 'দরুদ শরিফ', tr: 'Allahumma salli wa sallim ‘ala nabiyyina Muhammad' },
  quls: { ar: 'قُلْ هُوَ اللَّهُ · قُلْ أَعُوذُ', en: '3 Quls', bn: 'তিন কুল' },
  kursi: { ar: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ', en: 'Ayat al-Kursi', bn: 'আয়াতুল কুরসি' },
};

// Quran passages for "Show the surahs": [surah, fromAyah, toAyah].
export const PASSAGES = {
  quls: [[112, 1, 4], [113, 1, 5], [114, 1, 6]],
  kursi: [[2, 255, 255]],
};

export const DHIKR_GROUPS = [
  { id: 'morning', en: 'Morning · after Fajr', bn: 'সকাল · ফজরের পর' },
  { id: 'prayer', en: 'After each prayer', bn: 'প্রতি নামাজের পর' },
  { id: 'any', en: 'Any time of day', bn: 'দিনের যেকোনো সময়' },
  { id: 'evening', en: 'Evening · after Asr', bn: 'সন্ধ্যা · আসরের পর' },
  { id: 'sleep', en: 'Before sleeping', bn: 'ঘুমানোর আগে' },
];

export const DHIKR = [
  { id: 'qulsM', group: 'morning', kind: 'read', phrase: 'quls', n: 3, passage: 'quls', sub: { en: 'Ikhlas, Falaq, Nas · 3 times', bn: 'ইখলাস, ফালাক, নাস · ৩ বার' }, ref: 'Abu Dawud 5082 · Tirmidhi 3575' },
  { id: 'durudM', group: 'morning', kind: 'count', phrase: 'durud', n: 10, dua: 163, sub: { en: '10 times', bn: '১০ বার' }, ref: 'at-Tabarani', note: 'differ' },

  { id: 'tasbihP', group: 'prayer', kind: 'seq', perPrayer: true, dua: 51, title: { en: 'Tasbih after prayer', bn: 'নামাজের পরের তাসবিহ' },
    steps: [{ phrase: 'subhan', n: 33 }, { phrase: 'hamd', n: 33 }, { phrase: 'akbar', n: 33 }, { phrase: 'tahlilFull', n: 1 }],
    sub: { en: 'SubhanAllah 33 · Alhamdulillah 33 · Allahu Akbar 33 · La ilaha illallah… 1', bn: 'সুবহানাল্লাহ ৩৩ · আলহামদুলিল্লাহ ৩৩ · আল্লাহু আকবার ৩৩ · লা ইলাহা ইল্লাল্লাহ… ১' }, ref: 'Sahih Muslim 597' },
  { id: 'kursiP', group: 'prayer', kind: 'read', perPrayer: true, phrase: 'kursi', n: 1, passage: 'kursi', sub: { en: 'Once after each fard', bn: 'প্রতি ফরজের পর একবার' }, ref: 'an-Nasa’i, al-Kubra 9928' },
  { id: 'qulsP', group: 'prayer', kind: 'read', perPrayer: true, phrase: 'quls', n: 1, passage: 'quls', sub: { en: 'Once each after each prayer', bn: 'প্রতি নামাজের পর একবার করে' }, ref: 'Abu Dawud 1523' },

  { id: 'bihamdihi', group: 'any', kind: 'count', phrase: 'bihamdihi', n: 100, dua: 28, sub: { en: '100 times', bn: '১০০ বার' }, ref: 'Bukhari 6405' },
  { id: 'tahlil100', group: 'any', kind: 'count', phrase: 'tahlilFull', n: 100, dua: 29, sub: { en: '100 times', bn: '১০০ বার' }, ref: 'Bukhari 3293' },
  { id: 'istighfar', group: 'any', kind: 'count', phrase: 'istighfar', n: 100, sub: { en: '100 times', bn: '১০০ বার' }, ref: 'Sahih Muslim 2702' },

  { id: 'qulsE', group: 'evening', kind: 'read', phrase: 'quls', n: 3, passage: 'quls', sub: { en: 'Ikhlas, Falaq, Nas · 3 times', bn: 'ইখলাস, ফালাক, নাস · ৩ বার' }, ref: 'Abu Dawud 5082 · Tirmidhi 3575' },
  { id: 'durudE', group: 'evening', kind: 'count', phrase: 'durud', n: 10, dua: 163, sub: { en: '10 times', bn: '১০ বার' }, ref: 'at-Tabarani', note: 'differ' },

  { id: 'fatimah', group: 'sleep', kind: 'seq', dua: 34, title: { en: 'Tasbih of Fatimah', bn: 'ফাতিমা (রা.)-এর তাসবিহ' },
    steps: [{ phrase: 'subhan', n: 33 }, { phrase: 'hamd', n: 33 }, { phrase: 'akbar', n: 34 }],
    sub: { en: 'SubhanAllah 33 · Alhamdulillah 33 · Allahu Akbar 34', bn: 'সুবহানাল্লাহ ৩৩ · আলহামদুলিল্লাহ ৩৩ · আল্লাহু আকবার ৩৪' }, ref: 'Bukhari 3705' },
  { id: 'qulsS', group: 'sleep', kind: 'read', phrase: 'quls', n: 3, passage: 'quls', title: { en: '3 Quls into your hands', bn: 'হাতে তিন কুল' },
    sub: { en: 'Read, blow into your hands, wipe over the body · 3 times', bn: 'পড়ে হাতে ফুঁ দিয়ে শরীরে মাসেহ · ৩ বার' }, ref: 'Bukhari 5017' },
  { id: 'kursiS', group: 'sleep', kind: 'read', phrase: 'kursi', n: 1, passage: 'kursi', sub: { en: 'Once', bn: 'একবার' }, ref: 'Bukhari 2311' },
];

export const dhikrTotal = (d) => (d.kind === 'seq' ? d.steps.reduce((a, s) => a + s.n, 0) : d.n);
export const dhikrTitle = (d, lang) => (d.title ? d.title[lang === 'bn' ? 'bn' : 'en'] : PHRASE[d.phrase][lang === 'bn' ? 'bn' : 'en']);

// Which group fits the time now: morning Fajr–Dhuhr, evening Asr–Isha, sleep after Isha.
export function dhikrGroupNow(times, now) {
  if (!times) return null;
  if (now >= times.Fajr && now < times.Dhuhr) return 'morning';
  if (now >= times.Asr && now < times.Isha) return 'evening';
  if (now >= times.Isha || now < times.Fajr) return 'sleep';
  return null;
}
