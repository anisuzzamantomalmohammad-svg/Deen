// Daily background top-up of alerts. Alerts are only scheduled 7 days ahead,
// so without this they'd stop if the app wasn't opened for a week. Android
// runs this through WorkManager, roughly every 12 hours when the phone allows.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import { scheduleAll, trimPresented, snoozeAlert } from './alerts';
import { finaliseMonths } from './hijri';
import { autoBackupDue, writeAutoBackup } from './backup';
import { buildWidgetData, writeWidget } from './widget';
import { DEFAULT_COORDS, zonedParts } from './prayer';

export const TOPUP_TASK = 'deen-alert-topup';
export const NOTIF_TASK = 'deen-notification-action';
const PERSIST_KEY = '@prayerApp:v1';
const MOON_CACHE_KEY = '@deen:moonCache';

if (Platform.OS !== 'web') {
  try {
    TaskManager.defineTask(TOPUP_TASK, async () => {
      try {
        const raw = await AsyncStorage.getItem(PERSIST_KEY);
        if (!raw) return BackgroundTask.BackgroundTaskResult.Success;
        const s = JSON.parse(raw);
        const saved = (s.savedLocations || []).find((l) => l.id === s.activeLocationId);
        const coords = saved
          ? { latitude: saved.latitude, longitude: saved.longitude, timezone: saved.timezone }
          : s.lastAuto || DEFAULT_COORDS;
        const mcRaw = await AsyncStorage.getItem(MOON_CACHE_KEY);
        const mc = mcRaw ? JSON.parse(mcRaw) : null;
        const months = s.hijriMode !== 'ummalqura' && mc?.raw ? finaliseMonths(mc.raw, s.hijriOverrides || {}) : null;
        const cal = { mode: months ? 'auto' : 'ummalqura', offset: s.hijriOffset || 0, months };
        const zp = zonedParts(new Date(), coords.timezone);
        await scheduleAll({ ...s, coords }, new Date(zp.y, zp.m - 1, zp.d), cal);
        if (s.maxTwoAlerts !== false) await trimPresented(2);
        await writeWidget(buildWidgetData({ ...s, coords }, new Date(zp.y, zp.m - 1, zp.d), cal)).catch(() => {});
        if (autoBackupDue(s)) {
          const ok = await writeAutoBackup(s).catch(() => false);
          if (ok) await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify({ ...s, lastAutoBackupAt: new Date().toISOString() }));
        }
        return BackgroundTask.BackgroundTaskResult.Success;
      } catch (e) {
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });
    // Buttons that don't open the app (Snooze) arrive here when the app is
    // closed. The shape differs a little between versions, so read it loosely.
    TaskManager.defineTask(NOTIF_TASK, async ({ data }) => {
      try {
        const resp = data?.actionIdentifier ? data : data?.response || data?.data || data;
        const action = resp?.actionIdentifier;
        const req = resp?.notification?.request;
        if (action === 'snooze' && req) {
          const raw = await AsyncStorage.getItem(PERSIST_KEY);
          await snoozeAlert(req.content, raw ? JSON.parse(raw) : {});
          await Notifications.dismissNotificationAsync(req.identifier).catch(() => {});
        }
      } catch (e) {
        // ignore
      }
    });
  } catch (e) {
    // TaskManager unavailable
  }
}

export async function registerTopUp() {
  if (Platform.OS === 'web') return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    const already = await TaskManager.isTaskRegisteredAsync(TOPUP_TASK);
    if (!already) await BackgroundTask.registerTaskAsync(TOPUP_TASK, { minimumInterval: 12 * 60 });
    await Notifications.registerTaskAsync(NOTIF_TASK).catch(() => {});
  } catch (e) {
    // not available (e.g. some Expo Go builds)
  }
}
