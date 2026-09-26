import { authorizeRestaurant } from "@/lib/server/restaurant-access"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { fetchRestaurantMenu } from "@/lib/server/menu-management"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ message: "Servicio no configurado" }, { status: 503 })
  try {
    const { id: restaurantId } = await params
    const denied = await authorizeRestaurant(request, restaurantId)
    if (denied) return denied

    if (!restaurantId) {
      return NextResponse.json({ message: "Restaurant ID is required" }, { status: 400 })
    }

    const menu = await fetchRestaurantMenu(restaurantId)
    return NextResponse.json(menu)
  } catch (error: any) {
    return NextResponse.json({ message: "No pudimos completar la solicitud. Intenta nuevamente." }, { status: 500 })
  }
}
