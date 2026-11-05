// "About this month": a few lines about each Hijri month, with sources.
// Short descriptions written for the app, not quoted text; every point has
// its reference so it can be checked. Months with nothing authentic beyond
// their name say so instead of filling the space.
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useT, Body, Card } from '../ui/kit';

export const MONTH_INFO = [
  {
    sacred: true,
    points: [
      { en: 'One of the four sacred months, when wrongdoing is especially serious.', bn: 'চারটি সম্মানিত মাসের একটি; এ মাসে অন্যায় আরও গুরুতর।', ref: 'Quran 9:36 · Bukhari 4662' },
      { en: 'The best fasting after Ramadan is in Muharram.', bn: 'রমজানের পর সবচেয়ে উত্তম রোজা মুহাররমের রোজা।', ref: 'Muslim 1163' },
      { en: 'Fasting the 10th (Ashura) wipes out the sins of the year before. Fast the 9th with it.', bn: '১০ তারিখ (আশুরা) রোজা আগের এক বছরের গুনাহ মিটিয়ে দেয়। সাথে ৯ তারিখও রাখুন।', ref: 'Muslim 1162, 1134' },
    ],
  },
  {
    points: [
      { en: 'No special acts of worship are taught for Safar.', bn: 'সফর মাসের জন্য বিশেষ কোনো ইবাদত শেখানো হয়নি।', ref: '' },
      { en: 'The Prophet ﷺ rejected the old belief that Safar brings bad luck.', bn: 'সফর মাসকে অশুভ মনে করার পুরোনো ধারণা নবী ﷺ বাতিল করেছেন।', ref: 'Bukhari 5707' },
    ],
  },
  {
    points: [
      { en: 'The Prophet ﷺ was born on a Monday, which is why he fasted Mondays.', bn: 'নবী ﷺ সোমবারে জন্মেছিলেন; এ কারণে তিনি সোমবার রোজা রাখতেন।', ref: 'Muslim 1162' },
      { en: 'The Hijrah ended with his arrival in Madinah in this month.', bn: 'এ মাসে মদিনায় পৌঁছানোর মাধ্যমে হিজরত সম্পন্ন হয়।', ref: 'Bukhari 3906' },
      { en: 'No special acts of worship are taught for this month itself.', bn: 'এ মাসের জন্য আলাদা কোনো ইবাদত শেখানো হয়নি।', ref: '' },
    ],
  },
  { points: [{ en: 'No special acts of worship are taught for this month. Keep up the regular Sunnah fasts.', bn: 'এ মাসের জন্য বিশেষ কোনো ইবাদত শেখানো হয়নি। নিয়মিত সুন্নত রোজাগুলো চালিয়ে যান।', ref: '' }] },
  { points: [{ en: 'No special acts of worship are taught for this month. Keep up the regular Sunnah fasts.', bn: 'এ মাসের জন্য বিশেষ কোনো ইবাদত শেখানো হয়নি। নিয়মিত সুন্নত রোজাগুলো চালিয়ে যান।', ref: '' }] },
  { points: [{ en: 'No special acts of worship are taught for this month. Keep up the regular Sunnah fasts.', bn: 'এ মাসের জন্য বিশেষ কোনো ইবাদত শেখানো হয়নি। নিয়মিত সুন্নত রোজাগুলো চালিয়ে যান।', ref: '' }] },
  {
    sacred: true,
    points: [
      { en: 'One of the four sacred months.', bn: 'চারটি সম্মানিত মাসের একটি।', ref: 'Quran 9:36 · Bukhari 4662' },
      { en: 'No special fast or prayer for Rajab is authentically taught. The date of Isra and Mi’raj is not firmly known; scholars differ.', bn: 'রজবের জন্য নির্দিষ্ট কোনো রোজা বা নামাজ সহিহভাবে প্রমাণিত নয়। ইসরা ও মেরাজের তারিখ নিশ্চিত নয়; আলেমদের মতভেদ আছে।', ref: '' },
    ],
  },
  {
    points: [
      { en: 'The Prophet ﷺ fasted more in Sha’ban than in any month other than Ramadan.', bn: 'রমজান ছাড়া অন্য যেকোনো মাসের চেয়ে নবী ﷺ শাবানে বেশি রোজা রাখতেন।', ref: 'Bukhari 1969 · Muslim 1156' },
      { en: 'It is the month when deeds are raised to Allah.', bn: 'এ মাসে আমল আল্লাহর কাছে তুলে ধরা হয়।', ref: 'Nasa’i 2357' },
    ],
  },
  {
    points: [
      { en: 'The month the Quran was sent down. Fasting it is fard.', bn: 'যে মাসে কুরআন নাজিল হয়েছে। এ মাসের রোজা ফরজ।', ref: 'Quran 2:183, 2:185' },
      { en: 'Whoever fasts it with faith, hoping for reward, is forgiven his past sins.', bn: 'যে ঈমান ও সওয়াবের আশায় রোজা রাখে, তার আগের গুনাহ মাফ করা হয়।', ref: 'Bukhari 38' },
      { en: 'Look for Laylat al-Qadr in the odd nights of the last ten.', bn: 'শেষ দশকের বেজোড় রাতে লাইলাতুল কদর খুঁজুন।', ref: 'Bukhari 2017' },
    ],
  },
  {
    points: [
      { en: 'Eid al-Fitr is on the 1st. Pay Fitrah before the Eid prayer.', bn: '১ তারিখ ঈদুল ফিতর। ঈদের নামাজের আগে ফিতরা দিন।', ref: 'Bukhari 1503' },
      { en: 'Six fasts in Shawwal after Ramadan are like fasting the whole year.', bn: 'রমজানের পর শাওয়ালের ছয় রোজা সারা বছর রোজা রাখার মতো।', ref: 'Muslim 1164' },
    ],
  },
  {
    sacred: true,
    points: [
      { en: 'One of the four sacred months.', bn: 'চারটি সম্মানিত মাসের একটি।', ref: 'Quran 9:36 · Bukhari 4662' },
      { en: 'The Prophet’s ﷺ Umrahs were in Dhul Qa’dah.', bn: 'নবী ﷺ-এর উমরাগুলো জিলকদ মাসে ছিল।', ref: 'Bukhari 1778' },
    ],
  },
  {
    sacred: true,
    points: [
      { en: 'One of the four sacred months, and the month of Hajj.', bn: 'চারটি সম্মানিত মাসের একটি, এবং হজের মাস।', ref: 'Quran 9:36, 2:197' },
      { en: 'No days are better for good deeds than its first ten.', bn: 'এর প্রথম দশ দিনের চেয়ে নেক আমলের জন্য উত্তম কোনো দিন নেই।', ref: 'Bukhari 969' },
      { en: 'Fasting the Day of Arafah (9th) wipes out the sins of the year before and the year after.', bn: 'আরাফার দিন (৯ তারিখ) রোজা আগের ও পরের এক বছরের গুনাহ মিটিয়ে দেয়।', ref: 'Muslim 1162' },
      { en: 'Eid al-Adha is on the 10th, with the sacrifice.', bn: '১০ তারিখ ঈদুল আযহা ও কুরবানি।', ref: 'Quran 108:2 · Bukhari 5545' },
    ],
  },
];

export function MonthInfoSheet({ monthIndex }) {
  const th = useTheme();
  const t = useT();
  const m = MONTH_INFO[monthIndex] || { points: [] };
  const lang = t.lang === 'bn' ? 'bn' : 'en';
  return (
    <View>
      {m.sacred ? (
        <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: th.accentSoft, marginBottom: 10 }}>
          <Body size={11.5} weight="semi" color={th.accent}>{t('Sacred month')}</Body>
        </View>
      ) : null}
      <Card style={{ paddingVertical: 4 }}>
        {m.points.map((p, i) => (
          <View key={i} style={[{ flexDirection: 'row', gap: 10, paddingVertical: 10, paddingHorizontal: 12 }, i > 0 && { borderTopWidth: 1, borderColor: th.line }]}>
            <Feather name={p.ref ? 'book-open' : 'info'} size={14} color={th.accent} style={{ marginTop: 3 }} />
            <View style={{ flex: 1 }}>
              <Body size={13.5} style={{ lineHeight: 20 }}>{p[lang]}</Body>
              {p.ref ? <Body size={11.5} weight="semi" color={th.accent} style={{ marginTop: 3 }}>{p.ref}</Body> : null}
            </View>
          </View>
        ))}
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 8 }}>{t('Short summaries with their sources, so you can check them. Ask your imam about anything specific.')}</Body>
    </View>
  );
}
