// Alert check: is everything set up for alerts to ring, what comes next,
// and a test. Built from the same plan the app schedules from.
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Body, Card, SectionLabel, PrimaryButton } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout, shortDate, timeStr } from '../ui/hooks';
import { planAlerts, sendTest } from '../lib/alerts';
import { sameDay } from '../lib/prayer';
import { usePermission } from './Alerts';

function Check({ ok, warn, title, sub, first }) {
  const th = useTheme();
  const color = ok ? th.ok : warn ? th.amber : th.red;
  return (
    <View style={[{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14 }, !first && { borderTopWidth: 1, borderColor: th.line }]}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={ok ? 'check' : 'alert-triangle'} size={12} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Body size={14} weight="semi">{title}</Body>
        {sub ? <Body size={11.5} color={th.muted}>{sub}</Body> : null}
      </View>
    </View>
  );
}

export default function AlertCheckScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { data } = app;
  const { perm, ask } = usePermission();
  const [native, setNative] = useState(null);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const all = await Notifications.getAllScheduledNotificationsAsync();
        const shown = await Notifications.getPresentedNotificationsAsync();
        setNative({ scheduled: all.length, shown: shown.length });
      } catch (e) {
        setNative(null);
      }
    })();
  }, [app.alertsStatus]);
  const next = useMemo(() => planAlerts({ ...data, coords: app.coords }, app.today, app.cal).slice(0, 8), [data, app.today, app.cal]);
  const test = async () => {
    const r = await sendTest(data, 'prayer', t('Test: {name}', { name: t('Prayer times') }), t('This is how {name} alerts will sound.', { name: t('Prayer times') }));
    app.setToast(r === 'sent' ? t('Test alert in 3 seconds') : r === 'denied' ? t('Notifications are off for Deen') : t('Alerts only work in the app on your phone'));
  };
  const web = Platform.OS === 'web';
  const permOk = web || perm === 'granted';
  const scheduledOk = web || app.alertsStatus === 'scheduled';

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle onBack={nav.pop} title={t('Check my alerts')} sub={t('Settings › Alerts')} />

      <Card style={{ marginTop: 10, paddingVertical: 2 }}>
        <Check first ok={permOk} title={permOk ? t('Notifications are allowed') : t('Notifications are off for Deen')} sub={permOk ? null : t('Nothing can ring until you allow them.')} />
        <Check ok={data.notificationsEnabled} warn title={data.notificationsEnabled ? t('Prayer time alerts are on') : t('Prayer time alerts are off')} />
        <Check ok={scheduledOk} warn title={scheduledOk ? t('Alerts are set for the next 7 days') : t('Alerts are not set yet')} sub={native ? t('{n} waiting · {m} in your list now', { n: native.scheduled, m: native.shown }) : null} />
        {Platform.OS === 'android' ? <Check ok={!!data.batteryCardHidden} warn title={t('Battery setting')} sub={t('Set Deen to "Unrestricted" so alerts are not delayed.')} /> : null}
      </Card>
      {!permOk ? <PrimaryButton style={{ marginTop: 10 }} label={perm === 'blocked' ? t('Open phone settings') : t('Allow notifications')} onPress={ask} /> : null}
      {Platform.OS === 'android' && !data.batteryCardHidden ? (
        <PrimaryButton ghost style={{ marginTop: 10 }} label={t('Open battery settings')} onPress={async () => {
          try { await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS'); } catch (e) { Linking.openSettings(); }
          app.update({ batteryCardHidden: true });
        }} />
      ) : null}

      <SectionLabel>{t('Coming up')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {next.length ? next.map((a, i) => (
          <View key={`${a.kind}${a.date.getTime()}`} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 }, i > 0 && { borderTopWidth: 1, borderColor: th.line }]}>
            <View style={{ width: 62 }}>
              <Body size={12.5} weight="semi">{timeStr(t, a.date, app.coords.timezone, true)}</Body>
              <Body size={10.5} color={th.faint}>{sameDay(a.date, app.today) ? t('Today') : shortDate(t.lang, a.date)}</Body>
            </View>
            <View style={{ flex: 1 }}>
              <Body size={13.5} numberOfLines={1}>{a.title}</Body>
              <Body size={11.5} color={th.muted} numberOfLines={1}>{a.body}</Body>
            </View>
          </View>
        )) : <Body size={13} color={th.muted} style={{ padding: 14 }}>{t('No alerts in the next 7 days.')}</Body>}
      </Card>

      <PrimaryButton style={{ marginTop: 14 }} icon="send" label={t('Send a test')} onPress={test} />

      <SectionLabel>{t('On your watch')}</SectionLabel>
      <Card style={{ padding: 14 }}>
        <Body size={13} style={{ lineHeight: 19 }}>{t('Galaxy Wearable › Watch settings › Notifications: turn on Deen. Prayer alerts show the "Prayed" and "Snooze 10 min" buttons there too.')}</Body>
      </Card>
    </ScrollView>
  );
}
