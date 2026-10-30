import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { HScroll } from '../ui/swipe';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Arabic, IconBtn, Chip, Segmented } from '../ui/kit';
import { useLayout } from '../ui/hooks';
import { Stepper } from '../ui/parts';

export const PHRASES = [
  { id: 'subhanallah', ar: 'سُبْحَانَ اللَّهِ', en: 'SubhanAllah', bn: 'সুবহানাল্লাহ' },
  { id: 'alhamdulillah', ar: 'الْحَمْدُ لِلَّهِ', en: 'Alhamdulillah', bn: 'আলহামদুলিল্লাহ' },
  { id: 'allahuakbar', ar: 'اللَّهُ أَكْبَرُ', en: 'Allahu Akbar', bn: 'আল্লাহু আকবার' },
  { id: 'tahlil', ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ', en: 'La ilaha illallah', bn: 'লা ইলাহা ইল্লাল্লাহ' },
  { id: 'istighfar', ar: 'أَسْتَغْفِرُ اللَّهَ', en: 'Astaghfirullah', bn: 'আস্তাগফিরুল্লাহ' },
  { id: 'salawat', ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', en: 'Salawat', bn: 'দরুদ' },
];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function TasbihScreen() {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const tb = app.data.tasbih || { count: 0, target: 33, phrase: 'subhanallah', total: 0 };
  const [count, setCount] = useState(tb.count || 0);
  const target = tb.target || 33;
  const phrase = PHRASES.find((p) => p.id === tb.phrase) || PHRASES[0];
  const pulse = useRef(new Animated.Value(0)).current;
  const prog = useRef(new Animated.Value((count % target) / target)).current;
  const presets = [33, 34, 99, 100];
  const custom = !presets.includes(target);

  // Persist shortly after counting stops (not on every tap, so tapping stays fast).
  const pending = useRef(0);
  const countRef = useRef(count);
  countRef.current = count;
  useEffect(
    () => () => {
      // leaving the screen: save whatever is still pending
      const add = pending.current;
      pending.current = 0;
      app.update((p) => ({ tasbih: { ...(p.tasbih || {}), count: countRef.current, total: ((p.tasbih || {}).total || 0) + add } }));
    },
    []
  );
  useEffect(() => {
    const h = setTimeout(() => {
      const add = pending.current;
      pending.current = 0;
      app.update((p) => ({ tasbih: { ...(p.tasbih || {}), count, total: ((p.tasbih || {}).total || 0) + add } }));
    }, 500);
    return () => clearTimeout(h);
  }, [count]);

  const tap = () => {
    const next = count + 1;
    setCount(next);
    const atTarget = next % target === 0;
    app.haptic(atTarget ? 'heavy' : undefined);
    if (atTarget) setTimeout(() => app.haptic('success'), 120);
    pending.current += 1;
    pulse.setValue(1);
    Animated.timing(pulse, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start();
    const frac = atTarget ? 1 : (next % target) / target;
    Animated.timing(prog, { toValue: frac, duration: 160, useNativeDriver: false }).start(() => {
      if (atTarget) Animated.timing(prog, { toValue: 0, duration: 500, delay: 250, useNativeDriver: false }).start();
    });
  };
  const reset = () => {
    setCount(0);
    prog.setValue(0);
    app.haptic('medium');
  };
  const setTarget = (n) => {
    app.update((p) => ({ tasbih: { ...(p.tasbih || {}), target: n } }));
    prog.setValue((count % n) / n);
  };

  const size = Math.min(L.width - 80, 280);
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const rounds = Math.floor(count / target);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IconBtn name="chevron-left" onPress={nav.pop} label={t('Back')} />
        <Serif size={22} style={{ flex: 1 }}>{t('Tasbih')}</Serif>
        <IconBtn name="rotate-ccw" onPress={reset} label={t('Reset')} />
      </View>
      <View style={{ marginTop: 14 }}>
        <HScroll style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: L.pad, paddingRight: L.pad + 26 }}>
          {PHRASES.map((p) => (
            <Chip key={p.id} label={t.lang === 'bn' ? p.bn : p.en} active={p.id === phrase.id} onPress={() => app.update((s) => ({ tasbih: { ...(s.tasbih || {}), phrase: p.id } }))} />
          ))}
        </HScroll>
        {/* Fade and › at the right edge: there are more phrases to scroll to. */}
        <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <LinearGradient id="tfade" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={th.bg} stopOpacity="0" />
                <Stop offset="0.7" stopColor={th.bg} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#tfade)" />
          </Svg>
          <Feather name="chevron-right" size={18} color={th.accent} style={{ marginRight: 8 }} />
        </View>
      </View>

      <Pressable onPress={tap} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={t('Count')}>
        <Arabic size={30} color={th.accent} style={{ marginBottom: 10 }}>{phrase.ar}</Arabic>
        <Animated.View style={{ width: size, height: size, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }] }}>
          <Svg width={size} height={size} style={{ position: 'absolute' }}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={th.line} strokeWidth={6} fill={th.soft} />
            <AnimatedCircle
              cx={size / 2} cy={size / 2} r={r} stroke={th.accent} strokeWidth={6} fill="none" strokeLinecap="round"
              strokeDasharray={`${circ} ${circ}`}
              strokeDashoffset={prog.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] })}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Serif bold size={size * 0.27}>{t.num(count)}</Serif>
            <Label>{t('of {n}', { n: target })}{rounds ? `  ·  ${t('round {n}', { n: rounds })}` : ''}</Label>
          </View>
        </Animated.View>
        <Body size={12} color={th.muted} style={{ marginTop: 16 }}>{t('Tap anywhere to count')}</Body>
      </Pressable>

      <View style={{ paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 18 }}>
        <Label style={{ marginBottom: 8 }}>{t('Target')}</Label>
        <Segmented
          value={custom ? 'custom' : String(target)}
          onChange={(v) => (v === 'custom' ? setTarget(custom ? target : 10) : setTarget(Number(v)))}
          options={[...presets.map((n) => ({ id: String(n), label: t.num(n) })), { id: 'custom', label: t('Own') }]}
        />
        {custom ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <Body size={13}>{t('Your target')}</Body>
            <Stepper value={target} onMinus={() => setTarget(Math.max(1, target - 1))} onPlus={() => setTarget(target + 1)} />
          </View>
        ) : null}
        <Body size={11} color={th.faint} style={{ marginTop: 10, textAlign: 'center' }}>{t('{n} counted in total', { n: ((app.data.tasbih || {}).total || 0) + pending.current })}</Body>
      </View>
    </View>
  );
}
