'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { webApi } from '@/lib/web-api'
import { branchInputSchema, type BranchInput, type RestaurantBranch } from '@/shared/contracts/branches'
import BranchLocationEditor from './branch-location-editor'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

const empty: BranchInput = { name: '', department: '', municipality: '', address: '' }
const statusLabels: Record<RestaurantBranch['status'], string> = { draft: 'Borrador privado', published: 'Publicada · visible para clientes', inactive: 'Suspendida por AntojosGo' }
const labels: Record<keyof BranchInput, string> = { name: 'Nombre de la sede', department: 'Departamento', municipality: 'Municipio', address: 'Dirección' }
export default function RestaurantBranches({ restaurantId, onClose }: { restaurantId: string; onClose: () => void }) {
  const [editingLocation, setEditingLocation] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
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
    if (!result.success) { setError('Revisa nombre, departamento, municipio y dirección.'); return }
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
    <Button variant="ghost" disabled={busy || editingLocation !== null} onClick={onClose}>← Mis restaurantes</Button>
    <h2 className="text-xl font-semibold">Sedes del negocio</h2>
    <p className="text-sm text-muted-foreground">Cada sede tiene su propia dirección. Se guarda en privado. Puedes seleccionar la ubicación de cada sede.</p>
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    {loadError ? <div role="alert"><p>{loadError}</p><Button variant="outline" onClick={() => setRetry((v) => v + 1)}>Reintentar sedes</Button></div> : loading ? <p role="status">Cargando sedes…</p> : <>
      {items.length ? <ul className="space-y-3">{items.map((item) => <li key={item.id} className="rounded-xl border p-4"><h3 className="font-semibold">{item.name}</h3><p>{item.address}</p><p className="text-sm text-muted-foreground">{item.municipality}, {item.department}</p><p className="text-xs text-muted-foreground">{statusLabels[item.status]}</p><p className="text-sm">{item.latitude !== null && item.longitude !== null ? `Ubicación: ${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}` : 'Ubicación pendiente'}</p><div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" disabled={busy || editingLocation !== null} onClick={() => setEditingLocation(item.id)}>Seleccionar ubicación</Button><Button variant="outline" disabled={busy || editingLocation !== null} onClick={() => { setEditing(item.id); setError(''); setInput({ name: item.name, department: item.department, municipality: item.municipality, address: item.address }); document.getElementById('branch-form')?.scrollIntoView({ behavior: 'smooth' }) }}>Editar datos</Button>{item.status !== 'inactive' && <Button variant={item.status === 'published' ? 'outline' : 'default'} disabled={busy || editingLocation !== null || (item.status !== 'published' && item.latitude === null)} onClick={() => togglePublish(item)}>{item.status === 'published' ? 'Despublicar' : 'Publicar sede'}</Button>}</div>{item.status === 'draft' && item.latitude === null && <p className="text-xs text-muted-foreground">Guarda la ubicación para poder publicar.</p>}{editingLocation === item.id && <BranchLocationEditor branch={item} onClose={() => setEditingLocation(null)} onSaved={(saved) => { setItems((rows) => rows.map((row) => row.id === saved.id ? saved : row)); setEditingLocation(null); setNotice('Ubicación guardada.'); }} />}</li>)}</ul> : <p>Aún no hay sedes en esta página.</p>}
      <div className="flex items-center gap-3"><Button variant="outline" disabled={page === 0 || busy || editingLocation !== null} onClick={() => setPage((v) => v - 1)}>Anterior</Button><span>Página {page + 1}</span><Button variant="outline" disabled={!hasMore || busy || editingLocation !== null} onClick={() => setPage((v) => v + 1)}>Siguiente</Button></div>
    </>}
    <form id="branch-form" onSubmit={submit} className="space-y-4"><h3 className="font-semibold">{editing ? 'Editar sede' : 'Añadir sede'}</h3>
      {(Object.keys(labels) as (keyof BranchInput)[]).map((field) => <div key={field} className="space-y-2"><Label htmlFor={`branch-${field}`}>{labels[field]}</Label><Input id={`branch-${field}`} value={input[field]} required disabled={busy || editingLocation !== null} minLength={field === 'address' ? 5 : 2} maxLength={field === 'address' ? 300 : 100} onChange={(e) => setInput((values) => ({ ...values, [field]: e.target.value }))}/></div>)}
      {error && <p role="alert" className="text-red-700">{error}</p>}<div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || editingLocation !== null}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar sede'}</Button>{editing && <Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(null); setInput(empty); setError('') }}>Cancelar edición</Button>}</div>
    </form>
  </section>
}
