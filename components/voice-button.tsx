'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { currentLang, t, msg } from '@/shared/i18n'

// Web Speech API (Chrome, Edge, Android browsers); hidden where the browser has no speech recognition.
type Recognition = { lang: string; interimResults: boolean; maxAlternatives: number; start(): void; abort(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null }
const Speech = () => typeof window === 'undefined' ? undefined
  : ((window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition)

const ERRORS: Record<string, string> = {
  'not-allowed': msg('Permite el micrófono en tu navegador para buscar por voz.'),
  'service-not-allowed': msg('Permite el micrófono en tu navegador para buscar por voz.'),
  'no-speech': msg('No te escuchamos. Toca el micrófono e intenta de nuevo.'),
  network: msg('La búsqueda por voz necesita conexión a internet.'),
}

/** Microphone button: dictates in Spanish and hands back the text (the caller decides whether to search). */
export default function VoiceButton({ onText, onError, className = '' }: { onText: (text: string) => void; onError?: (message: string) => void; className?: string }) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const current = useRef<Recognition | null>(null)
  useEffect(() => { setSupported(Boolean(Speech())); return () => current.current?.abort() }, [])
  if (!supported) return null
  function toggle() {
    if (listening) { current.current?.abort(); return }
    const SR = Speech()!
    const r = new SR()
    r.lang = currentLang() === 'en' ? 'en-US' : 'es-GT'; r.interimResults = false; r.maxAlternatives = 1
    r.onresult = e => { const text = e.results[0]?.[0]?.transcript?.trim(); if (text) onText(text) }
    r.onerror = e => { if (e.error !== 'aborted') onError?.(ERRORS[e.error] ? t(ERRORS[e.error]) : t('No pudimos usar el micrófono. Escribe tu búsqueda.')) }
    r.onend = () => { setListening(false); current.current = null }
    current.current = r; setListening(true); r.start()
  }
  return <button type="button" onClick={toggle} aria-pressed={listening} aria-label={listening ? t('Detener búsqueda por voz') : t('Buscar por voz')}
    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border focus-visible:outline-2 focus-visible:outline-[#173F35] ${listening ? 'animate-pulse border-[#BD481F] bg-[#BD481F] text-white' : 'bg-white text-[#173F35] hover:border-[#173F35]'} ${className}`}>
    {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
  </button>
}
