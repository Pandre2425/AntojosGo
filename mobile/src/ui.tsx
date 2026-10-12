import React, { type ReactNode } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextProps, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// Design tokens: the only place for colors, sizes and spacing. Screens use these or the components below.
export const colors = {
  cream: '#F8F7F2', green: '#173F35', orange: '#BD481F', white: '#FFFFFF',
  orangeSoft: '#F6E2D9', // selected tab indicator
  muted: '#5F6B64',   // secondary text (5.2:1 on cream)
  border: '#B9C5BC',  // input/chip outlines, dividers
  inactive: '#B9B4AA', // hidden dish edge
  danger: '#9A3A18',  // "contains allergen"
  warning: { text: '#7C4A03', bg: '#FFFBEB', border: '#B7791F' },
} as const
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const
export const radius = { sm: 12, md: 14, lg: 20, full: 999 } as const
export const type = {
  title: { color: colors.green, fontSize: 28, fontWeight: '700' },
  headline: { color: colors.green, fontSize: 18, fontWeight: '700' },
  body: { color: colors.green, fontSize: 16, lineHeight: 23 },
  subhead: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  label: { color: colors.green, fontSize: 16, fontWeight: '600' },
} as const

/** Screen container. `tab` = shown under the tab bar (no stack header, so it takes the top inset; the tab bar owns the bottom). */
export function Page({ children, tab = false }: { children: ReactNode; tab?: boolean }) { return <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={tab ? ['top', 'left', 'right'] : ['bottom', 'left', 'right']}><KeyboardAvoidingView style={{ flex: 1 }} behavior="height"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>{children}</ScrollView></KeyboardAvoidingView></SafeAreaView> }
export function Title({ children }: { children: ReactNode }) { return <Text accessibilityRole="header" style={type.title}>{children}</Text> }
/** Text in one of the type ramp steps; screens never set fontSize themselves. */
export function Txt({ variant = 'body', style, ...props }: TextProps & { variant?: keyof typeof type }) { return <Text style={[type[variant], style]} {...props} /> }
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[styles.card, style]}>{children}</View> }
export function Action({ title, onPress, disabled = false, secondary = false, style }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor: secondary ? colors.green : colors.orange, opacity: disabled ? 0.5 : pressed ? 0.8 : 1, transform: [{ scale: pressed && !disabled ? 0.98 : 1 }] }, style]}>
    <Text style={[type.label, { color: colors.white, textAlign: 'center' }]}>{title}</Text>
  </Pressable>
}
/** Text input without a visible label (give it accessibilityLabel). */
export function Input(props: TextInputProps) { return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} /> }
export function Field({ label, ...props }: TextInputProps & { label: string }) { return <View style={{ gap: 6 }}><Text style={type.body}>{label}</Text><Input accessibilityLabel={label} {...props} /></View> }
export function Message({ children }: { children: ReactNode }) { return children ? <Text accessibilityLiveRegion="polite" style={type.body}>{children}</Text> : null }
export function Loading() { return <ActivityIndicator accessibilityLabel="Cargando" color={colors.green} size="large" /> }
export class ScreenBoundary extends React.Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <Card><Message>No pudimos mostrar esta sección.</Message><Action title="Reintentar" onPress={() => this.setState({ failed: false })} /></Card> : this.props.children }
}
const styles = StyleSheet.create({
  page: { padding: spacing.xl, gap: spacing.lg, flexGrow: 1 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, gap: spacing.md },
  input: { backgroundColor: colors.white, color: colors.green, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md, minHeight: 48, fontSize: 16 },
  button: { padding: 14, borderRadius: radius.md, minHeight: 48, justifyContent: 'center' },
})
/** Toggle chip for filters and tags. tone 'red' marks exclusions (allergens). */
export function Chip({ label, on, onPress, tone = 'green', disabled = false }: { label: string; on: boolean; onPress: () => void; tone?: 'green' | 'red'; disabled?: boolean }) {
  const color = tone === 'red' ? colors.orange : colors.green
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled }} accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ paddingVertical: spacing.sm, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: on ? color : colors.border, backgroundColor: on ? color : pressed ? colors.cream : colors.white, minHeight: 44, justifyContent: 'center', opacity: disabled ? 0.5 : 1 })}>
    <Text style={{ color: on ? colors.white : colors.green, fontSize: 15 }}>{label}</Text>
  </Pressable>
}
