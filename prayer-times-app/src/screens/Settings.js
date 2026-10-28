import React from 'react';
import { ScrollView, View } from 'react-native';
import Constants from 'expo-constants';
import { useApp, migrate } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Body, Card, Row, Toggle, Segmented, SectionLabel, Press, Arabic } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout } from '../ui/hooks';
import { CALC_METHODS } from '../lib/prayer';
import { DARK_PALETTES, LIGHT_PALETTES } from '../theme/palettes';
import { exportBackup, pickBackup } from '../lib/backup';

function Swatches({ list, value, onPick }) {
  const th = useTheme();
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10 }}>
      {list.map((p) => {
        const on = p.id === value;
        return (
          <Press
            key={p.id}
            onPress={() => onPick(p.id)}
            accessibilityState={{ selected: on }}
            accessibilityLabel={p.name}
            style={[{ width: '31%', flexGrow: 1, alignItems: 'center', padding: 6, borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent' }, on && { borderColor: th.accent }]}
          >
            <View style={{ alignSelf: 'stretch', height: 34, borderRadius: 10, backgroundColor: p.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(128,128,128,0.25)' }}>
              <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: p.accent }} />
              <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: p.ink }} />
            </View>
            <Body size={11} weight={on ? 'bold' : 'med'} color={on ? th.ink : th.muted} style={{ marginTop: 4 }}>{t(p.name)}</Body>
          </Press>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { data, update } = app;
  const method = CALC_METHODS.find((m) => m.id === data.calcMethod) || CALC_METHODS[0];
  const version = Constants.expoConfig?.version || '1.1.0';
  const build = Constants.expoConfig?.android?.versionCode;
  const lastBackupDays = data.lastBackupAt ? Math.floor((Date.now() - new Date(data.lastBackupAt).getTime()) / 86400000) : null;
  const alertsSub = data.notificationsEnabled ? (data.preReminderMins ? t('On · {n} min before', { n: data.preReminderMins }) : t('On')) : t('Off');

  const doExport = async () => {
    try {
      await exportBackup(data, t('Save your Deen backup'));
      update({ lastBackupAt: new Date().toISOString() });
    } catch (e) {
      app.setToast(t('Could not export the backup'));
    }
  };
  const doImport = async () => {
    try {
      const d = await pickBackup();
      if (!d) return;
      const merged = migrate({ ...d, onboarded: true });
      update(merged);
      app.setToast(t('Backup restored'));
    } catch (e) {
      app.setToast(t("That file isn't a Deen backup"));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 16, paddingHorizontal: L.pad, paddingBottom: L.bottomSpace }} showsVerticalScrollIndicator={false}>
      <ScreenTitle title={t('Settings')} />

      <SectionLabel>{t('Location')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row first icon="map-pin" label={app.locationName} sub={app.isAuto ? t('Using your location · updates when you travel') : t('Fixed location')} onPress={() => nav.openSheet('location')} />
      </Card>

      <SectionLabel>{t('Prayer times')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row
          first icon="sliders" label={t('Calculation method')} value={method.id === 'Karachi' ? 'Karachi' : t(method.label)}
          onPress={() => nav.openSheet('choice', { title: t('Calculation method'), value: data.calcMethod, options: CALC_METHODS.map((m) => ({ id: m.id, label: t(m.label) })), onPick: (v) => update({ calcMethod: v }), note: t('Karachi is used in Bangladesh, Pakistan and by many NZ masjids. Pick what your local masjid uses.') })}
        />
        <Row
          icon="sun" label={t('Asr time')} value={data.asrMethod === 'Hanafi' ? t('Hanafi') : t('Standard')}
          onPress={() => nav.openSheet('choice', { title: t('Asr time'), value: data.asrMethod, options: [{ id: 'Hanafi', label: t('Hanafi'), sub: t('Shadow twice the length, later Asr') }, { id: 'Standard', label: t('Standard'), sub: t("Shafi'i, Maliki, Hanbali: shadow equal length") }], onPick: (v) => update({ asrMethod: v }) })}
        />
        <Row icon="grid" label={t('Monthly timetable')} sub={t('View or share a full month')} onPress={() => nav.push('timetable')} />
        <Row
          icon="clock" label={t('Seheri ends before Fajr')} value={t('{n} min', { n: data.safetyBuffer })}
          onPress={() => nav.openSheet('choice', { title: t('Seheri ends before Fajr'), value: data.safetyBuffer, options: [0, 3, 5, 10, 15].map((n) => ({ id: n, label: n ? t('{n} minutes before', { n }) : t('At Fajr exactly') })), onPick: (v) => update({ safetyBuffer: v }), note: t('A few minutes of margin so you stop eating safely before Fajr.') })}
        />
      </Card>

      <SectionLabel>{t('Alerts & calendar')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row first icon="bell" label={t('Alerts')} value={alertsSub} onPress={() => nav.push('alerts')} />
        <Row icon="moon" label={t('Hijri calendar')} value={data.hijriMode === 'ummalqura' ? t('Umm al-Qura') : t('Moon sighting')} onPress={() => nav.push('hijriSettings')} />
      </Card>

      <SectionLabel>{t('Appearance · mode')}</SectionLabel>
      <Segmented value={data.themeMode} onChange={(v) => update({ themeMode: v })} options={[{ id: 'dark', label: t('Dark') }, { id: 'light', label: t('Light') }, { id: 'auto', label: t('Auto') }]} />
      <SectionLabel>{t('Dark mode colours')}</SectionLabel>
      <Card><Swatches list={DARK_PALETTES} value={data.darkPalette} onPick={(id) => update({ darkPalette: id, ...(data.themeMode === 'light' ? { themeMode: 'dark' } : {}) })} /></Card>
      <SectionLabel>{t('Light mode colours')}</SectionLabel>
      <Card><Swatches list={LIGHT_PALETTES} value={data.lightPalette} onPick={(id) => update({ lightPalette: id, ...(data.themeMode === 'dark' ? { themeMode: 'light' } : {}) })} /></Card>
      <Body size={11} color={th.faint} style={{ marginTop: 6 }}>{t("Auto follows your phone's dark mode setting.")}</Body>

      <SectionLabel>{t('Language')}</SectionLabel>
      <Segmented value={data.lang} onChange={(v) => update({ lang: v })} options={[{ id: 'en', label: 'English' }, { id: 'bn', label: 'বাংলা' }]} />

      <SectionLabel>{t('Arabic text size')}</SectionLabel>
      <Card style={{ padding: 14 }}>
        <Arabic size={22} style={{ textAlign: 'center' }}>رَبِّ زِدْنِي عِلْمًا</Arabic>
        <Segmented style={{ marginTop: 10 }} value={String(data.arabicSize ?? 1)} onChange={(v) => update({ arabicSize: Number(v) })} options={[{ id: '0', label: t('Small') }, { id: '1', label: t('Normal') }, { id: '2', label: t('Large') }, { id: '3', label: t('Huge') }]} />
      </Card>

      <SectionLabel>{t('Text size')}</SectionLabel>
      <Card style={{ padding: 14 }}>
        <Body size={13} color={th.muted} style={{ textAlign: 'center' }}>{t('All text in the app')}</Body>
        <Segmented style={{ marginTop: 10 }} value={String(data.textSize ?? 1)} onChange={(v) => update({ textSize: Number(v) })} options={[{ id: '0', label: t('Small') }, { id: '1', label: t('Normal') }, { id: '2', label: t('Large') }, { id: '3', label: t('Largest') }]} />
      </Card>

      <SectionLabel>{t('General')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row first icon="smartphone" label={t('Vibration on tap')} right={<Toggle value={data.hapticsEnabled} onChange={(v) => update({ hapticsEnabled: v })} />} />
      </Card>

      <SectionLabel>{t('Backup')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row
          first icon="upload" label={t('Export backup')}
          sub={lastBackupDays === null ? t('Save your log, fasts, notes and settings to Drive, Files or WhatsApp') : lastBackupDays === 0 ? t('Last backup today') : t('Last backup {n} days ago', { n: lastBackupDays })}
          onPress={doExport}
        />
        <Row icon="bell" label={t('Monthly backup reminder')} right={<Toggle value={data.backupReminder !== false} onChange={(v) => update({ backupReminder: v })} />} />
        <Row icon="download" label={t('Restore from backup')} sub={t('Pick a Deen backup file')} onPress={doImport} />
      </Card>

      <SectionLabel>{t('About')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row first icon="info" label="Deen" value={`v${t.num(version)}${build ? ` (${t.num(build)})` : ''}`} />
        <Row icon="refresh-cw" label={t('Show the welcome screens again')} onPress={() => update({ onboarded: false })} />
        <Row
          icon="book-open" label={t('How times are worked out')}
          onPress={() => nav.openSheet('info', {
            title: t('How times are worked out'),
            body: t('Prayer times use the adhan library with your chosen method. Qibla uses the great-circle bearing to the Kaaba. Moon-sighting prediction uses the Astronomy Engine library with the Odeh (2006) visibility criterion. Everything runs on your phone; nothing is sent anywhere.'),
          })}
        />
      </Card>
      <View style={{ alignItems: 'center', marginTop: 22 }}>
        <Arabic size={16} color={th.accent}>دِين</Arabic>
        <Body size={11} color={th.faint}>{t('Prayer times, Qibla, Hijri calendar and daily worship')}</Body>
      </View>
    </ScrollView>
  );
}
