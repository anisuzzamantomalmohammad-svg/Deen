// Important days of the Hijri year (monthIndex 0 = Muharram ... 11 = Dhul Hijjah).
//
// Each day has:
//   kind   fast | night | eid | hajj | sacred | day | history | custom
//   hijri  { monthIndex, day } (or days: [..] for several days, span: n for a run)
//   rule   for days that aren't a fixed date (last Friday of Ramadan, ...)
//   line   one short plain sentence: what the day is (en / bn)
//   quran  a key into EVENT_QURAN (verse quoted word for word)
//   hadith quotes, word for word, with their reference. English is from the
//          standard published translations (Muhsin Khan for Bukhari, Abdul
//          Hamid Siddiqui for Muslim, sunnah.com wording for the Sunan).
//          bn is only filled in where Hisnul Muslim (tr. Dr. Abu Bakr Muhammad
//          Zakaria) has the same hadith; otherwise the English is shown.
//   todo   short things to do, each tied to the quote above it
//   note   a label for days with a weak basis, no basis, or an uncertain date
//   alert  true = remind the day before (only the main days)
//
// Laylat al-Raghaib (first Thursday night of Rajab) is left out on purpose:
// the hadith about it is fabricated.

export const NOTE = {
  weak: { en: 'Weak hadith', bn: 'দুর্বল হাদিস' },
  noBasis: { en: 'No basis in the Quran or Sunnah', bn: 'কুরআন-সুন্নাহয় ভিত্তি নেই' },
  approx: { en: 'Date is approximate', bn: 'তারিখ আনুমানিক' },
  differ: { en: 'Scholars differ', bn: 'আলেমদের মতভেদ আছে' },
};

export const WHITE_DAYS_EVENT = {
  id: 'white-days',
  kind: 'fast',
  title: { en: 'Ayyam al-Beed (White Days)', bn: 'আইয়ামে বীজ (শুভ্র দিনগুলো)' },
  line: {
    en: 'The 13th, 14th and 15th of every Hijri month, when the moon is full.',
    bn: 'প্রতি হিজরি মাসের ১৩, ১৪ ও ১৫ তারিখ, যখন চাঁদ পূর্ণ থাকে।',
  },
  todo: { en: ['Fast these three days.'], bn: ['এই তিন দিন রোজা রাখুন।'] },
  hadith: [
    {
      ref: 'Sahih Muslim 1162',
      en: 'Three days’ fasting every month and of the whole of Ramadan every year is a perpetual fast.',
    },
  ],
};

export const ISLAMIC_EVENTS = [
  /* ------------------------------ Muharram ------------------------------ */
  {
    id: 'new-year',
    kind: 'sacred',
    alert: true,
    hijri: { monthIndex: 0, day: 1 },
    title: { en: 'Islamic New Year', bn: 'হিজরি নববর্ষ' },
    line: {
      en: 'The first day of Muharram, one of the four sacred months.',
      bn: 'মুহাররমের প্রথম দিন। মুহাররম চারটি সম্মানিত মাসের একটি।',
    },
    quran: 'sacred',
    hadith: [
      {
        ref: 'Sahih Muslim 1163',
        en: 'The most excellent fast after Ramadan is God’s month, al-Muharram, and the most excellent prayer after what is prescribed is prayer during the night.',
      },
    ],
    todo: { en: ['Fast some days this month.'], bn: ['এ মাসে কিছু রোজা রাখুন।'] },
  },
  {
    id: 'tasua',
    kind: 'fast',
    hijri: { monthIndex: 0, day: 9 },
    title: { en: 'Tasu’a (9 Muharram)', bn: 'তাসুআ (৯ মুহাররম)' },
    line: {
      en: 'The day before Ashura. The Prophet ﷺ said he would fast the 9th as well (Sahih Muslim 1134).',
      bn: 'আশুরার আগের দিন। নবী ﷺ ৯ তারিখেও রোজা রাখার কথা বলেছিলেন (সহীহ মুসলিম ১১৩৪)।',
    },
    todo: { en: ['Fast the 9th together with the 10th.'], bn: ['১০ তারিখের সাথে ৯ তারিখেও রোজা রাখুন।'] },
  },
  {
    id: 'ashura',
    kind: 'fast',
    alert: true,
    hijri: { monthIndex: 0, day: 10 },
    title: { en: 'Day of Ashura', bn: 'আশুরার দিন' },
    line: {
      en: 'The 10th of Muharram, the day Allah saved Musa (AS) from Pharaoh.',
      bn: 'মুহাররমের ১০ তারিখ, যেদিন আল্লাহ মূসা (আ.)-কে ফেরাউন থেকে রক্ষা করেন।',
    },
    hadith: [
      {
        ref: 'Sahih Muslim 1162',
        en: 'He was asked about fasting on the day of ‘Ashura (10th of Muharram), whereupon he said: It expiates the sins of the preceding year.',
      },
    ],
    todo: { en: ['Fast the 10th, with the 9th (or the 11th).'], bn: ['১০ তারিখে রোজা রাখুন, সাথে ৯ (বা ১১) তারিখে।'] },
    history: {
      en: 'Karbala: on 10 Muharram 61 AH, Husayn ibn Ali (RA), the Prophet’s ﷺ grandson, was martyred at Karbala.',
      bn: 'কারবালা: ৬১ হিজরির ১০ মুহাররম নবী ﷺ-এর নাতি হুসাইন ইবনে আলী (রা.) কারবালায় শহীদ হন।',
    },
  },

  /* -------------------------------- Safar -------------------------------- */
  {
    id: 'akhiri-chahar-shamba',
    kind: 'custom',
    rule: 'lastWednesdayOfSafar',
    note: 'noBasis',
    title: { en: 'Akhiri Chahar Shamba', bn: 'আখেরি চাহার শোম্বা' },
    line: {
      en: 'The last Wednesday of Safar, marked in South Asia as the day the Prophet ﷺ recovered from his last illness. There is no authentic report for it.',
      bn: 'সফর মাসের শেষ বুধবার। দক্ষিণ এশিয়ায় নবী ﷺ-এর শেষ অসুস্থতা থেকে সেরে ওঠার দিন হিসেবে পালিত হয়। এর কোনো সহীহ বর্ণনা নেই।',
    },
  },

  /* ---------------------------- Rabi al-Awwal ---------------------------- */
  {
    id: 'hijrah-arrival',
    kind: 'history',
    hijri: { monthIndex: 2, day: 8 },
    note: 'approx',
    title: { en: 'Arrival in Madinah (Hijrah)', bn: 'মদিনায় আগমন (হিজরত)' },
    line: {
      en: 'The Prophet ﷺ reached Quba near Madinah in Rabi al-Awwal, 1 AH. Sources give different days.',
      bn: '১ হিজরির রবিউল আউয়ালে নবী ﷺ মদিনার কাছে কুবায় পৌঁছান। দিন নিয়ে বর্ণনায় ভিন্নতা আছে।',
    },
  },
  {
    id: 'mawlid-nabi',
    kind: 'day',
    hijri: { monthIndex: 2, day: 12 },
    note: 'differ',
    title: { en: 'Mawlid un-Nabi · the Prophet’s ﷺ passing', bn: 'মিলাদুন্নবী · নবী ﷺ-এর ওফাত' },
    line: {
      en: '12 Rabi al-Awwal is the date most often given for the Prophet’s ﷺ birth and for his passing in 11 AH. Scholars differ on marking the birthday.',
      bn: '১২ রবিউল আউয়াল নবী ﷺ-এর জন্ম ও ১১ হিজরিতে তাঁর ওফাতের বহুল প্রচলিত তারিখ। জন্মদিন পালন নিয়ে আলেমদের মতভেদ আছে।',
    },
    hadith: [
      {
        ref: 'Sahih Muslim 1162',
        en: 'He was then asked about fasting on Monday, whereupon he said: It was the day on which I was born.',
      },
    ],
    todo: { en: ['The Sunnah way to honour it is fasting on Mondays.'], bn: ['সুন্নাহ অনুযায়ী সোমবারে রোজা রাখা।'] },
  },

  /* ---------------------------- Rabi al-Thani ---------------------------- */
  {
    id: 'fatiha-yazdaham',
    kind: 'custom',
    hijri: { monthIndex: 3, day: 11 },
    note: 'noBasis',
    title: { en: 'Fatiha-e-Yazdaham', bn: 'ফাতিহা-ই-ইয়াজদাহম' },
    line: {
      en: 'A South Asian custom marking the death of Shaykh Abdul Qadir Jilani. It is not from the Quran or Sunnah.',
      bn: 'শায়খ আবদুল কাদির জিলানির মৃত্যুবার্ষিকী হিসেবে দক্ষিণ এশিয়ার একটি প্রথা। এটি কুরআন-সুন্নাহ থেকে নয়।',
    },
  },

  /* -------------------------------- Rajab -------------------------------- */
  {
    id: 'rajab-start',
    kind: 'sacred',
    hijri: { monthIndex: 6, day: 1 },
    title: { en: 'Rajab begins (sacred month)', bn: 'রজব শুরু (সম্মানিত মাস)' },
    line: { en: 'Rajab is one of the four sacred months.', bn: 'রজব চারটি সম্মানিত মাসের একটি।' },
    quran: 'sacred',
    hadith: [
      {
        ref: 'Sahih al-Bukhari 4662',
        en: 'The year is twelve months, four of which are sacred. Three of them are in succession; Dhul-Qa’da, Dhul-Hijja and Al-Muharram, and (the fourth being) Rajab Mudar which stands between Jumad (ath-thani) and Sha’ban.',
      },
    ],
  },
  {
    id: 'shab-e-meraj',
    kind: 'night',
    alert: true,
    hijri: { monthIndex: 6, day: 27 },
    note: 'differ',
    title: { en: 'Shab-e-Meraj (Isra & Mi’raj)', bn: 'শবে মেরাজ (ইসরা ও মেরাজ)' },
    line: {
      en: 'The night journey to Al-Aqsa and the ascension, when the five daily prayers were given. 27 Rajab is the common date; the exact date is not certain.',
      bn: 'বায়তুল মাকদিসে রাত্রিভ্রমণ ও মেরাজ, যখন পাঁচ ওয়াক্ত নামাজ দেওয়া হয়। ২৭ রজব প্রচলিত তারিখ; নির্দিষ্ট তারিখ নিশ্চিত নয়।',
    },
    quran: 'isra',
  },

  /* ------------------------------- Sha'ban ------------------------------- */
  {
    id: 'shaban-start',
    kind: 'fast',
    hijri: { monthIndex: 7, day: 1 },
    title: { en: 'Sha’ban begins', bn: 'শাবান শুরু' },
    line: { en: 'The month before Ramadan.', bn: 'রমজানের আগের মাস।' },
    hadith: [
      {
        ref: 'Sahih al-Bukhari 1969',
        en: 'I never saw Allah’s Messenger (ﷺ) fasting for a whole month except the month of Ramadan, and did not see him fasting in any month more than in the month of Sha’ban.',
      },
    ],
    todo: { en: ['Fast more this month.'], bn: ['এ মাসে বেশি রোজা রাখুন।'] },
  },
  {
    id: 'shab-e-barat',
    kind: 'night',
    alert: true,
    hijri: { monthIndex: 7, day: 15 },
    note: 'weak',
    title: { en: 'Shab-e-Barat (mid-Sha’ban)', bn: 'শবে বরাত (মধ্য শাবান)' },
    line: {
      en: 'The night before 15 Sha’ban. The hadith telling people to fast the 15th (Ibn Majah 1388) is weak.',
      bn: '১৫ শাবানের আগের রাত। ১৫ তারিখে রোজা রাখার হাদিসটি (ইবনে মাজাহ ১৩৮৮) দুর্বল।',
    },
    hadith: [
      {
        ref: 'Sunan Ibn Majah 1390 (graded hasan by al-Albani)',
        en: 'Allah looks down on the night of the middle of Sha’ban and forgives all His creation, apart from the idolater and the Mushahin.',
        gloss: { en: 'Mushahin: one who holds hatred against another.', bn: 'মুশাহিন: যে অন্যের প্রতি বিদ্বেষ পোষণ করে।' },
      },
    ],
  },

  /* ------------------------------- Ramadan ------------------------------- */
  {
    id: 'ramadan',
    kind: 'fast',
    alert: true,
    hijri: { monthIndex: 8, day: 1 },
    title: { en: 'Ramadan begins', bn: 'রমজান শুরু' },
    line: {
      en: 'The month of fasting. Taraweeh starts the night before the first fast.',
      bn: 'রোজার মাস। প্রথম রোজার আগের রাত থেকে তারাবিহ শুরু।',
    },
    quran: 'ramadan',
    hadith: [
      {
        ref: 'Sahih al-Bukhari 38',
        en: 'Whoever observes fasts during the month of Ramadan out of sincere faith, and hoping to attain Allah’s rewards, then all his past sins will be forgiven.',
      },
      {
        ref: 'Sahih al-Bukhari 37',
        en: 'Whoever establishes prayers during the nights of Ramadan faithfully out of sincere faith and hoping to attain Allah’s rewards (not for showing off), all his past sins will be forgiven.',
      },
    ],
  },
  {
    id: 'nuzul-quran',
    kind: 'day',
    hijri: { monthIndex: 8, day: 17 },
    note: 'differ',
    title: { en: 'Nuzul al-Qur’an', bn: 'নুজুলুল কুরআন' },
    line: {
      en: 'Marked in many countries as the start of the Quran’s revelation. Many scholars place it on Laylat al-Qadr instead.',
      bn: 'অনেক দেশে কুরআন নাজিলের সূচনা হিসেবে পালিত হয়। অনেক আলেম একে লাইলাতুল কদরের সাথে যুক্ত করেন।',
    },
    quran: 'ramadan',
  },
  {
    id: 'badr',
    kind: 'history',
    hijri: { monthIndex: 8, day: 17 },
    title: { en: 'Battle of Badr', bn: 'বদরের যুদ্ধ' },
    line: {
      en: '17 Ramadan, 2 AH: the first major battle, won by a small Muslim army.',
      bn: '২ হিজরির ১৭ রমজান: প্রথম বড় যুদ্ধ, যেখানে ছোট মুসলিম বাহিনী বিজয়ী হয়।',
    },
    quran: 'badr',
  },
  {
    id: 'itikaf',
    kind: 'day',
    hijri: { monthIndex: 8, day: 20 },
    title: { en: 'I’tikaf begins', bn: 'ইতিকাফ শুরু' },
    line: {
      en: 'Those doing I’tikaf for the last ten nights enter the masjid before Maghrib today.',
      bn: 'শেষ দশকের ইতিকাফকারীরা আজ মাগরিবের আগে মসজিদে প্রবেশ করেন।',
    },
    hadith: [
      {
        ref: 'Sahih al-Bukhari 2026',
        en: 'The Prophet (ﷺ) used to practice I’tikaf in the last ten days of Ramadan till he died and then his wives used to practice I’tikaf after him.',
      },
    ],
  },
  {
    id: 'fath-makkah',
    kind: 'history',
    hijri: { monthIndex: 8, day: 20 },
    note: 'approx',
    title: { en: 'Conquest of Makkah', bn: 'মক্কা বিজয়' },
    line: {
      en: 'Ramadan, 8 AH: the Prophet ﷺ entered Makkah. The 20th is the date most often given.',
      bn: '৮ হিজরির রমজান: নবী ﷺ মক্কায় প্রবেশ করেন। ২০ তারিখ সবচেয়ে প্রচলিত।',
    },
    quran: 'nasr',
  },
  {
    id: 'last-ten',
    kind: 'night',
    alert: true,
    hijri: { monthIndex: 8, day: 21 },
    title: { en: 'Last ten nights begin', bn: 'শেষ দশক শুরু' },
    line: {
      en: 'Tonight is the 21st night, the first odd night where Laylat al-Qadr is sought.',
      bn: 'আজ ২১তম রাত, প্রথম বেজোড় রাত যেখানে লাইলাতুল কদর খোঁজা হয়।',
    },
    hadith: [
      {
        ref: 'Sahih al-Bukhari 2024',
        en: 'With the start of the last ten days of Ramadan, the Prophet (ﷺ) used to tighten his waist belt (i.e. work hard) and used to pray all the night, and used to keep his family awake for the prayers.',
      },
      {
        ref: 'Sahih al-Bukhari 2017',
        en: 'Search for the Night of Qadr in the odd nights of the last ten days of Ramadan.',
      },
    ],
  },
  {
    id: 'odd-night',
    kind: 'night',
    hijri: { monthIndex: 8, days: [23, 25, 29] },
    title: { en: 'Odd night of the last ten', bn: 'শেষ দশকের বেজোড় রাত' },
    line: {
      en: 'One of the odd nights in which Laylat al-Qadr may fall.',
      bn: 'বেজোড় রাতগুলোর একটি, যার কোনো একটিতে লাইলাতুল কদর হতে পারে।',
    },
    quran: 'qadr',
    hadith: [
      {
        ref: 'Sahih al-Bukhari 2017',
        en: 'Search for the Night of Qadr in the odd nights of the last ten days of Ramadan.',
      },
    ],
  },
  {
    id: 'laylatul-qadr',
    kind: 'night',
    alert: true,
    hijri: { monthIndex: 8, day: 27 },
    title: { en: 'Laylatul Qadr (27th night)', bn: 'লাইলাতুল কদর (২৭তম রাত)' },
    line: {
      en: 'The night most widely observed as Laylat al-Qadr. It is not certain, so keep all the odd nights.',
      bn: 'লাইলাতুল কদর হিসেবে সবচেয়ে বেশি পালিত রাত। এটি নিশ্চিত নয়, তাই সব বেজোড় রাতে ইবাদত করুন।',
    },
    quran: 'qadr',
    hadith: [
      {
        ref: 'Sahih al-Bukhari 2017',
        en: 'Search for the Night of Qadr in the odd nights of the last ten days of Ramadan.',
      },
    ],
    todo: { en: ['Read the Laylat al-Qadr dua (in Duas).'], bn: ['লাইলাতুল কদরের দোয়া পড়ুন (দোয়া অংশে আছে)।'] },
  },
  {
    id: 'jumuatul-wida',
    kind: 'day',
    rule: 'lastFridayOfRamadan',
    note: 'differ',
    title: { en: 'Jumu’atul Wida (last Friday of Ramadan)', bn: 'জুমাতুল বিদা (রমজানের শেষ জুমা)' },
    line: {
      en: 'The last Friday of Ramadan, widely marked in South Asia. No special acts are reported for it beyond any Friday in Ramadan.',
      bn: 'রমজানের শেষ শুক্রবার, দক্ষিণ এশিয়ায় ব্যাপকভাবে পালিত। রমজানের অন্য জুমার চেয়ে আলাদা কোনো আমল বর্ণিত নেই।',
    },
  },
  {
    id: 'zakat-fitr',
    kind: 'eid',
    hijri: { monthIndex: 8, day: 28 },
    title: { en: 'Zakat al-Fitr', bn: 'সদকাতুল ফিতর' },
    line: {
      en: 'A reminder to give Zakat al-Fitr. It must be given before the Eid prayer.',
      bn: 'সদকাতুল ফিতর দেওয়ার কথা মনে করিয়ে দেওয়া। এটি ঈদের নামাজের আগে দিতে হয়।',
    },
    hadith: [
      {
        ref: 'Sahih al-Bukhari 1503',
        en: 'Allah’s Messenger (ﷺ) enjoined the payment of one Sa’ of dates or one Sa’ of barley as Zakat-ul-Fitr on every Muslim slave or free, male or female, young or old, and he ordered that it be paid before the people went out to offer the ‘Id prayer.',
      },
    ],
  },

  /* ------------------------------- Shawwal ------------------------------- */
  {
    id: 'eid-fitr',
    kind: 'eid',
    alert: true,
    hijri: { monthIndex: 9, day: 1 },
    title: { en: 'Eid al-Fitr', bn: 'ঈদুল ফিতর' },
    line: {
      en: 'The day after Ramadan ends. Fasting today is not allowed.',
      bn: 'রমজান শেষের পরের দিন। আজ রোজা রাখা নিষেধ।',
    },
    hadith: [
      {
        ref: 'Sahih al-Bukhari 953',
        en: 'Allah’s Messenger (ﷺ) never proceeded (for the prayer) on the Day of ‘Id-ul-Fitr unless he had eaten some dates.',
      },
    ],
    todo: { en: ['Eat a few dates before the Eid prayer.'], bn: ['ঈদের নামাজের আগে কয়েকটি খেজুর খান।'] },
    weakNote: {
      en: 'Chand Raat: the hadith about special prayer on the night before Eid (Ibn Majah 1782) is weak.',
      bn: 'চাঁদরাত: ঈদের আগের রাতে বিশেষ ইবাদতের হাদিসটি (ইবনে মাজাহ ১৭৮২) দুর্বল।',
    },
  },
  {
    id: 'shawwal-six',
    kind: 'fast',
    hijri: { monthIndex: 9, day: 2 },
    title: { en: 'Six days of Shawwal', bn: 'শাওয়ালের ছয় রোজা' },
    line: {
      en: 'The six Shawwal fasts can start today, in a row or spread over the month.',
      bn: 'শাওয়ালের ছয় রোজা আজ থেকে শুরু করা যায়, একটানা বা মাসজুড়ে।',
    },
    hadith: [
      {
        ref: 'Sahih Muslim 1164',
        en: 'He who observed the fast of Ramadan and then followed it with six (fasts) of Shawwal, it would be as if he fasted perpetually.',
      },
    ],
  },
  {
    id: 'uhud',
    kind: 'history',
    hijri: { monthIndex: 9, day: 7 },
    note: 'approx',
    title: { en: 'Battle of Uhud', bn: 'উহুদের যুদ্ধ' },
    line: {
      en: 'Shawwal, 3 AH, at Mount Uhud near Madinah. Sources give the 7th or the 15th.',
      bn: '৩ হিজরির শাওয়াল, মদিনার কাছে উহুদ পাহাড়ে। বর্ণনায় ৭ বা ১৫ তারিখ পাওয়া যায়।',
    },
  },

  /* ----------------------------- Dhul Qa'dah ----------------------------- */
  {
    id: 'dhulqadah-start',
    kind: 'sacred',
    hijri: { monthIndex: 10, day: 1 },
    title: { en: 'Dhul Qa’dah begins (sacred month)', bn: 'জিলকদ শুরু (সম্মানিত মাস)' },
    line: { en: 'The first of three sacred months in a row.', bn: 'পরপর তিনটি সম্মানিত মাসের প্রথমটি।' },
    quran: 'sacred',
  },

  /* ----------------------------- Dhul Hijjah ----------------------------- */
  {
    id: 'dhulhijjah-start',
    kind: 'hajj',
    alert: true,
    hijri: { monthIndex: 11, day: 1 },
    title: { en: 'First ten days of Dhul Hijjah', bn: 'জিলহজের প্রথম দশক' },
    line: { en: 'The best ten days of the year begin.', bn: 'বছরের শ্রেষ্ঠ দশ দিন শুরু।' },
    quran: 'ten',
    hadith: [
      {
        ref: 'Sahih al-Bukhari 969',
        en: 'No good deeds done on other days are superior to those done on these (first ten days of Dhul Hijja).',
      },
      {
        ref: 'Sahih Muslim 1977',
        en: 'He who has a sacrificial animal with him whom (he intends) to offer as sacrifice, and he enters the month of Dhu’l-Hijja, he should not get his hair cut or nails trimmed until he has sacrificed the animal.',
      },
    ],
  },
  {
    id: 'tarwiyah',
    kind: 'hajj',
    hijri: { monthIndex: 11, day: 8 },
    title: { en: 'Day of Tarwiyah', bn: 'তারবিয়ার দিন' },
    line: {
      en: '8 Dhul Hijjah: pilgrims go to Mina and Hajj begins.',
      bn: '৮ জিলহজ: হাজিরা মিনায় যান এবং হজ শুরু হয়।',
    },
  },
  {
    id: 'arafah',
    kind: 'fast',
    alert: true,
    hijri: { monthIndex: 11, day: 9 },
    title: { en: 'Day of Arafah', bn: 'আরাফার দিন' },
    line: {
      en: 'Pilgrims stand at Arafah. The Takbir of Tashreeq starts after Fajr today and continues after each Fard prayer until Asr on the 13th.',
      bn: 'হাজিরা আরাফায় অবস্থান করেন। আজ ফজরের পর থেকে ১৩ তারিখ আসর পর্যন্ত প্রতি ফরজ নামাজের পর তাকবিরে তাশরিক।',
    },
    hadith: [
      {
        ref: 'Sahih Muslim 1162',
        en: 'He was asked about fasting on the day of ‘Arafa (9th of Dhu’l-Hijja), whereupon he said: It expiates the sins of the preceding year and the coming year.',
      },
      {
        ref: 'Jami’ at-Tirmidhi 3585',
        en: 'The best of supplication is the supplication of the Day of ‘Arafah. And the best of what I and the Prophets before me have said is: None has the right to be worshipped but Allah, Alone, without partner, to Him belongs all that exists, and to Him belongs the Praise, and He is powerful over all things.',
        bn: 'শ্রেষ্ঠ দো‘আ হচ্ছে ‘আরাফাত দিবসের দো‘আ। আর আমি এবং আমার পূর্ববর্তী নবীগণ যা বলেছি তার মধ্যে শ্রেষ্ঠ হচ্ছে: একমাত্র আল্লাহ ছাড়া কোনো হক্ব ইলাহ নেই, তাঁর কোনো শরীক নেই; রাজত্ব তাঁরই, সমস্ত প্রশংসাও তাঁর; আর তিনি সকল কিছুর ওপর ক্ষমতাবান।',
        bnSrc: 'hisn',
      },
    ],
    todo: { en: ['Fast today if you are not on Hajj.'], bn: ['হজে না থাকলে আজ রোজা রাখুন।'] },
  },
  {
    id: 'eid-adha',
    kind: 'eid',
    alert: true,
    hijri: { monthIndex: 11, day: 10 },
    title: { en: 'Eid al-Adha', bn: 'ঈদুল আজহা' },
    line: {
      en: 'The Eid of sacrifice. Fasting today is not allowed.',
      bn: 'কোরবানির ঈদ। আজ রোজা রাখা নিষেধ।',
    },
    quran: 'kawthar',
  },
  {
    id: 'qurbani',
    kind: 'eid',
    hijri: { monthIndex: 11, day: 10, span: 3 },
    title: { en: 'Days of Qurbani', bn: 'কোরবানির দিনগুলো' },
    line: {
      en: 'The sacrifice is made after the Eid prayer, from the 10th to the 12th (to the 13th in some schools).',
      bn: 'ঈদের নামাজের পর ১০ থেকে ১২ তারিখ পর্যন্ত কোরবানি করা হয় (কিছু মাযহাবে ১৩ তারিখ পর্যন্ত)।',
    },
  },
  {
    id: 'tashreeq',
    kind: 'eid',
    hijri: { monthIndex: 11, day: 11, span: 3 },
    title: { en: 'Days of Tashreeq', bn: 'আইয়ামে তাশরিক' },
    line: {
      en: 'The 11th, 12th and 13th of Dhul Hijjah. Fasting on these days is not allowed.',
      bn: 'জিলহজের ১১, ১২ ও ১৩ তারিখ। এই দিনগুলোতে রোজা রাখা নিষেধ।',
    },
    quran: 'tashreeq',
    hadith: [{ ref: 'Sahih Muslim 1141', en: 'The days of Tashriq are the days of eating and drinking.' }],
  },
];

// Eclipses get their text here; the dates come from lib/eclipse.js.
export const ECLIPSE_EVENT = {
  id: 'eclipse',
  kind: 'day',
  title: { en: 'Eclipse', bn: 'গ্রহণ' },
  line: {
    en: 'An eclipse visible from your location. The eclipse prayer (Salat al-Kusuf) is prayed while it lasts.',
    bn: 'আপনার এলাকা থেকে দেখা যাবে এমন গ্রহণ। গ্রহণ চলাকালে সালাতুল কুসুফ পড়া হয়।',
  },
  hadith: [
    {
      ref: 'Sahih al-Bukhari 1042',
      en: 'The sun and the moon do not eclipse because of the death or life (i.e. birth) of someone but they are two signs amongst the signs of Allah. When you see them offer the prayer.',
    },
  ],
};

// Filters on the Important days screen.
export const EVENT_FILTERS = [
  { id: 'all', en: 'All', bn: 'সব' },
  { id: 'fast', en: 'Fasts', bn: 'রোজা' },
  { id: 'night', en: 'Nights', bn: 'রাত' },
  { id: 'eid', en: 'Eid & Hajj', bn: 'ঈদ ও হজ' },
];
export function eventInFilter(evt, f) {
  if (f === 'all') return true;
  if (f === 'fast') return evt.kind === 'fast';
  if (f === 'night') return evt.kind === 'night';
  if (f === 'eid') return evt.kind === 'eid' || evt.kind === 'hajj';
  return true;
}
