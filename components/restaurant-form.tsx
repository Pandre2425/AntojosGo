"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { createRestaurant, updateRestaurant, type RestaurantFormData } from "@/lib/admin"
import type { Restaurant } from "@/lib/restaurants"

interface RestaurantFormProps {
  restaurant?: Restaurant | null
  onClose: () => void
}

const CUISINE_OPTIONS = [
  "Guatemalan",
  "Italian",
  "Japanese",
  "American",
  "Mexican",
  "Chinese",
  "Fusion",
  "International",
]

const FEATURE_OPTIONS = [
  "outdoor seating",
  "takeout",
  "vegetarian options",
  "wine selection",
  "romantic atmosphere",
  "rooftop dining",
  "cocktails",
  "live music",
  "wifi",
  "family friendly",
  "traditional recipes",
  "budget friendly",
  "fresh fish",
  "sake selection",
  "modern atmosphere",
  "colonial architecture",
  "fine dining",
  "wine pairing",
  "craft beer",
  "local ingredients",
  "casual dining",
  "art gallery",
  "wine cellar",
]

export default function RestaurantForm({ restaurant, onClose }: RestaurantFormProps) {
  const [formData, setFormData] = useState<RestaurantFormData>({
    name: "",
    description: "",
    cuisine_type: "",
    address: "",
    latitude: null,
    longitude: null,
    phone: "",
    website: "",
    price_range: 2,
    image_url: "",
    features: [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name,
        description: restaurant.description || "",
        cuisine_type: restaurant.cuisine_type || "",
        address: restaurant.address,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        phone: restaurant.phone || "",
        website: restaurant.website || "",
        price_range: restaurant.price_range || 2,
        image_url: restaurant.image_url || "",
        features: restaurant.features || [],
      })
    }
  }, [restaurant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.name.trim()) {
      setError("Restaurant name is required")
      return
    }

    if (!formData.address.trim()) {
      setError("Address is required")
      return
    }

    setIsSubmitting(true)

    try {
      const result = restaurant ? await updateRestaurant(restaurant.id, formData) : await createRestaurant(formData)

      if (result.success) {
        onClose()
      } else {
        setError(result.error || "Failed to save restaurant")
      }
    } catch (error) {
      console.error("Error saving restaurant:", error)
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFeatureToggle = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">{restaurant ? "Edit Restaurant" : "Add New Restaurant"}</h2>
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Restaurant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Restaurant Name *</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter restaurant name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cuisine Type</label>
                <select
                  value={formData.cuisine_type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cuisine_type: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select cuisine type</option>
                  {CUISINE_OPTIONS.map((cuisine) => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the restaurant..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Address *</label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Enter full address"
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Latitude</label>
                <Input
                  type="number"
                  step="any"
                  value={formData.latitude || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      latitude: e.target.value ? Number.parseFloat(e.target.value) : null,
                    }))
                  }
                  placeholder="14.5586"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  value={formData.longitude || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      longitude: e.target.value ? Number.parseFloat(e.target.value) : null,
                    }))
                  }
                  placeholder="-90.7339"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+502 7832-1234"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Website</label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="https://restaurant-website.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Range</label>
                <select
                  value={formData.price_range}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price_range: Number.parseInt(e.target.value) }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value={1}>$ - Budget</option>
                  <option value={2}>$$ - Moderate</option>
                  <option value={3}>$$$ - Expensive</option>
                  <option value={4}>$$$$ - Very Expensive</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Image URL</label>
                <Input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Features</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                {FEATURE_OPTIONS.map((feature) => (
                  <label key={feature} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.features.includes(feature)}
                      onChange={() => handleFeatureToggle(feature)}
                      className="rounded"
                    />
                    <span className="text-sm">{feature}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                    <button
                      type="button"
                      onClick={() => handleFeatureToggle(feature)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Saving..." : restaurant ? "Update Restaurant" : "Create Restaurant"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
