import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Image, Pressable, Switch, Text, View } from 'react-native'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../src/session'
import { Action, Card, Chip, Field, Input, Loading, Message, Page, Title, Txt, colors, radius, spacing, type } from '../../src/ui'
import { api } from '../../src/api'
import { pickAndUploadDishPhoto, pickPhoto, uploadDishPhoto } from '../../src/dish-photo'
import { TagField } from '../../src/tag-field'
import { normalize } from '../../../shared/contracts/assistant'
import {
  ALLERGEN_LABELS, ALLERGENS, DISH_DETAIL_GROUPS, NO_ALLERGENS, allergenNames, allergenStatus, dishDetails, dishInputSchema,
  formatPriceInput, ingredientProblem, labelProblem, splitAllergenLabels, type DetailKey, type Dish,
} from '../../../shared/contracts/menu'
import { t, msg } from '../../../shared/i18n'

const empty = { name: '', price: '', description: '', dish_types: [] as string[], cuisines: [] as string[], features: [] as string[],
  ingredients: [] as string[], hasAllergens: false, allergenLabels: [] as string[], noAllergens: false }
type Photo = Awaited<ReturnType<typeof pickPhoto>>
const money = (v: number) => `Q${v.toFixed(2)}`
type Status = 'all' | 'visible' | 'hidden' | 'soldout'
const STATUS_LABELS: Record<Status, string> = { all: msg('Todos'), visible: msg('Visibles'), hidden: msg('Ocultos'), soldout: msg('Agotados') }
const statusOf = (d: Dish): Exclude<Status, 'all'> => d.status !== 'published' ? 'hidden' : d.is_available ? 'visible' : 'soldout'
// The left edge of each card tells the owner what diners see.
const EDGE: Record<Exclude<Status, 'all'>, string> = { visible: colors.green, hidden: colors.inactive, soldout: colors.orange }
const STATUS_TEXT: Record<Exclude<Status, 'all'>, string> = { visible: msg('Visible para clientes'), hidden: msg('Oculto'), soldout: msg('Agotado') }

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
  const undeclared = (rows ?? []).filter(d => !allergenStatus(d.allergens, d.allergens_other).declared).length

  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/account" />

  async function run(action: () => Promise<unknown>, onError: (m: string) => void) {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try { await action(); setRetry(v => v + 1); return true }
    catch (e) { onError(e instanceof Error ? e.message : t('No pudimos guardar.')) }
    finally { lock.current = false; setBusy(false) }
  }
  async function save() {
    const own = splitAllergenLabels(form.allergenLabels)
    const parsed = dishInputSchema.safeParse({ name: form.name, price: form.price, description: form.description,
      dish_types: form.dish_types, cuisines: form.cuisines, features: form.features, ingredients: form.ingredients,
      allergens: form.hasAllergens ? own.allergens : form.noAllergens ? [NO_ALLERGENS] : [], allergens_other: form.hasAllergens ? own.allergens_other : [] })
    if (!parsed.success) { setFormError(parsed.error.issues[0].message); return }
    if (form.hasAllergens && !form.allergenLabels.length) { setFormError(t('Marca o escribe qué alérgenos contiene, o apaga «Contiene alérgenos».')); return }
    setFormError('')
    const ok = await run(async () => {
      const saved = editing ? await api.updateDish(editing, parsed.data) : await api.createDish(id, parsed.data)
      if (photo) await uploadDishPhoto(saved.id, photo).catch((e: unknown) => { throw new Error(t('El platillo se guardó, pero la foto no se pudo subir ({reason}). Súbela desde «Más opciones».', { reason: e instanceof Error ? e.message : t('error desconocido') })) })
    }, setFormError)
    if (ok) resetForm()
  }
  function resetForm() { setForm(empty); setEditing(null); setPhoto(null); setCurrentPhoto(null) }
  function edit(dish: Dish) {
    setEditing(dish.id); setFormError(''); setExpanded(null); setPhoto(null); setCurrentPhoto(dish.image_url)
    const labels = allergenNames(dish.allergens, dish.allergens_other)
    setForm({ name: dish.name, price: dish.price.toFixed(2), description: dish.description ?? '', ...dishDetails(dish),
      ingredients: dish.ingredients ?? [], hasAllergens: labels.length > 0, allergenLabels: labels, noAllergens: (dish.allergens ?? []).includes(NO_ALLERGENS) })
  }
  const setGroup = (key: DetailKey) => (next: string[]) => setForm(v => ({ ...v, [key]: next }))
  const setAllergensOn = (on: boolean) => setForm(v => ({ ...v, hasAllergens: on, noAllergens: false, allergenLabels: on ? v.allergenLabels : [] }))

  return <Page><Title>{t('Menú')}</Title><Message>{error}</Message>
    {!rows ? error ? <Action title={t('Reintentar')} onPress={() => setRetry(v => v + 1)} /> : <Loading /> : rows.length === 0 ? <Message>{t('Tu menú está vacío. Agrega tu primer platillo abajo.')}</Message> : <>
      {undeclared > 0 ? <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.warning.border, backgroundColor: colors.warning.bg, borderRadius: radius.sm, padding: spacing.md }}>
        <Text style={{ color: colors.warning.text }}>{undeclared === 1 ? t('1 platillo no tiene') : `${undeclared} platillos no tienen`} {t('alérgenos declarados. Edítalos para que los clientes con alergias sepan qué pueden comer.')}</Text>
      </View> : null}
      <Input accessibilityLabel={t('Buscar en el menú')} placeholder={t('Buscar por nombre o ingrediente')} value={query} onChangeText={setQuery} />
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(STATUS_LABELS) as Status[]).map(s => <Chip key={s} label={`${t(STATUS_LABELS[s])} ${counts[s]}`} on={status === s} onPress={() => setStatus(s)} />)}
      </View>
      {shown.length === 0 ? <Message>{t('Ningún platillo coincide con la búsqueda.')}</Message> : shown.map(dish => {
        const st = statusOf(dish)
        const al = allergenStatus(dish.allergens, dish.allergens_other)
        const names = allergenNames(dish.allergens, dish.allergens_other)
        const open = expanded === dish.id
        return <View key={dish.id} style={{ backgroundColor: colors.white, borderRadius: radius.lg, borderLeftWidth: 6, borderLeftColor: EDGE[st], padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {dish.image_url ? <Image source={{ uri: dish.image_url }} accessibilityLabel={t('Foto de {name}', { name: dish.name })} style={{ width: 72, height: 72, borderRadius: 12 }} /> : null}
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="headline">{dish.name}</Txt>
              <Txt>{money(dish.price)}{dish.category ? `  ${dish.category}` : ''}</Txt>
              <Text style={{ color: st === 'hidden' ? colors.muted : EDGE[st], fontWeight: '600' }}>{t(STATUS_TEXT[st])}</Text>
            </View>
          </View>
          {dish.ingredients?.length ? <Text style={{ color: colors.muted }}>{t('Ingredientes:')} {dish.ingredients.join(', ')}</Text> : null}
          <Text style={{ color: al.declared ? (names.length ? colors.danger : colors.green) : colors.warning.text }}>
            {!al.declared ? t('Alérgenos sin declarar') : names.length ? t('Contiene: {list}', { list: names.map(a => t(a).toLowerCase()).join(', ') }) : t('Sin alérgenos comunes')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Action title={dish.status === 'published' ? t('Ocultar') : t('Mostrar')} secondary={dish.status === 'published'} disabled={busy}
              onPress={() => run(() => api.updateDish(dish.id, { status: dish.status === 'published' ? 'draft' : 'published' }), setError)} /></View>
            <View style={{ flex: 1 }}><Action title={t('Editar')} secondary disabled={busy} onPress={() => edit(dish)} /></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : dish.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={[type.body, { textDecorationLine: 'underline' }]}>{open ? t('Menos opciones') : t('Más opciones')}</Text>
          </Pressable>
          {open ? <View style={{ gap: 8 }}>
            <Action title={dish.is_available ? t('Marcar agotado') : t('Marcar disponible')} secondary disabled={busy}
              onPress={() => run(() => api.updateDish(dish.id, { is_available: !dish.is_available }), setError)} />
            <Action title={dish.image_url ? t('Cambiar foto') : t('Subir foto')} secondary disabled={busy} onPress={() => run(() => pickAndUploadDishPhoto(dish.id), setError)} />
            {dish.image_url ? <Action title={t('Quitar foto')} secondary disabled={busy} onPress={() => run(() => api.removeDishImage(dish.id), setError)} /> : null}
            <Action title={t('Eliminar')} disabled={busy} onPress={() => Alert.alert(t('Eliminar platillo'), t('¿Eliminar «{name}»? No se puede deshacer.', { name: dish.name }), [{ text: t('Cancelar'), style: 'cancel' }, { text: t('Eliminar'), style: 'destructive', onPress: () => void run(() => api.deleteDish(dish.id), setError) }])} />
          </View> : null}
        </View>
      })}
    </>}
    <Card>
      <Title>{editing ? t('Editar platillo') : t('Nuevo platillo')}</Title>
      <Field label={t('Nombre')} placeholder={t('Ej. Pepián de pollo')} value={form.name} onChangeText={name => setForm(v => ({ ...v, name }))} maxLength={120} editable={!busy} />
      <View style={{ gap: 6 }}>
        <Txt>{t('Precio')}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Txt variant="headline">Q</Txt>
          <Input accessibilityLabel={t('Precio en quetzales')} placeholder="45.00" value={form.price} keyboardType="decimal-pad" maxLength={9} editable={!busy} style={{ flex: 1 }}
            onChangeText={price => setForm(v => ({ ...v, price: price.replace(/[^0-9.,]/g, '') }))} onBlur={() => setForm(v => ({ ...v, price: formatPriceInput(v.price) }))} />
        </View>
        <Txt variant="subhead">{t('Solo el número, en quetzales.')}</Txt>
      </View>
      <View style={{ gap: 6 }}>
        <Txt>{t('Descripción (opcional)')}</Txt>
        <Input accessibilityLabel={t('Descripción')} placeholder={t('Cómo se prepara, con qué se acompaña, tamaño de la porción…')} value={form.description} maxLength={500} multiline
          textAlignVertical="top" editable={!busy} style={{ minHeight: 120 }} onChangeText={description => setForm(v => ({ ...v, description }))} />
        <Txt variant="subhead" style={{ textAlign: 'right' }}>{form.description.length}/500</Txt>
      </View>

      <Txt variant="label">{t('Foto (opcional)')}</Txt>
      {photo || currentPhoto ? <Image source={{ uri: photo?.uri ?? currentPhoto! }} accessibilityLabel={t('Foto del platillo')} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md }} /> : null}
      <Action title={photo || currentPhoto ? t('Cambiar foto') : t('Elegir foto')} secondary disabled={busy}
        onPress={() => void pickPhoto().then(a => { if (a) setPhoto(a) }).catch(() => setFormError(t('No pudimos abrir la galería.')))} />
      {photo ? <Txt variant="subhead">{t('La foto se subirá al guardar.')}</Txt> : null}

      {DISH_DETAIL_GROUPS.map(g => <TagField key={g.key} title={t(g.title)} placeholder={t(g.placeholder)} disabled={busy}
        hint={g.key === 'dish_types' ? t('Elige o escribe todas las que apliquen. Ayudan a que te encuentren.') : undefined}
        options={g.options.map(o => o.label)} value={form[g.key]} onChange={setGroup(g.key)} validate={(text, cur) => labelProblem(text, cur)} />)}

      <TagField title={t('Ingredientes principales (opcional)')} placeholder={t('Escribe uno: Ej. pollo')} disabled={busy}
        hint={t("Agrega un ingrediente a la vez. Los clientes pueden buscar por ingrediente o pedir platillos sin alguno.")}
        value={form.ingredients} onChange={ingredients => setForm(v => ({ ...v, ingredients }))} validate={ingredientProblem} />

      <View style={{ gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Txt variant="label" accessibilityRole="header">{t('Alérgenos')}</Txt>
        {/* The whole row toggles: people tap the words, not only the switch. */}
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: form.hasAllergens, disabled: busy }} disabled={busy}
          onPress={() => setAllergensOn(!form.hasAllergens)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 48 }}>
          <Txt style={{ flex: 1 }}>{t('Contiene alérgenos')}</Txt>
          <Switch value={form.hasAllergens} disabled={busy} importantForAccessibility="no" trackColor={{ true: colors.orange, false: colors.border }} thumbColor={colors.white}
            onValueChange={setAllergensOn} />
        </Pressable>
        {form.hasAllergens
          ? <TagField title={t('¿Qué alérgenos contiene?')} placeholder={t('¿Otro? Escríbelo: Ej. mostaza')} tone="red" disabled={busy}
              options={ALLERGENS.map(a => ALLERGEN_LABELS[a])} value={form.allergenLabels} onChange={allergenLabels => setForm(v => ({ ...v, allergenLabels }))}
              validate={(text, cur) => labelProblem(text, cur, t('un alérgeno'), 19)} />
          : <><Chip label={t('Confirmo: no contiene alérgenos comunes')} on={form.noAllergens} disabled={busy} onPress={() => setForm(v => ({ ...v, noAllergens: !v.noAllergens }))} />
            <Txt variant="subhead">{t('Si no lo confirmas, los clientes verán «alérgenos sin declarar».')}</Txt></>}
      </View>

      <Message>{formError}</Message>
      <Action title={busy ? t('Guardando…') : editing ? t('Guardar cambios') : t('Agregar platillo')} onPress={save} disabled={busy} />
      {editing ? <Action title={t('Cancelar edición')} secondary onPress={() => { resetForm(); setFormError('') }} disabled={busy} /> : null}
    </Card>
  </Page>
}
