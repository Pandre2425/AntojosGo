"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChefHat, ArrowLeft } from "lucide-react"
import { loginRestaurant } from "@/lib/restaurant-auth"

interface RestaurantLoginProps {
  onBack: () => void
  onSuccess: (restaurant: any) => void
  onRegister: () => void
  onDemo?: () => void
}

export default function RestaurantLogin({ onBack, onSuccess, onRegister, onDemo }: RestaurantLoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await loginRestaurant({ email, password })
      onSuccess(result.restaurant)
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div className="w-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Portal de Restaurantes</CardTitle>
          <p className="text-muted-foreground">Accede a tu panel de administración</p>
        </CardHeader>

        <CardContent>
          {onDemo && (
            <div className="mb-5 space-y-2 rounded-lg bg-muted p-4">
              <p className="text-sm">Prueba un restaurante de ejemplo sin crear una cuenta. Los cambios se guardan solo en este dispositivo.</p>
              <Button type="button" variant="outline" className="w-full" onClick={onDemo}>Explorar restaurante demo</Button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@restaurante.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>

            <div className="text-center">
              <Button type="button" variant="link" onClick={onRegister} className="text-sm">
                ¿No tienes cuenta? Registra tu restaurante
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
