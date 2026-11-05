// Share a dua or an ayah as a picture card, always with its source.
import React, { useRef, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme, useT, Serif, Body, Arabic, PrimaryButton, Segmented } from '../ui/kit';

export default function ShareCardSheet({ arabic, en, bn, source, title }) {
  const th = useTheme();
  const t = useT();
  const ref = useRef(null);
  const [lang, setLang] = useState(bn ? (t.lang === 'bn' ? 'bn' : 'en') : 'en');
  const [busy, setBusy] = useState(false);
  const text = lang === 'bn' ? bn : lang === 'en' ? en : null;
  const asText = () => [title, arabic, text, `— ${source}`, '', t('Shared from Deen')].filter(Boolean).join('\n\n');
  const share = async () => {
    setBusy(true);
    try {
      if (Platform.OS === 'web') await Share.share({ message: asText() });
      else {
        const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('Share') });
        else await Share.share({ message: asText() });
      }
    } catch (e) {
      try { await Share.share({ message: asText() }); } catch (e2) { /* dismissed */ }
    }
    setBusy(false);
  };
  const opts = [{ id: 'en', label: 'English' }, ...(bn ? [{ id: 'bn', label: 'বাংলা' }] : []), { id: 'ar', label: t('Arabic only') }];
  return (
    <View>
      <Segmented value={lang} onChange={setLang} options={opts} />
      <View ref={ref} collapsable={false} style={{ marginTop: 12, borderRadius: 22, overflow: 'hidden', backgroundColor: th.bg, borderWidth: 1, borderColor: th.accentLine, padding: 20 }}>
        {title ? <Serif size={16} color={th.accent} style={{ textAlign: 'center' }}>{title}</Serif> : null}
        <Arabic size={24} style={{ textAlign: 'center', marginTop: 10, lineHeight: 44 }}>{arabic}</Arabic>
        {text ? <Body size={14} style={{ textAlign: 'center', marginTop: 10, lineHeight: 21 }}>{text}</Body> : null}
        <Body size={12} weight="semi" color={th.accent} style={{ textAlign: 'center', marginTop: 12 }}>{source}</Body>
        <Body size={10} color={th.faint} style={{ textAlign: 'center', marginTop: 10 }}>Deen · دِين</Body>
      </View>
      <PrimaryButton style={{ marginTop: 14 }} label={busy ? '…' : t('Share as a picture')} onPress={share} />
    </View>
  );
}
