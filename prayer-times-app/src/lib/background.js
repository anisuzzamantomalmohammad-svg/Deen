// Daily background top-up of alerts. Alerts are only scheduled 7 days ahead,
// so without this they'd stop if the app wasn't opened for a week. Android
// runs this through WorkManager, roughly every 12 hours when the phone allows.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { scheduleAll } from './alerts';
import { finaliseMonths } from './hijri';
import { DEFAULT_COORDS, zonedParts } from './prayer';

export const TOPUP_TASK = 'deen-alert-topup';
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
        return BackgroundTask.BackgroundTaskResult.Success;
      } catch (e) {
        return BackgroundTask.BackgroundTaskResult.Failed;
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
  } catch (e) {
    // not available (e.g. some Expo Go builds)
  }
}
