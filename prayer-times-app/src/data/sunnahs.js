// Sunnah of the day: one small, everyday practice of the Prophet ﷺ, with
// where it comes from. These are short descriptions of the practice, not
// quoted hadith text, so the reference is always shown to check.
export const SUNNAHS = [
  { en: 'Say Bismillah and eat with your right hand.', bn: 'বিসমিল্লাহ বলে ডান হাতে খাবার খান।', ref: 'Bukhari 5376 · Muslim 2022' },
  { en: 'Put on your right shoe first, and take off the left first.', bn: 'জুতা পরার সময় ডান পা আগে, খোলার সময় বাম পা আগে।', ref: 'Bukhari 5856' },
  { en: 'Use the miswak (clean your teeth) before you pray.', bn: 'নামাজের আগে মিসওয়াক করুন।', ref: 'Bukhari 887' },
  { en: 'Make wudu before bed and sleep on your right side.', bn: 'ঘুমানোর আগে অজু করে ডান কাতে শোন।', ref: 'Bukhari 247' },
  { en: 'Recite Ayat al-Kursi before you sleep.', bn: 'ঘুমানোর আগে আয়াতুল কুরসি পড়ুন।', ref: 'Bukhari 2311' },
  { en: 'Smile at people. It counts as charity.', bn: 'মানুষের দিকে হাসিমুখে তাকান, এটাও সদকা।', ref: 'Tirmidhi 1956' },
  { en: 'Say salam to people you know and people you don\'t.', bn: 'চেনা-অচেনা সবাইকে সালাম দিন।', ref: 'Bukhari 12 · Muslim 54' },
  { en: 'Pray 2 rak\'ahs when you enter the masjid, before sitting.', bn: 'মসজিদে ঢুকে বসার আগে দুই রাকাত নামাজ পড়ুন।', ref: 'Bukhari 444' },
  { en: 'Keep up the 12 Sunnah rak\'ahs around the daily prayers.', bn: 'প্রতিদিন ফরজের আগে-পরে ১২ রাকাত সুন্নত নিয়মিত পড়ুন।', ref: 'Muslim 728 · Tirmidhi 415' },
  { en: 'After sneezing say Alhamdulillah. When someone else does, reply Yarhamukallah.', bn: 'হাঁচি দিলে আলহামদুলিল্লাহ বলুন; অন্য কেউ বললে ইয়ারহামুকাল্লাহ বলুন।', ref: 'Bukhari 6224' },
  { en: 'Drink sitting down, in three breaths.', bn: 'বসে পান করুন, তিন নিঃশ্বাসে।', ref: 'Muslim 2026, 2028' },
  { en: 'Visit someone who is ill.', bn: 'অসুস্থ কাউকে দেখতে যান।', ref: 'Bukhari 5649' },
  { en: 'Make dua between the adhan and the iqamah.', bn: 'আজান ও ইকামতের মাঝে দোয়া করুন।', ref: 'Abu Dawud 521 · Tirmidhi 212' },
  { en: 'Repeat the words of the adhan after the muezzin.', bn: 'মুয়াজ্জিনের সাথে আজানের শব্দগুলো বলুন।', ref: 'Bukhari 611' },
  { en: 'Send lots of salawat on the Prophet ﷺ on Friday.', bn: 'শুক্রবারে বেশি বেশি দরুদ পড়ুন।', ref: 'Abu Dawud 1047' },
  { en: 'Fast on Mondays and Thursdays.', bn: 'সোম ও বৃহস্পতিবার রোজা রাখুন।', ref: 'Tirmidhi 747' },
  { en: 'Fast the White Days, the 13th to 15th of each Hijri month.', bn: 'প্রতি হিজরি মাসের ১৩, ১৪, ১৫ তারিখ রোজা রাখুন।', ref: 'Tirmidhi 761 · Nasa\'i 2420' },
  { en: 'Break your fast with dates, or water if you have none.', bn: 'খেজুর দিয়ে ইফতার করুন, না থাকলে পানি দিয়ে।', ref: 'Abu Dawud 2356' },
  { en: 'Move something harmful out of the way.', bn: 'রাস্তা থেকে কষ্টদায়ক কিছু সরিয়ে দিন।', ref: 'Muslim 35' },
  { en: 'Call or visit a relative today.', bn: 'আজ কোনো আত্মীয়ের খোঁজ নিন।', ref: 'Bukhari 5986' },
  { en: 'After each prayer say SubhanAllah 33, Alhamdulillah 33 and Allahu Akbar 34 times.', bn: 'প্রতি নামাজের পর সুবহানাল্লাহ ৩৩, আলহামদুলিল্লাহ ৩৩, আল্লাহু আকবার ৩৪ বার।', ref: 'Muslim 597' },
  { en: 'Say SubhanAllahi wa bihamdihi 100 times today.', bn: 'আজ ১০০ বার সুবহানাল্লাহি ওয়া বিহামদিহি বলুন।', ref: 'Bukhari 6405' },
  { en: 'Avoid chatting late after Isha, and sleep early.', bn: 'এশার পর অযথা গল্প না করে তাড়াতাড়ি ঘুমান।', ref: 'Bukhari 568' },
  { en: 'Pray Duha in the morning, even 2 rak\'ahs.', bn: 'সকালে চাশতের নামাজ পড়ুন, দুই রাকাত হলেও।', ref: 'Muslim 720' },
  { en: 'Finish the food on your plate and don\'t waste it.', bn: 'প্লেটের খাবার শেষ করুন, নষ্ট করবেন না।', ref: 'Muslim 2033' },
  { en: 'Give someone a small gift.', bn: 'কাউকে ছোট একটা উপহার দিন।', ref: 'al-Adab al-Mufrad 594' },
  { en: 'Say Bismillah and the dua when you leave home.', bn: 'বাসা থেকে বের হওয়ার সময় বিসমিল্লাহ ও দোয়া পড়ুন।', ref: 'Abu Dawud 5095' },
  { en: 'Say In sha Allah when you talk about plans.', bn: 'ভবিষ্যতের কথা বললে ইনশাআল্লাহ বলুন।', ref: 'Quran 18:23–24' },
  { en: 'Be gentle. Allah loves gentleness in everything.', bn: 'নম্র আচরণ করুন; আল্লাহ সব কাজে নম্রতা ভালোবাসেন।', ref: 'Bukhari 6927' },
  { en: 'Help out at home. The Prophet ﷺ served his family.', bn: 'ঘরের কাজে সাহায্য করুন; নবী ﷺ পরিবারের কাজ করতেন।', ref: 'Bukhari 676' },
  { en: 'Ask Allah for forgiveness 100 times today.', bn: 'আজ ১০০ বার ইস্তিগফার করুন।', ref: 'Muslim 2702' },
];

export function sunnahFor(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  return SUNNAHS[(day + date.getFullYear()) % SUNNAHS.length];
}
