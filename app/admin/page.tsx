'use client'

import { useEffect, useState } from 'react'
import { useAccountSession } from '@/hooks/use-account-session'
import { webApi } from '@/lib/web-api'
import type { ReportedReview } from '@/modules/admin/data/moderation'
import AccountAccess from '@/components/account-access'
import FoodLoader from '@/components/food-loader'
import { Stars } from '@/components/reviews'
import { Button } from '@/components/ui/button'
import { t, locale } from '@/shared/i18n'

const when = (iso: string) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** AntojosGo administrators: decide on reviews reported by restaurants (keep or hide). */
export default function AdminPage() {
  const { user, loading } = useAccountSession()
  const [items, setItems] = useState<ReportedReview[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!user) return
    let active = true; setItems(null); setError('')
    webApi.reportedReviews().then(r => { if (active) setItems(r) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [user?.id, retry])
  if (loading) return <main className="flex min-h-dvh items-center justify-center"><FoodLoader /></main>
  if (!user) return <AccountAccess audience="customer" onBack={() => { window.location.href = '/' }} />
  async function decide(id: string, action: 'keep' | 'hide' | 'unhide') {
    setBusy(id); setError('')
    try { await webApi.moderateReview(id, action); setRetry(v => v + 1) }
    catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }
  const pending = items?.filter(r => r.reported_at && !r.hidden_at) ?? []
  const hidden = items?.filter(r => r.hidden_at) ?? []
  return <main className="mx-auto min-h-dvh max-w-3xl space-y-5 bg-background p-4 sm:p-8">
    <header className="flex items-center gap-3"><img src="/logo.png" alt="" width={48} height={48} className="rounded-xl" />
      <div><p className="text-sm font-semibold text-primary">{t('AntojosGo · Administración')}</p><h1 className="text-2xl font-bold">{t('Reseñas reportadas')}</h1></div></header>
    <p className="text-sm text-muted-foreground">{t('Los restaurantes reportan reseñas que consideran ofensivas. «Mantener» quita el reporte; «Ocultar» la saca de la lista pública y del promedio.')}</p>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {!items ? !error && <FoodLoader label={t('Cargando reseñas reportadas…')} /> : <>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Pendientes ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">{t('No hay reseñas reportadas por revisar.')}</p>
          : pending.map(r => <Item key={r.id} r={r} busy={busy === r.id}>
              <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => decide(r.id, 'keep')}>{t('Mantener')}</Button>
              <Button size="sm" disabled={busy === r.id} onClick={() => decide(r.id, 'hide')}>{t('Ocultar')}</Button></Item>)}
      </section>
      {hidden.length > 0 && <section className="space-y-3"><h2 className="text-lg font-semibold">Ocultas ({hidden.length})</h2>
        {hidden.map(r => <Item key={r.id} r={r} busy={busy === r.id}><Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => decide(r.id, 'unhide')}>{t('Mostrar de nuevo')}</Button></Item>)}
      </section>}
    </>}
  </main>
}

function Item({ r, busy, children }: { r: ReportedReview; busy: boolean; children: React.ReactNode }) {
  return <article className="space-y-2 rounded-xl border bg-white p-4" aria-busy={busy}>
    <p className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">{r.restaurant_name} · {r.dish_name}</span><Stars value={r.rating} /></p>
    {r.comment ? <p className="whitespace-pre-line text-sm">{r.comment}</p> : <p className="text-sm italic text-muted-foreground">{t('Sin comentario.')}</p>}
    {r.reply && <p className="border-l-2 border-[#173F35] pl-2 text-sm text-stone-700">{t('Respuesta:')} {r.reply}</p>}
    {r.reported_at && <p className="text-xs text-amber-900">{t('Reportada')} {when(r.reported_at)}{r.report_reason ? ` · Motivo: ${r.report_reason}` : ''}</p>}
    {r.hidden_at && <p className="text-xs text-muted-foreground">{t('Oculta desde')} {when(r.hidden_at)}</p>}
    <div className="flex flex-wrap gap-2">{children}</div>
  </article>
}
