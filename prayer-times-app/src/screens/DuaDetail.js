import React, { useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press, Arabic, IconBtn, FadeSwitch } from '../ui/kit';
import { useLayout } from '../ui/hooks';
import { DUAS } from '../data/duas';
import { duaText, categoryName } from '../data/duaText';
import { KALIMAS } from '../data/kalimas';
import { kalimaText } from '../data/kalimaText';
import { useSwipe } from '../ui/swipe';

export default function DuaDetailScreen({ id, kalima }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const isKalima = kalima !== undefined && kalima !== null;
  const list = isKalima ? KALIMAS : DUAS;
  const [cur, setCur] = useState(isKalima ? kalima : id);
  const idx = Math.max(0, list.findIndex((x) => x.id === cur));
  const item = list[idx];
  const tx = isKalima ? kalimaText(item, t.lang) : duaText(item, t.lang);
  const fav = !isKalima && (app.data.favoriteDuaIds || []).includes(item.id);
  const sizeIdx = app.data.arabicSize ?? 1;

  // Within a category, step to the previous/next dua.
  const siblings = isKalima ? list : list.filter((d) => d.category === item.category);
  const sIdx = siblings.findIndex((x) => x.id === item.id);
  const prev = siblings[sIdx - 1];
  const next = siblings[sIdx + 1];

  const swipe = useSwipe(() => next && setCur(next.id), () => prev && setCur(prev.id));

  const plain = `${tx.title}\n\n${item.arabic}\n\n${item.transliteration}\n\n${tx.translation}${item.source ? `\n\n(${item.source})` : ''}`;
  const copy = async () => {
    try {
      await Clipboard.setStringAsync(plain);
      app.setToast(t('Copied'));
    } catch (e) {
      app.setToast(t('Could not copy'));
    }
  };
  const share = async () => {
    try {
      await Share.share({ message: `${plain}\n\n${t('Shared from Deen')}` });
    } catch (e) {
      // dismissed
    }
  };
  const toggleFav = () => app.update((p) => ({ favoriteDuaIds: (p.favoriteDuaIds || []).includes(item.id) ? p.favoriteDuaIds.filter((x) => x !== item.id) : [...(p.favoriteDuaIds || []), item.id] }));

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconBtn name="chevron-left" onPress={nav.pop} label={t('Back')} />
        <View style={{ flex: 1 }} />
        <IconBtn name="minus" onPress={() => app.update({ arabicSize: Math.max(0, sizeIdx - 1) })} label={t('Smaller Arabic')} />
        <IconBtn name="plus" onPress={() => app.update({ arabicSize: Math.min(3, sizeIdx + 1) })} label={t('Bigger Arabic')} />
        {!isKalima ? <IconBtn name="star" onPress={toggleFav} label={fav ? t('Remove from saved') : t('Save')} style={fav ? { backgroundColor: th.accentSoft, borderColor: th.accentLine } : null} /> : null}
      </View>
      <View style={{ flex: 1 }} {...swipe}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: L.pad, paddingTop: 14, paddingBottom: L.insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <FadeSwitch k={item.id} style={{ flex: 0 }}>
          <Label color={th.accent}>{isKalima ? t('Kalima') : categoryName(item.category, t.lang)}</Label>
          <Serif size={26} style={{ marginTop: 4 }}>{tx.title}</Serif>
          <Card style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 18 }}>
            <Arabic size={28} style={{ textAlign: 'right' }} selectable>{item.arabic}</Arabic>
          </Card>
          <Label style={{ marginTop: 18 }}>{t('Transliteration')}</Label>
          <Body size={14.5} color={th.muted} style={{ fontStyle: 'italic', marginTop: 4, lineHeight: 22 }} selectable>{item.transliteration}</Body>
          <Label style={{ marginTop: 18 }}>{t('Meaning')}</Label>
          <Body size={15.5} style={{ marginTop: 4, lineHeight: 24 }} selectable>{tx.translation}</Body>
          {tx.credit ? <Body size={11.5} color={th.muted} style={{ marginTop: 6 }}>{tx.credit}</Body> : null}
          {tx.untranslated ? <Body size={11.5} color={th.amber} style={{ marginTop: 6 }}>{t('Bangla meaning not added yet · showing the English meaning')}</Body> : null}
          {tx.note ? (
            <Card style={{ marginTop: 16, padding: 12, flexDirection: 'row', gap: 10 }}>
              <Feather name="info" size={15} color={th.accent} style={{ marginTop: 2 }} />
              <Body size={13} style={{ flex: 1, lineHeight: 19 }}>{tx.note}</Body>
            </Card>
          ) : null}
          {item.source && item.source !== '—' ? <Body size={12.5} weight="semi" color={th.accent} style={{ marginTop: 14 }}>{item.source}</Body> : null}
        </FadeSwitch>
      </ScrollView>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: L.insets.bottom + 12, paddingTop: 10, paddingHorizontal: L.pad, backgroundColor: th.bg, borderTopWidth: 1, borderColor: th.line, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconBtn name="arrow-left" onPress={() => prev && setCur(prev.id)} label={t('Previous')} style={!prev ? { opacity: 0.3 } : null} />
        <Press onPress={copy} style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 99, borderWidth: 1, borderColor: th.line }}>
          <Feather name="copy" size={15} color={th.ink} />
          <Body size={13} weight="semi">{t('Copy')}</Body>
        </Press>
        <Press onPress={share} style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 99, backgroundColor: th.card }}>
          <Feather name="share-2" size={15} color={th.cardInk} />
          <Body size={13} weight="semi" color={th.cardInk}>{t('Share')}</Body>
        </Press>
        <IconBtn name="arrow-right" onPress={() => next && setCur(next.id)} label={t('Next')} style={!next ? { opacity: 0.3 } : null} />
      </View>
    </View>
  );
}
