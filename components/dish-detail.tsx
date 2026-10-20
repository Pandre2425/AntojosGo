'use client'

import type { ReactNode } from 'react'
import type { PublicDish } from '@/modules/catalog/data/public-catalog'
import { DISH_DETAIL_GROUPS, allergenNames, allergenStatus, dishDetails } from '@/shared/contracts/menu'
import { t } from '@/shared/i18n'
import { useIsMobile } from './ui/use-mobile'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet'
import { DishReviews, Stars } from './reviews'

const money = (v: number) => `Q${v.toFixed(2)}`

/** Menu row: photo, name, price, type, stars; the whole row opens the details. */
export function DishRow({ dish, onOpen }: { dish: PublicDish; onOpen: () => void }) {
  const details = dishDetails(dish)
  const summary = [...details.dish_types, ...details.cuisines].slice(0, 3).map(c => t(c)).join(' · ')
  return <button type="button" onClick={onOpen} aria-label={t('{name}, {price}. Ver detalles', { name: dish.name, price: money(dish.price) })}
    className={`flex w-full gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-[#173F35] ${dish.is_available ? '' : 'opacity-70'}`}>
    {dish.image_url ? <img src={dish.image_url} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
      : <span aria-hidden className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-2xl text-stone-400">{dish.name.trim().charAt(0).toUpperCase()}</span>}
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 font-semibold text-[#173F35]">{dish.name}</span>
        <span className="shrink-0 font-bold tabular-nums text-[#BD481F]">{money(dish.price)}</span>
      </span>
      {summary && <span className="truncate text-sm text-stone-600">{summary}</span>}
      {dish.rating?.rating_count ? <span className="flex items-center gap-1 text-xs text-stone-500"><Stars value={dish.rating.rating_avg} className="h-3.5 w-3.5" />({dish.rating.rating_count})</span> : null}
      {!dish.is_available && <span className="w-fit rounded-full border border-stone-400 px-2 text-xs text-stone-600">{t('Agotado por ahora')}</span>}
      <span className="mt-auto text-sm font-semibold text-[#173F35]">{t('Ver detalles ›')}</span>
    </span>
  </button>
}

/** Everything the restaurant entered for a dish, plus its reviews. Bottom sheet on phones, side panel on computers. */
export function DishDetail({ dish, onClose }: { dish: PublicDish | null; onClose: () => void }) {
  const mobile = useIsMobile()
  const details = dish ? dishDetails(dish) : null
  const al = dish ? allergenStatus(dish.allergens, dish.allergens_other) : null
  const names = dish ? allergenNames(dish.allergens, dish.allergens_other) : []
  return <Sheet open={Boolean(dish)} onOpenChange={open => { if (!open) onClose() }}>
    <SheetContent side={mobile ? 'bottom' : 'right'} className={`gap-0 overflow-y-auto p-0 ${mobile ? 'max-h-[88dvh] rounded-t-3xl' : 'w-full sm:max-w-md'}`}>
      {dish && details && al && <div className="space-y-5 p-5 pb-8">
        {dish.image_url && <img src={dish.image_url} alt={t('Foto de {name}', { name: dish.name })} className="aspect-[4/3] w-full rounded-2xl object-cover" />}
        <div className="space-y-1 pr-8">
          <SheetTitle className="text-2xl font-bold text-[#173F35]">{dish.name}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-extrabold tabular-nums text-[#BD481F]">{money(dish.price)}</span>
            {!dish.is_available && <span className="rounded-full border border-stone-400 px-2 text-xs text-stone-600">{t('Agotado por ahora')}</span>}
          </div>
        </div>
        <SheetDescription className={dish.description ? 'whitespace-pre-line text-base text-stone-700' : 'sr-only'}>{dish.description || dish.name}</SheetDescription>
        {DISH_DETAIL_GROUPS.map(g => details[g.key].length ? <Section key={g.key} title={t(g.title)}>{details[g.key].map(v => <Pill key={v}>{t(v)}</Pill>)}</Section> : null)}
        {dish.ingredients?.length ? <Section title={t('Ingredientes')}>{dish.ingredients.map(i => <Pill key={i} tone="muted">{i}</Pill>)}</Section> : null}
        <Section title={t('Alérgenos')}>
          {!al.declared ? <p className="text-sm text-amber-900">{t('El restaurante no indicó los alérgenos. Si tienes una alergia, confírmalo con ellos.')}</p>
            : names.length ? names.map(a => <Pill key={a} tone="danger">{t('Contiene {allergen}', { allergen: t(a).toLowerCase() })}</Pill>)
            : <p className="text-sm text-green-800">{t('Sin alérgenos comunes, según el restaurante.')}</p>}
        </Section>
        <p className="text-xs text-stone-500">{t('La información la registra el restaurante. Si tu alergia es grave, confírmala antes de pedir.')}</p>
        <DishReviews dishId={dish.id} rating={dish.rating} defaultOpen />
      </div>}
    </SheetContent>
  </Sheet>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-2"><h3 className="text-sm font-semibold text-[#173F35]">{title}</h3><div className="flex flex-wrap gap-2">{children}</div></section>
}

function Pill({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'muted' | 'danger' }) {
  const style = tone === 'danger' ? 'border-[#BD481F] text-[#9a3a18]' : tone === 'muted' ? 'border-stone-300 text-stone-700' : 'border-[#173F35] text-[#173F35]'
  return <span className={`rounded-full border px-3 py-1 text-sm font-medium ${style}`}>{children}</span>
}
