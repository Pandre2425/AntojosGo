
export interface RestaurantRegistrationData {
  name: string
  email: string
  password: string
  description: string
  address: string
  latitude?: number
  longitude?: number
  phone: string
  website?: string
  priceRange: "$" | "$$" | "$$$" | "$$$$"
  serviceOptions: string[]
  openingHours: Record<string, string>
  legalInfo: {
    nit: string
    businessLicense?: string
  }
  categories: string[]
}

export interface RestaurantLoginData {
  email: string
  password: string
}

// Legacy onboarding is intentionally disabled; use AccountAccess and createOwnedRestaurant.
export async function registerRestaurant(_data: RestaurantRegistrationData): Promise<any> {
  throw new Error("Usa la nueva pantalla de cuentas para registrarte.")
}
export async function loginRestaurant(_data: RestaurantLoginData): Promise<any> {
  throw new Error("Usa la nueva pantalla de cuentas para iniciar sesion.")
}
