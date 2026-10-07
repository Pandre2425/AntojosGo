import { useCallback, useEffect, useRef, useState } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { randomUUID } from 'expo-crypto'
import { api } from './api'
import { branchInputSchema, type BranchInput, type RestaurantBranch } from '../../shared/contracts/branches'
import { Action, Card, Field, Loading, Message, Title } from './ui'
const empty: BranchInput = { name: '', department: '', municipality: '', address: '' }
const statusLabels: Record<RestaurantBranch['status'], string> = { draft: 'Borrador privado', published: 'Publicada', inactive: 'Inactiva' }
const labels: Record<keyof BranchInput, string> = { name: 'Nombre de la sede', department: 'Departamento', municipality: 'Municipio', address: 'Dirección' }
export default function Branches({ restaurantId }: { restaurantId: string }) {
  const [rows, setRows] = useState<RestaurantBranch[]>([])
  const [form, setForm] = useState(empty)
  const [page, setPage] = useState(0)
  const [more, setMore] = useState(false)
  const [retry, setRetry] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const requestId = useRef<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  useEffect(() => {
    let active = true; setLoading(true); setError('')
    api.listBranches(restaurantId, page).then(data => { if (active) { setRows(data.items); setMore(data.hasMore) } }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [restaurantId, page, retry])
  // Reload when returning from the location editor so saved coordinates show up.
  const first = useRef(true)
  useFocusEffect(useCallback(() => { if (first.current) first.current = false; else setRetry(v => v + 1) }, []))
  async function togglePublish(row: RestaurantBranch) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await api.setPublished(row.id, row.status !== 'published'); setRetry(v => v + 1) }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos cambiar la publicación.') }
    finally { lock.current = false; setBusy(false) }
  }
  async function create() {
    if (lock.current) return
    const parsed = branchInputSchema.safeParse(form)
    if (!parsed.success) { setSaveError('Completa nombre, departamento, municipio y dirección.'); return }
    lock.current = true; setBusy(true); setSaveError('')
    try {
      if (editing) { await api.updateBranch(editing, parsed.data); setEditing(null) }
      else { requestId.current ||= randomUUID(); await api.createBranch(restaurantId, requestId.current, parsed.data); requestId.current = null; setPage(0) }
      setForm(empty); setRetry(v => v + 1)
    }
    catch (e) { setSaveError(e instanceof Error ? e.message : 'No pudimos guardar.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <><Title>Sedes</Title><Message>{error}</Message>
    <Action title="Actualizar sedes" secondary onPress={() => setRetry(v => v + 1)} disabled={loading || busy} />
    {loading ? <Loading /> : error ? null : rows.length ? rows.map(row => <Card key={row.id}><Title>{row.name}</Title><Message>{row.address}</Message><Message>{row.municipality}, {row.department}</Message><Message>{row.latitude === null ? 'Ubicación pendiente' : 'Ubicación guardada'} · {statusLabels[row.status]}</Message><Action title="Seleccionar ubicación en el mapa" onPress={() => router.push({ pathname: '/location/[id]', params: { id: row.id } })} disabled={busy} /><Action title="Editar datos" secondary onPress={() => { setEditing(row.id); setSaveError(''); setForm({ name: row.name, department: row.department, municipality: row.municipality, address: row.address }) }} disabled={busy} />{row.status === 'inactive' ? null : <Action title={row.status === 'published' ? 'Despublicar' : 'Publicar sede'} secondary onPress={() => togglePublish(row)} disabled={busy || (row.status !== 'published' && row.latitude === null)} />}{row.status === 'draft' && row.latitude === null ? <Message>Guarda la ubicación para poder publicar.</Message> : null}</Card>) : <Message>No hay sedes en esta página.</Message>}
    <Message>Página {page + 1}</Message><Action title="Anterior" secondary disabled={page === 0 || loading || busy} onPress={() => setPage(v => v - 1)} /><Action title="Siguiente" secondary disabled={!more || loading || busy} onPress={() => setPage(v => v + 1)} />
    <Card><Title>{editing ? 'Editar sede' : 'Añadir sede'}</Title>{(Object.keys(labels) as (keyof BranchInput)[]).map(key => <Field key={key} label={labels[key]} value={form[key]} onChangeText={value => setForm(v => ({ ...v, [key]: value }))} maxLength={key === 'address' ? 300 : 100} editable={!busy} />)}<Message>{saveError}</Message><Action title={busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar sede'} onPress={create} disabled={busy} />{editing ? <Action title="Cancelar edición" secondary onPress={() => { setEditing(null); setForm(empty); setSaveError('') }} disabled={busy} /> : null}</Card>
  </>
}
