import { z } from 'zod'
import type { DishTag } from './menu'

/**
 * Diner assistant, rules first: a dictionary of cravings plus intents (near, open now, cheap,
 * "another one", "what's on the menu"). Pure and deterministic; the server only asks the AI
 * when interpret() returns action 'unknown'. Neither rules nor AI choose restaurants: they only
 * produce filters, and the database decides what exists.
 */

type Concept = { label: string; triggers: string[]; terms: string[]; tags?: DishTag[]; openNow?: boolean }

// triggers: word starts in the user's (accent-free, lowercase) message. terms: word starts searched in
// dish/restaurant text. Both are plain [a-z0-9 ] so the server-built regex stays safe.
export const CONCEPTS = {
  picante: { label: 'algo picante', triggers: ['picant', 'picos', 'enchil', 'chile', 'chiltepe', 'jalapen', 'habaner', 'diabla', 'que pique'], terms: ['picant', 'picos', 'chile', 'chiltepe', 'jalapen', 'habaner', 'diabla', 'enchilad', 'chipotle', 'sriracha'], tags: ['picante'] },
  desayuno: { label: 'desayuno', triggers: ['desayun', 'huevos', 'panquequ', 'pancake', 'mosh'], terms: ['desayun', 'huevo', 'panquequ', 'pancake', 'mosh', 'omelet', 'waffle', 'chilaquil', 'tostada francesa', 'frijoles volteados'], tags: ['desayuno'], openNow: true },
  postre: { label: 'postres', triggers: ['postre', 'dulce', 'pastel', 'flan', 'brownie', 'galleta', 'chocobanano', 'rellenito', 'churro'], terms: ['postre', 'pastel', 'flan', 'helado', 'nieve', 'pie de', 'gelatina', 'chocobanano', 'rellenito', 'churro', 'brownie', 'galleta', 'dulce', 'tres leches', 'cheesecake'], tags: ['postre'] },
  frio: { label: 'algo frío', triggers: ['frio', 'fria', 'helado', 'nieve', 'granizad', 'refrescant', 'fresquito', 'smoothie', 'frappe'], terms: ['helado', 'nieve', 'granizad', 'smoothie', 'licuado', 'frappe', 'frio', 'fria', 'sorbete', 'paleta', 'gelatina'], tags: ['frio'] },
  caliente: { label: 'algo calientito', triggers: ['calient', 'calentit', 'para el frio', 'hace frio', 'caldo', 'sopa', 'atol', 'consome', 'ponche'], terms: ['caldo', 'sopa', 'atol', 'consome', 'ponche', 'chocolate caliente', 'cafe', 'kakik', 'revolcado', 'calient'], tags: ['caliente'] },
  cafe: { label: 'café', triggers: ['cafe', 'capuchin', 'cappucc', 'latte', 'espresso', 'cafeteri'], terms: ['cafe', 'capuchin', 'cappucc', 'latte', 'espresso', 'americano', 'mocca', 'moka'] },
  pizza: { label: 'pizza', triggers: ['pizz'], terms: ['pizz'] },
  hamburguesa: { label: 'hamburguesas', triggers: ['hamburgues', 'burger'], terms: ['hamburgues', 'burger'] },
  mexicana: { label: 'comida mexicana', triggers: ['taco', 'burrito', 'quesadill', 'nacho', 'enchilada', 'mexican'], terms: ['taco', 'burrito', 'quesadill', 'nacho', 'enchilada', 'mexican', 'gringa'] },
  mariscos: { label: 'mariscos', triggers: ['marisc', 'ceviche', 'camaron', 'pescad', 'mojarra', 'pulpo'], terms: ['marisc', 'ceviche', 'camaron', 'pescad', 'mojarra', 'pulpo', 'tapado'] },
  carne: { label: 'carnes', triggers: ['carne', 'churrasc', 'asad', 'parrill', 'lomito', 'puyazo', 'costill', 'steak'], terms: ['carne', 'churrasc', 'asad', 'parrill', 'lomito', 'puyazo', 'costill', 'steak', 'carne de res'] },
  pollo: { label: 'pollo', triggers: ['pollo', 'alitas', 'pechuga'], terms: ['pollo', 'alitas', 'pechuga'] },
  tipico: { label: 'comida típica', triggers: ['tipic', 'chapin', 'pepian', 'kakik', 'jocon', 'subanik', 'chuchit', 'tamal', 'revolcad', 'hilacha', 'shuco', 'paches', 'chojin', 'pupusa'], terms: ['tipic', 'chapin', 'pepian', 'kakik', 'jocon', 'subanik', 'chuchit', 'tamal', 'revolcad', 'hilacha', 'shuco', 'paches', 'chojin', 'pupusa', 'pulique'] },
  china: { label: 'comida china', triggers: ['chino', 'china', 'chao mein', 'chow mein', 'arroz frito', 'wantan', 'wonton'], terms: ['chino', 'china', 'chao mein', 'chow mein', 'arroz frito', 'wantan', 'wonton'] },
  japonesa: { label: 'comida japonesa', triggers: ['sushi', 'ramen', 'japon'], terms: ['sushi', 'ramen', 'japon', 'teriyaki'] },
  vegetariano: { label: 'opciones vegetarianas', triggers: ['vegetarian', 'sin carne', 'ensalada', 'verdura'], terms: ['vegetarian', 'ensalada', 'verdura', 'vegetal', 'tofu'], tags: ['vegetariano', 'vegano'] },
  vegano: { label: 'opciones veganas', triggers: ['vegan'], terms: ['vegan'], tags: ['vegano'] },
  sin_gluten: { label: 'opciones sin gluten', triggers: ['sin gluten', 'celiac', 'gluten free'], terms: ['sin gluten', 'gluten free'], tags: ['sin_gluten'] },
  bebida: { label: 'bebidas', triggers: ['bebida', 'tomar algo', 'refresco', 'jugo', 'limonada', 'licuado', 'horchata', 'jamaica', 'tamarindo'], terms: ['bebida', 'refresco', 'jugo', 'limonada', 'licuado', 'horchata', 'jamaica', 'tamarindo'], tags: ['bebida'] },
} satisfies Record<string, Concept>
export type ConceptKey = keyof typeof CONCEPTS
export const CONCEPT_KEYS = Object.keys(CONCEPTS) as [ConceptKey, ...ConceptKey[]]

const STOPWORDS = new Set(('quiero quisiera queria me te le gustaria gusta gustan algo alguna algun algunos un una unos unas el la los las lo de del al a en con sin para por que quien cual donde como cuando mas menos muy ' +
  'comer come comida cenar cena almorzar almuerzo merendar tomar tengo hay hambre antojo antoja se ser este esta esto estoy esa ese hoy ahora ahorita mismo rico rica buen bueno buena ' +
  'lugar lugares restaurante restaurantes opcion opciones busco buscar recomiendas recomienda recomendar dame dime puedes podrias favor porfa por favor y o pero si no mi mis tu tus ya bien ' +
  'tienen tiene tienes venden vende ofrecen ofrece hacen menu carta platillos platillo mucho mucha muchos muchas gracias otro otra otros otras ' +
  'cosa cosas tipo ver vamos voy ir salir').split(' '))

const INTENTS = {
  near: /\b(cerca|cercan|cerquit|por aqui|aqui cerca|a pie|caminando|cerca de mi)/,
  openNow: /\b(abiert|ahorita|ya mismo|en este momento|ahora mismo)/,
  meal: /\b(almorz|almuerzo|cenar|cena|comer ya|merend)/,
  cheap: /\b(barat|economic|no tan car|no muy car|poco dinero|presupuesto|accesible)/,
  more: /\b(otr[oa]s?|mas opcion|alguna otra|siguiente|diferente|algo mas)\b/,
  menu: /\b(menu|carta|que tienen|que mas tienen|que venden|que ofrecen|sus platillos|platillos tienen)/,
  hello: /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal|saludos)\b/,
  thanks: /\b(gracias|muchas gracias|perfecto|excelente|listo)\b/,
}

export const assistantContextSchema = z.object({
  concepts: z.array(z.enum(CONCEPT_KEYS)).max(6).default([]),
  words: z.array(z.string().regex(/^[a-z0-9]{3,30}$/)).max(4).default([]),
  near: z.boolean().default(false),
  openNow: z.boolean().default(false),
  cheap: z.boolean().default(false),
  shown: z.array(z.string().uuid()).max(30).default([]),
  lastBranchId: z.string().uuid().nullable().default(null),
})
export type AssistantContext = z.infer<typeof assistantContextSchema>
export const emptyContext = (): AssistantContext => assistantContextSchema.parse({})

export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1, 'Escribe qué se te antoja.').max(300),
  context: assistantContextSchema.default({}),
  location: z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) }).optional(),
})

export type AssistantAction = 'search' | 'more' | 'menu' | 'hello' | 'thanks' | 'unknown'

/** Lowercase, accents removed (ñ -> n), only [a-z0-9 ]. */
export const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

const hasStem = (text: string, stem: string) => new RegExp(`\\b${stem.trim()}`).test(text)

/** One user turn -> next context + what to do. Never throws on any input. */
export function interpret(message: string, previous: AssistantContext = emptyContext()): { context: AssistantContext; action: AssistantAction } {
  const text = normalize(message)
  // "para el frio" / "hace frio" means warm food, not a cold dessert.
  const concepts = (CONCEPT_KEYS.filter(k => CONCEPTS[k].triggers.some(t => hasStem(text, t))))
    .filter(k => !(k === 'frio' && /\b(para el|hace|con este|tengo) frio/.test(text)))
  const intent = Object.fromEntries(Object.entries(INTENTS).map(([k, re]) => [k, re.test(text)])) as Record<keyof typeof INTENTS, boolean>
  const covered = new Set(concepts.flatMap(k => CONCEPTS[k].triggers.flatMap(t => t.split(' '))))
  const words = text.split(' ').filter(w => w.length >= 3 && w.length <= 30 && !STOPWORDS.has(w)
    && ![...covered].some(c => w.startsWith(c)) && !Object.values(INTENTS).some(re => re.test(w))).slice(0, 4)

  const modifiers = intent.near || intent.openNow || intent.meal || intent.cheap
  const withModifiers = (ctx: AssistantContext): AssistantContext => ({
    ...ctx,
    near: ctx.near || intent.near,
    openNow: ctx.openNow || intent.openNow || intent.meal || concepts.some(k => (CONCEPTS[k] as Concept).openNow === true),
    cheap: ctx.cheap || intent.cheap,
  })

  if (concepts.length || words.length) {
    // New topic: keep the location preference, reset the rest.
    const context = withModifiers({ ...emptyContext(), near: previous.near, concepts: concepts.slice(0, 6), words })
    return { context, action: 'search' }
  }
  if (intent.menu && previous.lastBranchId) return { context: previous, action: 'menu' }
  // "algo más barato" / "otro más cerca" refine the search; a bare "otra opción" pages through it.
  if (modifiers) return { context: { ...withModifiers(previous), shown: [] }, action: 'search' }
  if (intent.more && (previous.concepts.length || previous.words.length || previous.near)) return { context: previous, action: 'more' }
  if (intent.thanks) return { context: previous, action: 'thanks' }
  if (intent.hello) return { context: previous, action: 'hello' }
  return { context: previous, action: 'unknown' }
}

/** Search groups for the assistant_search SQL function. Built only from validated context. */
export function searchGroups(ctx: AssistantContext): { re: string; tags: string[] }[] {
  const re = (terms: string[]) => `\\m(${terms.map(t => normalize(t)).filter(Boolean).join('|')})`
  const groups = ctx.concepts.map(k => ({ re: re(CONCEPTS[k].terms), tags: [...((CONCEPTS[k] as Concept).tags ?? [])] }))
  if (ctx.words.length) groups.push({ re: re(ctx.words), tags: [] })
  return groups.slice(0, 6)
}

/** Human label of what is being searched: "algo picante y postres". */
export function contextLabel(ctx: AssistantContext): string {
  const parts = [...ctx.concepts.map(k => CONCEPTS[k].label), ...(ctx.words.length ? [`«${ctx.words.join(' ')}»`] : [])]
  return parts.length ? parts.join(' y ') : 'lugares'
}
