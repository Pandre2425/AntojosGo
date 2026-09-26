import { getSupabase } from "./supabase/client"

export interface Restaurant {
  id: string
  name: string
  description: string | null
  cuisine_type: string | null
  address: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  website: string | null
  price_range: number | null
  rating: number
  total_reviews: number
  image_url: string | null
  opening_hours: any
  features: string[] | null
  dietary_options: string[] | null
  allergens: string[] | null
  accessibility_features: string[] | null
  special_features: string[] | null
  ingredients_keywords: string[] | null
  created_at: string
  updated_at: string
  delivery_time?: number
  distance?: number
  /** Business id when catalog row is a published branch. */
  restaurant_id?: string
  branch_name?: string
}

export type RestaurantType = Restaurant

export interface SearchFilters {
  cuisine?: string
  priceRange?: number[]
  rating?: number
  features?: string[]
  dietaryOptions?: string[]
  allergenFree?: string[]
  accessibilityFeatures?: string[]
  specialFeatures?: string[]
  ingredients?: string[]
  location?: {
    latitude: number
    longitude: number
    radius?: number // in kilometers
  }
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
    | {
        id: string
        name: string
        description: string | null
      }
    | {
        id: string
        name: string
        description: string | null
      }[]
    | null
}

const PUBLIC_BRANCH_SELECT =
  "id,name,department,municipality,address,latitude,longitude,status,restaurants!inner(id,name,description)"

function unwrapBusiness(row: PublicBranchRow) {
  const raw = row.restaurants
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

/** Map a published branch + business to a diner-safe catalog card. No invented ratings. */
export function mapPublishedBranchToRestaurant(row: PublicBranchRow): Restaurant {
  const business = unwrapBusiness(row)
  const addressParts = [row.address, row.municipality, row.department].filter(Boolean)
  return {
    id: row.id,
    restaurant_id: business?.id,
    branch_name: row.name,
    name: business?.name ?? row.name,
    description: business?.description ?? null,
    cuisine_type: null,
    address: addressParts.join(", "),
    latitude: row.latitude,
    longitude: row.longitude,
    phone: null,
    website: null,
    price_range: null,
    rating: 0,
    total_reviews: 0,
    image_url: null,
    opening_hours: {},
    features: null,
    dietary_options: null,
    allergens: null,
    accessibility_features: null,
    special_features: null,
    ingredients_keywords: null,
    created_at: "",
    updated_at: "",
  }
}

function applyClientFilters(items: Restaurant[], query: string, filters: SearchFilters, limit: number): Restaurant[] {
  const term = query.trim().toLocaleLowerCase()
  const overlaps = (values: string[] | null, selected?: string[]) =>
    !selected?.length || selected.some((value) => values?.includes(value))

  return items
    .filter((restaurant) => {
      const text = [restaurant.name, restaurant.description, restaurant.cuisine_type, restaurant.address, restaurant.branch_name]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
      return (
        (!term || text.includes(term)) &&
        (!filters.cuisine || restaurant.cuisine_type === filters.cuisine) &&
        (!filters.rating || restaurant.rating >= filters.rating) &&
        (!filters.priceRange ||
          (restaurant.price_range !== null &&
            restaurant.price_range >= filters.priceRange[0] &&
            restaurant.price_range <= filters.priceRange[1])) &&
        overlaps(restaurant.features, filters.features) &&
        overlaps(restaurant.dietary_options, filters.dietaryOptions) &&
        overlaps(restaurant.accessibility_features, filters.accessibilityFeatures) &&
        overlaps(restaurant.special_features, filters.specialFeatures) &&
        overlaps(restaurant.ingredients_keywords, filters.ingredients) &&
        (!filters.allergenFree?.length || !filters.allergenFree.some((value) => restaurant.allergens?.includes(value)))
      )
    })
    .slice(0, Math.max(0, limit))
}

/** Haversine distance in meters. */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return 2 * R * Math.asin(Math.sqrt(a))
}

async function fetchPublishedBranches(limit = 100): Promise<Restaurant[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("restaurant_branches")
      .select(PUBLIC_BRANCH_SELECT)
      .eq("status", "published")
      .limit(Math.max(1, Math.min(limit, 200)))

    if (error) {
      console.error("Public catalog query failed:", error.message)
      return []
    }

    return ((data || []) as PublicBranchRow[]).map(mapPublishedBranchToRestaurant)
  } catch (error) {
    console.error("Public catalog unavailable:", error)
    return []
  }
}

/** Test-only filter over getSampleRestaurants. Production paths must not call this. */
export function searchSampleRestaurants(query = "", filters: SearchFilters = {}, limit = 20): Restaurant[] {
  const term = query.trim().toLocaleLowerCase()
  const overlaps = (values: string[] | null, selected?: string[]) =>
    !selected?.length || selected.some((value) => values?.includes(value))

  return getSampleRestaurants()
    .filter((restaurant) => {
      const text = [restaurant.name, restaurant.description, restaurant.cuisine_type, ...(restaurant.ingredients_keywords ?? [])]
        .join(" ")
        .toLocaleLowerCase()
      return (
        (!term || text.includes(term)) &&
        (!filters.cuisine || restaurant.cuisine_type === filters.cuisine) &&
        (!filters.rating || restaurant.rating >= filters.rating) &&
        (!filters.priceRange ||
          (restaurant.price_range !== null &&
            restaurant.price_range >= filters.priceRange[0] &&
            restaurant.price_range <= filters.priceRange[1])) &&
        overlaps(restaurant.features, filters.features) &&
        overlaps(restaurant.dietary_options, filters.dietaryOptions) &&
        overlaps(restaurant.accessibility_features, filters.accessibilityFeatures) &&
        overlaps(restaurant.special_features, filters.specialFeatures) &&
        overlaps(restaurant.ingredients_keywords, filters.ingredients) &&
        (!filters.allergenFree?.length || !filters.allergenFree.some((value) => restaurant.allergens?.includes(value)))
      )
    })
    .slice(0, Math.max(0, limit))
}

/**
 * Diner-facing catalog: ONLY restaurant_branches with status='published' joined to restaurants.
 * Returns [] when none exist or Supabase is not configured / RLS blocks (migration pending).
 */
export async function searchRestaurants(query = "", filters: SearchFilters = {}, limit = 20): Promise<Restaurant[]> {
  const published = await fetchPublishedBranches(Math.max(limit * 3, 60))

  let results = applyClientFilters(published, query, filters, Math.max(limit * 2, limit))

  if (filters.location?.latitude != null && filters.location?.longitude != null) {
    const radiusKm = filters.location.radius ?? 50
    const radiusMeters = radiusKm * 1000
    const originLat = filters.location.latitude
    const originLng = filters.location.longitude
    const withDistance: Restaurant[] = []
    for (const item of results) {
      if (item.latitude == null || item.longitude == null) continue
      const distance = haversineMeters(originLat, originLng, item.latitude, item.longitude)
      if (distance > radiusMeters) continue
      withDistance.push({ ...item, distance: distance / 1000 })
    }
    results = withDistance.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
  }

  return results.slice(0, Math.max(0, limit))
}

/** Nearby published catalog sorted by distance (meters). Empty if none in radius. */
export async function searchNearbyRestaurants(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  limit = 20,
): Promise<Restaurant[]> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return []
  }

  const published = await fetchPublishedBranches(200)
  const withDistance: Restaurant[] = []
  for (const item of published) {
    if (item.latitude == null || item.longitude == null) continue
    const distanceM = haversineMeters(latitude, longitude, item.latitude, item.longitude)
    if (distanceM > radiusMeters) continue
    withDistance.push({ ...item, distance: distanceM / 1000 })
  }
  return withDistance
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    .slice(0, Math.max(0, limit))
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("restaurant_branches")
      .select(PUBLIC_BRANCH_SELECT)
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle()

    if (error || !data) return null
    return mapPublishedBranchToRestaurant(data as PublicBranchRow)
  } catch {
    return null
  }
}

export async function getCuisineTypes(): Promise<string[]> {
  const published = await fetchPublishedBranches(200)
  return [
    ...new Set(published.map((restaurant) => restaurant.cuisine_type).filter((value): value is string => Boolean(value))),
  ]
}

/** Fixture data for unit tests only. Not used by production catalog paths. */
export function getSampleRestaurants(): Restaurant[] {
  return [
    {
      id: "sample-1",
      name: "Restaurante Típico Guatemalteco",
      description: "Authentic Guatemalan cuisine with traditional pepián and kak'ik",
      cuisine_type: "Guatemalan",
      address: "Zona 1, Guatemala City",
      latitude: 14.6349,
      longitude: -90.5069,
      phone: "+502 2251-1234",
      website: null,
      price_range: 2,
      rating: 4.5,
      total_reviews: 127,
      image_url: "/guatemalan-tacos.png",
      opening_hours: {},
      features: ["Traditional", "Family-friendly"],
      dietary_options: ["traditional", "meat-heavy", "gluten-free-options"],
      allergens: ["nuts", "dairy"],
      accessibility_features: ["ground-floor-access", "wide-doorways"],
      special_features: ["family-friendly", "traditional-music", "cultural-experience"],
      ingredients_keywords: ["pepián", "kak'ik", "corn", "beans", "chicken", "beef", "tomato"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "sample-2",
      name: "Pizza Bella Vista",
      description: "Wood-fired pizzas with a view of the city",
      cuisine_type: "Italian",
      address: "Zona 10, Guatemala City",
      latitude: 14.5995,
      longitude: -90.5069,
      phone: "+502 2367-5678",
      website: null,
      price_range: 3,
      rating: 4.2,
      total_reviews: 89,
      image_url: "/pizza-restaurant-interior.png",
      opening_hours: {},
      features: ["Outdoor seating", "Delivery"],
      dietary_options: ["vegetarian", "vegan-options", "gluten-free-options"],
      allergens: ["gluten", "dairy"],
      accessibility_features: ["wheelchair-accessible", "parking-available", "accessible-restrooms"],
      special_features: ["pet-friendly", "outdoor-seating", "wifi", "city-view"],
      ingredients_keywords: ["tomato", "cheese", "basil", "pasta", "pizza", "mozzarella", "pepperoni"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]
}
