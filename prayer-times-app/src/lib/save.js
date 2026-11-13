// "Save to phone": writes a picture or PDF into a folder the person picks
// once (Android remembers the permission). No extra permissions needed.
import { Platform } from 'react-native';

async function pickFolder() {
  const { StorageAccessFramework: SAF } = require('expo-file-system/legacy');
  const res = await SAF.requestDirectoryPermissionsAsync();
  return res.granted ? res.directoryUri : null;
}

// Returns 'saved', 'cancelled' or 'failed'.
export async function saveToPhone(app, fileUri, name, mime) {
  if (Platform.OS !== 'android') return 'failed';
  const FS = require('expo-file-system/legacy');
  const SAF = FS.StorageAccessFramework;
  try {
    const base64 = await FS.readAsStringAsync(fileUri, { encoding: FS.EncodingType.Base64 });
    let dir = app.data.saveDirUri;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!dir) {
        dir = await pickFolder();
        if (!dir) return 'cancelled';
        app.update({ saveDirUri: dir });
      }
      try {
        const uri = await SAF.createFileAsync(dir, name, mime);
        await FS.writeAsStringAsync(uri, base64, { encoding: FS.EncodingType.Base64 });
        return 'saved';
      } catch (e) {
        dir = null; // the folder was removed or the permission lapsed: ask again once
      }
    }
    return 'failed';
  } catch (e) {
    return 'failed';
  }
}
