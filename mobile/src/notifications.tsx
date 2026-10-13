import { useEffect, useState } from 'react'
import { Image, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createBoundedFetch } from '../../lib/bounded-fetch'
import { parseAnnouncements, type Announcement } from '../../shared/contracts/announcements'
import { getServerUrl } from './server'
import { Action, Txt, colors, radius, spacing } from './ui'

const fetchNotices = createBoundedFetch(8000)
const SEEN_KEY = 'seen-announcements'

/** Bell with an unseen dot; opens the notices from the server's public/announcements.json. */
export function NotificationsBell() {
  const [items, setItems] = useState<Announcement[]>([])
  const [seen, setSeen] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const insets = useSafeAreaInsets()
  useEffect(() => {
    SecureStore.getItemAsync(SEEN_KEY).then(v => setSeen(v ? JSON.parse(v) : [])).catch(() => {})
    const base = getServerUrl()
    if (base) fetchNotices(`${base}/announcements.json`, { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : []).then(b => setItems(parseAnnouncements(b, 'app'))).catch(() => {})
  }, [])
  const unseen = items.filter(a => !seen.includes(a.id)).length
  function show() {
    setOpen(true)
    if (!unseen) return
    const ids = items.map(a => a.id)
    setSeen(ids); SecureStore.setItemAsync(SEEN_KEY, JSON.stringify(ids)).catch(() => {})
  }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={unseen ? `Notificaciones, ${unseen} sin leer` : 'Notificaciones'} onPress={show} hitSlop={8}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.border : colors.white })}>
      <Image source={require('./assets/bell.png')} style={{ width: 24, height: 24 }} />
      {unseen ? <View style={{ position: 'absolute', top: 9, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.orange, borderWidth: 2, borderColor: colors.white }} /> : null}
    </Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
      <Pressable accessibilityLabel="Cerrar notificaciones" onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <View style={{ maxHeight: '75%', backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom }}>
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginVertical: spacing.sm }} />
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.md }}>
          <Txt variant="title" accessibilityRole="header" style={{ fontSize: 24 }}>Notificaciones</Txt>
          {items.length === 0 ? <Txt variant="subhead">No hay notificaciones.</Txt> : items.map(a => <View key={a.id}
            style={{ gap: spacing.xs, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.white }}>
            <Txt variant="label">{a.title}</Txt>
            <Txt>{a.body}</Txt>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{a.date.split('-').reverse().join('/')}</Text>
            {a.link ? <Action title={a.link.label} onPress={() => void Linking.openURL(a.link!.url)} style={{ marginTop: spacing.xs }} /> : null}
          </View>)}
          <Action title="Cerrar" secondary onPress={() => setOpen(false)} />
        </ScrollView>
      </View>
    </Modal>
  </>
}
