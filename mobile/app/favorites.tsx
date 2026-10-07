import { useCallback, useState } from 'react'
import { Redirect, router, useFocusEffect } from 'expo-router'
import { useSession } from '../src/session'
import { api } from '../src/api'
import type { PublicCatalogItem } from '../../modules/catalog/data/public-catalog'
import { Action, Card, Loading, Message, Page, Title } from '../src/ui'

export default function Favorites() {
  const { session, ready } = useSession()
  const [items, setItems] = useState<PublicCatalogItem[] | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  // Reload on focus so a favorite removed in the detail screen disappears here.
  useFocusEffect(useCallback(() => {
    if (!session) return
    let active = true
    setError('')
    api.listFavorites().then(rows => { if (active) setItems(rows) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [session?.user.id, retry]))
  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/" />
  return <Page><Title>Mis favoritos</Title><Message>{error}</Message>
    {error ? <Action title="Reintentar" onPress={() => setRetry(v => v + 1)} /> : !items ? <Loading /> : items.length ? items.map(item => <Card key={item.id}>
      <Title>{item.name}</Title>
      <Message>{item.branch_name} · {item.address}, {item.municipality}</Message>
      <Action title="Ver sede" onPress={() => router.push({ pathname: '/sede/[id]', params: { id: item.id } })} />
    </Card>) : <Message>Aún no tienes favoritos. Abre una sede y toca «Guardar en favoritos».</Message>}
  </Page>
}
