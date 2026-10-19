import { useCallback, useEffect, useRef, useState } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { randomUUID } from 'expo-crypto'
import { api } from './api'
import { Switch, Text, View } from 'react-native'
import { branchInputSchema, type RestaurantBranch } from '../../shared/contracts/branches'
import { Action, Card, Field, Loading, Message, Title, colors } from './ui'
import { t, msg } from '../../shared/i18n'
type TextField = 'name' | 'department' | 'municipality' | 'address'
const empty = { name: '', department: '', municipality: '', address: '', phone: '', whatsapp: false }
const statusLabels: Record<RestaurantBranch['status'], string> = { draft: msg('Borrador privado'), published: msg('Publicada'), inactive: msg('Inactiva') }
const labels: Record<TextField, string> = { name: msg('Nombre de la sede'), department: msg('Departamento'), municipality: msg('Municipio'), address: msg('Dirección') }
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
    catch (e) { setError(e instanceof Error ? e.message : t('No pudimos cambiar la publicación.')) }
    finally { lock.current = false; setBusy(false) }
  }
  async function create() {
    if (lock.current) return
    const parsed = branchInputSchema.safeParse(form)
    if (!parsed.success) { setSaveError(parsed.error.issues[0]?.path[0] === 'phone' ? parsed.error.issues[0].message : t('Completa nombre, departamento, municipio y dirección.')); return }
    lock.current = true; setBusy(true); setSaveError('')
    try {
      if (editing) { await api.updateBranch(editing, parsed.data); setEditing(null) }
      else { requestId.current ||= randomUUID(); await api.createBranch(restaurantId, requestId.current, parsed.data); requestId.current = null; setPage(0) }
      setForm(empty); setRetry(v => v + 1)
    }
    catch (e) { setSaveError(e instanceof Error ? e.message : t('No pudimos guardar.')) }
    finally { lock.current = false; setBusy(false) }
  }
  return <><Title>{t('Sedes')}</Title><Message>{error}</Message>
    <Action title={t('Actualizar sedes')} secondary onPress={() => setRetry(v => v + 1)} disabled={loading || busy} />
    {loading ? <Loading /> : error ? null : rows.length ? rows.map(row => <Card key={row.id}><Title>{row.name}</Title><Message>{row.address}</Message><Message>{row.municipality}, {row.department}</Message><Message>{row.latitude === null ? t('Ubicación pendiente') : t('Ubicación guardada')} · {t(statusLabels[row.status])}</Message><Action title={t('Seleccionar ubicación en el mapa')} onPress={() => router.push({ pathname: '/location/[id]', params: { id: row.id } })} disabled={busy} /><Action title={row.opening_hours?.length ? t('Editar horario') : t('Agregar horario')} secondary onPress={() => router.push({ pathname: '/hours/[id]', params: { id: row.id } })} disabled={busy} /><Action title={t('Editar datos')} secondary onPress={() => { setEditing(row.id); setSaveError(''); setForm({ name: row.name, department: row.department, municipality: row.municipality, address: row.address, phone: row.phone ?? '', whatsapp: row.whatsapp }) }} disabled={busy} />{row.status === 'inactive' ? null : <Action title={row.status === 'published' ? t('Despublicar') : t('Publicar sede')} secondary onPress={() => togglePublish(row)} disabled={busy || (row.status !== 'published' && row.latitude === null)} />}{row.status === 'draft' && row.latitude === null ? <Message>{t('Guarda la ubicación para poder publicar.')}</Message> : null}</Card>) : <Message>{t('No hay sedes en esta página.')}</Message>}
    <Message>{t('Página')} {page + 1}</Message><Action title={t('Anterior')} secondary disabled={page === 0 || loading || busy} onPress={() => setPage(v => v - 1)} /><Action title={t('Siguiente')} secondary disabled={!more || loading || busy} onPress={() => setPage(v => v + 1)} />
    <Card><Title>{editing ? t('Editar sede') : t('Añadir sede')}</Title>{(Object.keys(labels) as TextField[]).map(key => <Field key={key} label={t(labels[key])} value={form[key]} onChangeText={value => setForm(v => ({ ...v, [key]: value }))} maxLength={key === 'address' ? 300 : 100} editable={!busy} />)}<Field label={t('Teléfono (opcional)')} value={form.phone} onChangeText={phone => setForm(v => ({ ...v, phone }))} keyboardType="phone-pad" maxLength={20} editable={!busy} placeholder={t('Ej. 7765 4321')} /><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: colors.green, fontSize: 16, flex: 1 }}>{t('Este número recibe WhatsApp')}</Text><Switch accessibilityLabel={t('Este número recibe WhatsApp')} value={form.whatsapp} onValueChange={whatsapp => setForm(v => ({ ...v, whatsapp }))} disabled={busy} /></View><Message>{saveError}</Message><Action title={busy ? t('Guardando…') : editing ? t('Guardar cambios') : t('Guardar sede')} onPress={create} disabled={busy} />{editing ? <Action title={t('Cancelar edición')} secondary onPress={() => { setEditing(null); setForm(empty); setSaveError('') }} disabled={busy} /> : null}</Card>
  </>
}
