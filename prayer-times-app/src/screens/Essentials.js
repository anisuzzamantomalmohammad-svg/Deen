// Essentials: the Qibla on top, then the everyday tools that used to sit in
// Settings, the tasbih and the Learn section.
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Arabic, Card, Press, PatternBand } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import Svg, { Circle } from 'react-native-svg';
import { useLayout, monthName, hijriMonthName } from '../ui/hooks';
import { qiblaBearing, compassPoint, distanceToKaabaKm } from '../lib/prayer';

// The tools, in the order agreed for 1.6.0.
export const ESSENTIALS = [
  { id: 'timetable', icon: 'grid', label: 'Timetable' },
  { id: 'charity', icon: 'heart', label: 'Charity' },
  { id: 'importantDays', icon: 'star', label: 'Important days' },
  { id: 'dateConverter', icon: 'repeat', label: 'Date converter' },
  { id: 'share', icon: 'share-2', label: 'Share times' },
  { id: 'tasbih', icon: 'circle', label: 'Tasbih' },
];

export function openEssential(nav, id) {
  if (id === 'share') nav.openSheet('shareToday');
  else nav.push(id);
}

export default function EssentialsScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { latitude, longitude } = app.coords;
  const qibla = qiblaBearing(latitude, longitude);
  const km = Math.round(distanceToKaabaKm(latitude, longitude));
  const tb = app.data.tasbih || {};
  const tiles = ESSENTIALS.filter((x) => x.id !== 'timetable' && x.id !== 'tasbih');
  const pairs = [];
  for (let i = 0; i < tiles.length; i += 2) pairs.push(tiles.slice(i, i + 2));
  const target = tb.target || 33;
  const count = tb.count || 0;
  const tbPct = Math.min(1, (count % target || (count ? target : 0)) / target);
  const months = [
    { label: monthName(t.lang, app.today.getMonth()), go: () => nav.push('timetable', { basis: 'regular' }) },
    { label: t('Ramadan'), go: () => nav.push('timetable', { ramadan: true, tab: 'fasting' }) },
    { label: hijriMonthName(t.lang, app.hijri(app.today).monthIndex), go: () => nav.push('timetable', { basis: 'hijri' }) },
  ];
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 16, paddingHorizontal: L.pad, paddingBottom: L.bottomSpace }} showsVerticalScrollIndicator={false}>
      <View><PatternBand height={240 + L.insets.top} style={{ top: -(L.insets.top + 16), left: -L.pad, right: -L.pad }} /></View>
      <ScreenTitle title={t('Essentials')} />

      {/* Qibla */}
      <Card active onPress={() => nav.push('qibla')} style={{ marginTop: 8, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderColor: th.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Body size={7} color={th.faint} style={{ position: 'absolute', top: 2 }}>N</Body>
          <View style={{ width: 58, height: 58, alignItems: 'center', transform: [{ rotate: `${qibla}deg` }] }}>
            <View style={{ width: 2.5, height: 22, marginTop: 7, borderRadius: 1.5, backgroundColor: th.accent }} />
          </View>
          <View style={{ position: 'absolute', width: 7, height: 7, borderRadius: 3.5, backgroundColor: th.accent }} />
        </View>
        <View style={{ flex: 1 }}>
          <Serif size={18}>{t('Qibla {deg}° · {dir}', { deg: t.num(Math.round(qibla)), dir: t(compassPoint(qibla)) })}</Serif>
          <Body size={12} color={th.muted} style={{ marginTop: 2 }}>{t('Tap to open the compass · {n} km to the Kaaba', { n: t.num(km.toLocaleString('en-US')) })}</Body>
        </View>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </Card>

      {/* Timetable: three ways in */}
      <Card style={{ marginTop: 10, padding: 14 }}>
        <Press onPress={() => nav.push('timetable')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={t('Timetable')}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="grid" size={15} color={th.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Body size={14} weight="semi">{t('Timetable')}</Body>
            <Body size={11.5} color={th.muted}>{t('A whole month of times. Pick a month:')}</Body>
          </View>
        </Press>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {months.map((m) => (
            <Press key={m.label} onPress={m.go} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: th.glassLine || th.line, backgroundColor: th.glass }}>
              <Body size={12} weight="semi" color={th.accent} numberOfLines={1}>{m.label}</Body>
            </Press>
          ))}
        </View>
      </Card>

      {/* Tasbih: where the count is now */}
      <Card onPress={() => nav.push('tasbih')} style={{ marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Svg width={36} height={36}>
          <Circle cx={18} cy={18} r={14} stroke={th.line} strokeWidth={4} fill="none" />
          {tbPct > 0 ? <Circle cx={18} cy={18} r={14} stroke={th.accent} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 14 * tbPct} ${2 * Math.PI * 14}`} transform="rotate(-90 18 18)" /> : null}
        </Svg>
        <View style={{ flex: 1 }}>
          <Body size={14} weight="semi">{t('Tasbih')}</Body>
          <Body size={11.5} color={th.muted}>{t('Total so far: {n}', { n: t.num((tb.total || 0).toLocaleString('en-US')) })}</Body>
        </View>
        <Serif size={20} color={th.accent}>{`${t.num(count)} / ${t.num(target)}`}</Serif>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </Card>

      {/* Tools */}
      {pairs.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          {[0, 1].map((k) => {
            const x = row[k];
            if (!x) return <View key={k} style={{ flex: 1 }} />;
            return (
              <Card key={x.id} onPress={() => openEssential(nav, x.id)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 12 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={x.icon} size={15} color={th.accent} />
                </View>
                <Body size={13.5} weight="semi" numberOfLines={2} style={{ flex: 1, lineHeight: 17 }}>{t(x.label)}</Body>
              </Card>
            );
          })}
        </View>
      ))}

      {/* Learn */}
      <Card active onPress={() => nav.push('learn')} style={{ marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Arabic size={17} color={th.accent} style={{ lineHeight: 26 }}>ب</Arabic>
        </View>
        <View style={{ flex: 1 }}>
          <Body size={14} weight="semi">{t('Learn')}</Body>
          <Body size={11.5} color={th.muted}>{t('Arabic letters · Kids games')}</Body>
        </View>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </Card>
    </ScrollView>
  );
}
