"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useAccountSession } from "@/hooks/use-account-session"
import AccountAccess from "@/components/account-access"
import ModuleBoundary, { ModuleLoading } from "@/components/module-boundary"
import MobileDiscover from "@/components/mobile-discover"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Compass, Heart, User, ChefHat, MessageCircle } from "lucide-react"
const CustomerCatalog = dynamic(() => import("@/components/customer-catalog"), { loading: ModuleLoading })
const FavoriteBranches = dynamic(() => import("@/components/customer-catalog").then((m) => m.FavoriteBranches), { loading: ModuleLoading })
const CustomerAssistant = dynamic(() => import("@/components/customer-assistant"), { loading: ModuleLoading })
const UserProfile = dynamic(() => import("@/components/user-profile"), { loading: ModuleLoading })

type Tab = "home" | "assistant" | "search" | "favorites" | "profile"
const tabs: { id: Tab; label: string; icon: typeof Compass }[] = [
  { id: "home", label: "Descubrir", icon: Compass },
  { id: "assistant", label: "Para ti", icon: MessageCircle },
  { id: "search", label: "Explorar", icon: Search },
  { id: "favorites", label: "Favoritos", icon: Heart },
  { id: "profile", label: "Mi perfil", icon: User },
]

export default function AntojosGoApp() {
  const { user } = useAccountSession()
  const [initialQuery, setInitialQuery] = useState("")
  const [showAuth, setShowAuth] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("home")

  useEffect(() => { if (user) setShowAuth(false) }, [user])

  if (showAuth && !user) return <AccountAccess audience="customer" onBack={() => setShowAuth(false)} />

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="mobile-content flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center"><ChefHat className="w-6 h-6 text-white" /></div>
            <div><h1 className="text-xl font-extrabold text-[#173F35]">AntojosGo</h1><p className="text-xs text-muted-foreground">¿Qué se te antoja hoy?</p></div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { window.location.href = "/welcome" }}><ChefHat className="w-4 h-4 mr-1" />Cambiar modo</Button>
        </div>
      </header>

      <main className="mobile-content p-5 space-y-6">
        <ModuleBoundary key={activeTab} name="esta sección">
          {activeTab === "home" && <MobileDiscover name={typeof user?.user_metadata?.display_name === "string" ? user.user_metadata.display_name : undefined} onSearch={(query) => { setInitialQuery(query); setActiveTab(query ? "assistant" : "search") }} />}
          {activeTab === "assistant" && <CustomerAssistant initialMessage={initialQuery} />}
          {activeTab === "search" && <CustomerCatalog initialQuery={initialQuery} />}
          {activeTab === "favorites" && <FavoriteBranches onLogin={() => setShowAuth(true)} />}
          {activeTab === "profile" && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5 text-primary" />Mi perfil</CardTitle></CardHeader>
              <CardContent><UserProfile user={user} onLogin={() => setShowAuth(true)} /></CardContent>
            </Card>
          )}
        </ModuleBoundary>
      </main>

      <nav aria-label="Navegación principal" className="mobile-nav fixed bottom-0 left-0 right-0 z-50 bg-white border-t">
        <div className="mobile-content flex items-center justify-around py-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button key={id} variant="ghost" aria-current={activeTab === id ? "page" : undefined} className={`flex-col gap-1 h-auto px-2 py-2 ${activeTab === id ? "text-primary" : "text-muted-foreground"}`} onClick={() => setActiveTab(id)}>
              <Icon className="w-5 h-5" /><span className="text-[10px]">{label}</span>
            </Button>
          ))}
        </div>
      </nav>
      <div className="h-20"></div>
    </div>
  )
}
