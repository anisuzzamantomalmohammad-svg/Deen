// Google account: the Settings card, the Drive part of the Backup page, the
// restore sheet, the calendar sheet and the "welcome back" check.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp, migrate } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Row, Toggle, Press, PrimaryButton, SectionLabel } from '../ui/kit';
import { shortDate, timeStr } from '../ui/hooks';
import { googleAvailable, signIn, signOut, listBackups, uploadBackup, downloadBackup, driveBackupDue } from '../lib/google';
import { parseBackup } from '../lib/backup';
import { backupPayload } from '../lib/sync';
import { CAL_KINDS, DEFAULT_KINDS, calendarAvailable, askPermission, writableCalendars, createDeenCalendar, plannedEvents, removeEvents, writeEvents, clearDeenEvents } from '../lib/calsync';

// Initials in a gold ring. Deen never shows a photo of a person.
export const initialsOf = (user) => {
  const parts = ((user && (user.name || user.email)) || '?').trim().split(/[\s@.]+/).filter(Boolean);
  return ((parts[0] || '?').charAt(0) + (parts.length > 1 && user && user.name ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
};
export function Avatar({ user, size = 46 }) {
  const th = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: th.accent, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center' }}>
      <Body size={size * 0.34} weight="semi" color={th.ink}>{initialsOf(user)}</Body>
    </View>
  );
}

const daysAgo = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);

// Put a backup's data in place, keeping who is signed in on this phone.
// Theme, language and location stay as they are on this phone.
export function applyBackup(app, d) {
  app.update(migrate({ ...app.data, ...backupPayload(d), onboarded: true, setupDone: true }));
}

export function useGoogleSignIn() {
  const app = useApp();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (busy) return null;
    setBusy(true);
    try {
      const u = await signIn();
      if (u) {
        app.update({ google: u, googleCardHidden: false });
        app.setToast(t('Signed in as {name}', { name: u.email || u.name }));
      }
      return u;
    } catch (e) {
      app.setToast(String(e && e.message) === 'unsupported' ? t('Google sign-in works in the app on your phone') : t("Couldn't sign in. Check your internet and try again."));
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { go, busy };
}

/* ---------------- Account corner (top right of Settings) ---------------- */
// Initials in a gold ring with the name and a "Profile" label, so it's
// clear what it is. Tapping it opens the account sheet.
export function AccountCorner() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const u = app.data.google;
  const first = u ? (u.name || u.email || '').split(/[\s@]/)[0] : t('Sign in');
  return (
    <Press onPress={() => nav.openSheet('account')} accessibilityLabel={t('Profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: th.line, backgroundColor: th.soft, borderRadius: 99, paddingVertical: 4, paddingLeft: 4, paddingRight: 11 }}>
      {u ? <Avatar user={u} size={32} /> : (
        <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: th.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="user" size={14} color={th.accent} />
        </View>
      )}
      <View>
        <Body size={12.5} weight="semi" numberOfLines={1} style={{ maxWidth: 96 }}>{first}</Body>
        <Label size={7.5} color={th.accent}>{t('Profile')}</Label>
      </View>
    </Press>
  );
}

/* ---------------- Account sheet ---------------- */
export function AccountSheet({ onClose }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { go, busy } = useGoogleSignIn();
  const [working, setWorking] = useState(null);
  const u = app.data.google;
  if (!u) {
    return (
      <View>
        <Body size={13} color={th.muted} style={{ lineHeight: 19 }}>{t('Sign in with Google to back up to your own Drive, keep two phones the same, and add important days to your calendar.')}</Body>
        {googleAvailable() ? <GoogleButton onPress={go} busy={busy} style={{ marginTop: 14 }} /> : <Body size={12} color={th.faint} style={{ marginTop: 10 }}>{t('Google sign-in works in the app on your phone')}</Body>}
      </View>
    );
  }
  const ago = (iso) => {
    if (!iso) return t('Not yet');
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 2) return t('Just now');
    if (mins < 60) return t('{n} min ago', { n: mins });
    if (mins < 1440) return t('{n} hours ago', { n: Math.floor(mins / 60) });
    return t('{n} days ago', { n: Math.floor(mins / 1440) });
  };
  const doSync = async () => {
    setWorking('sync');
    const r = await app.syncNow();
    setWorking(null);
    app.setToast(r === 'ok' ? t('Synced') : r === 'error' ? t("Couldn't reach Google Drive. Try again later.") : t('Synced'));
  };
  const doBackup = async () => {
    setWorking('backup');
    try {
      await uploadBackup(app.data);
      app.update({ lastDriveBackupAt: new Date().toISOString() });
      app.setToast(t('Backed up to Google Drive'));
    } catch (e) {
      app.setToast(t("Couldn't reach Google Drive. Try again later."));
    } finally {
      setWorking(null);
    }
  };
  const out = async () => {
    await signOut();
    app.update({ google: null });
    app.setToast(t('Signed out'));
    onClose();
  };
  const Box = ({ k, v, ok }) => (
    <View style={{ flex: 1, borderWidth: 1, borderColor: th.line, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 10 }}>
      <Label size={7.5}>{k}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ok ? th.ok : th.amber }} />
        <Body size={12.5}>{v}</Body>
      </View>
    </View>
  );
  const recent = (iso, h) => !!iso && Date.now() - new Date(iso).getTime() < h * 3600000;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar user={u} size={52} />
        <View style={{ flex: 1 }}>
          <Serif size={18} numberOfLines={1}>{u.name || u.email}</Serif>
          <Body size={12} color={th.muted} numberOfLines={1}>{u.email}</Body>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <Box k={t('Drive backup')} v={ago(app.data.lastDriveBackupAt)} ok={!driveBackupDue(app.data)} />
        <Box k={t('Same on other phones')} v={t('Last synced {when}', { when: ago(app.data.lastSyncAt) })} ok={recent(app.data.lastSyncAt, 12)} />
      </View>
      <PrimaryButton style={{ marginTop: 14 }} label={working === 'sync' ? '…' : t('Sync now')} onPress={working ? undefined : doSync} />
      <Card style={{ marginTop: 10, paddingVertical: 2 }}>
        <Row first icon="upload-cloud" label={t('Back up now')} onPress={working ? undefined : doBackup} right={working === 'backup' ? <ActivityIndicator color={th.accent} /> : undefined} />
        <Row icon="download-cloud" label={t('Restore from Drive')} sub={t('Pick one of your backups')} onPress={() => nav.openSheet('driveRestore')} />
        {calendarAvailable() ? <Row icon="calendar" label={t('Google Calendar')} sub={app.data.calSync && app.data.calSync.count ? t('{n} days added', { n: app.data.calSync.count }) : t('Add Eid, Ramadan and more to your calendar')} onPress={() => nav.openSheet('calSync')} /> : null}
        <Row icon="log-out" label={t('Sign out')} danger onPress={out} chevron={false} />
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 10, lineHeight: 16, textAlign: 'center' }}>{t('Your prayer data stays on your phone and in your own Google Drive. Deen has no server of its own. Theme, language and location stay on each phone.')}</Body>
    </View>
  );
}

/* ---------------- Settings card (A: signed out, B: signed in) ---------------- */
export function GoogleCard() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { go, busy } = useGoogleSignIn();
  const u = app.data.google;
  if (!u) {
    if (app.data.googleCardHidden || !googleAvailable()) return null;
    return (
      <Card active style={{ marginTop: 12, padding: 16 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="cloud" size={18} color={th.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Body size={14.5} weight="semi">{t('Keep your log safe')}</Body>
            <Body size={12} color={th.muted} style={{ marginTop: 2, lineHeight: 17 }}>{t('Sign in to back up to Google Drive every week and add important days to your calendar.')}</Body>
          </View>
          <Press onPress={() => app.update({ googleCardHidden: true })} hitSlop={10} accessibilityLabel={t('Hide')}>
            <Feather name="x" size={16} color={th.faint} />
          </Press>
        </View>
        <GoogleButton onPress={go} busy={busy} style={{ marginTop: 14 }} />
      </Card>
    );
  }
  const ago = daysAgo(app.data.lastDriveBackupAt);
  const stale = ago === null || ago > 8;
  const calCount = app.data.calSync && app.data.calSync.count;
  return (
    <Card onPress={() => nav.push('settingsPage', { page: 'backup' })} style={{ marginTop: 12, padding: 14 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Avatar user={u} />
        <View style={{ flex: 1 }}>
          <Serif size={18} numberOfLines={1}>{u.name || u.email}</Serif>
          <Body size={11.5} color={th.muted} numberOfLines={1}>{u.email}</Body>
        </View>
        <Feather name="chevron-right" size={16} color={th.faint} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <View style={{ flex: 1, borderWidth: 1, borderColor: th.line, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 }}>
          <Label size={7.5}>{t('Drive backup')}</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: stale ? th.amber : th.ok }} />
            <Body size={12.5}>{ago === null ? t('Not yet') : ago === 0 ? t('Today') : t('{n} days ago', { n: ago })}</Body>
          </View>
        </View>
        <View style={{ flex: 1, borderWidth: 1, borderColor: th.line, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 }}>
          <Label size={7.5}>{t('Calendar')}</Label>
          <Body size={12.5} style={{ marginTop: 3 }}>{calCount ? t('{n} days added', { n: calCount }) : t('Off')}</Body>
        </View>
      </View>
    </Card>
  );
}

export function GoogleButton({ onPress, busy, style }) {
  const th = useTheme();
  const t = useT();
  return (
    <Press onPress={onPress} disabled={busy} style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 99, paddingVertical: 12, backgroundColor: th.ink }, style]}>
      {busy ? <ActivityIndicator color={th.bg} /> : (
        <>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Body size={12} weight="bold" color="#4285F4">G</Body>
          </View>
          <Body size={14} weight="semi" color={th.bg}>{t('Sign in with Google')}</Body>
        </>
      )}
    </Press>
  );
}

/* ---------------- Backup page: Google part (C) ---------------- */
export function GoogleSection() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const { go, busy } = useGoogleSignIn();
  const [working, setWorking] = useState(false);
  const u = app.data.google;
  if (!googleAvailable()) return null;
  if (!u) {
    return (
      <>
        <SectionLabel>{t('Google Drive')}</SectionLabel>
        <Card style={{ padding: 14 }}>
          <Body size={12.5} color={th.muted} style={{ lineHeight: 18 }}>{t('Sign in to back up to Google Drive every week and add important days to your calendar.')}</Body>
          <GoogleButton onPress={go} busy={busy} style={{ marginTop: 12 }} />
        </Card>
      </>
    );
  }
  const backupNow = async () => {
    setWorking(true);
    try {
      await uploadBackup(app.data);
      app.update({ lastDriveBackupAt: new Date().toISOString() });
      app.setToast(t('Backed up to Google Drive'));
    } catch (e) {
      app.setToast(t("Couldn't reach Google Drive. Try again later."));
    } finally {
      setWorking(false);
    }
  };
  const last = app.data.lastDriveBackupAt ? new Date(app.data.lastDriveBackupAt) : null;
  const out = async () => {
    await signOut();
    app.update({ google: null });
    app.setToast(t('Signed out'));
  };
  return (
    <>
      <SectionLabel right={<Label color={th.ok}>{t('Signed in')}</Label>}>{t('Google Drive')}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <Row
          first icon="refresh-cw" label={t('Weekly backup to Drive')}
          sub={last ? t('Last: {date}, {time} · keeps the newest 4', { date: shortDate(t.lang, last), time: timeStr(t, last, app.coords.timezone) }) : t('Keeps the newest 4')}
          right={<Toggle value={app.data.driveWeekly !== false} onChange={(v) => app.update({ driveWeekly: v })} />}
        />
        <Row icon="upload-cloud" label={t('Back up now')} onPress={working ? undefined : backupNow} right={working ? <ActivityIndicator color={th.accent} /> : undefined} />
        <Row icon="download-cloud" label={t('Restore from Drive')} sub={t('Pick one of your backups')} onPress={() => nav.openSheet('driveRestore')} />
      </Card>
      {calendarAvailable() ? (
        <>
          <SectionLabel>{t('Google Calendar')}</SectionLabel>
          <Card style={{ paddingVertical: 2 }}>
            <Row
              first icon="calendar" label={t('Important days')}
              sub={app.data.calSync && app.data.calSync.count ? t('{n} days in "{cal}"', { n: app.data.calSync.count, cal: app.data.calSync.title || '' }) : t('Add Eid, Ramadan and more to your calendar')}
              onPress={() => nav.openSheet('calSync')}
            />
          </Card>
        </>
      ) : null}
      <Card style={{ marginTop: 12, paddingVertical: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <Avatar user={u} size={30} />
          <Body size={13.5} style={{ flex: 1 }} numberOfLines={1}>{u.email}</Body>
          <Press onPress={out} hitSlop={8}><Body size={13} weight="semi" color={th.red}>{t('Sign out')}</Body></Press>
        </View>
      </Card>
      <Body size={11} color={th.faint} style={{ marginTop: 8, lineHeight: 16 }}>{t("Backups go in a private Deen folder in your Drive that only this app can see. They don't show among your files and you can delete them any time.")}</Body>
    </>
  );
}

/* ---------------- Restore from Drive sheet ---------------- */
export function DriveRestoreSheet({ onClose }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const [list, setList] = useState(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    listBackups().then(setList).catch(() => setErr(true));
  }, []);
  const pick = async (f) => {
    setBusy(f.id);
    try {
      const d = parseBackup(await downloadBackup(f.id));
      applyBackup(app, d);
      app.setToast(t('Backup restored'));
      onClose();
    } catch (e) {
      app.setToast(t("Couldn't restore that backup"));
    } finally {
      setBusy(null);
    }
  };
  if (err) return <Body size={13} color={th.muted}>{t("Couldn't reach Google Drive. Try again later.")}</Body>;
  if (!list) return <ActivityIndicator color={th.accent} style={{ marginVertical: 20 }} />;
  if (!list.length) return <Body size={13} color={th.muted}>{t('No backups in your Drive yet. Tap "Back up now" to make one.')}</Body>;
  return (
    <View>
      <Body size={12.5} color={th.muted} style={{ marginBottom: 10 }}>{t('This replaces what is on this phone with the backup.')}</Body>
      <Card style={{ paddingVertical: 2 }}>
        {list.map((f, i) => {
          const d = new Date(f.modifiedTime);
          return (
            <Row
              key={f.id} first={i === 0} icon="file-text"
              label={`${shortDate(t.lang, d)} ${d.getFullYear()}`}
              sub={`${timeStr(t, d, app.coords.timezone)} · ${t.num(Math.max(1, Math.round((Number(f.size) || 0) / 1024)))} KB${i === 0 ? ` · ${t('newest')}` : ''}`}
              onPress={busy ? undefined : () => pick(f)}
              right={busy === f.id ? <ActivityIndicator color={th.accent} /> : undefined}
            />
          );
        })}
      </Card>
    </View>
  );
}

/* ---------------- Important days to Calendar sheet (D) ---------------- */
export function CalendarSyncSheet({ onClose }) {
  const app = useApp();
  const th = useTheme();
  const t = useT();
  const cur = app.data.calSync;
  const [kinds, setKinds] = useState(cur ? cur.kinds : DEFAULT_KINDS);
  const [cals, setCals] = useState(null);
  const [calId, setCalId] = useState(cur ? cur.calendarId : null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    (async () => {
      if (!(await askPermission())) { setDenied(true); return; }
      const list = await writableCalendars(app.data.google && app.data.google.email);
      setCals(list);
      if (!calId && list.length) setCalId(list[0].id);
    })().catch(() => setDenied(true));
  }, []);
  const planned = plannedEvents({ today: app.today, hijri: app.hijri, kinds, lang: t.lang, data: app.data, getDay: app.getDay, tz: app.coords.timezone });
  const flip = (id) => setKinds((k) => (k.includes(id) ? k.filter((x) => x !== id) : [...k, id]));
  const add = async () => {
    setBusy(true);
    try {
      let id = calId;
      let title = (cals.find((c) => c.id === id) || {}).title;
      if (id === 'new') {
        id = await createDeenCalendar(th.accent);
        title = 'Deen';
      }
      if (cur) await removeEvents(cur.eventIds);
      if (id !== 'new') await clearDeenEvents(id, app.today);
      const eventIds = await writeEvents(id, planned, app.coords.timezone);
      app.update({ calSync: { calendarId: id, title, kinds, eventIds, count: eventIds.length, at: new Date().toISOString() } });
      app.setToast(t('{n} days added to your calendar', { n: eventIds.length }));
      onClose();
    } catch (e) {
      app.setToast(t("Couldn't add to the calendar"));
    } finally {
      setBusy(false);
    }
  };
  const removeAll = async () => {
    setBusy(true);
    await removeEvents(cur.eventIds);
    await clearDeenEvents(cur.calendarId, app.today);
    app.update({ calSync: null });
    setBusy(false);
    app.setToast(t('Removed from your calendar'));
    onClose();
  };
  if (denied) return <Body size={13} color={th.muted}>{t('Deen needs calendar access for this. You can allow it in your phone settings.')}</Body>;
  return (
    <View>
      <Body size={12.5} color={th.muted}>{t('All-day events for the next 12 months. Important days get a reminder the evening before. My fasts shows each fast with that day’s Seheri and Iftar, and a tick once you fasted.')}</Body>
      <Card style={{ marginTop: 12, paddingVertical: 2 }}>
        {CAL_KINDS.map((k, i) => {
          const on = kinds.includes(k.id);
          return (
            <Press key={k.id} onPress={() => flip(k.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 }, i > 0 && { borderTopWidth: 1, borderColor: th.line }]}>
              <View style={[{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: th.faint, alignItems: 'center', justifyContent: 'center' }, on && { backgroundColor: th.accent, borderColor: th.accent }]}>
                {on ? <Feather name="check" size={13} color={th.cardInk} /> : null}
              </View>
              <Body size={14} style={{ flex: 1 }}>{t(k.label)}</Body>
            </Press>
          );
        })}
      </Card>
      <Label style={{ marginTop: 16, marginBottom: 8, marginHorizontal: 2 }}>{t('Calendar')}</Label>
      {!cals ? <ActivityIndicator color={th.accent} /> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {[...cals.slice(0, 4).map((c) => ({ id: c.id, label: c.title || c.name })), { id: 'new', label: t('New "Deen" calendar (this phone only)') }].map((c) => {
            const on = calId === c.id;
            return (
              <Press key={c.id} onPress={() => setCalId(c.id)} accessibilityState={{ selected: on }} style={[{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: th.line }, on && { backgroundColor: th.accentSoft, borderColor: th.accentLine }]}>
                <Body size={12.5} weight={on ? 'semi' : 'med'} color={on ? th.accent : th.muted} numberOfLines={1}>{c.label}</Body>
              </Press>
            );
          })}
        </View>
      )}
      <PrimaryButton style={{ marginTop: 18 }} disabled={busy || !calId || !planned.length} label={busy ? '…' : t('Add {n} days', { n: planned.length })} onPress={add} />
      <Body size={11} color={th.faint} style={{ textAlign: 'center', marginTop: 10 }}>{t('Dates follow the moon. If your masjid moves a date, Deen updates the event.')}</Body>
      {cur ? (
        <Press onPress={removeAll} style={{ alignSelf: 'center', paddingVertical: 12 }}>
          <Body size={13} weight="semi" color={th.red}>{t('Remove all from the calendar')}</Body>
        </Press>
      ) : null}
    </View>
  );
}

/* ---------------- Welcome back (E) ---------------- */
export function summariseBackup(d) {
  const days = Object.keys(d.completedByDay || {}).length;
  const qada = Object.values(d.qadaRecords || {}).reduce((n, r) => n + Object.keys(r || {}).length, 0);
  const fasts = Object.values(d.journalByDay || {}).filter((j) => j && j.fasted).length;
  return { days, qada, fasts };
}

export function WelcomeBack({ user, backup, file, onRestore, onFresh }) {
  const th = useTheme();
  const t = useT();
  const s = summariseBackup(backup);
  const d = new Date(file.modifiedTime);
  return (
    <View style={{ alignItems: 'center' }}>
      <Avatar user={user} size={64} />
      <Serif size={26} style={{ marginTop: 14, textAlign: 'center' }}>{t('Welcome back, {name}', { name: (user.name || '').split(' ')[0] || user.email })}</Serif>
      <Body size={13} color={th.muted} style={{ marginTop: 6, textAlign: 'center' }}>{t('Found your Drive backup from {date}.', { date: `${shortDate(t.lang, d)} ${d.getFullYear()}` })}</Body>
      <Card style={{ alignSelf: 'stretch', marginTop: 18, paddingVertical: 2 }}>
        {[[t('Days logged'), t.num(s.days)], [t('Qada records'), t.num(s.qada)], [t('Fasts kept'), t.num(s.fasts)]].map(([k, v], i) => (
          <View key={k} style={[{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14 }, i > 0 && { borderTopWidth: 1, borderColor: th.line }]}>
            <Body size={13.5}>{k}</Body>
            <Body size={13.5} color={th.muted}>{v}</Body>
          </View>
        ))}
      </Card>
      <PrimaryButton style={{ alignSelf: 'stretch', marginTop: 18 }} label={t('Restore')} onPress={onRestore} />
      <Press onPress={onFresh} style={{ paddingVertical: 12 }}><Body size={13} weight="semi" color={th.muted}>{t('Start fresh')}</Body></Press>
    </View>
  );
}

