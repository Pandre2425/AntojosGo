"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Upload, MapPin, Phone, Globe, Clock, DollarSign, Camera, Eye, Edit3, Star } from "lucide-react"
import {
  getRestaurantProfile,
  updateRestaurantProfile,
  uploadRestaurantImage,
  type RestaurantProfile,
  type UpdateProfileData,
} from "@/lib/restaurant-profile"

interface RestaurantProfileEditorProps {
  restaurantId: string
  onBack: () => void
}

export default function RestaurantProfileEditor({ restaurantId, onBack }: RestaurantProfileEditorProps) {
  const [profile, setProfile] = useState<RestaurantProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("basic")

  const [formData, setFormData] = useState<UpdateProfileData>({})

  const categories = [
    "Comida Típica",
    "Pizza",
    "Hamburguesas",
    "Mariscos",
    "Postres",
    "Vegano",
    "Saludable",
    "Café",
    "Comida Rápida",
    "Internacional",
  ]

  const serviceOptions = [
    { id: "dine_in", label: "Comer en el local" },
    { id: "takeout", label: "Para llevar" },
    { id: "delivery", label: "Delivery" },
  ]

  const days = [
    { key: "monday", label: "Lunes" },
    { key: "tuesday", label: "Martes" },
    { key: "wednesday", label: "Miércoles" },
    { key: "thursday", label: "Jueves" },
    { key: "friday", label: "Viernes" },
    { key: "saturday", label: "Sábado" },
    { key: "sunday", label: "Domingo" },
  ]

  useEffect(() => {
    loadProfile()
  }, [restaurantId])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const profileData = await getRestaurantProfile(restaurantId)
      setProfile(profileData)
      setFormData({
        name: profileData.name,
        description: profileData.description,
        address: profileData.address,
        phone: profileData.phone,
        website: profileData.website,
        priceRange: profileData.priceRange,
        serviceOptions: profileData.serviceOptions,
        openingHours: profileData.openingHours,
        categories: profileData.categories,
        socialMedia: profileData.socialMedia,
      })
    } catch (err: any) {
      setError(err.message || "Error loading profile")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleServiceOptionChange = (optionId: string, checked: boolean) => {
    const currentOptions = formData.serviceOptions || []
    if (checked) {
      handleInputChange("serviceOptions", [...currentOptions, optionId])
    } else {
      handleInputChange(
        "serviceOptions",
        currentOptions.filter((id) => id !== optionId),
      )
    }
  }

  const handleCategoryChange = (category: string, checked: boolean) => {
    const currentCategories = formData.categories || []
    if (checked) {
      handleInputChange("categories", [...currentCategories, category])
    } else {
      handleInputChange(
        "categories",
        currentCategories.filter((cat) => cat !== category),
      )
    }
  }

  const handleHoursChange = (day: string, value: string) => {
    handleInputChange("openingHours", {
      ...formData.openingHours,
      [day]: value,
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError("")
      await updateRestaurantProfile(restaurantId, formData)
      await loadProfile() // Reload to get updated data
    } catch (err: any) {
      setError(err.message || "Error saving profile")
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File, type: string) => {
    try {
      await uploadRestaurantImage(restaurantId, file, type)
      await loadProfile() // Reload to show new image
    } catch (err: any) {
      setError(err.message || "Error uploading image")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-red-600 mb-4">Error: No se pudo cargar el perfil</p>
            <Button onClick={onBack}>Volver</Button>
          </CardContent>
        </Card>
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
              <h1 className="text-xl font-bold text-primary">Gestión de Perfil</h1>
              <p className="text-sm text-muted-foreground">{profile.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={profile.isVerified ? "default" : "secondary"}>
              {profile.isVerified ? "Verificado" : "Pendiente"}
            </Badge>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 max-w-4xl">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Profile Overview */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">{profile.name.charAt(0)}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{profile.name}</h2>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-1 text-yellow-500" />
                      {profile.rating.toFixed(1)} ({profile.reviewCount} reseñas)
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {profile.address}
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Ver Perfil Público
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Información Básica</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="hours">Horarios</TabsTrigger>
            <TabsTrigger value="images">Imágenes</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  Información Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre del Restaurante</Label>
                    <Input
                      id="name"
                      value={formData.name || ""}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Teléfono
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Dirección
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address || ""}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Sitio Web
                  </Label>
                  <Input
                    id="website"
                    value={formData.website || ""}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Detalles del Servicio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Rango de Precios</Label>
                  <Select value={formData.priceRange} onValueChange={(value) => handleInputChange("priceRange", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="$">$ - Económico (Q20-50)</SelectItem>
                      <SelectItem value="$$">$$ - Moderado (Q50-100)</SelectItem>
                      <SelectItem value="$$$">$$$ - Caro (Q100-200)</SelectItem>
                      <SelectItem value="$$$$">$$$$ - Muy Caro (Q200+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Opciones de Servicio</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {serviceOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.id}
                          checked={formData.serviceOptions?.includes(option.id)}
                          onCheckedChange={(checked) => handleServiceOptionChange(option.id, checked as boolean)}
                        />
                        <Label htmlFor={option.id}>{option.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Categorías de Comida</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {categories.map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={formData.categories?.includes(category)}
                          onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                        />
                        <Label htmlFor={category} className="text-sm">
                          {category}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Horarios de Atención
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {days.map((day) => (
                    <div key={day.key} className="flex items-center gap-3">
                      <Label className="w-24 text-sm">{day.label}</Label>
                      <Input
                        value={formData.openingHours?.[day.key] || ""}
                        onChange={(e) => handleHoursChange(day.key, e.target.value)}
                        placeholder="09:00-21:00 o 'cerrado'"
                        className="flex-1"
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-2">
                    Formato: HH:MM-HH:MM (ej: 09:00-21:00) o escribe "cerrado"
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Galería de Imágenes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {profile.images.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.url || "/placeholder.svg"}
                        alt={image.caption || "Restaurant image"}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button size="sm" variant="secondary">
                          Editar
                        </Button>
                      </div>
                      {image.isPrimary && (
                        <Badge className="absolute top-2 left-2" variant="default">
                          Principal
                        </Badge>
                      )}
                    </div>
                  ))}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center">
                    <Button variant="ghost" className="flex-col">
                      <Upload className="w-6 h-6 mb-2" />
                      Subir Imagen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
