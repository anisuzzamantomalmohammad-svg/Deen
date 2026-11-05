// A whole month in one table: prayer times, or Seheri & Iftar for fasting.
// Swipe or use the arrows to change month. Share sends the tab you're on.
import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, Share, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, IconBtn, Segmented, Press, Card } from '../ui/kit';
import { useLayout, monthName, timeStr, WEEK_SHORT, hijriMonthName } from '../ui/hooks';
import { CALC_METHODS, sameDay, addMinutes } from '../lib/prayer';
import { fastingDayInfo } from '../lib/alerts';
import { SwipeView, useSlide } from '../ui/swipe';

const COLS = [['Fajr', 'Fajr'], ['Sunrise', 'Rise'], ['Dhuhr', 'Dhuhr'], ['Asr', 'Asr'], ['Maghrib', 'Magh.'], ['Isha', 'Isha']];

const fmtLen = (t, mins) => t('{h}h {m}m', { h: Math.floor(mins / 60), m: t.num(String(mins % 60).padStart(2, '0')) });

export default function TimetableScreen({ tab: initialTab }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const { today, coords, data } = app;
  const tz = coords.timezone;
  const [tab, setTab] = useState(initialTab === 'fasting' ? 'fasting' : 'prayer');
  const [offset, setOffset] = useState(0);
  const { step, style: slideStyle } = useSlide();
  const move = (d) => {
    app.haptic();
    step(d, () => setOffset((o) => o + d));
  };
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const y = first.getFullYear();
  const m = first.getMonth();
  const method = CALC_METHODS.find((c) => c.id === data.calcMethod);
  const methodName = data.calcMethod === 'Karachi' ? 'Karachi' : t(method ? method.label : data.calcMethod);
  const buf = data.safetyBuffer || 0;

  const rows = useMemo(() => {
    const n = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(y, m, i + 1);
      const times = app.getDay(d);
      const seheri = addMinutes(times.Fajr, -buf);
      return { d, times, h: app.hijri(d), seheri, len: Math.round((times.Maghrib - seheri) / 60000), fast: fastingDayInfo(d, app.cal) };
    });
  }, [y, m, app.getDay, app.hijri, app.cal, buf]);

  const h0 = rows[0].h;
  const h1 = rows[rows.length - 1].h;
  const hijriRange = h0.monthIndex === h1.monthIndex
    ? `${hijriMonthName(t.lang, h0.monthIndex)} ${t.num(h0.year)}`
    : `${hijriMonthName(t.lang, h0.monthIndex)} – ${hijriMonthName(t.lang, h1.monthIndex)} ${t.num(h1.year)}`;

  const journal = data.journalByDay || {};
  const plans = data.fastPlans || {};
  const lens = rows.map((r) => r.len);
  const shortest = rows[lens.indexOf(Math.min(...lens))];
  const longest = rows[lens.indexOf(Math.max(...lens))];
  const keptCount = rows.filter((r) => (journal[r.d.toDateString()] || {}).fasted).length;

  const wd = (d) => WEEK_SHORT[t.lang === 'bn' ? 'bn' : 'en'][d.getDay()];
  const shareText = async () => {
    const head = `${app.locationName} · ${monthName(t.lang, m)} ${t.num(y)} · ${hijriRange}\n${methodName} · ${data.asrMethod === 'Hanafi' ? t('Hanafi Asr') : t('Standard Asr')}\n`;
    let body;
    if (tab === 'prayer') {
      const colHead = [t('Date'), ...COLS.map((c) => t(c[0]))].join(' | ');
      body = `${colHead}\n${rows.map(({ d, times }) => [`${wd(d)} ${t.num(d.getDate())}`, ...COLS.map((c) => timeStr(t, times[c[0]], tz, true))].join(' | ')).join('\n')}`;
    } else {
      const colHead = [t('Date'), t('Seheri'), t('Iftar'), t('Length')].join(' | ');
      body = `${colHead}\n${rows.map((r) => [`${wd(r.d)} ${t.num(r.d.getDate())}`, timeStr(t, r.seheri, tz, true), timeStr(t, r.times.Maghrib, tz, true), fmtLen(t, r.len)].join(' | ')).join('\n')}\n\n${t('Seheri ends {n} minutes before Fajr.', { n: buf })}`;
    }
    try {
      await Share.share({ message: `${tab === 'fasting' ? `${t('Seheri & Iftar')}\n` : ''}${head}\n${body}\n\n${t('Shared from Deen')}` });
    } catch (e) {
      // dismissed
    }
  };
  // The month as a PDF table: printable, and easy to send on WhatsApp.
  const sharePdf = async () => {
    const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const heads = tab === 'prayer' ? [t('Date'), ...COLS.map((c) => t(c[1]))] : [t('Date'), t('Seheri'), t('Iftar'), t('Length')];
    const cells = rows.map((r) => {
      const date = `${wd(r.d)} ${t.num(r.d.getDate())}`;
      const vals = tab === 'prayer' ? COLS.map((c) => timeStr(t, r.times[c[0]], tz, true)) : [timeStr(t, r.seheri, tz, true), timeStr(t, r.times.Maghrib, tz, true), fmtLen(t, r.len)];
      const today = sameDay(r.d, app.today);
      return `<tr${today ? ' class="t"' : ''}${r.d.getDay() === 5 ? ' style="font-weight:600"' : ''}><td>${esc(date)}${today ? ` · ${esc(t('TODAY'))}` : ''}</td>${vals.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`;
    }).join('');
    const html = `<html><head><meta charset="utf-8"><style>
      body{font-family:sans-serif;color:#2B2418;margin:28px}h1{font-family:serif;font-size:22px;margin:0}
      p{color:#7a6a50;font-size:11px;margin:4px 0 14px}table{width:100%;border-collapse:collapse;font-size:11px}
      th{text-align:left;color:#9a7a3a;font-size:9px;text-transform:uppercase;letter-spacing:.06em;padding:6px 4px;border-bottom:2px solid #C9A04E}
      td{padding:5px 4px;border-bottom:1px solid #eee3cf}tr.t td{background:#F6E9CC}</style></head><body>
      <h1>${esc(`${tab === 'fasting' ? `${t('Seheri & Iftar')} · ` : ''}${monthName(t.lang, m)} ${t.num(y)}`)}</h1>
      <p>${esc(`${app.locationName} · ${hijriRange} · ${methodName} · ${data.asrMethod === 'Hanafi' ? t('Hanafi Asr') : t('Standard Asr')}`)}</p>
      <table><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${cells}</table>
      <p style="margin-top:14px">${esc(t('Shared from Deen'))}</p></body></html>`;
    try {
      const Print = require('expo-print');
      if (Platform.OS === 'web') { await Print.printAsync({ html }); return; }
      const { uri } = await Print.printToFileAsync({ html });
      const Sharing = require('expo-sharing');
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: t('Share') });
    } catch (e) {
      app.setToast(t('Could not make the PDF'));
    }
  };
  const share = () => nav.openSheet('choice', {
    title: t('Share'),
    options: [
      { id: 'pdf', label: t('This month as a PDF') },
      { id: 'month', label: tab === 'prayer' ? t('This month as text') : t('This month of Seheri & Iftar as text') },
      { id: 'image', label: t("Today's times as an image") },
    ],
    onPick: (v) => (v === 'image' ? setTimeout(() => nav.openSheet('shareToday'), 350) : v === 'pdf' ? setTimeout(sharePdf, 350) : shareText()),
  });

  const tag = (r) => {
    const f = r.fast;
    if (!f) return null;
    if (f.type === 'ramadan') return { text: t('Roza {n}', { n: f.day }), color: th.accent };
    if (f.reason === 'white') return { text: t('White Day'), color: th.wdc };
    if (f.reason === 'arafah' || f.reason === 'ashura' || f.reason === 'tasua') return { text: t('Sunnah'), color: th.occ };
    return { text: t('Sunnah'), color: th.sfc };
  };

  const dayCell = (d, isToday) => (
    <View style={{ width: 50 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Serif bold size={14} maxScale={1.12} color={isToday ? th.accent : th.ink}>{t.num(d.getDate())}</Serif>
        <Body size={9.5} maxScale={1.12} weight="semi" color={d.getDay() === 5 ? th.accent : th.muted} numberOfLines={1}>{wd(d)}</Body>
      </View>
      {isToday ? <Label size={6.5} maxScale={1} color={th.accent} numberOfLines={1}>{`· ${t('TODAY')}`}</Label> : null}
    </View>
  );

  const rowStyle = (d, isToday, past) => [
    { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 10, borderTopWidth: d.getDay() === 1 && d.getDate() !== 1 ? 2 : 1, borderColor: th.line },
    isToday && { backgroundColor: th.accentSoft, borderLeftWidth: 3, borderLeftColor: th.accent, paddingLeft: 7 },
    past && { opacity: 0.55 },
  ];

  return (
    <ScrollView contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IconBtn name="chevron-left" onPress={nav.pop} label={t('Back')} />
        <Serif size={22} style={{ flex: 1 }}>{t('Timetable')}</Serif>
        <IconBtn name="share-2" onPress={share} label={t('Share')} />
      </View>
      <Segmented style={{ marginTop: 12 }} value={tab} onChange={setTab} options={[{ id: 'prayer', label: t('Prayer times') }, { id: 'fasting', label: t('Seheri & Iftar') }]} />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
        <Press onPress={() => move(-1)} hitSlop={10} accessibilityLabel={t('Previous month')} style={{ padding: 6 }}><Feather name="chevron-left" size={20} color={th.accent} /></Press>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Serif size={20}>{`${monthName(t.lang, m)} ${t.num(y)}`}</Serif>
          <Body size={11.5} color={th.accent}>{hijriRange}</Body>
        </View>
        <Press onPress={() => move(1)} hitSlop={10} accessibilityLabel={t('Next month')} style={{ padding: 6 }}><Feather name="chevron-right" size={20} color={th.accent} /></Press>
      </View>
      <Body size={11} color={th.muted} numberOfLines={1} style={{ textAlign: 'center', marginTop: 2 }}>{`${app.locationName} · ${methodName} · ${data.asrMethod === 'Hanafi' ? t('Hanafi Asr') : t('Standard Asr')}`}</Body>

      <SwipeView onNext={() => move(1)} onPrev={() => move(-1)} style={[slideStyle, { marginTop: 12 }]}>
        <Card style={{ overflow: 'hidden' }}>
          {tab === 'prayer' ? (
            <>
              <View style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10 }}>
                <Label size={7.5} style={{ width: 50 }}>{t('Day')}</Label>
                <Label size={7.5} style={{ width: 22, textAlign: 'center' }}>{t('AH')}</Label>
                {COLS.map((c) => <Label key={c[0]} size={7.5} numberOfLines={1} adjustsFontSizeToFit maxScale={1.12} style={{ flex: 1, textAlign: 'center' }}>{t(c[1])}</Label>)}
              </View>
              {rows.map(({ d, times, h }) => {
                const isToday = sameDay(d, today);
                const past = d < today;
                return (
                  <View key={d.getDate()} style={rowStyle(d, isToday, past)} accessibilityLabel={isToday ? t('Today') : undefined}>
                    {dayCell(d, isToday, past)}
                    <Body size={10} maxScale={1.12} color={h.day === 1 ? th.accent : th.faint} style={{ width: 22, textAlign: 'center' }} numberOfLines={1}>{t.num(h.day)}</Body>
                    {COLS.map((c) => (
                      <Body key={c[0]} size={11.5} weight={isToday ? 'semi' : 'reg'} color={isToday ? th.accent : c[0] === 'Sunrise' ? th.muted : th.ink} numberOfLines={1} adjustsFontSizeToFit maxScale={1.12} style={{ flex: 1, textAlign: 'center' }}>
                        {timeStr(t, times[c[0]], tz, true)}
                      </Body>
                    ))}
                  </View>
                );
              })}
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10 }}>
                <Label size={7.5} style={{ width: 50 }}>{t('Day')}</Label>
                <Label size={7.5} style={{ width: 22, textAlign: 'center' }}>{t('AH')}</Label>
                <Label size={7.5} style={{ flex: 1, textAlign: 'center' }}>{t('Seheri')}</Label>
                <Label size={7.5} style={{ flex: 1, textAlign: 'center' }}>{t('Iftar')}</Label>
                <Label size={7.5} style={{ flex: 1, textAlign: 'center' }}>{t('Length')}</Label>
                <View style={{ width: 66 }} />
              </View>
              {rows.map((r) => {
                const { d, h } = r;
                const isToday = sameDay(d, today);
                const past = d < today;
                const k = d.toDateString();
                const kept = !!(journal[k] || {}).fasted;
                const planned = !!plans[k];
                const tg = tag(r);
                return (
                  <Press key={d.getDate()} onPress={() => nav.openSheet('fastDay', { date: d })} scaleTo={0.99} style={rowStyle(d, isToday, past && !kept)}>
                    {dayCell(d, isToday, past)}
                    <Body size={10} maxScale={1.12} color={h.day === 1 ? th.accent : th.faint} style={{ width: 22, textAlign: 'center' }}>{t.num(h.day)}</Body>
                    <Body size={11.5} weight={isToday ? 'semi' : 'reg'} color={isToday ? th.accent : th.ink} numberOfLines={1} adjustsFontSizeToFit maxScale={1.12} style={{ flex: 1, textAlign: 'center' }}>{timeStr(t, r.seheri, tz, true)}</Body>
                    <Body size={11.5} weight={isToday ? 'semi' : 'reg'} color={isToday ? th.accent : th.ink} numberOfLines={1} adjustsFontSizeToFit maxScale={1.12} style={{ flex: 1, textAlign: 'center' }}>{timeStr(t, r.times.Maghrib, tz, true)}</Body>
                    <Body size={10.5} color={th.muted} numberOfLines={1} adjustsFontSizeToFit maxScale={1.12} style={{ flex: 1, textAlign: 'center' }}>{fmtLen(t, r.len)}</Body>
                    <View style={{ width: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      {tg ? <Body size={9} weight="bold" color={tg.color} numberOfLines={1} adjustsFontSizeToFit maxScale={1.12} style={{ flexShrink: 1 }}>{tg.text}</Body> : null}
                      {kept ? <Feather name="check-circle" size={12} color={th.ok} /> : planned ? <Feather name="bell" size={11} color={th.accent} /> : null}
                    </View>
                  </Press>
                );
              })}
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: th.line }}>
                {[[t('Shortest'), fmtLen(t, shortest.len), `${wd(shortest.d)} ${t.num(shortest.d.getDate())}`], [t('Longest'), fmtLen(t, longest.len), `${wd(longest.d)} ${t.num(longest.d.getDate())}`], [t('Kept'), t.num(keptCount), t('this month')]].map(([k, v, s], i) => (
                  <View key={k} style={[{ flex: 1, alignItems: 'center', paddingVertical: 10 }, i > 0 && { borderLeftWidth: 1, borderColor: th.line }]}>
                    <Label size={7.5}>{k}</Label>
                    <Serif size={15} style={{ marginTop: 2 }}>{v}</Serif>
                    <Body size={10} color={th.muted}>{s}</Body>
                  </View>
                ))}
              </View>
            </>
          )}
        </Card>
      </SwipeView>
      <Body size={11} color={th.faint} style={{ marginTop: 10 }}>
        {tab === 'prayer'
          ? t('Today has a gold edge and Fridays are gold. Swipe sideways to change month.')
          : t('Seheri ends {n} minutes before Fajr. Tap a day to mark a fast or set a reminder.', { n: buf })}
      </Body>
    </ScrollView>
  );
}
