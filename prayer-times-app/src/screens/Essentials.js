// Essentials: the Qibla on top, then the everyday tools that used to sit in
// Settings, the tasbih and the Learn section.
import { TabTint, BigRing } from '../ui/rings';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Arabic, Card, Press, PatternBand } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import Svg, { Circle } from 'react-native-svg';
import { useLayout, monthName, hijriMonthName, timeStr } from '../ui/hooks';
import { qiblaBearing, compassPoint, distanceToKaabaKm } from '../lib/prayer';

// The tools, in the order agreed for 1.6.0.
export const ESSENTIALS = [
  { id: 'timetable', icon: 'grid', label: 'Timetable' },
  { id: 'charity', icon: 'heart', label: 'Charity' },
  { id: 'importantDays', icon: 'star', label: 'Important days' },
  { id: 'dateConverter', icon: 'repeat', label: 'Date converter' },
  { id: 'share', icon: 'share-2', label: 'Share times' },
  { id: 'weeks', icon: 'bar-chart-2', label: 'Weekly reports' },
  { id: 'tasbih', icon: 'circle', label: 'Tasbih' },
];

const SUBS = { charity: 'Zakat, Fitrah and more', importantDays: 'The year ahead', dateConverter: 'Hijri and Gregorian', share: 'Today as a picture', weeks: 'Friday to Friday' };

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
      <View><TabTint height={300 + L.insets.top} width={L.width} style={{ top: -(L.insets.top + 16), left: -L.pad, right: -L.pad }} /></View>
      <ScreenTitle title={t('Essentials')} />

      {/* Qibla */}
      <Card active onPress={() => nav.push('qibla')} style={{ marginTop: 8, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <BigRing size={62} w={4} segs={[[0.93, th.accent, true]]}>
          <View style={{ width: 40, height: 40, alignItems: 'center', transform: [{ rotate: `${qibla}deg` }] }}>
            <View style={{ width: 2.5, height: 17, marginTop: 3, borderRadius: 1.5, backgroundColor: th.accent }} />
          </View>
          <View style={{ position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: th.accent }} />
        </BigRing>
        <View style={{ flex: 1 }}>
          <Serif size={18}>{t('Qibla {deg}° · {dir}', { deg: t.num(Math.round(qibla)), dir: t(compassPoint(qibla)) })}</Serif>
          <Body size={12} color={th.muted} style={{ marginTop: 2 }}>{t('Tap to open the compass · {n} km to the Kaaba', { n: t.num(km.toLocaleString('en-US')) })}</Body>
        </View>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </Card>

      {/* Timetable and tasbih side by side */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Card style={{ flex: 1.15, padding: 12 }}>
          <Press onPress={() => nav.push('timetable')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel={t('Timetable')}>
            <Feather name="calendar" size={14} color={th.accent} />
            <Body size={14} weight="semi">{t('Timetable')}</Body>
          </Press>
          <Body size={11} color={th.muted} style={{ marginTop: 2 }}>{t('A month of times')}</Body>
          <View style={{ gap: 6, marginTop: 9 }}>
            {months.map((m, i) => (
              <Press key={m.label} onPress={m.go} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, borderWidth: i ? 1 : 0, borderColor: th.glassLine || th.line, backgroundColor: i ? 'transparent' : th.accent }}>
                <Body size={11.5} weight="semi" color={i ? th.accent : (th.isLight ? '#fff' : '#1a1408')} numberOfLines={1} style={{ flexShrink: 1 }}>{m.label}</Body>
                <Feather name="chevron-right" size={12} color={i ? th.accent : (th.isLight ? '#fff' : '#1a1408')} />
              </Press>
            ))}
          </View>
        </Card>
        <Card onPress={() => nav.push('tasbih')} style={{ flex: 1, padding: 12, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 70, height: 70, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={70} height={70} style={{ position: 'absolute' }}>
              <Circle cx={35} cy={35} r={30} stroke={th.line} strokeWidth={5} fill="none" />
              {tbPct > 0 ? <Circle cx={35} cy={35} r={30} stroke={th.accent} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 30 * tbPct} ${2 * Math.PI * 30}`} transform="rotate(-90 35 35)" /> : null}
            </Svg>
            <Serif size={19}>{t.num(count)}</Serif>
            <Body size={8} weight="bold" color={th.faint} style={{ letterSpacing: 1 }}>{t('OF {n}', { n: t.num(target) })}</Body>
          </View>
          <Body size={14} weight="semi" style={{ marginTop: 6 }}>{t('Tasbih')}</Body>
          <Body size={10.5} color={th.muted}>{t('{n} in total', { n: t.num((tb.total || 0).toLocaleString('en-US')) })}</Body>
        </Card>
      </View>

      {/* Fasting: always here, so it's easy to find on days you don't fast */}
      <Card onPress={() => nav.push('fasting')} style={{ marginTop: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="sunset" size={15} color={th.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Body size={14} weight="semi">{t('Fasting')}</Body>
          <Body size={11.5} color={th.muted}>{app.fastingToday ? t('Fasting today · Iftar at {time}', { time: timeStr(t, app.getDay(app.today).Maghrib, app.coords.timezone, true) }) : t('Today, this week and Sunnah fasts')}</Body>
        </View>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </Card>

      <Body size={9.5} weight="bold" color={th.faint} style={{ letterSpacing: 1.4, marginTop: 16, marginBottom: 2, marginLeft: 4 }}>{t('MORE')}</Body>
      {pairs.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          {[0, 1].map((k) => {
            const x = row[k];
            if (!x) return <View key={k} style={{ flex: 1 }} />;
            return (
              <Card key={x.id} onPress={() => openEssential(nav, x.id)} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 12 }}>
                <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={x.icon} size={15} color={th.accent} />
                </View>
                <Body size={13} weight="semi" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ marginTop: 8 }}>{t(x.label)}</Body>
                <Body size={10.5} color={th.muted} numberOfLines={1}>{t(SUBS[x.id])}</Body>
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
