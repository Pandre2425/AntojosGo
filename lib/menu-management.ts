import { requestJSON } from "./http"
import { DEMO_RESTAURANT_ID, getDemoMenu, createDemoDish, updateDemoDish, deleteDemoDish } from './demo-restaurant'

export interface Dish {
  id: string
  restaurantId: string
  name: string
  description: string
  ingredients: string[]
  category: string
  price: number
  imageUrl?: string
  isAvailable: boolean
  isSpecial: boolean
  allergens: string[]
  dietaryInfo: string[]
  preparationTime?: number
  /** Draft/published on foods; mirrors is_available for compatibility. */
  status?: "draft" | "published"
  createdAt: string
  updatedAt: string
}

export interface CreateDishData {
  name: string
  description: string
  ingredients: string[]
  category: string
  price: number
  imageUrl?: string
  isSpecial?: boolean
  allergens?: string[]
  dietaryInfo?: string[]
  preparationTime?: number
  status?: "draft" | "published"
}

export interface UpdateDishData extends Partial<CreateDishData> {
  isAvailable?: boolean
}

// Client-side functions
export async function getRestaurantMenu(restaurantId: string): Promise<Dish[]> {
  if (restaurantId === DEMO_RESTAURANT_ID) return getDemoMenu(restaurantId)
  try {
    return await requestJSON<any>(`/api/restaurants/${restaurantId}/menu`)
  } catch (error) {
    console.error("[v0] Get restaurant menu error:", error)
    throw error
  }
}

export async function createDish(restaurantId: string, data: CreateDishData): Promise<Dish> {
  if (restaurantId === DEMO_RESTAURANT_ID) return createDemoDish(restaurantId, data)
  try {
    return await requestJSON<any>(`/api/restaurants/${restaurantId}/dishes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.error("[v0] Create dish error:", error)
    throw error
  }
}

export async function updateDish(restaurantId: string, dishId: string, data: UpdateDishData): Promise<Dish> {
  if (restaurantId === DEMO_RESTAURANT_ID) return updateDemoDish(restaurantId, dishId, data)
  try {
    return await requestJSON<any>(`/api/restaurants/${restaurantId}/dishes/${dishId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.error("[v0] Update dish error:", error)
    throw error
  }
}

export async function deleteDish(restaurantId: string, dishId: string): Promise<void> {
  if (restaurantId === DEMO_RESTAURANT_ID) return deleteDemoDish(restaurantId, dishId)
  try {
    return await requestJSON<any>(`/api/restaurants/${restaurantId}/dishes/${dishId}`, {
      method: "DELETE",
    })
  } catch (error) {
    console.error("[v0] Delete dish error:", error)
    throw error
  }
}
