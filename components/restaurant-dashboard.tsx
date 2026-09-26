"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import ModuleBoundary, { ModuleLoading } from "./module-boundary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import {
  ChefHat,
  Star,
  Eye,
  TrendingUp,
  MessageSquare,
  Settings,
  Menu,
  Bell,
  DollarSign,
  Award,
  ArrowRight,
} from "lucide-react"
import { getRestaurantAnalytics, type RestaurantAnalytics } from "@/lib/restaurant-analytics"
const RestaurantProfileEditor = dynamic(() => import("@/components/restaurant-profile-editor"), { loading: ModuleLoading })
const MenuManagement = dynamic(() => import("@/components/menu-management"), { loading: ModuleLoading })
import { DEMO_RESTAURANT_ID } from '@/lib/demo-restaurant'
import ReviewsDisplay from './reviews-display'

interface RestaurantDashboardProps {
  restaurant: {
    id: string
    name: string
    email: string
  }
  onLogout: () => void
}

export default function RestaurantDashboard({ restaurant, onLogout }: RestaurantDashboardProps) {
  const [analytics, setAnalytics] = useState<RestaurantAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeView, setActiveView] = useState<"dashboard" | "profile" | "menu" | "reviews">("dashboard")

  useEffect(() => {
    if (activeView !== "dashboard") return
    let active = true
    const controller = new AbortController()
    setLoading(true)
    setError("")
    getRestaurantAnalytics(restaurant.id, controller.signal)
      .then((data) => { if (active) setAnalytics(data) })
      .catch((err) => {
        if (!active) return
        setAnalytics(null)
        setError(err instanceof Error ? err.message : "No se pudieron cargar las estadisticas")
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [restaurant.id, activeView])

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"]

  if (activeView === 'reviews') {
    return <main className="p-4 space-y-4 max-w-3xl mx-auto">
      <Button variant="outline" onClick={() => setActiveView('dashboard')}>Volver al panel</Button>
      <h1 className="text-2xl font-bold">Reseñas del restaurante</h1>
      {restaurant.id === DEMO_RESTAURANT_ID ? <p>El restaurante demo todavía no tiene reseñas reales.</p> : <ReviewsDisplay restaurantId={restaurant.id} restaurantName={restaurant.name} />}
    </main>
  }

  if (activeView === "profile") {
    return <ModuleBoundary key={activeView} name="esta seccion" onExit={() => setActiveView("dashboard")}> <RestaurantProfileEditor restaurantId={restaurant.id} onBack={() => setActiveView("dashboard")} /> </ModuleBoundary>
  }

  if (activeView === "menu") {
    return <ModuleBoundary key={activeView} name="esta seccion" onExit={() => setActiveView("dashboard")}> <MenuManagement restaurantId={restaurant.id} onBack={() => setActiveView("dashboard")} /> </ModuleBoundary>
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="flex flex-wrap gap-3 items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">Panel de Administración</h1>
              <p className="text-sm text-muted-foreground">{restaurant.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 max-w-7xl">
        {restaurant.id === DEMO_RESTAURANT_ID && <p role="status" className="mb-4 rounded-lg bg-orange-50 p-3 text-sm">Restaurante demo. Perfil y menú se guardan en este dispositivo; las métricas no representan actividad real.</p>}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent"
            onClick={() => setActiveView("profile")}
          >
            <Settings className="w-6 h-6 text-primary" />
            <span>Gestionar Perfil</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent"
            onClick={() => setActiveView("menu")}
          >
            <Menu className="w-6 h-6 text-primary" />
            <span>Gestionar Menú</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent"
            onClick={() => setActiveView("reviews")}
          >
            <MessageSquare className="w-6 h-6 text-primary" />
            <span>Ver Reseñas</span>
          </Button>
          <Button disabled variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent">
            <Award className="w-6 h-6 text-primary" />
            <span>Promociones · Próximamente</span>
          </Button>
        </div>

        {loading && <p role="status" className="mb-4 text-sm">Cargando estadisticas. Puedes abrir el perfil o el menu.</p>}
        <ModuleBoundary key="analytics" name="las estadisticas">
        {analytics && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Vistas del Perfil</p>
                      <p className="text-2xl font-bold">{analytics.profileViews.toLocaleString()}</p>
                    </div>
                    <Eye className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-500">Sin historial</span>
                    <span className="text-muted-foreground ml-1">comparativo</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Calificación</p>
                      <p className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</p>
                    </div>
                    <Star className="w-8 h-8 text-yellow-500" />
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <span className="text-muted-foreground">{analytics.totalReviews} reseñas</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Platillos</p>
                      <p className="text-2xl font-bold">{analytics.totalDishes}</p>
                    </div>
                    <ChefHat className="w-8 h-8 text-orange-500" />
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <span className="text-green-500">{analytics.activeDishes} activos</span>
                    <span className="text-muted-foreground ml-2">{analytics.specialDishes} especiales</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Ingresos Est.</p>
                      <p className="text-2xl font-bold">No disponible</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-500">Pendiente</span>
                    <span className="text-muted-foreground ml-1">de integrar</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="w-5 h-5" />
                    Vistas Mensuales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.monthlyMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="views" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5" />
                    Tendencia de Reseñas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.monthlyMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="reviews" stroke="#f97316" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Reseñas Recientes
                    </span>
                    <Button variant="ghost" size="sm">
                      Ver todas <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.recentReviews.map((review) => (
                      <div key={review.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">{review.userName.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm">{review.userName}</p>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < review.rating ? "text-yellow-500 fill-current" : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(review.createdAt).toLocaleDateString("es-ES")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Platillos Populares
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setActiveView("menu")}>
                      Gestionar <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.popularDishes.map((dish, index) => (
                      <div key={dish.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{dish.name}</p>
                            <p className="text-xs text-muted-foreground">{dish.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">Q{dish.price}</p>
                          <p className="text-xs text-muted-foreground">{dish.views} vistas</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Tips */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Consejos para Mejorar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Actualiza tu Menú</h4>
                    <p className="text-sm text-blue-700">
                      Agrega fotos de alta calidad a tus platillos para aumentar las vistas.
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Responde Reseñas</h4>
                    <p className="text-sm text-green-700">Responder a las reseñas mejora tu reputación y engagement.</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-900 mb-2">Promociona Especiales</h4>
                    <p className="text-sm text-orange-700">
                      Marca platillos como especiales para destacarlos en las búsquedas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
        </ModuleBoundary>
      </div>
    </div>
  )
}
