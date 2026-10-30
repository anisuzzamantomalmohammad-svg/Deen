import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, BackHandler, TextInput } from 'react-native';
import Svg, { Defs, Pattern, Rect, Circle, Path, G, LinearGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { translate, bnDigits } from '../i18n';

export const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

export const LangCtx = createContext({ lang: 'en', arabicScale: 1, textScale: 1, haptic: () => {} });
export function useT() {
  const { lang } = useContext(LangCtx);
  const t = (k, v) => translate(lang, k, v);
  t.lang = lang;
  t.num = (n) => (lang === 'bn' ? bnDigits(n) : String(n));
  return t;
}
export const useLang = () => useContext(LangCtx);

export const F = {
  serif: 'Fraunces_400Regular',
  serifBold: 'Fraunces_600SemiBold',
  sans: 'Inter_400Regular',
  sansMed: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
};

/* ------------------------------ Text ------------------------------ */
// The "Text size" setting scales every font size, and any line height a
// caller passes in, so bigger text never gets clipped.
function scaled(style, k) {
  if (k === 1 || !style) return style;
  const f = StyleSheet.flatten(style);
  if (!f || (f.lineHeight == null && f.fontSize == null)) return style;
  return [style, { ...(f.lineHeight != null ? { lineHeight: Math.round(f.lineHeight * k) } : {}), ...(f.fontSize != null ? { fontSize: f.fontSize * k } : {}) }];
}
// The Bangla zero (০) is drawn much smaller than the other digits, so in
// numbers it's set a little bigger to sit level with them.
function bigZero(children, fontSize) {
  if (typeof children !== 'string' || !children.includes('০')) return children;
  return children.split(/(০+)/).map((part, i) => (part.startsWith('০') ? <Text key={i} style={{ fontSize: fontSize * 1.28 }}>{part}</Text> : part));
}
// `maxScale` caps the text-size setting for tight number columns.
export function Serif({ style, bold, size = 16, color, children, maxScale, ...rest }) {
  const th = useTheme();
  const { textScale: k0 = 1 } = useLang();
  const k = Math.min(k0, maxScale || 9);
  return (
    <Text {...rest} style={[{ fontFamily: bold ? F.serifBold : F.serif, fontSize: size * k, color: color || th.ink }, scaled(style, k)]}>
      {bigZero(children, size * k)}
    </Text>
  );
}
export function Body({ style, size = 13, color, weight, children, maxScale, ...rest }) {
  const th = useTheme();
  const { textScale: k0 = 1 } = useLang();
  const k = Math.min(k0, maxScale || 9);
  const fam = weight === 'bold' ? F.sansBold : weight === 'semi' ? F.sansSemi : weight === 'med' ? F.sansMed : F.sans;
  return (
    <Text {...rest} style={[{ fontFamily: fam, fontSize: size * k, color: color || th.ink, lineHeight: Math.round(size * k * 1.42) }, scaled(style, k)]}>
      {children}
    </Text>
  );
}
// Small capitals label, the only place uppercase Inter is used.
export function Label({ style, color, size = 9.5, children, maxScale, ...rest }) {
  const th = useTheme();
  const { lang, textScale: k0 = 1 } = useLang();
  const k = Math.min(k0, maxScale || 9);
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: F.sansSemi, fontSize: (lang === 'bn' ? size + 1.5 : size) * k, letterSpacing: lang === 'bn' ? 0.2 : 1.5, color: color || th.muted },
        lang !== 'bn' && { textTransform: 'uppercase' },
        scaled(style, k),
      ]}
    >
      {children}
    </Text>
  );
}
export function Arabic({ style, size = 22, color, children, ...rest }) {
  const th = useTheme();
  const { arabicScale } = useLang();
  const s = size * (arabicScale || 1);
  return (
    <Text {...rest} style={[{ fontFamily: F.arabic, fontSize: s, lineHeight: Math.round(s * 1.75), color: color || th.ink, writingDirection: 'rtl' }, style]}>
      {children}
    </Text>
  );
}

/* --------------------------- Pressables --------------------------- */
// Pressable with a gentle scale-down so every tap feels alive. The Pressable
// itself is animated, so layout styles (flex, width, margins) apply directly.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function Press({ onPress, onLongPress, style, children, haptic = true, disabled, scaleTo = 0.97, hitSlop, accessibilityLabel, accessibilityRole = 'button', accessibilityState }) {
  const scale = useRef(new Animated.Value(1)).current;
  const { haptic: buzz } = useLang();
  const to = (v) => Animated.spring(scale, { toValue: v, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 4 }).start();
  return (
    <AnimatedPressable
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      onPress={(e) => {
        if (haptic && buzz) buzz();
        if (onPress) onPress(e);
      }}
      onLongPress={onLongPress ? () => { if (buzz) buzz('medium'); onLongPress(); } : undefined}
      delayLongPress={350}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.45 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Card({ style, children, onPress, onLongPress, active, danger }) {
  const th = useTheme();
  const base = [
    { backgroundColor: th.soft, borderColor: th.line, borderWidth: 1, borderRadius: 18 },
    active && { borderColor: th.accentLine, backgroundColor: th.accentSoft },
    danger && { borderColor: th.red, backgroundColor: th.redSoft },
    style,
  ];
  if (onPress || onLongPress) return <Press onPress={onPress} onLongPress={onLongPress} style={base}>{children}</Press>;
  return <View style={base}>{children}</View>;
}

export function Divider({ style, inset = 14 }) {
  const th = useTheme();
  return <View style={[{ height: 1, marginHorizontal: inset, borderTopWidth: 1, borderColor: th.line, borderStyle: Platform.OS === 'web' ? 'dashed' : 'solid' }, style]} />;
}

export function Chip({ label, active, onPress, icon, color, style }) {
  const th = useTheme();
  return (
    <Press
      onPress={onPress}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: th.line, marginRight: 6 },
        active && { borderColor: color || th.accent, backgroundColor: th.accentSoft },
        style,
      ]}
      accessibilityState={{ selected: !!active }}
    >
      {icon ? <Feather name={icon} size={12} color={active ? color || th.accent : th.muted} /> : null}
      <Body size={12} weight={active ? 'semi' : 'med'} color={active ? color || th.accent : th.muted}>{label}</Body>
    </Press>
  );
}

export function Segmented({ options, value, onChange, style }) {
  const th = useTheme();
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  const x = useRef(new Animated.Value(idx)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: idx, useNativeDriver: Platform.OS !== 'web', speed: 22, bounciness: 3 }).start();
  }, [idx]);
  const seg = w > 0 ? (w - 6) / options.length : 0;
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ flexDirection: 'row', backgroundColor: th.soft, borderColor: th.line, borderWidth: 1, borderRadius: 99, padding: 3 }, style]}
    >
      {seg > 0 && (
        <Animated.View
          style={{
            position: 'absolute', top: 3, bottom: 3, left: 3, width: seg, borderRadius: 99, backgroundColor: th.card,
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, seg] }) }],
          }}
        />
      )}
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} style={{ flex: 1, paddingVertical: 8, alignItems: 'center' }} onPress={() => onChange(o.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Body size={12.5} weight={on ? 'bold' : 'med'} color={on ? th.cardInk : th.muted}>{o.label}</Body>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ value, onChange, disabled, label }) {
  const th = useTheme();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [value]);
  return (
    <Press onPress={() => !disabled && onChange(!value)} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: !!value, disabled: !!disabled }} scaleTo={0.92}>
      <Animated.View
        style={{
          width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center',
          backgroundColor: x.interpolate({ inputRange: [0, 1], outputRange: [th.soft2, th.ok] }),
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Animated.View
          style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }] }}
        />
      </Animated.View>
    </Press>
  );
}

// Settings-style row. Pass `right` for a custom control, or `value` for text.
export function Row({ icon, label, sub, value, onPress, right, chevron = true, first, danger, iconColor }) {
  const th = useTheme();
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12 }}>
      {icon ? (
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: th.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={15} color={danger ? th.red : iconColor || th.accent} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Body size={14} weight="med" color={danger ? th.red : th.ink}>{label}</Body>
        {sub ? <Body size={11.5} color={th.muted} style={{ marginTop: 1 }}>{sub}</Body> : null}
      </View>
      {right && right.type === Toggle && !right.props.label ? React.cloneElement(right, { label }) : right || null}
      {!right && value !== undefined ? <Body size={12.5} color={th.muted} numberOfLines={1} style={{ maxWidth: 150 }}>{value}</Body> : null}
      {!right && onPress && chevron ? <Feather name="chevron-right" size={16} color={th.faint} /> : null}
    </View>
  );
  return (
    <View>
      {!first && <Divider />}
      {onPress ? <Press onPress={onPress} scaleTo={0.99}>{inner}</Press> : inner}
    </View>
  );
}

export function SectionLabel({ children, style, right }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 8, marginHorizontal: 2 }, style]}>
      <Label>{children}</Label>
      {right || null}
    </View>
  );
}

export function IconBtn({ name, onPress, size = 18, style, label }) {
  const th = useTheme();
  return (
    <Press onPress={onPress} accessibilityLabel={label} hitSlop={8} style={[{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: th.line, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Feather name={name} size={size} color={th.ink} />
    </Press>
  );
}

export function PrimaryButton({ label, onPress, icon, style, disabled, ghost }) {
  const th = useTheme();
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      style={[
        { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 99, backgroundColor: ghost ? 'transparent' : th.card },
        ghost && { borderWidth: 1, borderColor: th.line },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={16} color={ghost ? th.ink : th.cardInk} /> : null}
      <Body size={14} weight="bold" color={ghost ? th.ink : th.cardInk}>{label}</Body>
    </Press>
  );
}

/* ------------------------- Pattern band ------------------------- */
// Gold 8-point-star pattern, fading into the page colour at the bottom.
export function PatternBand({ height = 300, style, opacity }) {
  const th = useTheme();
  const op = opacity ?? (th.isLight ? 0.28 : 0.35);
  const stroke = th.prohibited ? (th.isLight ? '#C0392B' : '#B05040') : th.accent;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, height, backgroundColor: th.bg2 }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="star" patternUnits="userSpaceOnUse" width="44" height="44">
            <G fill="none" stroke={stroke} strokeOpacity={op} strokeWidth="1">
              <Rect x="12" y="12" width="20" height="20" />
              <Rect x="12" y="12" width="20" height="20" transform="rotate(45 22 22)" />
              <Circle cx="22" cy="22" r="4" />
              <Path d="M0 0L8 8M44 0L36 8M0 44L8 36M44 44L36 36" />
            </G>
          </Pattern>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.45" stopColor={th.bg} stopOpacity="0" />
            <Stop offset="1" stopColor={th.bg} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#star)" />
        <Rect width="100%" height="100%" fill="url(#fade)" />
      </Svg>
    </View>
  );
}

/* ------------------------------ Sheet ------------------------------ */
export function Sheet({ visible, onClose, title, subtitle, children, scroll = true, footer }) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useRef(new Animated.Value(1)).current;
  // Pull the header down to close.
  const drag = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const pull = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 1.1) {
          closeRef.current();
          setTimeout(() => drag.setValue(0), 260);
        } else Animated.spring(drag, { toValue: 0, useNativeDriver: Platform.OS !== 'web', bounciness: 4 }).start();
      },
      onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start(),
    })
  ).current;
  useEffect(() => {
    if (visible) {
      drag.setValue(0);
      setMounted(true);
      Animated.timing(y, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    } else if (mounted) {
      Animated.timing(y, { toValue: 1, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start(() => setMounted(false));
    }
  }, [visible]);
  if (!mounted) return null;
  const Inner = scroll ? ScrollView : View;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: y.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', backgroundColor: th.sheet,
          borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderColor: th.line,
          paddingBottom: insets.bottom + 14,
          transform: [{ translateY: Animated.add(y.interpolate({ inputRange: [0, 1], outputRange: [0, 700] }), drag) }],
        }}
      >
        <View {...pull.panHandlers}>
        <View style={{ alignItems: 'center', paddingTop: 10 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: th.line }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 }}>
          <View style={{ flex: 1 }}>
            {title ? <Serif size={22}>{title}</Serif> : null}
            {subtitle ? <Body size={12.5} color={th.accent} style={{ marginTop: 2 }}>{subtitle}</Body> : null}
          </View>
          <IconBtn name="x" onPress={onClose} size={16} label="Close" />
        </View>
        </View>
        <Inner style={{ flexGrow: 0 }} contentContainerStyle={scroll ? { paddingHorizontal: 20, paddingBottom: 8 } : undefined} keyboardShouldPersistTaps="handled">
          {scroll ? children : <View style={{ paddingHorizontal: 20 }}>{children}</View>}
        </Inner>
        {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>{footer}</View> : null}
      </Animated.View>
    </Modal>
  );
}

/* -------------------------- Toast message -------------------------- */
// `message` is a string, or { message, action: { label, onPress }, celebrate }.
// With an action (e.g. Undo) it stays a little longer and can be tapped.
export function Toast({ message, onHide }) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const a = useRef(new Animated.Value(0)).current;
  const m = message && typeof message === 'object' ? message : { message };
  const hideNow = () => Animated.timing(a, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start(() => onHide && onHide());
  useEffect(() => {
    if (!message) return undefined;
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
    const h = setTimeout(hideNow, m.action ? 4200 : 2600);
    return () => clearTimeout(h);
  }, [message]);
  if (!message) return null;
  return (
    <Animated.View
      pointerEvents={m.action ? 'box-none' : 'none'}
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute', left: 24, right: 24, top: insets.top + 12, zIndex: 50, opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
        backgroundColor: th.card, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 10,
      }}
    >
      {m.celebrate ? <Feather name="star" size={16} color={th.cardInk} /> : null}
      <Body size={13} weight="semi" color={th.cardInk} style={{ flex: 1, textAlign: m.action ? 'left' : 'center' }}>{m.message}</Body>
      {m.action ? (
        <Pressable
          onPress={() => { m.action.onPress(); hideNow(); }}
          hitSlop={10}
          accessibilityRole="button"
          style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: th.cardInk }}
        >
          <Body size={12.5} weight="bold" color={th.cardInk}>{m.action.label}</Body>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

// Fades content in whenever `k` changes (tab and sub-tab switches). With
// `dir` (-1 / 1) it also slides in from that side, so moving right through
// the tabs feels like moving right.
export function FadeSwitch({ k, children, style, distance = 10, dir = 0 }) {
  const a = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  const lastDir = useRef(0);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    lastDir.current = dir;
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [k]);
  const sideways = lastDir.current !== 0;
  return (
    <Animated.View
      style={[
        {
          flex: 1,
          opacity: a,
          transform: sideways
            ? [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [lastDir.current * 28, 0] }) }]
            : [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function useBackHandler(handler) {
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [handler]);
}

export function Empty({ icon = 'inbox', title, text }) {
  const th = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 30, gap: 6 }}>
      <Feather name={icon} size={26} color={th.faint} />
      <Serif size={17}>{title}</Serif>
      {text ? <Body size={12.5} color={th.muted} style={{ textAlign: 'center', maxWidth: 260 }}>{text}</Body> : null}
    </View>
  );
}

/* ------------------------------ Input ------------------------------ */
export function Input({ style, multiline, ...rest }) {
  const th = useTheme();
  return (
    <TextInput
      placeholderTextColor={th.faint}
      multiline={multiline}
      {...rest}
      style={[
        {
          fontFamily: F.sans, fontSize: 14, color: th.ink, backgroundColor: th.soft, borderWidth: 1, borderColor: th.line,
          borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
        },
        multiline && { minHeight: 84, textAlignVertical: 'top' },
        style,
      ]}
    />
  );
}

// Round tick used for prayers and checklists.
export function Tick({ done, size = 22, color }) {
  const th = useTheme();
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: th.faint, alignItems: 'center', justifyContent: 'center' }, done && { backgroundColor: color || th.ok, borderColor: color || th.ok }]}>
      {done ? <Feather name="check" size={size * 0.58} color="#fff" /> : null}
    </View>
  );
}
