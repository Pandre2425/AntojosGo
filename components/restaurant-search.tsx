"use client"

import { useState, useEffect } from "react"
import { Search, Filter, MapPin, Star, DollarSign, ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { searchRestaurants, getCuisineTypes, type Restaurant, type SearchFilters } from "@/lib/restaurants"
import Image from "next/image"

interface RestaurantSearchProps {
  initialQuery?: string
  onRestaurantSelect?: (restaurant: Restaurant) => void
}

export default function RestaurantSearch({ onRestaurantSelect, initialQuery = "" }: RestaurantSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const dietaryOptions = [
    { id: "vegetarian", label: "Vegetarian" },
    { id: "vegan", label: "Vegan" },
    { id: "vegan-options", label: "Vegan Options" },
    { id: "gluten-free", label: "Gluten-Free" },
    { id: "gluten-free-options", label: "Gluten-Free Options" },
    { id: "keto", label: "Keto-Friendly" },
    { id: "low-carb", label: "Low-Carb" },
    { id: "dairy-free", label: "Dairy-Free" },
  ]

  const allergenOptions = [
    { id: "nuts", label: "Nuts" },
    { id: "dairy", label: "Dairy" },
    { id: "gluten", label: "Gluten" },
    { id: "shellfish", label: "Shellfish" },
    { id: "eggs", label: "Eggs" },
    { id: "soy", label: "Soy" },
  ]

  const accessibilityOptions = [
    { id: "wheelchair-accessible", label: "Wheelchair Accessible" },
    { id: "braille-menu", label: "Braille Menu" },
    { id: "accessible-restrooms", label: "Accessible Restrooms" },
    { id: "parking-available", label: "Parking Available" },
    { id: "wide-doorways", label: "Wide Doorways" },
  ]

  const specialFeatures = [
    { id: "pet-friendly", label: "Pet-Friendly" },
    { id: "outdoor-seating", label: "Outdoor Seating" },
    { id: "wifi", label: "Free WiFi" },
    { id: "live-music", label: "Live Music" },
    { id: "family-friendly", label: "Family-Friendly" },
    { id: "romantic", label: "Romantic" },
    { id: "business-friendly", label: "Business-Friendly" },
    { id: "delivery", label: "Delivery Available" },
    { id: "takeout", label: "Takeout Available" },
  ]

  // Cuisine options and results are independent; a failed lookup cannot erase results.
  useEffect(() => {
    let active = true
    getCuisineTypes().then((values) => { if (active) setCuisineTypes(values) }).catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const timeoutId = setTimeout(() => {
      setLoading(true)
      searchRestaurants(query, filters, 20)
        .then((results) => { if (active) setRestaurants(results) })
        .catch(() => { if (active) setRestaurants([]) })
        .finally(() => { if (active) setLoading(false) })
    }, 300)
    return () => { active = false; clearTimeout(timeoutId) }
  }, [query, filters])

  const getPriceDisplay = (priceRange: number | null) => {
    if (!priceRange) return ""
    return "$".repeat(priceRange)
  }

  const getDistanceDisplay = (restaurant: Restaurant) => {
    // Mock distance calculation - in production would use actual geolocation
    return restaurant.distance != null ? `${restaurant.distance.toFixed(1)} km` : "Distancia no disponible"
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const updateArrayFilter = (filterKey: keyof SearchFilters, value: string, checked: boolean) => {
    setFilters((prev) => {
      const currentArray = (prev[filterKey] as string[]) || []
      const newArray = checked ? [...currentArray, value] : currentArray.filter((item) => item !== value)

      return {
        ...prev,
        [filterKey]: newArray.length > 0 ? newArray : undefined,
      }
    })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.cuisine) count++
    if (filters.priceRange) count++
    if (filters.rating) count++
    if (filters.dietaryOptions?.length) count++
    if (filters.allergenFree?.length) count++
    if (filters.accessibilityFeatures?.length) count++
    if (filters.specialFeatures?.length) count++
    return count
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="¿Qué se te antoja hoy? (What are you craving today?)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-12 h-12 text-base bg-white border-gray-200 focus:border-red-500 focus:ring-red-500"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-600"
        >
          <Filter className="h-4 w-4" />
          {getActiveFiltersCount() > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
              {getActiveFiltersCount()}
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="p-4 bg-gray-50">
          <div className="space-y-4">
            {/* Basic Filters */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Cuisine Type</label>
              <div className="flex flex-wrap gap-2">
                {cuisineTypes.map((cuisine) => (
                  <Badge
                    key={cuisine}
                    variant={filters.cuisine === cuisine ? "default" : "outline"}
                    className={`cursor-pointer ${
                      filters.cuisine === cuisine
                        ? "bg-red-600 hover:bg-red-700"
                        : "hover:bg-red-50 hover:border-red-300"
                    }`}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        cuisine: prev.cuisine === cuisine ? undefined : cuisine,
                      }))
                    }
                  >
                    {cuisine}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Price Range</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((price) => (
                  <Badge
                    key={price}
                    variant={filters.priceRange?.[1] === price ? "default" : "outline"}
                    className={`cursor-pointer ${
                      filters.priceRange?.[1] === price
                        ? "bg-red-600 hover:bg-red-700"
                        : "hover:bg-red-50 hover:border-red-300"
                    }`}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        priceRange: prev.priceRange?.[1] === price ? undefined : [1, price],
                      }))
                    }
                  >
                    {"$".repeat(price)}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Minimum Rating</label>
              <div className="flex gap-2">
                {[3, 3.5, 4, 4.5].map((rating) => (
                  <Badge
                    key={rating}
                    variant={filters.rating === rating ? "default" : "outline"}
                    className={`cursor-pointer ${
                      filters.rating === rating ? "bg-red-600 hover:bg-red-700" : "hover:bg-red-50 hover:border-red-300"
                    }`}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        rating: prev.rating === rating ? undefined : rating,
                      }))
                    }
                  >
                    <Star className="h-3 w-3 mr-1" />
                    {rating}+
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection("dietary")}
                className="flex items-center justify-between w-full p-0 h-auto text-sm font-medium text-gray-700"
              >
                Dietary Options
                {expandedSections.dietary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {expandedSections.dietary && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {dietaryOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dietary-${option.id}`}
                        checked={filters.dietaryOptions?.includes(option.id) || false}
                        onCheckedChange={(checked) =>
                          updateArrayFilter("dietaryOptions", option.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={`dietary-${option.id}`} className="text-xs">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection("allergens")}
                className="flex items-center justify-between w-full p-0 h-auto text-sm font-medium text-gray-700"
              >
                Allergen-Free
                {expandedSections.allergens ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {expandedSections.allergens && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {allergenOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`allergen-${option.id}`}
                        checked={filters.allergenFree?.includes(option.id) || false}
                        onCheckedChange={(checked) => updateArrayFilter("allergenFree", option.id, checked as boolean)}
                      />
                      <Label htmlFor={`allergen-${option.id}`} className="text-xs">
                        {option.label}-Free
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection("accessibility")}
                className="flex items-center justify-between w-full p-0 h-auto text-sm font-medium text-gray-700"
              >
                Accessibility
                {expandedSections.accessibility ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              {expandedSections.accessibility && (
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {accessibilityOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`accessibility-${option.id}`}
                        checked={filters.accessibilityFeatures?.includes(option.id) || false}
                        onCheckedChange={(checked) =>
                          updateArrayFilter("accessibilityFeatures", option.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={`accessibility-${option.id}`} className="text-xs">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection("features")}
                className="flex items-center justify-between w-full p-0 h-auto text-sm font-medium text-gray-700"
              >
                Special Features
                {expandedSections.features ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {expandedSections.features && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {specialFeatures.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`feature-${option.id}`}
                        checked={filters.specialFeatures?.includes(option.id) || false}
                        onCheckedChange={(checked) =>
                          updateArrayFilter("specialFeatures", option.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={`feature-${option.id}`} className="text-xs">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({})
                  setExpandedSections({})
                }}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Clear All Filters
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(false)} className="ml-auto">
                Done
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Searching restaurants...</div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No restaurants found. Try adjusting your search or filters.
          </div>
        ) : (
          restaurants.map((restaurant) => (
            <Card
              key={restaurant.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onRestaurantSelect?.(restaurant)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image
                      src={restaurant.image_url || "/placeholder-ws0y7.png"}
                      alt={restaurant.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{restaurant.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-600 ml-2">
                        <MapPin className="h-3 w-3" />
                        {getDistanceDisplay(restaurant)}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{restaurant.description}</p>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {restaurant.dietary_options?.slice(0, 2).map((option) => (
                        <Badge key={option} variant="secondary" className="text-xs bg-green-100 text-green-700">
                          {option}
                        </Badge>
                      ))}
                      {restaurant.accessibility_features?.slice(0, 1).map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                          {feature.replace("-", " ")}
                        </Badge>
                      ))}
                      {restaurant.special_features?.slice(0, 1).map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                          {feature.replace("-", " ")}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-medium">{restaurant.rating}</span>
                          <span className="text-sm text-gray-500">({restaurant.total_reviews})</span>
                        </div>

                        {restaurant.price_range && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">
                              {getPriceDisplay(restaurant.price_range)}
                            </span>
                          </div>
                        )}
                      </div>

                      {restaurant.cuisine_type && (
                        <Badge variant="secondary" className="text-xs">
                          {restaurant.cuisine_type}
                        </Badge>
                      )}
                    </div>
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
