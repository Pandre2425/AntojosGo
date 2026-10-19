'use client'

import { useEffect, useState } from 'react'
import { webApi } from '@/lib/web-api'
import type { OwnerReview } from '@/shared/contracts/reviews'
import { Stars } from './reviews'
import FoodLoader from './food-loader'
import { Button } from './ui/button'
import { t, locale } from '@/shared/i18n'

const when = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })

/** Owner panel: every review of the restaurant's dishes; public reply and report (no delete). */
export default function OwnerReviews({ restaurantId, restaurantName, onClose }: { restaurantId: string; restaurantName: string; onClose: () => void }) {
  const [items, setItems] = useState<OwnerReview[] | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true; setItems(null); setError('')
    webApi.ownerReviews(restaurantId).then(r => { if (active) setItems(r.items) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [restaurantId, retry])
  const update = (id: string, patch: Partial<OwnerReview>) => setItems(rows => rows && rows.map(r => r.id === id ? { ...r, ...patch } : r))
  const avg = items?.length ? items.reduce((s, r) => s + r.rating, 0) / items.length : null
  return <section className="space-y-4 rounded-[24px] border bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">{t('Reseñas de')} {restaurantName}</h2><Button variant="outline" onClick={onClose}>{t('Volver')}</Button></div>
    <p className="text-sm text-muted-foreground">{t('Los comensales reseñan tus platillos sin mostrar su nombre. Puedes responder públicamente o reportar una reseña ofensiva; no se pueden borrar.')}</p>
    {error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRetry(v => v + 1)}>{t('Reintentar')}</Button></div>
      : !items ? <FoodLoader label={t('Cargando reseñas…')} />
      : !items.length ? <p className="text-sm text-muted-foreground">{t('Aún no tienes reseñas. Aparecerán aquí cuando los comensales califiquen tus platillos.')}</p>
      : <>
        <p className="flex items-center gap-2 text-sm"><Stars value={avg} /><span className="tabular-nums">{t('{avg} de promedio · {n} reseñas', { avg: avg!.toFixed(1), n: items.length })}</span></p>
        <ul className="space-y-3">{items.map(r => <ReviewItem key={r.id} review={r} onChange={patch => update(r.id, patch)} />)}</ul>
      </>}
  </section>
}

function ReviewItem({ review: r, onChange }: { review: OwnerReview; onChange: (patch: Partial<OwnerReview>) => void }) {
  const [reply, setReply] = useState(r.reply ?? '')
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  async function run(action: () => Promise<unknown>, ok: string, patch: Partial<OwnerReview>) {
    setBusy(true); setMessage(null)
    try { await action(); onChange(patch); setMessage({ ok: true, text: ok }); setReporting(false) }
    catch (e) { setMessage({ ok: false, text: (e as Error).message }) } finally { setBusy(false) }
  }
  return <li className="space-y-2 rounded-xl border p-4">
    <p className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">{r.dish_name}</span><Stars value={r.rating} /><span className="text-xs text-muted-foreground">{when(r.updated_at)}</span>
      {r.reported_at && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{t('Reportada')}</span>}</p>
    {r.comment ? <p className="whitespace-pre-line text-sm">{r.comment}</p> : <p className="text-sm italic text-muted-foreground">{t('Sin comentario.')}</p>}
    <label htmlFor={`reply-${r.id}`} className="block text-sm font-medium">{t('Tu respuesta pública')}</label>
    <textarea id={`reply-${r.id}`} value={reply} onChange={e => setReply(e.target.value)} maxLength={1000} rows={2} disabled={busy}
      placeholder={t('Ej. ¡Gracias por visitarnos! Ya ajustamos la sal.')} className="w-full rounded-lg border border-input p-2 text-sm focus-visible:outline-2 focus-visible:outline-[#173F35]" />
    {reporting && <div className="space-y-1"><label htmlFor={`report-${r.id}`} className="block text-sm font-medium">{t('¿Por qué la reportas? (opcional)')}</label>
      <input id={`report-${r.id}`} value={reason} onChange={e => setReason(e.target.value)} maxLength={300} disabled={busy} className="w-full rounded-lg border border-input p-2 text-sm" /></div>}
    {message && <p role={message.ok ? 'status' : 'alert'} className={`text-sm ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy} onClick={() => run(() => webApi.replyToReview(r.id, reply), reply.trim() ? t('Respuesta publicada.') : t('Respuesta quitada.'), { reply: reply.trim() || null })}>
        {r.reply ? t('Actualizar respuesta') : t('Responder')}</Button>
      {!r.reported_at && (reporting
        ? <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => webApi.reportReview(r.id, reason), t('Reseña reportada. La revisaremos.'), { reported_at: new Date().toISOString() })}>{t('Enviar reporte')}</Button>
        : <Button size="sm" variant="ghost" disabled={busy} onClick={() => setReporting(true)}>{t('Reportar')}</Button>)}
    </div>
  </li>
}
