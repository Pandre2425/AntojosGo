'use client'

import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from 'react'
import { LANGS, LANG_KEY, pickLang, setLanguageSource, type Lang } from '@/shared/i18n'

// Browser language on the first visit (English if it's set to English), then the reader's choice, remembered here.
// Changing it remounts the page so every t() call renders again in the new language.
let current: Lang = 'es'
setLanguageSource(() => current)

const LanguageContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({ lang: 'es', setLang: () => {} })
export const useLanguage = () => useContext(LanguageContext)

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setState] = useState<Lang>('es')
  const apply = (next: Lang) => { current = next; document.documentElement.lang = next; setState(next) }
  useEffect(() => {
    let saved: string | null = null
    try { saved = localStorage.getItem(LANG_KEY) } catch { /* private mode */ }
    const next = saved === 'es' || saved === 'en' ? saved : pickLang(navigator.language)
    if (next !== 'es') apply(next)
  }, [])
  const setLang = (next: Lang) => { try { localStorage.setItem(LANG_KEY, next) } catch { /* private mode */ } apply(next) }
  return <LanguageContext.Provider value={{ lang, setLang }}><Fragment key={lang}>{children}</Fragment></LanguageContext.Provider>
}

/** «Idioma / Language» switch. */
export function LanguageSelector({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage()
  return <div role="group" aria-label="Idioma / Language" className={`inline-flex rounded-full border bg-white p-0.5 ${className}`}>
    {LANGS.map(l => <button key={l.id} type="button" aria-pressed={lang === l.id} lang={l.id} onClick={() => setLang(l.id)}
      className={`rounded-full px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-[#173F35] ${lang === l.id ? 'bg-[#173F35] text-white' : 'text-stone-700'}`}>{l.label}</button>)}
  </div>
}
