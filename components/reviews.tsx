'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { webApi } from '@/lib/web-api'
import { useAccountSession } from '@/hooks/use-account-session'
import { ratingLabel, starParts, type MyReview, type PublicReview, type Rating } from '@/shared/contracts/reviews'
import { RATING_LABELS } from '@/shared/contracts/feedback'
import { Button } from './ui/button'
import { t } from '@/shared/i18n'

/** Average drawn to the nearest half star; the exact number goes in the label. */
export function Stars({ value, className = 'h-4 w-4' }: { value: number | null; className?: string }) {
  return <span className="inline-flex" aria-hidden>{starParts(value).map((part, i) => <span key={i} className="relative inline-block">
    <Star className={`${className} text-stone-300`} />
    {part !== 'empty' && <span className="absolute inset-0 overflow-hidden" style={{ width: part === 'half' ? '50%' : '100%' }}><Star className={`${className} fill-[#BD481F] text-[#BD481F]`} /></span>}
  </span>)}</span>
}

export function RatingSummary({ rating, className = '' }: { rating?: Rating; className?: string }) {
  if (!rating?.rating_count) return null
  return <span className={`inline-flex items-center gap-1 text-sm ${className}`} aria-label={t('Calificación {rating}', { rating: ratingLabel(rating) })}>
    <Stars value={rating.rating_avg} /><span className="tabular-nums text-stone-700">{ratingLabel(rating)}</span></span>
}

export function StarInput({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-pressed={value === n} aria-label={t('{n} de 5: {label}', { n, label: t(RATING_LABELS[n]) })} disabled={disabled}
      onClick={() => onChange(n)} className="rounded-md p-0.5 focus-visible:outline-2 focus-visible:outline-[#173F35]">
      <Star className={`h-7 w-7 ${n <= value ? 'fill-[#BD481F] text-[#BD481F]' : 'text-stone-300'}`} /></button>)}
    {value > 0 && <span className="ml-1 text-sm font-medium text-[#173F35]">{t(RATING_LABELS[value])}</span>}
  </div>
}

const when = (iso: string) => new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })

/** «Reseñas» of a dish, opened on demand: public list, more pages, and the signed-in diner's own review. */
export function DishReviews({ dishId, rating }: { dishId: string; rating?: Rating }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<PublicReview[] | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    if (!open) return
    let active = true; setError('')
    webApi.dishReviews(dishId, page, reload ? Date.now() : 0).then(r => { if (active) { setItems(prev => page && prev ? [...prev, ...r.items] : r.items); setHasMore(r.hasMore) } })
      .catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [open, dishId, page, reload])
  const count = rating?.rating_count ?? 0
  return <div className="mt-2">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm hover:border-[#BD481F] focus-visible:outline-2 focus-visible:outline-[#173F35]">
      {count ? <><Stars value={rating!.rating_avg} /><span className="whitespace-nowrap tabular-nums">{ratingLabel(rating!)}</span></> : <span>{t('Sin reseñas · escribe la primera')}</span>}
      <span aria-hidden>{open ? '▴' : '▾'}</span>
    </button>
    {open && <div className="mt-3 space-y-3 rounded-xl bg-stone-50 p-3">
      <MyReviewForm dishId={dishId} onSaved={() => { setPage(0); setReload(v => v + 1) }} />
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : !items ? <p role="status" className="text-sm text-stone-500">{t('Cargando reseñas…')}</p>
        : items.length === 0 ? <p className="text-sm text-stone-600">{t('Todavía nadie ha reseñado este platillo.')}</p>
        : <ul className="space-y-3">{items.map((r, i) => <li key={`${r.updated_at}-${i}`} className="rounded-lg bg-white p-3 text-sm">
          <p className="flex items-center gap-2"><Stars value={r.rating} /><span className="text-xs text-stone-500">{t('Comensal ·')} {when(r.updated_at)}</span></p>
          {r.comment && <p className="mt-1 whitespace-pre-line text-stone-800">{r.comment}</p>}
          {r.reply && <p className="mt-2 border-l-2 border-[#173F35] pl-2 text-stone-700"><span className="font-semibold text-[#173F35]">{t('Respuesta del restaurante:')} </span>{r.reply}</p>}
        </li>)}</ul>}
      {hasMore && <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>{t('Ver más reseñas')}</Button>}
    </div>}
  </div>
}

function MyReviewForm({ dishId, onSaved }: { dishId: string; onSaved: () => void }) {
  const { user } = useAccountSession()
  const [mine, setMine] = useState<MyReview | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => {
    if (!user) return
    let active = true
    webApi.myReview(dishId).then(r => { if (active && r) { setMine(r); setRating(r.rating); setComment(r.comment ?? '') } }).catch(() => {})
    return () => { active = false }
  }, [user?.id, dishId])
  if (!user) return <p className="text-sm text-stone-600">{t('Inicia sesión en «Mi cuenta» para escribir una reseña. Las reseñas se publican sin tu nombre.')}</p>
  async function run(action: () => Promise<unknown>, ok: string) {
    setBusy(true); setMessage(null)
    try { await action(); setMessage({ ok: true, text: ok }); onSaved() }
    catch (e) { setMessage({ ok: false, text: (e as Error).message }) } finally { setBusy(false) }
  }
  const save = () => rating ? run(async () => setMine(await webApi.saveReview(dishId, { rating, comment })), t('¡Gracias! Tu reseña está publicada.')) : setMessage({ ok: false, text: t('Elige de 1 a 5 estrellas.') })
  const remove = () => run(async () => { await webApi.deleteReview(dishId); setMine(null); setRating(0); setComment('') }, t('Borramos tu reseña.'))
  return <div className="space-y-2 rounded-lg border bg-white p-3">
    <p className="text-sm font-semibold text-[#173F35]">{mine ? t('Tu reseña') : t('¿Lo probaste? Califícalo')}</p>
    <StarInput value={rating} onChange={n => { setRating(n); setMessage(null) }} disabled={busy} />
    <label className="sr-only" htmlFor={`review-${dishId}`}>{t('Comentario (opcional)')}</label>
    <textarea id={`review-${dishId}`} value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} rows={3} disabled={busy}
      placeholder={t('Cuéntanos qué te pareció (opcional). Se publica sin tu nombre.')}
      className="w-full rounded-lg border border-input p-2 text-sm focus-visible:outline-2 focus-visible:outline-[#173F35]" />
    {message && <p role={message.ok ? 'status' : 'alert'} className={`text-sm ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={save} disabled={busy}>{busy ? t('Guardando…') : mine ? t('Actualizar reseña') : t('Publicar reseña')}</Button>
      {mine && <Button size="sm" variant="outline" onClick={remove} disabled={busy}>{t('Borrar mi reseña')}</Button>}
    </div>
  </div>
}
