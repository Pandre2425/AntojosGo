import { supabase } from "./supabase/client"

export interface Review {
  id: string
  restaurant_id: string
  user_id: string | null
  user_name: string
  rating: number
  title: string | null
  comment: string | null
  visit_date: string | null
  helpful_count: number
  created_at: string
  updated_at: string
}

export interface ReviewSubmission {
  restaurant_id: string
  user_name: string
  rating: number
  title?: string
  comment?: string
  visit_date?: string
}

export async function getRestaurantReviews(restaurantId: string, limit = 10): Promise<Review[]> {
  if (!supabase) {
    console.error("Supabase client not available")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching reviews:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getRestaurantReviews:", error)
    return []
  }
}

export async function submitReview(review: ReviewSubmission): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.error("Supabase client not available")
    return { success: false, error: "Database not available" }
  }

  try {
    const { error } = await supabase.from("reviews").insert([
      {
        restaurant_id: review.restaurant_id,
        user_name: review.user_name,
        rating: review.rating,
        title: review.title || null,
        comment: review.comment || null,
        visit_date: review.visit_date || null,
      },
    ])

    if (error) {
      console.error("Error submitting review:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in submitReview:", error)
    return { success: false, error: "Failed to submit review" }
  }
}

export async function getReviewStats(restaurantId: string): Promise<{
  averageRating: number
  totalReviews: number
  ratingDistribution: { [key: number]: number }
}> {
  if (!supabase) {
    console.error("Supabase client not available")
    return { averageRating: 0, totalReviews: 0, ratingDistribution: {} }
  }

  try {
    const { data, error } = await supabase.from("reviews").select("rating").eq("restaurant_id", restaurantId)

    if (error) {
      console.error("Error fetching review stats:", error)
      return { averageRating: 0, totalReviews: 0, ratingDistribution: {} }
    }

    const reviews = data || []
    const totalReviews = reviews.length

    if (totalReviews === 0) {
      return { averageRating: 0, totalReviews: 0, ratingDistribution: {} }
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews

    const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach((review) => {
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1
    })

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
    }
  } catch (error) {
    console.error("Error in getReviewStats:", error)
    return { averageRating: 0, totalReviews: 0, ratingDistribution: {} }
  }
}

export async function markReviewHelpful(reviewId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.error("Supabase client not available")
    return { success: false, error: "Database not available" }
  }

  try {
    // First get the current helpful count
    const { data: currentReview, error: fetchError } = await supabase
      .from("reviews")
      .select("helpful_count")
      .eq("id", reviewId)
      .single()

    if (fetchError) {
      console.error("Error fetching review:", fetchError)
      return { success: false, error: fetchError.message }
    }

    // Increment the helpful count
    const { error: updateError } = await supabase
      .from("reviews")
      .update({ helpful_count: (currentReview.helpful_count || 0) + 1 })
      .eq("id", reviewId)

    if (updateError) {
      console.error("Error updating helpful count:", updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in markReviewHelpful:", error)
    return { success: false, error: "Failed to mark review as helpful" }
  }
}
