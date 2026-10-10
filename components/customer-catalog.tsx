'use client'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Heart, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { useAccountSession } from '@/hooks/use-account-session'
import { webApi } from '@/lib/web-api'
import { ApiError } from '@/lib/api-client'
import type { PublicBranchExtras, PublicCatalogItem, PublicDish } from '@/modules/catalog/data/public-catalog'
import { describeHours, isOpenNow } from '@/shared/contracts/hours'
import { phoneUrl, whatsappUrl } from '@/shared/contracts/branches'
import { ALLERGEN_LABELS, ALLERGENS, DISH_TAGS, DISH_TAG_LABELS, allergenStatus, type Allergen, type DishTag } from '@/shared/contracts/menu'
import { Button } from './ui/button'
import { Input } from './ui/input'

type Coords = { latitude: number; longitude: number }
const distance = (km?: number) => km == null ? null : km < 1 ? `${Math.round(km * 1000)} m en línea recta` : `${km.toFixed(1)} km en línea recta`

/** Diner search and branch detail, both through /api/v1 (same data the mobile app shows). */
export default function CustomerCatalog({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [coords, setCoords] = useState<Coords | null>(null)
  const [items, setItems] = useState<PublicCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(noFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [types, setTypes] = useState<string[]>([])
  useEffect(() => { webApi.listBusinessTypes().then(setTypes).catch(() => {}) }, [])
  const request = useRef(0)
  const activeCount = (filters.category ? 1 : 0) + (filters.openNow ? 1 : 0) + filters.tags.length + filters.without.length

  async function load(text: string, location: Coords | null, f: Filters = filters) {
    const current = ++request.current
    setLoading(true); setError('')
    try {
      const base = { q: text, limit: 40, category: f.category || undefined, tags: f.tags, without: f.without, openNow: f.openNow }
      const result = await webApi.searchCatalog(location ? { ...base, lat: location.latitude, lng: location.longitude, radiusMeters: 50000 } : base)
      if (current === request.current) setItems(result.items)
    } catch (e) {
      if (current === request.current) { setItems([]); setError(e instanceof Error ? e.message : 'No pudimos cargar los restaurantes.') }
    } finally { if (current === request.current) setLoading(false) }
  }
  useEffect(() => { void load(initialQuery, null) }, [initialQuery])

  function submit(event: FormEvent) { event.preventDefault(); void load(query.trim(), coords) }
  function applyFilters(next: Filters) { setFilters(next); void load(query.trim(), coords, next) }
  const toggle = <T,>(list: T[], v: T) => list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
  function locate() {
    if (!navigator.geolocation) { setNote('Tu navegador no permite obtener la ubicación. Busca por nombre o municipio.'); return }
    setNote('Buscando tu ubicación…')
    navigator.geolocation.getCurrentPosition(
      (p) => { const c = { latitude: p.coords.latitude, longitude: p.coords.longitude }; setCoords(c); setNote('Resultados ordenados por cercanía.'); void load(query.trim(), c) },
      () => setNote('No pudimos obtener tu ubicación. Puedes buscar por nombre o municipio.'),
      { timeout: 15000, maximumAge: 120000 },
    )
  }

  if (selected) return <BranchDetail id={selected} onBack={() => setSelected(null)} />
  return <div className="space-y-4">
    <form onSubmit={submit} className="flex gap-2" role="search">
      <Input aria-label="Qué se te antoja" placeholder="Ej. pepián, café, Quetzaltenango…" value={query} maxLength={200} onChange={(e) => setQuery(e.target.value)} />
      <Button type="submit" disabled={loading}><Search className="h-4 w-4" /><span className="sr-only sm:not-sr-only sm:ml-1">Buscar</span></Button>
    </form>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={locate} disabled={loading}><MapPin className="mr-1 h-4 w-4" />Usar mi ubicación</Button>
      <Button variant={activeCount ? 'default' : 'outline'} aria-expanded={showFilters} aria-controls="diner-filters" onClick={() => setShowFilters((v) => !v)}>
        <SlidersHorizontal className="mr-1 h-4 w-4" />Filtros{activeCount ? ` (${activeCount})` : ''}</Button>
    </div>
    {showFilters && <div id="diner-filters" className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip on={filters.openNow} onClick={() => applyFilters({ ...filters, openNow: !filters.openNow })}>Abierto ahora</FilterChip>
        <label className="flex items-center gap-2 text-sm">Tipo de negocio
          <select className="h-9 rounded-md border bg-white px-2 text-sm" value={filters.category} onChange={(e) => applyFilters({ ...filters, category: e.target.value })}>
            <option value="">Todos</option>{types.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
      </div>
      <fieldset className="flex flex-wrap items-center gap-2"><legend className="sr-only">Etiquetas</legend><span className="text-sm text-stone-600">Quiero</span>
        {DISH_TAGS.map((t) => <FilterChip key={t} on={filters.tags.includes(t)} onClick={() => applyFilters({ ...filters, tags: toggle(filters.tags, t) })}>{DISH_TAG_LABELS[t]}</FilterChip>)}</fieldset>
      <fieldset className="flex flex-wrap items-center gap-2"><legend className="sr-only">Alérgenos a evitar</legend><span className="text-sm text-stone-600">Sin</span>
        {ALLERGENS.map((a) => <FilterChip key={a} tone="red" on={filters.without.includes(a)} onClick={() => applyFilters({ ...filters, without: toggle(filters.without, a) })}>{ALLERGEN_LABELS[a]}</FilterChip>)}</fieldset>
      {filters.without.length > 0 && <p className="text-xs text-stone-600">Ocultamos los platillos que el restaurante marcó con esos alérgenos. Si un platillo no tiene alérgenos declarados te lo indicamos; si tu alergia es grave, confírmala con el restaurante.</p>}
      {activeCount > 0 && <button type="button" className="text-sm underline" onClick={() => applyFilters(noFilters)}>Quitar filtros</button>}
    </div>}
    {note && <p role="status" className="text-sm text-muted-foreground">{note}</p>}
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm"><p>{error}</p><Button variant="ghost" onClick={() => load(query.trim(), coords)}>Reintentar</Button></div>}
    {loading ? <p role="status">Buscando…</p> : !error && !items.length ? <p className="text-sm text-muted-foreground">No hay restaurantes publicados que coincidan. Prueba otro platillo, nombre o municipio.</p> :
      <BranchList items={items} onSelect={setSelected} restricted={filters.without.length > 0} />}
  </div>
}

type Filters = { category: string; openNow: boolean; tags: DishTag[]; without: Allergen[] }
const noFilters: Filters = { category: '', openNow: false, tags: [], without: [] }

function FilterChip({ on, onClick, children, tone = 'green' }: { on: boolean; onClick: () => void; children: ReactNode; tone?: 'green' | 'red' }) {
  const active = tone === 'red' ? 'border-[#BD481F] bg-[#BD481F] text-white' : 'border-[#173F35] bg-[#173F35] text-white'
  return <button type="button" aria-pressed={on} onClick={onClick}
    className={`rounded-full border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F35] ${on ? active : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}>{children}</button>
}

function Logo({ url, name, size = 'h-14 w-14' }: { url?: string | null; name: string; size?: string }) {
  return url ? <img src={url} alt="" className={`${size} shrink-0 rounded-full border object-cover`} />
    : <span aria-hidden className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#173F35] text-lg font-semibold text-white`}>{name.trim().charAt(0).toUpperCase()}</span>
}

function BranchList({ items, onSelect, restricted = false }: { items: PublicCatalogItem[]; onSelect: (id: string) => void; restricted?: boolean }) {
  return <ul className="space-y-3">{items.map((item) => <li key={item.id}>
    <button type="button" onClick={() => onSelect(item.id)} className="flex w-full gap-3 rounded-2xl border bg-white p-4 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
      <Logo url={item.logo_url} name={item.name} />
      <div className="min-w-0 flex-1">
      <p className="font-semibold">{item.name}{item.category && <span className="font-normal text-muted-foreground"> · {item.category}</span>}</p>
      <p className="text-sm">{item.branch_name} · {item.address}, {item.municipality}</p>
      {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
      {item.dish && <p className="mt-1 text-sm"><span className="font-medium">{item.dish.name}</span> <span className="tabular-nums">Q{item.dish.price.toFixed(2)}</span>
        {restricted && !item.dish.allergensDeclared && <span className="ml-2 rounded-full border border-dashed border-amber-500 px-2 py-0.5 text-xs text-amber-900">Alérgenos sin declarar</span>}</p>}
      <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
        {item.openNow === true && <span className="font-semibold text-green-700">Abierto ahora</span>}{item.openNow === false && <span>Cerrado ahora</span>}
        {distance(item.distanceKm) && <span>{distance(item.distanceKm)}</span>}</p>
      </div>
    </button>
  </li>)}</ul>
}

/** Signed-in diner's saved branches (only those still published). */
export function FavoriteBranches({ onLogin }: { onLogin: () => void }) {
  const { user, loading: sessionLoading } = useAccountSession()
  const [items, setItems] = useState<PublicCatalogItem[] | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!user || selected) return
    let active = true
    setItems(null); setError('')
    webApi.listFavorites().then((rows) => { if (active) setItems(rows) }).catch((e) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [user?.id, selected, retry])
  if (sessionLoading) return <p role="status">Cargando…</p>
  if (!user) return <div className="space-y-3"><p className="text-sm text-muted-foreground">Inicia sesión para guardar tus restaurantes favoritos y verlos también en la app.</p><Button onClick={onLogin}>Iniciar sesión o crear cuenta</Button></div>
  if (selected) return <BranchDetail id={selected} onBack={() => setSelected(null)} />
  if (error) return <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRetry((v) => v + 1)}>Reintentar</Button></div>
  if (!items) return <p role="status">Cargando favoritos…</p>
  return items.length ? <BranchList items={items} onSelect={setSelected} /> : <p className="text-sm text-muted-foreground">Aún no tienes favoritos. Abre una sede y toca «Guardar en favoritos».</p>
}

function FavoriteButton({ branchId }: { branchId: string }) {
  const { user } = useAccountSession()
  const [saved, setSaved] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!user) return
    let active = true
    webApi.listFavorites().then((rows) => { if (active) setSaved(rows.some((r) => r.id === branchId)) }).catch(() => { if (active) setSaved(false) })
    return () => { active = false }
  }, [user?.id, branchId])
  if (!user || saved === null) return null
  async function toggle() {
    setBusy(true); setError('')
    try { await (saved ? webApi.removeFavorite(branchId) : webApi.addFavorite(branchId)); setSaved(!saved) }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar el favorito.') }
    finally { setBusy(false) }
  }
  return <div><Button variant="outline" aria-pressed={saved} disabled={busy} onClick={toggle}><Heart className={`mr-1 h-4 w-4 ${saved ? 'fill-primary text-primary' : ''}`} />{saved ? 'En favoritos' : 'Guardar en favoritos'}</Button>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div>
}

export function BranchDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<{ branch: PublicCatalogItem & PublicBranchExtras; menu: PublicDish[] } | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setData(null); setError('')
    webApi.getPublicBranch(id).then((r) => { if (active) setData(r) })
      .catch((e) => { if (active) setError(e instanceof ApiError && e.status === 404 ? 'Esta sede ya no está publicada.' : e instanceof Error ? e.message : 'No pudimos cargar la sede.') })
    return () => { active = false }
  }, [id, retry])
  const b = data?.branch
  return <div className="space-y-4">
    <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" />Volver a resultados</Button>
    {error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRetry((v) => v + 1)}>Reintentar</Button></div> : !b ? <p role="status">Cargando sede…</p> : <>
      <section className="overflow-hidden rounded-2xl border bg-white">
        {b.cover_url && <img src={b.cover_url} alt={`Foto de ${b.name}`} className="h-48 w-full object-cover sm:h-64" />}
        <div className="space-y-2 p-5">
        <div className="flex items-center gap-3"><Logo url={b.logo_url} name={b.name} size="h-16 w-16" /><h2 className="text-2xl font-bold">{b.name}</h2></div>
        <FavoriteButton branchId={b.id} />
        <p className="font-medium">{b.branch_name}{b.category ? ` · ${b.category}` : ''}</p>
        <p className="text-sm">{b.address}, {b.municipality}, {b.department}</p>
        <p className="text-sm text-muted-foreground">{b.description || 'Sin descripción.'}</p>
        <Hours hours={b.opening_hours ?? []} />
        {b.phone && <div className="flex flex-wrap gap-2"><a className="rounded-md border px-3 py-1.5 text-sm" href={phoneUrl(b.phone)}>Llamar · {b.phone}</a>{b.whatsapp && <a className="rounded-md border px-3 py-1.5 text-sm" target="_blank" rel="noreferrer" href={whatsappUrl(b.phone)}>WhatsApp</a>}</div>}
        {b.latitude != null && b.longitude != null && <a className="inline-block text-sm underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${b.latitude}&mlon=${b.longitude}#map=18/${b.latitude}/${b.longitude}`}>Ver en el mapa</a>}
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-5 space-y-3">
        <h3 className="text-lg font-semibold">Menú</h3>
        {data.menu.length === 0 ? <p className="text-sm text-muted-foreground">Este restaurante aún no ha publicado su menú.</p> :
          <ul className="divide-y">{data.menu.map((dish) => <li key={dish.id} className="flex gap-3 py-3">
            {dish.image_url && <img src={dish.image_url} alt={`Foto de ${dish.name}`} loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
            <div className="min-w-0">
              <p className="font-medium">{dish.name} <span className="whitespace-nowrap">· Q{dish.price.toFixed(2)}</span></p>
              {dish.category && <p className="text-xs text-muted-foreground">{dish.category}</p>}
              {dish.description && <p className="text-sm text-muted-foreground">{dish.description}</p>}
              {dish.ingredients?.length ? <p className="text-sm text-muted-foreground">Ingredientes: {dish.ingredients.join(', ')}</p> : null}
              <DishAllergens allergens={dish.allergens} />
              {!dish.is_available && <p className="text-xs font-semibold text-red-700">Agotado por ahora</p>}
            </div>
          </li>)}</ul>}
      </section>
    </>}
  </div>
}

function Hours({ hours }: { hours: NonNullable<PublicBranchExtras['opening_hours']> }) {
  const open = isOpenNow(hours)
  if (open === null) return <p className="text-sm text-muted-foreground">Horario sin información.</p>
  return <details className="text-sm"><summary className="cursor-pointer"><span className={open ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>{open ? 'Abierto ahora' : 'Cerrado ahora'}</span> · ver horario</summary>
    <ul className="mt-1">{describeHours(hours).map((line) => <li key={line}>{line}</li>)}</ul></details>
}

function DishAllergens({ allergens }: { allergens?: readonly string[] }) {
  const { declared, contains } = allergenStatus(allergens)
  if (!declared) return <p className="text-xs text-amber-900">Alérgenos no declarados por el restaurante</p>
  if (!contains.length) return <p className="text-xs text-green-800">Sin alérgenos comunes, según el restaurante</p>
  return <p className="flex flex-wrap gap-1">{contains.map((a) => <span key={a} className="rounded-full border border-[#BD481F] px-2 py-0.5 text-xs text-[#9a3a18]">Contiene {ALLERGEN_LABELS[a].toLowerCase()}</span>)}</p>
}
