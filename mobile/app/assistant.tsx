import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { api } from '../src/api'
import { requestUserLocation, type UserCoords } from '../src/location'
import { emptyContext, type AssistantContext } from '../../shared/contracts/assistant'
import type { AssistantItem } from '../../modules/catalog/data/assistant'
import { colors } from '../src/ui'

type Turn = { id: number; from: 'user' | 'bot'; text: string; items?: AssistantItem[] }
const SUGGESTIONS = ['Algo picante', 'Quiero desayunar cerca', 'Un postre frío', 'Comida típica barata']

/** Diner assistant: works without an account; the conversation lives only on this phone. */
export default function Assistant() {
  const [turns, setTurns] = useState<Turn[]>([{ id: 0, from: 'bot', text: '¡Hola! Cuéntame qué se te antoja y te digo dónde encontrarlo.' }])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const context = useRef<AssistantContext>(emptyContext())
  const location = useRef<UserCoords | null>(null)
  const scroll = useRef<ScrollView>(null)
  const nextId = useRef(1)

  const add = (turn: Omit<Turn, 'id'>) => setTurns(t => [...t, { ...turn, id: nextId.current++ }])

  async function send(message: string) {
    const clean = message.trim()
    if (!clean || busy) return
    setText(''); setBusy(true); add({ from: 'user', text: clean })
    try {
      let result = await api.assistant(clean, context.current, location.current ?? undefined)
      if (result.needsLocation) {
        add({ from: 'bot', text: 'Buscando tu ubicación…' })
        location.current = await requestUserLocation()
        result = location.current
          ? await api.assistant(clean, context.current, location.current)
          : { ...result, reply: 'No pude obtener tu ubicación. Busco en toda la zona si quitas «cerca», o revisa el permiso de ubicación.' }
      }
      context.current = result.context
      add({ from: 'bot', text: result.reply, items: result.items })
    } catch (e) {
      add({ from: 'bot', text: e instanceof Error ? e.message : 'No pude responder. Revisa tu conexión e intenta de nuevo.' })
    } finally { setBusy(false) }
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['bottom', 'left', 'right']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 12 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
        {turns.map(turn => <View key={turn.id} style={{ alignSelf: turn.from === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', gap: 8 }}>
          <View accessibilityLiveRegion={turn.from === 'bot' ? 'polite' : 'none'} style={{ backgroundColor: turn.from === 'user' ? colors.green : 'white', borderRadius: 16, padding: 12 }}>
            <Text style={{ color: turn.from === 'user' ? 'white' : colors.green, fontSize: 16, lineHeight: 22 }}>{turn.text}</Text>
          </View>
          {turn.items?.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Ver sede ${item.name}`} onPress={() => router.push({ pathname: '/sede/[id]', params: { id: item.id } })}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#B9C5BC', minHeight: 48 }}>
            <Text style={{ color: colors.green, fontWeight: '700', fontSize: 16 }}>{item.name}</Text>
            <Text style={{ color: colors.green }}>{item.dish ? `${item.dish.name} · Q${item.dish.price.toFixed(2)}` : item.branch_name}</Text>
            <Text style={{ color: colors.orange, fontWeight: '600', marginTop: 4 }}>Ver sede ›</Text>
          </Pressable>)}
        </View>)}
        {turns.length === 1 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTIONS.map(s => <Pressable key={s} accessibilityRole="button" onPress={() => send(s)} disabled={busy}
            style={{ borderWidth: 1, borderColor: colors.green, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.green }}>{s}</Text>
          </Pressable>)}
        </View> : null}
        {busy ? <Text accessibilityLiveRegion="polite" style={{ color: colors.green, fontStyle: 'italic' }}>Buscando…</Text> : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderColor: '#B9C5BC', backgroundColor: colors.cream }}>
        <TextInput accessibilityLabel="Escribe qué se te antoja" placeholder="Ej. algo picante cerca" placeholderTextColor="#69746E" value={text} onChangeText={setText} maxLength={300}
          editable={!busy} returnKeyType="send" onSubmitEditing={() => send(text)}
          style={{ flex: 1, backgroundColor: 'white', color: colors.green, borderWidth: 1, borderColor: '#B9C5BC', borderRadius: 12, padding: 12, minHeight: 48, fontSize: 16 }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Enviar" onPress={() => send(text)} disabled={busy || !text.trim()}
          style={{ backgroundColor: colors.orange, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', minHeight: 48, opacity: busy || !text.trim() ? 0.5 : 1 }}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Enviar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>
}
