import { useEffect, useState, type ReactNode } from 'react'
import { Image, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSession } from '../../src/session'
import { api } from '../../src/api'
import { mapsEnabled } from '../../src/maps'
import { ApiError } from '../../../lib/api-client'
import type { PublicBranchExtras, PublicCatalogItem, PublicDish } from '../../../modules/catalog/data/public-catalog'
import { describeHours, isOpenNow } from '../../../shared/contracts/hours'
import { directionsUrl, geoUrl, phoneUrl, whatsappUrl } from '../../../shared/contracts/branches'
import { DISH_DETAIL_GROUPS, allergenNames, allergenStatus, dishDetails } from '../../../shared/contracts/menu'
import { Action, Loading, Message, Page, Txt, colors, radius, spacing, type } from '../../src/ui'

type Branch = PublicCatalogItem & PublicBranchExtras
const money = (v: number) => `Q${v.toFixed(2)}`

export default function SedeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [data, setData] = useState<{ branch: Branch; menu: PublicDish[] } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [dish, setDish] = useState<PublicDish | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true); setError('')
    api.getPublicBranch(String(id))
      .then((result) => { if (active) setData(result) })
      .catch((e) => { if (active) { setData(null); setError(e instanceof ApiError && e.status === 404 ? 'Esta sede no está publicada o no existe.' : e instanceof Error ? e.message : 'No pudimos cargar la sede.') } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, retry])

  if (loading && !data) return <Page><Loading /></Page>
  if (!data) return <Page><Message>{error}</Message><Action title="Reintentar" onPress={() => setRetry(v => v + 1)} /></Page>
  const b = data.branch
  return <Page>
    <BranchHeader b={b} />
    <Directions b={b} />
    <ContactRow b={b} />
    {b.description ? <Txt>{b.description}</Txt> : null}
    <HoursInfo hours={b.opening_hours ?? []} />

    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: spacing.sm }}>
      <Txt variant="title" accessibilityRole="header" style={{ fontSize: 24 }}>Menú</Txt>
      {data.menu.length ? <Txt variant="subhead">{data.menu.length === 1 ? '1 platillo' : `${data.menu.length} platillos`}</Txt> : null}
    </View>
    {data.menu.length === 0 ? <Txt variant="subhead">Este restaurante aún no ha publicado su menú.</Txt>
      : data.menu.map(d => <DishRow key={d.id} dish={d} onDetails={() => setDish(d)} />)}
    <DishSheet dish={dish} onClose={() => setDish(null)} />
  </Page>
}

function BranchHeader({ b }: { b: Branch }) {
  const open = isOpenNow(b.opening_hours ?? [])
  return <View style={{ gap: spacing.md }}>
    {b.cover_url ? <Image source={{ uri: b.cover_url }} accessibilityLabel={`Foto de ${b.name}`} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg }} /> : null}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      {b.logo_url ? <Image source={{ uri: b.logo_url }} accessibilityLabel={`Logo de ${b.name}`} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: colors.border }} />
        : <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.white, fontSize: 26, fontWeight: '700' }}>{b.name.trim().charAt(0).toUpperCase()}</Text></View>}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="title" accessibilityRole="header" style={{ fontSize: 26 }}>{b.name}</Txt>
        <Txt variant="subhead">{[b.category, b.branch_name].filter(Boolean).join(' · ')}</Txt>
      </View>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
      {open !== null ? <Pill text={open ? 'Abierto ahora' : 'Cerrado ahora'} color={open ? colors.green : colors.muted} filled={open} /> : null}
      <Txt variant="subhead" style={{ flexShrink: 1 }} selectable>{b.address}, {b.municipality}</Txt>
    </View>
  </View>
}

/** "Cómo llegar": Google Maps with the route ready; "otra app" lets Android offer Waze or any maps app. */
function Directions({ b }: { b: Branch }) {
  if (b.latitude == null || b.longitude == null) return <Txt variant="subhead">Este restaurante aún no marcó su ubicación en el mapa.</Txt>
  const [lat, lng] = [b.latitude, b.longitude]
  const go = () => void Linking.openURL(directionsUrl(lat, lng))
  const other = () => void Linking.openURL(geoUrl(lat, lng, b.name)).catch(go)
  return <View style={{ gap: spacing.sm }}>
    {mapsEnabled ? <Pressable accessibilityRole="button" accessibilityLabel="Ver la ruta en el mapa" onPress={go}
      style={{ height: 150, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <MapView style={{ flex: 1 }} liteMode pointerEvents="none" initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.008, longitudeDelta: 0.008 }}>
        <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor={colors.orange} />
      </MapView>
    </Pressable> : null}
    <Action title="Cómo llegar" onPress={go} />
    <Pressable accessibilityRole="button" onPress={other} style={{ alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center' }}>
      <Text style={[type.body, { textDecorationLine: 'underline' }]}>Abrir en otra app (Waze, Maps…)</Text>
    </Pressable>
  </View>
}

function ContactRow({ b }: { b: Branch }) {
  const { session } = useSession()
  if (!b.phone && !session) return null
  return <View style={{ flexDirection: 'row', gap: spacing.sm }}>
    {b.phone ? <View style={{ flex: 1 }}><Action title="Llamar" secondary onPress={() => void Linking.openURL(phoneUrl(b.phone!))} /></View> : null}
    {b.phone && b.whatsapp ? <View style={{ flex: 1 }}><Action title="WhatsApp" secondary onPress={() => void Linking.openURL(whatsappUrl(b.phone!))} /></View> : null}
    {session ? <View style={{ flex: 1 }}><FavoriteToggle branchId={b.id} /></View> : null}
  </View>
}

function HoursInfo({ hours }: { hours: NonNullable<PublicBranchExtras['opening_hours']> }) {
  const [open, setOpen] = useState(false)
  if (isOpenNow(hours) === null) return null
  return <View style={{ gap: spacing.xs }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(v => !v)} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={[type.body, { textDecorationLine: 'underline' }]}>{open ? 'Ocultar horario' : 'Ver horario'}</Text>
    </Pressable>
    {open ? <Txt selectable>{describeHours(hours).join('\n')}</Txt> : null}
  </View>
}

function DishRow({ dish, onDetails }: { dish: PublicDish; onDetails: () => void }) {
  const details = dishDetails(dish)
  const summary = [...details.dish_types, ...details.cuisines].slice(0, 3).join(' · ')
  return <Pressable accessibilityRole="button" accessibilityLabel={`${dish.name}, ${money(dish.price)}. Ver detalles`} onPress={onDetails}
    style={({ pressed }) => ({ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.cream : colors.white,
      borderWidth: 1, borderColor: pressed ? colors.green : colors.white, opacity: dish.is_available ? 1 : 0.7 })}>
    {dish.image_url ? <Image source={{ uri: dish.image_url }} accessibilityIgnoresInvertColors style={{ width: 84, height: 84, borderRadius: radius.md }} />
      : <View style={{ width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 30, color: colors.inactive }}>{dish.name.trim().charAt(0).toUpperCase()}</Text></View>}
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <Txt variant="label" style={{ flex: 1 }} numberOfLines={2}>{dish.name}</Txt>
        <Text style={{ color: colors.orange, fontWeight: '700', fontSize: 16, fontVariant: ['tabular-nums'] }}>{money(dish.price)}</Text>
      </View>
      {summary ? <Txt variant="subhead" numberOfLines={1}>{summary}</Txt> : null}
      {!dish.is_available ? <Pill text="Agotado por ahora" color={colors.muted} /> : null}
      <Text style={{ color: colors.green, fontWeight: '600', marginTop: 'auto' }}>Ver detalles ›</Text>
    </View>
  </Pressable>
}

/** Bottom sheet with everything the restaurant entered for a dish. */
function DishSheet({ dish, onClose }: { dish: PublicDish | null; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  if (!dish) return null
  const details = dishDetails(dish)
  const al = allergenStatus(dish.allergens, dish.allergens_other)
  const names = allergenNames(dish.allergens, dish.allergens_other)
  return <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <Pressable accessibilityLabel="Cerrar detalles" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
    <View style={{ maxHeight: '88%', backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom }}>
      <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginVertical: spacing.sm }} />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg }}>
        {dish.image_url ? <Image source={{ uri: dish.image_url }} accessibilityLabel={`Foto de ${dish.name}`} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg }} /> : null}
        <View style={{ gap: spacing.xs }}>
          <Txt variant="title" accessibilityRole="header" style={{ fontSize: 26 }}>{dish.name}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ color: colors.orange, fontWeight: '800', fontSize: 22, fontVariant: ['tabular-nums'] }}>{money(dish.price)}</Text>
            {!dish.is_available ? <Pill text="Agotado por ahora" color={colors.muted} /> : null}
          </View>
        </View>
        {dish.description ? <Txt selectable>{dish.description}</Txt> : null}
        {DISH_DETAIL_GROUPS.map(g => details[g.key].length ? <Section key={g.key} title={g.title}>{details[g.key].map(t => <Pill key={t} text={t} color={colors.green} />)}</Section> : null)}
        {dish.ingredients?.length ? <Section title="Ingredientes">{dish.ingredients.map(i => <Pill key={i} text={i} color={colors.muted} />)}</Section> : null}
        <Section title="Alérgenos">
          {!al.declared ? <Txt style={{ color: colors.warning.text }}>El restaurante no indicó los alérgenos. Si tienes una alergia, confírmalo con ellos.</Txt>
            : names.length ? names.map(a => <Pill key={a} text={`Contiene ${a.toLowerCase()}`} color={colors.danger} />)
            : <Txt style={{ color: colors.green }}>Sin alérgenos comunes, según el restaurante.</Txt>}
        </Section>
        <Txt variant="subhead">La información la registra el restaurante. Si tu alergia es grave, confírmala antes de pedir.</Txt>
        <Action title="Cerrar" secondary onPress={onClose} />
      </ScrollView>
    </View>
  </Modal>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ gap: spacing.sm }}>
    <Txt variant="label" accessibilityRole="header">{title}</Txt>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>
  </View>
}

function Pill({ text, color, filled = false }: { text: string; color: string; filled?: boolean }) {
  return <View style={{ borderWidth: 1, borderColor: color, backgroundColor: filled ? color : 'transparent', borderRadius: radius.full, paddingVertical: 4, paddingHorizontal: 12 }}>
    <Text style={{ color: filled ? colors.white : color, fontSize: 14, fontWeight: '600' }}>{text}</Text>
  </View>
}

/** Only for signed-in diners; guests can browse without an account. */
function FavoriteToggle({ branchId }: { branchId: string }) {
  const [saved, setSaved] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    api.listFavorites().then(rows => { if (active) setSaved(rows.some(r => r.id === branchId)) }).catch(() => { if (active) setSaved(false) })
    return () => { active = false }
  }, [branchId])
  if (saved === null) return null
  async function toggle() {
    setBusy(true)
    try { await (saved ? api.removeFavorite(branchId) : api.addFavorite(branchId)); setSaved(!saved) } catch { /* button keeps its state */ }
    finally { setBusy(false) }
  }
  return <Action title={busy ? '…' : saved ? 'Guardado ✓' : 'Guardar'} secondary onPress={toggle} disabled={busy} />
}
