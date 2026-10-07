import { useEffect, useRef, useState } from 'react'
import { Alert, Image } from 'react-native'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../src/session'
import { Action, Card, Field, Loading, Message, Page, Title } from '../../src/ui'
import { api } from '../../src/api'
import { pickAndUploadDishPhoto } from '../../src/dish-photo'
import { dishInputSchema, type Dish } from '../../../shared/contracts/menu'

const empty = { name: '', price: '', category: '', description: '' }
const money = (v: number) => `Q${v.toFixed(2)}`

export default function Menu() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, ready } = useSession()
  const [rows, setRows] = useState<Dish[] | null>(null)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  useEffect(() => {
    if (!session) return
    let active = true; setError(''); setRows(null)
    api.listDishes(id).then(data => { if (active) setRows(data) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [id, session?.user.id, retry])
  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/" />

  async function run(action: () => Promise<unknown>, onError: (m: string) => void) {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try { await action(); setRetry(v => v + 1); return true }
    catch (e) { onError(e instanceof Error ? e.message : 'No pudimos guardar.') }
    finally { lock.current = false; setBusy(false) }
  }
  async function save() {
    const parsed = dishInputSchema.safeParse(form)
    if (!parsed.success) { setFormError(parsed.error.issues[0].message); return }
    setFormError('')
    const ok = await run(() => editing ? api.updateDish(editing, parsed.data) : api.createDish(id, parsed.data), setFormError)
    if (ok) { setForm(empty); setEditing(null) }
  }
  function edit(dish: Dish) {
    setEditing(dish.id); setFormError('')
    setForm({ name: dish.name, price: dish.price.toFixed(2), category: dish.category ?? '', description: dish.description ?? '' })
  }

  return <Page><Title>Menú</Title><Message>{error}</Message>
    {!rows ? error ? <Action title="Reintentar" onPress={() => setRetry(v => v + 1)} /> : <Loading /> : rows.length ? rows.map(dish => <Card key={dish.id}>
      {dish.image_url ? <Image source={{ uri: dish.image_url }} accessibilityLabel={`Foto de ${dish.name}`} style={{ width: '100%', height: 160, borderRadius: 16 }} /> : null}
      <Title>{dish.name}</Title>
      <Message>{[money(dish.price), dish.category].filter(Boolean).join(' · ')}</Message>
      <Message>{dish.description}</Message>
      <Message>{dish.status === 'published' ? 'Visible en el menú' : 'Oculto'}{dish.is_available ? '' : ' · Agotado'}</Message>
      <Action title="Editar" secondary onPress={() => edit(dish)} disabled={busy} />
      <Action title={dish.status === 'published' ? 'Ocultar' : 'Mostrar en el menú'} secondary disabled={busy}
        onPress={() => run(() => api.updateDish(dish.id, { status: dish.status === 'published' ? 'draft' : 'published' }), setError)} />
      <Action title={dish.is_available ? 'Marcar agotado' : 'Marcar disponible'} secondary disabled={busy}
        onPress={() => run(() => api.updateDish(dish.id, { is_available: !dish.is_available }), setError)} />
      <Action title={dish.image_url ? 'Cambiar foto' : 'Subir foto'} secondary disabled={busy} onPress={() => run(() => pickAndUploadDishPhoto(dish.id), setError)} />
      {dish.image_url ? <Action title="Quitar foto" secondary disabled={busy} onPress={() => run(() => api.removeDishImage(dish.id), setError)} /> : null}
      <Action title="Eliminar" disabled={busy} onPress={() => Alert.alert('Eliminar platillo', `¿Eliminar «${dish.name}»? No se puede deshacer.`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => void run(() => api.deleteDish(dish.id), setError) }])} />
    </Card>) : <Message>Aún no hay platillos. Agrega el primero.</Message>}
    <Card>
      <Title>{editing ? 'Editar platillo' : 'Nuevo platillo'}</Title>
      <Field label="Nombre" value={form.name} onChangeText={name => setForm(v => ({ ...v, name }))} maxLength={120} editable={!busy} />
      <Field label="Precio (Q)" value={form.price} onChangeText={price => setForm(v => ({ ...v, price }))} keyboardType="decimal-pad" maxLength={9} editable={!busy} />
      <Field label="Categoría (opcional)" value={form.category} onChangeText={category => setForm(v => ({ ...v, category }))} maxLength={60} editable={!busy} />
      <Field label="Descripción (opcional)" value={form.description} onChangeText={description => setForm(v => ({ ...v, description }))} maxLength={500} multiline editable={!busy} />
      <Message>{formError}</Message>
      <Action title={busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar platillo'} onPress={save} disabled={busy} />
      {editing ? <Action title="Cancelar edición" secondary onPress={() => { setEditing(null); setForm(empty); setFormError('') }} disabled={busy} /> : null}
    </Card>
  </Page>
}
