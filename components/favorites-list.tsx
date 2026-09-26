"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, MapPin, Star, Clock } from "lucide-react"
import type { Restaurant } from "@/lib/restaurants"

interface FavoritesListProps {
  onRestaurantSelect: (restaurant: Restaurant) => void
}

export default function FavoritesList({ onRestaurantSelect }: FavoritesListProps) {
  const [favorites, setFavorites] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading favorites from local storage or API
    const loadFavorites = () => {
      const savedFavorites = localStorage.getItem("antojosgo-favorites")
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites))
      }
      setLoading(false)
    }

    setTimeout(loadFavorites, 500)
  }, [])

  const removeFavorite = (restaurantId: string) => {
    const updatedFavorites = favorites.filter((fav) => fav.id !== restaurantId)
    setFavorites(updatedFavorites)
    localStorage.setItem("antojosgo-favorites", JSON.stringify(updatedFavorites))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-8">
        <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No tienes favoritos aún</h3>
        <p className="text-gray-500 mb-4">Guarda restaurantes que te gusten para encontrarlos fácilmente</p>
        <Button variant="outline" onClick={() => {}}>
          Explorar Restaurantes
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {favorites.map((restaurant) => (
        <Card key={restaurant.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg">{restaurant.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFavorite(restaurant.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Heart className="w-4 h-4 fill-current" />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <MapPin className="w-4 h-4" />
              <span>{restaurant.address}</span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{restaurant.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{restaurant.delivery_time} min</span>
              </div>
              <span className="text-primary font-medium">{restaurant.price_range}</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {restaurant.cuisine_type
                ?.split(",")
                .slice(0, 3)
                .map((cuisine, index) => (
                  <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                    {cuisine.trim()}
                  </span>
                ))}
            </div>

            <Button className="w-full" onClick={() => onRestaurantSelect(restaurant)}>
              Ver Detalles
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
