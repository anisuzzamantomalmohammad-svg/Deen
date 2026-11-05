// One guide: short numbered steps, with buttons to the duas recited in them.
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout } from '../ui/hooks';
import { guideById, GUIDE_GROUPS } from '../data/guides';
import { DUAS } from '../data/duas';
import { duaText } from '../data/duaText';

export default function GuideScreen({ id }) {
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const g = guideById(id);
  if (!g) return null;
  const lang = t.lang === 'bn' ? 'bn' : 'en';
  const group = GUIDE_GROUPS.find((x) => x.id === g.group);
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title="" />
      <Label color={th.accent}>{group ? group[lang] : ''}</Label>
      <Serif size={26} style={{ marginTop: 4 }}>{g.title[lang]}</Serif>
      <Body size={14} color={th.muted} style={{ marginTop: 8, lineHeight: 21 }}>{g.intro[lang]}</Body>

      <Card style={{ marginTop: 16, paddingVertical: 4 }}>
        {g.steps.map((s, i) => {
          const dua = s.dua ? DUAS.find((d) => d.id === s.dua) : null;
          return (
            <View key={i} style={[{ flexDirection: 'row', gap: 12, paddingVertical: 11, paddingHorizontal: 14 }, i > 0 && { borderTopWidth: 1, borderColor: th.line }]}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Body size={11.5} weight="bold" color={th.accent}>{t.num(i + 1)}</Body>
              </View>
              <View style={{ flex: 1 }}>
                <Body size={14} style={{ lineHeight: 20 }}>{s[lang]}</Body>
                {s.fard ? <Body size={10.5} weight="semi" color={th.amber} style={{ marginTop: 3 }}>{t('Fard')}</Body> : null}
                {dua ? (
                  <Press onPress={() => nav.push('dua', { id: dua.id })} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: th.accentLine }}>
                    <Feather name="book-open" size={12} color={th.accent} />
                    <Body size={11.5} weight="semi" color={th.accent} numberOfLines={1}>{duaText(dua, t.lang).title}</Body>
                  </Press>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>

      {(g.notes || []).map((n, i) => (
        <Card key={i} style={{ marginTop: 10, padding: 12, flexDirection: 'row', gap: 10 }}>
          <Feather name="info" size={15} color={th.accent} style={{ marginTop: 2 }} />
          <Body size={13} style={{ flex: 1, lineHeight: 19 }}>{n[lang]}</Body>
        </Card>
      ))}

      <Body size={12} weight="semi" color={th.accent} style={{ marginTop: 16 }}>{g.ref[lang]}</Body>
      <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{t('Short steps from Hanafi fiqh. If something applies to your own situation, check with your local imam.')}</Body>
    </ScrollView>
  );
}
