"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Calendar, User } from "lucide-react"
import { submitReview, type ReviewSubmission } from "@/lib/reviews"

interface ReviewFormProps {
  restaurantId: string
  restaurantName: string
  onReviewSubmitted?: () => void
  onCancel?: () => void
}

export default function ReviewForm({ restaurantId, restaurantName, onReviewSubmitted, onCancel }: ReviewFormProps) {
  const [formData, setFormData] = useState({
    user_name: "",
    rating: 0,
    title: "",
    comment: "",
    visit_date: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleRatingClick = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.user_name.trim()) {
      setError("Por favor ingresa tu nombre")
      return
    }

    if (formData.rating === 0) {
      setError("Por favor selecciona una calificación")
      return
    }

    setIsSubmitting(true)

    try {
      const reviewData: ReviewSubmission = {
        restaurant_id: restaurantId,
        user_name: formData.user_name.trim(),
        rating: formData.rating,
        title: formData.title.trim() || undefined,
        comment: formData.comment.trim() || undefined,
        visit_date: formData.visit_date || undefined,
      }

      const result = await submitReview(reviewData)

      if (result.success) {
        // Reset form
        setFormData({
          user_name: "",
          rating: 0,
          title: "",
          comment: "",
          visit_date: "",
        })
        onReviewSubmitted?.()
      } else {
        setError(result.error || "Error al enviar la reseña")
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      setError("Error al enviar la reseña")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Escribir reseña para {restaurantName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
          )}

          {/* User Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Tu nombre
            </label>
            <Input
              type="text"
              value={formData.user_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, user_name: e.target.value }))}
              placeholder="¿Cómo te llamas?"
              required
            />
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Calificación</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= formData.rating ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {formData.rating > 0 && (
              <p className="text-sm text-gray-600">
                {formData.rating === 1 && "Muy malo"}
                {formData.rating === 2 && "Malo"}
                {formData.rating === 3 && "Regular"}
                {formData.rating === 4 && "Bueno"}
                {formData.rating === 5 && "Excelente"}
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Título de tu reseña (opcional)</label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ej: 'Excelente comida típica'"
              maxLength={200}
            />
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tu experiencia (opcional)</label>
            <Textarea
              value={formData.comment}
              onChange={(e) => setFormData((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder="Cuéntanos sobre tu experiencia en este restaurante..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500">{formData.comment.length}/1000 caracteres</p>
          </div>

          {/* Visit Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha de visita (opcional)
            </label>
            <Input
              type="date"
              value={formData.visit_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, visit_date: e.target.value }))}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Enviando..." : "Enviar reseña"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
