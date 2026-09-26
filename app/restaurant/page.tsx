"use client"

import dynamic from "next/dynamic"
import { useAccountSession } from "@/hooks/use-account-session"
import ModuleBoundary, { ModuleLoading } from "@/components/module-boundary"
import AccountAccess from "@/components/account-access"
const RestaurantAccountHome = dynamic(() => import("@/components/restaurant-account-home"), { loading: ModuleLoading })

export default function RestaurantPortal() {
  const { user, loading } = useAccountSession()
  if (loading) return <ModuleLoading />
  if (!user) return <AccountAccess audience="restaurant" onBack={() => { window.location.href = "/welcome" }} />
  return <ModuleBoundary key={user.id} name="tu cuenta de restaurante"><RestaurantAccountHome user={user} /></ModuleBoundary>
}
