import { useEffect, useRef, useState } from 'react'
import { router } from 'expo-router'
import { useSession } from './session'
import { supabase } from './supabase'
import { Action, Card, Field, Loading, Message, Page, Title, Txt } from './ui'
import { api } from './api'
import { AppFeedback } from './app-feedback'
import { AccessibilityCard, HelpLinks, HiddenRestaurantsCard } from './account-extras'
import { LanguageSelector } from './language'
import { displayNameSchema, metadataName } from '../../shared/contracts/names'
import type { OwnedRestaurant } from '../../shared/contracts/restaurants'
import { t } from '../../shared/i18n'
/** Signed-in account tab: the user's restaurants and sign-out. */
export function MyRestaurants() {
  const { session, ready } = useSession()
  const [rows, setRows] = useState<OwnedRestaurant[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  useEffect(() => {
    if (!session) return
    let active = true; setLoading(true); setError('')
    api.listRestaurants().then(data => { if (active) setRows(data) }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    const displayName = metadataName(session.user.user_metadata)
    if (displayName && displayNameSchema.safeParse(displayName).success) api.ensureProfile(displayName).catch(() => { if (active) setError(t('Tu sesión está activa, pero no pudimos completar el perfil. Puedes reintentar.')) })
    return () => { active = false }
  }, [session?.user.id, retry])
  if (!ready) return <Page><Loading /></Page>
  if (!session) return null
  async function create() {
    if (lock.current) return
    const parsed = displayNameSchema.safeParse(name)
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    lock.current = true; setBusy(true); setError('')
    try { await api.createRestaurant(parsed.data); setName(''); setRetry(v => v + 1) }
    catch (e) { setError(e instanceof Error ? e.message : t('No pudimos guardar.')) }
    finally { lock.current = false; setBusy(false) }
  }
  return <Page tab><Title>{t('Mi cuenta')}</Title><Message>{session.user.email}</Message><Txt variant="headline">{t('Mis restaurantes')}</Txt>
    <Message>{error}</Message>{error && <Action title={t('Reintentar')} onPress={() => setRetry(v => v + 1)} disabled={busy} />}
    {loading ? <Loading /> : rows.length ? rows.map(row => <Card key={row.id}><Title>{row.name}</Title><Action title={t('Administrar negocio y sedes')} onPress={() => router.push({ pathname: '/business/[id]', params: { id: row.id } })} disabled={busy} /></Card>) : <Message>{t('Aún no tienes restaurantes registrados.')}</Message>}
    <Card><Field label={t('Nombre del nuevo restaurante')} value={name} onChangeText={setName} maxLength={100} editable={!busy} /><Action title={busy ? t('Guardando…') : t('Registrar restaurante')} onPress={create} disabled={busy} /></Card>
    <HiddenRestaurantsCard />
    <Card><LanguageSelector /></Card>
    <AccessibilityCard />
    <AppFeedback />
    <HelpLinks />
    <Action title={t('Cerrar sesión')} secondary disabled={busy} onPress={async () => { if (lock.current) return; lock.current = true; setBusy(true); try { const result = await supabase!.auth.signOut(); if (result.error) setError(t('No pudimos cerrar sesión. Reintenta.')) } catch { setError(t('No pudimos cerrar sesión.')) } finally { lock.current = false; setBusy(false) } }} />
  </Page>
}