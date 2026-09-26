"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ChefHat, ArrowLeft, MapPin, DollarSign, Phone, Globe, FileText } from "lucide-react"
import { registerRestaurant, type RestaurantRegistrationData } from "@/lib/restaurant-auth"

interface RestaurantRegistrationProps {
  onBack: () => void
  onSuccess: () => void
}

export default function RestaurantRegistration({ onBack, onSuccess }: RestaurantRegistrationProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState<Partial<RestaurantRegistrationData>>({
    serviceOptions: [],
    openingHours: {},
    legalInfo: { nit: "" },
    categories: [],
  })

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

  const handleSubmit = async () => {
    setLoading(true)
    setError("")

    try {
      await registerRestaurant(formData as RestaurantRegistrationData)
      onSuccess()
    } catch (err: any) {
      setError(err.message || "Error al registrar el restaurante")
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-primary">Información Básica</h2>
        <p className="text-sm text-muted-foreground">Cuéntanos sobre tu restaurante</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nombre del Restaurante *</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Ej: Restaurante El Buen Sabor"
          />
        </div>

        <div>
          <Label htmlFor="email">Correo Electrónico *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => handleInputChange("email", e.target.value)}
            placeholder="contacto@restaurante.com"
          />
        </div>

        <div>
          <Label htmlFor="password">Contraseña *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password || ""}
            onChange={(e) => handleInputChange("password", e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div>
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description || ""}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Describe tu restaurante, especialidades, ambiente..."
            rows={3}
          />
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-primary">Ubicación y Contacto</h2>
        <p className="text-sm text-muted-foreground">¿Dónde te encuentras?</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="address" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Dirección Completa *
          </Label>
          <Textarea
            id="address"
            value={formData.address || ""}
            onChange={(e) => handleInputChange("address", e.target.value)}
            placeholder="Ej: 6a Avenida 14-55, Zona 1, Ciudad de Guatemala"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Teléfono *
          </Label>
          <Input
            id="phone"
            value={formData.phone || ""}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            placeholder="+502 2234-5678"
          />
        </div>

        <div>
          <Label htmlFor="website" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Sitio Web (Opcional)
          </Label>
          <Input
            id="website"
            value={formData.website || ""}
            onChange={(e) => handleInputChange("website", e.target.value)}
            placeholder="https://mirestaurante.com"
          />
        </div>

        <div>
          <Label htmlFor="nit" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            NIT *
          </Label>
          <Input
            id="nit"
            value={formData.legalInfo?.nit || ""}
            onChange={(e) => handleInputChange("legalInfo", { ...formData.legalInfo, nit: e.target.value })}
            placeholder="12345678-9"
          />
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-primary">Detalles del Servicio</h2>
        <p className="text-sm text-muted-foreground">Configura tu operación</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Rango de Precios *
          </Label>
          <Select value={formData.priceRange} onValueChange={(value) => handleInputChange("priceRange", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el rango de precios" />
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
          <Label>Opciones de Servicio *</Label>
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
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-primary">Horarios de Atención</h2>
        <p className="text-sm text-muted-foreground">¿Cuándo estás abierto?</p>
      </div>

      <div className="space-y-3">
        {days.map((day) => (
          <div key={day.key} className="flex items-center gap-3">
            <Label className="w-20 text-sm">{day.label}</Label>
            <Input
              value={formData.openingHours?.[day.key] || ""}
              onChange={(e) => handleHoursChange(day.key, e.target.value)}
              placeholder="09:00-21:00 o 'cerrado'"
              className="flex-1"
            />
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-2">Formato: HH:MM-HH:MM (ej: 09:00-21:00) o escribe "cerrado"</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div className="w-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Registro de Restaurante</CardTitle>
          <div className="flex justify-center mt-2">
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i <= step ? "bg-primary" : "bg-gray-300"}`} />
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                Anterior
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} className="flex-1">
                Siguiente
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? "Registrando..." : "Registrar Restaurante"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
