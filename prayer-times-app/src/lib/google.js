// Google sign-in and Drive backup. Optional: Deen works the same without it.
// Backups go in Drive's hidden app folder (drive.appdata), which only Deen
// can see. Nothing goes to any server of ours; there isn't one.
import { Platform } from 'react-native';

export const WEB_CLIENT_ID = '185405105452-0d86e1nop1f318kl312aquudqi3gcnmu.apps.googleusercontent.com';
const SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
export const KEEP_BACKUPS = 4;

let configured = false;
function lib() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
  try {
    const m = require('@react-native-google-signin/google-signin');
    if (!configured) {
      m.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, scopes: SCOPES, offlineAccess: false });
      configured = true;
    }
    return m;
  } catch (e) {
    return null;
  }
}

export const googleAvailable = () => !!lib();

const userOf = (u) => {
  const x = (u && (u.user || u)) || {};
  return { id: x.id || null, name: x.name || x.givenName || x.email || '', email: x.email || '', photo: x.photo || null };
};

// Returns the user, or null if cancelled. Throws on a real error.
export async function signIn() {
  const m = lib();
  if (!m) throw new Error('unsupported');
  await m.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await m.GoogleSignin.signIn();
  if (!res || res.type === 'cancelled') return null;
  return userOf(res.data);
}

export async function signOut() {
  const m = lib();
  if (!m) return;
  try {
    await m.GoogleSignin.revokeAccess();
  } catch (e) {
    // already revoked
  }
  try {
    await m.GoogleSignin.signOut();
  } catch (e) {
    // not signed in
  }
}

// A fresh access token, signing in silently if needed (works in the background too).
async function token() {
  const m = lib();
  if (!m) throw new Error('unsupported');
  if (!m.GoogleSignin.getCurrentUser()) {
    const r = await m.GoogleSignin.signInSilently();
    if (!r || r.type !== 'success') throw new Error('signed-out');
  }
  const t = await m.GoogleSignin.getTokens();
  return t.accessToken;
}

async function call(url, opts = {}, retry = true) {
  const tk = await token();
  const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${tk}` } });
  if (res.status === 401 && retry) {
    try {
      await lib().GoogleSignin.clearCachedAccessToken(tk);
    } catch (e) {
      // ignore
    }
    return call(url, opts, false);
  }
  if (!res.ok) throw new Error(`drive-${res.status}`);
  return res;
}

// Newest first: [{ id, name, modifiedTime, size }]
export async function listBackups() {
  const q = encodeURIComponent("name contains 'deen-backup'");
  const res = await call(`${API}/files?spaces=appDataFolder&q=${q}&orderBy=modifiedTime desc&pageSize=20&fields=files(id,name,modifiedTime,size)`);
  const j = await res.json();
  return j.files || [];
}

export async function uploadBackup(data) {
  const clean = { ...data, backupDirUri: null };
  const body = JSON.stringify({ app: 'Deen', exportedAt: new Date().toISOString(), data: clean });
  const meta = { name: `deen-backup-${new Date().toISOString().slice(0, 10)}.json`, parents: ['appDataFolder'], mimeType: 'application/json' };
  const b = `deen${Date.now()}`;
  const multipart = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`;
  await call(`${UPLOAD}/files?uploadType=multipart`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${b}` }, body: multipart });
  // Keep the newest few.
  try {
    const all = await listBackups();
    for (const f of all.slice(KEEP_BACKUPS)) await call(`${API}/files/${f.id}`, { method: 'DELETE' });
  } catch (e) {
    // not critical
  }
  return true;
}

export async function downloadBackup(id) {
  const res = await call(`${API}/files/${id}?alt=media`);
  return res.text();
}

export const driveBackupDue = (d, now = Date.now()) => !!(d.google && d.driveWeekly !== false && (!d.lastDriveBackupAt || now - new Date(d.lastDriveBackupAt).getTime() > 7 * 86400000));
