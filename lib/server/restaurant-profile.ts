import "server-only"
import { createServerClient } from "@/lib/supabase/server"
import type { RestaurantProfile, UpdateProfileData } from "../restaurant-profile"

export async function fetchRestaurantProfile(restaurantId: string): Promise<RestaurantProfile> {
  const supabase = await createServerClient()

  try {
    // Get restaurant data
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select(`
        *,
        restaurant_categories!inner(
          categories(name)
        ),
        restaurant_images(
          id, url, type, caption, is_primary, order_index
        )
      `)
      .eq("id", restaurantId)
      .single()

    if (restaurantError) {
      throw new Error(`Restaurant not found: ${restaurantError.message}`)
    }

    // Format the response
    const profile: RestaurantProfile = {
      id: restaurant.id,
      name: restaurant.name,
      email: restaurant.email,
      description: restaurant.description || "",
      address: restaurant.address,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      phone: restaurant.phone,
      website: restaurant.website,
      logoUrl: restaurant.logo_url,
      socialMedia: restaurant.social_media || {},
      openingHours: restaurant.opening_hours || {},
      priceRange: restaurant.price_range,
      serviceOptions: restaurant.service_options || [],
      legalInfo: restaurant.legal_info || {},
      isVerified: restaurant.is_verified,
      isActive: restaurant.is_active,
      rating: restaurant.rating,
      reviewCount: restaurant.review_count,
      categories: restaurant.restaurant_categories?.map((rc: any) => rc.categories.name) || [],
      images:
        restaurant.restaurant_images?.map((img: any) => ({
          id: img.id,
          url: img.url,
          type: img.type,
          caption: img.caption,
          isPrimary: img.is_primary,
        })) || [],
    }

    return profile
  } catch (error) {
    console.error("[v0] Fetch restaurant profile error:", error)
    throw error
  }
}

export async function updateRestaurantProfileData(restaurantId: string, data: UpdateProfileData) {
  const supabase = await createServerClient()

  try {
    // Update restaurant basic info
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({
        name: data.name,
        description: data.description,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        phone: data.phone,
        website: data.website,
        logo_url: data.logoUrl,
        social_media: data.socialMedia,
        opening_hours: data.openingHours,
        price_range: data.priceRange,
        service_options: data.serviceOptions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", restaurantId)

    if (updateError) {
      throw new Error(`Failed to update restaurant: ${updateError.message}`)
    }

    // Update categories if provided
    if (data.categories) {
      // Remove existing categories
      await supabase.from("restaurant_categories").delete().eq("restaurant_id", restaurantId)

      // Add new categories
      if (data.categories.length > 0) {
        const { data: categories } = await supabase.from("categories").select("id, name").in("name", data.categories)

        if (categories && categories.length > 0) {
          const categoryLinks = categories.map((cat) => ({
            restaurant_id: restaurantId,
            category_id: cat.id,
          }))

          await supabase.from("restaurant_categories").insert(categoryLinks)
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Update restaurant profile data error:", error)
    throw error
  }
}
