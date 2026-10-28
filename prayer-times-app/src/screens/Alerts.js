import React, { useEffect, useState } from 'react';
import { LayoutAnimation, Linking, Platform, ScrollView, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Body, Card, Row, Toggle, Segmented, Chip, PrimaryButton, Press } from '../ui/kit';
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

// A group of alerts that opens and closes. Closed, it shows a one-line summary.
function Group({ icon, title, summary, open, onToggle, children }) {
  const th = useTheme();
  return (
    <Card style={{ marginBottom: 10, overflow: 'hidden' }}>
      <Press onPress={onToggle} scaleTo={0.99} accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 }}>
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={15} color={th.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Body size={14.5} weight="semi">{title}</Body>
          <Body size={11.5} color={th.muted} numberOfLines={2}>{summary}</Body>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={17} color={th.faint} />
      </Press>
      {open ? <View style={{ borderTopWidth: 1, borderColor: th.line }}>{children}</View> : null}
    </Card>
  );
}

export default function AlertsScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { data, update } = app;
  const { perm, ask } = usePermission();
  const [open, setOpen] = useState('prayer');
  const toggle = (id) => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    setOpen((o) => (o === id ? null : id));
  };

  const hourLabel = (n) => `${t.num(`${((n + 11) % 12) + 1}:00`)} ${n >= 12 ? 'PM' : 'AM'}`;
  const kahfLabel = (v) => {
    if (v === 'off') return t('Off');
    if (v === 'fajr') return t('After sunrise');
    return hourLabel(Number(v));
  };
  const duaLabel = (v) => (!v || v === 'off' ? t('Off') : hourLabel(Number(v)));
  const jumuahLabel = (v) => (v > 0 ? t('{n} min before Dhuhr', { n: v }) : t('Off'));
  const onOff = (v) => (v ? t('On') : t('Off'));
  const nudgeNames = PRAYER_NAMES.filter((n) => (data.nudgeOn || {})[n]);
  const special = [data.newMonthAlert, data.eventEve, data.qadrNights, data.dhulHijjah, data.eidMorning, data.moonCheck].filter((v) => v !== false).length;

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
      <View style={{ height: 14 }} />

      <Group
        icon="bell" title={t('Prayer times')} open={open === 'prayer'} onToggle={() => toggle('prayer')}
        summary={data.notificationsEnabled ? `${t('On')}${data.preReminderMins ? ` · ${t('{n} min before', { n: data.preReminderMins })}` : ''}` : t('Off')}
      >
        <Row first label={t('Alert at each prayer')} sub={t('With a "Prayed" button on the alert')} right={<Toggle value={data.notificationsEnabled} onChange={(v) => update({ notificationsEnabled: v })} />} />
        {data.notificationsEnabled ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingBottom: 6, rowGap: 8 }}>
            {PRAYER_NAMES.map((n) => {
              const on = !(data.adhanOff || {})[n];
              return <Chip key={n} label={t(n)} icon={on ? 'check' : 'x'} active={on} onPress={() => update((p) => ({ adhanOff: { ...(p.adhanOff || {}), [n]: on } }))} />;
            })}
          </View>
        ) : null}
        <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderColor: th.line }}>
          <Body size={14} weight="med">{t('Before each prayer · minutes')}</Body>
          <Segmented style={{ marginTop: 8 }} value={String(data.preReminderMins || 0)} onChange={(v) => update({ preReminderMins: Number(v) })} options={[0, 5, 10, 15, 20].map((n) => ({ id: String(n), label: n ? t.num(n) : t('Off') }))} />
          {data.preReminderMins ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginTop: 10 }}>
              {PRAYER_NAMES.map((n) => {
                const on = !(data.preOff || {})[n];
                return <Chip key={n} label={t(n)} icon={on ? 'check' : 'x'} active={on} onPress={() => update((p) => ({ preOff: { ...(p.preOff || {}), [n]: on } }))} />;
              })}
            </View>
          ) : null}
        </View>
        <Row label={t('Hijri date on the Fajr alert')} right={<Toggle value={data.fajrHijri !== false} onChange={(v) => update({ fajrHijri: v })} />} />
      </Group>

      <Group
        icon="help-circle" title={t('"Did you pray?"')} open={open === 'nudge'} onToggle={() => toggle('nudge')}
        summary={nudgeNames.length ? `${nudgeNames.map((n) => t(n)).join(', ')} · ${t('{n} min before the time ends', { n: data.nudgeLead || 30 })}` : t('Off')}
      >
        <View style={{ padding: 14 }}>
          <Body size={12} color={th.muted}>{t("One quiet nudge if a prayer isn't ticked yet. For Asr and Isha it comes before the best time ends.")}</Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginTop: 10 }}>
            {PRAYER_NAMES.map((n) => {
              const on = !!(data.nudgeOn || {})[n];
              return <Chip key={n} label={t(n)} icon={on ? 'check' : undefined} active={on} onPress={() => update((p) => ({ nudgeOn: { ...(p.nudgeOn || {}), [n]: !on } }))} />;
            })}
          </View>
          <Segmented style={{ marginTop: 10 }} value={String(data.nudgeLead || 30)} onChange={(v) => update({ nudgeLead: Number(v) })} options={[15, 30, 60].map((n) => ({ id: String(n), label: t('{n} min', { n }) }))} />
        </View>
      </Group>

      <Group
        icon="sunrise" title={t('Fasting')} open={open === 'fasting'} onToggle={() => toggle('fasting')}
        summary={[data.fastingAlerts ? t('Seheri warning · Sunnah heads-up') : null, data.taraweehReminder !== false ? t('Taraweeh') : null].filter(Boolean).join(' · ') || t('Off')}
      >
        <Row first label={t('Fasting alerts')} sub={t('Seheri 30 min warning in Ramadan, and a heads-up the evening before a Sunnah fast')} right={<Toggle value={data.fastingAlerts} onChange={(v) => update({ fastingAlerts: v })} />} />
        <Row label={t('Taraweeh reminder')} sub={t('In Ramadan, 30 minutes after Isha')} right={<Toggle value={data.taraweehReminder !== false} onChange={(v) => update({ taraweehReminder: v })} />} />
      </Group>

      <Group
        icon="sun" title={t('Daily')} open={open === 'daily'} onToggle={() => toggle('daily')}
        summary={`${t('Morning dua')} ${duaLabel(data.morningDua)} · ${t('Tahajjud')} ${onOff(data.tahajjudReminder)}`}
      >
        <Row
          first label={t('Morning dua')} sub={t('One dua from the app each morning')} value={duaLabel(data.morningDua)}
          onPress={() => nav.openSheet('choice', { title: t('Morning dua'), value: data.morningDua || 'off', options: ['off', '6', '7', '8', '9'].map((v) => ({ id: v, label: duaLabel(v) })), onPick: (v) => update({ morningDua: v }) })}
        />
        <Row label={t('Tahajjud reminder')} sub={t('When the last third of the night starts')} right={<Toggle value={!!data.tahajjudReminder} onChange={(v) => update({ tahajjudReminder: v })} />} />
        <Row label={t('Monthly backup reminder')} sub={t('30 days after your last backup')} right={<Toggle value={data.backupReminder !== false} onChange={(v) => update({ backupReminder: v })} />} />
      </Group>

      <Group
        icon="users" title={t('Friday')} open={open === 'friday'} onToggle={() => toggle('friday')}
        summary={`${t("Jumu'ah")} ${jumuahLabel(data.jumuahReminder)} · ${t('Al-Kahf')} ${kahfLabel(data.kahfReminder)}${data.fridayLastHour !== false ? ` · ${t('Last hour')}` : ''}`}
      >
        <Row
          first label={t("Jumu'ah reminder")} value={jumuahLabel(data.jumuahReminder)}
          onPress={() => nav.openSheet('choice', { title: t("Jumu'ah reminder"), value: data.jumuahReminder, options: [0, 30, 60, 90, 120].map((n) => ({ id: n, label: jumuahLabel(n) })), onPick: (v) => update({ jumuahReminder: v }) })}
        />
        <Row
          label={t('Surah Al-Kahf')} value={kahfLabel(data.kahfReminder)}
          onPress={() => nav.openSheet('choice', { title: t('Surah Al-Kahf reminder'), value: data.kahfReminder, options: ['off', 'fajr', '9', '12', '15'].map((v) => ({ id: v, label: kahfLabel(v) })), onPick: (v) => update({ kahfReminder: v }), note: t('It is Sunnah to read Surah Al-Kahf on Friday (from Thursday sunset to Friday sunset).') })}
        />
        <Row label={t('The last hour of Friday')} sub={t('An hour before Maghrib, a time when dua is accepted')} right={<Toggle value={data.fridayLastHour !== false} onChange={(v) => update({ fridayLastHour: v })} />} />
      </Group>

      <Group icon="star" title={t('Special days')} open={open === 'special'} onToggle={() => toggle('special')} summary={t('{n} of 6 on', { n: special })}>
        <Row first label={t('New Hijri month')} right={<Toggle value={data.newMonthAlert !== false} onChange={(v) => update({ newMonthAlert: v })} />} />
        <Row label={t('Day before important days')} sub={t('Shab-e-Barat, Ashura, Arafah, Eid…')} right={<Toggle value={data.eventEve !== false} onChange={(v) => update({ eventEve: v })} />} />
        <Row label={t('Laylat al-Qadr nights')} sub={t('Odd nights of the last 10 of Ramadan')} right={<Toggle value={data.qadrNights !== false} onChange={(v) => update({ qadrNights: v })} />} />
        <Row label={t('First 10 days of Dhul Hijjah')} right={<Toggle value={data.dhulHijjah !== false} onChange={(v) => update({ dhulHijjah: v })} />} />
        <Row label={t('Eid morning')} sub={t('Takbir, Eid prayer, Zakat al-Fitr')} right={<Toggle value={data.eidMorning !== false} onChange={(v) => update({ eidMorning: v })} />} />
        <Row label={t('Moon-sighting check')} sub={t('On the 29th evening: is the new month likely tomorrow? One tap to correct it.')} right={<Toggle value={data.moonCheck !== false} onChange={(v) => update({ moonCheck: v })} />} />
      </Group>

      <Body size={11} color={th.faint} style={{ marginTop: 4 }}>{t('Alerts use the sound and vibration of your phone. Long-press a Deen notification to change its sound in Android settings.')}</Body>
    </ScrollView>
  );
}
