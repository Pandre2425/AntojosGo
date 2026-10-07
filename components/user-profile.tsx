"use client"

import { useEffect, useState } from "react"
import type { User as AccountUser } from "@supabase/supabase-js"
import { getSupabase } from "@/lib/supabase/client"
import { webApi } from "@/lib/web-api"
import { Button } from "@/components/ui/button"

/** Diner account: only data that really exists (name and email). */
export default function UserProfile({ user, onLogin }: { user: AccountUser | null; onLogin: () => void }) {
  const [accountName, setAccountName] = useState("")
  const [accountError, setAccountError] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    setAccountName(""); setAccountError("")
    if (user) webApi.ensureProfile(user.user_metadata.display_name || "Mi cuenta")
      .then((profile) => { if (active) setAccountName(profile.display_name) })
      .catch((error) => { if (active) setAccountError(error.message) })
    return () => { active = false }
  }, [user?.id])
  async function signOut() {
    setBusy(true)
    try {
      const result = await getSupabase()?.auth.signOut()
      if (result?.error) throw result.error
    } catch { setAccountError("No pudimos cerrar la sesión. Intenta nuevamente.") }
    finally { setBusy(false) }
  }
  if (!user) return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">No necesitas cuenta para buscar restaurantes. Crea una si también administras un negocio.</p>
    <Button onClick={onLogin}>Iniciar sesión o crear cuenta</Button>
  </div>
  return <div className="space-y-4">
    {accountError && <p role="alert" className="text-sm text-red-700">{accountError}</p>}
    <div><p className="text-lg font-semibold">{accountName || "Mi cuenta"}</p><p className="text-sm text-muted-foreground">{user.email}</p></div>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => { window.location.href = "/restaurant" }}>Administrar mi restaurante</Button>
      <Button variant="outline" disabled={busy} onClick={signOut}>Cerrar sesión</Button>
    </div>
  </div>
}
