// Short reference text shown in the detail sheets. Rak'ah counts follow the
// common Hanafi practice (the default madhab in the app); the Fard counts are
// the same in every school.

export const RAKAH = {
  Fajr: [
    { label: 'Sunnah before', n: 2, note: 'Sunnah mu’akkadah, very strongly recommended' },
    { label: 'Fard', n: 2 },
  ],
  Dhuhr: [
    { label: 'Sunnah before', n: 4, note: 'Sunnah mu’akkadah' },
    { label: 'Fard', n: 4 },
    { label: 'Sunnah after', n: 2, note: 'Sunnah mu’akkadah' },
    { label: 'Nafl', n: 2, note: 'Optional' },
  ],
  Asr: [
    { label: 'Sunnah before', n: 4, note: 'Sunnah ghayr mu’akkadah, recommended' },
    { label: 'Fard', n: 4 },
  ],
  Maghrib: [
    { label: 'Fard', n: 3 },
    { label: 'Sunnah after', n: 2, note: 'Sunnah mu’akkadah' },
    { label: 'Nafl', n: 2, note: 'Optional' },
  ],
  Isha: [
    { label: 'Sunnah before', n: 4, note: 'Sunnah ghayr mu’akkadah, recommended' },
    { label: 'Fard', n: 4 },
    { label: 'Sunnah after', n: 2, note: 'Sunnah mu’akkadah' },
    { label: 'Witr', n: 3, note: 'Wajib in the Hanafi school' },
  ],
};

export const JUMUAH_RAKAH = [
  { label: 'Sunnah before', n: 4 },
  { label: 'Fard (Jumu’ah)', n: 2 },
  { label: 'Sunnah after', n: 4 },
  { label: 'Sunnah after', n: 2 },
];

export const PROHIBITED_INFO = {
  Sunrise: {
    title: 'After sunrise',
    reason: 'From sunrise until the sun has risen about a spear’s length, roughly 15 minutes. The Prophet ﷺ forbade praying while the sun is rising (Sahih Muslim 831).',
  },
  Zawal: {
    title: 'Midday · Zawal',
    reason: 'When the sun is at its highest, just before Dhuhr begins. Wait until it passes the zenith and Dhuhr starts (Sahih Muslim 831).',
  },
  Sunset: {
    title: 'Before sunset',
    reason: 'When the sun turns yellow and starts to set, until Maghrib. Only that day’s Asr may still be finished if it was delayed (Sahih Muslim 831).',
  },
};

export const NAWAFIL_INFO = {
  tahajjud: {
    title: 'Tahajjud',
    body: 'Voluntary night prayer, best in the last third of the night. Pray 2 rak’ahs at a time, as many as you like, often 2 to 8, then Witr if you haven’t prayed it after Isha. Allah descends to the lowest heaven in the last third of the night and asks who is calling on Him (Bukhari 1145).',
  },
  duha: {
    title: 'Duha (Chasht)',
    body: 'Morning prayer of 2 to 8 rak’ahs, from about 15 minutes after sunrise until shortly before Dhuhr. It counts as charity for every joint of the body (Muslim 720).',
  },
  adhkar: {
    title: 'Morning & evening adhkar',
    body: 'The remembrances said after Fajr until sunrise and after Asr until Maghrib. You’ll find them all under Duas → Morning & Evening.',
  },
  fast: {
    title: 'Voluntary fast',
    body: 'Mondays and Thursdays, the White Days (13th–15th of each Hijri month), Arafah and Ashura are the most recommended voluntary fasts.',
  },
  ishraq: {
    title: 'Ishraq',
    body: '2 rak’ahs about 15–20 minutes after sunrise, once the prohibited window has passed. Many treat it as the start of Duha.',
  },
};

export const SUNNAH_FAST_INFO = {
  monday: 'The Prophet ﷺ fasted on Mondays and said: “That is the day I was born and the day revelation came to me” (Muslim 1162).',
  thursday: 'Deeds are presented to Allah on Mondays and Thursdays, “and I like my deeds to be presented while I am fasting” (Tirmidhi 747).',
  white: 'Fasting the 13th, 14th and 15th of each Hijri month is like fasting the whole year (Nasa’i 2420).',
  arafah: 'Fasting the Day of Arafah expiates the sins of the past year and the coming year (Muslim 1162). Not for pilgrims at Arafah.',
  ashura: 'Fasting Ashura expiates the sins of the past year (Muslim 1162). Fast the 9th as well, or the 11th.',
  tasua: 'The Prophet ﷺ intended to fast the 9th of Muharram with Ashura (Muslim 1134).',
};
