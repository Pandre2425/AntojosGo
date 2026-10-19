import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { api } from './api'
import { useSession } from './session'
import { Action, Field, Txt, colors, radius, spacing } from './ui'
import { ratingLabel, starParts, type MyReview, type PublicReview, type Rating } from '../../shared/contracts/reviews'
import { RATING_LABELS } from '../../shared/contracts/feedback'
import { t, contentNote, locale } from '../../shared/i18n'

/** Average drawn to the nearest half star (a half is the left half of a filled star over an empty one). */
export function Stars({ value, size = 16 }: { value: number | null; size?: number }) {
  const star = (color: string) => <Text style={{ fontSize: size, lineHeight: size * 1.2, color }}>★</Text>
  return <View style={{ flexDirection: 'row' }} accessible={false} importantForAccessibility="no-hide-descendants">
    {starParts(value).map((part, i) => <View key={i}>
      {star(colors.border)}
      {part !== 'empty' ? <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: part === 'half' ? '50%' : '100%', overflow: 'hidden' }}>{star(colors.orange)}</View> : null}
    </View>)}
  </View>
}

export function RatingLine({ rating, size = 16 }: { rating?: Rating; size?: number }) {
  if (!rating?.rating_count) return null
  return <View accessible accessibilityLabel={t('Calificación {rating}', { rating: ratingLabel(rating) })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <Stars value={rating.rating_avg} size={size} /><Text style={{ color: colors.muted, fontVariant: ['tabular-nums'] }}>{ratingLabel(rating)}</Text>
  </View>
}

export function StarInput({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(n => <Pressable key={n} accessibilityRole="button" accessibilityLabel={t('{n} de 5: {label}', { n, label: t(RATING_LABELS[n]) })} accessibilityState={{ selected: value === n, disabled }}
      disabled={disabled} hitSlop={4} onPress={() => onChange(n)} style={{ padding: 4 }}>
      <Text style={{ fontSize: 32, lineHeight: 38, color: n <= value ? colors.orange : colors.border }}>★</Text>
    </Pressable>)}
    {value > 0 ? <Text style={{ marginLeft: 6, color: colors.green, fontWeight: '600' }}>{t(RATING_LABELS[value])}</Text> : null}
  </View>
}

const when = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })

/** «Reseñas» inside the dish sheet: the user's own review and the public list (anonymous). */
export function DishReviews({ dishId, rating }: { dishId: string; rating?: Rating }) {
  const [items, setItems] = useState<PublicReview[] | null>(null)
  const [translated, setTranslated] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true; setError('')
    api.dishReviews(dishId, page, reload ? Date.now() : 0).then(r => { if (active) { setItems(prev => page && prev ? [...prev, ...r.items] : r.items); setTranslated(Boolean(r.translated)); setHasMore(r.hasMore) } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : t('No pudimos cargar las reseñas.')) })
    return () => { active = false }
  }, [dishId, page, reload])
  return <View style={{ gap: spacing.md }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
      <Txt variant="label" accessibilityRole="header">{t('Reseñas')}</Txt>
      <RatingLine rating={rating} />
    </View>
    {items?.length && contentNote(translated) ? <Txt variant="subhead">{contentNote(translated)}</Txt> : null}
    <MyReviewForm dishId={dishId} onSaved={() => { setPage(0); setReload(v => v + 1) }} />
    {error ? <Txt style={{ color: colors.danger }}>{error}</Txt>
      : !items ? <Txt variant="subhead">{t('Cargando reseñas…')}</Txt>
      : !items.length ? <Txt variant="subhead">{t('Todavía nadie ha reseñado este platillo.')}</Txt>
      : items.map((r, i) => <View key={`${r.updated_at}-${i}`} style={{ gap: 4, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.white }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><Stars value={r.rating} /><Text style={{ color: colors.muted, fontSize: 13 }}>{t('Comensal ·')} {when(r.updated_at)}</Text></View>
          {r.comment ? <Txt selectable>{r.comment}</Txt> : null}
          {r.reply ? <View style={{ borderLeftWidth: 3, borderLeftColor: colors.green, paddingLeft: spacing.sm, marginTop: 4 }}>
            <Text style={{ color: colors.green, fontWeight: '700' }}>{t('Respuesta del restaurante')}</Text><Txt selectable>{r.reply}</Txt></View> : null}
        </View>)}
    {hasMore ? <Action title={t('Ver más reseñas')} secondary onPress={() => setPage(p => p + 1)} /> : null}
  </View>
}

function MyReviewForm({ dishId, onSaved }: { dishId: string; onSaved: () => void }) {
  const { session } = useSession()
  const [mine, setMine] = useState<MyReview | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const lock = useRef(false)
  useEffect(() => {
    if (!session) return
    let active = true
    api.myReview(dishId).then(r => { if (active && r) { setMine(r); setRating(r.rating); setComment(r.comment ?? '') } }).catch(() => {})
    return () => { active = false }
  }, [session?.user.id, dishId])
  if (!session) return <Txt variant="subhead">{t('Inicia sesión en «Mi cuenta» para escribir una reseña. Se publican sin tu nombre.')}</Txt>
  async function run(action: () => Promise<unknown>, ok: string) {
    if (lock.current) return
    lock.current = true; setBusy(true); setMessage('')
    try { await action(); setMessage(ok); onSaved() }
    catch (e) { setMessage(e instanceof Error ? e.message : t('No pudimos guardar tu reseña.')) }
    finally { lock.current = false; setBusy(false) }
  }
  const save = () => rating ? run(async () => setMine(await api.saveReview(dishId, { rating, comment })), t('¡Gracias! Tu reseña está publicada.')) : setMessage(t('Elige de 1 a 5 estrellas.'))
  const remove = () => run(async () => { await api.deleteReview(dishId); setMine(null); setRating(0); setComment('') }, t('Borramos tu reseña.'))
  return <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }}>
    <Txt variant="label">{mine ? t('Tu reseña') : t('¿Lo probaste? Califícalo')}</Txt>
    <StarInput value={rating} onChange={n => { setRating(n); setMessage('') }} disabled={busy} />
    <Field label={t('Comentario (opcional, sin tu nombre)')} value={comment} onChangeText={setComment} maxLength={1000} editable={!busy}
      multiline textAlignVertical="top" style={{ minHeight: 90 }} placeholder={t('¿Qué te pareció?')} />
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: colors.green }}>{message}</Text> : null}
    <Action title={busy ? t('Guardando…') : mine ? t('Actualizar reseña') : t('Publicar reseña')} onPress={save} disabled={busy} />
    {mine ? <Action title={t('Borrar mi reseña')} secondary onPress={remove} disabled={busy} /> : null}
  </View>
}
