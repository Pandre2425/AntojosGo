'use client'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ImagePlus, MoreHorizontal, Search, X } from 'lucide-react'
import { webApi } from '@/lib/web-api'
import { uploadDishImage } from '@/lib/web-image-upload'
import { normalize } from '@/shared/contracts/assistant'
import {
  ALLERGEN_LABELS, ALLERGENS, DISH_CATEGORY_GROUPS, DISH_TAGS, DISH_TAG_LABELS, MAX_CATEGORIES, NO_ALLERGENS, allergenStatus, dishCategories,
  dishInputSchema, formatPriceInput, ingredientProblem, type Allergen, type AllergenDeclaration, type Dish, type DishPatch, type DishTag,
} from '@/shared/contracts/menu'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'

const empty = { name: '', price: '', description: '', categories: [] as string[], ingredients: [] as string[], hasAllergens: false, allergens: [] as AllergenDeclaration[] }
const money = (v: number) => `Q${v.toFixed(2)}`
type Status = 'all' | 'visible' | 'hidden' | 'soldout'
const STATUS_LABELS: Record<Status, string> = { all: 'Todos', visible: 'Visibles', hidden: 'Ocultos', soldout: 'Agotados' }
const statusOf = (d: Dish): Exclude<Status, 'all'> => d.status !== 'published' ? 'hidden' : d.is_available ? 'visible' : 'soldout'
// The left edge of each row tells the owner what diners see.
const EDGE: Record<Exclude<Status, 'all'>, string> = { visible: 'border-l-[#173F35]', hidden: 'border-l-stone-300', soldout: 'border-l-[#BD481F]' }
const PILL: Record<Exclude<Status, 'all'>, string> = {
  visible: 'bg-[#173F35]/10 text-[#173F35]', hidden: 'bg-stone-100 text-stone-600', soldout: 'bg-[#BD481F]/10 text-[#9a3a18]',
}
const PILL_TEXT: Record<Exclude<Status, 'all'>, string> = { visible: 'Visible', hidden: 'Oculto', soldout: 'Agotado' }

function Chip({ on, onClick, children, tone = 'green' }: { on: boolean; onClick: () => void; children: ReactNode; tone?: 'green' | 'red' }) {
  const active = tone === 'red' ? 'border-[#BD481F] bg-[#BD481F] text-white' : 'border-[#173F35] bg-[#173F35] text-white'
  return <button type="button" aria-pressed={on} onClick={onClick}
    className={`rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F35] ${on ? active : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}>{children}</button>
}

export default function RestaurantMenu({ restaurantId, restaurantName, onClose }: { restaurantId: string; restaurantName: string; onClose: () => void }) {
  const [dishes, setDishes] = useState<Dish[] | null>(null)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('all')
  const [tagFilter, setTagFilter] = useState<DishTag[]>([])
  const [withoutFilter, setWithoutFilter] = useState<Allergen[]>([])
  const [moreFilters, setMoreFilters] = useState(false)
  const saving = useRef(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const photoFor = useRef<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [newCategory, setNewCategory] = useState('')
  const [newIngredient, setNewIngredient] = useState('')
  const [fieldHint, setFieldHint] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null)
  const photoPreview = useMemo(() => photo ? URL.createObjectURL(photo) : null, [photo])
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  const formPhoto = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    setDishes(null); setLoadError('')
    webApi.listDishes(restaurantId).then((rows) => { if (active) setDishes(rows) }).catch((err) => { if (active) setLoadError(err.message) })
    return () => { active = false }
  }, [restaurantId, retry])

  const counts = useMemo(() => {
    const c = { all: 0, visible: 0, hidden: 0, soldout: 0 }
    for (const d of dishes ?? []) { c.all++; c[statusOf(d)]++ }
    return c
  }, [dishes])
  const undeclared = (dishes ?? []).filter((d) => !allergenStatus(d.allergens).declared).length

  // Search covers name, category, description and ingredients (accent-insensitive).
  const visibleRows = useMemo(() => {
    const q = normalize(query)
    return (dishes ?? []).filter((d) => {
      if (status !== 'all' && statusOf(d) !== status) return false
      if (tagFilter.some((t) => !d.tags?.includes(t))) return false
      if (withoutFilter.length && allergenStatus(d.allergens).contains.some((a) => withoutFilter.includes(a))) return false
      if (q && !normalize([d.name, d.category, ...(d.categories ?? []), d.description, ...(d.ingredients ?? [])].filter(Boolean).join(' ')).includes(q)) return false
      return true
    })
  }, [dishes, query, status, tagFilter, withoutFilter])
  const filtering = Boolean(query || status !== 'all' || tagFilter.length || withoutFilter.length)

  async function run(action: () => Promise<unknown>, done: string) {
    if (saving.current) return false
    saving.current = true; setBusy(true); setError(''); setNotice('')
    try { await action(); setNotice(done); setRetry((v) => v + 1); return true }
    catch (err) { setError(err instanceof Error ? err.message : 'No pudimos guardar.'); return false }
    finally { saving.current = false; setBusy(false) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    const parsed = dishInputSchema.safeParse({ name: form.name, price: form.price, description: form.description,
      categories: form.categories, ingredients: form.ingredients, allergens: form.hasAllergens ? form.allergens.filter((a) => a !== NO_ALLERGENS) : form.allergens })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    if (form.hasAllergens && !parsed.data.allergens?.length) { setError('Marca qué alérgenos contiene, o apaga «Contiene alérgenos».'); return }
    const ok = await run(async () => {
      const saved = editing ? await webApi.updateDish(editing, parsed.data) : await webApi.createDish(restaurantId, parsed.data)
      if (photo) await uploadDishImage(saved.id, photo).catch(() => { throw new Error('El platillo se guardó, pero la foto no se pudo subir. Intenta subirla de nuevo desde «Editar».') })
    }, editing ? 'Platillo actualizado.' : 'Platillo agregado como oculto. Pulsa «Mostrar» cuando esté listo.')
    if (ok) resetForm()
  }
  function resetForm() { setForm(empty); setEditing(null); setPhoto(null); setCurrentPhoto(null); setNewCategory(''); setNewIngredient(''); setFieldHint('') }
  const patch = (dish: Dish, values: DishPatch, done: string) => run(() => webApi.updateDish(dish.id, values), done)
  function edit(dish: Dish) {
    setEditing(dish.id); setError(''); setPhoto(null); setCurrentPhoto(dish.image_url); setFieldHint('')
    const allergens = dish.allergens ?? []
    setForm({ name: dish.name, price: dish.price.toFixed(2), description: dish.description ?? '', categories: dishCategories(dish),
      ingredients: dish.ingredients ?? [], hasAllergens: allergenStatus(allergens).contains.length > 0, allergens })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const toggle = <T,>(list: T[], value: T) => list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  const hasCategory = (c: string) => form.categories.some((x) => x.toLowerCase() === c.toLowerCase())
  function toggleCategory(c: string) {
    setFieldHint('')
    if (!hasCategory(c) && form.categories.length >= MAX_CATEGORIES) { setFieldHint(`Elige hasta ${MAX_CATEGORIES} categorías.`); return }
    setForm((v) => ({ ...v, categories: hasCategory(c) ? v.categories.filter((x) => x.toLowerCase() !== c.toLowerCase()) : [...v.categories, c] }))
  }
  function addCategory() {
    const c = newCategory.trim().replace(/\s+/g, ' ')
    if (c.length < 2 || c.length > 30 || /[,;]/.test(c)) { setFieldHint('Escribe una categoría a la vez, de 2 a 30 letras.'); return }
    if (!hasCategory(c)) toggleCategory(c)
    setNewCategory('')
  }
  function addIngredient() {
    const problem = ingredientProblem(newIngredient, form.ingredients)
    if (problem) { setFieldHint(problem); return }
    setFieldHint(''); setForm((v) => ({ ...v, ingredients: [...v.ingredients, newIngredient.trim().replace(/\s+/g, ' ')] })); setNewIngredient('')
  }
  const known = new Set(DISH_CATEGORY_GROUPS.flatMap((g) => g.options.map((o) => o.label.toLowerCase())))
  const customCategories = form.categories.filter((c) => !known.has(c.toLowerCase()))

  return <section className="space-y-5 rounded-[24px] border bg-white p-5">
    <Button variant="ghost" disabled={busy} onClick={onClose}>← Mis restaurantes</Button>
    <div>
      <h2 className="text-xl font-semibold">Menú de {restaurantName}</h2>
      <p className="text-sm text-muted-foreground">Los clientes ven los platillos visibles en todas tus sedes publicadas.</p>
    </div>
    {notice && <p role="status" className="rounded-lg bg-[#173F35]/10 px-3 py-2 text-sm text-[#173F35]">{notice}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

    {loadError ? <div role="alert"><p>{loadError}</p><Button variant="outline" onClick={() => setRetry((v) => v + 1)}>Reintentar</Button></div>
      : !dishes ? <p role="status">Cargando menú…</p>
      : dishes.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">Tu menú está vacío. Agrega tu primer platillo abajo.</p>
      : <>
        {undeclared > 0 && <p className="rounded-lg border border-dashed border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {undeclared === 1 ? '1 platillo no tiene' : `${undeclared} platillos no tienen`} alérgenos declarados. Los clientes con alergias no podrán saber si es seguro para ellos: edítalo y marca sus alérgenos.
        </p>}
        <div className="space-y-3 rounded-2xl bg-stone-50 p-3">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <Input aria-label="Buscar en el menú" placeholder="Buscar por nombre, categoría o ingrediente" value={query} onChange={(e) => setQuery(e.target.value)} className="bg-white pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Estado" className="inline-flex flex-wrap rounded-xl border bg-white p-1">
            {(Object.keys(STATUS_LABELS) as Status[]).map((s) => <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-[#173F35] ${status === s ? 'bg-[#173F35] text-white' : 'text-stone-700 hover:bg-stone-100'}`}>
              {STATUS_LABELS[s]} <span className={status === s ? 'text-white/70' : 'text-stone-400'}>{counts[s]}</span>
            </button>)}
          </div>
          <button type="button" aria-expanded={moreFilters} aria-controls="menu-more-filters" onClick={() => setMoreFilters((v) => !v)}
            className="rounded-lg px-3 py-1.5 text-sm text-[#173F35] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#173F35]">
            {moreFilters ? 'Menos filtros' : `Más filtros${tagFilter.length + withoutFilter.length ? ` (${tagFilter.length + withoutFilter.length})` : ''}`}</button>
          </div>
          {moreFilters && <div id="menu-more-filters" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-stone-600">Etiquetas</span>
            {DISH_TAGS.map((t) => <Chip key={t} on={tagFilter.includes(t)} onClick={() => setTagFilter((v) => toggle(v, t))}>{DISH_TAG_LABELS[t]}</Chip>)}</div>
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-stone-600">Sin</span>
            {ALLERGENS.map((a) => <Chip key={a} tone="red" on={withoutFilter.includes(a)} onClick={() => setWithoutFilter((v) => toggle(v, a))}>{ALLERGEN_LABELS[a]}</Chip>)}</div>
          </div>}
          {filtering && <div className="flex items-center justify-between text-sm text-stone-600"><span>{visibleRows.length} de {dishes.length} platillos</span>
            <button type="button" className="underline" onClick={() => { setQuery(''); setStatus('all'); setTagFilter([]); setWithoutFilter([]) }}>Quitar filtros</button></div>}
        </div>

        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden
          onChange={(e) => { const file = e.target.files?.[0]; const id = photoFor.current; e.target.value = ''; if (file && id) void run(() => uploadDishImage(id, file), 'Foto guardada.') }} />
        {visibleRows.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">Ningún platillo coincide con estos filtros.</p>
          : <ul className="space-y-2">{visibleRows.map((dish) => {
            const st = statusOf(dish)
            const al = allergenStatus(dish.allergens)
            return <li key={dish.id} className={`flex flex-wrap items-start gap-3 rounded-xl border border-l-4 bg-white p-3 ${EDGE[st]}`}>
              {dish.image_url ? <img src={dish.image_url} alt={`Foto de ${dish.name}`} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                : <button type="button" disabled={busy} onClick={() => { photoFor.current = dish.id; photoInput.current?.click() }}
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed text-xs text-stone-500 hover:border-stone-500">Agregar foto</button>}
              <div className="min-w-[12rem] flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-3"><p className="font-semibold">{dish.name}</p><p className="tabular-nums">{money(dish.price)}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PILL[st]}`}>{PILL_TEXT[st]}</span></div>
                {dish.description && <p className="line-clamp-2 text-sm text-stone-600">{dish.description}</p>}
                {dish.ingredients?.length ? <p className="text-sm text-stone-600"><span className="text-stone-500">Ingredientes:</span> {dish.ingredients.join(', ')}</p> : null}
                <div className="flex flex-wrap gap-1.5">
                  {dishCategories(dish).map((c) => <span key={c} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">{c}</span>)}
                  {!al.declared ? <span className="rounded-full border border-dashed border-amber-500 px-2 py-0.5 text-xs text-amber-900">Alérgenos sin declarar</span>
                    : al.contains.length ? al.contains.map((a) => <span key={a} className="rounded-full border border-[#BD481F] px-2 py-0.5 text-xs text-[#9a3a18]">Contiene {ALLERGEN_LABELS[a].toLowerCase()}</span>)
                    : <span className="rounded-full border border-[#173F35]/40 px-2 py-0.5 text-xs text-[#173F35]">Sin alérgenos comunes</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={dish.status === 'published' ? 'outline' : 'default'} disabled={busy}
                  onClick={() => patch(dish, { status: dish.status === 'published' ? 'draft' : 'published' }, dish.status === 'published' ? 'Platillo ocultado.' : 'Platillo visible en el menú.')}>
                  {dish.status === 'published' ? 'Ocultar' : 'Mostrar'}</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button size="sm" variant="outline" disabled={busy} aria-label={`Más acciones para ${dish.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => edit(dish)}>Editar</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => patch(dish, { is_available: !dish.is_available }, dish.is_available ? 'Marcado como agotado.' : 'Marcado como disponible.')}>{dish.is_available ? 'Marcar agotado' : 'Marcar disponible'}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { photoFor.current = dish.id; photoInput.current?.click() }}>{dish.image_url ? 'Cambiar foto' : 'Agregar foto'}</DropdownMenuItem>
                    {dish.image_url && <DropdownMenuItem onSelect={() => run(() => webApi.removeDishImage(dish.id), 'Foto quitada.')}>Quitar foto</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-700" onSelect={() => { if (window.confirm(`¿Eliminar «${dish.name}»? No se puede deshacer.`)) void run(() => webApi.deleteDish(dish.id), 'Platillo eliminado.') }}>Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          })}</ul>}
      </>}

    <form ref={formRef} onSubmit={submit} className="space-y-5 border-t pt-5">
      <h3 className="text-lg font-semibold">{editing ? 'Editar platillo' : 'Nuevo platillo'}</h3>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-1"><Label htmlFor="dish-name">Nombre</Label><Input id="dish-name" placeholder="Ej. Pepián de pollo" value={form.name} maxLength={120} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label htmlFor="dish-price">Precio</Label>
              <div className="relative"><span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-500">Q</span>
                <Input id="dish-price" inputMode="decimal" placeholder="45.00" className="pl-8 tabular-nums" value={form.price} maxLength={9} disabled={busy}
                  onChange={(e) => setForm((v) => ({ ...v, price: e.target.value.replace(/[^0-9.,]/g, '') }))} onBlur={() => setForm((v) => ({ ...v, price: formatPriceInput(v.price) }))} /></div>
              <p className="text-xs text-muted-foreground">Solo el número, en quetzales.</p></div>
          </div>
          <div className="space-y-1"><Label htmlFor="dish-description">Descripción (opcional)</Label>
            <Textarea id="dish-description" className="min-h-32" placeholder="Cómo se prepara, con qué se acompaña, tamaño de la porción…" value={form.description} maxLength={500} rows={5} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
            <p className="text-right text-xs text-muted-foreground">{form.description.length}/500</p></div>
        </div>
        <div className="space-y-2">
          <Label>Foto (opcional)</Label>
          <input ref={formPhoto} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-hidden tabIndex={-1}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setPhoto(f) }} />
          <button type="button" disabled={busy} onClick={() => formPhoto.current?.click()}
            className="flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 text-stone-500 hover:border-[#173F35] sm:w-48 focus-visible:outline-2 focus-visible:outline-[#173F35]">
            {photoPreview || currentPhoto ? <img src={photoPreview ?? currentPhoto!} alt="Foto del platillo" className="h-full w-full object-cover" />
              : <span className="flex flex-col items-center gap-1 text-sm"><ImagePlus className="h-6 w-6" />Subir foto</span>}
          </button>
          {(photoPreview || currentPhoto) && <p className="text-xs text-muted-foreground">{photo ? 'Se subirá al guardar.' : 'Toca la foto para cambiarla.'}</p>}
        </div>
      </div>

      <fieldset className="space-y-3 rounded-xl border p-3">
        <legend className="px-1 text-sm font-medium">Categorías <span className="font-normal text-muted-foreground">(elige todas las que apliquen; ayudan a que te encuentren)</span></legend>
        {DISH_CATEGORY_GROUPS.map((g) => <div key={g.title} className="space-y-1.5">
          <p className="text-xs font-medium text-stone-500">{g.title}</p>
          <div className="flex flex-wrap gap-2">{g.options.map((o) => <Chip key={o.label} on={hasCategory(o.label)} onClick={() => toggleCategory(o.label)}>{o.label}</Chip>)}</div>
        </div>)}
        {customCategories.length > 0 && <div className="flex flex-wrap gap-2">{customCategories.map((c) => <Chip key={c} on onClick={() => toggleCategory(c)}>{c} ×</Chip>)}</div>}
        <div className="flex gap-2"><Input aria-label="Otra categoría" placeholder="¿No está? Escríbela: Ej. Shucos" value={newCategory} maxLength={30} disabled={busy}
          onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }} />
          <Button type="button" variant="outline" disabled={busy || !newCategory.trim()} onClick={addCategory}>Agregar</Button></div>
      </fieldset>

      <fieldset className="space-y-2 rounded-xl border p-3">
        <legend className="px-1 text-sm font-medium">Ingredientes principales (opcional)</legend>
        <p className="text-xs text-muted-foreground">Agrega <strong>un ingrediente a la vez</strong>. Los clientes pueden buscar por ingrediente o pedir platillos sin alguno («sin cebolla»).</p>
        {form.ingredients.length > 0 && <ul className="flex flex-wrap gap-2">{form.ingredients.map((i) => <li key={i}>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#173F35] bg-[#173F35]/10 py-1 pl-3 pr-1 text-sm text-[#173F35]">{i}
            <button type="button" aria-label={`Quitar ${i}`} disabled={busy} onClick={() => setForm((v) => ({ ...v, ingredients: v.ingredients.filter((x) => x !== i) }))}
              className="rounded-full p-0.5 hover:bg-[#173F35]/15"><X className="h-3.5 w-3.5" /></button></span></li>)}</ul>}
        <div className="flex gap-2"><Input aria-label="Ingrediente" placeholder="Ej. pollo" value={newIngredient} maxLength={40} disabled={busy}
          onChange={(e) => setNewIngredient(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient() } }} />
          <Button type="button" variant="outline" disabled={busy || !newIngredient.trim()} onClick={addIngredient}>Agregar</Button></div>
      </fieldset>
      {fieldHint && <p role="alert" className="text-sm text-[#9a3a18]">{fieldHint}</p>}

      <fieldset className="space-y-3 rounded-xl border p-3">
        <legend className="px-1 text-sm font-medium">Alérgenos</legend>
        <button type="button" role="switch" aria-checked={form.hasAllergens} disabled={busy}
          onClick={() => setForm((v) => ({ ...v, hasAllergens: !v.hasAllergens, allergens: v.hasAllergens ? [] : v.allergens.filter((a) => a !== NO_ALLERGENS) }))}
          className="flex items-center gap-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-[#173F35]">
          <span className={`relative h-6 w-11 rounded-full transition-colors ${form.hasAllergens ? 'bg-[#BD481F]' : 'bg-stone-300'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.hasAllergens ? 'left-[22px]' : 'left-0.5'}`} /></span>
          Contiene alérgenos</button>
        {form.hasAllergens
          ? <div className="space-y-1.5"><p className="text-xs text-muted-foreground">Marca todos los que puede contener:</p>
              <div className="flex flex-wrap gap-2">{ALLERGENS.map((a) => <Chip key={a} tone="red" on={form.allergens.includes(a)} onClick={() => setForm((v) => ({ ...v, allergens: toggle(v.allergens, a as AllergenDeclaration) }))}>{ALLERGEN_LABELS[a]}</Chip>)}</div></div>
          : <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" disabled={busy} checked={form.allergens.includes(NO_ALLERGENS)} onChange={(e) => setForm((v) => ({ ...v, allergens: e.target.checked ? [NO_ALLERGENS] : [] }))} />
              <span>Confirmo que no contiene ninguno de los alérgenos comunes (maní, nueces, lácteos, huevo, gluten, mariscos, pescado, soya, ajonjolí).
                <span className="block text-xs text-muted-foreground">Si no lo confirmas, los clientes verán «alérgenos sin declarar».</span></span></label>}
      </fieldset>

      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar platillo'}</Button>
        {editing && <Button type="button" variant="outline" disabled={busy} onClick={() => { resetForm(); setError('') }}>Cancelar edición</Button>}</div>
    </form>
  </section>
}
