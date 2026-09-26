"use client"

import { useEffect, useState } from "react"
import type { User as AccountUser } from "@supabase/supabase-js"
import { getSupabase } from "@/lib/supabase/client"
import { ensureAccountProfile } from "@/modules/accounts/data/account-profile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { User, MapPin, Bell, Heart, Settings, LogOut } from "lucide-react"

export default function UserProfile({ user, onLogin }: { user: AccountUser | null; onLogin: () => void }) {
  const [accountName, setAccountName] = useState("")
  const [accountError, setAccountError] = useState("")
  useEffect(() => {
    let active = true
    setAccountName(""); setAccountError("")
    if (user) ensureAccountProfile(user.id, user.user_metadata.display_name || "Mi cuenta")
      .then((profile) => { if (active) setAccountName(profile.display_name) })
      .catch((error) => { if (active) setAccountError(error.message) })
    return () => { active = false }
  }, [user?.id])
  async function signOut() {
    try {
      const result = await getSupabase()?.auth.signOut()
      if (result?.error) throw result.error
    } catch { setAccountError("No pudimos cerrar la sesión. Intenta nuevamente.") }
  }

  const [preferences, setPreferences] = useState({
    cuisines: ["Guatemalteca", "Italiana", "Mexicana"],
    dietary: ["Vegetariano"],
    priceRange: "$$",
    maxDistance: "5km",
    notifications: {
      recommendations: true,
      promotions: false,
      reviews: true,
    },
  })

  const availableCuisines = [
    "Guatemalteca",
    "Italiana",
    "Mexicana",
    "China",
    "Japonesa",
    "Americana",
    "India",
    "Tailandesa",
    "Francesa",
    "Española",
  ]

  const dietaryOptions = ["Vegetariano", "Vegano", "Sin Gluten", "Sin Lactosa", "Keto", "Halal"]

  const toggleCuisine = (cuisine: string) => {
    setPreferences((prev) => ({
      ...prev,
      cuisines: prev.cuisines.includes(cuisine)
        ? prev.cuisines.filter((c) => c !== cuisine)
        : [...prev.cuisines, cuisine],
    }))
  }

  const toggleDietary = (dietary: string) => {
    setPreferences((prev) => ({
      ...prev,
      dietary: prev.dietary.includes(dietary) ? prev.dietary.filter((d) => d !== dietary) : [...prev.dietary, dietary],
    }))
  }

  const updateNotification = (key: keyof typeof preferences.notifications) => {
    setPreferences((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }))
  }

  return (
    <div className="space-y-6">
      {accountError && <p role="alert">{accountError}</p>}
      {!user && <Button onClick={onLogin}>Iniciar sesion o crear cuenta</Button>}
      {/* User Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{user ? accountName || "Mi cuenta" : "Usuario invitado"}</h3>
              <p className="text-sm text-gray-600">{user ? user.email : "Inicia sesion para usar tu cuenta"}</p>
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <MapPin className="w-4 h-4" />
                <span>Zona 10, Guatemala</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cuisine Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferencias de Cocina</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {availableCuisines.map((cuisine) => (
              <Badge
                key={cuisine}
                variant={preferences.cuisines.includes(cuisine) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleCuisine(cuisine)}
              >
                {cuisine}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dietary Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Restricciones Dietéticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {dietaryOptions.map((dietary) => (
              <Badge
                key={dietary}
                variant={preferences.dietary.includes(dietary) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleDietary(dietary)}
              >
                {dietary}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Rango de Precio</span>
            <select
              value={preferences.priceRange}
              onChange={(e) => setPreferences((prev) => ({ ...prev, priceRange: e.target.value }))}
              className="border rounded px-3 py-1"
            >
              <option value="$">$ - Económico</option>
              <option value="$$">$$ - Moderado</option>
              <option value="$$$">$$$ - Caro</option>
              <option value="$$$$">$$$$ - Muy Caro</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span>Distancia Máxima</span>
            <select
              value={preferences.maxDistance}
              onChange={(e) => setPreferences((prev) => ({ ...prev, maxDistance: e.target.value }))}
              className="border rounded px-3 py-1"
            >
              <option value="1km">1 km</option>
              <option value="3km">3 km</option>
              <option value="5km">5 km</option>
              <option value="10km">10 km</option>
              <option value="15km">15 km</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Recomendaciones personalizadas</span>
            <Switch
              checked={preferences.notifications.recommendations}
              onCheckedChange={() => updateNotification("recommendations")}
            />
          </div>

          <div className="flex items-center justify-between">
            <span>Promociones y ofertas</span>
            <Switch
              checked={preferences.notifications.promotions}
              onCheckedChange={() => updateNotification("promotions")}
            />
          </div>

          <div className="flex items-center justify-between">
            <span>Nuevas reseñas</span>
            <Switch checked={preferences.notifications.reviews} onCheckedChange={() => updateNotification("reviews")} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button variant="outline" className="w-full justify-start bg-transparent">
          <Heart className="w-4 h-4 mr-2" />
          Mis Favoritos
        </Button>

        <Button variant="outline" className="w-full justify-start bg-transparent">
          <Settings className="w-4 h-4 mr-2" />
          Configuración Avanzada
        </Button>

        <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 bg-transparent" onClick={user ? signOut : onLogin}>
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
