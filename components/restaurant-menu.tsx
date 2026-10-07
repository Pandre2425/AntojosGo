'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { webApi } from '@/lib/web-api'
import { uploadDishImage } from '@/lib/web-image-upload'
import { DISH_TAGS, DISH_TAG_LABELS, dishInputSchema, type Dish, type DishPatch, type DishTag } from '@/shared/contracts/menu'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

const empty = { name: '', price: '', category: '', description: '', tags: [] as DishTag[] }
const money = (v: number) => `Q${v.toFixed(2)}`

export default function RestaurantMenu({ restaurantId, restaurantName, onClose }: { restaurantId: string; restaurantName: string; onClose: () => void }) {
  const [dishes, setDishes] = useState<Dish[] | null>(null)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const saving = useRef(false)

  useEffect(() => {
    let active = true
    setDishes(null); setLoadError('')
    webApi.listDishes(restaurantId).then((rows) => { if (active) setDishes(rows) }).catch((err) => { if (active) setLoadError(err.message) })
    return () => { active = false }
  }, [restaurantId, retry])

  async function run(action: () => Promise<unknown>, done: string) {
    if (saving.current) return false
    saving.current = true; setBusy(true); setError(''); setNotice('')
    try { await action(); setNotice(done); setRetry((v) => v + 1); return true }
    catch (err) { setError(err instanceof Error ? err.message : 'No pudimos guardar.'); return false }
    finally { saving.current = false; setBusy(false) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = dishInputSchema.safeParse(form)
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    const ok = await run(() => editing ? webApi.updateDish(editing, parsed.data) : webApi.createDish(restaurantId, parsed.data), editing ? 'Platillo actualizado.' : 'Platillo agregado como oculto. Muéstralo cuando esté listo.')
    if (ok) { setForm(empty); setEditing(null) }
  }
  const patch = (dish: Dish, values: DishPatch, done: string) => run(() => webApi.updateDish(dish.id, values), done)

  return <section className="rounded-[24px] border bg-white p-5 space-y-5">
    <Button variant="ghost" disabled={busy} onClick={onClose}>← Mis restaurantes</Button>
    <h2 className="text-xl font-semibold">Menú de {restaurantName}</h2>
    <p className="text-sm text-muted-foreground">Los platillos nuevos quedan ocultos. Los visibles aparecen en todas las sedes publicadas; los agotados se muestran marcados.</p>
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loadError ? <div role="alert"><p>{loadError}</p><Button variant="outline" onClick={() => setRetry((v) => v + 1)}>Reintentar</Button></div>
      : !dishes ? <p role="status">Cargando menú…</p>
      : dishes.length === 0 ? <p className="text-muted-foreground">Aún no hay platillos. Agrega el primero.</p>
      : <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b text-left"><th className="py-2 pr-3">Platillo</th><th className="pr-3">Precio</th><th className="pr-3">Estado</th><th>Acciones</th></tr></thead>
          <tbody>{dishes.map((dish) => <tr key={dish.id} className="border-b align-top">
            <td className="py-3 pr-3"><div className="flex gap-3">
              {dish.image_url ? <img src={dish.image_url} alt={`Foto de ${dish.name}`} className="h-14 w-14 shrink-0 rounded-lg object-cover" /> : <div aria-hidden className="h-14 w-14 shrink-0 rounded-lg bg-muted" />}
              <div><p className="font-medium">{dish.name}</p><p className="text-muted-foreground">{[dish.category, dish.description].filter(Boolean).join(' · ')}</p>{dish.tags?.length ? <p className="text-xs text-muted-foreground">{dish.tags.map((t) => DISH_TAG_LABELS[t]).join(' · ')}</p> : null}</div>
            </div></td>
            <td className="py-3 pr-3 whitespace-nowrap">{money(dish.price)}</td>
            <td className="py-3 pr-3">{dish.status === 'published' ? 'Visible' : 'Oculto'}{dish.is_available ? '' : ' · Agotado'}</td>
            <td className="py-3"><div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => { setEditing(dish.id); setError(''); setForm({ name: dish.name, price: dish.price.toFixed(2), category: dish.category ?? '', description: dish.description ?? '', tags: dish.tags ?? [] }) }}>Editar</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => patch(dish, { status: dish.status === 'published' ? 'draft' : 'published' }, dish.status === 'published' ? 'Platillo ocultado.' : 'Platillo visible en el menú.')}>{dish.status === 'published' ? 'Ocultar' : 'Mostrar'}</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => patch(dish, { is_available: !dish.is_available }, dish.is_available ? 'Marcado como agotado.' : 'Marcado como disponible.')}>{dish.is_available ? 'Marcar agotado' : 'Marcar disponible'}</Button>
              <label className={`inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-sm ${busy ? 'pointer-events-none opacity-50' : ''}`}>
                {dish.image_url ? 'Cambiar foto' : 'Subir foto'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void run(() => uploadDishImage(dish.id, file), 'Foto guardada.') }} />
              </label>
              {dish.image_url && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => webApi.removeDishImage(dish.id), 'Foto quitada.')}>Quitar foto</Button>}
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => { if (window.confirm(`¿Eliminar «${dish.name}»? No se puede deshacer.`)) void run(() => webApi.deleteDish(dish.id), 'Platillo eliminado.') }}>Eliminar</Button>
            </div></td>
          </tr>)}</tbody>
        </table></div>}
    <form onSubmit={submit} className="space-y-3 border-t pt-4">
      <h3 className="font-semibold">{editing ? 'Editar platillo' : 'Nuevo platillo'}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="dish-name">Nombre</Label><Input id="dish-name" value={form.name} maxLength={120} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></div>
        <div className="space-y-1"><Label htmlFor="dish-price">Precio (Q)</Label><Input id="dish-price" inputMode="decimal" value={form.price} maxLength={9} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, price: e.target.value }))} /></div>
        <div className="space-y-1"><Label htmlFor="dish-category">Categoría (opcional)</Label><Input id="dish-category" value={form.category} maxLength={60} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))} /></div>
      </div>
      <div className="space-y-1"><Label htmlFor="dish-description">Descripción (opcional)</Label><Textarea id="dish-description" value={form.description} maxLength={500} rows={3} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} /></div>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">Etiquetas <span className="font-normal text-muted-foreground">(ayudan a que el asistente encuentre el platillo)</span></legend>
        <div className="flex flex-wrap gap-3">{DISH_TAGS.map((tag) => <label key={tag} className="flex items-center gap-1.5 text-sm"><input type="checkbox" disabled={busy} checked={form.tags.includes(tag)} onChange={(e) => setForm((v) => ({ ...v, tags: e.target.checked ? [...v.tags, tag] : v.tags.filter((t) => t !== tag) }))} />{DISH_TAG_LABELS[tag]}</label>)}</div>
      </fieldset>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar platillo'}</Button>{editing && <Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(null); setForm(empty); setError('') }}>Cancelar edición</Button>}</div>
    </form>
  </section>
}
