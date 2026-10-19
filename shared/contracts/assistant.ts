import { z } from 'zod'
import { ALLERGEN_LABELS, ALLERGENS, type Allergen, type DishTag } from './menu'
import { t, msg } from '../i18n'

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
  picante: { label: msg('algo picante'), triggers: ['picant', 'picos', 'enchil', 'chile', 'chiltepe', 'jalapen', 'habaner', 'diabla', 'que pique', 'spicy', 'hot sauce', 'jalapeno'], terms: ['picant', 'picos', 'chile', 'chiltepe', 'jalapen', 'habaner', 'diabla', 'enchilad', 'chipotle', 'sriracha'], tags: ['picante'] },
  desayuno: { label: msg('desayuno'), triggers: ['desayun', 'huevos', 'panquequ', 'pancake', 'mosh', 'breakfast', 'brunch', 'eggs', 'omelet'], terms: ['desayun', 'huevo', 'panquequ', 'pancake', 'mosh', 'omelet', 'waffle', 'chilaquil', 'tostada francesa', 'frijoles volteados'], tags: ['desayuno'], openNow: true },
  postre: { label: msg('postres'), triggers: ['postre', 'dulce', 'pastel', 'flan', 'brownie', 'galleta', 'chocobanano', 'rellenito', 'churro', 'dessert', 'sweet', 'cake', 'cookie', 'pie '], terms: ['postre', 'pastel', 'flan', 'helado', 'nieve', 'pie de', 'gelatina', 'chocobanano', 'rellenito', 'churro', 'brownie', 'galleta', 'dulce', 'tres leches', 'cheesecake'], tags: ['postre'] },
  frio: { label: msg('algo frío'), triggers: ['frio', 'fria', 'helado', 'nieve', 'granizad', 'refrescant', 'fresquito', 'smoothie', 'frappe', 'cold', 'ice cream', 'iced', 'frozen', 'refreshing'], terms: ['helado', 'nieve', 'granizad', 'smoothie', 'licuado', 'frappe', 'frio', 'fria', 'sorbete', 'paleta', 'gelatina'], tags: ['frio'] },
  caliente: { label: msg('algo calientito'), triggers: ['calient', 'calentit', 'para el frio', 'hace frio', 'caldo', 'sopa', 'atol', 'consome', 'ponche', 'warm', 'soup', 'hot drink', 'hot chocolate', 'stew'], terms: ['caldo', 'sopa', 'atol', 'consome', 'ponche', 'chocolate caliente', 'cafe', 'kakik', 'revolcado', 'calient'], tags: ['caliente'] },
  cafe: { label: msg('café'), triggers: ['cafe', 'capuchin', 'cappucc', 'latte', 'espresso', 'cafeteri', 'coffee', 'cappuccino'], terms: ['cafe', 'capuchin', 'cappucc', 'latte', 'espresso', 'americano', 'mocca', 'moka'] },
  pizza: { label: msg('pizza'), triggers: ['pizz', 'pizza'], terms: ['pizz'] },
  hamburguesa: { label: msg('hamburguesas'), triggers: ['hamburgues', 'burger', 'hamburger', 'cheeseburger'], terms: ['hamburgues', 'burger'] },
  mexicana: { label: msg('comida mexicana'), triggers: ['taco', 'burrito', 'quesadill', 'nacho', 'enchilada', 'mexican', 'mexican', 'tacos'], terms: ['taco', 'burrito', 'quesadill', 'nacho', 'enchilada', 'mexican', 'gringa'] },
  mariscos: { label: msg('mariscos'), triggers: ['marisc', 'ceviche', 'camaron', 'pescad', 'mojarra', 'pulpo', 'seafood', 'shrimp', 'fish', 'octopus'], terms: ['marisc', 'ceviche', 'camaron', 'pescad', 'mojarra', 'pulpo', 'tapado'] },
  carne: { label: msg('carnes'), triggers: ['carne', 'churrasc', 'asad', 'parrill', 'lomito', 'puyazo', 'costill', 'steak', 'meat', 'beef', 'grill', 'bbq', 'barbecue', 'ribs'], terms: ['carne', 'churrasc', 'asad', 'parrill', 'lomito', 'puyazo', 'costill', 'steak', 'carne de res'] },
  pollo: { label: msg('pollo'), triggers: ['pollo', 'alitas', 'pechuga', 'chicken', 'wings'], terms: ['pollo', 'alitas', 'pechuga'] },
  tipico: { label: msg('comida típica'), triggers: ['tipic', 'chapin', 'pepian', 'kakik', 'jocon', 'subanik', 'chuchit', 'tamal', 'revolcad', 'hilacha', 'shuco', 'paches', 'chojin', 'pupusa', 'traditional', 'typical', 'local food', 'guatemalan'], terms: ['tipic', 'chapin', 'pepian', 'kakik', 'jocon', 'subanik', 'chuchit', 'tamal', 'revolcad', 'hilacha', 'shuco', 'paches', 'chojin', 'pupusa', 'pulique'] },
  china: { label: msg('comida china'), triggers: ['chino', 'china', 'chao mein', 'chow mein', 'arroz frito', 'wantan', 'wonton', 'chinese', 'fried rice'], terms: ['chino', 'china', 'chao mein', 'chow mein', 'arroz frito', 'wantan', 'wonton'] },
  japonesa: { label: msg('comida japonesa'), triggers: ['sushi', 'ramen', 'japon', 'japanese'], terms: ['sushi', 'ramen', 'japon', 'teriyaki'] },
  vegetariano: { label: msg('opciones vegetarianas'), triggers: ['vegetarian', 'sin carne', 'ensalada', 'verdura', 'veggie', 'salad', 'meatless'], terms: ['vegetarian', 'ensalada', 'verdura', 'vegetal', 'tofu'], tags: ['vegetariano', 'vegano'] },
  vegano: { label: msg('opciones veganas'), triggers: ['vegan', 'plant based'], terms: ['vegan'], tags: ['vegano'] },
  sin_gluten: { label: msg('opciones sin gluten'), triggers: ['sin gluten', 'celiac', 'gluten free', 'gluten free', 'celiac'], terms: ['sin gluten', 'gluten free'], tags: ['sin_gluten'] },
  bebida: { label: msg('bebidas'), triggers: ['bebida', 'tomar algo', 'refresco', 'jugo', 'limonada', 'licuado', 'horchata', 'jamaica', 'tamarindo', 'drink', 'juice', 'lemonade', 'smoothie', 'soda'], terms: ['bebida', 'refresco', 'jugo', 'limonada', 'licuado', 'horchata', 'jamaica', 'tamarindo'], tags: ['bebida'] },
} satisfies Record<string, Concept>
export type ConceptKey = keyof typeof CONCEPTS
export const CONCEPT_KEYS = Object.keys(CONCEPTS) as [ConceptKey, ...ConceptKey[]]

const STOPWORDS = new Set(('quiero quisiera queria me te le gustaria gusta gustan algo alguna algun algunos un una unos unas el la los las lo de del al a en con sin para por que quien cual donde como cuando mas menos muy ' +
  'comer come comida cenar cena almorzar almuerzo merendar tomar tengo hay hambre antojo antoja se ser este esta esto estoy esa ese hoy ahora ahorita mismo rico rica buen bueno buena ' +
  'lugar lugares restaurante restaurantes opcion opciones busco buscar recomiendas recomienda recomendar dame dime puedes podrias favor porfa por favor y o pero si no mi mis tu tus ya bien ' +
  'tienen tiene tienes venden vende ofrecen ofrece hacen menu carta platillos platillo mucho mucha muchos muchas gracias otro otra otros otras ' +
  'cosa cosas tipo ver vamos voy ir salir soy alergico alergica alergia intolerante intolerancia puedo nada ' +
  // English
  'i im want wanna would like love need some any something the an of to for with in on at and or but me my is are it its eat eating food meal place places restaurant restaurants ' +
  'option options looking find show give recommend please can could you get have has good nice best really very today now hungry craving thanks thank around ' +
  'one ones that this there what where which some more most other them they something anything go going lets let').split(' '))

const INTENTS = {
  near: /\b(cerca|cercan|cerquit|por aqui|aqui cerca|a pie|caminando|cerca de mi|near|nearby|close by|closest|around here|walking distance|near me)/,
  openNow: /\b(abiert|ahorita|ya mismo|en este momento|ahora mismo|open now|right now|currently open)/,
  meal: /\b(almorz|almuerzo|cenar|cena|comer ya|merend|lunch|dinner|supper)/,
  cheap: /\b(barat|economic|no tan car|no muy car|poco dinero|presupuesto|accesible|cheap|affordable|inexpensive|budget|low cost)/,
  more: /\b(otr[oa]s?|mas opcion|alguna otra|siguiente|diferente|algo mas|another|other|more options|next|something else|anything else)\b/,
  menu: /\b(menu|carta|que tienen|que mas tienen|que venden|que ofrecen|sus platillos|platillos tienen|what do they (?:have|serve|sell)|their dishes)/,
  hello: /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal|saludos|hi|hello|good morning|good afternoon|good evening)\b/,
  thanks: /\b(gracias|muchas gracias|perfecto|excelente|listo|thanks|thank you|great|awesome)\b/,
}

// Words that name an allergen (accent-free stems) -> allergen key.
const ALLERGEN_WORDS: Record<Allergen, string[]> = {
  mani: ['mani', 'cacahuate', 'cacahuete', 'peanut'], nueces: ['nuez', 'nueces', 'almendra', 'maranon', 'pistach', 'avellana', 'nut', 'almond', 'cashew', 'pistachio', 'hazelnut', 'walnut'],
  lacteos: ['lacteo', 'leche', 'queso', 'crema', 'lactosa', 'mantequilla', 'dairy', 'milk', 'cheese', 'cream', 'lactose', 'butter'], huevo: ['huevo', 'egg'], gluten: ['gluten', 'trigo', 'harina', 'wheat', 'flour'],
  mariscos: ['marisco', 'camaron', 'langost', 'cangrejo', 'concha', 'pulpo', 'calamar', 'shellfish', 'shrimp', 'lobster', 'crab', 'octopus', 'squid'], pescado: ['pescado', 'fish'],
  soya: ['soya', 'soja', 'soy'], ajonjoli: ['ajonjoli', 'sesamo', 'sesame'],
}
// "sin X", "no como X", "alergico al X", "que no tenga X" (X = up to 3 words; "ni"/"y" chain more items).
const NEGATION = /\b(?:sin|no (?:puedo comer|como|quiero|me gusta|me gustan)|alergic[oa] (?:a|al|a la|a los|a las)|intolerante (?:a|al|a la)|evit(?:o|ar)|que no (?:tenga|lleve)|without|allergic to|(?:can t|cannot|cant|don t|dont|do not) (?:eat|have)|avoid(?:ing)?|free of)\s+((?:[a-z0-9]+)(?:\s+(?:y|ni|o|,)?\s*[a-z0-9]+){0,4})/g
const FILLER = new Set(['el', 'la', 'los', 'las', 'de', 'y', 'ni', 'o', 'nada', 'algo', 'comida', 'cosas', 'con', 'que', 'tenga', 'lleve',
  'the', 'a', 'an', 'and', 'or', 'nor', 'any', 'food', 'with', 'please'])

/** Pulls exclusions out of a normalized message; returns the message without them. */
export function extractExclusions(text: string): { without: Allergen[]; avoid: string[]; rest: string } {
  const without = new Set<Allergen>(); const avoid = new Set<string>()
  const rest = text.replace(NEGATION, (_m, items: string) => {
    const words = items.split(/\s+/)
    let took = false
    for (const [i, w] of words.entries()) {
      // "alérgico al maní, un postre frío": after the first excluded item, a craving word starts the request again.
      if (took && detectConcepts(w).length) return ` ${words.slice(i).join(' ')} `
      if (w.length < 3 || FILLER.has(w)) continue
      const allergen = ALLERGENS.find(a => ALLERGEN_WORDS[a].some(stem => w.startsWith(stem)))
      if (allergen) { without.add(allergen); took = true }
      else if (/^[a-z0-9]{3,30}$/.test(w) && !STOPWORDS.has(w)) { avoid.add(w); took = true }
    }
    return ' '
  }).replace(/\s+/g, ' ').trim()
  return { without: [...without], avoid: [...avoid].slice(0, 4), rest }
}

export const assistantContextSchema = z.object({
  concepts: z.array(z.enum(CONCEPT_KEYS)).max(6).default([]),
  words: z.array(z.string().regex(/^[a-z0-9]{3,30}$/)).max(4).default([]),
  near: z.boolean().default(false),
  openNow: z.boolean().default(false),
  cheap: z.boolean().default(false),
  shown: z.array(z.string().uuid()).max(30).default([]),
  lastBranchId: z.string().uuid().nullable().default(null),
  // The diner's restrictions persist across topics in the conversation.
  without: z.array(z.enum(ALLERGENS)).max(ALLERGENS.length).default([]),
  avoid: z.array(z.string().regex(/^[a-z0-9]{3,30}$/)).max(4).default([]),
})
export type AssistantContext = z.infer<typeof assistantContextSchema>
export const emptyContext = (): AssistantContext => assistantContextSchema.parse({})

export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1, t('Escribe qué se te antoja.')).max(300),
  context: assistantContextSchema.default({}),
  location: z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) }).optional(),
  /** Restaurants the diner marked «No me interesa». */
  hide: z.array(z.string().uuid()).max(100).default([]),
})

export type AssistantAction = 'search' | 'more' | 'menu' | 'hello' | 'thanks' | 'unknown'

/** Lowercase, accents removed (ñ -> n), only [a-z0-9 ]. */
export const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

const hasStem = (text: string, stem: string) => new RegExp(`\\b${stem.trim()}`).test(text)

/** Food concepts mentioned in already-normalized text. "para el frio" / "hace frio" means warm food, not a cold dessert. */
export const detectConcepts = (text: string): ConceptKey[] => CONCEPT_KEYS.filter(k => CONCEPTS[k].triggers.some(t => hasStem(text, t)))
  .filter(k => !(k === 'frio' && /\b(para el|hace|con este|tengo) frio/.test(text)))

/** One user turn -> next context + what to do. Never throws on any input. */
export function interpret(message: string, previous: AssistantContext = emptyContext()): { context: AssistantContext; action: AssistantAction } {
  const exclusions = extractExclusions(normalize(message))
  const text = exclusions.rest
  const restrictions = {
    without: [...new Set([...previous.without, ...exclusions.without])],
    avoid: [...new Set([...previous.avoid, ...exclusions.avoid])].slice(0, 4),
  }
  const restricted = exclusions.without.length > 0 || exclusions.avoid.length > 0
  const concepts = detectConcepts(text)
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
    const context = withModifiers({ ...emptyContext(), near: previous.near, concepts: concepts.slice(0, 6), words, ...restrictions })
    return { context, action: 'search' }
  }
  // "sin maní" alone refines the current search (or searches everything with that restriction).
  if (restricted) return { context: { ...withModifiers(previous), ...restrictions, shown: [] }, action: 'search' }
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

/** Regex (word starts) excluding dishes that mention any of these ingredients. Words are pre-validated [a-z0-9]. */
export const avoidRegex = (words: string[]) => words.length ? `\\m(${words.map(normalize).filter(Boolean).join('|')})` : ''

/** Explorar text box -> one search group per meaningful word (all must match). */
export function queryGroups(q: string): { re: string; tags: string[] }[] {
  const words = normalize(q).split(' ').filter(w => w.length >= 2 && w.length <= 30 && !STOPWORDS.has(w))
  return words.slice(0, 4).map(w => ({ re: `\\m(${w})`, tags: [] }))
}

const joinList = (items: string[]) => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')}${t(' ni ')}${items[items.length - 1]}`

/** Human label of what is being searched: "algo picante y postres sin maní ni cebolla" (English when the reader uses English). */
export function contextLabel(ctx: AssistantContext): string {
  const parts = [...ctx.concepts.map(k => t(CONCEPTS[k].label)), ...(ctx.words.length ? [`«${ctx.words.join(' ')}»`] : [])]
  const base = parts.length ? parts.join(t(' y ')) : t('lugares')
  const excluded = [...ctx.without.map(a => t(ALLERGEN_LABELS[a]).replace(/ \(.*\)$/, '').toLowerCase()), ...ctx.avoid]
  return excluded.length ? t('{base} sin {list}', { base, list: joinList(excluded) }) : base
}
