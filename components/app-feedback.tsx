'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { webApi } from '@/lib/web-api'
import { RATING_LABELS } from '@/shared/contracts/feedback'
import { Button } from './ui/button'

/** «¿Qué te parece AntojosGo?»: 1–5 stars and an optional suggestion; saving again replaces the previous one. */
export default function AppFeedback() {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => {
    webApi.myFeedback().then(f => { if (f) { setRating(f.rating); setComment(f.comment ?? ''); setSent(true) } }).catch(() => {})
  }, [])
  async function save() {
    if (!rating) { setMessage({ ok: false, text: 'Elige de 1 a 5 estrellas.' }); return }
    setBusy(true); setMessage(null)
    try {
      await webApi.saveFeedback({ rating, comment, platform: 'web' })
      setSent(true); setMessage({ ok: true, text: '¡Gracias! Guardamos tu opinión.' })
    } catch (error) { setMessage({ ok: false, text: (error as Error).message }) }
    finally { setBusy(false) }
  }
  return <section aria-labelledby="feedback-title" className="space-y-3 rounded-[24px] border bg-white p-5">
    <div><h2 id="feedback-title" className="text-lg font-semibold text-[#173F35]">¿Qué te parece AntojosGo?</h2>
      <p className="text-sm text-stone-600">Califica la app de 1 a 5 estrellas. Tu comentario nos ayuda a mejorarla.</p></div>
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-pressed={rating === n} aria-label={`${n} de 5: ${RATING_LABELS[n]}`} disabled={busy}
        onClick={() => { setRating(n); setMessage(null) }} className="rounded-md p-1 focus-visible:outline-2 focus-visible:outline-[#173F35]">
        <Star className={`h-8 w-8 ${n <= rating ? 'fill-[#BD481F] text-[#BD481F]' : 'text-stone-300'}`} /></button>)}
      {rating > 0 && <span className="ml-2 text-sm font-medium text-[#173F35]">{RATING_LABELS[rating]}</span>}
    </div>
    <div className="space-y-1">
      <label htmlFor="feedback-comment" className="block text-sm font-medium">¿Qué podríamos mejorar? <span className="font-normal text-stone-500">(opcional)</span></label>
      <textarea id="feedback-comment" value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} rows={4} disabled={busy}
        placeholder="Por ejemplo: que el mapa cargue más rápido, más restaurantes en mi zona…"
        className="w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-[#173F35]" />
      <p className="text-right text-xs text-stone-500">{comment.length}/1000</p>
    </div>
    {message && <p role={message.ok ? 'status' : 'alert'} className={`rounded-lg p-3 text-sm ${message.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{message.text}</p>}
    <Button onClick={save} disabled={busy}>{busy ? 'Enviando…' : sent ? 'Actualizar mi opinión' : 'Enviar opinión'}</Button>
  </section>
}
