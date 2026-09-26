import { searchRestaurants, type Restaurant, type SearchFilters } from "./restaurants"

export interface UserPreferences {
  cuisinePreferences: string[]
  priceRange: [number, number]
  dietaryRestrictions: string[]
  favoriteFeatures: string[]
  location?: {
    latitude: number
    longitude: number
  }
}

export interface AIRecommendationContext {
  timeOfDay: "breakfast" | "lunch" | "dinner" | "snack"
  weather?: "sunny" | "rainy" | "cold" | "hot"
  mood?: "comfort" | "adventurous" | "healthy" | "indulgent"
  occasion?: "casual" | "date" | "business" | "family" | "celebration"
  groupSize?: number
}

export interface AIRecommendation {
  restaurant: Restaurant
  confidence: number
  reasoning: string
  matchedPreferences: string[]
}

// Natural language processing patterns
const CUISINE_PATTERNS = {
  guatemalan: ["típica", "guatemalteca", "chapín", "tradicional", "pepián", "kaq ik", "tamales"],
  italian: ["pizza", "pasta", "italiana", "lasagna", "spaghetti"],
  japanese: ["sushi", "japonesa", "ramen", "tempura"],
  american: ["hamburguesa", "burger", "americana", "hot dog"],
  mexican: ["tacos", "mexicana", "quesadilla", "enchilada"],
  chinese: ["china", "chow mein", "arroz frito"],
  fusion: ["fusión", "internacional", "moderna"],
}

const MOOD_PATTERNS = {
  comfort: ["comfort", "casero", "familiar", "tradicional", "reconfortante"],
  adventurous: ["nuevo", "diferente", "exótico", "aventura", "probar"],
  healthy: ["saludable", "light", "ensalada", "vegetariano", "vegano", "fitness"],
  indulgent: ["rico", "delicioso", "antojo", "dulce", "postre", "indulgente"],
}

const PRICE_PATTERNS = {
  budget: ["barato", "económico", "precio", "ahorro", "estudiante"],
  mid: ["moderado", "normal", "promedio"],
  expensive: ["caro", "fino", "elegante", "premium", "lujo"],
}

const TIME_PATTERNS = {
  breakfast: ["desayuno", "mañana", "café", "pan"],
  lunch: ["almuerzo", "comida", "mediodía"],
  dinner: ["cena", "noche", "tarde"],
  snack: ["antojo", "merienda", "algo", "picoteo"],
}

export class AIRecommendationEngine {
  private userPreferences: UserPreferences | null = null

  setUserPreferences(preferences: UserPreferences) {
    this.userPreferences = preferences
  }

  async processNaturalLanguageQuery(query: string): Promise<AIRecommendation[]> {
    const normalizedQuery = query.toLowerCase()

    // Extract context from the query
    const context = this.extractContext(normalizedQuery)

    // Extract preferences from the query
    const extractedPreferences = this.extractPreferences(normalizedQuery)

    // Build search filters
    const filters = this.buildSearchFilters(extractedPreferences, context)

    try {
      // Search restaurants
      const restaurants = await searchRestaurants("", filters, 10)

      // Score and rank recommendations
      const recommendations = this.scoreRecommendations(restaurants, normalizedQuery, extractedPreferences, context)

      return recommendations.slice(0, 5) // Return top 5 recommendations
    } catch (error) {
      console.error("Error in AI recommendation query:", error)

      // Return fallback recommendations with sample data
      return this.getFallbackRecommendations(normalizedQuery, extractedPreferences, context)
    }
  }

  private extractContext(query: string): AIRecommendationContext {
    const context: AIRecommendationContext = {
      timeOfDay: this.extractTimeOfDay(query),
    }

    // Extract mood
    for (const [mood, patterns] of Object.entries(MOOD_PATTERNS)) {
      if (patterns.some((pattern) => query.includes(pattern))) {
        context.mood = mood as any
        break
      }
    }

    // Extract occasion indicators
    if (query.includes("fecha") || query.includes("cita") || query.includes("romántico")) {
      context.occasion = "date"
    } else if (query.includes("familia") || query.includes("niños")) {
      context.occasion = "family"
    } else if (query.includes("trabajo") || query.includes("negocio")) {
      context.occasion = "business"
    } else if (query.includes("celebrar") || query.includes("cumpleaños")) {
      context.occasion = "celebration"
    }

    return context
  }

  private extractTimeOfDay(query: string): "breakfast" | "lunch" | "dinner" | "snack" {
    const currentHour = new Date().getHours()

    // Check for explicit time mentions
    for (const [time, patterns] of Object.entries(TIME_PATTERNS)) {
      if (patterns.some((pattern) => query.includes(pattern))) {
        return time as any
      }
    }

    // Default based on current time
    if (currentHour < 11) return "breakfast"
    if (currentHour < 16) return "lunch"
    if (currentHour < 22) return "dinner"
    return "snack"
  }

  private extractPreferences(query: string): Partial<SearchFilters> {
    const preferences: Partial<SearchFilters> = {}

    // Extract cuisine preferences
    for (const [cuisine, patterns] of Object.entries(CUISINE_PATTERNS)) {
      if (patterns.some((pattern) => query.includes(pattern))) {
        preferences.cuisine = cuisine
        break
      }
    }

    // Extract price preferences
    if (PRICE_PATTERNS.budget.some((pattern) => query.includes(pattern))) {
      preferences.priceRange = [1, 2]
    } else if (PRICE_PATTERNS.expensive.some((pattern) => query.includes(pattern))) {
      preferences.priceRange = [3, 4]
    }

    // Extract rating preferences
    if (query.includes("mejor") || query.includes("bueno") || query.includes("recomendado")) {
      preferences.rating = 4.0
    }

    // Extract features
    const features: string[] = []
    if (query.includes("terraza") || query.includes("aire libre")) {
      features.push("outdoor seating")
    }
    if (query.includes("delivery") || query.includes("domicilio")) {
      features.push("delivery")
    }
    if (query.includes("vegetariano") || query.includes("vegano")) {
      features.push("vegetarian options")
    }
    if (query.includes("wifi")) {
      features.push("wifi")
    }
    if (features.length > 0) {
      preferences.features = features
    }

    return preferences
  }

  private buildSearchFilters(
    extractedPreferences: Partial<SearchFilters>,
    context: AIRecommendationContext,
  ): SearchFilters {
    const filters: SearchFilters = { ...extractedPreferences }

    // Apply user preferences if available
    if (this.userPreferences) {
      if (!filters.priceRange && this.userPreferences.priceRange) {
        filters.priceRange = this.userPreferences.priceRange
      }
      if (!filters.features && this.userPreferences.favoriteFeatures.length > 0) {
        filters.features = this.userPreferences.favoriteFeatures
      }
      if (this.userPreferences.location) {
        filters.location = {
          ...this.userPreferences.location,
          radius: 5, // 5km radius
        }
      }
    }

    return filters
  }

  private scoreRecommendations(
    restaurants: Restaurant[],
    originalQuery: string,
    extractedPreferences: Partial<SearchFilters>,
    context: AIRecommendationContext,
  ): AIRecommendation[] {
    return restaurants
      .map((restaurant) => {
        let score = 0
        const matchedPreferences: string[] = []
        let reasoning = ""

        // Base score from rating
        score += restaurant.rating * 20

        // Cuisine match
        if (extractedPreferences.cuisine && restaurant.cuisine_type?.toLowerCase() === extractedPreferences.cuisine) {
          score += 30
          matchedPreferences.push(`Cuisine: ${restaurant.cuisine_type}`)
          reasoning += `Matches your ${restaurant.cuisine_type} preference. `
        }

        // Price range match
        if (extractedPreferences.priceRange && restaurant.price_range) {
          const [minPrice, maxPrice] = extractedPreferences.priceRange
          if (restaurant.price_range >= minPrice && restaurant.price_range <= maxPrice) {
            score += 20
            matchedPreferences.push(`Price range: ${"$".repeat(restaurant.price_range)}`)
            reasoning += `Within your budget range. `
          }
        }

        // Features match
        if (extractedPreferences.features && restaurant.features) {
          const matchingFeatures = extractedPreferences.features.filter((feature) =>
            restaurant.features?.includes(feature),
          )
          score += matchingFeatures.length * 15
          matchingFeatures.forEach((feature) => {
            matchedPreferences.push(`Feature: ${feature}`)
          })
          if (matchingFeatures.length > 0) {
            reasoning += `Has ${matchingFeatures.join(", ")}. `
          }
        }

        // Context-based scoring
        if (context.mood === "healthy" && restaurant.features?.includes("vegetarian options")) {
          score += 25
          reasoning += "Great for healthy eating. "
        }

        if (context.occasion === "date" && restaurant.features?.includes("romantic atmosphere")) {
          score += 25
          reasoning += "Perfect for a romantic dinner. "
        }

        if (context.timeOfDay === "breakfast" && restaurant.cuisine_type === "Guatemalan") {
          score += 15
          reasoning += "Great for traditional breakfast. "
        }

        // High rating bonus
        if (restaurant.rating >= 4.5) {
          score += 10
          reasoning += "Highly rated by customers. "
        }

        // Review count bonus (popularity)
        if (restaurant.total_reviews > 100) {
          score += 5
          reasoning += "Popular choice. "
        }

        return {
          restaurant,
          confidence: Math.min(score, 100),
          reasoning: reasoning.trim() || "Good match based on your preferences.",
          matchedPreferences,
        }
      })
      .sort((a, b) => b.confidence - a.confidence)
  }

  private getFallbackRecommendations(
    _query: string,
    _extractedPreferences: Partial<SearchFilters>,
    _context: AIRecommendationContext,
  ): AIRecommendation[] {
    // No invented restaurants when the catalog is empty or unavailable.
    return []
  }

  async getPersonalizedRecommendations(limit = 5): Promise<AIRecommendation[]> {
    try {
      if (!this.userPreferences) {
        // Return popular restaurants if no preferences
        const restaurants = await searchRestaurants("", { rating: 4.0 }, limit)
        return restaurants.map((restaurant) => ({
          restaurant,
          confidence: restaurant.rating * 20,
          reasoning: "Popular choice in your area.",
          matchedPreferences: [`Rating: ${restaurant.rating}`],
        }))
      }

      const filters: SearchFilters = {
        priceRange: this.userPreferences.priceRange,
        features: this.userPreferences.favoriteFeatures,
        location: this.userPreferences.location
          ? {
              ...this.userPreferences.location,
              radius: 5,
            }
          : undefined,
      }

      const restaurants = await searchRestaurants("", filters, limit * 2)

      return this.scoreRecommendations(restaurants, "", filters, {
        timeOfDay: this.extractTimeOfDay(""),
      }).slice(0, limit)
    } catch (error) {
      console.error("Error getting personalized recommendations:", error)

      // Return fallback recommendations
      return this.getFallbackRecommendations("", {}, { timeOfDay: this.extractTimeOfDay("") })
    }
  }
}

// Singleton instance
export const aiEngine = new AIRecommendationEngine()
