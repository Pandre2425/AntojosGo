'use client'

import Link from 'next/link'
import { Search, Store, ArrowRight } from 'lucide-react'
import { t } from '@/shared/i18n'

export default function WelcomePage() {
  return (
    <main className="min-h-dvh bg-background px-5 py-8 flex items-center justify-center">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-3">
          <img src="/logo.png" alt="" width={80} height={80} className="rounded-2xl" />
          <p className="font-semibold text-primary">{t('AntojosGo')}</p>
          <h1 className="text-3xl font-bold tracking-tight">{t('Tu próximo antojo empieza aquí')}</h1>
          <p className="text-muted-foreground">{t('Descubre dónde comer o haz que más personas conozcan tu restaurante.')}</p>
        </div>
        <div className="space-y-4">
          <Link href="/" className="flex gap-4 rounded-[24px] border bg-white p-6 shadow-sm hover:border-primary">
            <Search className="mt-1 shrink-0 text-primary" />
            <div className="flex-1"><h2 className="text-lg font-semibold">{t('Quiero descubrir comida')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('Busca restaurantes, consulta sus fichas y encuentra recomendaciones.')}</p></div><ArrowRight className="self-center shrink-0" />
          </Link>
          <Link href="/restaurant" className="flex gap-4 rounded-[24px] border bg-white p-6 shadow-sm hover:border-primary">
            <Store className="mt-1 shrink-0 text-primary" />
            <div className="flex-1"><h2 className="text-lg font-semibold">{t('Tengo un restaurante')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('Administra tu perfil, tu menú y la información de tu negocio.')}</p></div><ArrowRight className="self-center shrink-0" />
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">{t('Una app para descubrir y compartir la comida de Guatemala.')}</p>
      </div>
    </main>
  )
}
