'use client'

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-md p-6 space-y-4">
    <h1 className="text-xl font-semibold">No pudimos abrir esta sección</h1>
    <p>Intenta nuevamente o vuelve al inicio para elegir otro servicio.</p>
    <button className="rounded-lg bg-primary px-4 py-2 text-white" onClick={reset}>Reintentar</button>
    <a className="block underline" href="/welcome">Volver al inicio</a>
  </main>
}
