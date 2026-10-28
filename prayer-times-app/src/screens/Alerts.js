import React, { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Body, Label, Card, Row, Toggle, Segmented, Chip, SectionLabel, PrimaryButton } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout } from '../ui/hooks';
import { PRAYER_NAMES } from '../lib/prayer';

export function usePermission() {
  const [perm, setPerm] = useState(Platform.OS === 'web' ? 'web' : null);
  const refresh = async () => {
    if (Platform.OS === 'web') return;
    try {
      const p = await Notifications.getPermissionsAsync();
      setPerm(p.status === 'granted' ? 'granted' : p.canAskAgain === false ? 'blocked' : 'undetermined');
    } catch (e) {
      setPerm('unknown');
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  const ask = async () => {
    if (Platform.OS === 'web') return;
    try {
      const p = await Notifications.requestPermissionsAsync();
      if (p.status !== 'granted' && p.canAskAgain === false) Linking.openSettings();
    } catch (e) {
      Linking.openSettings();
    }
    refresh();
  };
  return { perm, ask, refresh };
}

export default function AlertsScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { data, update } = app;
  const { perm, ask } = usePermission();

  const kahfLabel = (v) => {
    if (v === 'off') return t('Off');
    if (v === 'fajr') return t('After sunrise');
    const n = Number(v);
    return `${t.num(`${((n + 11) % 12) + 1}:00`)} ${n >= 12 ? 'PM' : 'AM'}`;
  };
  const jumuahLabel = (v) => (v > 0 ? t('{n} min before Dhuhr', { n: v }) : t('Off'));

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={t('Alerts')} sub={t('Settings › Alerts')} />

      {perm === 'blocked' || perm === 'undetermined' ? (
        <Card danger style={{ marginTop: 10, padding: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Feather name="bell-off" size={18} color={th.red} />
            <Body size={13} weight="semi" style={{ flex: 1 }}>{t('Notifications are off for Deen, so no alerts can ring.')}</Body>
          </View>
          <PrimaryButton style={{ marginTop: 12 }} label={perm === 'blocked' ? t('Open phone settings') : t('Allow notifications')} onPress={ask} />
        </Card>
      ) : null}
      {app.alertsStatus === 'scheduled' ? (
        <Body size={11.5} color={th.ok} style={{ marginTop: 8 }}>{t('Alerts are set for the next 7 days and top up automatically.')}</Body>
      ) : null}

      <SectionLabel>{t('Prayer times')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row first icon="bell" label={t('Alert at each prayer')} right={<Toggle value={data.notificationsEnabled} onChange={(v) => update({ notificationsEnabled: v })} />} />
      </Card>
      {data.notificationsEnabled ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, rowGap: 8 }}>
          {PRAYER_NAMES.map((n) => {
            const on = !(data.adhanOff || {})[n];
            return <Chip key={n} label={t(n)} icon={on ? 'check' : 'x'} active={on} onPress={() => update((p) => ({ adhanOff: { ...(p.adhanOff || {}), [n]: on } }))} />;
          })}
        </View>
      ) : null}

      <SectionLabel>{t('Remind me before each prayer · minutes')}</SectionLabel>
      <Segmented
        value={String(data.preReminderMins || 0)}
        onChange={(v) => update({ preReminderMins: Number(v) })}
        options={[0, 5, 10, 15, 20].map((n) => ({ id: String(n), label: n ? t.num(n) : t('Off') }))}
      />
      {data.preReminderMins ? (
        <>
          <Label style={{ marginTop: 14, marginBottom: 8 }}>{t('Which prayers · tap to turn off')}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
            {PRAYER_NAMES.map((n) => {
              const on = !(data.preOff || {})[n];
              return <Chip key={n} label={t(n)} icon={on ? 'check' : 'x'} active={on} onPress={() => update((p) => ({ preOff: { ...(p.preOff || {}), [n]: on } }))} />;
            })}
          </View>
          <Body size={11.5} color={th.muted} style={{ marginTop: 8 }}>{t('Example: "Fajr in {n} minutes".', { n: data.preReminderMins })}</Body>
        </>
      ) : null}

      <SectionLabel>{t('Fasting')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row first icon="sunrise" label={t('Fasting alerts')} sub={t('Seheri 30 min warning in Ramadan, and a heads-up the evening before a Sunnah fast')} right={<Toggle value={data.fastingAlerts} onChange={(v) => update({ fastingAlerts: v })} />} />
      </Card>

      <SectionLabel>{t('Friday')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row
          first icon="users" label={t("Jumu'ah reminder")} value={jumuahLabel(data.jumuahReminder)}
          onPress={() => nav.openSheet('choice', { title: t("Jumu'ah reminder"), value: data.jumuahReminder, options: [0, 30, 60, 90, 120].map((n) => ({ id: n, label: jumuahLabel(n) })), onPick: (v) => update({ jumuahReminder: v }) })}
        />
        <Row
          icon="book" label={t('Surah Al-Kahf')} value={kahfLabel(data.kahfReminder)}
          onPress={() => nav.openSheet('choice', { title: t('Surah Al-Kahf reminder'), value: data.kahfReminder, options: ['off', 'fajr', '9', '12', '15'].map((v) => ({ id: v, label: kahfLabel(v) })), onPick: (v) => update({ kahfReminder: v }), note: t('It is Sunnah to read Surah Al-Kahf on Friday (from Thursday sunset to Friday sunset).') })}
        />
      </Card>

      <SectionLabel>{t('New month')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row first icon="moon" label={t('Moon-sighting check')} sub={t('On the 29th evening: is the new month likely tomorrow? One tap to correct it.')} right={<Toggle value={data.moonCheck !== false} onChange={(v) => update({ moonCheck: v })} />} />
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 14 }}>{t('Alerts use the sound and vibration of your phone. Long-press a Deen notification to change its sound in Android settings.')}</Body>
    </ScrollView>
  );
}
