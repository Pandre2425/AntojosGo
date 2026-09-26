import { authorizeRestaurant } from "@/lib/server/restaurant-access"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { createDishInDB } from "@/lib/server/menu-management"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ message: "Servicio no configurado" }, { status: 503 })
  try {
    const { id: restaurantId } = await params
    const denied = await authorizeRestaurant(request, restaurantId)
    if (denied) return denied
    const data = await request.json()

    if (!restaurantId) {
      return NextResponse.json({ message: "Restaurant ID is required" }, { status: 400 })
    }

    // Validate required fields
    if (!data.name || !data.category || !data.price) {
      return NextResponse.json({ message: "Name, category, and price are required" }, { status: 400 })
    }

    if (data.price <= 0) {
      return NextResponse.json({ message: "Price must be greater than 0" }, { status: 400 })
    }

    const dish = await createDishInDB(restaurantId, data)
    return NextResponse.json(dish)
  } catch (error: any) {
    return NextResponse.json({ message: "No pudimos completar la solicitud. Intenta nuevamente." }, { status: 500 })
  }
}
