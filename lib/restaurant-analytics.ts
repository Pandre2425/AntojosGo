import { requestJSON } from "./http"
import { DEMO_RESTAURANT_ID, getDemoAnalytics } from './demo-restaurant'

export interface RestaurantAnalytics {
  profileViews: number
  /** True when profileViews is zero because views are not tracked yet. */
  viewsUnavailable?: boolean
  viewsNote?: string
  totalReviews: number
  averageRating: number
  totalDishes: number
  activeDishes: number
  specialDishes: number
  recentReviews: Array<{
    id: string
    userName: string
    rating: number
    comment: string
    createdAt: string
  }>
  popularDishes: Array<{
    id: string
    name: string
    category: string
    price: number
    views: number
  }>
  monthlyMetrics: Array<{
    month: string
    views: number
    reviews: number
  }>
}

// Client-side functions
export async function getRestaurantAnalytics(restaurantId: string, signal?: AbortSignal): Promise<RestaurantAnalytics> {
  if (restaurantId === DEMO_RESTAURANT_ID) return getDemoAnalytics(restaurantId)
  try {
    return await requestJSON<RestaurantAnalytics>(`/api/restaurants/${restaurantId}/analytics`, { signal })
  } catch (error) {
    console.error("[v0] Get restaurant analytics error:", error)
    throw error
  }
}
