import type { SupabaseClient } from '@supabase/supabase-js'

export type PublicCatalogItem = {
  id: string
  restaurant_id?: string
  name: string
  branch_name: string
  description: string | null
  address: string
  municipality: string
  department: string
  latitude: number | null
  longitude: number | null
  /** Distance in km when the caller supplied a user location. */
  distanceKm?: number
}

type PublicBranchRow = {
  id: string
  name: string
  department: string
  municipality: string
  address: string
  latitude: number | null
  longitude: number | null
  status: string
  restaurants:
    | { id: string; name: string; description: string | null }
    | { id: string; name: string; description: string | null }[]
    | null
}

const SELECT =
  'id,name,department,municipality,address,latitude,longitude,status,restaurants!inner(id,name,description)'

function unwrapBusiness(row: PublicBranchRow) {
  const raw = row.restaurants
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

export function mapPublishedBranch(row: PublicBranchRow): PublicCatalogItem {
  const business = unwrapBusiness(row)
  return {
    id: row.id,
    restaurant_id: business?.id,
    name: business?.name ?? row.name,
    branch_name: row.name,
    description: business?.description ?? null,
    address: row.address,
    municipality: row.municipality,
    department: row.department,
    latitude: row.latitude,
    longitude: row.longitude,
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Diner catalog: only restaurant_branches with status=published. Never samples. */
export async function listPublishedCatalog(
  client: SupabaseClient,
  opts: {
    query?: string
    limit?: number
    location?: { latitude: number; longitude: number; radiusKm?: number }
  } = {},
): Promise<PublicCatalogItem[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? 40, 100))
  const { data, error } = await client
    .from('restaurant_branches')
    .select(SELECT)
    .eq('status', 'published')
    .limit(200)

  if (error) throw new Error('No pudimos cargar el catálogo. Revisa la conexión e intenta de nuevo.')

  let items = ((data || []) as PublicBranchRow[]).map(mapPublishedBranch)

  const term = (opts.query ?? '').trim().toLocaleLowerCase()
  if (term) {
    items = items.filter((item) =>
      [item.name, item.branch_name, item.description, item.address, item.municipality, item.department]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(term),
    )
  }

  if (opts.location) {
    const radius = opts.location.radiusKm ?? 50
    const originLat = opts.location.latitude
    const originLng = opts.location.longitude
    const withDistance: PublicCatalogItem[] = []
    for (const item of items) {
      if (item.latitude == null || item.longitude == null) continue
      const distanceKm = haversineKm(originLat, originLng, item.latitude, item.longitude)
      if (distanceKm > radius) continue
      withDistance.push({ ...item, distanceKm })
    }
    items = withDistance.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
  }

  return items.slice(0, limit)
}

export async function getPublishedBranch(
  client: SupabaseClient,
  id: string,
): Promise<PublicCatalogItem | null> {
  const { data, error } = await client
    .from('restaurant_branches')
    .select(SELECT)
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()
  if (error) throw new Error('No pudimos cargar la sede. Revisa la conexión e intenta de nuevo.')
  if (!data) return null
  return mapPublishedBranch(data as PublicBranchRow)
}
