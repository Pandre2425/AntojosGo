"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Phone, Globe, Star, DollarSign, Wifi, Car } from "lucide-react"
import { getRestaurantById, type Restaurant } from "@/lib/restaurants"
import ReviewsDisplay from "./reviews-display"
import Image from "next/image"

interface RestaurantDetailsProps {
  restaurantId: string
  onBack?: () => void
}

export default function RestaurantDetails({ restaurantId, onBack }: RestaurantDetailsProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"info" | "reviews">("info")

  useEffect(() => {
    loadRestaurant()
  }, [restaurantId])

  const loadRestaurant = async () => {
    setLoading(true)
    try {
      const data = await getRestaurantById(restaurantId)
      setRestaurant(data)
    } catch (error) {
      console.error("Error loading restaurant:", error)
    } finally {
      setLoading(false)
    }
  }

  const getPriceDisplay = (priceRange: number | null) => {
    if (!priceRange) return ""
    return "$".repeat(priceRange)
  }

  const getFeatureIcon = (feature: string) => {
    switch (feature.toLowerCase()) {
      case "wifi":
        return <Wifi className="w-4 h-4" />
      case "outdoor seating":
        return <Car className="w-4 h-4" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Restaurante no encontrado</p>
        {onBack && (
          <Button variant="outline" onClick={onBack} className="mt-4 bg-transparent">
            Volver
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
      </div>

      {/* Restaurant Image */}
      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
        <Image
          src={restaurant.image_url || "/placeholder-ws0y7.png"}
          alt={restaurant.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <Button
          variant={activeTab === "info" ? "default" : "ghost"}
          onClick={() => setActiveTab("info")}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          Información
        </Button>
        <Button
          variant={activeTab === "reviews" ? "default" : "ghost"}
          onClick={() => setActiveTab("reviews")}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          Reseñas ({restaurant.total_reviews})
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{restaurant.name}</span>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{restaurant.rating}</span>
                  <span className="text-gray-600">({restaurant.total_reviews})</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {restaurant.description && <p className="text-gray-700">{restaurant.description}</p>}

              <div className="flex items-center gap-4 text-sm">
                {restaurant.cuisine_type && <Badge variant="secondary">{restaurant.cuisine_type}</Badge>}
                {restaurant.price_range && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">{getPriceDisplay(restaurant.price_range)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información de contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                <span className="text-gray-700">{restaurant.address}</span>
              </div>

              {restaurant.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">{restaurant.phone}</span>
                </div>
              )}

              {restaurant.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-500" />
                  <a
                    href={restaurant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Sitio web
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features */}
          {restaurant.features && restaurant.features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Características</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {restaurant.features.map((feature, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {getFeatureIcon(feature)}
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "reviews" && <ReviewsDisplay restaurantId={restaurant.id} restaurantName={restaurant.name} />}
    </div>
  )
}
