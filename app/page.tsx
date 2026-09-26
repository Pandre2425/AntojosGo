"use client"

import { useState, useEffect } from "react"
import { useAccountSession } from "@/hooks/use-account-session"
import AccountAccess from "@/components/account-access"
import dynamic from "next/dynamic"
import ModuleBoundary, { ModuleLoading } from "@/components/module-boundary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Compass, Heart, User, ChefHat, MessageCircle } from "lucide-react"
const RestaurantSearch = dynamic(() => import("@/components/restaurant-search"), { loading: ModuleLoading })
const AIChatInterface = dynamic(() => import("@/components/ai-chat-interface"), { loading: ModuleLoading })
const RestaurantDetails = dynamic(() => import("@/components/restaurant-details"), { loading: ModuleLoading })
import MobileDiscover from "@/components/mobile-discover"
import type { Restaurant } from "@/lib/restaurants"
const FavoritesList = dynamic(() => import("@/components/favorites-list"), { loading: ModuleLoading })
const UserProfile = dynamic(() => import("@/components/user-profile"), { loading: ModuleLoading })

export default function AntojosGoApp() {
  const { user } = useAccountSession()
  const [initialQuery, setInitialQuery] = useState("")
  const [showAuth, setShowAuth] = useState(false)
  const [activeTab, setActiveTab] = useState<"home" | "search" | "ai" | "favorites" | "profile">("home")
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [showRestaurantDetails, setShowRestaurantDetails] = useState(false)

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setShowRestaurantDetails(true)
    console.log("[v0] Selected restaurant:", restaurant.name)
  }

  const handleBackFromDetails = () => {
    setShowRestaurantDetails(false)
    setSelectedRestaurant(null)
  }

  useEffect(() => { if (user) setShowAuth(false) }, [user])

  if (showAuth && !user) return <AccountAccess audience="customer" onBack={() => setShowAuth(false)} />

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="mobile-content flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#173F35]">AntojosGo</h1>
              <p className="text-xs text-muted-foreground">¿Qué se te antoja hoy?</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => { window.location.href = "/welcome" }}>
              <ChefHat className="w-4 h-4 mr-1" />
              Cambiar modo
            </Button>
            <Button variant="ghost" size="sm" aria-label={user ? "Mi cuenta" : "Iniciar sesion"} onClick={() => { handleBackFromDetails(); user ? setActiveTab("profile") : setShowAuth(true) }}>
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mobile-content p-5 space-y-6">
        <ModuleBoundary key={showRestaurantDetails ? "details" : activeTab} name="esta sección">
        {showRestaurantDetails && selectedRestaurant ? (
          <RestaurantDetails restaurantId={selectedRestaurant.id} onBack={handleBackFromDetails} />
        ) : (
          <>
            {/* Tab Content */}
            {activeTab === "home" && <MobileDiscover name={typeof user?.user_metadata?.display_name === "string" ? user.user_metadata.display_name : undefined} onSearch={(query) => { setInitialQuery(query); setActiveTab("search") }}/>}
            {activeTab === "ai" && (
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    Asistente AI
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Dime qué se te antoja y te ayudo a encontrarlo</p>
                </CardHeader>
                <CardContent className="p-0">
                  <AIChatInterface onRestaurantSelect={handleRestaurantSelect} />
                </CardContent>
              </Card>
            )}

            {activeTab === "search" && (
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    Buscar Restaurantes
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Explora restaurantes por ubicación y preferencias</p>
                </CardHeader>
                <CardContent>
                  <RestaurantSearch initialQuery={initialQuery} onRestaurantSelect={handleRestaurantSelect} />
                </CardContent>
              </Card>
            )}

            {activeTab === "favorites" && (
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    Mis Favoritos
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Tus restaurantes guardados</p>
                </CardHeader>
                <CardContent>
                  <FavoritesList onRestaurantSelect={handleRestaurantSelect} />
                </CardContent>
              </Card>
            )}

            {activeTab === "profile" && (
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Mi Perfil
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Personaliza tu experiencia</p>
                </CardHeader>
                <CardContent>
                  <UserProfile user={user} onLogin={() => setShowAuth(true)} />
                </CardContent>
              </Card>
            )}
          </>
        )}

        </ModuleBoundary>

      </main>

      {/* Bottom Navigation */}
      <nav aria-label="Navegación principal" className="mobile-nav fixed bottom-0 left-0 right-0 z-50 bg-white border-t">
        <div className="mobile-content flex items-center justify-around py-2">
          <Button variant="ghost" aria-current={activeTab === "home" ? "page" : undefined} className={`flex-col gap-1 h-auto px-2 py-2 ${activeTab === "home" ? "text-primary" : "text-muted-foreground"}`} onClick={() => { handleBackFromDetails(); setActiveTab("home") }}><Compass className="w-5 h-5"/><span className="text-[10px]">Descubrir</span></Button>
          <Button
            variant="ghost"
            aria-current={activeTab === "ai" ? "page" : undefined}
            className="flex-col space-y-1 h-auto py-2 px-2"
            onClick={() => { handleBackFromDetails(); setActiveTab("ai") }}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px]">Para ti</span>
          </Button>
          <Button
            variant="ghost"
            aria-current={activeTab === "search" ? "page" : undefined}
            className="flex-col space-y-1 h-auto py-2 px-2"
            onClick={() => { handleBackFromDetails(); setActiveTab("search") }}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px]">Explorar</span>
          </Button>
          <Button
            variant="ghost"
            aria-current={activeTab === "favorites" ? "page" : undefined}
            className="flex-col space-y-1 h-auto py-2 px-2"
            onClick={() => { handleBackFromDetails(); setActiveTab("favorites") }}
          >
            <Heart className="w-5 h-5" />
            <span className="text-[10px]">Favoritos</span>
          </Button>
          <Button
            variant="ghost"
            aria-current={activeTab === "profile" ? "page" : undefined}
            className="flex-col space-y-1 h-auto py-2 px-2"
            onClick={() => { handleBackFromDetails(); setActiveTab("profile") }}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Mi perfil</span>
          </Button>
        </div>
      </nav>

      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>
    </div>
  )
}
