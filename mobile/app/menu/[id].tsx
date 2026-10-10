import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../src/session'
import { Action, Card, Chip, Field, Loading, Message, Page, Title, colors } from '../../src/ui'
import { api } from '../../src/api'
import { pickAndUploadDishPhoto } from '../../src/dish-photo'
import { normalize } from '../../../shared/contracts/assistant'
import {
  ALLERGEN_LABELS, ALLERGENS, DISH_TAGS, DISH_TAG_LABELS, NO_ALLERGENS, allergenStatus, dishInputSchema, parseIngredients,
  type AllergenDeclaration, type Dish, type DishTag,
} from '../../../shared/contracts/menu'

const empty = { name: '', price: '', category: '', description: '', ingredients: '', tags: [] as DishTag[], allergens: [] as AllergenDeclaration[] }
const money = (v: number) => `Q${v.toFixed(2)}`
type Status = 'all' | 'visible' | 'hidden' | 'soldout'
const STATUS_LABELS: Record<Status, string> = { all: 'Todos', visible: 'Visibles', hidden: 'Ocultos', soldout: 'Agotados' }
const statusOf = (d: Dish): Exclude<Status, 'all'> => d.status !== 'published' ? 'hidden' : d.is_available ? 'visible' : 'soldout'
// The left edge of each card tells the owner what diners see.
const EDGE: Record<Exclude<Status, 'all'>, string> = { visible: colors.green, hidden: '#B9B4AA', soldout: colors.orange }
const STATUS_TEXT: Record<Exclude<Status, 'all'>, string> = { visible: 'Visible para clientes', hidden: 'Oculto', soldout: 'Agotado' }

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
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const lock = useRef(false)
  useEffect(() => {
    if (!session) return
    let active = true; setError(''); setRows(null)
    api.listDishes(id).then(data => { if (active) setRows(data) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [id, session?.user.id, retry])

  const counts = useMemo(() => {
    const c = { all: 0, visible: 0, hidden: 0, soldout: 0 }
    for (const d of rows ?? []) { c.all++; c[statusOf(d)]++ }
    return c
  }, [rows])
  // Search covers name, category, description and ingredients (accent-insensitive).
  const shown = useMemo(() => {
    const q = normalize(query)
    return (rows ?? []).filter(d => (status === 'all' || statusOf(d) === status)
      && (!q || normalize([d.name, d.category, d.description, ...(d.ingredients ?? [])].filter(Boolean).join(' ')).includes(q)))
  }, [rows, query, status])
  const undeclared = (rows ?? []).filter(d => !allergenStatus(d.allergens).declared).length

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
    const parsed = dishInputSchema.safeParse({ ...form, ingredients: parseIngredients(form.ingredients) })
    if (!parsed.success) { setFormError(parsed.error.issues[0].message); return }
    setFormError('')
    const ok = await run(() => editing ? api.updateDish(editing, parsed.data) : api.createDish(id, parsed.data), setFormError)
    if (ok) { setForm(empty); setEditing(null) }
  }
  function edit(dish: Dish) {
    setEditing(dish.id); setFormError(''); setExpanded(null)
    setForm({ name: dish.name, price: dish.price.toFixed(2), category: dish.category ?? '', description: dish.description ?? '',
      ingredients: (dish.ingredients ?? []).join(', '), tags: dish.tags ?? [], allergens: dish.allergens ?? [] })
  }
  const setAllergen = (a: AllergenDeclaration, on: boolean) => setForm(v => ({
    ...v, allergens: a === NO_ALLERGENS ? (on ? [NO_ALLERGENS] : []) : on ? [...v.allergens.filter(x => x !== NO_ALLERGENS), a] : v.allergens.filter(x => x !== a),
  }))

  return <Page><Title>Menú</Title><Message>{error}</Message>
    {!rows ? error ? <Action title="Reintentar" onPress={() => setRetry(v => v + 1)} /> : <Loading /> : rows.length === 0 ? <Message>Tu menú está vacío. Agrega tu primer platillo abajo.</Message> : <>
      {undeclared > 0 ? <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#B7791F', backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12 }}>
        <Text style={{ color: '#7C4A03' }}>{undeclared === 1 ? '1 platillo no tiene' : `${undeclared} platillos no tienen`} alérgenos declarados. Edítalos para que los clientes con alergias sepan qué pueden comer.</Text>
      </View> : null}
      <TextInput accessibilityLabel="Buscar en el menú" placeholder="Buscar por nombre o ingrediente" placeholderTextColor="#69746E" value={query} onChangeText={setQuery}
        style={{ backgroundColor: 'white', color: colors.green, borderWidth: 1, borderColor: '#B9C5BC', borderRadius: 12, padding: 12, minHeight: 48, fontSize: 16 }} />
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(STATUS_LABELS) as Status[]).map(s => <Chip key={s} label={`${STATUS_LABELS[s]} ${counts[s]}`} on={status === s} onPress={() => setStatus(s)} />)}
      </View>
      {shown.length === 0 ? <Message>Ningún platillo coincide con la búsqueda.</Message> : shown.map(dish => {
        const st = statusOf(dish)
        const al = allergenStatus(dish.allergens)
        const open = expanded === dish.id
        return <View key={dish.id} style={{ backgroundColor: 'white', borderRadius: 16, borderLeftWidth: 6, borderLeftColor: EDGE[st], padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {dish.image_url ? <Image source={{ uri: dish.image_url }} accessibilityLabel={`Foto de ${dish.name}`} style={{ width: 72, height: 72, borderRadius: 12 }} /> : null}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.green, fontSize: 18, fontWeight: '700' }}>{dish.name}</Text>
              <Text style={{ color: colors.green, fontSize: 16 }}>{money(dish.price)}{dish.category ? `  ${dish.category}` : ''}</Text>
              <Text style={{ color: EDGE[st] === '#B9B4AA' ? '#6B6760' : EDGE[st], fontWeight: '600' }}>{STATUS_TEXT[st]}</Text>
            </View>
          </View>
          {dish.ingredients?.length ? <Text style={{ color: '#4B5A52' }}>Ingredientes: {dish.ingredients.join(', ')}</Text> : null}
          <Text style={{ color: al.declared ? (al.contains.length ? '#9A3A18' : colors.green) : '#7C4A03' }}>
            {!al.declared ? 'Alérgenos sin declarar' : al.contains.length ? `Contiene: ${al.contains.map(a => ALLERGEN_LABELS[a].toLowerCase()).join(', ')}` : 'Sin alérgenos comunes'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Action title={dish.status === 'published' ? 'Ocultar' : 'Mostrar'} secondary={dish.status === 'published'} disabled={busy}
              onPress={() => run(() => api.updateDish(dish.id, { status: dish.status === 'published' ? 'draft' : 'published' }), setError)} /></View>
            <View style={{ flex: 1 }}><Action title="Editar" secondary disabled={busy} onPress={() => edit(dish)} /></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : dish.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.green, textDecorationLine: 'underline', fontSize: 15 }}>{open ? 'Menos opciones' : 'Más opciones'}</Text>
          </Pressable>
          {open ? <View style={{ gap: 8 }}>
            <Action title={dish.is_available ? 'Marcar agotado' : 'Marcar disponible'} secondary disabled={busy}
              onPress={() => run(() => api.updateDish(dish.id, { is_available: !dish.is_available }), setError)} />
            <Action title={dish.image_url ? 'Cambiar foto' : 'Subir foto'} secondary disabled={busy} onPress={() => run(() => pickAndUploadDishPhoto(dish.id), setError)} />
            {dish.image_url ? <Action title="Quitar foto" secondary disabled={busy} onPress={() => run(() => api.removeDishImage(dish.id), setError)} /> : null}
            <Action title="Eliminar" disabled={busy} onPress={() => Alert.alert('Eliminar platillo', `¿Eliminar «${dish.name}»? No se puede deshacer.`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => void run(() => api.deleteDish(dish.id), setError) }])} />
          </View> : null}
        </View>
      })}
    </>}
    <Card>
      <Title>{editing ? 'Editar platillo' : 'Nuevo platillo'}</Title>
      <Field label="Nombre" value={form.name} onChangeText={name => setForm(v => ({ ...v, name }))} maxLength={120} editable={!busy} />
      <Field label="Precio (Q)" value={form.price} onChangeText={price => setForm(v => ({ ...v, price }))} keyboardType="decimal-pad" maxLength={9} editable={!busy} />
      <Field label="Categoría (opcional)" value={form.category} onChangeText={category => setForm(v => ({ ...v, category }))} maxLength={60} editable={!busy} />
      <Field label="Descripción (opcional)" value={form.description} onChangeText={description => setForm(v => ({ ...v, description }))} maxLength={500} multiline editable={!busy} />
      <Field label="Ingredientes principales (separados por comas)" value={form.ingredients} onChangeText={ingredients => setForm(v => ({ ...v, ingredients }))} placeholder="pollo, pepita, chile pasa" multiline editable={!busy} />
      <Text style={{ color: colors.green, fontSize: 16, fontWeight: '600' }}>Alérgenos</Text>
      <Text style={{ color: '#4B5A52' }}>Marca lo que contiene, o «No contiene ninguno». Sin marcar, los clientes verán «alérgenos sin declarar».</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ALLERGENS.map(a => <Chip key={a} tone="red" label={ALLERGEN_LABELS[a]} on={form.allergens.includes(a)} disabled={busy} onPress={() => setAllergen(a, !form.allergens.includes(a))} />)}
        <Chip label="No contiene ninguno" on={form.allergens.includes(NO_ALLERGENS)} disabled={busy} onPress={() => setAllergen(NO_ALLERGENS, !form.allergens.includes(NO_ALLERGENS))} />
      </View>
      <Text style={{ color: colors.green, fontSize: 16, fontWeight: '600' }}>Etiquetas (ayudan a que te encuentren)</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{DISH_TAGS.map(tag => <Chip key={tag} label={DISH_TAG_LABELS[tag]} on={form.tags.includes(tag)} disabled={busy}
        onPress={() => setForm(v => ({ ...v, tags: v.tags.includes(tag) ? v.tags.filter(t => t !== tag) : [...v.tags, tag] }))} />)}</View>
      <Message>{formError}</Message>
      <Action title={busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar platillo'} onPress={save} disabled={busy} />
      {editing ? <Action title="Cancelar edición" secondary onPress={() => { setEditing(null); setForm(empty); setFormError('') }} disabled={busy} /> : null}
    </Card>
  </Page>
}
