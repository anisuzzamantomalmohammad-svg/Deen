// Today's times as a picture, in the app's colours, to send on WhatsApp etc.
import React, { useRef, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useApp } from '../state/store';
import { useTheme, useT, Serif, Body, Label, Arabic, PrimaryButton } from '../ui/kit';
import { longDate, hijriLabel, timeStr } from '../ui/hooks';
import { PRAYER_NAMES, PRAYER_AR, addMinutes } from '../lib/prayer';

export default function ShareTodaySheet() {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const tz = app.coords.timezone;
  const times = app.getDay(app.today);
  const seheri = addMinutes(times.Fajr, -(app.data.safetyBuffer || 0));
  const h = app.hijri(app.today);

  const asText = () => [
    `${app.locationName} · ${longDate(t.lang, app.today, true)}`,
    hijriLabel(t.lang, h),
    '',
    ...PRAYER_NAMES.map((n) => `${t(n)}  ${timeStr(t, times[n], tz)}`),
    `${t('Sunrise')}  ${timeStr(t, times.Sunrise, tz)}`,
    '',
    `${t('Seheri ends')}  ${timeStr(t, seheri, tz)} · ${t('Iftar')}  ${timeStr(t, times.Maghrib, tz)}`,
    '',
    t('Shared from Deen'),
  ].join('\n');

  const share = async () => {
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        await Share.share({ message: asText() });
      } else {
        const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t("Share today's times") });
        else await Share.share({ message: asText() });
      }
    } catch (e) {
      try { await Share.share({ message: asText() }); } catch (e2) { /* dismissed */ }
    }
    setBusy(false);
  };

  return (
    <View>
      <View ref={ref} collapsable={false} style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: th.bg, borderWidth: 1, borderColor: th.accentLine, padding: 18 }}>
        <View style={{ alignItems: 'center' }}>
          <Arabic size={18} color={th.accent} style={{ lineHeight: 28 }}>دِين</Arabic>
          <Serif size={20} numberOfLines={1}>{app.locationName}</Serif>
          <Body size={12} weight="semi" style={{ marginTop: 2 }}>{longDate(t.lang, app.today, true)}</Body>
          <Body size={11.5} color={th.accent}>{hijriLabel(t.lang, h)}</Body>
        </View>
        <View style={{ marginTop: 14, borderRadius: 16, backgroundColor: th.card, paddingVertical: 6, paddingHorizontal: 14 }}>
          {PRAYER_NAMES.map((n, i) => (
            <View key={n} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }, i > 0 && { borderTopWidth: 1, borderColor: th.isLight ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)' }]}>
              <Serif size={16} color={th.cardInk} style={{ flex: 1 }}>{t(n)}</Serif>
              <Arabic size={14} color={th.arcAr} style={{ lineHeight: 22, marginRight: 12 }}>{PRAYER_AR[n]}</Arabic>
              <Serif bold size={17} color={th.cardInk} style={{ width: 92, textAlign: 'right' }}>{timeStr(t, times[n], tz)}</Serif>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
          {[[t('Sunrise'), times.Sunrise], [t('Seheri ends'), seheri], [t('Iftar'), times.Maghrib]].map(([k, v]) => (
            <View key={k} style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: th.line, borderRadius: 12, paddingVertical: 8 }}>
              <Label size={7.5}>{k}</Label>
              <Serif size={14} style={{ marginTop: 2 }}>{timeStr(t, v, tz)}</Serif>
            </View>
          ))}
        </View>
        <Body size={10} color={th.faint} style={{ textAlign: 'center', marginTop: 10 }}>{t('Shared from Deen')}</Body>
      </View>
      <PrimaryButton style={{ marginTop: 14 }} icon="share-2" label={busy ? '…' : t('Share image')} onPress={share} disabled={busy} />
    </View>
  );
}
