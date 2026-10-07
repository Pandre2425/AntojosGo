'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { webApi } from '@/lib/web-api'
import { branchInputSchema, phoneUrl, type RestaurantBranch } from '@/shared/contracts/branches'
import BranchLocationEditor from './branch-location-editor'
import BranchHoursEditor from './branch-hours-editor'
import { describeHours } from '@/shared/contracts/hours'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

type TextField = 'name' | 'department' | 'municipality' | 'address'
const empty = { name: '', department: '', municipality: '', address: '', phone: '', whatsapp: false }
const statusLabels: Record<RestaurantBranch['status'], string> = { draft: 'Borrador privado', published: 'Publicada · visible para clientes', inactive: 'Suspendida por AntojosGo' }
const labels: Record<TextField, string> = { name: 'Nombre de la sede', department: 'Departamento', municipality: 'Municipio', address: 'Dirección' }
export default function RestaurantBranches({ restaurantId, onClose }: { restaurantId: string; onClose: () => void }) {
  const [editingLocation, setEditingLocation] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editingHours, setEditingHours] = useState<string | null>(null)
  const panelOpen = editingLocation !== null || editingHours !== null
  const [items, setItems] = useState<RestaurantBranch[]>([])
  const [input, setInput] = useState(empty)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)
  const requestId = useRef<string | null>(null)
  const saving = useRef(false)
  useEffect(() => {
    let active = true
    setLoading(true); setLoadError('')
    webApi.listBranches(restaurantId, page).then((result) => { if (active) { setItems(result.items); setHasMore(result.hasMore) } })
      .catch((err) => { if (active) setLoadError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [restaurantId, page, retry])
  async function togglePublish(branch: RestaurantBranch) {
    if (saving.current) return
    saving.current = true; setBusy(true); setError(''); setNotice('')
    try {
      const { status } = await webApi.setPublished(branch.id, branch.status !== 'published')
      setItems((rows) => rows.map((row) => row.id === branch.id ? { ...row, status } : row))
      setNotice(status === 'published' ? `«${branch.name}» ya es visible para los clientes.` : `«${branch.name}» dejó de ser visible.`)
    } catch (err) { setError(err instanceof Error ? err.message : 'No pudimos cambiar la publicación.') }
    finally { saving.current = false; setBusy(false) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    setError(''); setNotice('')
    const result = branchInputSchema.safeParse(input)
    if (!result.success) { setError(result.error.issues[0]?.path[0] === 'phone' ? result.error.issues[0].message : 'Revisa nombre, departamento, municipio y dirección.'); return }
    saving.current = true; setBusy(true)
    try {
      if (editing) {
        const saved = await webApi.updateBranch(editing, result.data)
        setItems((rows) => rows.map((row) => row.id === saved.id ? saved : row))
        setEditing(null); setInput(empty); setNotice(`Sede «${saved.name}» actualizada.`)
      } else {
        requestId.current ||= crypto.randomUUID()
        const saved = await webApi.createBranch(restaurantId, requestId.current, result.data)
        requestId.current = null; setInput(empty); setPage(0); setRetry((v) => v + 1)
        setNotice(`Sede «${saved.name}» guardada como borrador privado.`)
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'No pudimos guardar la sede.') }
    finally { saving.current = false; setBusy(false) }
  }
  return <section className="rounded-[24px] border bg-white p-5 space-y-5">
    <Button variant="ghost" disabled={busy || panelOpen} onClick={onClose}>← Mis restaurantes</Button>
    <h2 className="text-xl font-semibold">Sedes del negocio</h2>
    <p className="text-sm text-muted-foreground">Cada sede tiene su propia dirección. Se guarda en privado. Puedes seleccionar la ubicación de cada sede.</p>
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    {loadError ? <div role="alert"><p>{loadError}</p><Button variant="outline" onClick={() => setRetry((v) => v + 1)}>Reintentar sedes</Button></div> : loading ? <p role="status">Cargando sedes…</p> : <>
      {items.length ? <ul className="space-y-3">{items.map((item) => <li key={item.id} className="rounded-xl border p-4"><h3 className="font-semibold">{item.name}</h3><p>{item.address}</p><p className="text-sm text-muted-foreground">{item.municipality}, {item.department}</p>{item.phone && <p className="text-sm"><a className="underline" href={phoneUrl(item.phone)}>{item.phone}</a>{item.whatsapp ? ' · WhatsApp' : ''}</p>}<p className="text-xs text-muted-foreground">{statusLabels[item.status]}</p><p className="text-sm">{item.latitude !== null && item.longitude !== null ? `Ubicación: ${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}` : 'Ubicación pendiente'}</p><div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" disabled={busy || panelOpen} onClick={() => setEditingLocation(item.id)}>Seleccionar ubicación</Button><Button variant="outline" disabled={busy || panelOpen} onClick={() => setEditingHours(item.id)}>Horario</Button><Button variant="outline" disabled={busy || panelOpen} onClick={() => { setEditing(item.id); setError(''); setInput({ name: item.name, department: item.department, municipality: item.municipality, address: item.address, phone: item.phone ?? '', whatsapp: item.whatsapp }); document.getElementById('branch-form')?.scrollIntoView({ behavior: 'smooth' }) }}>Editar datos</Button>{item.status !== 'inactive' && <Button variant={item.status === 'published' ? 'outline' : 'default'} disabled={busy || panelOpen || (item.status !== 'published' && item.latitude === null)} onClick={() => togglePublish(item)}>{item.status === 'published' ? 'Despublicar' : 'Publicar sede'}</Button>}</div>{item.status === 'draft' && item.latitude === null && <p className="text-xs text-muted-foreground">Guarda la ubicación para poder publicar.</p>}{item.opening_hours?.length ? <details className="mt-2 text-sm"><summary className="cursor-pointer">Ver horario</summary><ul>{describeHours(item.opening_hours).map((line) => <li key={line}>{line}</li>)}</ul></details> : <p className="text-xs text-muted-foreground">Horario pendiente</p>}{editingHours === item.id && <BranchHoursEditor branch={item} onClose={() => setEditingHours(null)} onSaved={(saved) => { setItems((rows) => rows.map((row) => row.id === saved.id ? saved : row)); setEditingHours(null); setNotice('Horario guardado.') }} />}{editingLocation === item.id && <BranchLocationEditor branch={item} onClose={() => setEditingLocation(null)} onSaved={(saved) => { setItems((rows) => rows.map((row) => row.id === saved.id ? saved : row)); setEditingLocation(null); setNotice('Ubicación guardada.'); }} />}</li>)}</ul> : <p>Aún no hay sedes en esta página.</p>}
      <div className="flex items-center gap-3"><Button variant="outline" disabled={page === 0 || busy || panelOpen} onClick={() => setPage((v) => v - 1)}>Anterior</Button><span>Página {page + 1}</span><Button variant="outline" disabled={!hasMore || busy || panelOpen} onClick={() => setPage((v) => v + 1)}>Siguiente</Button></div>
    </>}
    <form id="branch-form" onSubmit={submit} className="space-y-4"><h3 className="font-semibold">{editing ? 'Editar sede' : 'Añadir sede'}</h3>
      {(Object.keys(labels) as TextField[]).map((field) => <div key={field} className="space-y-2"><Label htmlFor={`branch-${field}`}>{labels[field]}</Label><Input id={`branch-${field}`} value={input[field]} required disabled={busy || panelOpen} minLength={field === 'address' ? 5 : 2} maxLength={field === 'address' ? 300 : 100} onChange={(e) => setInput((values) => ({ ...values, [field]: e.target.value }))}/></div>)}
      <div className="space-y-2"><Label htmlFor="branch-phone">Teléfono de la sede (opcional)</Label><Input id="branch-phone" type="tel" inputMode="tel" autoComplete="tel" value={input.phone} maxLength={20} disabled={busy || panelOpen} placeholder="Ej. 7765 4321" onChange={(e) => setInput((values) => ({ ...values, phone: e.target.value }))}/>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={input.whatsapp} disabled={busy || panelOpen} onChange={(e) => setInput((values) => ({ ...values, whatsapp: e.target.checked }))}/>Este número recibe mensajes de WhatsApp</label></div>
      {error && <p role="alert" className="text-red-700">{error}</p>}<div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || panelOpen}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar sede'}</Button>{editing && <Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(null); setInput(empty); setError('') }}>Cancelar edición</Button>}</div>
    </form>
  </section>
}
