"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, Edit, Trash2, ChefHat, Clock, DollarSign, Star, Eye, Filter, ImageIcon } from "lucide-react"
import { getRestaurantMenu, deleteDish, updateDish, type Dish } from "@/lib/menu-management"
import DishForm from "@/components/dish-form"

interface MenuManagementProps {
  restaurantId: string
  onBack: () => void
}

export default function MenuManagement({ restaurantId, onBack }: MenuManagementProps) {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)

  const categories = ["all", "Entrada", "Plato Principal", "Postre", "Bebida", "Especial"]

  useEffect(() => {
    loadMenu()
  }, [restaurantId])

  const loadMenu = async () => {
    try {
      setLoading(true)
      setError("")
      const menuData = await getRestaurantMenu(restaurantId)
      setDishes(menuData)
    } catch (err: any) {
      setError(err.message || "Error loading menu")
      // Fallback to sample data if database fails
      setDishes([
        {
          id: "1",
          restaurantId,
          name: "Pepián de Pollo",
          description: "Tradicional guiso guatemalteco con pollo en salsa de tomate y especias",
          ingredients: ["pollo", "tomate", "chile pimiento", "ajonjolí", "cilantro"],
          category: "Plato Principal",
          price: 65.0,
          imageUrl: "/pepian-de-pollo.png",
          isAvailable: true,
          isSpecial: false,
          allergens: ["ajonjolí"],
          dietaryInfo: ["gluten_free"],
          preparationTime: 25,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "2",
          restaurantId,
          name: "Kak'ik",
          description: "Sopa tradicional de pavo con especias y hierbas aromáticas",
          ingredients: ["pavo", "tomate", "cebolla", "cilantro", "hierba buena"],
          category: "Entrada",
          price: 45.0,
          imageUrl: "/kakik-soup.png",
          isAvailable: true,
          isSpecial: true,
          allergens: [],
          dietaryInfo: ["gluten_free"],
          preparationTime: 30,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAvailability = async (dish: Dish) => {
    try {
      const updatedDish = await updateDish(restaurantId, dish.id, {
        isAvailable: !dish.isAvailable,
      })
      setDishes((prev) => prev.map((d) => (d.id === dish.id ? updatedDish : d)))
    } catch (err: any) {
      setError(err.message || "Error updating dish availability")
    }
  }

  const handleDeleteDish = async (dish: Dish) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${dish.name}"?`)) {
      return
    }

    try {
      await deleteDish(restaurantId, dish.id)
      setDishes((prev) => prev.filter((d) => d.id !== dish.id))
    } catch (err: any) {
      setError(err.message || "Error deleting dish")
    }
  }

  const handleDishSaved = (savedDish: Dish) => {
    if (editingDish) {
      setDishes((prev) => prev.map((d) => (d.id === savedDish.id ? savedDish : d)))
      setEditingDish(null)
    } else {
      setDishes((prev) => [...prev, savedDish])
      setShowAddDialog(false)
    }
  }

  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch =
      dish.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dish.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || dish.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedDishes = filteredDishes.reduce(
    (acc, dish) => {
      if (!acc[dish.category]) {
        acc[dish.category] = []
      }
      acc[dish.category].push(dish)
      return acc
    },
    {} as Record<string, Dish[]>,
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando menú...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="flex flex-wrap gap-3 items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Volver
            </Button>
            <div>
              <h1 className="text-xl font-bold text-primary">Gestión de Menú</h1>
              <p className="text-sm text-muted-foreground">{dishes.length} platillos</p>
            </div>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Platillo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Platillo</DialogTitle>
                <DialogDescription>Completa la información del platillo para agregarlo al menú.</DialogDescription>
              </DialogHeader>
              <DishForm restaurantId={restaurantId} onSave={handleDishSaved} onCancel={() => setShowAddDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="container mx-auto p-4 max-w-6xl">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar platillos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "all" ? "Todas las categorías" : category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <ChefHat className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{dishes.length}</p>
              <p className="text-sm text-muted-foreground">Total Platillos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{dishes.filter((d) => d.isAvailable).length}</p>
              <p className="text-sm text-muted-foreground">Disponibles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{dishes.filter((d) => d.isSpecial).length}</p>
              <p className="text-sm text-muted-foreground">Especiales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                Q{dishes.length > 0 ? Math.round(dishes.reduce((sum, d) => sum + d.price, 0) / dishes.length) : 0}
              </p>
              <p className="text-sm text-muted-foreground">Precio Promedio</p>
            </CardContent>
          </Card>
        </div>

        {/* Dishes by Category */}
        {Object.entries(groupedDishes).map(([category, categoryDishes]) => (
          <Card key={category} className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{category}</span>
                <Badge variant="secondary">{categoryDishes.length} platillos</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryDishes.map((dish) => (
                  <Card key={dish.id} className={`${!dish.isAvailable ? "opacity-60" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{dish.name}</h3>
                            {dish.isSpecial && (
                              <Badge variant="default" className="text-xs">
                                Especial
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{dish.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />Q{dish.price}
                            </span>
                            {dish.preparationTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {dish.preparationTime}min
                              </span>
                            )}
                          </div>
                        </div>
                        {dish.imageUrl && (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center ml-3">
                            <img
                              src={dish.imageUrl || "/placeholder.svg"}
                              alt={dish.name}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = "none"
                                target.nextElementSibling?.classList.remove("hidden")
                              }}
                            />
                            <ImageIcon className="w-6 h-6 text-muted-foreground hidden" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={dish.isAvailable}
                            onCheckedChange={() => handleToggleAvailability(dish)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {dish.isAvailable ? "Disponible" : "No disponible"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditingDish(dish)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDish(dish)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {dish.allergens.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Alérgenos: {dish.allergens.join(", ")}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredDishes.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay platillos</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== "all"
                  ? "No se encontraron platillos con los filtros aplicados."
                  : "Comienza agregando platillos a tu menú."}
              </p>
              {!searchTerm && selectedCategory === "all" && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Platillo
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      {editingDish && (
        <Dialog open={!!editingDish} onOpenChange={() => setEditingDish(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Platillo</DialogTitle>
              <DialogDescription>Modifica la información del platillo.</DialogDescription>
            </DialogHeader>
            <DishForm
              restaurantId={restaurantId}
              dish={editingDish}
              onSave={handleDishSaved}
              onCancel={() => setEditingDish(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
