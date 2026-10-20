'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { webApi } from '@/lib/web-api'
import { findabilityChecklist, findabilityScore, type FindabilityArea, type FindabilityItem } from '@/shared/contracts/findability'
import { t } from '@/shared/i18n'
import { Button } from './ui/button'

/** «Para que te encuentren»: what this restaurant still lacks to appear in searches, with a shortcut to fix each item. */
export default function FindabilityCard({ restaurantId, onOpen }: { restaurantId: string; onOpen: (area: FindabilityArea) => void }) {
  const [items, setItems] = useState<FindabilityItem[] | null>(null)
  useEffect(() => {
    let active = true
    Promise.all([webApi.getRestaurant(restaurantId), webApi.listBranches(restaurantId), webApi.listDishes(restaurantId)])
      .then(([profile, branches, dishes]) => { if (active) setItems(findabilityChecklist(profile, branches.items, dishes)) })
      .catch(() => { if (active) setItems(null) })
    return () => { active = false }
  }, [restaurantId])
  if (!items) return <p className="mt-3 text-xs text-muted-foreground">{t('Revisando…')}</p>
  const score = findabilityScore(items)
  const pending = items.filter(i => !i.done).sort((a, b) => Number(b.required) - Number(a.required))
  const hidden = items.some(i => i.required && !i.done)
  return <section className="mt-3 space-y-2 rounded-xl bg-stone-50 p-3" aria-label={t('Para que te encuentren')}>
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-semibold text-[#173F35]">{t('Para que te encuentren')}</p>
      <span className="text-xs tabular-nums text-stone-600">{t('{n}% completo', { n: score })}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${hidden ? 'bg-[#BD481F]' : 'bg-[#173F35]'}`} style={{ width: `${score}%` }} />
    </div>
    {!pending.length ? <p className="flex items-center gap-1 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" />{t('¡Todo listo! Tu restaurante aparece completo en las búsquedas.')}</p>
      : <>
        {hidden && <p className="text-sm text-[#9a3a18]">{t('Todavía no apareces en las búsquedas. Completa lo marcado como imprescindible.')}</p>}
        <ul className="space-y-1">{pending.map(i => <li key={i.key} className="flex items-center gap-2 text-sm">
          <Circle className={`h-4 w-4 shrink-0 ${i.required ? 'text-[#BD481F]' : 'text-stone-400'}`} />
          <span className="flex-1">{t(i.label)}{i.detail && i.detail.total > 0 ? <span className="tabular-nums text-stone-500"> ({i.detail.done}/{i.detail.total})</span> : null}
            {i.required && <span className="ml-1 rounded-full bg-[#BD481F]/10 px-1.5 text-xs text-[#9a3a18]">{t('Imprescindible')}</span>}</span>
          <Button size="sm" variant="ghost" onClick={() => onOpen(i.area)}>{t('Ir')}</Button>
        </li>)}</ul>
      </>}
  </section>
}
