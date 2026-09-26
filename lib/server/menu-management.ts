import "server-only"
import { createServerClient } from "@/lib/supabase/server"
import type { Dish, CreateDishData, UpdateDishData } from "../menu-management"

/** Canonical menu persistence is public.foods (see docs/MENU-FOODS.md). */

const FOOD_SELECT = "*"

function mapFoodRow(dish: any): Dish {
  return {
    id: dish.id,
    restaurantId: dish.restaurant_id,
    name: dish.name,
    description: dish.description || "",
    ingredients: dish.ingredients || [],
    category: dish.category,
    price: Number(dish.price),
    imageUrl: dish.image_url ?? undefined,
    isAvailable: dish.is_available,
    isSpecial: dish.is_special,
    allergens: dish.allergens || [],
    dietaryInfo: dish.dietary_info || [],
    preparationTime: dish.preparation_time ?? undefined,
    status: dish.status ?? (dish.is_available ? "published" : "draft"),
    createdAt: dish.created_at,
    updatedAt: dish.updated_at,
  }
}

export async function fetchRestaurantMenu(restaurantId: string): Promise<Dish[]> {
  const supabase = await createServerClient()

  try {
    const { data: foods, error } = await supabase
      .from("foods")
      .select(FOOD_SELECT)
      .eq("restaurant_id", restaurantId)
      .order("category", { ascending: true })
      .order("name", { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch menu: ${error.message}`)
    }

    return (foods || []).map(mapFoodRow)
  } catch (error) {
    console.error("[v0] Fetch restaurant menu error:", error)
    throw error
  }
}

export async function createDishInDB(restaurantId: string, data: CreateDishData): Promise<Dish> {
  const supabase = await createServerClient()

  try {
    const status = data.status ?? "draft"
    const { data: dish, error } = await supabase
      .from("foods")
      .insert({
        restaurant_id: restaurantId,
        name: data.name,
        description: data.description,
        ingredients: data.ingredients,
        category: data.category,
        price: data.price,
        image_url: data.imageUrl,
        is_special: data.isSpecial || false,
        allergens: data.allergens || [],
        dietary_info: data.dietaryInfo || [],
        preparation_time: data.preparationTime,
        is_available: status === "published",
        status,
      })
      .select(FOOD_SELECT)
      .single()

    if (error) {
      throw new Error(`Failed to create dish: ${error.message}`)
    }

    return mapFoodRow(dish)
  } catch (error) {
    console.error("[v0] Create dish in DB error:", error)
    throw error
  }
}

export async function updateDishInDB(restaurantId: string, dishId: string, data: UpdateDishData): Promise<Dish> {
  const supabase = await createServerClient()

  try {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (data.name !== undefined) patch.name = data.name
    if (data.description !== undefined) patch.description = data.description
    if (data.ingredients !== undefined) patch.ingredients = data.ingredients
    if (data.category !== undefined) patch.category = data.category
    if (data.price !== undefined) patch.price = data.price
    if (data.imageUrl !== undefined) patch.image_url = data.imageUrl
    if (data.isSpecial !== undefined) patch.is_special = data.isSpecial
    if (data.allergens !== undefined) patch.allergens = data.allergens
    if (data.dietaryInfo !== undefined) patch.dietary_info = data.dietaryInfo
    if (data.preparationTime !== undefined) patch.preparation_time = data.preparationTime
    if (data.status !== undefined) {
      patch.status = data.status
      patch.is_available = data.status === "published"
    } else if (data.isAvailable !== undefined) {
      patch.is_available = data.isAvailable
      patch.status = data.isAvailable ? "published" : "draft"
    }

    const { data: dish, error } = await supabase
      .from("foods")
      .update(patch)
      .eq("id", dishId)
      .eq("restaurant_id", restaurantId)
      .select(FOOD_SELECT)
      .single()

    if (error) {
      throw new Error(`Failed to update dish: ${error.message}`)
    }

    return mapFoodRow(dish)
  } catch (error) {
    console.error("[v0] Update dish in DB error:", error)
    throw error
  }
}

export async function deleteDishFromDB(restaurantId: string, dishId: string): Promise<void> {
  const supabase = await createServerClient()

  try {
    const { error } = await supabase.from("foods").delete().eq("id", dishId).eq("restaurant_id", restaurantId)

    if (error) {
      throw new Error(`Failed to delete dish: ${error.message}`)
    }
  } catch (error) {
    console.error("[v0] Delete dish from DB error:", error)
    throw error
  }
}
