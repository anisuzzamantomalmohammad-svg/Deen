// Content for Learn: the Arabic path and the kids games.
// Letter names follow the usual English and Bangla (Qaida) names.
// Word meanings are plain dictionary glosses in English; Bangla is not added yet.
// Duas and steps point at the app's own checked data (duas.js, guides.js).

// The 28 letters. `join: false` = never joins the letter after it.
export const LETTERS = [
  { ar: 'ا', en: 'Alif', bn: 'আলিফ', join: false },
  { ar: 'ب', en: 'Ba', bn: 'বা' },
  { ar: 'ت', en: 'Ta', bn: 'তা' },
  { ar: 'ث', en: 'Tha', bn: 'ছা' },
  { ar: 'ج', en: 'Jim', bn: 'জীম' },
  { ar: 'ح', en: 'Ḥa', bn: 'হা' },
  { ar: 'خ', en: 'Kha', bn: 'খা' },
  { ar: 'د', en: 'Dal', bn: 'দাল', join: false },
  { ar: 'ذ', en: 'Dhal', bn: 'যাল', join: false },
  { ar: 'ر', en: 'Ra', bn: 'রা', join: false },
  { ar: 'ز', en: 'Zay', bn: 'যা', join: false },
  { ar: 'س', en: 'Sin', bn: 'সীন' },
  { ar: 'ش', en: 'Shin', bn: 'শীন' },
  { ar: 'ص', en: 'Ṣad', bn: 'সোয়াদ' },
  { ar: 'ض', en: 'Ḍad', bn: 'দোয়াদ' },
  { ar: 'ط', en: 'Ṭa', bn: 'ত্বোয়া' },
  { ar: 'ظ', en: 'Ẓa', bn: 'যোয়া' },
  { ar: 'ع', en: '‘Ayn', bn: 'আইন' },
  { ar: 'غ', en: 'Ghayn', bn: 'গাইন' },
  { ar: 'ف', en: 'Fa', bn: 'ফা' },
  { ar: 'ق', en: 'Qaf', bn: 'ক্বাফ' },
  { ar: 'ك', en: 'Kaf', bn: 'কাফ' },
  { ar: 'ل', en: 'Lam', bn: 'লাম' },
  { ar: 'م', en: 'Mim', bn: 'মীম' },
  { ar: 'ن', en: 'Nun', bn: 'নূন' },
  { ar: 'و', en: 'Waw', bn: 'ওয়াও', join: false },
  { ar: 'ه', en: 'Ha', bn: 'হা' },
  { ar: 'ي', en: 'Ya', bn: 'ইয়া' },
];

const TAT = 'ـ'; // tatweel: lets the font draw the joined shape
// The four shapes: alone, at the start, in the middle, at the end.
export function letterForms(l) {
  if (l.join === false) return [l.ar, l.ar, TAT + l.ar, TAT + l.ar];
  return [l.ar, l.ar + TAT, TAT + l.ar + TAT, TAT + l.ar];
}
export const letterName = (l, lang) => (lang === 'bn' ? l.bn : l.en);

// Joining letters: separate letters, then the joined word.
export const JOIN_WORDS = [
  { parts: ['ق', 'ل', 'م'], word: 'قلم', tr: 'Qalam' },
  { parts: ['ع', 'ل', 'م'], word: 'علم', tr: '‘Ilm' },
  { parts: ['ش', 'م', 'س'], word: 'شمس', tr: 'Shams' },
  { parts: ['ق', 'م', 'ر'], word: 'قمر', tr: 'Qamar' },
  { parts: ['ص', 'ب', 'ر'], word: 'صبر', tr: 'Ṣabr' },
  { parts: ['ك', 'ت', 'ا', 'ب'], word: 'كتاب', tr: 'Kitab' },
  { parts: ['س', 'ل', 'ا', 'م'], word: 'سلام', tr: 'Salam' },
  { parts: ['ي', 'و', 'م'], word: 'يوم', tr: 'Yawm' },
  { parts: ['ن', 'و', 'ر'], word: 'نور', tr: 'Nur' },
  { parts: ['د', 'ي', 'ن'], word: 'دين', tr: 'Din' },
  { parts: ['ر', 'ب'], word: 'رب', tr: 'Rabb' },
  { parts: ['ا', 'ل', 'ل', 'ه'], word: 'الله', tr: 'Allah' },
];

// Short words, with their vowel marks.
export const WORDS = [
  { ar: 'اللَّه', tr: 'Allah', en: 'Allah' },
  { ar: 'رَبّ', tr: 'Rabb', en: 'Lord' },
  { ar: 'دِين', tr: 'Din', en: 'Religion, way of life' },
  { ar: 'صَلَاة', tr: 'Ṣalah', en: 'Prayer' },
  { ar: 'قُرْآن', tr: 'Qur’an', en: 'The Quran (the recitation)' },
  { ar: 'كِتَاب', tr: 'Kitab', en: 'Book' },
  { ar: 'نُور', tr: 'Nur', en: 'Light' },
  { ar: 'سَلَام', tr: 'Salam', en: 'Peace' },
  { ar: 'رَحْمَة', tr: 'Raḥmah', en: 'Mercy' },
  { ar: 'جَنَّة', tr: 'Jannah', en: 'Paradise, garden' },
  { ar: 'عِلْم', tr: '‘Ilm', en: 'Knowledge' },
  { ar: 'قَلَم', tr: 'Qalam', en: 'Pen' },
  { ar: 'يَوْم', tr: 'Yawm', en: 'Day' },
  { ar: 'شَمْس', tr: 'Shams', en: 'Sun' },
  { ar: 'قَمَر', tr: 'Qamar', en: 'Moon' },
  { ar: 'أَرْض', tr: 'Arḍ', en: 'Earth' },
  { ar: 'سَمَاء', tr: 'Sama’', en: 'Sky' },
  { ar: 'صَبْر', tr: 'Ṣabr', en: 'Patience' },
];

// Short surahs for reading and memorising.
export const SHORT_SURAHS = [1, 112, 113, 114, 108, 103, 110, 109, 107, 106, 105, 97];

// Match the dua: when you say it, and the dua (id in duas.js).
export const MATCH_DUAS = [
  { id: 6, en: 'Before eating', bn: 'খাওয়ার আগে', easy: true },
  { id: 7, en: 'After eating', bn: 'খাওয়ার পরে', easy: true },
  { id: 13, en: 'Before sleeping', bn: 'ঘুমানোর আগে', easy: true },
  { id: 14, en: 'Waking up', bn: 'ঘুম থেকে উঠে', easy: true },
  { id: 117, en: 'When you sneeze', bn: 'হাঁচি দিলে', easy: true },
  { id: 110, en: 'When it rains', bn: 'বৃষ্টি হলে', easy: true },
  { id: 5, en: 'Leaving home', bn: 'ঘর থেকে বের হতে' },
  { id: 4, en: 'Coming home', bn: 'ঘরে ঢুকতে' },
  { id: 39, en: 'Entering the masjid', bn: 'মসজিদে ঢুকতে' },
  { id: 8, en: 'Starting a journey', bn: 'সফরে বাহনে উঠলে' },
];

// Wudu and salah steps: a short label for each step of the guide, in order.
// `i` is the step's index in guides.js, which shows the full step after.
export const STEP_SETS = {
  wudu: {
    guide: 'wudu',
    en: 'Wudu', bn: 'অজু',
    steps: [
      { en: 'Intention and Bismillah', bn: 'নিয়ত ও বিসমিল্লাহ' },
      { en: 'Wash both hands', bn: 'দুই হাত ধোয়া' },
      { en: 'Miswak and rinse the mouth', bn: 'মিসওয়াক ও কুলি' },
      { en: 'Rinse the nose', bn: 'নাকে পানি দেওয়া' },
      { en: 'Wash the face', bn: 'মুখ ধোয়া' },
      { en: 'Wash the arms to the elbows', bn: 'কনুইসহ হাত ধোয়া' },
      { en: 'Wipe the head, ears and neck', bn: 'মাথা, কান ও ঘাড় মাসেহ' },
      { en: 'Wash the feet to the ankles', bn: 'টাখনুসহ পা ধোয়া' },
      { en: 'Dua after wudu', bn: 'অজুর পরের দোয়া' },
    ],
  },
  salah: {
    guide: 'pray2',
    en: 'Salah', bn: 'নামাজ',
    steps: [
      { en: 'Face the Qibla, make the intention', bn: 'কিবলামুখী হয়ে নিয়ত' },
      { en: 'Allahu Akbar, fold the hands', bn: 'আল্লাহু আকবার বলে হাত বাঁধা' },
      { en: 'Thana', bn: 'সানা' },
      { en: 'Al-Fatiha and a surah', bn: 'ফাতিহা ও সূরা' },
      { en: 'Ruku (bow)', bn: 'রুকু' },
      { en: 'Stand up from ruku', bn: 'রুকু থেকে দাঁড়ানো' },
      { en: 'Sujud', bn: 'সিজদা' },
      { en: 'Sit, then the second sujud', bn: 'বসা, তারপর দ্বিতীয় সিজদা' },
      { en: 'Second rak‘ah', bn: 'দ্বিতীয় রাকাত' },
      { en: 'Tashahhud', bn: 'তাশাহহুদ' },
      { en: 'Durood', bn: 'দরুদ' },
      { en: 'A dua', bn: 'দোয়া' },
      { en: 'Salam right, then left', bn: 'ডানে, তারপর বামে সালাম' },
    ],
  },
};

export const GAMES = [
  { id: 'match', icon: 'link-2', en: 'Match the dua', sub: 'When do we say it?' },
  { id: 'steps', icon: 'list', en: 'Wudu and salah steps', sub: 'What comes next?' },
  { id: 'names', icon: 'star', en: '99 Names', sub: 'What does it mean?' },
  { id: 'letters', ar: 'ب', en: 'Arabic letters', sub: 'Which letter is it?' },
];

export const LESSONS = [
  { id: 'letters', en: 'Letter shapes', sub: 'The 28 letters and their 4 shapes' },
  { id: 'join', en: 'Joining letters', sub: 'How letters join into words' },
  { id: 'words', en: 'Short words', sub: 'Read your first words' },
  { id: 'read', en: 'Read a short chapter', sub: 'Verse by verse, with the meaning' },
  { id: 'memorise', en: 'Memorise', sub: 'Hide words and recite' },
];

// Shuffle a copy.
export function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
