import React, { type ReactNode } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
export const colors = { cream: '#F8F7F2', green: '#173F35', orange: '#BD481F' }
export function Page({ children }: { children: ReactNode }) { return <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['bottom', 'left', 'right']}><KeyboardAvoidingView style={{ flex: 1 }} behavior="height"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>{children}</ScrollView></KeyboardAvoidingView></SafeAreaView> }
export function Title({ children }: { children: ReactNode }) { return <Text accessibilityRole="header" style={styles.title}>{children}</Text> }
export function Card({ children }: { children: ReactNode }) { return <View style={styles.card}>{children}</View> }
export function Action({ title, onPress, disabled = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, { backgroundColor: secondary ? colors.green : colors.orange, opacity: disabled ? 0.5 : 1 }]}><Text style={{ color: 'white', textAlign: 'center', fontSize: 16, fontWeight: '600' }}>{title}</Text></Pressable> }
export function Field({ label, ...props }: TextInputProps & { label: string }) { return <View style={{ gap: 6 }}><Text style={styles.text}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#69746E" style={styles.input} {...props} /></View> }
export function Message({ children }: { children: ReactNode }) { return children ? <Text accessibilityLiveRegion="polite" style={styles.text}>{children}</Text> : null }
export function Loading() { return <ActivityIndicator accessibilityLabel="Cargando" color={colors.green} size="large" /> }
export class ScreenBoundary extends React.Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <Card><Message>No pudimos mostrar esta sección.</Message><Action title="Reintentar" onPress={() => this.setState({ failed: false })} /></Card> : this.props.children }
}
const styles = StyleSheet.create({
  page: { padding: 20, gap: 16, flexGrow: 1 }, title: { color: colors.green, fontSize: 28, fontWeight: '700' },
  text: { color: colors.green, fontSize: 16, lineHeight: 23 }, card: { backgroundColor: 'white', borderRadius: 20, padding: 18, gap: 12 },
  input: { backgroundColor: 'white', color: colors.green, borderWidth: 1, borderColor: '#B9C5BC', borderRadius: 12, padding: 12, minHeight: 48, fontSize: 16 },
  button: { padding: 14, borderRadius: 14, minHeight: 48, justifyContent: 'center' },
})
/** Toggle chip for filters and tags. tone 'red' marks exclusions (allergens). */
export function Chip({ label, on, onPress, tone = 'green', disabled = false }: { label: string; on: boolean; onPress: () => void; tone?: 'green' | 'red'; disabled?: boolean }) {
  const color = tone === 'red' ? colors.orange : colors.green
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled }} accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: on ? color : '#B9C5BC', backgroundColor: on ? color : 'white', minHeight: 44, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: on ? 'white' : colors.green, fontSize: 15 }}>{label}</Text>
  </Pressable>
}
