import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Image, Pressable, Switch, Text, View } from 'react-native'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../src/session'
import { Action, Card, Chip, Field, Input, Loading, Message, Page, Title, Txt, colors, radius, spacing, type } from '../../src/ui'
import { api } from '../../src/api'
import { pickAndUploadDishPhoto, pickPhoto, uploadDishPhoto } from '../../src/dish-photo'
import { normalize } from '../../../shared/contracts/assistant'
import {
  ALLERGEN_LABELS, ALLERGENS, DISH_CATEGORY_GROUPS, MAX_CATEGORIES, NO_ALLERGENS, allergenStatus, dishCategories, dishInputSchema,
  formatPriceInput, ingredientProblem, type AllergenDeclaration, type Dish,
} from '../../../shared/contracts/menu'

const empty = { name: '', price: '', description: '', categories: [] as string[], ingredients: [] as string[], hasAllergens: false, allergens: [] as AllergenDeclaration[] }
type Photo = Awaited<ReturnType<typeof pickPhoto>>
const known = new Set(DISH_CATEGORY_GROUPS.flatMap(g => g.options.map(o => o.label.toLowerCase())))
const money = (v: number) => `Q${v.toFixed(2)}`
type Status = 'all' | 'visible' | 'hidden' | 'soldout'
const STATUS_LABELS: Record<Status, string> = { all: 'Todos', visible: 'Visibles', hidden: 'Ocultos', soldout: 'Agotados' }
const statusOf = (d: Dish): Exclude<Status, 'all'> => d.status !== 'published' ? 'hidden' : d.is_available ? 'visible' : 'soldout'
// The left edge of each card tells the owner what diners see.
const EDGE: Record<Exclude<Status, 'all'>, string> = { visible: colors.green, hidden: colors.inactive, soldout: colors.orange }
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
  const [newCategory, setNewCategory] = useState('')
  const [newIngredient, setNewIngredient] = useState('')
  const [photo, setPhoto] = useState<Photo>(null)
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null)
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
      && (!q || normalize([d.name, d.category, ...(d.categories ?? []), d.description, ...(d.ingredients ?? [])].filter(Boolean).join(' ')).includes(q)))
  }, [rows, query, status])
  const undeclared = (rows ?? []).filter(d => !allergenStatus(d.allergens).declared).length

  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/account" />

  async function run(action: () => Promise<unknown>, onError: (m: string) => void) {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try { await action(); setRetry(v => v + 1); return true }
    catch (e) { onError(e instanceof Error ? e.message : 'No pudimos guardar.') }
    finally { lock.current = false; setBusy(false) }
  }
  async function save() {
    const parsed = dishInputSchema.safeParse({ name: form.name, price: form.price, description: form.description, categories: form.categories,
      ingredients: form.ingredients, allergens: form.hasAllergens ? form.allergens.filter(a => a !== NO_ALLERGENS) : form.allergens })
    if (!parsed.success) { setFormError(parsed.error.issues[0].message); return }
    if (form.hasAllergens && !parsed.data.allergens?.length) { setFormError('Marca qué alérgenos contiene, o apaga «Contiene alérgenos».'); return }
    setFormError('')
    const ok = await run(async () => {
      const saved = editing ? await api.updateDish(editing, parsed.data) : await api.createDish(id, parsed.data)
      if (photo) await uploadDishPhoto(saved.id, photo).catch(() => { throw new Error('El platillo se guardó, pero la foto no se pudo subir. Súbela desde «Más opciones».') })
    }, setFormError)
    if (ok) resetForm()
  }
  function resetForm() { setForm(empty); setEditing(null); setPhoto(null); setCurrentPhoto(null); setNewCategory(''); setNewIngredient('') }
  function edit(dish: Dish) {
    setEditing(dish.id); setFormError(''); setExpanded(null); setPhoto(null); setCurrentPhoto(dish.image_url)
    const allergens = dish.allergens ?? []
    setForm({ name: dish.name, price: dish.price.toFixed(2), description: dish.description ?? '', categories: dishCategories(dish),
      ingredients: dish.ingredients ?? [], hasAllergens: allergenStatus(allergens).contains.length > 0, allergens })
  }
  const hasCategory = (c: string) => form.categories.some(x => x.toLowerCase() === c.toLowerCase())
  function toggleCategory(c: string) {
    if (!hasCategory(c) && form.categories.length >= MAX_CATEGORIES) { setFormError(`Elige hasta ${MAX_CATEGORIES} categorías.`); return }
    setFormError('')
    setForm(v => ({ ...v, categories: hasCategory(c) ? v.categories.filter(x => x.toLowerCase() !== c.toLowerCase()) : [...v.categories, c] }))
  }
  function addCategory() {
    const c = newCategory.trim().replace(/\s+/g, ' ')
    if (c.length < 2 || c.length > 30 || /[,;]/.test(c)) { setFormError('Escribe una categoría a la vez, de 2 a 30 letras.'); return }
    if (!hasCategory(c)) toggleCategory(c)
    setNewCategory('')
  }
  function addIngredient() {
    const problem = ingredientProblem(newIngredient, form.ingredients)
    if (problem) { setFormError(problem); return }
    setFormError(''); setForm(v => ({ ...v, ingredients: [...v.ingredients, newIngredient.trim().replace(/\s+/g, ' ')] })); setNewIngredient('')
  }
  const customCategories = form.categories.filter(c => !known.has(c.toLowerCase()))

  return <Page><Title>Menú</Title><Message>{error}</Message>
    {!rows ? error ? <Action title="Reintentar" onPress={() => setRetry(v => v + 1)} /> : <Loading /> : rows.length === 0 ? <Message>Tu menú está vacío. Agrega tu primer platillo abajo.</Message> : <>
      {undeclared > 0 ? <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.warning.border, backgroundColor: colors.warning.bg, borderRadius: radius.sm, padding: spacing.md }}>
        <Text style={{ color: colors.warning.text }}>{undeclared === 1 ? '1 platillo no tiene' : `${undeclared} platillos no tienen`} alérgenos declarados. Edítalos para que los clientes con alergias sepan qué pueden comer.</Text>
      </View> : null}
      <Input accessibilityLabel="Buscar en el menú" placeholder="Buscar por nombre o ingrediente" value={query} onChangeText={setQuery} />
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(STATUS_LABELS) as Status[]).map(s => <Chip key={s} label={`${STATUS_LABELS[s]} ${counts[s]}`} on={status === s} onPress={() => setStatus(s)} />)}
      </View>
      {shown.length === 0 ? <Message>Ningún platillo coincide con la búsqueda.</Message> : shown.map(dish => {
        const st = statusOf(dish)
        const al = allergenStatus(dish.allergens)
        const open = expanded === dish.id
        return <View key={dish.id} style={{ backgroundColor: colors.white, borderRadius: radius.lg, borderLeftWidth: 6, borderLeftColor: EDGE[st], padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {dish.image_url ? <Image source={{ uri: dish.image_url }} accessibilityLabel={`Foto de ${dish.name}`} style={{ width: 72, height: 72, borderRadius: 12 }} /> : null}
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="headline">{dish.name}</Txt>
              <Txt>{money(dish.price)}{dish.category ? `  ${dish.category}` : ''}</Txt>
              <Text style={{ color: st === 'hidden' ? colors.muted : EDGE[st], fontWeight: '600' }}>{STATUS_TEXT[st]}</Text>
            </View>
          </View>
          {dish.ingredients?.length ? <Text style={{ color: colors.muted }}>Ingredientes: {dish.ingredients.join(', ')}</Text> : null}
          <Text style={{ color: al.declared ? (al.contains.length ? colors.danger : colors.green) : colors.warning.text }}>
            {!al.declared ? 'Alérgenos sin declarar' : al.contains.length ? `Contiene: ${al.contains.map(a => ALLERGEN_LABELS[a].toLowerCase()).join(', ')}` : 'Sin alérgenos comunes'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Action title={dish.status === 'published' ? 'Ocultar' : 'Mostrar'} secondary={dish.status === 'published'} disabled={busy}
              onPress={() => run(() => api.updateDish(dish.id, { status: dish.status === 'published' ? 'draft' : 'published' }), setError)} /></View>
            <View style={{ flex: 1 }}><Action title="Editar" secondary disabled={busy} onPress={() => edit(dish)} /></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : dish.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={[type.body, { textDecorationLine: 'underline' }]}>{open ? 'Menos opciones' : 'Más opciones'}</Text>
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
      <Field label="Nombre" placeholder="Ej. Pepián de pollo" value={form.name} onChangeText={name => setForm(v => ({ ...v, name }))} maxLength={120} editable={!busy} />
      <View style={{ gap: 6 }}>
        <Txt>Precio</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Txt variant="headline">Q</Txt>
          <Input accessibilityLabel="Precio en quetzales" placeholder="45.00" value={form.price} keyboardType="decimal-pad" maxLength={9} editable={!busy} style={{ flex: 1 }}
            onChangeText={price => setForm(v => ({ ...v, price: price.replace(/[^0-9.,]/g, '') }))} onBlur={() => setForm(v => ({ ...v, price: formatPriceInput(v.price) }))} />
        </View>
        <Txt variant="subhead">Solo el número, en quetzales.</Txt>
      </View>
      <View style={{ gap: 6 }}>
        <Txt>Descripción (opcional)</Txt>
        <Input accessibilityLabel="Descripción" placeholder="Cómo se prepara, con qué se acompaña, tamaño de la porción…" value={form.description} maxLength={500} multiline
          textAlignVertical="top" editable={!busy} style={{ minHeight: 120 }} onChangeText={description => setForm(v => ({ ...v, description }))} />
        <Txt variant="subhead" style={{ textAlign: 'right' }}>{form.description.length}/500</Txt>
      </View>

      <Txt variant="label">Foto (opcional)</Txt>
      {photo || currentPhoto ? <Image source={{ uri: photo?.uri ?? currentPhoto! }} accessibilityLabel="Foto del platillo" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md }} /> : null}
      <Action title={photo || currentPhoto ? 'Cambiar foto' : 'Elegir foto'} secondary disabled={busy}
        onPress={() => void pickPhoto([4, 3]).then(a => { if (a) setPhoto(a) }).catch(() => setFormError('No pudimos abrir la galería.'))} />
      {photo ? <Txt variant="subhead">La foto se subirá al guardar.</Txt> : null}

      <Txt variant="label">Categorías</Txt>
      <Txt variant="subhead">Elige todas las que apliquen. Ayudan a que te encuentren.</Txt>
      {DISH_CATEGORY_GROUPS.map(g => <View key={g.title} style={{ gap: 6 }}>
        <Txt variant="subhead" style={{ fontWeight: '600' }}>{g.title}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{g.options.map(o => <Chip key={o.label} label={o.label} on={hasCategory(o.label)} disabled={busy} onPress={() => toggleCategory(o.label)} />)}</View>
      </View>)}
      {customCategories.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{customCategories.map(c => <Chip key={c} label={`${c} ×`} on disabled={busy} onPress={() => toggleCategory(c)} />)}</View> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Input accessibilityLabel="Otra categoría" placeholder="¿No está? Escríbela" value={newCategory} onChangeText={setNewCategory} maxLength={30} editable={!busy}
          returnKeyType="done" onSubmitEditing={addCategory} style={{ flex: 1 }} />
        <Action title="Agregar" secondary disabled={busy || !newCategory.trim()} onPress={addCategory} />
      </View>

      <Txt variant="label">Ingredientes principales (opcional)</Txt>
      <Txt variant="subhead">Agrega un ingrediente a la vez. Los clientes pueden buscar por ingrediente o pedir platillos sin alguno.</Txt>
      {form.ingredients.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{form.ingredients.map(i => <Chip key={i} label={`${i} ×`} on disabled={busy}
        onPress={() => setForm(v => ({ ...v, ingredients: v.ingredients.filter(x => x !== i) }))} />)}</View> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Input accessibilityLabel="Ingrediente" placeholder="Ej. pollo" value={newIngredient} onChangeText={setNewIngredient} maxLength={40} editable={!busy}
          returnKeyType="done" onSubmitEditing={addIngredient} style={{ flex: 1 }} />
        <Action title="Agregar" secondary disabled={busy || !newIngredient.trim()} onPress={addIngredient} />
      </View>

      <Txt variant="label">Alérgenos</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <Txt style={{ flex: 1 }}>Contiene alérgenos</Txt>
        <Switch value={form.hasAllergens} disabled={busy} accessibilityLabel="Contiene alérgenos" trackColor={{ true: colors.orange, false: colors.border }} thumbColor={colors.white}
          onValueChange={on => setForm(v => ({ ...v, hasAllergens: on, allergens: on ? v.allergens.filter(a => a !== NO_ALLERGENS) : [] }))} />
      </View>
      {form.hasAllergens
        ? <><Txt variant="subhead">Marca todos los que puede contener:</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ALLERGENS.map(a => <Chip key={a} tone="red" label={ALLERGEN_LABELS[a]} on={form.allergens.includes(a)} disabled={busy}
            onPress={() => setForm(v => ({ ...v, allergens: v.allergens.includes(a) ? v.allergens.filter(x => x !== a) : [...v.allergens, a] }))} />)}</View></>
        : <><Chip label="Confirmo: no contiene alérgenos comunes" on={form.allergens.includes(NO_ALLERGENS)} disabled={busy}
            onPress={() => setForm(v => ({ ...v, allergens: v.allergens.includes(NO_ALLERGENS) ? [] : [NO_ALLERGENS] }))} />
          <Txt variant="subhead">Si no lo confirmas, los clientes verán «alérgenos sin declarar».</Txt></>}

      <Message>{formError}</Message>
      <Action title={busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar platillo'} onPress={save} disabled={busy} />
      {editing ? <Action title="Cancelar edición" secondary onPress={() => { resetForm(); setFormError('') }} disabled={busy} /> : null}
    </Card>
  </Page>
}
