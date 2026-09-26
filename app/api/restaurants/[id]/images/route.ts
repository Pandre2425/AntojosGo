import { authorizeRestaurant } from "@/lib/server/restaurant-access"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ message: "Servicio no configurado" }, { status: 503 })
  try {
    const { id: restaurantId } = await params
    const denied = await authorizeRestaurant(request, restaurantId)
    if (denied) return denied
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string
    const caption = formData.get("caption") as string

    if (!restaurantId || !file || !type) {
      return NextResponse.json({ message: "Restaurant ID, file, and type are required" }, { status: 400 })
    }

    // For now, we'll use a placeholder URL since we don't have actual file storage set up
    // In a real implementation, you would upload to Vercel Blob or similar service
    const imageUrl = `/placeholder.svg?height=400&width=600&query=${encodeURIComponent(caption || "restaurant image")}`

    const supabase = await createServerClient()

    const { data: image, error } = await supabase
      .from("restaurant_images")
      .insert({
        restaurant_id: restaurantId,
        url: imageUrl,
        type,
        caption,
        is_primary: false,
        order_index: 0,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save image: ${error.message}`)
    }

    return NextResponse.json({
      message: "Image uploaded successfully",
      image: {
        id: image.id,
        url: image.url,
        type: image.type,
        caption: image.caption,
        isPrimary: image.is_primary,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ message: "No pudimos completar la solicitud. Intenta nuevamente." }, { status: 500 })
  }
}
