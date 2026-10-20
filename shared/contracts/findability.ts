import { msg } from '../i18n'
import type { RestaurantBranch } from './branches'
import { allergenStatus, type Dish } from './menu'
import type { BusinessProfile } from './restaurants'

// «Para que te encuentren»: what a restaurant still lacks to appear in searches and look complete.
// `required` items decide whether diners can find it at all; the rest improve how it shows up.
export type FindabilityArea = 'profile' | 'branches' | 'menu'
export type FindabilityItem = { key: string; label: string; done: boolean; required: boolean; area: FindabilityArea; detail?: { done: number; total: number } }

const visible = (d: Dish) => d.status === 'published'

export function findabilityChecklist(profile: Pick<BusinessProfile, 'description' | 'category' | 'logo_url' | 'cover_url'>, branches: RestaurantBranch[], dishes: Dish[]): FindabilityItem[] {
  const published = branches.filter(b => b.status === 'published')
  const shown = dishes.filter(visible)
  const count = (list: unknown[], ok: number) => ({ done: ok, total: list.length })
  return [
    { key: 'published', area: 'branches', required: true, label: msg('Publica al menos una sede'), done: published.length > 0 },
    { key: 'location', area: 'branches', required: true, label: msg('Marca la ubicación de tus sedes en el mapa'), done: branches.length > 0 && branches.every(b => b.latitude !== null), detail: count(branches, branches.filter(b => b.latitude !== null).length) },
    { key: 'menu', area: 'menu', required: true, label: msg('Ten al menos 3 platillos visibles'), done: shown.length >= 3, detail: { done: Math.min(shown.length, 3), total: 3 } },
    { key: 'hours', area: 'branches', required: false, label: msg('Agrega el horario de tus sedes publicadas'), done: published.length > 0 && published.every(b => b.opening_hours.length > 0), detail: count(published, published.filter(b => b.opening_hours.length > 0).length) },
    { key: 'description', area: 'profile', required: false, label: msg('Describe tu restaurante (al menos 40 letras)'), done: (profile.description ?? '').trim().length >= 40 },
    { key: 'category', area: 'profile', required: false, label: msg('Elige el tipo de negocio'), done: Boolean(profile.category?.trim()) },
    { key: 'logo', area: 'profile', required: false, label: msg('Sube tu logo'), done: Boolean(profile.logo_url) },
    { key: 'cover', area: 'profile', required: false, label: msg('Sube una foto del local o de tu mejor platillo'), done: Boolean(profile.cover_url) },
    { key: 'phone', area: 'branches', required: false, label: msg('Agrega un teléfono o WhatsApp a tus sedes publicadas'), done: published.length > 0 && published.every(b => Boolean(b.phone)) },
    { key: 'photos', area: 'menu', required: false, label: msg('Agrega fotos a tus platillos'), done: shown.length > 0 && shown.every(d => Boolean(d.image_url)), detail: count(shown, shown.filter(d => d.image_url).length) },
    { key: 'allergens', area: 'menu', required: false, label: msg('Declara los alérgenos de cada platillo'), done: shown.length > 0 && shown.every(d => allergenStatus(d.allergens).declared), detail: count(shown, shown.filter(d => allergenStatus(d.allergens).declared).length) },
    { key: 'types', area: 'menu', required: false, label: msg('Indica el tipo de plato o cocina de cada platillo'), done: shown.length > 0 && shown.every(d => (d.dish_types?.length ?? 0) + (d.cuisines?.length ?? 0) > 0), detail: count(shown, shown.filter(d => (d.dish_types?.length ?? 0) + (d.cuisines?.length ?? 0) > 0).length) },
  ]
}

/** 0–100, required items count double. */
export function findabilityScore(items: FindabilityItem[]): number {
  const weight = (i: FindabilityItem) => (i.required ? 2 : 1)
  const total = items.reduce((s, i) => s + weight(i), 0)
  return total ? Math.round((items.filter(i => i.done).reduce((s, i) => s + weight(i), 0) / total) * 100) : 0
}
