import { authorizeRestaurant } from "@/lib/server/restaurant-access"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { updateDishInDB, deleteDishFromDB } from "@/lib/server/menu-management"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; dishId: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ message: "Servicio no configurado" }, { status: 503 })
  try {
    const { id: restaurantId, dishId } = await params
    const denied = await authorizeRestaurant(request, restaurantId)
    if (denied) return denied
    const data = await request.json()

    if (!restaurantId || !dishId) {
      return NextResponse.json({ message: "Restaurant ID and Dish ID are required" }, { status: 400 })
    }

    const dish = await updateDishInDB(restaurantId, dishId, data)
    return NextResponse.json(dish)
  } catch (error: any) {
    return NextResponse.json({ message: "No pudimos completar la solicitud. Intenta nuevamente." }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; dishId: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ message: "Servicio no configurado" }, { status: 503 })
  try {
    const { id: restaurantId, dishId } = await params
    const denied = await authorizeRestaurant(request, restaurantId)
    if (denied) return denied

    if (!restaurantId || !dishId) {
      return NextResponse.json({ message: "Restaurant ID and Dish ID are required" }, { status: 400 })
    }

    await deleteDishFromDB(restaurantId, dishId)
    return NextResponse.json({ message: "Dish deleted successfully" })
  } catch (error: any) {
    return NextResponse.json({ message: "No pudimos completar la solicitud. Intenta nuevamente." }, { status: 500 })
  }
}
