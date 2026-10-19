import { useRef, useState } from 'react'
import { Pressable, Text } from 'react-native'
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { colors, radius } from './ui'
import { t, msg, currentLang } from '../../shared/i18n'

// Recognition events are global and tabs stay mounted: only the button that started listening reacts.
let owner: object | null = null

const ERRORS: Record<string, string> = {
  'not-allowed': msg('Permite el micrófono para buscar por voz (Ajustes > Apps > AntojosGo > Permisos).'),
  'no-speech': msg('No te escuchamos. Toca el micrófono e intenta de nuevo.'),
  'speech-timeout': msg('No te escuchamos. Toca el micrófono e intenta de nuevo.'),
  network: msg('La búsqueda por voz necesita conexión a internet.'),
  'language-not-supported': msg('Tu teléfono no reconoce voz en español. Escribe tu búsqueda.'),
}

/** Microphone: Android's speech recognizer (Google app) in Spanish; hands back the text. Hidden if the phone has none. */
export function VoiceButton({ onText, onError, size = 48 }: { onText: (text: string) => void; onError?: (message: string) => void; size?: number }) {
  const [listening, setListening] = useState(false)
  const me = useRef({}).current
  const mine = () => owner === me
  const [available] = useState(() => { try { return ExpoSpeechRecognitionModule.isRecognitionAvailable() } catch { return false } })
  useSpeechRecognitionEvent('start', () => { if (mine()) setListening(true) })
  useSpeechRecognitionEvent('end', () => { if (mine()) { setListening(false); owner = null } })
  useSpeechRecognitionEvent('result', e => { const text = e.results[0]?.transcript?.trim(); if (mine() && e.isFinal && text) onText(text) })
  useSpeechRecognitionEvent('error', e => { if (!mine()) return; setListening(false); owner = null; if (e.error !== 'aborted') onError?.(ERRORS[e.error] ? t(ERRORS[e.error]) : t('No pudimos usar el micrófono. Escribe tu búsqueda.')) })
  if (!available) return null
  async function toggle() {
    if (listening) { ExpoSpeechRecognitionModule.abort(); return }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!permission.granted) { onError?.(t(ERRORS['not-allowed'])); return }
    owner = me
    ExpoSpeechRecognitionModule.start({ lang: currentLang() === 'en' ? 'en-US' : 'es-419', interimResults: false, continuous: false })
  }
  return <Pressable accessibilityRole="button" accessibilityLabel={listening ? t('Detener búsqueda por voz') : t('Buscar por voz')} accessibilityState={{ busy: listening }}
    onPress={() => void toggle()} hitSlop={4}
    style={({ pressed }) => ({ width: size, height: size, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
      backgroundColor: listening ? colors.orange : pressed ? colors.border : colors.white, borderWidth: 1, borderColor: listening ? colors.orange : colors.border })}>
    <Text style={{ fontSize: size * 0.45 }}>{listening ? '⏹' : '🎤'}</Text>
  </Pressable>
}
