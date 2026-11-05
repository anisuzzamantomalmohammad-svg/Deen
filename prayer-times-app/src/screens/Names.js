// The 99 Names of Allah: list and detail, with a "learnt" tick.
import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Arabic, Card, Press, Tick, IconBtn } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout } from '../ui/hooks';
import { NAMES, NAMES_SOURCE } from '../data/names99';

export default function NamesScreen({ n }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const [open, setOpen] = useState(n || null);
  const learnt = app.data.namesLearnt || {};
  const count = Object.values(learnt).filter(Boolean).length;
  const toggle = (k) => app.update((p) => ({ namesLearnt: { ...(p.namesLearnt || {}), [k]: !(p.namesLearnt || {})[k] } }));
  if (open) {
    const x = NAMES[open - 1];
    return (
      <View style={{ flex: 1, paddingTop: L.insets.top + 12, paddingHorizontal: L.pad }}>
        <ScreenTitle onBack={() => (n ? nav.pop() : setOpen(null))} title={t('Name {n} of 99', { n: open })} />
        <Card active style={{ marginTop: 14, padding: 22, alignItems: 'center' }}>
          <Arabic size={46} color={th.accent} style={{ lineHeight: 80 }}>{x.ar}</Arabic>
          <Serif size={24} style={{ marginTop: 4 }}>{x.tr}</Serif>
          <Body size={15} color={th.muted} style={{ marginTop: 4, textAlign: 'center' }}>{x.en}</Body>
          {t.lang === 'bn' ? <Body size={11} color={th.faint} style={{ marginTop: 8 }}>{t('English meaning · Bangla not added yet')}</Body> : null}
        </Card>
        <Press onPress={() => toggle(open)} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: th.line }}>
          <Tick done={!!learnt[open]} />
          <Body size={14} weight="semi">{t('I’ve learnt this name')}</Body>
        </Press>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <IconBtn name="arrow-left" label={t('Previous')} onPress={() => setOpen(open > 1 ? open - 1 : 99)} />
          <Body size={11} color={th.faint} style={{ alignSelf: 'center' }}>{NAMES_SOURCE}</Body>
          <IconBtn name="arrow-right" label={t('Next')} onPress={() => setOpen(open < 99 ? open + 1 : 1)} />
        </View>
      </View>
    );
  }
  return (
    <FlatList
      data={NAMES}
      keyExtractor={(x) => String(x.n)}
      initialNumToRender={16}
      contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }}
      ListHeaderComponent={(
        <View>
          <ScreenTitle onBack={nav.pop} title={t('99 Names of Allah')} sub={t('{n} of 99 learnt', { n: count })} />
          <View style={{ height: 8 }} />
        </View>
      )}
      renderItem={({ item: x }) => (
        <Press onPress={() => setOpen(x.n)} scaleTo={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: th.line }}>
          <Body size={12} weight="semi" color={th.accent} style={{ width: 26 }}>{t.num(x.n)}</Body>
          <View style={{ flex: 1 }}>
            <Body size={14.5} weight="semi">{x.tr}</Body>
            <Body size={12} color={th.muted}>{x.en}</Body>
          </View>
          <Arabic size={21} color={th.accent} style={{ lineHeight: 36 }}>{x.ar}</Arabic>
          {learnt[x.n] ? <Feather name="check-circle" size={15} color={th.ok} /> : <View style={{ width: 15 }} />}
        </Press>
      )}
    />
  );
}
