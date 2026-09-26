"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, ThumbsUp, Calendar, User, Plus } from "lucide-react"
import { getRestaurantReviews, getReviewStats, markReviewHelpful, type Review } from "@/lib/reviews"
import ReviewForm from "./review-form"

interface ReviewsDisplayProps {
  restaurantId: string
  restaurantName: string
}

export default function ReviewsDisplay({ restaurantId, restaurantName }: ReviewsDisplayProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: {} as { [key: number]: number },
  })
  const [loading, setLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)

  useEffect(() => {
    loadReviews()
  }, [restaurantId])

  const loadReviews = async () => {
    setLoading(true)
    try {
      const [reviewsData, statsData] = await Promise.all([
        getRestaurantReviews(restaurantId, 20),
        getReviewStats(restaurantId),
      ])
      setReviews(reviewsData)
      setStats(statsData)
    } catch (error) {
      console.error("Error loading reviews:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewSubmitted = () => {
    setShowReviewForm(false)
    loadReviews() // Reload reviews after submission
  }

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      const result = await markReviewHelpful(reviewId)
      if (result.success) {
        // Update the local state to reflect the change
        setReviews((prev) =>
          prev.map((review) =>
            review.id === reviewId ? { ...review, helpful_count: review.helpful_count + 1 } : review,
          ),
        )
      }
    } catch (error) {
      console.error("Error marking review as helpful:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-GT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getRatingBarWidth = (rating: number) => {
    if (stats.totalReviews === 0) return 0
    return (stats.ratingDistribution[rating] / stats.totalReviews) * 100
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Review Stats */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center">
                  <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                  <span className="text-2xl font-bold ml-1">{stats.averageRating.toFixed(1)}</span>
                </div>
                <span className="text-gray-600">({stats.totalReviews} reseñas)</span>
              </div>
            </div>
            <Button onClick={() => setShowReviewForm(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Escribir reseña
            </Button>
          </div>

          {/* Rating Distribution */}
          {stats.totalReviews > 0 && (
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-3 text-sm">
                  <span className="w-8">{rating}</span>
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getRatingBarWidth(rating)}%` }}
                    ></div>
                  </div>
                  <span className="w-8 text-gray-600">{stats.ratingDistribution[rating] || 0}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Form */}
      {showReviewForm && (
        <ReviewForm
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          onReviewSubmitted={handleReviewSubmitted}
          onCancel={() => setShowReviewForm(false)}
        />
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Reseñas de clientes</h3>

        {reviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-semibold mb-2">No hay reseñas aún</h4>
              <p className="text-gray-600 mb-4">Sé el primero en compartir tu experiencia en este restaurante</p>
              <Button onClick={() => setShowReviewForm(true)}>Escribir primera reseña</Button>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-amber-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">{review.user_name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span>•</span>
                          <span>{formatDate(review.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {review.visit_date && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Visitó el {formatDate(review.visit_date)}
                      </Badge>
                    )}
                  </div>

                  {/* Review Content */}
                  {review.title && <h4 className="font-semibold text-gray-900">{review.title}</h4>}

                  {review.comment && <p className="text-gray-700 leading-relaxed">{review.comment}</p>}

                  {/* Review Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkHelpful(review.id)}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Útil ({review.helpful_count})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
