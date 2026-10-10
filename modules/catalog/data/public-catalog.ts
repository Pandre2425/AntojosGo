import type { SupabaseClient } from '@supabase/supabase-js'
import { dbError } from '../../../lib/app-error'
import { isOpenNow, type OpeningHours } from '../../../shared/contracts/hours'
import { allergenStatus, type Allergen, type AllergenDeclaration, type DishTag } from '../../../shared/contracts/menu'
import { avoidRegex, normalize, queryGroups } from '../../../shared/contracts/assistant'

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
  category?: string | null
  /** null = no hours registered. */
  openNow?: boolean | null
  /** Best dish matching the search/filters, with its allergen declaration (never assumed safe). */
  dish?: { name: string; price: number; allergensDeclared: boolean; contains: Allergen[] } | null
  /** Storage path from the DB; the API replaces it with a public URL. */
  logo_url?: string | null
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

export type CatalogFilters = {
  query?: string
  limit?: number
  location?: { latitude: number; longitude: number; radiusKm?: number }
  category?: string
  tags?: DishTag[]
  without?: Allergen[]
  avoid?: string[]
  openNow?: boolean
  sort?: 'relevance' | 'price'
}

type SearchRow = {
  id: string; restaurant_id: string; name: string; branch_name: string; category: string | null; description: string | null
  address: string; municipality: string; department: string; latitude: number | null; longitude: number | null
  distance_m: number | null; opening_hours: OpeningHours | null
  match_dish: string | null; match_price: number | string | null; match_allergens: string[] | null
}

/**
 * Diner catalog: only published branches, filtered in Postgres (search_catalog_v2). Never samples.
 * Every filter must hold: text words, dish tags, category, allergens excluded, ingredients avoided.
 */
export async function listPublishedCatalog(client: SupabaseClient, opts: CatalogFilters = {}): Promise<PublicCatalogItem[]> {
  const groups = [...queryGroups(opts.query ?? ''), ...(opts.tags ?? []).map(tag => ({ re: '', tags: [tag] }))].slice(0, 6)
  const avoid = (opts.avoid ?? []).map(normalize).filter(w => /^[a-z0-9]{3,30}$/.test(w)).slice(0, 5)
  const { data, error } = await client.rpc('search_catalog_v2', {
    p_groups: groups,
    p_lat: opts.location?.latitude ?? null,
    p_lng: opts.location?.longitude ?? null,
    p_radius_m: Math.round((opts.location?.radiusKm ?? 50) * 1000),
    p_limit: Math.max(1, Math.min(opts.limit ?? 40, 50)),
    p_require_all: true,
    p_category: opts.category ?? null,
    p_without: opts.without ?? [],
    p_avoid: avoidRegex(avoid),
  })
  if (error) throw Object.assign(dbError(error, 'No pudimos cargar el catálogo. Revisa la conexión e intenta de nuevo.'), { cause: error })
  let items = ((data || []) as SearchRow[]).map(toCatalogItem)
  if (opts.openNow) items = items.filter(i => i.openNow !== false).sort((a, b) => Number(b.openNow === true) - Number(a.openNow === true))
  if (opts.sort === 'price') items = [...items].sort((a, b) => (a.dish ? a.dish.price : Infinity) - (b.dish ? b.dish.price : Infinity))
  return withLogos(client, items)
}

/** One extra query for the logos of the restaurants in the results. */
async function withLogos(client: SupabaseClient, items: PublicCatalogItem[]): Promise<PublicCatalogItem[]> {
  const ids = [...new Set(items.map(i => i.restaurant_id).filter((v): v is string => Boolean(v)))]
  if (!ids.length) return items
  const { data } = await client.rpc('get_public_restaurant_images', { p_ids: ids })
  const logos = new Map(((data ?? []) as { id: string; logo_path: string | null }[]).map(r => [r.id, r.logo_path]))
  return items.map(i => ({ ...i, logo_url: (i.restaurant_id && logos.get(i.restaurant_id)) || null }))
}

export function toCatalogItem(row: SearchRow): PublicCatalogItem {
  const allergens = allergenStatus(row.match_allergens)
  return {
    id: row.id, restaurant_id: row.restaurant_id, name: row.name, branch_name: row.branch_name, description: row.description,
    address: row.address, municipality: row.municipality, department: row.department, latitude: row.latitude, longitude: row.longitude,
    ...(row.distance_m == null ? {} : { distanceKm: row.distance_m / 1000 }),
    category: row.category, openNow: isOpenNow(row.opening_hours ?? []),
    dish: row.match_dish ? { name: row.match_dish, price: Number(row.match_price), allergensDeclared: allergens.declared, contains: allergens.contains } : null,
  }
}

export type PublicDish = {
  id: string; name: string; price: number; category: string | null; description: string | null; is_available: boolean
  image_path?: string | null; image_url?: string | null; tags?: DishTag[]; ingredients?: string[]; allergens?: AllergenDeclaration[]
}

/** Published dishes of a published branch; empty for drafts or unknown ids. */
export async function getPublicMenu(client: SupabaseClient, branchId: string): Promise<PublicDish[]> {
  if (!UUID.test(branchId)) return []
  const { data, error } = await client.rpc('get_public_dishes_full', { p_branch_id: branchId })
  if (error) throw dbError(error, 'No pudimos cargar el menú.')
  return ((data || []) as PublicDish[]).map(d => ({ ...d, price: Number(d.price) }))
}

/** Extra public data of a published branch (hours, …); empty object for drafts or unknown ids. */
export type PublicBranchExtras = {
  opening_hours?: OpeningHours; phone?: string | null; whatsapp?: boolean; category?: string | null
  /** Storage paths in the DB function; the API replaces them with public URLs. */
  logo_url?: string | null; cover_url?: string | null
}
export async function getPublicBranchExtras(client: SupabaseClient, id: string): Promise<PublicBranchExtras> {
  if (!UUID.test(id)) return {}
  const { data, error } = await client.rpc('get_public_branch_extras', { p_id: id })
  if (error) throw dbError(error, 'No pudimos cargar la sede. Revisa la conexión e intenta de nuevo.')
  const { logo_path, cover_path, ...rest } = (data ?? {}) as PublicBranchExtras & { logo_path?: string | null; cover_path?: string | null }
  return { ...rest, logo_url: logo_path ?? null, cover_url: cover_path ?? null }
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
