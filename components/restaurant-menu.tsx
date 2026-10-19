'use client'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ImagePlus, MoreHorizontal, Search, X } from 'lucide-react'
import { webApi } from '@/lib/web-api'
import { uploadDishImage } from '@/lib/web-image-upload'
import { normalize } from '@/shared/contracts/assistant'
import {
  ALLERGEN_LABELS, ALLERGENS, DISH_DETAIL_GROUPS, DISH_TAGS, DISH_TAG_LABELS, NO_ALLERGENS, allergenNames, allergenStatus, dishDetails,
  dishInputSchema, formatPriceInput, ingredientProblem, labelProblem, splitAllergenLabels, type Allergen, type DetailKey, type Dish, type DishPatch, type DishTag,
} from '@/shared/contracts/menu'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import TagField from './tag-field'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import FoodLoader from './food-loader'
import { t } from '@/shared/i18n'

const empty = { name: '', price: '', description: '', dish_types: [] as string[], cuisines: [] as string[], features: [] as string[],
  ingredients: [] as string[], hasAllergens: false, allergenLabels: [] as string[], noAllergens: false }
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
  const undeclared = (dishes ?? []).filter((d) => !allergenStatus(d.allergens, d.allergens_other).declared).length

  // Search covers name, category, description and ingredients (accent-insensitive).
  const visibleRows = useMemo(() => {
    const q = normalize(query)
    return (dishes ?? []).filter((d) => {
      if (status !== 'all' && statusOf(d) !== status) return false
      if (tagFilter.some((tag) => !d.tags?.includes(tag))) return false
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
    catch (err) { setError(err instanceof Error ? err.message : t('No pudimos guardar.')); return false }
    finally { saving.current = false; setBusy(false) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    const own = splitAllergenLabels(form.allergenLabels)
    const parsed = dishInputSchema.safeParse({ name: form.name, price: form.price, description: form.description,
      dish_types: form.dish_types, cuisines: form.cuisines, features: form.features, ingredients: form.ingredients,
      allergens: form.hasAllergens ? own.allergens : form.noAllergens ? [NO_ALLERGENS] : [], allergens_other: form.hasAllergens ? own.allergens_other : [] })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    if (form.hasAllergens && !form.allergenLabels.length) { setError(t('Marca o escribe qué alérgenos contiene, o apaga «Contiene alérgenos».')); return }
    const ok = await run(async () => {
      const saved = editing ? await webApi.updateDish(editing, parsed.data) : await webApi.createDish(restaurantId, parsed.data)
      if (photo) await uploadDishImage(saved.id, photo).catch((e: unknown) => { throw new Error(t('El platillo se guardó, pero la foto no se pudo subir ({reason}). Intenta de nuevo desde «Editar».', { reason: e instanceof Error ? e.message : t('error desconocido') })) })
    }, editing ? t('Platillo actualizado.') : t('Platillo agregado como oculto. Pulsa «Mostrar» cuando esté listo.'))
    if (ok) resetForm()
  }
  function resetForm() { setForm(empty); setEditing(null); setPhoto(null); setCurrentPhoto(null) }
  const patch = (dish: Dish, values: DishPatch, done: string) => run(() => webApi.updateDish(dish.id, values), done)
  function edit(dish: Dish) {
    setEditing(dish.id); setError(''); setPhoto(null); setCurrentPhoto(dish.image_url)
    const labels = allergenNames(dish.allergens, dish.allergens_other)
    setForm({ name: dish.name, price: dish.price.toFixed(2), description: dish.description ?? '', ...dishDetails(dish),
      ingredients: dish.ingredients ?? [], hasAllergens: labels.length > 0, allergenLabels: labels, noAllergens: (dish.allergens ?? []).includes(NO_ALLERGENS) })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const toggle = <T,>(list: T[], value: T) => list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  const setGroup = (key: DetailKey) => (next: string[]) => setForm((v) => ({ ...v, [key]: next }))

  return <section className="space-y-5 rounded-[24px] border bg-white p-5">
    <Button variant="ghost" disabled={busy} onClick={onClose}>{t('← Mis restaurantes')}</Button>
    <div>
      <h2 className="text-xl font-semibold">{t('Menú de')} {restaurantName}</h2>
      <p className="text-sm text-muted-foreground">{t('Los clientes ven los platillos visibles en todas tus sedes publicadas.')}</p>
    </div>
    {notice && <p role="status" className="rounded-lg bg-[#173F35]/10 px-3 py-2 text-sm text-[#173F35]">{notice}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

    {loadError ? <div role="alert"><p>{loadError}</p><Button variant="outline" onClick={() => setRetry((v) => v + 1)}>{t('Reintentar')}</Button></div>
      : !dishes ? <FoodLoader label={t('Cargando menú…')} />
      : dishes.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">{t('Tu menú está vacío. Agrega tu primer platillo abajo.')}</p>
      : <>
        {undeclared > 0 && <p className="rounded-lg border border-dashed border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {undeclared === 1 ? t('1 platillo no tiene') : `${undeclared} platillos no tienen`} alérgenos declarados. Los clientes con alergias no podrán saber si es seguro para ellos: edítalo y marca sus alérgenos.
        </p>}
        <div className="space-y-3 rounded-2xl bg-stone-50 p-3">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <Input aria-label={t('Buscar en el menú')} placeholder={t('Buscar por nombre, categoría o ingrediente')} value={query} onChange={(e) => setQuery(e.target.value)} className="bg-white pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label={t('Estado')} className="inline-flex flex-wrap rounded-xl border bg-white p-1">
            {(Object.keys(STATUS_LABELS) as Status[]).map((s) => <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-[#173F35] ${status === s ? 'bg-[#173F35] text-white' : 'text-stone-700 hover:bg-stone-100'}`}>
              {STATUS_LABELS[s]} <span className={status === s ? 'text-white/70' : 'text-stone-400'}>{counts[s]}</span>
            </button>)}
          </div>
          <button type="button" aria-expanded={moreFilters} aria-controls="menu-more-filters" onClick={() => setMoreFilters((v) => !v)}
            className="rounded-lg px-3 py-1.5 text-sm text-[#173F35] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#173F35]">
            {moreFilters ? t('Menos filtros') : t('Más filtros') + (tagFilter.length + withoutFilter.length ? ` (${tagFilter.length + withoutFilter.length})` : '')}</button>
          </div>
          {moreFilters && <div id="menu-more-filters" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-stone-600">{t('Etiquetas')}</span>
            {DISH_TAGS.map((tag) => <Chip key={tag} on={tagFilter.includes(tag)} onClick={() => setTagFilter((v) => toggle(v, tag))}>{t(DISH_TAG_LABELS[tag])}</Chip>)}</div>
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-stone-600">{t('Sin')}</span>
            {ALLERGENS.map((a) => <Chip key={a} tone="red" on={withoutFilter.includes(a)} onClick={() => setWithoutFilter((v) => toggle(v, a))}>{ALLERGEN_LABELS[a]}</Chip>)}</div>
          </div>}
          {filtering && <div className="flex items-center justify-between text-sm text-stone-600"><span>{visibleRows.length} de {dishes.length} platillos</span>
            <button type="button" className="underline" onClick={() => { setQuery(''); setStatus('all'); setTagFilter([]); setWithoutFilter([]) }}>{t('Quitar filtros')}</button></div>}
        </div>

        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden
          onChange={(e) => { const file = e.target.files?.[0]; const id = photoFor.current; e.target.value = ''; if (file && id) void run(() => uploadDishImage(id, file), t('Foto guardada.')) }} />
        {visibleRows.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">{t('Ningún platillo coincide con estos filtros.')}</p>
          : <ul className="space-y-2">{visibleRows.map((dish) => {
            const st = statusOf(dish)
            const al = allergenStatus(dish.allergens, dish.allergens_other)
            return <li key={dish.id} className={`flex flex-wrap items-start gap-3 rounded-xl border border-l-4 bg-white p-3 ${EDGE[st]}`}>
              {dish.image_url ? <img src={dish.image_url} alt={t('Foto de {name}', { name: dish.name })} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                : <button type="button" disabled={busy} onClick={() => { photoFor.current = dish.id; photoInput.current?.click() }}
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed text-xs text-stone-500 hover:border-stone-500">{t('Agregar foto')}</button>}
              <div className="min-w-[12rem] flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-3"><p className="font-semibold">{dish.name}</p><p className="tabular-nums">{money(dish.price)}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PILL[st]}`}>{PILL_TEXT[st]}</span></div>
                {dish.description && <p className="line-clamp-2 text-sm text-stone-600">{dish.description}</p>}
                {dish.ingredients?.length ? <p className="text-sm text-stone-600"><span className="text-stone-500">{t('Ingredientes:')}</span> {dish.ingredients.join(', ')}</p> : null}
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(dishDetails(dish)).flat().map((c) => <span key={c} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">{c}</span>)}
                  {!al.declared ? <span className="rounded-full border border-dashed border-amber-500 px-2 py-0.5 text-xs text-amber-900">{t('Alérgenos sin declarar')}</span>
                    : al.contains.length || al.other.length ? allergenNames(dish.allergens, dish.allergens_other).map((a) => <span key={a} className="rounded-full border border-[#BD481F] px-2 py-0.5 text-xs text-[#9a3a18]">{t('Contiene')} {a.toLowerCase()}</span>)
                    : <span className="rounded-full border border-[#173F35]/40 px-2 py-0.5 text-xs text-[#173F35]">{t('Sin alérgenos comunes')}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={dish.status === 'published' ? 'outline' : 'default'} disabled={busy}
                  onClick={() => patch(dish, { status: dish.status === 'published' ? 'draft' : 'published' }, dish.status === 'published' ? t('Platillo ocultado.') : t('Platillo visible en el menú.'))}>
                  {dish.status === 'published' ? 'Ocultar' : 'Mostrar'}</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button size="sm" variant="outline" disabled={busy} aria-label={t('Más acciones para {name}', { name: dish.name })}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => edit(dish)}>{t('Editar')}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => patch(dish, { is_available: !dish.is_available }, dish.is_available ? t('Marcado como agotado.') : t('Marcado como disponible.'))}>{dish.is_available ? t('Marcar agotado') : t('Marcar disponible')}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { photoFor.current = dish.id; photoInput.current?.click() }}>{dish.image_url ? t('Cambiar foto') : t('Agregar foto')}</DropdownMenuItem>
                    {dish.image_url && <DropdownMenuItem onSelect={() => run(() => webApi.removeDishImage(dish.id), t('Foto quitada.'))}>{t('Quitar foto')}</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-700" onSelect={() => { if (window.confirm(t('¿Eliminar «{name}»? No se puede deshacer.', { name: dish.name }))) void run(() => webApi.deleteDish(dish.id), t('Platillo eliminado.')) }}>{t('Eliminar')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          })}</ul>}
      </>}

    <form ref={formRef} onSubmit={submit} className="space-y-5 border-t pt-5">
      <h3 className="text-lg font-semibold">{editing ? t('Editar platillo') : t('Nuevo platillo')}</h3>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-1"><Label htmlFor="dish-name">{t('Nombre')}</Label><Input id="dish-name" placeholder={t('Ej. Pepián de pollo')} value={form.name} maxLength={120} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label htmlFor="dish-price">{t('Precio')}</Label>
              <div className="relative"><span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-500">Q</span>
                <Input id="dish-price" inputMode="decimal" placeholder="45.00" className="pl-8 tabular-nums" value={form.price} maxLength={9} disabled={busy}
                  onChange={(e) => setForm((v) => ({ ...v, price: e.target.value.replace(/[^0-9.,]/g, '') }))} onBlur={() => setForm((v) => ({ ...v, price: formatPriceInput(v.price) }))} /></div>
              <p className="text-xs text-muted-foreground">{t('Solo el número, en quetzales.')}</p></div>
          </div>
          <div className="space-y-1"><Label htmlFor="dish-description">{t('Descripción (opcional)')}</Label>
            <Textarea id="dish-description" className="min-h-32" placeholder={t('Cómo se prepara, con qué se acompaña, tamaño de la porción…')} value={form.description} maxLength={500} rows={5} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
            <p className="text-right text-xs text-muted-foreground">{form.description.length}/500</p></div>
        </div>
        <div className="space-y-2">
          <Label>Foto (opcional)</Label>
          <input ref={formPhoto} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-hidden tabIndex={-1}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setPhoto(f) }} />
          <button type="button" disabled={busy} onClick={() => formPhoto.current?.click()}
            className="flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 text-stone-500 hover:border-[#173F35] sm:w-48 focus-visible:outline-2 focus-visible:outline-[#173F35]">
            {photoPreview || currentPhoto ? <img src={photoPreview ?? currentPhoto!} alt={t('Foto del platillo')} className="h-full w-full object-cover" />
              : <span className="flex flex-col items-center gap-1 text-sm"><ImagePlus className="h-6 w-6" />{t('Subir foto')}</span>}
          </button>
          {(photoPreview || currentPhoto) && <p className="text-xs text-muted-foreground">{photo ? t('Se subirá al guardar.') : t('Toca la foto para cambiarla.')}</p>}
        </div>
      </div>

      {DISH_DETAIL_GROUPS.map((g) => <TagField key={g.key} id={`dish-${g.key}`} legend={g.title} placeholder={g.placeholder} disabled={busy}
        hint={g.key === 'dish_types' ? t('Elige o escribe todas las que apliquen; ayudan a que te encuentren.') : undefined}
        options={g.options.map((o) => o.label)} value={form[g.key]} onChange={setGroup(g.key)} validate={(text, cur) => labelProblem(text, cur)} />)}

      <TagField id="dish-ingredients" legend="Ingredientes principales (opcional)" placeholder={t('Escribe uno: Ej. pollo')} disabled={busy}
        hint={t('Agrega un ingrediente a la vez. Los clientes pueden buscar por ingrediente o pedir platillos sin alguno («sin cebolla»).')}
        value={form.ingredients} onChange={(ingredients) => setForm((v) => ({ ...v, ingredients }))} validate={ingredientProblem} />

      <fieldset className="space-y-3 rounded-xl border p-3">
        <legend className="px-1 text-sm font-medium">{t('Alérgenos')}</legend>
        <button type="button" role="switch" aria-checked={form.hasAllergens} disabled={busy}
          onClick={() => setForm((v) => ({ ...v, hasAllergens: !v.hasAllergens, noAllergens: false, allergenLabels: v.hasAllergens ? [] : v.allergenLabels }))}
          className="flex items-center gap-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-[#173F35]">
          <span className={`relative h-6 w-11 rounded-full transition-colors ${form.hasAllergens ? 'bg-[#BD481F]' : 'bg-stone-300'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.hasAllergens ? 'left-[22px]' : 'left-0.5'}`} /></span>
          Contiene alérgenos</button>
        {form.hasAllergens
          ? <TagField id="dish-allergens" legend={t('¿Qué alérgenos contiene?')} placeholder={t('¿Otro? Escríbelo: Ej. mostaza')} tone="red" disabled={busy}
              options={ALLERGENS.map((a) => ALLERGEN_LABELS[a])} value={form.allergenLabels} onChange={(allergenLabels) => setForm((v) => ({ ...v, allergenLabels }))}
              validate={(text, cur) => labelProblem(text, cur, t('un alérgeno'), 19)} />
          : <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" disabled={busy} checked={form.noAllergens} onChange={(e) => setForm((v) => ({ ...v, noAllergens: e.target.checked }))} />
              <span>Confirmo que no contiene ninguno de los alérgenos comunes (maní, nueces, lácteos, huevo, gluten, mariscos, pescado, soya, ajonjolí).
                <span className="block text-xs text-muted-foreground">{t('Si no lo confirmas, los clientes verán «alérgenos sin declarar».')}</span></span></label>}
      </fieldset>

      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? t('Guardando…') : editing ? t('Guardar cambios') : t('Agregar platillo')}</Button>
        {editing && <Button type="button" variant="outline" disabled={busy} onClick={() => { resetForm(); setError('') }}>{t('Cancelar edición')}</Button>}</div>
    </form>
  </section>
}
