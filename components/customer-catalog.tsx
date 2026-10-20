'use client'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Dices, EyeOff, Heart, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { useAccountSession } from '@/hooks/use-account-session'
import { webApi } from '@/lib/web-api'
import { ApiError } from '@/lib/api-client'
import type { PublicBranchExtras, PublicCatalogItem, PublicDish } from '@/modules/catalog/data/public-catalog'
import { describeHours, isOpenNow } from '@/shared/contracts/hours'
import { directionsUrl, phoneUrl, whatsappUrl } from '@/shared/contracts/branches'
import { ALLERGEN_LABELS, ALLERGENS, DISH_TAGS, DISH_TAG_LABELS, allergenNames, allergenStatus, type Allergen, type DishTag } from '@/shared/contracts/menu'
import { Button } from './ui/button'
import { Input } from './ui/input'
import FoodLoader from './food-loader'
import { RatingSummary } from './reviews'
import { DishDetail, DishRow } from './dish-detail'
import VoiceButton from './voice-button'
import { PRICE_RANGES, pickSurprise } from '@/shared/contracts/catalog-query'
import { t, contentNote } from '@/shared/i18n'

type Coords = { latitude: number; longitude: number }
const distance = (km?: number) => km == null ? null : km < 1 ? t('{m} m en línea recta', { m: Math.round(km * 1000) }) : t('{km} km en línea recta', { km: km.toFixed(1) })

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
  const { user } = useAccountSession()
  const [hidden, setHidden] = useState<string[]>([])
  const [surprise, setSurprise] = useState<PublicCatalogItem | null>(null)
  // «No me interesa»: the signed-in diner's hidden restaurants never appear in results.
  useEffect(() => {
    if (!user) { setHidden([]); return }
    let active = true
    webApi.listHidden().then(rows => { if (active) { const ids = rows.map(r => r.restaurant_id); setHidden(ids); void load(query.trim(), coords, filters, ids) } }).catch(() => {})
    return () => { active = false }
  }, [user?.id])
  const request = useRef(0)
  const activeCount = (filters.category ? 1 : 0) + (filters.openNow ? 1 : 0) + (filters.price !== null ? 1 : 0) + filters.tags.length + filters.without.length

  async function load(text: string, location: Coords | null, f: Filters = filters, hide: string[] = hidden) {
    const current = ++request.current
    setLoading(true); setError('')
    try {
      const range = f.price === null ? null : PRICE_RANGES[f.price] as { min?: number; max?: number }
      const base = { q: text, limit: 40, category: f.category || undefined, tags: f.tags, without: f.without, openNow: f.openNow, minPrice: range?.min, maxPrice: range?.max, hide }
      const result = await webApi.searchCatalog(location ? { ...base, lat: location.latitude, lng: location.longitude, radiusMeters: 50000 } : base)
      if (current === request.current) setItems(result.items)
    } catch (e) {
      if (current === request.current) { setItems([]); setError(e instanceof Error ? e.message : t('No pudimos cargar los restaurantes.')) }
    } finally { if (current === request.current) setLoading(false) }
  }
  useEffect(() => { void load(initialQuery, null) }, [initialQuery])

  function submit(event: FormEvent) { event.preventDefault(); void load(query.trim(), coords) }
  function applyFilters(next: Filters) { setFilters(next); void load(query.trim(), coords, next) }
  const toggle = <T,>(list: T[], v: T) => list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
  function locate() {
    if (!navigator.geolocation) { setNote(t('Tu navegador no permite obtener la ubicación. Busca por nombre o municipio.')); return }
    setNote(t('Buscando tu ubicación…'))
    navigator.geolocation.getCurrentPosition(
      (p) => { const c = { latitude: p.coords.latitude, longitude: p.coords.longitude }; setCoords(c); setNote(t('Resultados ordenados por cercanía.')); void load(query.trim(), c) },
      () => setNote(t('No pudimos obtener tu ubicación. Puedes buscar por nombre o municipio.')),
      { timeout: 15000, maximumAge: 120000 },
    )
  }

  function surpriseMe() {
    const pick = pickSurprise(items, surprise?.id)
    if (!pick) { setNote(t('No hay opciones con esta búsqueda y estos filtros. Quita algún filtro y vuelve a intentar.')); return }
    setSurprise(pick); setSelected(pick.id)
  }
  function hideRestaurant(restaurantId: string) {
    const next = [...hidden, restaurantId]
    setHidden(next); setSelected(null); setSurprise(null)
    setNote(t('Listo: no volverá a aparecer en tus búsquedas. Puedes mostrarlo de nuevo en «Mi cuenta».'))
    void load(query.trim(), coords, filters, next)
  }

  if (selected) return <BranchDetail id={selected} onBack={() => { setSelected(null); setSurprise(null) }} onHide={user ? hideRestaurant : undefined}
    surprise={surprise?.id === selected ? surprise : null} onSurpriseAgain={surprise ? surpriseMe : undefined} />
  return <div className="space-y-4">
    <form onSubmit={submit} className="flex gap-2" role="search">
      <Input aria-label={t('Qué se te antoja')} placeholder={t('Ej. pepián, café, Quetzaltenango…')} value={query} maxLength={200} onChange={(e) => setQuery(e.target.value)} />
      <VoiceButton onText={(text) => { setQuery(text); setNote(''); void load(text, coords) }} onError={setNote} />
      <Button type="submit" disabled={loading}><Search className="h-4 w-4" /><span className="sr-only sm:not-sr-only sm:ml-1">{t('Buscar')}</span></Button>
    </form>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={locate} disabled={loading}><MapPin className="mr-1 h-4 w-4" />{t('Usar mi ubicación')}</Button>
      <Button variant={activeCount ? 'default' : 'outline'} aria-expanded={showFilters} aria-controls="diner-filters" onClick={() => setShowFilters((v) => !v)}>
        <SlidersHorizontal className="mr-1 h-4 w-4" />{t('Filtros')}{activeCount ? ` (${activeCount})` : ''}</Button>
      <Button variant="outline" onClick={surpriseMe} disabled={loading} className="border-[#BD481F] text-[#9a3a18]"><Dices className="mr-1 h-4 w-4" />{t('Sorpréndeme')}</Button>
    </div>
    {showFilters && <div id="diner-filters" className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip on={filters.openNow} onClick={() => applyFilters({ ...filters, openNow: !filters.openNow })}>{t('Abierto ahora')}</FilterChip>
        <label className="flex items-center gap-2 text-sm">{t('Tipo de negocio')}
          <select className="h-9 rounded-md border bg-white px-2 text-sm" value={filters.category} onChange={(e) => applyFilters({ ...filters, category: e.target.value })}>
            <option value="">{t('Todos')}</option>{types.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
      </div>
      <fieldset className="flex flex-wrap items-center gap-2"><legend className="sr-only">{t('Precio')}</legend><span className="text-sm text-stone-600">{t('Precio')}</span>
        {PRICE_RANGES.map((r, i) => <FilterChip key={r.label} on={filters.price === i} onClick={() => applyFilters({ ...filters, price: filters.price === i ? null : i })}>{t(r.label)}</FilterChip>)}</fieldset>
      <fieldset className="flex flex-wrap items-center gap-2"><legend className="sr-only">{t('Etiquetas')}</legend><span className="text-sm text-stone-600">{t('Quiero')}</span>
        {DISH_TAGS.map((tag) => <FilterChip key={tag} on={filters.tags.includes(tag)} onClick={() => applyFilters({ ...filters, tags: toggle(filters.tags, tag) })}>{t(DISH_TAG_LABELS[tag])}</FilterChip>)}</fieldset>
      <fieldset className="flex flex-wrap items-center gap-2"><legend className="sr-only">{t('Alérgenos a evitar')}</legend><span className="text-sm text-stone-600">{t('Sin')}</span>
        {ALLERGENS.map((a) => <FilterChip key={a} tone="red" on={filters.without.includes(a)} onClick={() => applyFilters({ ...filters, without: toggle(filters.without, a) })}>{t(ALLERGEN_LABELS[a])}</FilterChip>)}</fieldset>
      {filters.without.length > 0 && <p className="text-xs text-stone-600">{t('Ocultamos los platillos que el restaurante marcó con esos alérgenos. Si un platillo no tiene alérgenos declarados te lo indicamos; si tu alergia es grave, confírmala con el restaurante.')}</p>}
      {activeCount > 0 && <button type="button" className="text-sm underline" onClick={() => applyFilters(noFilters)}>{t('Quitar filtros')}</button>}
    </div>}
    {note && <p role="status" className="text-sm text-muted-foreground">{note}</p>}
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm"><p>{error}</p><Button variant="ghost" onClick={() => load(query.trim(), coords)}>{t('Reintentar')}</Button></div>}
    {loading ? <p role="status">{t('Buscando…')}</p> : !error && !items.length ? <p className="text-sm text-muted-foreground">{t('No hay restaurantes publicados que coincidan. Prueba otro platillo, nombre o municipio.')}</p> :
      <BranchList items={items} onSelect={setSelected} restricted={filters.without.length > 0} />}
  </div>
}

type Filters = { category: string; openNow: boolean; tags: DishTag[]; without: Allergen[]; price: number | null }
const noFilters: Filters = { category: '', openNow: false, tags: [], without: [], price: null }

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
    <article className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm transition-colors hover:border-[#173F35]/40">
      <button type="button" onClick={() => onSelect(item.id)} className="flex w-full gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#173F35]">
        <Logo url={item.logo_url} name={item.name} />
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="block text-lg font-bold leading-tight text-[#173F35]">{item.name}</span>
          {item.category && <span className="block text-sm text-stone-600">{item.category}</span>}
          <RatingSummary rating={item.rating} />
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {item.openNow === true && <span className="rounded-full bg-[#173F35] px-2.5 py-1 font-semibold text-white">{t('Abierto ahora')}</span>}
        {item.openNow === false && <span className="rounded-full border border-stone-300 px-2.5 py-1 text-stone-600">{t('Cerrado ahora')}</span>}
        {distance(item.distanceKm) && <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">{distance(item.distanceKm)}</span>}
      </div>
      <p className="text-sm text-stone-700">{item.branch_name} · {item.address}, {item.municipality}</p>
      {item.description && <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
      {item.dish && <p className="flex flex-wrap items-center gap-2 rounded-xl bg-[#BD481F]/5 px-3 py-2 text-sm">
        <span aria-hidden>🍽️</span><span className="font-medium">{item.dish.name}</span><span className="font-semibold tabular-nums text-[#BD481F]">Q{item.dish.price.toFixed(2)}</span>
        {restricted && !item.dish.allergensDeclared && <span className="rounded-full border border-dashed border-amber-500 px-2 py-0.5 text-xs text-amber-900">{t('Alérgenos sin declarar')}</span>}</p>}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onSelect(item.id)}>{t('Ver sede')}</Button>
        {item.latitude != null && item.longitude != null && <a href={directionsUrl(item.latitude, item.longitude)} target="_blank" rel="noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#BD481F] px-3 text-sm font-semibold text-white hover:bg-[#9a3a18]"><MapPin className="h-4 w-4" />{t('Cómo llegar')}</a>}
      </div>
    </article>
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
  if (sessionLoading) return <FoodLoader label={t('Cargando…')} />
  if (!user) return <div className="space-y-3"><p className="text-sm text-muted-foreground">{t('Inicia sesión para guardar tus restaurantes favoritos y verlos también en la app.')}</p><Button onClick={onLogin}>{t('Iniciar sesión o crear cuenta')}</Button></div>
  if (selected) return <BranchDetail id={selected} onBack={() => setSelected(null)} />
  if (error) return <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRetry((v) => v + 1)}>{t('Reintentar')}</Button></div>
  if (!items) return <FoodLoader label={t('Cargando favoritos…')} />
  return items.length ? <BranchList items={items} onSelect={setSelected} /> : <p className="text-sm text-muted-foreground">{t('Aún no tienes favoritos. Abre una sede y toca «Guardar en favoritos».')}</p>
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
    catch (e) { setError(e instanceof Error ? e.message : t('No pudimos guardar el favorito.')) }
    finally { setBusy(false) }
  }
  return <div><Button variant="outline" aria-pressed={saved} disabled={busy} onClick={toggle}><Heart className={`mr-1 h-4 w-4 ${saved ? 'fill-primary text-primary' : ''}`} />{saved ? t('En favoritos') : t('Guardar en favoritos')}</Button>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div>
}

export function BranchDetail({ id, onBack, onHide, surprise, onSurpriseAgain }: {
  id: string; onBack: () => void; onHide?: (restaurantId: string) => void; surprise?: PublicCatalogItem | null; onSurpriseAgain?: () => void
}) {
  const [hiding, setHiding] = useState(false)
  const [dish, setDish] = useState<PublicDish | null>(null)
  const [hideError, setHideError] = useState('')
  const [data, setData] = useState<{ branch: PublicCatalogItem & PublicBranchExtras; menu: PublicDish[]; translated?: boolean } | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setData(null); setError('')
    webApi.getPublicBranch(id).then((r) => { if (active) setData(r) })
      .catch((e) => { if (active) setError(e instanceof ApiError && e.status === 404 ? t('Esta sede ya no está publicada.') : e instanceof Error ? e.message : t('No pudimos cargar la sede.')) })
    return () => { active = false }
  }, [id, retry])
  const b = data?.branch
  return <div className="space-y-4">
    <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" />{t('Volver a resultados')}</Button>
    {surprise && <div role="status" className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#BD481F]/40 bg-[#BD481F]/5 p-3 text-sm">
      <Dices className="h-5 w-5 text-[#BD481F]" /><span className="flex-1"><b>{t('¡Sorpresa!')}</b> {t('Te proponemos')} {surprise.name}{surprise.dish ? `: ${surprise.dish.name} (Q${surprise.dish.price.toFixed(2)})` : ''}.</span>
      {onSurpriseAgain && <Button size="sm" variant="outline" onClick={onSurpriseAgain}>{t('Otra opción')}</Button>}</div>}
    {error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRetry((v) => v + 1)}>{t('Reintentar')}</Button></div> : !b ? <FoodLoader label={t('Cargando sede…')} /> : <>
      <section className="overflow-hidden rounded-2xl border bg-white">
        {b.cover_url && <img src={b.cover_url} alt={t('Foto de {name}', { name: b.name })} className="h-48 w-full object-cover sm:h-64" />}
        <div className="space-y-2 p-5">
        <div className="flex items-center gap-3"><Logo url={b.logo_url} name={b.name} size="h-16 w-16" /><div><h2 className="text-2xl font-bold">{b.name}</h2><RatingSummary rating={b.rating} /></div></div>
        <div className="flex flex-wrap gap-2"><FavoriteButton branchId={b.id} />
          {onHide && b.restaurant_id && <Button variant="ghost" disabled={hiding} onClick={async () => {
            setHiding(true); setHideError('')
            try { await webApi.hideRestaurant(b.restaurant_id!); onHide(b.restaurant_id!) } catch (e) { setHideError(e instanceof Error ? e.message : t('No pudimos ocultarlo.')) } finally { setHiding(false) }
          }}><EyeOff className="mr-1 h-4 w-4" />{t('No me interesa')}</Button>}</div>
        {hideError && <p role="alert" className="text-sm text-red-700">{hideError}</p>}
        <p className="font-medium">{b.branch_name}{b.category ? ` · ${b.category}` : ''}</p>
        <p className="text-sm">{b.address}, {b.municipality}, {b.department}</p>
        <p className="text-sm text-muted-foreground">{b.description || t('Sin descripción.')}</p>
        <Hours hours={b.opening_hours ?? []} />
        {b.phone && <div className="flex flex-wrap gap-2"><a className="rounded-md border px-3 py-1.5 text-sm" href={phoneUrl(b.phone)}>{t('Llamar ·')} {b.phone}</a>{b.whatsapp && <a className="rounded-md border px-3 py-1.5 text-sm" target="_blank" rel="noreferrer" href={whatsappUrl(b.phone)}>{t('WhatsApp')}</a>}</div>}
        {b.latitude != null && b.longitude != null && <a className="inline-flex items-center gap-2 rounded-xl bg-[#BD481F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9a3a18]" target="_blank" rel="noreferrer" href={directionsUrl(b.latitude, b.longitude)}><MapPin className="h-4 w-4" />{t('Cómo llegar')}</a>}
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-5 space-y-3">
        <h3 className="text-lg font-semibold">{t('Menú')}</h3>
        {contentNote(data.translated) && <p className="text-xs text-muted-foreground">{contentNote(data.translated)}</p>}
        {data.menu.length === 0 ? <p className="text-sm text-muted-foreground">{t('Este restaurante aún no ha publicado su menú.')}</p> :
          <ul className="-mx-3 divide-y">{data.menu.map((dish) => <li key={dish.id}><DishRow dish={dish} onOpen={() => setDish(dish)} /></li>)}</ul>}
      </section>
      <DishDetail dish={dish} onClose={() => setDish(null)} />
    </>}
  </div>
}

function Hours({ hours }: { hours: NonNullable<PublicBranchExtras['opening_hours']> }) {
  const open = isOpenNow(hours)
  if (open === null) return <p className="text-sm text-muted-foreground">{t('Horario sin información.')}</p>
  return <details className="text-sm"><summary className="cursor-pointer"><span className={open ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>{open ? t('Abierto ahora') : t('Cerrado ahora')}</span> · {t('ver horario')}</summary>
    <ul className="mt-1">{describeHours(hours).map((line) => <li key={line}>{line}</li>)}</ul></details>
}

