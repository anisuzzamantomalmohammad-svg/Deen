// Horizontal swipes: left = next, right = previous. Only clear sideways
// drags count, so vertical scrolling keeps working.
import React, { useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, Platform, ScrollView } from 'react-native';

const native = Platform.OS !== 'web';

// While a finger is on a sideways-scrolling row (chips), page swipes are off,
// so scrolling the chips never jumps to another tab.
const lock = { on: false, timer: null };
const holdLock = () => { clearTimeout(lock.timer); lock.on = true; };
const freeLock = () => { clearTimeout(lock.timer); lock.timer = setTimeout(() => { lock.on = false; }, 250); };

export function HScroll({ children, ...rest }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      onTouchStart={holdLock}
      onTouchEnd={freeLock}
      onTouchCancel={freeLock}
      onScrollBeginDrag={holdLock}
      onMomentumScrollEnd={freeLock}
      onScrollEndDrag={freeLock}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

export function useSwipe(onNext, onPrev, { enabled = true } = {}) {
  const ref = useRef({ onNext, onPrev, enabled });
  ref.current = { onNext, onPrev, enabled };
  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => ref.current.enabled && !lock.on && Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50 && ref.current.onNext) ref.current.onNext();
          else if (g.dx > 50 && ref.current.onPrev) ref.current.onPrev();
        },
      }),
    []
  ).panHandlers;
}

// A view that slides its content out and back in when `step` is called.
// `step(delta, apply)`: slide out towards -delta, run apply(), slide in.
export function useSlide() {
  const v = useRef(new Animated.Value(0)).current;
  const step = (delta, apply) => {
    Animated.timing(v, { toValue: -delta, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: native }).start(() => {
      apply();
      v.setValue(delta);
      Animated.timing(v, { toValue: 0, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
    });
  };
  const style = {
    opacity: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
    transform: [{ translateX: v.interpolate({ inputRange: [-1, 1], outputRange: [-36, 36] }) }],
  };
  return { step, style };
}

export function SwipeView({ onNext, onPrev, style, children, enabled }) {
  const pan = useSwipe(onNext, onPrev, { enabled });
  return (
    <Animated.View {...pan} style={style}>
      {children}
    </Animated.View>
  );
}
