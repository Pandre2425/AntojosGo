import { useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../src/session'
import { api } from '../../src/api'
import { Stars } from '../../src/reviews'
import { Action, Card, Field, Loading, Message, Page, Title, Txt, colors, spacing } from '../../src/ui'
import type { OwnerReview } from '../../../shared/contracts/reviews'
import { t } from '../../../shared/i18n'

const when = (iso: string) => new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })

/** Owner: reviews of the restaurant's dishes; public reply and report (no delete). */
export default function OwnerReviews() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, ready } = useSession()
  const [items, setItems] = useState<OwnerReview[] | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!session) return
    let active = true; setItems(null); setError('')
    api.ownerReviews(String(id)).then(r => { if (active) setItems(r.items) }).catch(e => { if (active) setError(e instanceof Error ? e.message : t('No pudimos cargar las reseñas.')) })
    return () => { active = false }
  }, [id, session?.user.id, retry])
  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/account" />
  const avg = items?.length ? items.reduce((s, r) => s + r.rating, 0) / items.length : null
  return <Page><Title>{t('Reseñas')}</Title>
    <Message>{t('Los comensales reseñan tus platillos sin mostrar su nombre. Puedes responder públicamente o reportar una reseña ofensiva; no se pueden borrar.')}</Message>
    {error ? <><Message>{error}</Message><Action title={t('Reintentar')} onPress={() => setRetry(v => v + 1)} /></>
      : !items ? <Loading label={t('Cargando reseñas…')} />
      : !items.length ? <Message>{t('Aún no tienes reseñas. Aparecerán aquí cuando los comensales califiquen tus platillos.')}</Message>
      : <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><Stars value={avg} size={20} /><Txt>{t('{avg} de promedio · {n} reseñas', { avg: avg!.toFixed(1), n: items.length })}</Txt></View>
        {items.map(r => <ReviewItem key={r.id} review={r} onChange={patch => setItems(rows => rows && rows.map(x => x.id === r.id ? { ...x, ...patch } : x))} />)}
      </>}
  </Page>
}

function ReviewItem({ review: r, onChange }: { review: OwnerReview; onChange: (patch: Partial<OwnerReview>) => void }) {
  const [reply, setReply] = useState(r.reply ?? '')
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const lock = useRef(false)
  async function run(action: () => Promise<unknown>, ok: string, patch: Partial<OwnerReview>) {
    if (lock.current) return
    lock.current = true; setBusy(true); setMessage('')
    try { await action(); onChange(patch); setMessage(ok); setReporting(false) }
    catch (e) { setMessage(e instanceof Error ? e.message : t('No pudimos guardar.')) }
    finally { lock.current = false; setBusy(false) }
  }
  return <Card>
    <Txt variant="label">{r.dish_name}</Txt>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
      <Stars value={r.rating} size={18} /><Text style={{ color: colors.muted }}>{when(r.updated_at)}</Text>
      {r.reported_at ? <Text style={{ color: colors.warning.text, backgroundColor: colors.warning.bg, paddingHorizontal: 8, borderRadius: 10 }}>{t('Reportada')}</Text> : null}
    </View>
    {r.comment ? <Txt selectable>{r.comment}</Txt> : <Txt variant="subhead">{t('Sin comentario.')}</Txt>}
    <Field label={t('Tu respuesta pública')} value={reply} onChangeText={setReply} maxLength={1000} editable={!busy} multiline textAlignVertical="top" style={{ minHeight: 70 }} placeholder={t('Ej. ¡Gracias por visitarnos!')} />
    {reporting ? <Field label={t('¿Por qué la reportas? (opcional)')} value={reason} onChangeText={setReason} maxLength={300} editable={!busy} /> : null}
    <Message>{message}</Message>
    <Action title={busy ? t('Guardando…') : r.reply ? t('Actualizar respuesta') : t('Responder')} disabled={busy}
      onPress={() => run(() => api.replyToReview(r.id, reply), reply.trim() ? t('Respuesta publicada.') : t('Respuesta quitada.'), { reply: reply.trim() || null })} />
    {!r.reported_at ? <Action title={reporting ? t('Enviar reporte') : t('Reportar')} secondary disabled={busy}
      onPress={() => reporting ? run(() => api.reportReview(r.id, reason), t('Reseña reportada. La revisaremos.'), { reported_at: new Date().toISOString() }) : setReporting(true)} /> : null}
  </Card>
}
