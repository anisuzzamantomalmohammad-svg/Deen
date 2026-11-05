// Surahs for salah: Al-Fatiha and the last 10 surahs, with a tick for each
// one you've memorised.
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Body, Label, Card, Press, Arabic, Tick, Segmented } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout } from '../ui/hooks';
import { SURAHS } from '../data/surahs';

const arNum = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

export default function SurahsScreen({ n: openN }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const [open, setOpen] = useState(openN || null);
  const [meaning, setMeaning] = useState(t.lang);
  const learned = app.data.surahsLearned || {};
  const count = SURAHS.filter((s) => learned[s.n]).length;
  const toggle = (n) => app.update((p) => ({ surahsLearned: { ...(p.surahsLearned || {}), [n]: !(p.surahsLearned || {})[n] } }));
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={t('Surahs for salah')} sub={t('{n} of {m} memorised', { n: count, m: SURAHS.length })} />
      <View style={{ height: 6, borderRadius: 3, backgroundColor: th.soft2, marginTop: 8, overflow: 'hidden' }}>
        <View style={{ width: `${(count / SURAHS.length) * 100}%`, height: 6, backgroundColor: th.ok }} />
      </View>
      <Segmented style={{ marginTop: 14 }} value={meaning} onChange={setMeaning} options={[{ id: 'en', label: 'English' }, { id: 'bn', label: 'বাংলা' }]} />
      {SURAHS.map((s) => {
        const isOpen = open === s.n;
        return (
          <Card key={s.n} style={{ marginTop: 10, paddingVertical: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingLeft: 14, paddingRight: 8, gap: 10 }}>
              <Press onPress={() => setOpen(isOpen ? null : s.n)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} scaleTo={0.99} accessibilityLabel={`${s.name}, ${isOpen ? t('Hide') : t('Show')}`}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Body size={11} weight="bold" color={th.accent}>{t.num(s.n)}</Body>
                </View>
                <View style={{ flex: 1 }}>
                  <Body size={14} weight="semi">{t.lang === 'bn' ? s.nameBn : s.name}</Body>
                  <Body size={11} color={th.muted}>{t('{n} verses', { n: s.verses.length })}</Body>
                </View>
                <Arabic size={17} color={th.accent} style={{ lineHeight: 28 }}>{s.nameAr}</Arabic>
                <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={th.faint} />
              </Press>
              <Press onPress={() => toggle(s.n)} hitSlop={8} style={{ padding: 4 }} accessibilityRole="checkbox" accessibilityState={{ checked: !!learned[s.n] }} accessibilityLabel={t('Memorised')}>
                <Tick done={!!learned[s.n]} />
              </Press>
            </View>
            {isOpen ? (
              <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                {s.verses.map((v, i) => (
                  <View key={i} style={{ borderTopWidth: 1, borderColor: th.line, paddingTop: 10, marginTop: i ? 10 : 0 }}>
                    <Arabic size={22} style={{ textAlign: 'right' }} selectable>{`${v.ar} ﴿${arNum(i + 1)}﴾`}</Arabic>
                    <Body size={12.5} color={th.muted} style={{ fontStyle: 'italic', marginTop: 2 }}>{v.tr}</Body>
                    <Body size={13.5} style={{ marginTop: 4, lineHeight: 20 }}>{meaning === 'bn' ? v.bn : v.en}</Body>
                  </View>
                ))}
                <Body size={11} color={th.faint} style={{ marginTop: 10 }}>{meaning === 'bn' ? 'অনুবাদ: মাওলানা মুহিউদ্দীন খান' : t('Translation: Saheeh International')}</Body>
              </View>
            ) : null}
          </Card>
        );
      })}
      <Label style={{ marginTop: 16 }}>{t('Sources')}</Label>
      <Body size={11} color={th.faint} style={{ marginTop: 4, lineHeight: 16 }}>{t('Arabic text from the Noble Qur’an Encyclopedia, transliteration from Tanzil, via the quran-json project (CC BY-SA 4.0).')}</Body>
    </ScrollView>
  );
}
