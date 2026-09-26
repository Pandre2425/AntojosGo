"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import { createDish, updateDish, type Dish, type CreateDishData, type UpdateDishData } from "@/lib/menu-management"

interface DishFormProps {
  restaurantId: string
  dish?: Dish
  onSave: (dish: Dish) => void
  onCancel: () => void
}

export default function DishForm({ restaurantId, dish, onSave, onCancel }: DishFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    ingredients: [] as string[],
    category: "",
    price: 0,
    imageUrl: "",
    isSpecial: false,
    allergens: [] as string[],
    dietaryInfo: [] as string[],
    preparationTime: 0,
  })

  const [newIngredient, setNewIngredient] = useState("")
  const [newAllergen, setNewAllergen] = useState("")

  const categories = ["Entrada", "Plato Principal", "Postre", "Bebida", "Especial"]
  const commonAllergens = ["gluten", "lácteos", "huevos", "nueces", "maní", "soja", "pescado", "mariscos", "ajonjolí"]
  const dietaryOptions = ["vegetarian", "vegan", "gluten_free", "dairy_free", "nut_free", "low_carb", "keto"]

  useEffect(() => {
    if (dish) {
      setFormData({
        name: dish.name,
        description: dish.description,
        ingredients: dish.ingredients,
        category: dish.category,
        price: dish.price,
        imageUrl: dish.imageUrl || "",
        isSpecial: dish.isSpecial,
        allergens: dish.allergens,
        dietaryInfo: dish.dietaryInfo,
        preparationTime: dish.preparationTime || 0,
      })
    }
  }, [dish])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddIngredient = () => {
    if (newIngredient.trim() && !formData.ingredients.includes(newIngredient.trim())) {
      setFormData((prev) => ({
        ...prev,
        ingredients: [...prev.ingredients, newIngredient.trim()],
      }))
      setNewIngredient("")
    }
  }

  const handleRemoveIngredient = (ingredient: string) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((i) => i !== ingredient),
    }))
  }

  const handleAddAllergen = () => {
    if (newAllergen.trim() && !formData.allergens.includes(newAllergen.trim())) {
      setFormData((prev) => ({
        ...prev,
        allergens: [...prev.allergens, newAllergen.trim()],
      }))
      setNewAllergen("")
    }
  }

  const handleRemoveAllergen = (allergen: string) => {
    setFormData((prev) => ({
      ...prev,
      allergens: prev.allergens.filter((a) => a !== allergen),
    }))
  }

  const handleDietaryInfoChange = (option: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        dietaryInfo: [...prev.dietaryInfo, option],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        dietaryInfo: prev.dietaryInfo.filter((info) => info !== option),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!formData.name.trim() || !formData.category || formData.price <= 0) {
        throw new Error("Por favor completa todos los campos requeridos")
      }

      let savedDish: Dish

      if (dish) {
        // Update existing dish
        const updateData: UpdateDishData = {
          name: formData.name,
          description: formData.description,
          ingredients: formData.ingredients,
          category: formData.category,
          price: formData.price,
          imageUrl: formData.imageUrl || undefined,
          isSpecial: formData.isSpecial,
          allergens: formData.allergens,
          dietaryInfo: formData.dietaryInfo,
          preparationTime: formData.preparationTime || undefined,
        }
        savedDish = await updateDish(restaurantId, dish.id, updateData)
      } else {
        // Create new dish
        const createData: CreateDishData = {
          name: formData.name,
          description: formData.description,
          ingredients: formData.ingredients,
          category: formData.category,
          price: formData.price,
          imageUrl: formData.imageUrl || undefined,
          isSpecial: formData.isSpecial,
          allergens: formData.allergens,
          dietaryInfo: formData.dietaryInfo,
          preparationTime: formData.preparationTime || undefined,
        }
        savedDish = await createDish(restaurantId, createData)
      }

      onSave(savedDish)
    } catch (err: any) {
      setError(err.message || "Error saving dish")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nombre del Platillo *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Ej: Pepián de Pollo"
            required
          />
        </div>
        <div>
          <Label htmlFor="category">Categoría *</Label>
          <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          placeholder="Describe el platillo, su preparación, sabores..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Precio (Q) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => handleInputChange("price", Number.parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <Label htmlFor="preparationTime">Tiempo de Preparación (minutos)</Label>
          <Input
            id="preparationTime"
            type="number"
            min="0"
            value={formData.preparationTime}
            onChange={(e) => handleInputChange("preparationTime", Number.parseInt(e.target.value) || 0)}
            placeholder="15"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="imageUrl">URL de Imagen</Label>
        <Input
          id="imageUrl"
          value={formData.imageUrl}
          onChange={(e) => handleInputChange("imageUrl", e.target.value)}
          placeholder="https://ejemplo.com/imagen.jpg"
        />
      </div>

      <div>
        <Label>Ingredientes</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newIngredient}
            onChange={(e) => setNewIngredient(e.target.value)}
            placeholder="Agregar ingrediente"
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddIngredient())}
          />
          <Button type="button" onClick={handleAddIngredient} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.ingredients.map((ingredient) => (
            <Badge key={ingredient} variant="secondary" className="flex items-center gap-1">
              {ingredient}
              <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveIngredient(ingredient)} />
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Alérgenos</Label>
        <div className="flex gap-2 mb-2">
          <select
            value={newAllergen}
            onChange={(e) => setNewAllergen(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md bg-background"
          >
            <option value="">Seleccionar alérgeno</option>
            {commonAllergens
              .filter((allergen) => !formData.allergens.includes(allergen))
              .map((allergen) => (
                <option key={allergen} value={allergen}>
                  {allergen}
                </option>
              ))}
          </select>
          <Button type="button" onClick={handleAddAllergen} size="sm" disabled={!newAllergen}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.allergens.map((allergen) => (
            <Badge key={allergen} variant="destructive" className="flex items-center gap-1">
              {allergen}
              <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveAllergen(allergen)} />
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Información Dietética</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {dietaryOptions.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={option}
                checked={formData.dietaryInfo.includes(option)}
                onCheckedChange={(checked) => handleDietaryInfoChange(option, checked as boolean)}
              />
              <Label htmlFor={option} className="text-sm">
                {option.replace("_", " ")}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isSpecial"
          checked={formData.isSpecial}
          onCheckedChange={(checked) => handleInputChange("isSpecial", checked)}
        />
        <Label htmlFor="isSpecial">Marcar como platillo especial</Label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Guardando..." : dish ? "Actualizar Platillo" : "Crear Platillo"}
        </Button>
      </div>
    </form>
  )
}
