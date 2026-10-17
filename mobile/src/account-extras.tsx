import { useEffect, useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { api } from './api'
import { unhideRestaurant } from './hidden'
import { Card, Message, Txt, colors, spacing, type } from './ui'
import type { HiddenRestaurant } from '../../lib/api-client'

/** «Accesibilidad»: the app follows the phone's text size and «remove animations»; one tap opens those settings. */
export function AccessibilityCard() {
  const open = () => Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS').catch(() => Linking.openSettings())
  return <Card>
    <Txt variant="headline" accessibilityRole="header">Accesibilidad</Txt>
    <Message>AntojosGo usa el tamaño de letra de tu teléfono. Para verla más grande, cambia «Tamaño de fuente» en los ajustes de accesibilidad. Si activas «Quitar animaciones», la app tampoco las muestra.</Message>
    <Pressable accessibilityRole="button" onPress={() => void open()} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={[type.body, { color: colors.green, fontWeight: '700', textDecorationLine: 'underline' }]}>Abrir ajustes de accesibilidad</Text>
    </Pressable>
  </Card>
}

/** «Restaurantes que no te interesan», each with «Mostrar de nuevo». Hidden when the list is empty. */
export function HiddenRestaurantsCard() {
  const [items, setItems] = useState<HiddenRestaurant[]>([])
  const [error, setError] = useState('')
  useEffect(() => { api.listHidden().then(setItems).catch(() => {}) }, [])
  if (!items.length && !error) return null
  async function show(id: string) {
    setError('')
    try { await unhideRestaurant(id); setItems(rows => rows.filter(r => r.restaurant_id !== id)) }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos mostrarlo de nuevo.') }
  }
  return <Card>
    <Txt variant="headline" accessibilityRole="header">Restaurantes que no te interesan</Txt>
    <Message>No aparecen en tus búsquedas ni en el asistente.</Message>
    <Message>{error}</Message>
    {items.map(r => <View key={r.restaurant_id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
      <Txt style={{ flex: 1 }}>{r.name}</Txt>
      <Pressable accessibilityRole="button" accessibilityLabel={`Mostrar de nuevo ${r.name}`} onPress={() => void show(r.restaurant_id)} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={[type.body, { color: colors.green, fontWeight: '700' }]}>Mostrar de nuevo</Text>
      </Pressable>
    </View>)}
  </Card>
}
