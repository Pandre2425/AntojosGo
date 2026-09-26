"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, Star, MapPin, DollarSign } from "lucide-react"
import { aiEngine, type AIRecommendation } from "@/lib/ai-recommendations"
import Image from "next/image"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  recommendations?: AIRecommendation[]
  timestamp: Date
}

interface AIChatInterfaceProps {
  onRestaurantSelect?: (restaurant: any) => void
}

export default function AIChatInterface({ onRestaurantSelect }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        '¡Hola! Soy tu asistente de AntojosGo. Dime qué se te antoja y te ayudo a encontrar el lugar perfecto. Por ejemplo: "Quiero algo dulce cerca de aquí" o "Busco comida típica para almorzar".',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      // Process the query with AI
      const recommendations = await aiEngine.processNaturalLanguageQuery(inputValue)

      let aiResponse = ""
      if (recommendations.length > 0) {
        aiResponse = `¡Perfecto! Encontré ${recommendations.length} opciones que podrían gustarte:`
      } else {
        aiResponse =
          "No encontré restaurantes que coincidan exactamente con tu búsqueda, pero aquí tienes algunas opciones populares:"
        // Get fallback recommendations
        const fallbackRecommendations = await aiEngine.getPersonalizedRecommendations(3)
        recommendations.push(...fallbackRecommendations)
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: aiResponse,
        recommendations,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("Error processing AI query:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "Lo siento, hubo un problema procesando tu solicitud. ¿Podrías intentar de nuevo?",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getPriceDisplay = (priceRange: number | null) => {
    if (!priceRange) return ""
    return "$".repeat(priceRange)
  }

  const getDistanceDisplay = () => {
    // Mock distance - in production would use actual geolocation
    return `${(Math.random() * 3 + 0.2).toFixed(1)} km`
  }

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`flex items-start space-x-2 max-w-[80%] ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === "user" ? "bg-red-600" : "bg-amber-600"
                }`}
              >
                {message.type === "user" ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              <div className="space-y-2">
                <div
                  className={`rounded-lg p-3 ${
                    message.type === "user" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>

                {/* Recommendations */}
                {message.recommendations && message.recommendations.length > 0 && (
                  <div className="space-y-2">
                    {message.recommendations.map((rec, index) => (
                      <Card
                        key={rec.restaurant.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onRestaurantSelect?.(rec.restaurant)}
                      >
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              <Image
                                src={rec.restaurant.image_url || "/placeholder-ws0y7.png"}
                                alt={rec.restaurant.name}
                                fill
                                className="object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <h4 className="font-semibold text-sm truncate">{rec.restaurant.name}</h4>
                                <Badge variant="secondary" className="text-xs ml-2">
                                  {Math.round(rec.confidence)}% match
                                </Badge>
                              </div>

                              <p className="text-xs text-gray-600 mb-2">{rec.reasoning}</p>

                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    <span>{rec.restaurant.rating}</span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-gray-500" />
                                    <span>{getDistanceDisplay()}</span>
                                  </div>

                                  {rec.restaurant.price_range && (
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3 text-green-600" />
                                      <span className="text-green-600 font-medium">
                                        {getPriceDisplay(rec.restaurant.price_range)}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {rec.restaurant.cuisine_type && (
                                  <Badge variant="outline" className="text-xs">
                                    {rec.restaurant.cuisine_type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ej: 'Quiero pizza cerca de aquí' o 'Algo dulce para merendar'"
            className="flex-1"
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading} className="px-3">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
