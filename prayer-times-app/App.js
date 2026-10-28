// Deen: prayer times, Qibla, Hijri calendar and daily worship.
// App shell: fonts, splash screen, theme, tabs, sub-screens and sheets.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { Fraunces_400Regular, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import './src/lib/background';
import { registerTopUp } from './src/lib/background';
import { AppProvider, useApp } from './src/state/store';
import { ThemeCtx, LangCtx, Toast, FadeSwitch, useBackHandler, Serif } from './src/ui/kit';
import { TabBar, GlowMoon } from './src/ui/parts';
import HomeScreen from './src/screens/Home';
import QiblaScreen from './src/screens/Qibla';
import HijriScreen from './src/screens/Hijri';
import IbadahScreen from './src/screens/Ibadah';
import SettingsScreen from './src/screens/Settings';
import FastingScreen from './src/screens/Fasting';
import MonthStatsScreen from './src/screens/MonthStats';
import DuaDetailScreen from './src/screens/DuaDetail';
import TasbihScreen from './src/screens/Tasbih';
import AlertsScreen from './src/screens/Alerts';
import HijriSettingsScreen from './src/screens/HijriSettings';
import TimetableScreen from './src/screens/Timetable';
import HijriYearScreen from './src/screens/HijriYear';
import { useSwipe } from './src/ui/swipe';
import ImportantDaysScreen from './src/screens/ImportantDays';
import DateConverterScreen from './src/screens/DateConverter';
import Onboarding from './src/screens/Onboarding';
import Sheets from './src/screens/Sheets';
import { NavCtx } from './src/nav';

SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});


const TAB_SCREENS = { Prayers: HomeScreen, Qibla: QiblaScreen, Hijri: HijriScreen, Ibadah: IbadahScreen, Settings: SettingsScreen };
const STACK_SCREENS = { fasting: FastingScreen, monthStats: MonthStatsScreen, dua: DuaDetailScreen, tasbih: TasbihScreen, alerts: AlertsScreen, hijriSettings: HijriSettingsScreen, timetable: TimetableScreen, hijriYear: HijriYearScreen, importantDays: ImportantDaysScreen, dateConverter: DateConverterScreen };

// A pushed sub-screen slides in from the right and back out on close.
function StackLayer({ entry, onClosed, closing }) {
  const app = useApp();
  const x = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: closing ? 1 : 0, duration: closing ? 220 : 300, easing: closing ? Easing.in(Easing.quad) : Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(() => {
      if (closing) onClosed();
    });
  }, [closing]);
  const Screen = STACK_SCREENS[entry.name];
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: app.theme.bg, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 420] }) }], opacity: x.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }) },
      ]}
    >
      <Screen {...(entry.params || {})} />
    </Animated.View>
  );
}

function Shell() {
  const app = useApp();
  const th = app.theme;
  const [tab, setTabState] = useState('Prayers');
  const [stack, setStack] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [intro, setIntro] = useState(true);

  const ORDER = ['Prayers', 'Qibla', 'Hijri', 'Ibadah', 'Settings'];
  const dirRef = useRef(0);
  const setTab = useCallback((id) => {
    setStack([]);
    setTabState((cur) => {
      dirRef.current = Math.sign(ORDER.indexOf(id) - ORDER.indexOf(cur));
      return id;
    });
  }, []);
  const push = useCallback((name, params) => setStack((s) => [...s, { name, params, key: `${name}-${Date.now()}` }]), []);
  const pop = useCallback(() => setStack((s) => {
    const i = s.map((e) => !e.closing).lastIndexOf(true);
    if (i < 0) return s;
    return s.map((e, k) => (k === i ? { ...e, closing: true } : e));
  }), []);
  const openSheet = useCallback((type, params = {}) => setSheet({ type, params, open: true }), []);
  const closeSheet = useCallback(() => setSheet((s) => (s ? { ...s, open: false } : s)), []);

  useBackHandler(
    useCallback(() => {
      if (sheet && sheet.open) {
        closeSheet();
        return true;
      }
      if (stack.some((e) => !e.closing)) {
        pop();
        return true;
      }
      if (tab !== 'Prayers') {
        setTab('Prayers');
        return true;
      }
      return false;
    }, [sheet, stack, tab])
  );

  useEffect(() => {
    if (app.data.onboarded) registerTopUp();
  }, [app.data.onboarded]);

  // A tapped notification asked to open something.
  useEffect(() => {
    const p = app.pendingOpen;
    if (!p || !app.data.onboarded) return;
    app.setPendingOpen(null);
    if (p.type === 'dua') push('dua', { id: p.id });
    else if (p.type === 'event') {
      const [y, m, d] = String(p.day || '').split('-').map(Number);
      openSheet('event', { id: p.id, date: y ? new Date(y, m - 1, d) : undefined });
    } else if (p.type === 'backup') setTab('Settings');
    else if (p.type === 'day') {
      const [y, m, d] = String(p.day || '').split('-').map(Number);
      if (y) openSheet('day', { date: new Date(y, m - 1, d) });
    } else if (p.type === 'converter') push('dateConverter');
  }, [app.pendingOpen, app.data.onboarded]);

  // Brief branded intro, then fade into the app.
  const introA = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const h = setTimeout(() => {
      Animated.timing(introA, { toValue: 0, duration: 420, useNativeDriver: Platform.OS !== 'web' }).start(() => setIntro(false));
    }, 650);
    return () => clearTimeout(h);
  }, []);

  // Soft fade when the colours change (theme switch, prohibited time).
  const fade = useRef(new Animated.Value(0)).current;
  const [fadeColor, setFadeColor] = useState(th.bg);
  const prevBg = useRef(th.bg);
  useEffect(() => {
    if (prevBg.current === th.bg) return;
    setFadeColor(prevBg.current);
    prevBg.current = th.bg;
    fade.setValue(1);
    Animated.timing(fade, { toValue: 0, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [th.bg]);

  const nav = { tab, setTab, push, pop, openSheet, closeSheet };
  // Swipe sideways anywhere on a tab to move to the next or previous tab.
  const tabSwipe = useSwipe(
    () => { const i = ORDER.indexOf(tab); if (i < ORDER.length - 1) { app.haptic(); setTab(ORDER[i + 1]); } },
    () => { const i = ORDER.indexOf(tab); if (i > 0) { app.haptic(); setTab(ORDER[i - 1]); } }
  );
  const Tab = TAB_SCREENS[tab];
  return (
    <NavCtx.Provider value={nav}>
      <View style={{ flex: 1, backgroundColor: th.bg }}>
        <StatusBar barStyle={th.statusBar} translucent backgroundColor="transparent" />
        {!app.data.onboarded ? (
          <>
            <Onboarding />
            <Sheets sheet={sheet} onClose={closeSheet} />
          </>
        ) : (
          <>
            <View style={{ flex: 1 }} {...tabSwipe}>
              <FadeSwitch k={tab} dir={dirRef.current}>
                <Tab />
              </FadeSwitch>
            </View>
            {stack.length === 0 || stack.every((e) => e.closing) ? <TabBar active={tab} onChange={(id) => (id === tab ? setStack([]) : setTab(id))} /> : null}
            {stack.map((e) => (
              <StackLayer key={e.key} entry={e} closing={!!e.closing} onClosed={() => setStack((s) => s.filter((x) => x.key !== e.key))} />
            ))}
            <Sheets sheet={sheet} onClose={closeSheet} />
          </>
        )}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fadeColor, opacity: fade }]} />
        <Toast message={app.toast} onHide={() => app.setToast(null)} />
        {intro ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: th.bg, alignItems: 'center', justifyContent: 'center', opacity: introA }]}>
            <GlowMoon size={150} />
            <Serif size={34} style={{ marginTop: 6 }}>Deen</Serif>
            <Serif size={18} color={th.accent} style={{ fontFamily: 'Amiri_400Regular' }}>دِين</Serif>
          </Animated.View>
        ) : null}
      </View>
    </NavCtx.Provider>
  );
}

function Themed() {
  const app = useApp();
  const ready = app.hydrated;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;
  return (
    <ThemeCtx.Provider value={app.theme}>
      <LangCtx.Provider value={{ lang: app.data.lang, arabicScale: app.arabicScale, textScale: app.textScale, haptic: app.haptic }}>
        <Shell />
      </LangCtx.Provider>
    </ThemeCtx.Provider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular, Fraunces_600SemiBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Amiri_400Regular, Amiri_700Bold,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Themed />
      </AppProvider>
    </SafeAreaProvider>
  );
}
