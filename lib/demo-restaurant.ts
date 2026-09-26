import type { Dish, CreateDishData, UpdateDishData } from './menu-management'
import type { RestaurantProfile, UpdateProfileData } from './restaurant-profile'
import type { RestaurantAnalytics } from './restaurant-analytics'

export const DEMO_RESTAURANT_ID = 'demo-restaurant'
const key = 'antojosgo-restaurant-demo-v1'
type DemoState = { profile: RestaurantProfile; dishes: Dish[] }

function initialState(): DemoState {
  return {
    profile: {
      id: DEMO_RESTAURANT_ID, name: 'Antojitos de Guatemala', email: 'demo@example.com',
      description: 'Comida de casa, recetas tradicionales y sabores de Guatemala.',
      address: 'Zona 10, Ciudad de Guatemala', phone: '+502 2222-0000',
      socialMedia: {}, openingHours: { monday: '08:00 - 18:00' }, priceRange: '$$',
      serviceOptions: ['dine_in', 'takeout'], legalInfo: {}, isVerified: false, isActive: true,
      rating: 0, reviewCount: 0, categories: ['Comida Típica'], images: [],
    },
    dishes: [{
      id: 'demo-dish-1', restaurantId: DEMO_RESTAURANT_ID, name: 'Pepián de pollo',
      description: 'Recado tradicional acompañado de arroz y tortillas.', ingredients: ['Pollo', 'Tomate', 'Arroz'],
      category: 'Plato Principal', price: 65, isAvailable: true, isSpecial: false,
      allergens: [], dietaryInfo: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    }],
  }
}

function assertDemo(id: string) {
  if (id !== DEMO_RESTAURANT_ID) throw new Error('Restaurante de demostración no encontrado')
}

function read(): DemoState {
  if (typeof window === 'undefined') return initialState()
  try {
    const raw = window.localStorage.getItem(key)
    if (raw) {
      const data = JSON.parse(raw) as DemoState
      if (data.profile?.id === DEMO_RESTAURANT_ID && Array.isArray(data.dishes)) return data
    }
  } catch { /* An invalid demo cache can be recreated. */ }
  return initialState()
}

function save(state: DemoState) {
  if (typeof window === 'undefined') throw new Error('El modo demo requiere un navegador')
  try { window.localStorage.setItem(key, JSON.stringify(state)) }
  catch { throw new Error('No se pudo guardar en este dispositivo. Comprueba el almacenamiento del navegador.') }
}

export function getDemoProfile(id: string) { assertDemo(id); return read().profile }
export function updateDemoProfile(id: string, data: UpdateProfileData) {
  assertDemo(id)
  const state = read()
  state.profile = { ...state.profile, ...data }
  save(state)
  return state.profile
}
export function getDemoMenu(id: string) { assertDemo(id); return read().dishes }
export function createDemoDish(id: string, data: CreateDishData): Dish {
  assertDemo(id)
  if (!data.name.trim() || !Number.isFinite(data.price) || data.price < 0) throw new Error('Revisa el nombre y precio del platillo')
  const state = read()
  const now = new Date().toISOString()
  // getRandomValues also works on the emulator's HTTP development origin.
  const localId = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const dish: Dish = { ...data, id: `demo-${localId}`, restaurantId: id,
    isAvailable: true, isSpecial: data.isSpecial ?? false, allergens: data.allergens ?? [],
    dietaryInfo: data.dietaryInfo ?? [], createdAt: now, updatedAt: now }
  state.dishes.push(dish)
  save(state)
  return dish
}
export function updateDemoDish(id: string, dishId: string, data: UpdateDishData): Dish {
  assertDemo(id)
  const state = read()
  const index = state.dishes.findIndex((dish) => dish.id === dishId)
  if (index < 0) throw new Error('Platillo no encontrado')
  if ((data.name !== undefined && !data.name.trim()) || (data.price !== undefined && (!Number.isFinite(data.price) || data.price < 0))) throw new Error('Revisa el nombre y precio del platillo')
  state.dishes[index] = { ...state.dishes[index], ...data, updatedAt: new Date().toISOString() }
  save(state)
  return state.dishes[index]
}
export function deleteDemoDish(id: string, dishId: string) {
  assertDemo(id)
  const state = read()
  state.dishes = state.dishes.filter((dish) => dish.id !== dishId)
  save(state)
}
export function getDemoAnalytics(id: string): RestaurantAnalytics {
  const dishes = getDemoMenu(id)
  return { profileViews: 0, totalReviews: 0, averageRating: 0,
    totalDishes: dishes.length, activeDishes: dishes.filter((dish) => dish.isAvailable).length,
    specialDishes: dishes.filter((dish) => dish.isSpecial).length,
    recentReviews: [], popularDishes: [], monthlyMetrics: [], }
}
