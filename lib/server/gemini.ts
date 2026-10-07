import 'server-only'
import { z } from 'zod'
import { createBoundedFetch } from '../bounded-fetch'
import { CONCEPT_KEYS, normalize } from '../../shared/contracts/assistant'

// Fallback interpreter, used only when the rules don't understand a message.
// Only the user's sentence is sent (never names, emails or coordinates): on Gemini's free tier
// Google may use prompts to improve its products. Without GEMINI_API_KEY the assistant runs on rules only.
const fetchGemini = createBoundedFetch(8000)

const aiResultSchema = z.object({
  understood: z.boolean(),
  concepts: z.array(z.enum(CONCEPT_KEYS)).max(6).catch([]),
  words: z.array(z.string()).max(6).catch([]),
  near: z.boolean().catch(false),
  openNow: z.boolean().catch(false),
  cheap: z.boolean().catch(false),
})
export type AiInterpretation = z.infer<typeof aiResultSchema>

const instruction = `Eres el intérprete de búsqueda de AntojosGo, una app de restaurantes registrados en Guatemala.
Convierte el mensaje del usuario en filtros de búsqueda. No inventes restaurantes ni platillos.
- concepts: categorías de antojo, solo de esta lista: ${CONCEPT_KEYS.join(', ')}.
- words: hasta 4 palabras clave de comida o platillos concretos que no encajen en concepts (en español, minúsculas, sin acentos).
- near: true si quiere algo cerca. openNow: true si quiere ir ya o pregunta qué está abierto. cheap: true si busca algo barato.
- understood: false si el mensaje no trata de comida, bebida o restaurantes.`

const responseJsonSchema = {
  type: 'object',
  properties: {
    understood: { type: 'boolean' },
    concepts: { type: 'array', items: { type: 'string', enum: CONCEPT_KEYS } },
    words: { type: 'array', items: { type: 'string' } },
    near: { type: 'boolean' }, openNow: { type: 'boolean' }, cheap: { type: 'boolean' },
  },
  required: ['understood', 'concepts', 'words', 'near', 'openNow', 'cheap'],
}

export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY?.trim())

/** Returns null when the AI is disabled, fails, times out or answers something invalid. */
export async function interpretWithAi(message: string): Promise<AiInterpretation | null> {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) return null
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite'
  try {
    const response = await fetchGemini(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ role: 'user', parts: [{ text: message.slice(0, 300) }] }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema, temperature: 0, maxOutputTokens: 200 },
      }),
    })
    if (!response.ok) { console.error(`[assistant] AI HTTP ${response.status}`); return null }
    const body = await response.json()
    const parsed = aiResultSchema.safeParse(JSON.parse(body?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'null'))
    if (!parsed.success) return null
    // The AI only proposes filters; words are re-sanitized like any user input.
    return { ...parsed.data, words: parsed.data.words.map(normalize).filter(w => /^[a-z0-9]{3,30}$/.test(w)).slice(0, 4) }
  } catch (error) {
    console.error('[assistant] AI unavailable:', error instanceof Error ? error.name : 'error')
    return null
  }
}
