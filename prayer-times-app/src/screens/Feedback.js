// Send feedback: a suggestion or a problem, sent from inside the app.
import React, { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Body, Card, Input, PrimaryButton, Segmented } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout } from '../ui/hooks';
import { sendFeedback, feedbackReady } from '../lib/feedback';

export default function FeedbackScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const [type, setType] = useState('Suggestion');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const version = `Deen ${Constants.expoConfig?.version || ''} (${Constants.expoConfig?.android?.versionCode || ''}) · ${Platform.OS} ${Platform.Version || ''}`;
  const send = async () => {
    if (!msg.trim()) return;
    setBusy(true);
    try {
      await sendFeedback({ type, message: msg.trim(), app: version });
      setSent(true);
      setMsg('');
    } catch (e) {
      app.setToast(t("Couldn't send it. Check your internet and try again."));
    } finally {
      setBusy(false);
    }
  };
  // Until the form is connected, the page just says it's coming soon.
  if (!feedbackReady()) {
    return (
      <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }}>
        <ScreenTitle onBack={nav.pop} title={t('Send feedback')} />
        <Card active style={{ marginTop: 14, padding: 22, alignItems: 'center' }}>
          <Feather name="message-square" size={26} color={th.accent} />
          <Body size={16} weight="semi" style={{ marginTop: 10 }}>{t('Coming soon')}</Body>
          <Body size={12.5} color={th.muted} style={{ marginTop: 6, textAlign: 'center', lineHeight: 18 }}>{t('Soon you’ll be able to send a suggestion or a problem from right here, without leaving the app.')}</Body>
        </Card>
      </ScrollView>
    );
  }
  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
      <ScreenTitle onBack={nav.pop} title={t('Send feedback')} sub={t('A suggestion or a problem. It goes straight to the person who makes Deen.')} />
      {sent ? (
        <Card active style={{ marginTop: 14, padding: 16 }}>
          <Body size={14.5} weight="semi">{t('Thank you. Your message was sent.')}</Body>
          <Body size={12} color={th.muted} style={{ marginTop: 4 }}>{t('JazakAllahu khayran for helping make Deen better.')}</Body>
          <PrimaryButton ghost style={{ marginTop: 12 }} label={t('Send another')} onPress={() => setSent(false)} />
        </Card>
      ) : (
        <View style={{ marginTop: 14 }}>
          <Segmented value={type} onChange={setType} options={[{ id: 'Suggestion', label: t('Suggestion') }, { id: 'Problem', label: t('Problem') }]} />
          <Input value={msg} onChangeText={setMsg} multiline placeholder={type === 'Problem' ? t('What went wrong, and on which screen?') : t('What would make Deen better for you?')} style={{ marginTop: 12, minHeight: 140, textAlignVertical: 'top' }} maxLength={2000} />
          <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{t('Sent with: {v}. No name, email or prayer data is sent.', { v: version })}</Body>
          <PrimaryButton style={{ marginTop: 14 }} label={busy ? '…' : t('Send')} disabled={busy || !msg.trim() || !feedbackReady()} onPress={send} />
        </View>
      )}
    </ScrollView>
  );
}
