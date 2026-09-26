import "server-only"
import { createServerClient } from "@/lib/supabase/server"
import type { RestaurantAnalytics } from "../restaurant-analytics"

export async function fetchRestaurantAnalytics(restaurantId: string): Promise<RestaurantAnalytics> {
  const supabase = await createServerClient()

  try {
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("rating, review_count")
      .eq("id", restaurantId)
      .single()

    // Canonical menu table is foods (docs/MENU-FOODS.md). dishes is legacy.
    const { data: foods } = await supabase
      .from("foods")
      .select("*")
      .eq("restaurant_id", restaurantId)

    const { data: reviews } = await supabase
      .from("restaurant_reviews")
      .select("id, user_name, rating, comment, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(5)

    let metrics: Array<{
      date: string
      profile_views: number | null
      recommendation_count: number | null
    }> = []
    try {
      const { data: metricsData } = await supabase
        .from("restaurant_metrics")
        .select("date, profile_views, recommendation_count")
        .eq("restaurant_id", restaurantId)
        .order("date", { ascending: false })
        .limit(30)

      metrics = metricsData || []
    } catch {
      metrics = []
    }

    const totalDishes = foods?.length || 0
    const activeDishes = foods?.filter((d) => d.is_available).length || 0
    const specialDishes = foods?.filter((d) => d.is_special).length || 0

    // Honest views: only sum real metric rows. Never invent with Math.random.
    const hasRealViews = metrics.some((m) => m.profile_views != null && m.profile_views > 0)
    const totalViews = metrics.reduce((sum, m) => sum + (m.profile_views || 0), 0)

    const monthlyMetrics =
      metrics.length > 0
        ? metrics.slice(0, 6).map((m) => ({
            month: new Date(m.date).toLocaleDateString("es-ES", { month: "short" }),
            views: m.profile_views || 0,
            reviews: 0,
          }))
        : []

    return {
      profileViews: hasRealViews ? totalViews : 0,
      viewsUnavailable: !hasRealViews,
      viewsNote: hasRealViews
        ? undefined
        : "Las vistas de perfil no están disponibles: no hay métricas reales registradas.",
      totalReviews: restaurant?.review_count || 0,
      averageRating: restaurant?.rating || 0,
      totalDishes,
      activeDishes,
      specialDishes,
      recentReviews:
        reviews?.map((r) => ({
          id: r.id,
          userName: r.user_name,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.created_at,
        })) || [],
      popularDishes:
        foods?.slice(0, 5).map((d) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          price: d.price,
          views: 0,
        })) || [],
      monthlyMetrics,
    }
  } catch (error) {
    console.error("[v0] Fetch restaurant analytics error:", error)
    throw error
  }
}
