import Link from 'next/link'
import { ChefHat, Search, Store, ArrowRight } from 'lucide-react'

export default function WelcomePage() {
  return (
    <main className="min-h-dvh bg-background px-5 py-8 flex items-center justify-center">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-3">
          <ChefHat className="h-12 w-12 text-primary" />
          <p className="font-semibold text-primary">AntojosGo</p>
          <h1 className="text-3xl font-bold tracking-tight">Tu próximo antojo empieza aquí</h1>
          <p className="text-muted-foreground">Descubre dónde comer o haz que más personas conozcan tu restaurante.</p>
        </div>
        <div className="space-y-4">
          <Link href="/" className="flex gap-4 rounded-[24px] border bg-white p-6 shadow-sm hover:border-primary">
            <Search className="mt-1 shrink-0 text-primary" />
            <div className="flex-1"><h2 className="text-lg font-semibold">Quiero descubrir comida</h2><p className="mt-1 text-sm text-muted-foreground">Busca restaurantes, consulta sus fichas y encuentra recomendaciones.</p></div><ArrowRight className="self-center shrink-0" />
          </Link>
          <Link href="/restaurant" className="flex gap-4 rounded-[24px] border bg-white p-6 shadow-sm hover:border-primary">
            <Store className="mt-1 shrink-0 text-primary" />
            <div className="flex-1"><h2 className="text-lg font-semibold">Tengo un restaurante</h2><p className="mt-1 text-sm text-muted-foreground">Administra tu perfil, tu menú y la información de tu negocio.</p></div><ArrowRight className="self-center shrink-0" />
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">Una app para descubrir y compartir la comida de Guatemala.</p>
      </div>
    </main>
  )
}
