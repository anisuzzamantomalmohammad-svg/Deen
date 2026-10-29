// Backup & restore through the Android share sheet and file picker.
// Export writes a .json file and opens the share sheet (Drive, Files,
// WhatsApp, email...). Import picks that file back up.
import { Platform, Share } from 'react-native';

const fileName = () => `deen-backup-${new Date().toISOString().slice(0, 10)}.json`;

export async function exportBackup(data, dialogTitle) {
  const json = JSON.stringify({ app: 'Deen', exportedAt: new Date().toISOString(), data }, null, 2);
  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }
  try {
    const FS = require('expo-file-system');
    const Sharing = require('expo-sharing');
    const file = new FS.File(FS.Paths.cache, fileName());
    if (file.exists) file.delete();
    file.create();
    file.write(json);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle, UTI: 'public.json' });
      return true;
    }
  } catch (e) {
    // fall back to sharing the text itself
  }
  await Share.share({ message: json, title: dialogTitle });
  return true;
}

// Returns the parsed data object, null if cancelled; throws on a bad file.
export async function pickBackup() {
  let text = null;
  if (Platform.OS === 'web') {
    text = await new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return resolve(null);
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsText(f);
      };
      input.click();
    });
  } else {
    const DocumentPicker = require('expo-document-picker');
    const FS = require('expo-file-system');
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets || !res.assets[0]) return null;
    text = await new FS.File(res.assets[0].uri).text();
  }
  if (text === null) return null;
  return parseBackup(text);
}

export function parseBackup(text) {
  const parsed = JSON.parse(String(text).trim());
  const data = parsed && parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
  if (!data || typeof data !== 'object' || (!data.completedByDay && !data.calcMethod && !data.journalByDay)) {
    throw new Error('not-a-backup');
  }
  return data;
}
