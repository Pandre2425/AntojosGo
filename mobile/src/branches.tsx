import { useEffect, useRef, useState } from 'react'
import { router } from 'expo-router'
import { randomUUID } from 'expo-crypto'
import { createBranch, listBranches } from '../../modules/restaurants/data/branches'
import { branchInputSchema, type BranchInput, type RestaurantBranch } from '../../shared/contracts/branches'
import { Action, Card, Field, Loading, Message, Title } from './ui'
const empty: BranchInput = { name: '', department: '', municipality: '', address: '' }
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
  useEffect(() => {
    let active = true; setLoading(true); setError('')
    listBranches(restaurantId, page).then(data => { if (active) { setRows(data.items); setMore(data.hasMore) } }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [restaurantId, page, retry])
  async function create() {
    if (lock.current) return
    const parsed = branchInputSchema.safeParse(form)
    if (!parsed.success) { setSaveError('Completa nombre, departamento, municipio y dirección.'); return }
    lock.current = true; setBusy(true); setSaveError('')
    try { requestId.current ||= randomUUID(); await createBranch(restaurantId, requestId.current, parsed.data); requestId.current = null; setForm(empty); setPage(0); setRetry(v => v + 1) }
    catch (e) { setSaveError(e instanceof Error ? e.message : 'No pudimos guardar.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <><Title>Sedes</Title><Message>{error}</Message>
    <Action title="Actualizar sedes" secondary onPress={() => setRetry(v => v + 1)} disabled={loading || busy} />
    {loading ? <Loading /> : error ? null : rows.length ? rows.map(row => <Card key={row.id}><Title>{row.name}</Title><Message>{row.address}</Message><Message>{row.municipality}, {row.department}</Message><Message>{row.latitude === null ? 'Ubicación pendiente' : 'Ubicación guardada'} · Borrador privado</Message><Action title="Seleccionar ubicación en el mapa" onPress={() => router.push({ pathname: '/location/[id]', params: { id: row.id } })} disabled={busy} /></Card>) : <Message>No hay sedes en esta página.</Message>}
    <Message>Página {page + 1}</Message><Action title="Anterior" secondary disabled={page === 0 || loading || busy} onPress={() => setPage(v => v - 1)} /><Action title="Siguiente" secondary disabled={!more || loading || busy} onPress={() => setPage(v => v + 1)} />
    <Card><Title>Añadir sede</Title>{(Object.keys(labels) as (keyof BranchInput)[]).map(key => <Field key={key} label={labels[key]} value={form[key]} onChangeText={value => setForm(v => ({ ...v, [key]: value }))} maxLength={key === 'address' ? 300 : 100} editable={!busy} />)}<Message>{saveError}</Message><Action title={busy ? 'Guardando…' : 'Guardar sede'} onPress={create} disabled={busy} /></Card>
  </>
}
