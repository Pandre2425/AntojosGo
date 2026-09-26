import { redirect } from "next/navigation"
import AdminPageClient from "./admin-client"

/** In production builds, /admin is not a public demo surface. */
export default function AdminPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/")
  }
  return <AdminPageClient />
}
