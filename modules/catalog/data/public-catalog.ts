import type { SupabaseClient } from '@supabase/supabase-js'
import { dbError } from '../../../lib/app-error'

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

/** Row returned by the search_public_catalog / get_public_branch SQL functions (supabase/migrations/20261002090000_public_catalog_v2.sql). */
type PublicBranchRow = Omit<PublicCatalogItem, 'distanceKm' | 'restaurant_id'> & {
  restaurant_id: string
  distance_m?: number | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function mapPublishedBranch(row: PublicBranchRow): PublicCatalogItem {
  const { distance_m, ...item } = row
  return distance_m == null ? item : { ...item, distanceKm: distance_m / 1000 }
}

/**
 * Diner catalog: only published branches, filtered/ordered in Postgres. Never samples.
 * Reads go through SECURITY DEFINER functions so anon never gets table access.
 */
export async function listPublishedCatalog(
  client: SupabaseClient,
  opts: {
    query?: string
    limit?: number
    location?: { latitude: number; longitude: number; radiusKm?: number }
  } = {},
): Promise<PublicCatalogItem[]> {
  const { data, error } = await client.rpc('search_public_catalog', {
    p_query: (opts.query ?? '').trim(),
    p_lat: opts.location?.latitude ?? null,
    p_lng: opts.location?.longitude ?? null,
    p_radius_m: Math.round((opts.location?.radiusKm ?? 50) * 1000),
    p_limit: Math.max(1, Math.min(opts.limit ?? 40, 100)),
  })
  if (error) throw Object.assign(dbError(error, 'No pudimos cargar el catálogo. Revisa la conexión e intenta de nuevo.'), { cause: error })
  return ((data || []) as PublicBranchRow[]).map(mapPublishedBranch)
}

export type PublicDish = { id: string; name: string; price: number; category: string | null; description: string | null; is_available: boolean; image_path?: string | null; image_url?: string | null }

/** Published dishes of a published branch; empty for drafts or unknown ids. */
export async function getPublicMenu(client: SupabaseClient, branchId: string): Promise<PublicDish[]> {
  if (!UUID.test(branchId)) return []
  const { data, error } = await client.rpc('get_public_dishes', { p_branch_id: branchId })
  if (error) throw dbError(error, 'No pudimos cargar el menú.')
  return ((data || []) as PublicDish[]).map(d => ({ ...d, price: Number(d.price) }))
}

export async function getPublishedBranch(
  client: SupabaseClient,
  id: string,
): Promise<PublicCatalogItem | null> {
  if (!UUID.test(id)) return null
  const { data, error } = await client.rpc('get_public_branch', { p_id: id })
  if (error) throw dbError(error, 'No pudimos cargar la sede. Revisa la conexión e intenta de nuevo.')
  const row = ((data || []) as PublicBranchRow[])[0]
  return row ? mapPublishedBranch(row) : null
}
