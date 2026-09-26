import { authorizeRestaurant } from "@/lib/server/restaurant-access"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { fetchRestaurantProfile, updateRestaurantProfileData } from "@/lib/server/restaurant-profile"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ message: "Servicio no configurado" }, { status: 503 })
  try {
    const { id: restaurantId } = await params
    const denied = await authorizeRestaurant(request, restaurantId)
    if (denied) return denied

    if (!restaurantId) {
      return NextResponse.json({ message: "Restaurant ID is required" }, { status: 400 })
    }

    const profile = await fetchRestaurantProfile(restaurantId)
    return NextResponse.json(profile)
  } catch (error: any) {
    return NextResponse.json({ message: "No pudimos completar la solicitud. Intenta nuevamente." }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ message: "Servicio no configurado" }, { status: 503 })
  try {
    const { id: restaurantId } = await params
    const denied = await authorizeRestaurant(request, restaurantId)
    if (denied) return denied
    const data = await request.json()

    if (!restaurantId) {
      return NextResponse.json({ message: "Restaurant ID is required" }, { status: 400 })
    }

    await updateRestaurantProfileData(restaurantId, data)

    return NextResponse.json({ message: "Profile updated successfully" })
  } catch (error: any) {
    return NextResponse.json({ message: "No pudimos completar la solicitud. Intenta nuevamente." }, { status: 500 })
  }
}
