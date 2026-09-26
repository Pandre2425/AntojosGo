import { requestJSON } from "./http"
import { DEMO_RESTAURANT_ID, getDemoProfile, updateDemoProfile } from './demo-restaurant'

export interface RestaurantProfile {
  id: string
  name: string
  email: string
  description: string
  address: string
  latitude?: number
  longitude?: number
  phone: string
  website?: string
  logoUrl?: string
  socialMedia: Record<string, string>
  openingHours: Record<string, string>
  priceRange: string
  serviceOptions: string[]
  legalInfo: Record<string, any>
  isVerified: boolean
  isActive: boolean
  rating: number
  reviewCount: number
  categories: string[]
  images: Array<{
    id: string
    url: string
    type: string
    caption?: string
    isPrimary: boolean
  }>
}

export interface UpdateProfileData {
  name?: string
  description?: string
  address?: string
  latitude?: number
  longitude?: number
  phone?: string
  website?: string
  logoUrl?: string
  socialMedia?: Record<string, string>
  openingHours?: Record<string, string>
  priceRange?: string
  serviceOptions?: string[]
  categories?: string[]
}

// Client-side functions
export async function getRestaurantProfile(restaurantId: string): Promise<RestaurantProfile> {
  if (restaurantId === DEMO_RESTAURANT_ID) return getDemoProfile(restaurantId)
  try {
    return await requestJSON<any>(`/api/restaurants/${restaurantId}/profile`)
  } catch (error) {
    console.error("[v0] Get restaurant profile error:", error)
    throw error
  }
}

export async function updateRestaurantProfile(restaurantId: string, data: UpdateProfileData) {
  if (restaurantId === DEMO_RESTAURANT_ID) return updateDemoProfile(restaurantId, data)
  try {
    return await requestJSON<any>(`/api/restaurants/${restaurantId}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.error("[v0] Update restaurant profile error:", error)
    throw error
  }
}

export async function uploadRestaurantImage(restaurantId: string, file: File, type: string, caption?: string) {
  if (restaurantId === DEMO_RESTAURANT_ID) throw new Error('Las imágenes requieren almacenamiento conectado. El resto del perfil se puede probar localmente.')
  try {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", type)
    if (caption) formData.append("caption", caption)

    return await requestJSON<any>(`/api/restaurants/${restaurantId}/images`, {
      method: "POST",
      body: formData,
    })
  } catch (error) {
    console.error("[v0] Upload restaurant image error:", error)
    throw error
  }
}

