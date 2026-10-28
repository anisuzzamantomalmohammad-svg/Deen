// Islamic occasions by Hijri date (monthIndex 0 = Muharram ... 8 = Ramadan).
// Bangla text lives in events_bn.js.
export const WHITE_DAYS_EVENT = {
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

export const ISLAMIC_EVENTS = [
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
