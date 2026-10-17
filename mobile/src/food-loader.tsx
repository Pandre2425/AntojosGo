import { useEffect, useRef, type ReactNode } from 'react'
import { AccessibilityInfo, Animated, Easing, Text, View, type ViewStyle } from 'react-native'

// Loading state: the logo's shuco assembles itself piece by piece (same idea as the web's components/food-loader.tsx).
// Drawn on a 160x110 grid; with reduced motion the finished shuco is shown still.
const box = (style: ViewStyle): ViewStyle => ({ position: 'absolute', ...style })
const PIECES: ReactNode[] = [
  // Bun
  <View key="bun" style={box({ left: 14, top: 44, width: 132, height: 50, backgroundColor: '#E7A157', borderColor: '#7A3E14', borderWidth: 3, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderBottomLeftRadius: 66, borderBottomRightRadius: 66 })} />,
  // Sausage
  <View key="sausage" style={box({ left: 20, top: 42, width: 120, height: 20, borderRadius: 10, backgroundColor: '#B4432A', borderColor: '#6E2414', borderWidth: 3 })} />,
  // Cabbage
  <View key="cabbage" style={box({ left: 22, top: 37, flexDirection: 'row' })}>
    {Array.from({ length: 8 }, (_, i) => <View key={i} style={{ width: 16, height: 7, marginRight: -1, borderRadius: 4, backgroundColor: '#C7E37A', transform: [{ rotate: i % 2 ? '14deg' : '-14deg' }] }} />)}
  </View>,
  // Tomato
  <View key="tomato" style={box({ left: 0, top: 0 })}>
    {[33, 57, 85, 111].map(left => <View key={left} style={box({ left, top: 34, width: 14, height: 14, borderRadius: 7, backgroundColor: '#E2412B', borderColor: '#8E1F12', borderWidth: 2 })} />)}
  </View>,
  // Guacamole
  <View key="guac" style={box({ left: 0, top: 0 })}>
    {[[30, 30, 26], [50, 24, 30], [74, 22, 32], [98, 25, 30], [118, 31, 22]].map(([left, top, size]) => <View key={left} style={box({ left, top, width: size, height: size * 0.7, borderRadius: size, backgroundColor: '#7DB83A', borderColor: '#3F6E1A', borderWidth: 2 })} />)}
  </View>,
  // Ketchup and mustard
  <View key="sauce" style={box({ left: 36, top: 25, flexDirection: 'row' })}>
    {Array.from({ length: 8 }, (_, i) => <View key={i} style={{ width: 12, height: 4, borderRadius: 2, marginRight: -1, backgroundColor: i % 3 === 2 ? '#F4B400' : '#D62828', transform: [{ rotate: i % 2 ? '40deg' : '-40deg' }] }} />)}
  </View>,
]

export function FoodLoader({ label = 'Cargando…', scale = 0.8 }: { label?: string; scale?: number }) {
  const drops = useRef(PIECES.map(() => new Animated.Value(0))).current
  const pop = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(1)).current
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then(reduce => {
      if (cancelled) return
      if (reduce) { drops.forEach(v => v.setValue(1)); return }
      const t = (value: Animated.Value, toValue: number, duration: number, easing = Easing.out(Easing.quad)) =>
        Animated.timing(value, { toValue, duration, easing, useNativeDriver: true })
      // Animated.loop resets every value to its start before each round.
      loop = Animated.loop(Animated.sequence([
        Animated.stagger(170, drops.map(v => t(v, 1, 520, Easing.bounce))),
        t(pop, 1, 140), t(pop, 0, 220),
        Animated.delay(900),
        t(fade, 0, 300),
      ]))
      loop.start()
    })
    return () => { cancelled = true; loop?.stop() }
  }, [drops, pop, fade])
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
    <View style={{ width: 160 * scale, height: 110 * scale }}>
      <Animated.View style={{ width: 160, height: 110, opacity: fade, transform: [{ scale }, { translateX: -80 * (1 - scale) / scale }, { translateY: -55 * (1 - scale) / scale }] }}>
        <View style={box({ left: 26, top: 98, width: 108, height: 10, borderRadius: 54, backgroundColor: 'rgba(23,63,53,0.12)' })} />
        <Animated.View style={{ flex: 1, transform: [{ rotate: '-8deg' }, { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }] }}>
          {PIECES.map((piece, i) => <Animated.View key={i} style={[box({ left: 0, top: 0, right: 0, bottom: 0 }), {
            opacity: drops[i].interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
            transform: [{ translateY: drops[i].interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) }],
          }]}>{piece}</Animated.View>)}
        </Animated.View>
      </Animated.View>
    </View>
    <Text style={{ color: '#173F35', fontSize: 15, fontWeight: '500' }}>{label}</Text>
  </View>
}
