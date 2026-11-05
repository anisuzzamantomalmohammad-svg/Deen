// Small extras: Preview a day (hidden in About: tap the version 5 times),
// the gold preview bar, and the "What's new" sheet shown once after updating.
import React, { useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Press, PrimaryButton } from '../ui/kit';
import { longDate, timeStr } from '../ui/hooks';
import { addDays } from '../lib/prayer';

const at = (d, h, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);

// The next day (within ~13 months) that matches a Hijri test.
function findDay(app, test) {
  for (let i = 0; i < 400; i++) {
    const d = addDays(app.today, i);
    if (test(app.hijri(d), d)) return d;
  }
  return null;
}

export function PreviewSheet({ onClose }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const [custom, setCustom] = useState(() => new Date());
  const picks = [
    { label: t('Ramadan day 1'), find: () => findDay(app, (h) => h.monthIndex === 8 && h.day === 1), h: 17, m: 30 },
    { label: t('Ramadan day 16'), find: () => findDay(app, (h) => h.monthIndex === 8 && h.day === 16), h: 10 },
    { label: t('Night 21'), find: () => findDay(app, (h) => h.monthIndex === 8 && h.day === 20), h: 23 },
    { label: t('Eid al-Fitr'), find: () => findDay(app, (h) => h.monthIndex === 9 && h.day === 1), h: 7, m: 30 },
    { label: t('Day of Arafah'), find: () => findDay(app, (h) => h.monthIndex === 11 && h.day === 9), h: 10 },
    { label: t('Eid al-Adha'), find: () => findDay(app, (h) => h.monthIndex === 11 && h.day === 10), h: 8 },
    { label: t('Ashura'), find: () => findDay(app, (h) => h.monthIndex === 0 && h.day === 10), h: 10 },
    { label: t('A Friday'), find: () => findDay(app, (h, d) => d.getDay() === 5 && d > app.today), h: 11 },
    { label: t('White Days'), find: () => findDay(app, (h) => h.day === 14 && h.monthIndex !== 8), h: 10 },
    { label: t('Safar'), find: () => app.today, h: new Date().getHours(), safar: true },
  ];
  const go = (when, safar) => {
    app.startPreview(when);
    if (safar) app.update({ travelConfirmed: app.today.toDateString() });
    onClose();
  };
  const shift = (ms) => setCustom((c) => new Date(c.getTime() + ms));
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {picks.map((p) => (
          <Press key={p.label} onPress={() => { const d = p.find(); if (d) go(at(d, p.h, p.m || 0), p.safar); }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: th.accentLine }}>
            <Body size={12.5} weight="semi" color={th.accent}>{p.label}</Body>
          </Press>
        ))}
      </View>
      <Label style={{ marginTop: 18, marginBottom: 8 }}>{t('Any date and time')}</Label>
      <Card style={{ padding: 14 }}>
        <Serif size={17}>{`${longDate(t.lang, custom)} · ${timeStr(t, custom, app.coords.timezone)}`}</Serif>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {[[t('−1 day'), -86400000], [t('+1 day'), 86400000], [t('−1 hour'), -3600000], [t('+1 hour'), 3600000], [t('+15 min'), 900000]].map(([l, ms]) => (
            <Press key={l} onPress={() => shift(ms)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: th.line }}>
              <Body size={12} weight="semi" color={th.muted}>{l}</Body>
            </Press>
          ))}
        </View>
        <PrimaryButton style={{ marginTop: 12 }} label={t('Preview this moment')} onPress={() => go(custom)} />
      </Card>
    </View>
  );
}

// Gold bar at the top while previewing.
export function PreviewBar() {
  const app = useApp();
  const t = useT();
  if (!app.preview) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }}>
      <Press onPress={app.stopPreview} style={{ marginTop: 34, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D4A84B', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7 }}>
        <Feather name="eye" size={13} color="#1A1408" />
        <Body size={12} weight="semi" color="#1A1408">{`${t('Preview')} · ${longDate(t.lang, app.clock)} · ${timeStr(t, app.clock, app.coords.timezone, true)}`}</Body>
        <Body size={12} weight="bold" color="#1A1408">{t('Exit')}</Body>
      </Press>
    </View>
  );
}

// "What's new": a few highlights, tap one to try it.
export const WHATS_NEW_VERSION = '1.6.0';
export function WhatsNewSheet({ onClose }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const items = [
    { icon: 'refresh-cw', title: t('Same on both phones'), body: t('Sign in with Google and your log stays the same on two phones.'), go: () => nav.openSheet('account') },
    { icon: 'grid', title: t('Essentials'), body: t('Qibla, timetable, charity, mosques near you, tasbih and more, in one tab.'), go: () => nav.setTab('Essentials') },
    { icon: 'check-circle', title: t('Did you pray it?'), body: t('Late, on time or not yet, with your sunnah ticks on each prayer.'), go: () => nav.setTab('Prayers') },
    { icon: 'book', title: t('Quran reader'), body: t('The full Quran with Bangla and English, offline.'), go: () => nav.push('quran') },
    { icon: 'type', title: t('Learn'), body: t('Arabic letters step by step, and simple games for kids.'), go: () => nav.push('learn') },
    { icon: 'search', title: t('Ask Deen'), body: t('Ask anything and find the dua, guide or setting, offline.'), go: () => nav.push('ask') },
  ];
  const done = () => {
    app.update({ whatsNewSeen: WHATS_NEW_VERSION });
    onClose();
  };
  return (
    <View>
      {items.map((x) => (
        <Card key={x.title} onPress={() => { app.update({ whatsNewSeen: WHATS_NEW_VERSION }); onClose(); setTimeout(x.go, 250); }} style={{ marginBottom: 8, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={x.icon} size={15} color={th.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Body size={14} weight="semi">{x.title}</Body>
            <Body size={11.5} color={th.muted}>{x.body}</Body>
          </View>
          <Feather name="chevron-right" size={16} color={th.faint} />
        </Card>
      ))}
      <PrimaryButton style={{ marginTop: 8 }} label={t('Got it')} onPress={done} />
    </View>
  );
}
