import { supabase } from "./supabase/client"
import type { Restaurant } from "./restaurants"
import type { Review } from "./reviews"

export interface AdminUser {
  id: string
  email: string
  name: string
  role: "admin" | "moderator" | "super_admin"
  is_active: boolean
  last_login: string | null
  created_at: string
}

export interface AdminStats {
  totalRestaurants: number
  totalReviews: number
  totalUsers: number
  averageRating: number
  recentActivity: AdminActivity[]
}

export interface AdminActivity {
  id: string
  admin_name: string
  action: string
  resource_type: string
  resource_id: string | null
  details: any
  created_at: string
}

export interface RestaurantFormData {
  name: string
  description: string
  cuisine_type: string
  address: string
  latitude: number | null
  longitude: number | null
  phone: string
  website: string
  price_range: number
  image_url: string
  features: string[]
}

let currentAdmin: AdminUser | null = null

export function getCurrentAdmin(): AdminUser | null {
  return currentAdmin
}

export function setCurrentAdmin(admin: AdminUser | null) {
  currentAdmin = admin
}

/** Demo admin login is permanently disabled (Sprint 0 P0). */
export async function adminLogin(
  _email: string,
  _password: string,
): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
  setCurrentAdmin(null)
  return {
    success: false,
    error:
      "El acceso de administrador demo está deshabilitado. No hay credenciales hardcodeadas; usa autenticación privilegiada real cuando esté configurada.",
  }
}

export function adminLogout() {
  setCurrentAdmin(null)
}

export async function getAdminStats(): Promise<AdminStats> {
  const empty: AdminStats = {
    totalRestaurants: 0,
    totalReviews: 0,
    totalUsers: 0,
    averageRating: 0,
    recentActivity: [],
  }

  if (!supabase) return empty

  try {
    const [restaurantsResult, reviewsResult] = await Promise.all([
      supabase.from("restaurants").select("rating", { count: "exact" }),
      supabase.from("reviews").select("*", { count: "exact" }),
    ])

    const totalRestaurants = restaurantsResult.count || 0
    const totalReviews = reviewsResult.count || 0
    const restaurantRatings = (restaurantsResult.data || []) as Array<{ rating: number | null }>
    const averageRating =
      restaurantRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / Math.max(totalRestaurants, 1) || 0

    return {
      totalRestaurants,
      totalReviews,
      totalUsers: 0,
      averageRating: Math.round(averageRating * 10) / 10,
      recentActivity: [],
    }
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return empty
  }
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase.from("restaurants").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching restaurants:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getAllRestaurants:", error)
    return []
  }
}

export async function createRestaurant(
  restaurantData: RestaurantFormData,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Database not available" }
  }

  try {
    const { error } = await supabase.from("restaurants").insert([
      {
        name: restaurantData.name,
        description: restaurantData.description,
        cuisine_type: restaurantData.cuisine_type,
        address: restaurantData.address,
        latitude: restaurantData.latitude,
        longitude: restaurantData.longitude,
        phone: restaurantData.phone || null,
        website: restaurantData.website || null,
        price_range: restaurantData.price_range,
        image_url: restaurantData.image_url || null,
        features: restaurantData.features,
        rating: 0,
        total_reviews: 0,
      },
    ])

    if (error) {
      console.error("Error creating restaurant:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in createRestaurant:", error)
    return { success: false, error: "Failed to create restaurant" }
  }
}

export async function updateRestaurant(
  id: string,
  restaurantData: Partial<RestaurantFormData>,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Database not available" }
  }

  try {
    const { error } = await supabase
      .from("restaurants")
      .update({
        ...restaurantData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      console.error("Error updating restaurant:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in updateRestaurant:", error)
    return { success: false, error: "Failed to update restaurant" }
  }
}

export async function deleteRestaurant(id: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Database not available" }
  }

  try {
    const { error } = await supabase.from("restaurants").delete().eq("id", id)

    if (error) {
      console.error("Error deleting restaurant:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteRestaurant:", error)
    return { success: false, error: "Failed to delete restaurant" }
  }
}

export async function getAllReviews(): Promise<(Review & { restaurant_name: string })[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        restaurants!inner(name)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching reviews:", error)
      return []
    }

    return (data || []).map((item: any) => ({
      ...item,
      restaurant_name: item.restaurants.name,
    }))
  } catch (error) {
    console.error("Error in getAllReviews:", error)
    return []
  }
}

export async function deleteReview(id: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Database not available" }
  }

  try {
    const { error } = await supabase.from("reviews").delete().eq("id", id)

    if (error) {
      console.error("Error deleting review:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteReview:", error)
    return { success: false, error: "Failed to delete review" }
  }
}
