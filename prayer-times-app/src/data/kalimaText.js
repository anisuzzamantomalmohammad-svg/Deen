// Bangla titles only. The meanings stay in English until a trusted published
// Bangla translation is added (the app flags them as not yet translated).
const BN = {
  1: { title: '১. কালিমা তাইয়্যেবা' },
  2: { title: '২. কালিমা শাহাদাত' },
  3: { title: '৩. কালিমা তামজিদ' },
  4: { title: '৪. কালিমা তাওহিদ' },
  5: { title: '৫. কালিমা ইস্তিগফার' },
  6: { title: '৬. কালিমা রদ্দে কুফর' },
};

export function kalimaText(k, lang) {
  if (lang === 'bn') return { title: (BN[k.id] || {}).title || k.title, translation: k.translation, untranslated: true };
  return { title: k.title, translation: k.translation, untranslated: false };
}
