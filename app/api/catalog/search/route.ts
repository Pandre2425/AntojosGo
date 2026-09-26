import { NextResponse, type NextRequest } from "next/server"
import { getSupabase } from "@/lib/supabase/client"
import { listPublishedCatalog } from "@/modules/catalog/data/public-catalog"

/**
 * GET /api/catalog/search?q=&lat=&lng=&radiusMeters=&limit=
 * Public diner catalog: only published branches. Empty if none.
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ items: [], count: 0 })
  }

  const { searchParams } = request.nextUrl
  const q = searchParams.get("q") ?? ""
  const latRaw = searchParams.get("lat")
  const lngRaw = searchParams.get("lng")
  const radiusMeters = Number(searchParams.get("radiusMeters") ?? "5000")
  const limit = Number(searchParams.get("limit") ?? "20")
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20

  const hasGeo = latRaw != null && lngRaw != null && latRaw !== "" && lngRaw !== ""
  let location: { latitude: number; longitude: number; radiusKm: number } | undefined

  if (hasGeo) {
    const lat = Number(latRaw)
    const lng = Number(lngRaw)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ message: "lat y lng deben ser números" }, { status: 400 })
    }
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      return NextResponse.json({ message: "radiusMeters debe ser positivo" }, { status: 400 })
    }
    location = { latitude: lat, longitude: lng, radiusKm: radiusMeters / 1000 }
  }

  try {
    const items = await listPublishedCatalog(supabase, {
      query: q,
      limit: safeLimit,
      location,
    })
    return NextResponse.json({ items, count: items.length })
  } catch {
    return NextResponse.json({ items: [], count: 0 })
  }
}
