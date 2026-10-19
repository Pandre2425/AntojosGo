import { t } from '@/shared/i18n'
'use client'

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-md p-6 space-y-4">
    <h1 className="text-xl font-semibold">{t('No pudimos abrir esta sección')}</h1>
    <p>{t('Intenta nuevamente o vuelve al inicio para elegir otro servicio.')}</p>
    <button className="rounded-lg bg-primary px-4 py-2 text-white" onClick={reset}>{t('Reintentar')}</button>
    <a className="block underline" href="/welcome">{t('Volver al inicio')}</a>
  </main>
}
