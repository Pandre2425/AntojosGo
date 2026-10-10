import { useEffect, useState } from 'react'
import { Image, Linking, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../src/session'
import { api } from '../../src/api'
import { ApiError } from '../../../lib/api-client'
import type { PublicBranchExtras, PublicCatalogItem, PublicDish } from '../../../modules/catalog/data/public-catalog'
import { describeHours, isOpenNow } from '../../../shared/contracts/hours'
import { phoneUrl, whatsappUrl } from '../../../shared/contracts/branches'
import { ALLERGEN_LABELS, allergenStatus } from '../../../shared/contracts/menu'
import { Action, Card, Loading, Message, Page, Title } from '../../src/ui'

export default function SedeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [data, setData] = useState<{ branch: PublicCatalogItem & PublicBranchExtras; menu: PublicDish[] } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)

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

  const item = data?.branch
  return (
    <Page>
      <Title>Detalle de sede</Title>
      {loading ? <Loading /> : null}
      <Message>{error}</Message>
      {error && !loading ? <Action title="Reintentar" onPress={() => setRetry(v => v + 1)} /> : null}
      {item ? (
        <Card>
          <Title>{item.name}</Title>
          <Message>Sede: {item.branch_name}{item.category ? ` · ${item.category}` : ''}</Message>
          <Message>{item.address}, {item.municipality}, {item.department}</Message>
          {item.description ? <Message>{item.description}</Message> : <Message>Sin información de descripción.</Message>}
          <FavoriteToggle branchId={item.id} />
          <HoursInfo hours={item.opening_hours ?? []} />
          {item.phone ? <Action title={`Llamar · ${item.phone}`} secondary onPress={() => void Linking.openURL(phoneUrl(item.phone!))} /> : null}
          {item.phone && item.whatsapp ? <Action title="Escribir por WhatsApp" secondary onPress={() => void Linking.openURL(whatsappUrl(item.phone!))} /> : null}
          {item.latitude != null && item.longitude != null ? (
            <Message>Ubicación: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Message>
          ) : (
            <Message>Sin información de coordenadas.</Message>
          )}
        </Card>
      ) : null}
      {data ? (
        <Card>
          <Title>Menú</Title>
          {data.menu.length === 0 ? <Message>Este restaurante aún no ha publicado su menú.</Message> : data.menu.map((dish) => (
            <View key={dish.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              {dish.image_url ? <Image source={{ uri: dish.image_url }} accessibilityLabel={`Foto de ${dish.name}`} style={{ width: 72, height: 72, borderRadius: 12 }} /> : null}
              <View style={{ flex: 1 }}><Message>{dish.name} · Q{dish.price.toFixed(2)}{dish.category ? ` · ${dish.category}` : ''}{dish.is_available ? '' : ' · Agotado'}{dish.description ? `\n${dish.description}` : ''}{dish.ingredients?.length ? `\nIngredientes: ${dish.ingredients.join(', ')}` : ''}{`\n${allergenLine(dish.allergens)}`}</Message></View>
            </View>
          ))}
        </Card>
      ) : null}
      <Action title="Volver a buscar" secondary onPress={() => router.back()} />
    </Page>
  )
}

function HoursInfo({ hours }: { hours: NonNullable<PublicBranchExtras['opening_hours']> }) {
  const open = isOpenNow(hours)
  if (open === null) return <Message>Horario sin información.</Message>
  return <><Message>{open ? 'Abierto ahora' : 'Cerrado ahora'}</Message><Message>{describeHours(hours).join('\n')}</Message></>
}

/** Only for signed-in diners; guests can browse without an account. */
function FavoriteToggle({ branchId }: { branchId: string }) {
  const { session } = useSession()
  const [saved, setSaved] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!session) return
    let active = true
    api.listFavorites().then(rows => { if (active) setSaved(rows.some(r => r.id === branchId)) }).catch(() => { if (active) setSaved(false) })
    return () => { active = false }
  }, [session?.user.id, branchId])
  if (!session || saved === null) return null
  async function toggle() {
    setBusy(true); setError('')
    try { await (saved ? api.removeFavorite(branchId) : api.addFavorite(branchId)); setSaved(!saved) }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar el favorito.') }
    finally { setBusy(false) }
  }
  return <><Action title={busy ? 'Guardando…' : saved ? 'Quitar de favoritos' : 'Guardar en favoritos'} secondary={saved} onPress={toggle} disabled={busy} /><Message>{error}</Message></>
}

function allergenLine(allergens?: readonly string[]) {
  const { declared, contains } = allergenStatus(allergens)
  if (!declared) return '⚠️ Alérgenos no declarados por el restaurante'
  return contains.length ? `Contiene: ${contains.map(a => ALLERGEN_LABELS[a].toLowerCase()).join(', ')}` : 'Sin alérgenos comunes, según el restaurante'
}
