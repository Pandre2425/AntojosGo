import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Constants from 'expo-constants'
import { api } from './api'
import { Action, Card, Field, Message, Txt, colors } from './ui'
import { RATING_LABELS } from '../../shared/contracts/feedback'
import { t } from '../../shared/i18n'

/** «¿Qué te parece AntojosGo?»: 1–5 stars and an optional suggestion; saving again replaces the previous one. */
export function AppFeedback() {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const lock = useRef(false)
  useEffect(() => { api.myFeedback().then(f => { if (f) { setRating(f.rating); setComment(f.comment ?? ''); setSent(true) } }).catch(() => {}) }, [])
  async function save() {
    if (lock.current) return
    if (!rating) { setMessage(t('Elige de 1 a 5 estrellas.')); return }
    lock.current = true; setBusy(true); setMessage('')
    try {
      await api.saveFeedback({ rating, comment, platform: 'android', app_version: Constants.expoConfig?.version ?? null })
      setSent(true); setMessage(t('¡Gracias! Guardamos tu opinión.'))
    } catch (e) { setMessage(e instanceof Error ? e.message : t('No pudimos guardar tu opinión.')) }
    finally { lock.current = false; setBusy(false) }
  }
  return <Card>
    <Txt variant="headline" accessibilityRole="header">{t('¿Qué te parece AntojosGo?')}</Txt>
    <Message>{t('Califica la app de 1 a 5 estrellas. Tu comentario nos ayuda a mejorarla.')}</Message>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => <Pressable key={n} accessibilityRole="button" accessibilityLabel={t('{n} de 5: {label}', { n, label: t(RATING_LABELS[n]) })} accessibilityState={{ selected: rating === n, disabled: busy }}
        disabled={busy} hitSlop={4} onPress={() => { setRating(n); setMessage('') }} style={{ padding: 4 }}>
        <Text style={{ fontSize: 34, lineHeight: 40, color: n <= rating ? colors.orange : colors.border }}>★</Text>
      </Pressable>)}
      {rating > 0 ? <Text style={{ marginLeft: 8, color: colors.green, fontWeight: '600' }}>{t(RATING_LABELS[rating])}</Text> : null}
    </View>
    <Field label={t('¿Qué podríamos mejorar? (opcional)')} value={comment} onChangeText={setComment} maxLength={1000} editable={!busy}
      multiline textAlignVertical="top" style={{ minHeight: 110 }} placeholder={t('Por ejemplo: que el mapa cargue más rápido…')} />
    <Message>{message}</Message>
    <Action title={busy ? t('Enviando…') : sent ? t('Actualizar mi opinión') : t('Enviar opinión')} onPress={save} disabled={busy} />
  </Card>
}
