import { NextResponse, type NextRequest } from "next/server"
import { getSupabase } from "@/lib/supabase/client"
import { listPublishedCatalog } from "@/modules/catalog/data/public-catalog"

/** GET /api/catalog/nearby?lat=&lng=&radiusMeters=&limit= */
export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ items: [], count: 0 })
  }

  const { searchParams } = request.nextUrl
  const lat = Number(searchParams.get("lat"))
  const lng = Number(searchParams.get("lng"))
  const radiusMeters = Number(searchParams.get("radiusMeters") ?? "5000")
  const limit = Number(searchParams.get("limit") ?? "20")
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ message: "lat y lng son requeridos" }, { status: 400 })
  }
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return NextResponse.json({ message: "radiusMeters debe ser positivo" }, { status: 400 })
  }

  try {
    const items = await listPublishedCatalog(supabase, {
      limit: safeLimit,
      location: { latitude: lat, longitude: lng, radiusKm: radiusMeters / 1000 },
    })
    return NextResponse.json({ items, count: items.length })
  } catch {
    return NextResponse.json({ items: [], count: 0 })
  }
}
