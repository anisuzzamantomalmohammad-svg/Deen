// Mosques near me: masjids around your location from OpenStreetMap
// (Overpass API). Needs the internet; your location is sent to OpenStreetMap
// only when you open this page or tap Refresh. Nothing is saved.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Body, Card, Press, Chip, Empty, PrimaryButton } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout } from '../ui/hooks';
import { compassPoint } from '../lib/prayer';

const SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const RADII = [1, 3, 5, 10];

const rad = (d) => (d * Math.PI) / 180;
function distKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function bearing(a, b) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

async function fetchMosques(lat, lon, km) {
  const r = Math.round(km * 1000);
  const q = `[out:json][timeout:20];(nwr["amenity"="place_of_worship"]["religion"="muslim"](around:${r},${lat},${lon}););out center tags 80;`;
  let lastErr = null;
  for (const url of SERVERS) {
    try {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const to = setTimeout(() => ctl && ctl.abort(), 25000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(q)}`,
        signal: ctl ? ctl.signal : undefined,
      });
      clearTimeout(to);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const me = { lat, lon };
      return (j.elements || []).map((e) => {
        const p = { lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon };
        const tags = e.tags || {};
        return {
          id: `${e.type}${e.id}`,
          name: tags['name:en'] || tags.name || tags['name:bn'] || tags['name:ar'] || null,
          alt: tags.name && tags['name:en'] && tags.name !== tags['name:en'] ? tags.name : null,
          street: [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || tags['addr:city'] || null,
          ...p,
          km: distKm(me, p),
          deg: bearing(me, p),
        };
      }).filter((m) => m.lat != null && m.lon != null).sort((a, b) => a.km - b.km);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('failed');
}

function openMap(m, label) {
  const q = encodeURIComponent(label);
  const url = Platform.OS === 'android'
    ? `geo:${m.lat},${m.lon}?q=${m.lat},${m.lon}(${q})`
    : `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lon}`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lon}#map=18/${m.lat}/${m.lon}`));
}

export default function MosquesScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const [km, setKm] = useState(3);
  const [state, setState] = useState({ loading: true, list: [], error: null });
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const { latitude, longitude } = app.coords;
  const load = async (r = km) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const list = await fetchMosques(latitude, longitude, r);
      if (alive.current) setState({ loading: false, list, error: null });
    } catch (e) {
      if (alive.current) setState({ loading: false, list: [], error: true });
    }
  };
  useEffect(() => { load(km); }, [km, latitude, longitude]);
  const fmtKm = (d) => (d < 1 ? t('{n} m', { n: t.num(Math.round(d * 100) * 10) }) : t('{n} km', { n: t.num(d.toFixed(1)) }));
  const head = (
    <View>
      <ScreenTitle onBack={nav.pop} title={t('Mosques near me')} sub={app.locationName} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        {RADII.map((r) => <Chip key={r} label={t('{n} km', { n: t.num(r) })} active={km === r} onPress={() => setKm(r)} />)}
        <View style={{ flex: 1 }} />
        <Press onPress={() => load(km)} hitSlop={8} accessibilityLabel={t('Refresh')} style={{ padding: 6 }}>
          <Feather name="refresh-cw" size={16} color={th.accent} />
        </Press>
      </View>
      {!state.loading && !state.error && state.list.length ? (
        <Body size={11.5} color={th.faint} style={{ marginTop: 10, marginBottom: 4 }}>{t('{n} found · nearest first · tap to open in maps', { n: t.num(state.list.length) })}</Body>
      ) : null}
    </View>
  );
  const foot = (
    <Body size={10.5} color={th.faint} style={{ marginTop: 16, lineHeight: 15 }}>
      {t('Mosque data © OpenStreetMap contributors. To search, your location is sent to OpenStreetMap. A mosque may be missing or out of date.')}
    </Body>
  );
  return (
    <FlatList
      data={state.loading || state.error ? [] : state.list}
      keyExtractor={(m) => m.id}
      contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }}
      ListHeaderComponent={head}
      ListFooterComponent={foot}
      ListEmptyComponent={state.loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
          <ActivityIndicator color={th.accent} />
          <Body size={12.5} color={th.muted}>{t('Looking for mosques…')}</Body>
        </View>
      ) : state.error ? (
        <View>
          <Empty icon="wifi-off" title={t('Couldn’t load mosques')} text={t('This needs the internet. Check your connection and try again.')} />
          <PrimaryButton label={t('Try again')} icon="refresh-cw" onPress={() => load(km)} />
        </View>
      ) : (
        <View>
          <Empty icon="map-pin" title={t('No mosques found')} text={t('None are mapped within {n} km. Try a wider distance.', { n: t.num(km) })} />
          {km < 10 ? <PrimaryButton ghost label={t('Search {n} km', { n: t.num(RADII[RADII.indexOf(km) + 1]) })} onPress={() => setKm(RADII[RADII.indexOf(km) + 1])} /> : null}
        </View>
      )}
      renderItem={({ item: m, index }) => {
        const label = m.name || t('Mosque');
        return (
          <Card onPress={() => openMap(m, label)} active={index === 0} style={{ marginTop: 8, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ transform: [{ rotate: `${m.deg}deg` }] }}>
                <Feather name="navigation-2" size={15} color={th.accent} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Body size={14} weight="semi" numberOfLines={2}>{label}</Body>
              {m.alt ? <Body size={11.5} color={th.muted} numberOfLines={1}>{m.alt}</Body> : null}
              <Body size={11.5} color={th.muted} numberOfLines={1}>{[`${fmtKm(m.km)} · ${t(compassPoint(m.deg))}`, m.street].filter(Boolean).join(' · ')}</Body>
            </View>
            <Feather name="external-link" size={15} color={th.faint} />
          </Card>
        );
      }}
    />
  );
}
