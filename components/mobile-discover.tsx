'use client'
import { useEffect, useState, type FormEvent } from 'react'
import dynamic from 'next/dynamic'
import { Sparkles } from 'lucide-react'
import { webApi } from '@/lib/web-api'
import { HOME_OPTIONS, type HomeOption } from '@/shared/contracts/home'
import type { MapBranch } from './branches-overview-map'
import { Button } from './ui/button'
import { AppDownloadBanner } from './app-download'

const BranchDetail = dynamic(() => import('./customer-catalog').then(m => m.BranchDetail))
const BranchesOverviewMap = dynamic(() => import('./branches-overview-map'), { ssr: false, loading: () => <div className="h-80 animate-pulse rounded-2xl bg-stone-200" /> })

/** Home: ask the assistant, pick a popular craving, or browse the map of registered branches. */
export default function MobileDiscover({ name, onSearch }: { name?: string; onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<HomeOption[]>(HOME_OPTIONS.slice(0, 8))
  const [branches, setBranches] = useState<MapBranch[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  useEffect(() => {
    webApi.popularOptions().then(setOptions).catch(() => {}) // default order already shown
    webApi.searchCatalog({ q: '', limit: 50 }).then(r => setBranches(r.items)).catch(() => setBranches([]))
  }, [])
  function submit(event: FormEvent) { event.preventDefault(); if (query.trim()) onSearch(query.trim()) }
  if (selected) return <BranchDetail id={selected} onBack={() => setSelected(null)} />

  return <div className="space-y-8">
    <section className="rounded-[28px] bg-[#173F35] p-6 text-white">
      {name && <p className="text-sm text-white/80">Hola, {name}</p>}
      <h1 className="text-3xl font-extrabold tracking-tight">¿Qué estás buscando?</h1>
      <p className="mt-2 text-sm text-white/85">Escríbelo como se lo dirías a un amigo. El asistente te dice dónde encontrarlo.</p>
      <form onSubmit={submit} className="mt-5 flex gap-2">
        <label htmlFor="craving" className="sr-only">¿Qué estás buscando?</label>
        <input id="craving" className="min-h-12 min-w-0 flex-1 rounded-2xl bg-white px-4 text-[#263D35] outline-none focus-visible:ring-2 focus-visible:ring-[#EFAE6E]"
          placeholder="Algo calientito, una pizza cerca…" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={200} />
        <button type="submit" disabled={!query.trim()} className="flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-4 font-semibold disabled:opacity-60">
          <Sparkles className="h-5 w-5" /><span className="hidden sm:inline">Preguntar</span><span className="sr-only sm:hidden">Preguntar</span></button>
      </form>
    </section>

    <AppDownloadBanner />

    <section aria-labelledby="popular-title" className="space-y-3">
      <h2 id="popular-title" className="text-lg font-semibold">Lo más buscado</h2>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {options.map(o => <li key={o.concept}>
          <button type="button" onClick={() => onSearch(o.query)}
            className="flex w-full flex-col items-center gap-1 rounded-2xl border bg-white px-1 py-3 text-center transition-colors hover:border-[#173F35] focus-visible:outline-2 focus-visible:outline-[#173F35] active:bg-stone-100">
            <span aria-hidden className="text-3xl leading-none">{o.symbol}</span>
            <span className="w-full hyphens-auto px-0.5 text-[11px] font-medium leading-tight sm:text-xs">{o.title}</span>
          </button>
        </li>)}
      </ul>
    </section>

    <section aria-labelledby="map-title" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="map-title" className="text-lg font-semibold">Restaurantes en el mapa</h2>
        {branches && <p className="text-sm text-muted-foreground">{branches.length === 1 ? '1 sede' : `${branches.length} sedes`}</p>}
      </div>
      {branches === null ? <div className="h-80 animate-pulse rounded-2xl bg-stone-200" /> : branches.length
        ? <BranchesOverviewMap branches={branches} onOpen={setSelected} />
        : <p className="text-sm text-muted-foreground">Aún no hay sedes publicadas.</p>}
      <Button variant="outline" className="w-full" onClick={() => onSearch('')}>Ver la lista con filtros</Button>
    </section>
  </div>
}
