"use client"

import { useEffect, useState } from "react"
import type { User as AccountUser } from "@supabase/supabase-js"
import { getSupabase } from "@/lib/supabase/client"
import { webApi } from "@/lib/web-api"
import { metadataName } from "@/shared/contracts/names"
import { Button } from "@/components/ui/button"
import AppFeedback from "@/components/app-feedback"
import TextSizeControl from "@/components/text-size-control"
import type { HiddenRestaurant } from "@/lib/api-client"
import { t } from '@/shared/i18n'

/** Diner account: only data that really exists (name and email). */
export default function UserProfile({ user, onLogin }: { user: AccountUser | null; onLogin: () => void }) {
  const [accountName, setAccountName] = useState("")
  const [accountError, setAccountError] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    setAccountName(""); setAccountError("")
    if (user) webApi.ensureProfile(metadataName(user.user_metadata) || t("Mi cuenta"))
      .then((profile) => { if (active) setAccountName(profile.display_name) })
      .catch((error) => { if (active) setAccountError(error.message) })
    return () => { active = false }
  }, [user?.id])
  async function signOut() {
    setBusy(true)
    try {
      const result = await getSupabase()?.auth.signOut()
      if (result?.error) throw result.error
    } catch { setAccountError(t("No pudimos cerrar la sesión. Intenta nuevamente.")) }
    finally { setBusy(false) }
  }
  if (!user) return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">{t('No necesitas cuenta para buscar restaurantes. Crea una si también administras un negocio.')}</p>
    <Button onClick={onLogin}>{t('Iniciar sesión o crear cuenta')}</Button>
    <TextSizeControl />
  </div>
  return <div className="space-y-4">
    {accountError && <p role="alert" className="text-sm text-red-700">{accountError}</p>}
    <div><p className="text-lg font-semibold">{accountName || t("Mi cuenta")}</p><p className="text-sm text-muted-foreground">{user.email}</p></div>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => { window.location.href = "/restaurant" }}>{t('Administrar mi restaurante')}</Button>
      <Button variant="outline" disabled={busy} onClick={signOut}>{t('Cerrar sesión')}</Button>
    </div>
    <HiddenRestaurants />
    <TextSizeControl />
    <AppFeedback />
  </div>
}

/** «No me interesa»: restaurants left out of this diner's searches and assistant; each can be shown again. */
function HiddenRestaurants() {
  const [items, setItems] = useState<HiddenRestaurant[] | null>(null)
  const [error, setError] = useState("")
  useEffect(() => { webApi.listHidden().then(setItems).catch((e) => setError(e.message)) }, [])
  if (!items?.length && !error) return null
  async function show(id: string) {
    setError("")
    try { await webApi.unhideRestaurant(id); setItems((rows) => rows && rows.filter((r) => r.restaurant_id !== id)) }
    catch (e) { setError(e instanceof Error ? e.message : t("No pudimos mostrarlo de nuevo.")) }
  }
  return <section className="space-y-2 rounded-2xl border bg-white p-4">
    <h2 className="text-sm font-semibold text-[#173F35]">{t('Restaurantes que no te interesan')}</h2>
    <p className="text-xs text-stone-600">{t('No aparecen en tus búsquedas ni en el asistente.')}</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <ul className="divide-y">{items?.map((r) => <li key={r.restaurant_id} className="flex items-center justify-between gap-2 py-2 text-sm">
      <span>{r.name}</span><Button size="sm" variant="outline" onClick={() => show(r.restaurant_id)}>{t('Mostrar de nuevo')}</Button></li>)}</ul>
  </section>
}
