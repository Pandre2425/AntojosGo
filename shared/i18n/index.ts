import { en } from './en'

// Spanish is the source language: the Spanish text is the key (gettext style) and en.ts holds its English version.
// Text without an entry is shown as is, so a missing translation never breaks a screen; tests/i18n.test.cjs
// fails when a t('…') literal in the code has no English entry.
export type Lang = 'es' | 'en'
export const LANGS: readonly { id: Lang; label: string }[] = [{ id: 'es', label: 'Español' }, { id: 'en', label: 'English' }]
export const LANG_KEY = 'antojosgo:lang'

let source: () => Lang = () => 'es'
/** Where t() reads the language from: the UI provider on clients, the request on the server. */
export function setLanguageSource(fn: () => Lang) { source = fn }
export const currentLang = (): Lang => source()

/** English for browsers/phones set to English, Spanish otherwise. */
export const pickLang = (preference?: string | null): Lang => (/^en\b/i.test(preference ?? '') ? 'en' : 'es')

const dictionaries: Record<Lang, Record<string, string>> = { es: {}, en }

/** Translates a Spanish text; {name} placeholders are filled from vars. */
export function t(text: string, vars?: Record<string, string | number>, lang: Lang = source()): string {
  const out = dictionaries[lang][text] ?? text
  return vars ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : out
}

/** Numbers and dates in the reader's language. */
export const locale = (lang: Lang = source()) => (lang === 'en' ? 'en-US' : 'es-GT')

/** Marks a Spanish text defined outside a function (lists, maps) for translation; translate it where it's shown with t(). */
export const msg = (text: string) => text
