"use client"

import { useState } from "react"
import AdminLogin from "@/components/admin-login"
import AdminDashboard from "@/components/admin-dashboard"
import { getCurrentAdmin, type AdminUser } from "@/lib/admin"

export default function AdminPageClient() {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(getCurrentAdmin())

  const handleLogin = (admin: AdminUser) => {
    setCurrentAdmin(admin)
  }

  const handleLogout = () => {
    setCurrentAdmin(null)
  }

  if (!currentAdmin) {
    return <AdminLogin onLogin={handleLogin} />
  }

  return <AdminDashboard admin={currentAdmin} onLogout={handleLogout} />
}
