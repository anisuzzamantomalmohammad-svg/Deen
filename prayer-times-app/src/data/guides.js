// Basic guides (Hanafi). Short steps written from Bahishti Zewar by Maulana
// Ashraf Ali Thanvi, with the chapter shown as the reference. Recitations are
// not written out here: a step links to the dua in the app (`dua`), which
// holds the checked Arabic and its trusted translation.
// To be reviewed by a local scholar before relying on any detail.

export const GUIDE_GROUPS = [
  { id: 'purity', en: 'Purity', bn: 'পবিত্রতা', icon: 'droplet' },
  { id: 'salah', en: 'Salah', bn: 'নামাজ', icon: 'clock' },
  { id: 'special', en: 'Special prayers', bn: 'বিশেষ নামাজ', icon: 'star' },
  { id: 'fasting', en: 'Fasting', bn: 'রোজা', icon: 'sunrise' },
];

const BZ = (en, bn) => ({ en: `Bahishti Zewar · ${en}`, bn: `বেহেশতী জেওর · ${bn}` });

export const GUIDES = [
  /* ------------------------------ Purity ------------------------------ */
  {
    id: 'wudu', group: 'purity', title: { en: 'How to make wudu', bn: 'অজুর নিয়ম' },
    intro: { en: 'Four things are fard: washing the face, washing both arms including the elbows, wiping a quarter of the head, and washing both feet including the ankles. The rest is Sunnah.', bn: 'অজুর ফরজ চারটি: মুখ ধোয়া, কনুইসহ দুই হাত ধোয়া, মাথার এক-চতুর্থাংশ মাসেহ করা এবং টাখনুসহ দুই পা ধোয়া। বাকিগুলো সুন্নত।' },
    steps: [
      { en: 'Make the intention and say Bismillah.', bn: 'নিয়ত করুন এবং বিসমিল্লাহ বলুন।', dua: 36 },
      { en: 'Wash both hands up to the wrists, 3 times.', bn: 'কবজি পর্যন্ত দুই হাত ৩ বার ধুয়ে নিন।' },
      { en: 'Clean your teeth (miswak), then rinse your mouth 3 times.', bn: 'মিসওয়াক করুন, তারপর ৩ বার কুলি করুন।' },
      { en: 'Sniff water into the nose and blow it out, 3 times.', bn: '৩ বার নাকে পানি দিয়ে পরিষ্কার করুন।' },
      { en: 'Wash the whole face 3 times, from hairline to chin and ear to ear.', bn: 'কপালের চুলের গোড়া থেকে থুতনি এবং এক কান থেকে অন্য কান পর্যন্ত পুরো মুখ ৩ বার ধুয়ে নিন।', fard: true },
      { en: 'Wash the right arm including the elbow 3 times, then the left.', bn: 'কনুইসহ ডান হাত ৩ বার, তারপর বাম হাত ৩ বার ধুয়ে নিন।', fard: true },
      { en: 'Wipe the head with wet hands once, then the ears, and the back of the neck.', bn: 'ভেজা হাতে একবার মাথা মাসেহ করুন, তারপর কান ও ঘাড় মাসেহ করুন।', fard: true },
      { en: 'Wash the right foot including the ankle 3 times, then the left. Get between the toes.', bn: 'টাখনুসহ ডান পা ৩ বার, তারপর বাম পা ৩ বার ধুয়ে নিন। আঙুলের ফাঁক খিলাল করুন।', fard: true },
      { en: 'Do it in this order, without long gaps, then say the dua after wudu.', bn: 'এই ক্রমে, মাঝে দেরি না করে করুন। শেষে অজুর পরের দোয়া পড়ুন।', dua: 37 },
    ],
    ref: BZ('Wudu chapter', 'অজুর অধ্যায়'),
  },
  {
    id: 'breaksWudu', group: 'purity', title: { en: 'What breaks wudu', bn: 'যেসব কারণে অজু ভাঙে' },
    intro: { en: 'If any of these happen, make wudu again before you pray.', bn: 'এগুলোর কোনোটি হলে নামাজের আগে আবার অজু করুন।' },
    steps: [
      { en: 'Anything coming out of the front or back passage: urine, stool, wind.', bn: 'পেশাব-পায়খানার রাস্তা দিয়ে কিছু বের হওয়া: পেশাব, পায়খানা, বায়ু।' },
      { en: 'Blood or pus that flows beyond the wound.', bn: 'রক্ত বা পুঁজ বের হয়ে ক্ষতস্থান থেকে গড়িয়ে পড়া।' },
      { en: 'Vomiting a mouthful.', bn: 'মুখ ভরে বমি হওয়া।' },
      { en: 'Sleeping lying down, or leaning on something so that you\'d fall if it were taken away.', bn: 'শুয়ে ঘুমানো, বা এমনভাবে হেলান দিয়ে ঘুমানো যে ঠেস সরালে পড়ে যেতেন।' },
      { en: 'Fainting, losing your senses, or being intoxicated.', bn: 'বেহুঁশ হওয়া, জ্ঞান হারানো বা নেশাগ্রস্ত হওয়া।' },
      { en: 'Laughing out loud during a prayer that has ruku and sujud (this also breaks the prayer).', bn: 'রুকু-সিজদাওয়ালা নামাজে শব্দ করে হাসা (এতে নামাজও ভেঙে যায়)।' },
    ],
    notes: [{ en: 'In the Hanafi school, touching your private parts or touching someone of the other sex does not break wudu.', bn: 'হানাফি মাযহাবে নিজের লজ্জাস্থান ছোঁয়া বা বিপরীত লিঙ্গের কাউকে ছোঁয়ায় অজু ভাঙে না।' }],
    ref: BZ('What breaks wudu', 'অজু ভঙ্গের কারণ'),
  },
  {
    id: 'ghusl', group: 'purity', title: { en: 'Ghusl (full bath)', bn: 'গোসলের নিয়ম' },
    intro: { en: 'Ghusl is needed after intercourse, after a wet dream or any release with desire, and when menstruation or post-birth bleeding ends. Three things are fard: rinsing the mouth fully, rinsing the nose up to the soft bone, and washing the whole body so no spot stays dry.', bn: 'সহবাস, স্বপ্নদোষ বা উত্তেজনার সাথে বীর্যপাত এবং হায়েজ-নেফাস শেষ হলে গোসল ফরজ হয়। গোসলের ফরজ তিনটি: ভালোভাবে কুলি করা, নাকের নরম হাড় পর্যন্ত পানি দেওয়া এবং পুরো শরীর এমনভাবে ধোয়া যাতে কোথাও শুকনো না থাকে।' },
    steps: [
      { en: 'Make the intention and wash both hands.', bn: 'নিয়ত করে দুই হাত ধুয়ে নিন।' },
      { en: 'Wash the private parts and any dirt on the body.', bn: 'লজ্জাস্থান এবং শরীরে লেগে থাকা নাপাকি ধুয়ে ফেলুন।' },
      { en: 'Make wudu as for prayer.', bn: 'নামাজের মতো অজু করুন।' },
      { en: 'Rinse the mouth well (gargle if not fasting) and rinse the nose.', bn: 'ভালোভাবে কুলি করুন (রোজা না থাকলে গড়গড়া) এবং নাকে পানি দিন।', fard: true },
      { en: 'Pour water over the head 3 times, then the right shoulder 3 times, then the left 3 times.', bn: 'মাথায় ৩ বার, তারপর ডান কাঁধে ৩ বার, তারপর বাম কাঁধে ৩ বার পানি ঢালুন।' },
      { en: 'Make sure water reaches every part of the body, including the hair roots, navel and behind the ears.', bn: 'চুলের গোড়া, নাভি ও কানের পেছনসহ শরীরের প্রতিটি জায়গায় পানি পৌঁছান।', fard: true },
    ],
    ref: BZ('Ghusl chapter', 'গোসলের অধ্যায়'),
  },
  {
    id: 'tayammum', group: 'purity', title: { en: 'Tayammum (dry ablution)', bn: 'তায়াম্মুমের নিয়ম' },
    intro: { en: 'Use tayammum instead of wudu or ghusl when there is no water within about a mile, or when using water would make you ill or slow your recovery.', bn: 'প্রায় এক মাইলের মধ্যে পানি না থাকলে, বা পানি ব্যবহারে অসুখ বাড়ার আশঙ্কা থাকলে অজু বা গোসলের বদলে তায়াম্মুম করুন।' },
    steps: [
      { en: 'Make the intention of purifying yourself for prayer.', bn: 'নামাজের জন্য পবিত্র হওয়ার নিয়ত করুন।', fard: true },
      { en: 'Strike both palms lightly on clean earth, sand, stone or dust.', bn: 'পাক মাটি, বালু, পাথর বা ধুলায় দুই হাত হালকাভাবে মারুন।', fard: true },
      { en: 'Wipe the whole face with both hands.', bn: 'দুই হাত দিয়ে পুরো মুখ মাসেহ করুন।', fard: true },
      { en: 'Strike the palms again and wipe both arms including the elbows.', bn: 'আবার হাত মেরে কনুইসহ দুই হাত মাসেহ করুন।', fard: true },
    ],
    notes: [{ en: 'Tayammum ends with anything that breaks wudu, and when you find water or can use it again.', bn: 'যেসব কারণে অজু ভাঙে সেগুলোতে, এবং পানি পেলে বা ব্যবহার করতে পারলে তায়াম্মুম ভেঙে যায়।' }],
    ref: BZ('Tayammum chapter', 'তায়াম্মুমের অধ্যায়'),
  },

  /* ------------------------------- Salah ------------------------------- */
  {
    id: 'pray2', group: 'salah', title: { en: "How to pray 2 rak'ahs", bn: 'দুই রাকাত নামাজের নিয়ম' },
    intro: { en: 'Fajr, and any 2-rak\'ah Sunnah or nafl, is prayed like this.', bn: 'ফজর এবং যেকোনো দুই রাকাত সুন্নত বা নফল এভাবে পড়া হয়।' },
    steps: [
      { en: 'Face the Qibla and make the intention in your heart.', bn: 'কিবলামুখী হয়ে মনে মনে নিয়ত করুন।' },
      { en: 'Raise your hands to your ears and say Allahu Akbar. Fold them below the navel (women: on the chest).', bn: 'দুই হাত কান পর্যন্ত তুলে আল্লাহু আকবার বলুন। নাভির নিচে হাত বাঁধুন (মহিলারা বুকের ওপর)।' },
      { en: 'Recite the Thana.', bn: 'সানা পড়ুন।', dua: 41 },
      { en: "Say A'udhu billah and Bismillah, recite Al-Fatiha, then a surah or a few verses.", bn: 'আউযুবিল্লাহ ও বিসমিল্লাহ পড়ে সূরা ফাতিহা, তারপর একটি সূরা বা কয়েকটি আয়াত পড়ুন।' },
      { en: 'Say Allahu Akbar and bow (ruku). Say Subhana Rabbiyal ‘Azim 3 times.', bn: 'আল্লাহু আকবার বলে রুকুতে যান। ৩ বার সুবহানা রাব্বিয়াল আযীম বলুন।', dua: 42 },
      { en: 'Stand up saying Sami‘ Allahu liman hamidah, then Rabbana lakal hamd.', bn: 'সামিআল্লাহু লিমান হামিদাহ বলে দাঁড়ান, তারপর রাব্বানা লাকাল হামদ বলুন।', dua: 43 },
      { en: "Say Allahu Akbar and go into sujud. Say Subhana Rabbiyal A'la 3 times.", bn: 'আল্লাহু আকবার বলে সিজদায় যান। ৩ বার সুবহানা রাব্বিয়াল আ‘লা বলুন।', dua: 44 },
      { en: 'Sit up briefly, then do a second sujud the same way.', bn: 'একটু সোজা হয়ে বসুন, তারপর একইভাবে দ্বিতীয় সিজদা করুন।', dua: 45 },
      { en: 'Stand for the second rak\'ah: Bismillah, Al-Fatiha, a surah, ruku and two sujud.', bn: 'দ্বিতীয় রাকাতের জন্য দাঁড়ান: বিসমিল্লাহ, সূরা ফাতিহা, একটি সূরা, রুকু ও দুই সিজদা।' },
      { en: 'Sit and recite the Tashahhud.', bn: 'বসে তাশাহহুদ পড়ুন।', dua: 46 },
      { en: 'Then the Durood Ibrahim.', bn: 'তারপর দরুদে ইবরাহিম।', dua: 47 },
      { en: 'Then a dua, such as the dua of Abu Bakr.', bn: 'তারপর একটি দোয়া, যেমন আবু বকর (রা.)-এর দোয়া।', dua: 48 },
      { en: 'Turn your face right saying As-salamu ‘alaykum wa rahmatullah, then left.', bn: 'আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ বলে প্রথমে ডানে, তারপর বামে মুখ ফেরান।' },
    ],
    ref: BZ('Method of salah', 'নামাজের নিয়ম'),
  },
  {
    id: 'pray4', group: 'salah', title: { en: "3 and 4 rak'ahs: what changes", bn: 'তিন ও চার রাকাতে কী বদলায়' },
    intro: { en: "Pray the first 2 rak'ahs as normal, then:", bn: 'প্রথম দুই রাকাত স্বাভাবিকভাবে পড়ুন, তারপর:' },
    steps: [
      { en: 'After the second rak\'ah, sit and recite only the Tashahhud, then stand up with Allahu Akbar.', bn: 'দ্বিতীয় রাকাতের পর বসে শুধু তাশাহহুদ পড়ুন, তারপর আল্লাহু আকবার বলে দাঁড়ান।', dua: 46 },
      { en: "In the 3rd and 4th rak'ahs of a fard prayer, recite only Al-Fatiha (no extra surah).", bn: 'ফরজ নামাজের তৃতীয় ও চতুর্থ রাকাতে শুধু সূরা ফাতিহা পড়ুন (অন্য সূরা নয়)।' },
      { en: "In Sunnah and nafl prayers, add a surah after Al-Fatiha in every rak'ah.", bn: 'সুন্নত ও নফল নামাজে প্রতি রাকাতে ফাতিহার পর সূরা মেলান।' },
      { en: 'Maghrib has 3: after the first sitting, pray one more rak\'ah with Al-Fatiha only, then the final sitting.', bn: 'মাগরিব তিন রাকাত: প্রথম বৈঠকের পর শুধু ফাতিহা দিয়ে আরেক রাকাত পড়ে শেষ বৈঠক করুন।' },
      { en: 'In the last sitting recite Tashahhud, Durood, a dua, and give salam.', bn: 'শেষ বৈঠকে তাশাহহুদ, দরুদ, দোয়া পড়ে সালাম ফেরান।' },
    ],
    notes: [{ en: 'Forgot the first sitting and stood up fully? Don\'t go back. Carry on and do Sajdah Sahw at the end.', bn: 'প্রথম বৈঠক ভুলে পুরো দাঁড়িয়ে গেলে আর ফিরবেন না। নামাজ চালিয়ে যান এবং শেষে সাহু সিজদা দিন।' }],
    ref: BZ('Method of salah', 'নামাজের নিয়ম'),
  },
  {
    id: 'witr', group: 'salah', title: { en: 'Witr and Dua Qunut', bn: 'বিতর ও দোয়া কুনুত' },
    intro: { en: "Witr is wajib in the Hanafi school: 3 rak'ahs after Isha, with one salam at the end.", bn: 'হানাফি মাযহাবে বিতর ওয়াজিব: এশার পর তিন রাকাত, শেষে এক সালাম।' },
    steps: [
      { en: "Pray 2 rak'ahs with a surah in each, and sit for the Tashahhud.", bn: 'প্রতি রাকাতে সূরা মিলিয়ে দুই রাকাত পড়ে তাশাহহুদের জন্য বসুন।' },
      { en: "Stand for the 3rd rak'ah: Al-Fatiha and a surah.", bn: 'তৃতীয় রাকাতে দাঁড়িয়ে ফাতিহা ও সূরা পড়ুন।' },
      { en: 'Raise your hands to your ears saying Allahu Akbar, fold them again, and recite Dua Qunut.', bn: 'আল্লাহু আকবার বলে কান পর্যন্ত হাত তুলে আবার বাঁধুন এবং দোয়া কুনুত পড়ুন।', dua: 54 },
      { en: 'Then ruku, two sujud, and the final sitting with salam.', bn: 'তারপর রুকু, দুই সিজদা এবং শেষ বৈঠক করে সালাম ফেরান।' },
    ],
    notes: [{ en: "Don't know Qunut yet? Say Rabbana atina fid-dunya hasanah… or Allahummaghfir li 3 times until you learn it.", bn: 'কুনুত মুখস্থ না থাকলে শেখা পর্যন্ত রাব্বানা আতিনা ফিদ্দুনিয়া হাসানাহ… অথবা ৩ বার আল্লাহুম্মাগফিরলি পড়ুন।' }],
    ref: BZ('Witr prayer', 'বিতরের নামাজ'),
  },
  {
    id: 'sahw', group: 'salah', title: { en: 'Sajdah Sahw (forgetting in prayer)', bn: 'সাহু সিজদা' },
    intro: { en: 'If you leave out or delay a wajib part of the prayer by mistake, two extra sujud at the end make up for it.', bn: 'ভুলে নামাজের কোনো ওয়াজিব বাদ পড়লে বা দেরি হলে শেষে দুটি অতিরিক্ত সিজদা দিয়ে তা পূরণ হয়।' },
    steps: [
      { en: 'In the last sitting, recite the Tashahhud only.', bn: 'শেষ বৈঠকে শুধু তাশাহহুদ পড়ুন।', dua: 46 },
      { en: 'Give one salam, to the right.', bn: 'শুধু ডান দিকে এক সালাম ফেরান।' },
      { en: 'Do two sujud, as normal.', bn: 'স্বাভাবিকভাবে দুটি সিজদা করুন।' },
      { en: 'Sit and recite the Tashahhud again, then Durood, a dua, and salam both sides.', bn: 'বসে আবার তাশাহহুদ, তারপর দরুদ, দোয়া পড়ে দুই দিকে সালাম ফেরান।' },
    ],
    notes: [
      { en: 'Common reasons: forgetting the first sitting, forgetting Al-Fatiha or the surah, or praying an extra rak\'ah by mistake.', bn: 'সাধারণ কারণ: প্রথম বৈঠক ভুলে যাওয়া, ফাতিহা বা সূরা ভুলে যাওয়া, ভুলে এক রাকাত বেশি পড়া।' },
      { en: 'If a fard part is missed (like a ruku or sujud) and not made up in the prayer, Sajdah Sahw is not enough. Pray again.', bn: 'কোনো ফরজ (যেমন রুকু বা সিজদা) বাদ পড়ে নামাজের মধ্যে আদায় না হলে সাহু সিজদা যথেষ্ট নয়; নামাজ আবার পড়ুন।' },
    ],
    ref: BZ('Sajdah Sahw', 'সাহু সিজদা'),
  },
  {
    id: 'qada', group: 'salah', title: { en: 'Making up missed prayers (qada)', bn: 'কাযা নামাজ' },
    intro: { en: 'Every missed fard prayer, and Witr, must be made up. Do it as soon as you can.', bn: 'প্রতিটি ছুটে যাওয়া ফরজ নামাজ এবং বিতর কাযা করতে হয়। যত তাড়াতাড়ি সম্ভব আদায় করুন।' },
    steps: [
      { en: 'Pray it like the normal prayer: 2 for Fajr, 4 for Dhuhr, Asr and Isha, 3 for Maghrib, 3 for Witr.', bn: 'স্বাভাবিক নামাজের মতোই পড়ুন: ফজর ২, যোহর-আসর-এশা ৪, মাগরিব ৩, বিতর ৩।' },
      { en: 'Make the intention for the specific one, e.g. "the earliest Fajr I missed".', bn: 'নির্দিষ্ট নামাজের নিয়ত করুন, যেমন "আমার ছুটে যাওয়া প্রথম ফজর"।' },
      { en: "Don't pray qada in the prohibited times (sunrise, midday, sunset).", bn: 'নিষিদ্ধ সময়ে (সূর্যোদয়, দুপুর, সূর্যাস্ত) কাযা পড়বেন না।' },
      { en: 'Keep count in Ibadah › Qada, and tick one off each time.', bn: 'ইবাদত › কাযা অংশে হিসাব রাখুন এবং প্রতিবার একটি করে কমান।' },
    ],
    notes: [{ en: 'Sunnah prayers are not made up, except the Fajr Sunnah when you pray Fajr late on the same morning, before midday.', bn: 'সুন্নত নামাজের কাযা নেই, তবে একই দিন দুপুরের আগে ফজর কাযা করলে ফজরের সুন্নতও পড়বেন।' }],
    ref: BZ('Qada prayers', 'কাযা নামাজ'),
  },
  {
    id: 'travel', group: 'salah', title: { en: 'Praying while travelling', bn: 'সফরে নামাজ' },
    intro: { en: "You count as a traveller once you've left your town for a place about 77 km (48 miles) away, planning to stay less than 15 days.", bn: 'প্রায় ৭৭ কিমি (৪৮ মাইল) দূরে যাওয়ার নিয়তে শহর ছাড়লে এবং ১৫ দিনের কম থাকার নিয়ত থাকলে আপনি মুসাফির।' },
    steps: [
      { en: "Dhuhr, Asr and Isha fard become 2 rak'ahs (qasr).", bn: 'যোহর, আসর ও এশার ফরজ দুই রাকাত পড়বেন (কসর)।' },
      { en: "Fajr, Maghrib and Witr don't change.", bn: 'ফজর, মাগরিব ও বিতর বদলায় না।' },
      { en: 'Sunnah prayers can be left when you\'re in a hurry, but keep the Fajr Sunnah.', bn: 'তাড়া থাকলে সুন্নত ছাড়া যায়, তবে ফজরের সুন্নত পড়ুন।' },
      { en: 'Behind an imam who is not travelling, pray the full 4.', bn: 'মুকিম (স্থানীয়) ইমামের পেছনে পুরো চার রাকাত পড়ুন।' },
      { en: 'Planning to stay 15 days or more in one place? Pray in full there.', bn: 'এক জায়গায় ১৫ দিন বা বেশি থাকার নিয়ত হলে সেখানে পুরো নামাজ পড়ুন।' },
    ],
    notes: [{ en: 'In the Hanafi school, prayers are not joined together while travelling (only at Arafah and Muzdalifah during Hajj).', bn: 'হানাফি মাযহাবে সফরে দুই নামাজ একসাথে পড়া হয় না (শুধু হজে আরাফা ও মুযদালিফায়)।' }],
    ref: BZ("Traveller's prayer", 'মুসাফিরের নামাজ'),
  },

  /* -------------------------- Special prayers -------------------------- */
  {
    id: 'jumuah', group: 'special', title: { en: "Jumu'ah (Friday prayer)", bn: 'জুমার নামাজ' },
    intro: { en: "Jumu'ah takes the place of Dhuhr on Friday and is fard for adult men who are not travelling or ill.", bn: 'শুক্রবার জুমা যোহরের বদলে পড়া হয়; মুসাফির ও অসুস্থ ছাড়া প্রাপ্তবয়স্ক পুরুষের ওপর ফরজ।' },
    steps: [
      { en: 'Before: ghusl, clean clothes, perfume, and go early.', bn: 'আগে: গোসল, পরিষ্কার কাপড়, সুগন্ধি এবং আগে আগে মসজিদে যাওয়া।' },
      { en: "Pray 4 rak'ahs Sunnah before the khutbah.", bn: 'খুতবার আগে চার রাকাত সুন্নত পড়ুন।' },
      { en: 'Listen to the khutbah quietly. Don\'t talk or pray while it\'s being given.', bn: 'চুপ করে খুতবা শুনুন; খুতবার সময় কথা বলবেন না, নামাজও পড়বেন না।' },
      { en: "Pray the 2 rak'ahs fard behind the imam.", bn: 'ইমামের পেছনে দুই রাকাত ফরজ পড়ুন।' },
      { en: "Then 4 rak'ahs Sunnah (and 2 more).", bn: 'তারপর চার রাকাত সুন্নত (এবং আরও দুই রাকাত)।' },
    ],
    notes: [{ en: "Missed Jumu'ah with the congregation? Pray Dhuhr (4) instead. Read Surah Al-Kahf and send lots of Durood on Friday.", bn: 'জামাতে জুমা না পেলে যোহরের চার রাকাত পড়ুন। শুক্রবার সূরা কাহফ ও বেশি বেশি দরুদ পড়ুন।' }],
    ref: BZ("Jumu'ah prayer", 'জুমার নামাজ'),
  },
  {
    id: 'eid', group: 'special', title: { en: 'Eid prayer', bn: 'ঈদের নামাজ' },
    intro: { en: "Wajib in the Hanafi school. 2 rak'ahs in congregation with 6 extra takbirs, no adhan or iqamah, and the khutbah comes after.", bn: 'হানাফি মাযহাবে ওয়াজিব। জামাতে দুই রাকাত, ছয়টি অতিরিক্ত তাকবিরসহ; আজান-ইকামত নেই, খুতবা নামাজের পরে।' },
    steps: [
      { en: 'Make the intention, say Allahu Akbar and fold your hands. Recite the Thana.', bn: 'নিয়ত করে আল্লাহু আকবার বলে হাত বাঁধুন। সানা পড়ুন।', dua: 41 },
      { en: 'Three takbirs: raise your hands each time. Drop them after the 1st and 2nd, fold them after the 3rd.', bn: 'তিন তাকবির: প্রতিবার হাত তুলুন। প্রথম ও দ্বিতীয়বারের পর হাত ছেড়ে দিন, তৃতীয়বারের পর বাঁধুন।' },
      { en: 'The imam recites Al-Fatiha and a surah, then ruku and sujud as normal.', bn: 'ইমাম ফাতিহা ও সূরা পড়বেন, তারপর স্বাভাবিক রুকু-সিজদা।' },
      { en: 'In the 2nd rak\'ah, after the recitation: three takbirs with raised hands, dropping them each time.', bn: 'দ্বিতীয় রাকাতে কিরাতের পর তিন তাকবির, প্রতিবার হাত তুলে ছেড়ে দিন।' },
      { en: 'A fourth takbir, without raising the hands, takes you into ruku. Finish the prayer as normal.', bn: 'চতুর্থ তাকবির হাত না তুলে বলে রুকুতে যান। তারপর স্বাভাবিকভাবে নামাজ শেষ করুন।' },
      { en: 'Stay for the khutbah.', bn: 'খুতবা শুনুন।' },
    ],
    notes: [{ en: 'Eid al-Fitr: eat something sweet (an odd number of dates) and pay Fitrah before the prayer. Eid al-Adha: eat after the prayer. Say the takbir on the way and come back a different way.', bn: 'ঈদুল ফিতর: নামাজের আগে মিষ্টি কিছু (বেজোড় খেজুর) খান ও ফিতরা দিন। ঈদুল আযহা: নামাজের পরে খান। পথে তাকবির বলুন এবং অন্য পথে ফিরুন।' }],
    ref: BZ('Eid prayers', 'ঈদের নামাজ'),
  },
  {
    id: 'janazah', group: 'special', title: { en: 'Janazah (funeral prayer)', bn: 'জানাজার নামাজ' },
    intro: { en: 'Fard kifayah: if some people pray it, the rest are free of the duty. It is prayed standing, with 4 takbirs and no ruku or sujud.', bn: 'ফরজে কিফায়া: কিছু লোক আদায় করলে সবার দায়িত্ব আদায় হয়। দাঁড়িয়ে চার তাকবিরে পড়া হয়, রুকু-সিজদা নেই।' },
    steps: [
      { en: '1st takbir: raise your hands, fold them, and recite the Thana.', bn: 'প্রথম তাকবির: হাত তুলে বাঁধুন এবং সানা পড়ুন।', dua: 41 },
      { en: '2nd takbir (hands stay folded): recite the Durood Ibrahim.', bn: 'দ্বিতীয় তাকবির (হাত না তুলে): দরুদে ইবরাহিম পড়ুন।', dua: 47 },
      { en: '3rd takbir: make dua for the deceased.', bn: 'তৃতীয় তাকবির: মৃত ব্যক্তির জন্য দোয়া করুন।', dua: 129 },
      { en: '4th takbir: then give salam to the right and the left.', bn: 'চতুর্থ তাকবির: তারপর ডানে ও বামে সালাম ফেরান।' },
    ],
    notes: [{ en: 'Only the first takbir has raised hands in the Hanafi school. Follow the imam; he says the takbirs aloud and you recite quietly.', bn: 'হানাফি মাযহাবে শুধু প্রথম তাকবিরে হাত তোলা হয়। ইমামকে অনুসরণ করুন; তিনি জোরে তাকবির বলবেন, আপনি নিচু স্বরে পড়বেন।' }],
    ref: BZ('Janazah prayer', 'জানাজার নামাজ'),
  },
  {
    id: 'taraweeh', group: 'special', title: { en: 'Taraweeh', bn: 'তারাবিহ' },
    intro: { en: "Sunnah mu'akkadah in Ramadan: 20 rak'ahs after Isha and before Witr, in the Hanafi school.", bn: 'রমজানে সুন্নতে মুয়াক্কাদা: হানাফি মাযহাবে এশার পর ও বিতরের আগে ২০ রাকাত।' },
    steps: [
      { en: 'Pray Isha (fard and Sunnah) first.', bn: 'আগে এশার ফরজ ও সুন্নত পড়ুন।' },
      { en: "Pray Taraweeh in sets of 2 rak'ahs, each with its own salam.", bn: 'দুই রাকাত করে, প্রতি দুই রাকাতে সালাম ফিরিয়ে তারাবিহ পড়ুন।' },
      { en: "After every 4 rak'ahs, rest for a short while with dhikr.", bn: 'প্রতি চার রাকাত পর একটু বিশ্রাম নিন ও জিকির করুন।' },
      { en: 'Pray Witr after Taraweeh (in congregation during Ramadan).', bn: 'তারাবিহর পর বিতর পড়ুন (রমজানে জামাতে)।' },
    ],
    notes: [{ en: 'Praying it in congregation and hearing the whole Quran recited once in the month are both Sunnah. Track nights on the fasting screen.', bn: 'জামাতে পড়া এবং পুরো মাসে একবার খতম শোনা সুন্নত। রোজার পাতায় রাতগুলোর হিসাব রাখুন।' }],
    ref: BZ('Taraweeh', 'তারাবিহ'),
  },
  {
    id: 'istikhara', group: 'special', title: { en: 'Istikhara (asking Allah for guidance)', bn: 'ইস্তিখারা' },
    intro: { en: 'For a choice that is allowed but you\'re unsure about: a job, a move, a marriage proposal. Not for things that are clearly required or forbidden.', bn: 'বৈধ কোনো বিষয়ে সিদ্ধান্ত নিতে দ্বিধা থাকলে: চাকরি, বাসা বদল, বিয়ের প্রস্তাব। যা স্পষ্ট ফরজ বা হারাম, তার জন্য নয়।' },
    steps: [
      { en: "Pray 2 rak'ahs of nafl, at any time that is not a prohibited time.", bn: 'নিষিদ্ধ সময় ছাড়া যেকোনো সময় দুই রাকাত নফল পড়ুন।' },
      { en: 'After the salam, recite the Istikhara dua. Where it says "this matter", have your choice in mind.', bn: 'সালামের পর ইস্তিখারার দোয়া পড়ুন। "এই কাজটি" বলার সময় আপনার বিষয়টি মনে রাখুন।', dua: 55 },
      { en: 'Then go ahead with what feels easier and keep asking people you trust. You don\'t need a dream or a sign.', bn: 'তারপর যা সহজ মনে হয় তা করুন এবং বিশ্বস্ত লোকের পরামর্শ নিতে থাকুন। স্বপ্ন বা কোনো চিহ্ন দেখা জরুরি নয়।' },
      { en: 'You can repeat it on more days if you\'re still unsure.', bn: 'এখনও দ্বিধা থাকলে কয়েক দিন আবার করতে পারেন।' },
    ],
    ref: { en: 'Bukhari 1162 · Bahishti Zewar · Istikhara', bn: 'বুখারি ১১৬২ · বেহেশতী জেওর · ইস্তিখারা' },
  },
  {
    id: 'eclipse', group: 'special', title: { en: 'Eclipse prayer', bn: 'সূর্যগ্রহণ ও চন্দ্রগ্রহণের নামাজ' },
    intro: { en: 'When an eclipse happens, the Prophet ﷺ told us to pray and make dua until it clears.', bn: 'গ্রহণ লাগলে নবী ﷺ গ্রহণ শেষ হওয়া পর্যন্ত নামাজ ও দোয়ায় থাকতে বলেছেন।' },
    steps: [
      { en: "Solar eclipse: 2 rak'ahs in congregation, with no adhan or iqamah. Long recitation, one ruku in each rak'ah (Hanafi).", bn: 'সূর্যগ্রহণ: আজান-ইকামত ছাড়া জামাতে দুই রাকাত। লম্বা কিরাত, প্রতি রাকাতে এক রুকু (হানাফি)।' },
      { en: "Lunar eclipse: 2 rak'ahs or more, on your own at home.", bn: 'চন্দ্রগ্রহণ: ঘরে একা দুই বা ততোধিক রাকাত।' },
      { en: 'Afterwards, make dua, dhikr and istighfar until the eclipse is over.', bn: 'নামাজের পর গ্রহণ শেষ না হওয়া পর্যন্ত দোয়া, জিকির ও ইস্তিগফার করুন।' },
    ],
    notes: [{ en: 'Visible eclipses for your location show in the Hijri calendar, with an alert before they start.', bn: 'আপনার এলাকায় দেখা যাবে এমন গ্রহণ হিজরি ক্যালেন্ডারে দেখায়, শুরুর আগে অ্যালার্টও আসে।' }],
    ref: { en: 'Bukhari 1040 · Bahishti Zewar · Eclipse prayer', bn: 'বুখারি ১০৪০ · বেহেশতী জেওর · গ্রহণের নামাজ' },
  },

  /* ------------------------------ Fasting ------------------------------ */
  {
    id: 'breaksFast', group: 'fasting', title: { en: 'What breaks a fast', bn: 'যেসব কারণে রোজা ভাঙে' },
    intro: { en: 'These break the fast when done on purpose and while remembering you\'re fasting.', bn: 'রোজার কথা মনে থাকা অবস্থায় ইচ্ছাকৃতভাবে এগুলো করলে রোজা ভেঙে যায়।' },
    steps: [
      { en: 'Eating or drinking anything, including medicine by mouth.', bn: 'যেকোনো কিছু খাওয়া বা পান করা, মুখে ওষুধ খাওয়াসহ।' },
      { en: 'Smoking.', bn: 'ধূমপান করা।' },
      { en: 'Intercourse.', bn: 'সহবাস করা।' },
      { en: 'Making yourself vomit a mouthful.', bn: 'ইচ্ছা করে মুখ ভরে বমি করা।' },
      { en: 'Swallowing something that reached the throat while rinsing the mouth or nose.', bn: 'কুলি বা নাকে পানি দেওয়ার সময় গলায় পানি চলে যাওয়া।' },
    ],
    notes: [
      { en: "These don't break it: eating or drinking by forgetting, vomiting without trying, a wet dream, swallowing your own saliva, eye drops, kohl, and brushing your teeth without swallowing.", bn: 'এগুলোতে রোজা ভাঙে না: ভুলে খাওয়া-পান করা, অনিচ্ছায় বমি, স্বপ্নদোষ, নিজের থুথু গেলা, চোখে ড্রপ, সুরমা, না গিলে দাঁত মাজা।' },
      { en: 'Breaking a Ramadan fast on purpose by eating, drinking or intercourse needs kaffarah as well as a make-up day. See Kaffarah.', bn: 'রমজানের রোজা ইচ্ছাকৃত খাওয়া, পান করা বা সহবাসে ভাঙলে কাযার সাথে কাফফারাও লাগে। কাফফারা দেখুন।' },
      { en: 'For injections, inhalers and other medical questions, ask your local scholar.', bn: 'ইনজেকশন, ইনহেলার ও অন্যান্য চিকিৎসা-সংক্রান্ত প্রশ্ন স্থানীয় আলেমের কাছে জেনে নিন।' },
    ],
    ref: BZ('What breaks a fast', 'রোজা ভঙ্গের কারণ'),
  },
  {
    id: 'qadaFast', group: 'fasting', title: { en: 'Making up missed fasts', bn: 'রোজার কাযা ও ফিদিয়া' },
    intro: { en: 'Ramadan fasts missed through illness, travel, menstruation or post-birth bleeding are made up later, one day for each day.', bn: 'অসুখ, সফর, হায়েজ বা নেফাসের কারণে ছুটে যাওয়া রমজানের রোজা পরে দিনে দিনে কাযা করতে হয়।' },
    steps: [
      { en: 'Fast one day for each day missed, any time in the year.', bn: 'প্রতিটি ছুটে যাওয়া দিনের বদলে বছরের যেকোনো সময় একটি রোজা রাখুন।' },
      { en: "They don't have to be in a row.", bn: 'একটানা রাখা জরুরি নয়।' },
      { en: 'Not on the days of Eid or the three days after Eid al-Adha.', bn: 'ঈদের দিন এবং ঈদুল আযহার পরের তিন দিন রাখবেন না।' },
      { en: 'Try to finish them before the next Ramadan.', bn: 'পরের রমজানের আগে শেষ করার চেষ্টা করুন।' },
    ],
    notes: [{ en: "If you can never fast again (old age or a lasting illness), give fidya instead: for each day, feed one poor person, the same amount as Fitrah. The Charity tool works it out.", bn: 'বার্ধক্য বা স্থায়ী অসুখে আর কখনো রোজা রাখতে না পারলে ফিদিয়া দিন: প্রতিদিনের জন্য একজন গরিবকে খাওয়ান, ফিতরার সমান পরিমাণ। দান ক্যালকুলেটরে হিসাব করা যায়।' }],
    ref: BZ('Qada and fidya', 'কাযা ও ফিদিয়া'),
  },
  {
    id: 'kaffarah', group: 'fasting', title: { en: 'Kaffarah', bn: 'কাফফারা' },
    intro: { en: 'Kaffarah is due when someone breaks a Ramadan fast on purpose, by eating, drinking or intercourse, without a valid reason.', bn: 'বিনা কারণে ইচ্ছাকৃত খাওয়া, পান করা বা সহবাসে রমজানের রোজা ভাঙলে কাফফারা ওয়াজিব হয়।' },
    steps: [
      { en: 'Make up the broken fast (1 day).', bn: 'ভাঙা রোজাটির কাযা করুন (১ দিন)।' },
      { en: 'And fast 60 days in a row. If the chain breaks, start again.', bn: 'এবং একটানা ৬০টি রোজা রাখুন। মাঝে ভাঙলে আবার শুরু করতে হবে।' },
      { en: 'Only if you truly can\'t fast them: feed 60 poor people two full meals, or give each the amount of Fitrah.', bn: 'সত্যিই রোজা রাখতে না পারলে: ৬০ জন গরিবকে দুই বেলা পেট ভরে খাওয়ান, অথবা প্রত্যেককে ফিতরার সমান দিন।' },
    ],
    notes: [{ en: 'The Charity tool works out the amount for feeding 60 people.', bn: 'দান ক্যালকুলেটরে ৬০ জনকে খাওয়ানোর পরিমাণ হিসাব করা যায়।' }],
    ref: BZ('Kaffarah', 'কাফফারা'),
  },
];

export const guideById = (id) => GUIDES.find((g) => g.id === id);
