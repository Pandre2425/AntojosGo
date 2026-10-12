import type { ConceptKey } from './assistant'

/** Home shortcuts: one per assistant concept. `query` is what gets sent to the assistant. Order = default when nothing has been searched yet. */
export const HOME_OPTIONS: { concept: ConceptKey; symbol: string; title: string; query: string }[] = [
  { concept: 'pizza', symbol: '🍕', title: 'Pizza', query: 'pizza' },
  { concept: 'hamburguesa', symbol: '🍔', title: 'Hamburguesas', query: 'hamburguesas' },
  { concept: 'mexicana', symbol: '🌮', title: 'Tacos', query: 'tacos' },
  { concept: 'tipico', symbol: '🫔', title: 'Comida típica', query: 'comida típica' },
  { concept: 'pollo', symbol: '🍗', title: 'Pollo', query: 'pollo' },
  { concept: 'cafe', symbol: '☕', title: 'Café', query: 'café' },
  { concept: 'postre', symbol: '🍰', title: 'Postres', query: 'postres' },
  { concept: 'desayuno', symbol: '🍳', title: 'Desayunos', query: 'desayuno' },
  { concept: 'mariscos', symbol: '🦐', title: 'Mariscos', query: 'mariscos' },
  { concept: 'carne', symbol: '🥩', title: 'Carnes', query: 'carnes asadas' },
  { concept: 'china', symbol: '🥡', title: 'Comida china', query: 'comida china' },
  { concept: 'japonesa', symbol: '🍣', title: 'Sushi', query: 'sushi' },
  { concept: 'vegetariano', symbol: '🥗', title: 'Vegetariano', query: 'algo vegetariano' },
  { concept: 'caliente', symbol: '🍲', title: 'Calientito', query: 'algo calientito' },
  { concept: 'frio', symbol: '🍦', title: 'Algo frío', query: 'algo frío' },
  { concept: 'bebida', symbol: '🥤', title: 'Bebidas', query: 'bebidas' },
  { concept: 'picante', symbol: '🌶️', title: 'Picante', query: 'algo picante' },
]
export type HomeOption = (typeof HOME_OPTIONS)[number]

/** Most searched first (ties and unsearched keep the default order). */
export function rankHomeOptions(hits: Partial<Record<string, number>>, limit = 8): HomeOption[] {
  return HOME_OPTIONS.map((o, i) => ({ o, i, h: hits[o.concept] ?? 0 }))
    .sort((a, b) => b.h - a.h || a.i - b.i).slice(0, limit).map(x => x.o)
}
